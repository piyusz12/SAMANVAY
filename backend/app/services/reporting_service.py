import statistics
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session, aliased
from sqlalchemy import func, or_, and_, desc
from fastapi import HTTPException, status

from backend.app.config import settings
from backend.app.models.complaint import Complaint
from backend.app.models.institution import Institution
from backend.app.models.user import User
from backend.app.models.case_linkage import CaseLinkage
from backend.app.models.case_movement import CaseMovement
from backend.app.models.bureau import Bureau
from backend.app.schemas.reports import (
    ReportMetadata,
    BureauReportItem,
    RegionReportItem,
    InstitutionHistoryItem,
    PendingAgeingBucket,
    PendingAgeingReport,
    DisposalTrendItem,
    OverlapReportData,
    DeadlineEscalationData,
    GenericReportResponse
)
from backend.app.services.csv_exporter import CsvExporter
from backend.app.services.pdf_exporter import PdfExporter
from backend.app.services.audit_service import log_audit_event
from backend.app.core.datetime_util import utc_now

AICTE_BUREAUS = [
    ("REGULATION_BUREAU", "Regulation Bureau"),
    ("PGRC", "Public Grievance Redressal Cell"),
    ("APPROVAL_BUREAU", "Approval Bureau"),
    ("LEGAL_CELL", "Legal Cell"),
    ("VIGILANCE_CELL", "Vigilance Cell"),
    ("POLICY_BUREAU", "Policy & Academic Bureau")
]

AICTE_REGIONS = [
    "Northern", "North-West", "Eastern", "Western",
    "Southern", "South-West", "Central"
]

OPEN_STATUSES = {"LODGED", "SCRUTINY_PENDING", "AWAITING_DOCUMENTS"}
UNDER_PROCESS_STATUSES = {
    "UNDER_INQUIRY",
    "SHOW_CAUSE_ISSUED",
    "HEARING_SCHEDULED",
    "COMMITTEE_REVIEW",
    "UNDER_REVIEW",
    "IN_PROGRESS",
    "ESCALATED"
}
DISPOSED_STATUSES = {"RESOLVED", "DISPOSED", "REJECTED"}
TRANSFERRED_STATUSES = {"TRANSFERRED"}
ACTIVE_STATUSES = OPEN_STATUSES | UNDER_PROCESS_STATUSES

def parse_iso_date(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    try:
        clean = date_str.replace("Z", "+00:00")
        if len(clean) == 10:
            return datetime.fromisoformat(clean + "T00:00:00")
        return datetime.fromisoformat(clean)
    except Exception:
        return None

def mask_email(email: Optional[str]) -> str:
    if not email:
        return "—"
    if "@" not in email:
        return "[REDACTED]"
    parts = email.split("@")
    user, domain = parts[0], parts[1]
    masked_user = user[:2] + "***" if len(user) > 2 else "***"
    return f"{masked_user}@{domain}"

def mask_phone(phone: Optional[str]) -> str:
    if not phone:
        return "—"
    clean = phone.strip()
    if len(clean) >= 4:
        return "+91 *****" + clean[-4:]
    return "[REDACTED]"

class ReportingService:

    @classmethod
    def enforce_bureau_authorization(cls, user: User, requested_bureau: Optional[str]) -> Optional[str]:
        """
        Enforces strict bureau-level data isolation.
        - Super Admins and Auditors can query any bureau or central data.
        - Bureau Officers and Admins are locked strictly to their own bureau.
        """
        role = (user.role or "").upper().replace(" ", "_")
        if role in ("SUPER_ADMIN", "AUDITOR"):
            return requested_bureau

        user_bureau = user.bureau
        if requested_bureau and requested_bureau != user_bureau:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: You are not authorized to view or export reports for {requested_bureau}. Your assigned bureau is {user_bureau}."
            )
        return user_bureau

    @classmethod
    def build_base_query(
        cls,
        db: Session,
        user: User,
        bureau: Optional[str] = None,
        region: Optional[str] = None,
        category: Optional[str] = None,
        status: Optional[str] = None,
        status_val: Optional[str] = None,
        priority: Optional[str] = None,
        institution_id: Optional[int] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        **kwargs
    ):
        effective_bureau = cls.enforce_bureau_authorization(user, bureau)

        query = db.query(Complaint).join(
            Institution, Complaint.institution_id == Institution.id
        ).filter(
            Complaint.is_deleted == False,
            Institution.is_deleted == False
        )

        if effective_bureau:
            query = query.filter(Complaint.bureau == effective_bureau)
        if region:
            query = query.filter(Institution.region == region)
        if category:
            query = query.filter(Complaint.category == category)
        target_status = status or status_val
        if target_status:
            query = query.filter(Complaint.status == target_status)
        if priority:
            query = query.filter(Complaint.priority == priority)
        if institution_id:
            query = query.filter(Complaint.institution_id == institution_id)

        dt_from = parse_iso_date(date_from)
        if dt_from:
            query = query.filter(Complaint.created_at >= dt_from)
        dt_to = parse_iso_date(date_to)
        if dt_to:
            query = query.filter(Complaint.created_at <= dt_to)

        return query, effective_bureau

    @classmethod
    def make_metadata(
        cls,
        report_type: str,
        report_title: str,
        user: User,
        filters: Dict[str, Any],
        record_count: int,
        is_truncated: bool = False
    ) -> ReportMetadata:
        clean_filters = {k: v for k, v in filters.items() if v is not None}
        return ReportMetadata(
            report_type=report_type,
            report_title=report_title,
            generated_at=utc_now(),
            generated_by=user.full_name,
            user_role=user.role,
            user_bureau=user.bureau,
            selected_filters=clean_filters,
            record_count=record_count,
            is_truncated=is_truncated
        )

    # =========================================================================
    # 1. BUREAU-WISE CASE REPORT
    # =========================================================================
    @classmethod
    def get_bureau_report(cls, db: Session, user: User, filters: Dict[str, Any]) -> GenericReportResponse:
        query, effective_bureau = cls.build_base_query(
            db, user,
            bureau=filters.get("bureau"),
            region=filters.get("region"),
            category=filters.get("category"),
            status_val=filters.get("status"),
            date_from=filters.get("date_from"),
            date_to=filters.get("date_to")
        )
        complaints = query.all()
        now = utc_now()

        target_bureaus = [(effective_bureau, effective_bureau.replace("_", " "))] if effective_bureau else AICTE_BUREAUS
        report_items = []

        for b_code, b_name in target_bureaus:
            b_cases = [c for c in complaints if c.bureau == b_code]
            total = len(b_cases)
            open_c = sum(1 for c in b_cases if c.status in OPEN_STATUSES)
            under_proc = sum(1 for c in b_cases if c.status in UNDER_PROCESS_STATUSES)
            disposed = sum(1 for c in b_cases if c.status in DISPOSED_STATUSES)
            transferred = sum(1 for c in b_cases if c.status in TRANSFERRED_STATUSES)

            # Overdue cases
            overdue = sum(1 for c in b_cases if c.status in ACTIVE_STATUSES and c.sla_due_date and c.sla_due_date < now)

            # Resolution duration
            resolution_days = []
            for c in b_cases:
                if c.status in DISPOSED_STATUSES and c.disposed_at and c.created_at:
                    resolution_days.append(max((c.disposed_at - c.created_at).days, 0))
                elif c.status in DISPOSED_STATUSES and c.created_at:
                    resolution_days.append(max((c.updated_at - c.created_at).days, 0))

            avg_res_days = round(statistics.mean(resolution_days), 1) if resolution_days else 0.0

            # SLA compliance: disposed cases completed within sla_due_date
            on_time_disposals = 0
            for c in b_cases:
                if c.status in DISPOSED_STATUSES:
                    disp_time = c.disposed_at or c.updated_at
                    if not c.sla_due_date or disp_time <= c.sla_due_date:
                        on_time_disposals += 1
            sla_compliance = round((on_time_disposals / disposed * 100), 1) if disposed > 0 else 100.0

            officer_count = db.query(User).filter(
                User.bureau == b_code,
                User.is_active == True
            ).count()

            report_items.append(BureauReportItem(
                bureau=b_code,
                bureau_name=b_name,
                total_cases=total,
                open_cases=open_c,
                under_process_cases=under_proc,
                disposed_cases=disposed,
                transferred_cases=transferred,
                overdue_cases=overdue,
                avg_resolution_days=avg_res_days,
                sla_compliance_rate=sla_compliance,
                officer_count=officer_count
            ))

        meta = cls.make_metadata("bureau_summary", "Bureau-Wise Complaint Workload & SLA Compliance", user, filters, len(report_items))
        return GenericReportResponse(metadata=meta, data=[item.model_dump() for item in report_items])

    # =========================================================================
    # 2. REGION-WISE CASE REPORT
    # =========================================================================
    @classmethod
    def get_region_report(cls, db: Session, user: User, filters: Dict[str, Any]) -> GenericReportResponse:
        query, _ = cls.build_base_query(db, user, **filters)
        complaints = query.all()
        now = utc_now()

        # Group by region
        report_items = []
        for reg in AICTE_REGIONS:
            reg_cases = [c for c in complaints if c.institution and c.institution.region == reg]
            total_cases = len(reg_cases)
            active = sum(1 for c in reg_cases if c.status in ACTIVE_STATUSES)
            resolved = sum(1 for c in reg_cases if c.status in DISPOSED_STATUSES)
            overdue = sum(1 for c in reg_cases if c.status in ACTIVE_STATUSES and c.sla_due_date and c.sla_due_date < now)

            # Unique institutions in this region
            unique_inst_ids = set(c.institution_id for c in reg_cases)
            total_insts = len(unique_inst_ids)

            report_items.append(RegionReportItem(
                region=reg,
                total_institutions=total_insts,
                total_complaints=total_cases,
                active_complaints=active,
                resolved_complaints=resolved,
                overdue_complaints=overdue
            ))

        meta = cls.make_metadata("region_summary", "Region-Wise AICTE Complaint Distribution", user, filters, len(report_items))
        return GenericReportResponse(metadata=meta, data=[item.model_dump() for item in report_items])

    # =========================================================================
    # 3. INSTITUTION-WISE COMPLAINT HISTORIES
    # =========================================================================
    @classmethod
    def get_institution_history_report(cls, db: Session, user: User, filters: Dict[str, Any]) -> GenericReportResponse:
        query, _ = cls.build_base_query(db, user, **filters)
        complaints = query.all()

        inst_groups: Dict[int, List[Complaint]] = {}
        for c in complaints:
            inst_groups.setdefault(c.institution_id, []).append(c)

        report_items = []
        priority_rank = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}

        for inst_id, c_list in sorted(inst_groups.items(), key=lambda kv: len(kv[1]), reverse=True):
            first_c = c_list[0]
            inst = first_c.institution

            total = len(c_list)
            active = sum(1 for c in c_list if c.status in ACTIVE_STATUSES)
            resolved = sum(1 for c in c_list if c.status in DISPOSED_STATUSES)

            # Highest priority
            highest_p = max(c_list, key=lambda c: priority_rank.get(c.priority, 1)).priority

            # Top category
            cat_counts: Dict[str, int] = {}
            for c in c_list:
                cat_counts[c.category] = cat_counts.get(c.category, 0) + 1
            top_cat = max(cat_counts.items(), key=lambda kv: kv[1])[0] if cat_counts else "GENERAL"

            report_items.append(InstitutionHistoryItem(
                institution_id=inst_id,
                institution_name=inst.name if inst else f"Institution #{inst_id}",
                aishe_code=inst.aishe_code if inst else None,
                region=inst.region if inst else "Unknown",
                state=inst.state if inst else "Unknown",
                total_complaints=total,
                active_complaints=active,
                resolved_complaints=resolved,
                highest_priority=highest_p,
                primary_category=top_cat.replace("_", " ")
            ))

        meta = cls.make_metadata("institution_history", "Institution-Wise Complaint Track Record", user, filters, len(report_items))
        return GenericReportResponse(metadata=meta, data=[item.model_dump() for item in report_items])

    # =========================================================================
    # 4. PENDING-CASE AGEING REPORT
    # =========================================================================
    @classmethod
    def get_pending_ageing_report(cls, db: Session, user: User, filters: Dict[str, Any]) -> GenericReportResponse:
        query, _ = cls.build_base_query(db, user, **filters)
        active_complaints = query.filter(Complaint.status.in_(ACTIVE_STATUSES)).all()
        now = utc_now()

        bucket_ranges = [
            ("< 15 Days", 0, 14),
            ("15 - 30 Days", 15, 30),
            ("31 - 60 Days", 31, 60),
            ("61 - 90 Days", 61, 90),
            ("> 90 Days", 91, 99999)
        ]

        bucket_counts = {b[0]: 0 for b in bucket_ranges}
        ageing_cases = []
        ages = []

        for c in active_complaints:
            age_days = max((now - c.created_at).days, 0)
            ages.append(age_days)

            for b_name, b_min, b_max in bucket_ranges:
                if b_min <= age_days <= b_max:
                    bucket_counts[b_name] += 1
                    break

            # Redaction for complainant if confidential
            comp_name = "[CONFIDENTIAL / ANONYMOUS]" if c.is_anonymous_confidential else c.complainant_name

            ageing_cases.append({
                "complaint_no": c.complaint_no,
                "institution_name": c.institution.name if c.institution else f"Inst #{c.institution_id}",
                "bureau": c.bureau,
                "status": c.status,
                "priority": c.priority,
                "days_open": age_days,
                "assigned_officer": c.assigned_officer_name or "Unassigned",
                "complainant": comp_name,
                "sla_due_date": c.sla_due_date.isoformat() if c.sla_due_date else None,
                "is_overdue": bool(c.sla_due_date and c.sla_due_date < now)
            })

        total = len(active_complaints)
        buckets_out = [
            PendingAgeingBucket(
                bucket=b_name,
                case_count=bucket_counts[b_name],
                percentage=round((bucket_counts[b_name] / total * 100), 1) if total > 0 else 0.0
            )
            for b_name, _, _ in bucket_ranges
        ]

        avg_age = round(statistics.mean(ages), 1) if ages else 0.0
        max_age = max(ages) if ages else 0

        # Sort cases by days_open descending
        ageing_cases.sort(key=lambda x: x["days_open"], reverse=True)

        report_data = PendingAgeingReport(
            total_pending=total,
            average_age_days=avg_age,
            oldest_case_days=max_age,
            buckets=buckets_out,
            ageing_cases=ageing_cases
        )

        meta = cls.make_metadata("pending_ageing", "Pending Case Ageing & Escalation Distribution", user, filters, total)
        return GenericReportResponse(metadata=meta, data=report_data.model_dump())

    # =========================================================================
    # 5. DISPOSAL & RESOLUTION TREND REPORT
    # =========================================================================
    @classmethod
    def get_disposal_trends_report(cls, db: Session, user: User, filters: Dict[str, Any]) -> GenericReportResponse:
        query, _ = cls.build_base_query(db, user, **filters)
        complaints = query.all()

        # Group by monthly periods: YYYY-MM
        periods: Dict[str, Dict[str, Any]] = {}
        for c in complaints:
            period_key = c.created_at.strftime("%Y-%m")
            if period_key not in periods:
                periods[period_key] = {"received": 0, "disposed": 0, "resolution_days": []}
            periods[period_key]["received"] += 1

            if c.status in DISPOSED_STATUSES:
                disp_period = (c.disposed_at or c.updated_at).strftime("%Y-%m")
                if disp_period not in periods:
                    periods[disp_period] = {"received": 0, "disposed": 0, "resolution_days": []}
                periods[disp_period]["disposed"] += 1

                if c.created_at:
                    days = max(((c.disposed_at or c.updated_at) - c.created_at).days, 0)
                    periods[disp_period]["resolution_days"].append(days)

        report_items = []
        for period, data in sorted(periods.items()):
            rec = data["received"]
            disp = data["disposed"]
            durations = data["resolution_days"]
            avg_d = round(statistics.mean(durations), 1) if durations else 0.0
            rate = round((disp / rec * 100), 1) if rec > 0 else 100.0

            report_items.append(DisposalTrendItem(
                period=period,
                received_count=rec,
                disposed_count=disp,
                avg_resolution_days=avg_d,
                disposed_percentage=rate
            ))

        meta = cls.make_metadata("disposal_trends", "Longitudinal Disposal and Resolution Trends", user, filters, len(report_items))
        return GenericReportResponse(metadata=meta, data=[item.model_dump() for item in report_items])

    # =========================================================================
    # 6. OVERLAP & CROSS-BUREAU REPORT
    # =========================================================================
    @classmethod
    def get_overlap_report(cls, db: Session, user: User, filters: Dict[str, Any]) -> GenericReportResponse:
        effective_bureau = cls.enforce_bureau_authorization(user, filters.get("bureau"))

        linkage_query = db.query(CaseLinkage)
        if effective_bureau:
            SourceComp = aliased(Complaint)
            TargetComp = aliased(Complaint)
            linkage_query = (
                linkage_query
                .join(SourceComp, CaseLinkage.source_complaint_id == SourceComp.id)
                .join(TargetComp, CaseLinkage.target_complaint_id == TargetComp.id)
                .filter(or_(SourceComp.bureau == effective_bureau, TargetComp.bureau == effective_bureau))
            )

        linkages = linkage_query.order_by(desc(CaseLinkage.similarity_score)).all()

        total = len(linkages)
        pending = sum(1 for l in linkages if l.status == "PENDING_REVIEW")
        confirmed = sum(1 for l in linkages if l.status in ("CONFIRMED", "CONFIRMED_RELATED", "LINKED", "ALREADY_LINKED"))
        dismissed = sum(1 for l in linkages if l.status in ("DISMISSED", "NOT_RELATED"))

        cross_matrix: Dict[str, int] = {}
        linkage_rows = []

        for l in linkages:
            src_bureau = l.source_complaint.bureau if l.source_complaint else "UNKNOWN"
            tgt_bureau = l.target_complaint.bureau if l.target_complaint else "UNKNOWN"
            pair_key = f"{src_bureau} <-> {tgt_bureau}"
            cross_matrix[pair_key] = cross_matrix.get(pair_key, 0) + 1

            linkage_rows.append({
                "id": l.id,
                "source_complaint_id": l.source_complaint_id,
                "target_complaint_id": l.target_complaint_id,
                "source_bureau": src_bureau,
                "target_bureau": tgt_bureau,
                "confidence_score": round(l.similarity_score, 2),
                "confidence_tier": l.confidence_tier,
                "status": l.status,
                "reasons": l.reasons_json or "Common institution profile",
                "created_at": l.created_at.isoformat() if l.created_at else ""
            })

        report_data = OverlapReportData(
            total_candidate_pairs=total,
            pending_review=pending,
            confirmed_linked=confirmed,
            dismissed=dismissed,
            cross_bureau_summary=cross_matrix,
            linkage_records=linkage_rows
        )

        meta = cls.make_metadata("overlap_summary", "Cross-Bureau Overlap Detection & Linkage Summary", user, filters, total)
        return GenericReportResponse(metadata=meta, data=report_data.model_dump())

    # =========================================================================
    # 7. DEADLINE & ESCALATION REPORT
    # =========================================================================
    @classmethod
    def get_deadline_escalation_report(cls, db: Session, user: User, filters: Dict[str, Any]) -> GenericReportResponse:
        query, _ = cls.build_base_query(db, user, **filters)
        active_complaints = query.filter(Complaint.status.in_(ACTIVE_STATUSES)).all()
        now = utc_now()

        in_7_days = now + timedelta(days=7)
        in_15_days = now + timedelta(days=15)

        upcoming_7 = 0
        upcoming_15 = 0
        overdue = 0
        esc_1 = 0
        esc_2 = 0
        esc_3 = 0
        critical_list = []

        for c in active_complaints:
            if c.sla_due_date:
                if now < c.sla_due_date <= in_7_days:
                    upcoming_7 += 1
                if now < c.sla_due_date <= in_15_days:
                    upcoming_15 += 1
                if c.sla_due_date < now:
                    overdue += 1
                    days_past = (now - c.sla_due_date).days
                    if days_past > 30:
                        esc_3 += 1
                    elif days_past > 15:
                        esc_2 += 1
                    else:
                        esc_1 += 1

                    critical_list.append({
                        "complaint_no": c.complaint_no,
                        "institution_name": c.institution.name if c.institution else f"Inst #{c.institution_id}",
                        "bureau": c.bureau,
                        "priority": c.priority,
                        "assigned_officer": c.assigned_officer_name or "Unassigned",
                        "sla_due_date": c.sla_due_date.isoformat(),
                        "days_overdue": days_past,
                        "escalation_tier": "LEVEL_3 (Council Oversight)" if days_past > 30 else ("LEVEL_2 (Bureau Admin)" if days_past > 15 else "LEVEL_1 (Desk Officer)")
                    })

        critical_list.sort(key=lambda x: x["days_overdue"], reverse=True)

        report_data = DeadlineEscalationData(
            upcoming_7_days=upcoming_7,
            upcoming_15_days=upcoming_15,
            overdue_cases=overdue,
            escalated_level_1=esc_1,
            escalated_level_2=esc_2,
            escalated_level_3=esc_3,
            critical_overdue_list=critical_list
        )

        meta = cls.make_metadata("deadline_escalation", "Regulatory Deadlines, Overdue SLA & Escalation Report", user, filters, overdue)
        return GenericReportResponse(metadata=meta, data=report_data.model_dump())

    # =========================================================================
    # 8. RAW COMPLAINT EXPORT DATASET (FIELD-LEVEL DISCLOSURE & PII REDACTION)
    # =========================================================================
    @classmethod
    def get_complaints_export_dataset(cls, db: Session, user: User, filters: Dict[str, Any]) -> Tuple[List[str], List[List[Any]], int]:
        query, _ = cls.build_base_query(db, user, **filters)
        complaints = query.order_by(desc(Complaint.created_at)).all()

        headers = [
            "Case Reference", "Institution Name", "AISHE Code", "Region", "State",
            "Bureau", "Category", "Status", "Priority", "Complainant Name",
            "Complainant Category", "Complainant Email", "Complainant Phone",
            "Assigned Officer", "Received Date", "SLA Due Date", "Disposed Date"
        ]

        user_role = (user.role or "").upper().replace(" ", "_")
        is_super = user_role == "SUPER_ADMIN"
        is_auditor = user_role == "AUDITOR"

        rows = []
        for c in complaints:
            inst = c.institution

            # Field-level disclosure rules for complainant info
            if c.is_anonymous_confidential:
                # Strictly redacted unless Super Admin or the assigned bureau admin
                if is_super or (user.bureau == c.bureau and user_role == "BUREAU_ADMIN"):
                    comp_name = f"{c.complainant_name} [ANONYMOUS]"
                    comp_email = c.complainant_email or "—"
                    comp_phone = c.complainant_phone or "—"
                else:
                    comp_name = "[CONFIDENTIAL / ANONYMOUS]"
                    comp_email = "[REDACTED]"
                    comp_phone = "[REDACTED]"
            elif is_auditor:
                # Auditors get masked PII
                comp_name = c.complainant_name
                comp_email = mask_email(c.complainant_email)
                comp_phone = mask_phone(c.complainant_phone)
            else:
                comp_name = c.complainant_name
                comp_email = c.complainant_email or "—"
                comp_phone = c.complainant_phone or "—"

            row = [
                c.complaint_no,
                inst.name if inst else f"Inst #{c.institution_id}",
                inst.aishe_code if inst and inst.aishe_code else "—",
                inst.region if inst else "—",
                inst.state if inst else "—",
                c.bureau,
                c.category.replace("_", " "),
                c.status,
                c.priority,
                comp_name,
                c.complainant_category,
                comp_email,
                comp_phone,
                c.assigned_officer_name or "Unassigned",
                c.created_at.strftime("%Y-%m-%d"),
                c.sla_due_date.strftime("%Y-%m-%d") if c.sla_due_date else "—",
                c.disposed_at.strftime("%Y-%m-%d") if c.disposed_at else ("—" if c.status not in DISPOSED_STATUSES else c.updated_at.strftime("%Y-%m-%d"))
            ]
            rows.append(row)

        return headers, rows, len(complaints)

    # =========================================================================
    # 9. CONTROLLED EXPORT GENERATORS (CSV & PDF) WITH AUDITING
    # =========================================================================
    @classmethod
    def export_report_csv(cls, db: Session, user: User, report_type: str, filters: Dict[str, Any]) -> Tuple[bytes, str]:
        # Generate appropriate dataset
        if report_type == "bureau":
            res = cls.get_bureau_report(db, user, filters)
            headers = ["Bureau Code", "Bureau Name", "Total Cases", "Open Cases", "Under Process", "Disposed", "Transferred", "Overdue", "Avg Days", "SLA Compliance %", "Officers"]
            rows = [[item["bureau"], item["bureau_name"], item["total_cases"], item["open_cases"], item["under_process_cases"], item["disposed_cases"], item["transferred_cases"], item["overdue_cases"], item["avg_resolution_days"], f"{item['sla_compliance_rate']}%", item["officer_count"]] for item in res.data]
            title = "Bureau Case Workload & SLA Compliance"
        elif report_type == "region":
            res = cls.get_region_report(db, user, filters)
            headers = ["Region", "Institutions", "Total Complaints", "Active Cases", "Resolved Cases", "Overdue Cases"]
            rows = [[item["region"], item["total_institutions"], item["total_complaints"], item["active_complaints"], item["resolved_complaints"], item["overdue_complaints"]] for item in res.data]
            title = "Region-Wise Complaint Distribution"
        elif report_type == "institution":
            res = cls.get_institution_history_report(db, user, filters)
            headers = ["ID", "Institution Name", "AISHE Code", "Region", "State", "Total Cases", "Active", "Resolved", "Max Priority", "Top Category"]
            rows = [[item["institution_id"], item["institution_name"], item["aishe_code"] or "—", item["region"], item["state"], item["total_complaints"], item["active_complaints"], item["resolved_complaints"], item["highest_priority"], item["primary_category"]] for item in res.data]
            title = "Institution Complaint Track Record"
        elif report_type == "ageing":
            res = cls.get_pending_ageing_report(db, user, filters)
            headers = ["Case Ref", "Institution", "Bureau", "Days Open", "Status", "Priority", "Officer", "Overdue?"]
            rows = [[c["complaint_no"], c["institution_name"], c["bureau"], c["days_open"], c["status"], c["priority"], c["assigned_officer"], "YES" if c["is_overdue"] else "NO"] for c in res.data["ageing_cases"]]
            title = "Pending Case Ageing Distribution"
        elif report_type == "trends":
            res = cls.get_disposal_trends_report(db, user, filters)
            headers = ["Period", "Received Cases", "Disposed Cases", "Avg Resolution Days", "Disposal Rate %"]
            rows = [[item["period"], item["received_count"], item["disposed_count"], item["avg_resolution_days"], f"{item['disposed_percentage']}%"] for item in res.data]
            title = "Longitudinal Resolution & Disposal Trends"
        elif report_type == "overlaps":
            res = cls.get_overlap_report(db, user, filters)
            headers = ["Linkage ID", "Case 1", "Case 2", "Bureau 1", "Bureau 2", "Score", "Status", "Reasons"]
            rows = [[l["id"], l["source_complaint_id"], l["target_complaint_id"], l["source_bureau"], l["target_bureau"], l["confidence_score"], l["status"], l["reasons"]] for l in res.data["linkage_records"]]
            title = "Cross-Bureau Overlap Linkages"
        elif report_type == "deadlines":
            res = cls.get_deadline_escalation_report(db, user, filters)
            headers = ["Case Ref", "Institution", "Bureau", "Priority", "Officer", "SLA Due Date", "Days Overdue", "Escalation Tier"]
            rows = [[c["complaint_no"], c["institution_name"], c["bureau"], c["priority"], c["assigned_officer"], c["sla_due_date"][:10], c["days_overdue"], c["escalation_tier"]] for c in res.data["critical_overdue_list"]]
            title = "Regulatory Deadlines & Escalation Report"
        else:
            # Default: raw complaints dataset with PII redactions
            headers, rows, total_c = cls.get_complaints_export_dataset(db, user, filters)
            title = "AICTE Complaint Records Master Dossier"

        meta = cls.make_metadata(report_type, title, user, filters, len(rows))
        csv_bytes = CsvExporter.generate_csv(headers, rows, meta)

        # Audit event
        log_audit_event(
            db=db,
            action_type="REPORT_EXPORTED",
            description=f"Exported {report_type} report as CSV ({len(rows)} records, Filters: {meta.selected_filters})",
            actor_id=user.id,
            actor_name=user.full_name,
            actor_role=user.role,
            actor_bureau=user.bureau,
            commit=True
        )

        filename = f"samanvay_report_{report_type}_{int(utc_now().timestamp())}.csv"
        return csv_bytes, filename

    @classmethod
    def export_report_pdf(cls, db: Session, user: User, report_type: str, filters: Dict[str, Any]) -> Tuple[bytes, str]:
        if report_type == "bureau":
            res = cls.get_bureau_report(db, user, filters)
            headers = ["Bureau", "Total", "Open", "Process", "Disposed", "Overdue", "Avg Days", "SLA %"]
            rows = [[item["bureau"], item["total_cases"], item["open_cases"], item["under_process_cases"], item["disposed_cases"], item["overdue_cases"], item["avg_resolution_days"], f"{item['sla_compliance_rate']}%"] for item in res.data]
            title = "Executive Summary: Bureau Workload & SLA Compliance"
        elif report_type == "region":
            res = cls.get_region_report(db, user, filters)
            headers = ["Region", "Inst Count", "Total Complaints", "Active Cases", "Resolved", "Overdue"]
            rows = [[item["region"], item["total_institutions"], item["total_complaints"], item["active_complaints"], item["resolved_complaints"], item["overdue_complaints"]] for item in res.data]
            title = "Executive Summary: Region-Wise Complaint Distribution"
        elif report_type == "institution":
            res = cls.get_institution_history_report(db, user, filters)
            headers = ["Institution Name", "State", "Total", "Active", "Resolved", "Priority", "Category"]
            rows = [[item["institution_name"][:25], item["state"], item["total_complaints"], item["active_complaints"], item["resolved_complaints"], item["highest_priority"], item["primary_category"][:18]] for item in res.data]
            title = "Executive Summary: Institution Complaint Track Record"
        elif report_type == "ageing":
            res = cls.get_pending_ageing_report(db, user, filters)
            headers = ["Case Ref", "Institution", "Bureau", "Days Open", "Status", "Priority", "Officer"]
            rows = [[c["complaint_no"], c["institution_name"][:22], c["bureau"], c["days_open"], c["status"], c["priority"], c["assigned_officer"][:16]] for c in res.data["ageing_cases"]]
            title = "Executive Summary: Pending Case Ageing Distribution"
        elif report_type == "trends":
            res = cls.get_disposal_trends_report(db, user, filters)
            headers = ["Period", "Received", "Disposed", "Avg Days", "Disposal Rate"]
            rows = [[item["period"], item["received_count"], item["disposed_count"], item["avg_resolution_days"], f"{item['disposed_percentage']}%"] for item in res.data]
            title = "Executive Summary: Longitudinal Resolution Trends"
        elif report_type == "overlaps":
            res = cls.get_overlap_report(db, user, filters)
            headers = ["ID", "Case 1", "Case 2", "Bureau 1", "Bureau 2", "Score", "Status"]
            rows = [[l["id"], l["source_complaint_id"], l["target_complaint_id"], l["source_bureau"][:12], l["target_bureau"][:12], l["confidence_score"], l["status"]] for l in res.data["linkage_records"]]
            title = "Executive Summary: Cross-Bureau Overlaps & Linkages"
        elif report_type == "deadlines":
            res = cls.get_deadline_escalation_report(db, user, filters)
            headers = ["Case Ref", "Institution", "Bureau", "Due Date", "Days Past", "Tier"]
            rows = [[c["complaint_no"], c["institution_name"][:22], c["bureau"], c["sla_due_date"][:10], c["days_overdue"], c["escalation_tier"][:12]] for c in res.data["critical_overdue_list"]]
            title = "Executive Summary: Deadlines & SLA Escalations"
        else:
            headers, rows, _ = cls.get_complaints_export_dataset(db, user, filters)
            # Pick primary columns for PDF summary
            headers = ["Case Ref", "Institution", "Bureau", "Category", "Status", "Priority", "Received"]
            rows = [[r[0], r[1][:22], r[5], r[6][:18], r[7], r[8], r[14]] for r in rows]
            title = "Executive Summary: AICTE Complaint Records Dossier"

        meta = cls.make_metadata(report_type, title, user, filters, len(rows))
        pdf_bytes = PdfExporter.generate_report_pdf(headers, rows, meta)

        log_audit_event(
            db=db,
            action_type="REPORT_EXPORTED",
            description=f"Exported {report_type} report as PDF ({len(rows)} records, Filters: {meta.selected_filters})",
            actor_id=user.id,
            actor_name=user.full_name,
            actor_role=user.role,
            actor_bureau=user.bureau,
            commit=True
        )

        filename = f"samanvay_summary_{report_type}_{int(utc_now().timestamp())}.pdf"
        return pdf_bytes, filename
