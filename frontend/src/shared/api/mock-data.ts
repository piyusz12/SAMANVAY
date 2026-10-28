/**
 * SAMANVAY — Synthetic Demonstration Dataset Fallback
 * Provides deterministic AICTE demonstration data when backend is in standalone preview or offline mode.
 */

import { NATIONAL_COLLEGES_DIRECTORY } from '../config/colleges-geo';

export const MOCK_CONFLICTS = [
  {
    institution_id: 1,
    institution_name: 'Apex Institute of Engineering & Technology',
    aicte_id: '1-10293847',
    aicte_permanent_id: '1-10293847',
    state: 'Maharashtra',
    region: 'Western',
    bureaus_involved: ['REGULATION_BUREAU', 'PGRC', 'LEGAL_CELL'],
    involved_bureaus: ['REGULATION_BUREAU', 'PGRC', 'LEGAL_CELL'],
    active_cases_count: 3,
    total_active_complaints: 3,
    sample_complaint_id: 1,
    sample_complaint_no: 'AICTE/PGRC/2026/0001',
    cases: [
      {
        id: 1,
        complaint_no: 'AICTE/PGRC/2026/0001',
        bureau: 'PGRC',
        subject: 'Withholding original B.Tech degree certificates until illegal caution deposit is paid',
        status: 'UNDER_INQUIRY',
        priority: 'HIGH',
        created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
      },
      {
        id: 2,
        complaint_no: 'AICTE/RB/2026/0002',
        bureau: 'REGULATION_BUREAU',
        subject: 'Severe deficit in faculty cadre ratio and unapproved commercial subletting of academic campus land',
        status: 'UNDER_INQUIRY',
        priority: 'HIGH',
        created_at: new Date(Date.now() - 22 * 86400000).toISOString(),
      },
      {
        id: 3,
        complaint_no: 'AICTE/LC/2026/0003',
        bureau: 'LEGAL_CELL',
        subject: 'Writ Petition WP(C) 4410/2026 regarding compliance of land conversion regulations',
        status: 'HEARING_SCHEDULED',
        priority: 'CRITICAL',
        created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
      },
    ],
  },
  {
    institution_id: 2,
    institution_name: 'National Institute of Science & Technology',
    aicte_id: '1-28491022',
    aicte_permanent_id: '1-28491022',
    state: 'Karnataka',
    region: 'South-West',
    bureaus_involved: ['VIGILANCE_CELL', 'PGRC'],
    involved_bureaus: ['VIGILANCE_CELL', 'PGRC'],
    active_cases_count: 2,
    total_active_complaints: 2,
    sample_complaint_id: 4,
    sample_complaint_no: 'AICTE/PGRC/2026/0004',
    cases: [
      {
        id: 4,
        complaint_no: 'AICTE/PGRC/2026/0004',
        bureau: 'PGRC',
        subject: 'Arbitrary 6-month delay in disbursement of 7th Pay Commission faculty salaries',
        status: 'UNDER_INQUIRY',
        priority: 'MEDIUM',
        created_at: new Date(Date.now() - 28 * 86400000).toISOString(),
      },
      {
        id: 5,
        complaint_no: 'AICTE/VC/2026/0005',
        bureau: 'VIGILANCE_CELL',
        subject: 'Submission of fraudulent ghost faculty records during Extension of Approval scrutiny',
        status: 'UNDER_INQUIRY',
        priority: 'CRITICAL',
        created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
      },
    ],
  },
  {
    institution_id: 3,
    institution_name: 'Delhi Institute of Technology & Management',
    aicte_id: '1-99887755',
    aicte_permanent_id: '1-99887755',
    state: 'Delhi',
    region: 'Northern',
    bureaus_involved: ['APPROVAL_BUREAU', 'PGRC', 'LEGAL_CELL'],
    involved_bureaus: ['APPROVAL_BUREAU', 'PGRC', 'LEGAL_CELL'],
    active_cases_count: 4,
    total_active_complaints: 4,
    sample_complaint_id: 8,
    sample_complaint_no: 'AICTE/AB/2026/0008',
    cases: [
      {
        id: 8,
        complaint_no: 'AICTE/AB/2026/0008',
        bureau: 'APPROVAL_BUREAU',
        subject: 'Unapproved 60-seat Computer Science expansion without AICTE intake sanction',
        status: 'SHOW_CAUSE_ISSUED',
        priority: 'HIGH',
        created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
      },
      {
        id: 9,
        complaint_no: 'AICTE/PGRC/2026/0009',
        bureau: 'PGRC',
        subject: 'Illegal capitation fee and cash donation demanded for Computer Science admission',
        status: 'UNDER_INQUIRY',
        priority: 'HIGH',
        created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
      },
      {
        id: 10,
        complaint_no: 'AICTE/LC/2026/0010',
        bureau: 'LEGAL_CELL',
        subject: 'WP (C) 4892/2026 contesting seat intake reduction and interim stay application',
        status: 'HEARING_SCHEDULED',
        priority: 'CRITICAL',
        created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
      },
      {
        id: 11,
        complaint_no: 'AICTE/POLICY/2026/0011',
        bureau: 'POLICY_BUREAU',
        subject: 'Inquiry on NEP multidisciplinary curriculum credit transfer implementation',
        status: 'LODGED',
        priority: 'LOW',
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    ],
  },
];

export const MOCK_INSTITUTIONS = NATIONAL_COLLEGES_DIRECTORY.map((col) => {
  const isApex = col.id === 1;
  const isNist = col.id === 2;
  const isDitm = col.id === 3;
  const isKolkata = col.id === 4;

  let activeBureaus: string[] = [];
  let hasConflict = col.is_conflicting || false;
  let activeCount = col.active_complaints_count || 0;

  if (isApex) {
    activeBureaus = ['REGULATION_BUREAU', 'PGRC', 'LEGAL_CELL'];
    hasConflict = true;
    activeCount = 3;
  } else if (isNist) {
    activeBureaus = ['VIGILANCE_CELL', 'PGRC'];
    hasConflict = true;
    activeCount = 2;
  } else if (isDitm) {
    activeBureaus = ['APPROVAL_BUREAU', 'PGRC', 'LEGAL_CELL'];
    hasConflict = true;
    activeCount = 4;
  } else if (isKolkata) {
    activeBureaus = ['REGULATION_BUREAU'];
    hasConflict = false;
    activeCount = 1;
  }

  return {
    id: col.id,
    name: col.name,
    shortName: col.shortName,
    aicte_permanent_id: col.aicte_id,
    aicte_id: col.aicte_id,
    aishe_code: col.aishe_code,
    address: col.address,
    city: col.city,
    state: col.state,
    region: col.region,
    pin_code: col.pin_code,
    category: col.category,
    status: col.approval_status === 'APPROVED' ? 'ACTIVE' : col.approval_status,
    active_cases_count: activeCount,
    active_bureaus: activeBureaus,
    has_conflict: hasConflict,
    coordinates: col.coordinates,
    website: col.website,
    nirfRank: col.nirfRank,
    accreditation: col.accreditation,
    intakeCapacity: col.intakeCapacity,
    contact_phone: col.contact_phone,
    contact_email: col.contact_email,
    created_at: new Date(Date.now() - 365 * 86400000).toISOString(),
  };
});

export const MOCK_COMPLAINTS = [
  {
    id: 1,
    complaint_no: 'AICTE/PGRC/2026/0001',
    institution_id: 1,
    institution_name: 'Apex Institute of Engineering & Technology',
    aicte_permanent_id: '1-10293847',
    bureau: 'PGRC',
    category: 'FEE_EXTORTION',
    subject: 'Withholding original B.Tech degree certificates until illegal caution deposit is paid',
    description: 'The college administration is unlawfully withholding original degree certificates and grade cards of graduating 2025-26 B.Tech batch students, demanding an additional illegal payment of Rs 45,000 titled caution money settlement without receipt.',
    status: 'UNDER_INQUIRY',
    priority: 'HIGH',
    assigned_officer_id: 3,
    assigned_officer_name: 'Shri Amit Patel',
    assigned_officer_designation: 'Inquiring Officer Grade-I',
    complainant_name: 'Rohan Sharma (Student Representative)',
    complainant_category: 'STUDENT',
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    sla_due_date: new Date(Date.now() + 18 * 86400000).toISOString(),
    is_overdue: false,
  },
  {
    id: 2,
    complaint_no: 'AICTE/RB/2026/0002',
    institution_id: 1,
    institution_name: 'Apex Institute of Engineering & Technology',
    aicte_permanent_id: '1-10293847',
    bureau: 'REGULATION_BUREAU',
    category: 'CADRE_RATIO_DEFICIT',
    subject: 'Severe deficit in faculty cadre ratio and unapproved commercial subletting of academic campus land',
    description: 'Cadre ratio deficit of over 42% against AICTE norms. Academic campus block B has been partitioned and illegally leased out to private coaching centers.',
    status: 'UNDER_INQUIRY',
    priority: 'HIGH',
    assigned_officer_id: 6,
    assigned_officer_name: 'Shri R. K. Mishra',
    complainant_name: 'Confidential Citizen Report',
    complainant_category: 'CITIZEN',
    created_at: new Date(Date.now() - 22 * 86400000).toISOString(),
    sla_due_date: new Date(Date.now() + 8 * 86400000).toISOString(),
    is_overdue: false,
  },
  {
    id: 3,
    complaint_no: 'AICTE/LC/2026/0003',
    institution_id: 1,
    institution_name: 'Apex Institute of Engineering & Technology',
    aicte_permanent_id: '1-10293847',
    bureau: 'LEGAL_CELL',
    category: 'LEGAL_DISPUTE',
    subject: 'Writ Petition WP(C) 4410/2026 regarding compliance of land conversion regulations',
    description: 'High Court writ petition challenging municipal zoning compliance and AICTE approval conditions. Notice returnable within 3 weeks.',
    status: 'HEARING_SCHEDULED',
    priority: 'CRITICAL',
    assigned_officer_id: 7,
    assigned_officer_name: 'Adv. Meenakshi Sundaram',
    complainant_name: 'Hon High Court Registrar',
    complainant_category: 'LEGAL_AUTHORITY',
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    sla_due_date: new Date(Date.now() + 13 * 86400000).toISOString(),
    is_overdue: false,
  },
  {
    id: 8,
    complaint_no: 'AICTE/AB/2026/0008',
    institution_id: 3,
    institution_name: 'Delhi Institute of Technology & Management',
    aicte_permanent_id: '1-99887755',
    bureau: 'APPROVAL_BUREAU',
    category: 'UNAPPROVED_COURSES',
    subject: 'Unapproved 60-seat Computer Science expansion without AICTE intake sanction',
    description: 'The college has admitted 60 students in an unapproved B.Tech CSE Data Science specialization batch without AICTE Extension of Approval (EoA) approval or state university affiliation.',
    status: 'SHOW_CAUSE_ISSUED',
    priority: 'HIGH',
    assigned_officer_id: 5,
    assigned_officer_name: 'Ms. Neha Gupta',
    complainant_name: 'Approval Scrutiny Committee',
    complainant_category: 'AICTE_OFFICIAL',
    created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
    sla_due_date: new Date(Date.now() + 12 * 86400000).toISOString(),
    is_overdue: false,
  },
  {
    id: 9,
    complaint_no: 'AICTE/PGRC/2026/0009',
    institution_id: 3,
    institution_name: 'Delhi Institute of Technology & Management',
    aicte_permanent_id: '1-99887755',
    bureau: 'PGRC',
    category: 'FEE_EXTORTION',
    subject: 'Illegal capitation fee and cash donation demanded for Computer Science admission',
    description: 'Parent grievance reporting demand of Rs 3,50,000 cash capitation fee for management quota seat in unapproved Computer Science branch.',
    status: 'UNDER_INQUIRY',
    priority: 'HIGH',
    assigned_officer_id: 3,
    assigned_officer_name: 'Shri Amit Patel',
    assigned_officer_designation: 'Inquiring Officer Grade-I',
    complainant_name: 'Sunil Aggarwal (Parent)',
    complainant_category: 'PARENT',
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    sla_due_date: new Date(Date.now() + 18 * 86400000).toISOString(),
    is_overdue: false,
  },
  {
    id: 7,
    complaint_no: 'AICTE/REGL/2026/0007',
    institution_id: 4,
    institution_name: 'Kolkata Polytechnic Institute',
    aicte_permanent_id: '1-66554433',
    bureau: 'REGULATION_BUREAU',
    category: 'INFRASTRUCTURE_NORMS',
    subject: 'Non-compliance with green building norms and workshop fire safety clearances',
    description: 'Workshops operating without valid fire department NOC and structural fitness certifications.',
    status: 'UNDER_INQUIRY',
    priority: 'HIGH',
    assigned_officer_id: 6,
    assigned_officer_name: 'Shri R. K. Mishra',
    complainant_name: 'Regional Inspection Officer',
    complainant_category: 'AICTE_OFFICIAL',
    created_at: new Date(Date.now() - 36 * 86400000).toISOString(),
    sla_due_date: new Date(Date.now() - 6 * 86400000).toISOString(),
    is_overdue: true,
  },
];

export const MOCK_ANALYTICS = {
  total_complaints: 12,
  total_complaints_received: 12,
  open_pending_complaints: 8,
  active_complaints: 8,
  complaints_under_process: 6,
  disposed_complaints: 3,
  disposed_count: 3,
  resolved_complaints: 3,
  transferred_complaints: 1,
  pending_transfers_count: 1,
  overdue_complaints: 1,
  sla_overdue_count: 1,
  total_institutions: 6,
  total_institutions_count: 6,
  conflicting_institutions_count: 3,
  potential_overlaps_awaiting_review: 4,
  confirmed_related_groups_count: 2,
  ageing_distribution: {
    '0-7 days': 3,
    '8-15 days': 4,
    '16-30 days': 4,
    '>30 days (Breach)': 1,
  },
  bureau_metrics: [
    { bureau: 'PGRC', total: 4, active: 3, disposed: 1, overdue: 0 },
    { bureau: 'APPROVAL_BUREAU', total: 2, active: 1, disposed: 1, overdue: 0 },
    { bureau: 'REGULATION_BUREAU', total: 2, active: 2, disposed: 0, overdue: 1 },
    { bureau: 'LEGAL_CELL', total: 2, active: 2, disposed: 0, overdue: 0 },
    { bureau: 'VIGILANCE_CELL', total: 1, active: 1, disposed: 0, overdue: 0 },
    { bureau: 'POLICY_BUREAU', total: 1, active: 1, disposed: 0, overdue: 0 },
  ],
};

export const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    title: '⚠️ Cross-Bureau Collision Detected',
    message: 'Apex Institute of Engineering & Technology has simultaneous active inquiries in PGRC, Regulation Bureau, and Legal Cell.',
    category: 'CONFLICT_ALERT',
    is_read: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 2,
    title: '🚨 Citizen Charter SLA Breach Alert',
    message: 'Case AICTE/REGL/2026/0007 (Kolkata Polytechnic) has exceeded the 30-day statutory limit (36 days open).',
    category: 'SLA_BREACH',
    is_read: false,
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 3,
    title: '📂 New Coordination Workspace Assigned',
    message: 'Joint coordination workspace activated for Delhi Institute of Technology & Management. Approval Bureau assigned Lead Custody.',
    category: 'COORDINATION_TASK',
    is_read: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const MOCK_OFFICERS = [
  { id: 1, full_name: 'Dr. Ramesh Sharma', designation: 'Senior Inquiring Authority', role: 'BUREAU_ADMIN', bureau: 'CENTRAL_ADMIN', email: 'ramesh.sharma@aicte.gov.in' },
  { id: 2, full_name: 'Smt. Sunita Rao', designation: 'Director (Grievance Redressal)', role: 'BUREAU_ADMIN', bureau: 'PGRC', email: 'sunita.rao@aicte.gov.in' },
  { id: 3, full_name: 'Shri Amit Patel', designation: 'Inquiring Officer Grade-I', role: 'CASE_OFFICER', bureau: 'PGRC', email: 'amit.patel@aicte.gov.in' },
  { id: 4, full_name: 'Dr. Vivek Deshmukh', designation: 'Regional Director (Western)', role: 'BUREAU_ADMIN', bureau: 'REGULATION_BUREAU', email: 'vivek.deshmukh@aicte.gov.in' },
  { id: 5, full_name: 'Ms. Neha Gupta', designation: 'Assistant Director (Scrutiny)', role: 'CASE_OFFICER', bureau: 'APPROVAL_BUREAU', email: 'neha.gupta@aicte.gov.in' },
  { id: 6, full_name: 'Shri R. K. Mishra', designation: 'Senior Compliance Evaluator', role: 'CASE_OFFICER', bureau: 'REGULATION_BUREAU', email: 'rk.mishra@aicte.gov.in' },
  { id: 7, full_name: 'Adv. Meenakshi Sundaram', designation: 'Standing Legal Counsel', role: 'CASE_OFFICER', bureau: 'LEGAL_CELL', email: 'meenakshi.s@aicte.gov.in' },
  { id: 8, full_name: 'Shri Arvind Saxena', designation: 'Chief Vigilance Officer', role: 'BUREAU_ADMIN', bureau: 'VIGILANCE_CELL', email: 'arvind.saxena@aicte.gov.in' },
  { id: 9, full_name: 'Dr. Priya Nambiar', designation: 'Joint Director (Policy)', role: 'CASE_OFFICER', bureau: 'POLICY_BUREAU', email: 'priya.n@aicte.gov.in' },
];

export const MOCK_MOVEMENTS = [
  {
    id: 1,
    complaint_id: 1,
    complaint_no: 'AICTE/PGRC/2026/0001',
    from_bureau: 'CENTRAL_ADMIN',
    to_bureau: 'PGRC',
    movement_type: 'INTAKE_DISPATCH',
    status: 'ACCEPTED',
    reason: 'Initial digital intake routed from AICTE Central Portal to PGRC for student fee redressal scrutiny.',
    requested_by_name: 'Portal Ingestion Gateway',
    decided_by_name: 'Smt. Sunita Rao (Director PGRC)',
    decision_notes: 'Custody accepted. Allocated to Inquiring Officer Shri Amit Patel.',
    created_at: new Date(Date.now() - 11 * 86400000).toISOString(),
    decided_at: new Date(Date.now() - 11 * 86400000).toISOString(),
  },
  {
    id: 2,
    complaint_id: 8,
    complaint_no: 'AICTE/AB/2026/0008',
    from_bureau: 'REGULATION_BUREAU',
    to_bureau: 'APPROVAL_BUREAU',
    movement_type: 'JURISDICTIONAL_HANDOVER',
    status: 'PENDING_APPROVAL',
    reason: 'Preliminary inspection indicates unauthorized intake capacity expansion. Jurisdiction falls squarely under Approval Bureau EoA mandate.',
    requested_by_name: 'Shri R. K. Mishra',
    decided_by_name: null,
    decision_notes: null,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    decided_at: null,
  },
  {
    id: 3,
    complaint_id: 2,
    complaint_no: 'AICTE/RB/2026/0002',
    from_bureau: 'PGRC',
    to_bureau: 'REGULATION_BUREAU',
    movement_type: 'TRANSFER_REQUEST',
    status: 'ACCEPTED',
    reason: 'Campus subletting and land zoning violations require physical site inspection under Regulation Bureau powers.',
    requested_by_name: 'Shri Amit Patel',
    decided_by_name: 'Dr. Vivek Deshmukh',
    decision_notes: 'Transfer accepted. Merged with Western Region Inspection Docket.',
    created_at: new Date(Date.now() - 19 * 86400000).toISOString(),
    decided_at: new Date(Date.now() - 18 * 86400000).toISOString(),
  },
];

export const MOCK_EVIDENCE: Record<number, any[]> = {
  1: [
    {
      id: 101,
      complaint_id: 1,
      file_name: 'fee_demand_notice_caution_deposit.pdf',
      file_size_bytes: 412800,
      content_type: 'application/pdf',
      sha256_checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      description: 'Original notice issued by college registrar demanding unapproved Rs 45,000 caution deposit settlement.',
      is_confidential: false,
      uploaded_by_name: 'Rohan Sharma (Student)',
      created_at: new Date(Date.now() - 11 * 86400000).toISOString(),
    },
    {
      id: 102,
      complaint_id: 1,
      file_name: 'affidavit_withholding_degrees.pdf',
      file_size_bytes: 284100,
      content_type: 'application/pdf',
      sha256_checksum: 'a8b9c0d1e2f3a4b5c6d7e8f90123456789abcdef0123456789abcdef01234567',
      description: 'Sworn affidavit signed by 18 affected students verifying non-issuance of degree certificates.',
      is_confidential: true,
      uploaded_by_name: 'Rohan Sharma (Student)',
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
  ],
  2: [
    {
      id: 103,
      complaint_id: 2,
      file_name: 'cadre_ratio_audit_report.xlsx',
      file_size_bytes: 615000,
      content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sha256_checksum: 'c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3',
      description: 'Western Regional Office faculty cadre ratio deficit verification table.',
      is_confidential: false,
      uploaded_by_name: 'Shri R. K. Mishra (Case Officer)',
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    },
  ],
  3: [
    {
      id: 104,
      complaint_id: 3,
      file_name: 'high_court_writ_petition_4410_2026.pdf',
      file_size_bytes: 1420000,
      content_type: 'application/pdf',
      sha256_checksum: 'f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3',
      description: 'Certified true copy of High Court Writ Petition WP(C) 4410/2026.',
      is_confidential: false,
      uploaded_by_name: 'Adv. Meenakshi Sundaram',
      created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
  ],
  8: [
    {
      id: 105,
      complaint_id: 8,
      file_name: 'admission_brochure_unapproved_cse.pdf',
      file_size_bytes: 890000,
      content_type: 'application/pdf',
      sha256_checksum: '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff',
      description: 'College promotional prospectus advertising unapproved CSE Data Science seats without AICTE approval.',
      is_confidential: false,
      uploaded_by_name: 'Ms. Neha Gupta (Approval Bureau)',
      created_at: new Date(Date.now() - 17 * 86400000).toISOString(),
    },
  ],
};

export const MOCK_WORKSPACES = [
  {
    linkage_id: 1,
    id: 1,
    institution_id: 3,
    institution_name: 'Delhi Institute of Technology & Management',
    institution_aicte_id: '1-99887755',
    source_complaint_id: 8,
    source_complaint_no: 'AICTE/AB/2026/0008',
    source_bureau: 'APPROVAL_BUREAU',
    source_status: 'SHOW_CAUSE_ISSUED',
    target_complaint_id: 9,
    target_complaint_no: 'AICTE/PGRC/2026/0009',
    target_bureau: 'PGRC',
    target_status: 'UNDER_INQUIRY',
    lead_bureau: 'APPROVAL_BUREAU',
    coordination_decision: 'JOINT_INQUIRY',
    coordination_notes: 'Joint inquiry linking unapproved 60-seat CSE Data Science expansion (Approval Bureau) and illegal Rs 3.5L capitation fee demand (PGRC). Joint show-cause issued to Chairman.',
    coordination_deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
    status: 'ACTIVE',
    is_active: true,
    similarity_score: 0.94,
    confidence_tier: 'HIGH',
    outstanding_tasks_count: 2,
    overdue_tasks_count: 0,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    follow_up_tasks: [
      {
        id: 1,
        linkage_id: 1,
        title: 'Joint physical on-site scrutiny of AY 2026 admissions and student enrollment rosters',
        target_bureau: 'APPROVAL_BUREAU',
        assigned_to_name: 'Ms. Neha Gupta',
        deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
      },
      {
        id: 2,
        linkage_id: 1,
        title: 'Audit of capitation fee bank accounts and verification of cash deposit slips',
        target_bureau: 'PGRC',
        assigned_to_name: 'Shri Amit Patel',
        deadline: new Date(Date.now() + 12 * 86400000).toISOString(),
        status: 'PENDING',
        priority: 'CRITICAL',
        created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
      },
    ],
  },
  {
    linkage_id: 2,
    id: 2,
    institution_id: 1,
    institution_name: 'Apex Institute of Engineering & Technology',
    institution_aicte_id: '1-10293847',
    source_complaint_id: 1,
    source_complaint_no: 'AICTE/PGRC/2026/0001',
    source_bureau: 'PGRC',
    source_status: 'UNDER_INQUIRY',
    target_complaint_id: 2,
    target_complaint_no: 'AICTE/RB/2026/0002',
    target_bureau: 'REGULATION_BUREAU',
    target_status: 'UNDER_INQUIRY',
    lead_bureau: 'REGULATION_BUREAU',
    coordination_decision: 'CONSOLIDATED_HEARING',
    coordination_notes: 'Consolidated proceedings addressing simultaneous degree certificate withholding and commercial campus land subletting.',
    coordination_deadline: new Date(Date.now() + 18 * 86400000).toISOString(),
    status: 'ACTIVE',
    is_active: true,
    similarity_score: 0.89,
    confidence_tier: 'HIGH',
    outstanding_tasks_count: 1,
    overdue_tasks_count: 0,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    follow_up_tasks: [
      {
        id: 3,
        linkage_id: 2,
        title: 'Issue unified summon to Governing Body for consolidated hearing',
        target_bureau: 'REGULATION_BUREAU',
        assigned_to_name: 'Shri R. K. Mishra',
        deadline: new Date(Date.now() + 9 * 86400000).toISOString(),
        status: 'PENDING',
        priority: 'HIGH',
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
    ],
  },
];

export const MOCK_AUDIT_LOGS = [
  {
    id: 1,
    event_type: 'CONFLICT_DETECTED',
    action_type: 'CONFLICT_DETECTED',
    bureau: 'AICTE_CENTRAL',
    actor_bureau: 'AICTE_CENTRAL',
    action_by: 'SYSTEM_COLLISION_RADAR',
    actor_name: 'SYSTEM_COLLISION_RADAR',
    actor_role: 'AUTOMATED_AGENT',
    details: 'Automated radar flagged 3 overlapping active cases for Apex Institute of Engineering & Technology (AICTE ID 1-10293847)',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    created_at: new Date(Date.now() - 14400000).toISOString(),
    block_hash: '8f4a18e9d5671a4bc564f8490a0f443b8791093f4122d4889c1fe0e8e49b841a',
    previous_hash: '0000000000000000000000000000000000000000000000000000000000000000',
    prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
  },
  {
    id: 2,
    event_type: 'COMPLAINT_LODGED',
    action_type: 'COMPLAINT_LODGED',
    bureau: 'PGRC',
    actor_bureau: 'PGRC',
    action_by: 'Shri Amit Patel (Case Officer)',
    actor_name: 'Shri Amit Patel',
    actor_role: 'CASE_OFFICER',
    details: 'Complaint AICTE/PGRC/2026/0001 registered against Apex Institute. Category: FEE_EXTORTION.',
    timestamp: new Date(Date.now() - 12 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    block_hash: '3bc721ad5e09f6e1f0e4b85552391bda31398877bcde69a031980a31be3298a0',
    previous_hash: '8f4a18e9d5671a4bc564f8490a0f443b8791093f4122d4889c1fe0e8e49b841a',
    prev_hash: '8f4a18e9d5671a4bc564f8490a0f443b8791093f4122d4889c1fe0e8e49b841a',
  },
  {
    id: 3,
    event_type: 'COORDINATION_INITIATED',
    action_type: 'COORDINATION_INITIATED',
    bureau: 'APPROVAL_BUREAU',
    actor_bureau: 'APPROVAL_BUREAU',
    action_by: 'Ms. Neha Gupta (Assistant Director)',
    actor_name: 'Ms. Neha Gupta',
    actor_role: 'CASE_OFFICER',
    details: 'Joint Coordination Workspace #1 established with PGRC for Delhi Institute of Technology & Management.',
    timestamp: new Date(Date.now() - 10 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    block_hash: '9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e',
    previous_hash: '3bc721ad5e09f6e1f0e4b85552391bda31398877bcde69a031980a31be3298a0',
    prev_hash: '3bc721ad5e09f6e1f0e4b85552391bda31398877bcde69a031980a31be3298a0',
  },
];

export function getMockFallback<T = any>(
  endpoint: string,
  method = 'GET',
  _body?: any,
  params?: Record<string, any>
): T | undefined {
  const cleanEndpoint = endpoint.split('?')[0];

  // 1. Conflict Radar
  if (cleanEndpoint === '/api/v1/conflicts/overlapping') {
    return MOCK_CONFLICTS as unknown as T;
  }

  // 2. Complaints list, detail & POST intake
  if (cleanEndpoint === '/api/v1/complaints') {
    if (method.toUpperCase() === 'POST') {
      let payload: any = {};
      try {
        payload = typeof _body === 'string' ? JSON.parse(_body) : (_body || {});
      } catch {
        payload = _body || {};
      }

      const instId = Number(payload.institution_id);
      const inst = MOCK_INSTITUTIONS.find((i) => i.id === instId) || MOCK_INSTITUTIONS[0];
      const newId = Date.now();
      const bureauCode = payload.bureau || 'PGRC';
      const randomSuffix = String(Math.floor(1000 + Math.random() * 9000));
      const complaintNo = `AICTE/${bureauCode}/2026/${randomSuffix}`;
      const nowIso = new Date().toISOString();
      const slaDays = Number(payload.sla_deadline_days) || 30;
      const slaDueDate = new Date(Date.now() + slaDays * 86400000).toISOString();

      const createdComplaint = {
        id: newId,
        complaint_no: complaintNo,
        institution_id: inst.id,
        institution_name: inst.name,
        aicte_permanent_id: inst.aicte_permanent_id,
        bureau: bureauCode,
        category: payload.category || 'FEE_EXTORTION',
        subject: payload.subject || 'Citizen Grievance Submission',
        description: payload.description || '',
        status: 'LODGED',
        priority: payload.priority || 'HIGH',
        assigned_officer_id: payload.assigned_officer_id ? Number(payload.assigned_officer_id) : 0,
        assigned_officer_name: payload.assigned_officer_name || 'Desk Officer (Pending Allocation)',
        complainant_name: payload.complainant_name || 'Anonymous Citizen',
        complainant_category: payload.complainant_category || 'STUDENT',
        complainant_email: payload.complainant_email || null,
        complainant_phone: payload.complainant_phone || null,
        is_anonymous_confidential: Boolean(payload.is_anonymous_confidential),
        created_at: nowIso,
        sla_due_date: slaDueDate,
        is_overdue: false,
      };

      MOCK_COMPLAINTS.unshift(createdComplaint);

      // Increment analytics counters
      MOCK_ANALYTICS.total_complaints = (MOCK_ANALYTICS.total_complaints || 0) + 1;
      MOCK_ANALYTICS.total_complaints_received = (MOCK_ANALYTICS.total_complaints_received || 0) + 1;
      MOCK_ANALYTICS.open_pending_complaints = (MOCK_ANALYTICS.open_pending_complaints || 0) + 1;
      MOCK_ANALYTICS.active_complaints = (MOCK_ANALYTICS.active_complaints || 0) + 1;

      // Update institution active cases
      inst.active_cases_count = (inst.active_cases_count || 0) + 1;
      if (!inst.active_bureaus.includes(bureauCode)) {
        inst.active_bureaus.push(bureauCode);
      }
      if (inst.active_bureaus.length >= 2) {
        inst.has_conflict = true;
      }

      return createdComplaint as unknown as T;
    }

    let items = [...MOCK_COMPLAINTS];
    if (params?.bureau && params.bureau !== 'ALL') {
      items = items.filter((c) => c.bureau === params.bureau);
    }
    if (params?.status && params.status !== 'ALL') {
      items = items.filter((c) => c.status === params.status);
    }
    return { items, total: items.length } as unknown as T;
  }

  // Officers listing for assignment
  if (cleanEndpoint === '/api/v1/complaints/officers') {
    let offs = [...MOCK_OFFICERS];
    if (params?.bureau) {
      offs = offs.filter((o) => o.bureau === params.bureau);
    }
    return offs as unknown as T;
  }

  // Evidence list
  const evidenceMatch = cleanEndpoint.match(/^\/api\/v1\/evidence\/complaint\/(\d+)/);
  if (evidenceMatch) {
    const compId = parseInt(evidenceMatch[1], 10);
    return (MOCK_EVIDENCE[compId] || []) as unknown as T;
  }

  // Status transition mutation
  const statusMatch = cleanEndpoint.match(/^\/api\/v1\/complaints\/(\d+)\/status/);
  if (statusMatch && method === 'PATCH') {
    const id = parseInt(statusMatch[1], 10);
    const comp = MOCK_COMPLAINTS.find((c) => c.id === id);
    let payload: any = {};
    try {
      payload = typeof _body === 'string' ? JSON.parse(_body) : (_body || {});
    } catch {
      payload = _body || {};
    }
    if (comp) {
      comp.status = payload.status || comp.status;
      if (payload.status === 'RESOLVED' || payload.status === 'DISPOSED') {
        MOCK_ANALYTICS.open_pending_complaints = Math.max(0, (MOCK_ANALYTICS.open_pending_complaints || 1) - 1);
        MOCK_ANALYTICS.disposed_complaints = (MOCK_ANALYTICS.disposed_complaints || 0) + 1;
        MOCK_ANALYTICS.resolved_complaints = (MOCK_ANALYTICS.resolved_complaints || 0) + 1;
      }
      MOCK_AUDIT_LOGS.unshift({
        id: Date.now(),
        event_type: 'STATUS_TRANSITION',
        action_type: 'STATUS_TRANSITION',
        bureau: comp.bureau,
        actor_bureau: comp.bureau,
        action_by: 'Authorized Case Officer',
        actor_name: 'Authorized Case Officer',
        actor_role: 'CASE_OFFICER',
        details: `Case ${comp.complaint_no} transitioned to ${comp.status}. Directive: ${payload.notes || 'Routine lifecycle update'}`,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        block_hash: '5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b',
        previous_hash: MOCK_AUDIT_LOGS[0]?.block_hash || '3bc721ad5e09f6e1f0e4b85552391bda31398877bcde69a031980a31be3298a0',
        prev_hash: MOCK_AUDIT_LOGS[0]?.block_hash || '3bc721ad5e09f6e1f0e4b85552391bda31398877bcde69a031980a31be3298a0',
      });
      return { success: true, complaint: comp, message: 'Status updated' } as unknown as T;
    }
  }

  // Officer assignment mutation
  const assignMatch = cleanEndpoint.match(/^\/api\/v1\/complaints\/(\d+)\/assign/);
  if (assignMatch && method === 'POST') {
    const id = parseInt(assignMatch[1], 10);
    const comp = MOCK_COMPLAINTS.find((c) => c.id === id);
    let payload: any = {};
    try {
      payload = typeof _body === 'string' ? JSON.parse(_body) : (_body || {});
    } catch {
      payload = _body || {};
    }
    const officer = MOCK_OFFICERS.find((o) => o.id === Number(payload.officer_id));
    if (comp && officer) {
      comp.assigned_officer_id = officer.id;
      comp.assigned_officer_name = officer.full_name;
      (comp as any).assigned_officer_designation = officer.designation;
      MOCK_AUDIT_LOGS.unshift({
        id: Date.now(),
        event_type: 'OFFICER_ASSIGNED',
        action_type: 'OFFICER_ASSIGNED',
        bureau: comp.bureau,
        actor_bureau: comp.bureau,
        action_by: officer.full_name,
        actor_name: officer.full_name,
        actor_role: officer.role,
        details: `Case ${comp.complaint_no} formally assigned to ${officer.full_name} (${officer.designation}). Directive: ${payload.assignment_notes || 'Triage completed'}`,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        block_hash: '7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f',
        previous_hash: MOCK_AUDIT_LOGS[0]?.block_hash || '3bc721ad5e09f6e1f0e4b85552391bda31398877bcde69a031980a31be3298a0',
        prev_hash: MOCK_AUDIT_LOGS[0]?.block_hash || '3bc721ad5e09f6e1f0e4b85552391bda31398877bcde69a031980a31be3298a0',
      });
      return { success: true, complaint: comp } as unknown as T;
    }
  }

  // Movements (transfers docket)
  if (cleanEndpoint === '/api/v1/movements') {
    let list = [...MOCK_MOVEMENTS];
    let complaintId = params?.complaint_id;
    if (!complaintId) {
      try {
        const u = new URL('http://dummy' + endpoint);
        complaintId = u.searchParams.get('complaint_id');
      } catch {
        // ignore
      }
    }
    if (complaintId) {
      list = list.filter((m) => String(m.complaint_id) === String(complaintId));
    }
    return list as unknown as T;
  }

  // Transfer file POST mutation
  const transferMatch = cleanEndpoint.match(/^\/api\/v1\/movements\/complaint\/(\d+)/);
  if (transferMatch && method === 'POST') {
    const compId = parseInt(transferMatch[1], 10);
    const comp = MOCK_COMPLAINTS.find((c) => c.id === compId);
    let payload: any = {};
    try {
      payload = typeof _body === 'string' ? JSON.parse(_body) : (_body || {});
    } catch {
      payload = _body || {};
    }
    const newMovement = {
      id: Date.now(),
      complaint_id: compId,
      complaint_no: comp?.complaint_no || `AICTE/PGRC/2026/${compId}`,
      from_bureau: comp?.bureau || 'PGRC',
      to_bureau: payload.to_bureau || 'REGULATION_BUREAU',
      movement_type: payload.movement_type || 'TRANSFER_REQUEST',
      status: 'PENDING_APPROVAL',
      reason: payload.reason || 'Case jurisdictional handover request',
      requested_by_name: 'Case Officer',
      decided_by_name: null,
      decision_notes: null,
      created_at: new Date().toISOString(),
      decided_at: null,
    };
    MOCK_MOVEMENTS.unshift(newMovement);
    MOCK_AUDIT_LOGS.unshift({
      id: Date.now(),
      event_type: 'FILE_TRANSFER_REQUESTED',
      action_type: 'FILE_TRANSFER_REQUESTED',
      bureau: comp?.bureau || 'PGRC',
      actor_bureau: comp?.bureau || 'PGRC',
      action_by: 'Case Officer',
      actor_name: 'Case Officer',
      actor_role: 'CASE_OFFICER',
      details: `File transfer docket initiated for ${newMovement.complaint_no}: ${newMovement.from_bureau} ➔ ${newMovement.to_bureau}. Reason: ${newMovement.reason}`,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      block_hash: '4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e',
      previous_hash: MOCK_AUDIT_LOGS[0]?.block_hash || '3bc721ad5e09f6e1f0e4b85552391bda31398877bcde69a031980a31be3298a0',
      prev_hash: MOCK_AUDIT_LOGS[0]?.block_hash || '3bc721ad5e09f6e1f0e4b85552391bda31398877bcde69a031980a31be3298a0',
    });
    return newMovement as unknown as T;
  }

  // Transfer decision PATCH mutation
  const decideMatch = cleanEndpoint.match(/^\/api\/v1\/movements\/(\d+)\/decide/);
  if (decideMatch && method === 'PATCH') {
    const movId = parseInt(decideMatch[1], 10);
    const mov = MOCK_MOVEMENTS.find((m) => m.id === movId);
    let payload: any = {};
    try {
      payload = typeof _body === 'string' ? JSON.parse(_body) : (_body || {});
    } catch {
      payload = _body || {};
    }
    if (mov) {
      mov.status = payload.decision || 'ACCEPTED';
      mov.decided_by_name = 'AICTE Chief Approver';
      mov.decision_notes = payload.notes || (payload.decision === 'ACCEPTED' ? 'Approved' : 'Rejected');
      mov.decided_at = new Date().toISOString();
      if (mov.status === 'ACCEPTED') {
        const comp = MOCK_COMPLAINTS.find((c) => c.id === mov.complaint_id);
        if (comp) {
          comp.bureau = mov.to_bureau;
        }
      }
      MOCK_AUDIT_LOGS.unshift({
        id: Date.now(),
        event_type: 'TRANSFER_DECIDED',
        action_type: 'TRANSFER_DECIDED',
        bureau: mov.to_bureau,
        actor_bureau: mov.to_bureau,
        action_by: 'AICTE Chief Approver',
        actor_name: 'AICTE Chief Approver',
        actor_role: 'BUREAU_ADMIN',
        details: `File transfer #${mov.id} for ${mov.complaint_no} was ${mov.status}. Remarks: ${mov.decision_notes}`,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        block_hash: '2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d',
        previous_hash: MOCK_AUDIT_LOGS[0]?.block_hash || '3bc721ad5e09f6e1f0e4b85552391bda31398877bcde69a031980a31be3298a0',
        prev_hash: MOCK_AUDIT_LOGS[0]?.block_hash || '3bc721ad5e09f6e1f0e4b85552391bda31398877bcde69a031980a31be3298a0',
      });
      return mov as unknown as T;
    }
  }

  // Similarity / Overlap Radar check
  if (cleanEndpoint === '/api/v1/similarity/check' && method === 'POST') {
    let payload: any = {};
    try {
      payload = typeof _body === 'string' ? JSON.parse(_body) : (_body || {});
    } catch {
      payload = _body || {};
    }
    const compId = Number(payload.complaint_id);
    const sourceComp = MOCK_COMPLAINTS.find((c) => c.id === compId) || MOCK_COMPLAINTS[0];

    // Find other complaints from different bureaus or same institution
    const candidates = MOCK_COMPLAINTS
      .filter((c) => c.id !== sourceComp.id)
      .slice(0, 4)
      .map((c, idx) => ({
        id: c.id,
        complaint_id: c.id,
        complaint_no: c.complaint_no,
        bureau_id: c.bureau,
        bureau: c.bureau,
        subject: c.subject,
        institution_name: c.institution_name,
        similarity_score: 0.94 - idx * 0.05,
        confidence_tier: idx < 2 ? 'HIGH' : 'MEDIUM',
        explanation: `[AICTE ID Linkage: ${c.aicte_permanent_id}] • [Institutional Respondent: ${c.institution_name}] • [Cross-Bureau Overlap: ${sourceComp.bureau} ➔ ${c.bureau}] • [Coinciding inquiry period & allegation cluster]`,
      }));

    return candidates as unknown as T;
  }

  // Similarity confirm linkage POST
  if (cleanEndpoint === '/api/v1/similarity/link' && method === 'POST') {
    let payload: any = {};
    try {
      payload = typeof _body === 'string' ? JSON.parse(_body) : (_body || {});
    } catch {
      payload = _body || {};
    }

    const srcComp = MOCK_COMPLAINTS.find((c) => c.id === Number(payload.source_complaint_id));
    const tgtComp = MOCK_COMPLAINTS.find((c) => c.id === Number(payload.target_complaint_id));

    if (payload.status === 'CONFIRMED_RELATED') {
      const newWs = {
        linkage_id: Date.now(),
        id: Date.now(),
        institution_id: srcComp?.institution_id || 1,
        institution_name: srcComp?.institution_name || 'Respondent Technical Institution',
        institution_aicte_id: srcComp?.aicte_permanent_id || '1-10293847',
        source_complaint_id: srcComp?.id || 1,
        source_complaint_no: srcComp?.complaint_no || 'AICTE/PGRC/2026/0001',
        source_bureau: srcComp?.bureau || 'PGRC',
        source_status: srcComp?.status || 'UNDER_INQUIRY',
        target_complaint_id: tgtComp?.id || 2,
        target_complaint_no: tgtComp?.complaint_no || 'AICTE/RB/2026/0002',
        target_bureau: tgtComp?.bureau || 'REGULATION_BUREAU',
        target_status: tgtComp?.status || 'UNDER_INQUIRY',
        lead_bureau: srcComp?.bureau || 'PGRC',
        coordination_decision: 'JOINT_INQUIRY',
        coordination_notes: payload.rationale || 'Officer confirmed cross-bureau overlap linkage. Joint workspace initiated.',
        coordination_deadline: new Date(Date.now() + 15 * 86400000).toISOString(),
        status: 'ACTIVE',
        is_active: true,
        similarity_score: payload.similarity_score || 0.92,
        confidence_tier: 'HIGH',
        outstanding_tasks_count: 1,
        overdue_tasks_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        follow_up_tasks: [
          {
            id: Date.now(),
            linkage_id: Date.now(),
            title: 'Joint inter-bureau evidence cross-examination & witness summon',
            target_bureau: tgtComp?.bureau || 'REGULATION_BUREAU',
            assigned_to_name: 'Joint Inquiry Officer',
            deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
            status: 'PENDING',
            priority: 'HIGH',
            created_at: new Date().toISOString(),
          },
        ],
      };
      MOCK_WORKSPACES.unshift(newWs);
      MOCK_AUDIT_LOGS.unshift({
        id: Date.now(),
        event_type: 'OVERLAP_CONFIRMED',
        action_type: 'OVERLAP_CONFIRMED',
        bureau: srcComp?.bureau || 'CENTRAL_ADMIN',
        actor_bureau: srcComp?.bureau || 'CENTRAL_ADMIN',
        action_by: 'Investigating Officer',
        actor_name: 'Investigating Officer',
        actor_role: 'CASE_OFFICER',
        details: `Confirmed overlap between ${srcComp?.complaint_no} and ${tgtComp?.complaint_no}. Rationale: ${payload.rationale}`,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        block_hash: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
        previous_hash: MOCK_AUDIT_LOGS[0]?.block_hash || '3bc721ad5e09f6e1f0e4b85552391bda31398877bcde69a031980a31be3298a0',
        prev_hash: MOCK_AUDIT_LOGS[0]?.block_hash || '3bc721ad5e09f6e1f0e4b85552391bda31398877bcde69a031980a31be3298a0',
      });
    }
    return { success: true, message: 'Link decision recorded successfully' } as unknown as T;
  }

  // Reports: Pending Ageing
  if (cleanEndpoint === '/api/v1/reports/pending-ageing' || cleanEndpoint === '/api/v1/reports/ageing') {
    return {
      status: 'success',
      data: {
        distribution: [
          { bucket: '< 15 Days', count: 5, color: 'bg-emerald-500' },
          { bucket: '15 - 30 Days', count: 4, color: 'bg-blue-500' },
          { bucket: '31 - 60 Days', count: 2, color: 'bg-amber-500' },
          { bucket: '61 - 90 Days', count: 1, color: 'bg-orange-500' },
          { bucket: '> 90 Days', count: 0, color: 'bg-rose-500' },
        ],
        total_pending: 12,
        average_age_days: 18.4,
      },
    } as unknown as T;
  }

  // Reports: Deadlines & Escalations
  if (cleanEndpoint === '/api/v1/reports/deadlines-escalations' || cleanEndpoint === '/api/v1/reports/deadlines') {
    return {
      status: 'success',
      data: {
        summary: {
          upcoming_7_days: 3,
          upcoming_15_days: 5,
          overdue_cases: 1,
          escalated_level_3: 1,
        },
        breaches: [
          {
            complaint_no: 'AICTE/REGL/2026/0007',
            institution_name: 'Kolkata Polytechnic Institute',
            bureau: 'REGULATION_BUREAU',
            overdue_days: 6,
            priority: 'HIGH',
          },
        ],
      },
    } as unknown as T;
  }

  // SLA scheduler trigger
  if (cleanEndpoint.startsWith('/api/v1/alerts/run-scheduler')) {
    MOCK_NOTIFICATIONS.unshift({
      id: Date.now(),
      title: '🚨 Citizen Charter SLA Breach Alert',
      message: 'Automated scheduler execution completed. 1 case flagged with regulatory escalation warnings.',
      category: 'SLA_BREACH',
      is_read: false,
      created_at: new Date().toISOString(),
    });
    return {
      success: true,
      escalated_count: 1,
      notifications_created: 1,
      message: 'Statutory SLA scheduler execution completed. Escalate notices dispatched.',
    } as unknown as T;
  }

  // Coordination workspace add task
  const addTaskMatch = cleanEndpoint.match(/^\/api\/v1\/coordination\/workspaces\/(\d+)\/tasks/);
  if (addTaskMatch && method === 'POST') {
    const wsId = parseInt(addTaskMatch[1], 10);
    const ws = MOCK_WORKSPACES.find((w) => w.linkage_id === wsId || w.id === wsId);
    let payload: any = {};
    try {
      payload = typeof _body === 'string' ? JSON.parse(_body) : (_body || {});
    } catch {
      payload = _body || {};
    }
    const newTask = {
      id: Date.now(),
      linkage_id: wsId,
      title: payload.title || 'New Joint Action Item',
      target_bureau: payload.target_bureau || 'APPROVAL_BUREAU',
      assigned_to_name: 'Lead Desk Officer',
      deadline: payload.deadline || new Date(Date.now() + 7 * 86400000).toISOString(),
      status: 'PENDING',
      priority: 'HIGH',
      created_at: new Date().toISOString(),
    };
    if (ws) {
      ws.follow_up_tasks = ws.follow_up_tasks || [];
      ws.follow_up_tasks.push(newTask);
      ws.outstanding_tasks_count = (ws.outstanding_tasks_count || 0) + 1;
    }
    MOCK_AUDIT_LOGS.unshift({
      id: Date.now(),
      event_type: 'TASK_ASSIGNED',
      action_type: 'TASK_ASSIGNED',
      bureau: payload.target_bureau || 'APPROVAL_BUREAU',
      actor_bureau: payload.target_bureau || 'APPROVAL_BUREAU',
      action_by: 'Coordination Task Manager',
      actor_name: 'Coordination Task Manager',
      actor_role: 'BUREAU_ADMIN',
      details: `New coordination action assigned in Workspace #${wsId}: "${newTask.title}" for ${newTask.target_bureau}`,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      block_hash: '3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e',
      previous_hash: MOCK_AUDIT_LOGS[0]?.block_hash || '3bc721ad5e09f6e1f0e4b85552391bda31398877bcde69a031980a31be3298a0',
      prev_hash: MOCK_AUDIT_LOGS[0]?.block_hash || '3bc721ad5e09f6e1f0e4b85552391bda31398877bcde69a031980a31be3298a0',
    });
    return newTask as unknown as T;
  }

  // Workspaces list
  if (cleanEndpoint === '/api/v1/coordination/workspaces') {
    return MOCK_WORKSPACES as unknown as T;
  }

  const workspaceDetailMatch = cleanEndpoint.match(/^\/api\/v1\/coordination\/workspaces\/(\d+)/);
  if (workspaceDetailMatch) {
    const wsId = parseInt(workspaceDetailMatch[1], 10);
    const ws = MOCK_WORKSPACES.find((w) => w.linkage_id === wsId || w.id === wsId) || MOCK_WORKSPACES[0];
    return ws as unknown as T;
  }

  const complaintDetailMatch = cleanEndpoint.match(/^\/api\/v1\/complaints\/(\d+)/);
  if (complaintDetailMatch) {
    const id = parseInt(complaintDetailMatch[1], 10);
    const comp = MOCK_COMPLAINTS.find((c) => c.id === id) || MOCK_COMPLAINTS[0];
    if (cleanEndpoint.endsWith('/detail')) {
      return {
        ...comp,
        timeline: [
          { status: 'LODGED', timestamp: comp.created_at, actor: 'Portal Ingestion', remarks: 'Initial digital intake recorded' },
          { status: comp.status, timestamp: new Date().toISOString(), actor: comp.assigned_officer_name || 'Desk Officer', remarks: 'Active inquiry processing' },
        ],
        allowed_transitions: ['UNDER_INQUIRY', 'SHOW_CAUSE_ISSUED', 'HEARING_SCHEDULED', 'RESOLVED_DISPOSED', 'RESOLVED'],
      } as unknown as T;
    }
    return comp as unknown as T;
  }

  // 3. Institutions & Dossier
  if (cleanEndpoint === '/api/v1/institutions') {
    const search = (params?.search || '').toLowerCase().trim();
    if (!search) {
      return MOCK_INSTITUTIONS as unknown as T;
    }
    const filtered = MOCK_INSTITUTIONS.filter(
      (inst) =>
        inst.name.toLowerCase().includes(search) ||
        inst.aicte_permanent_id.toLowerCase().includes(search) ||
        inst.city?.toLowerCase().includes(search) ||
        inst.state?.toLowerCase().includes(search) ||
        (inst.shortName && inst.shortName.toLowerCase().includes(search))
    );
    return filtered as unknown as T;
  }

  const dossierMatch = cleanEndpoint.match(/^\/api\/v1\/institutions\/(\d+)\/dossier/);
  if (dossierMatch) {
    const instId = parseInt(dossierMatch[1], 10);
    const inst = MOCK_INSTITUTIONS.find((i) => i.id === instId) || MOCK_INSTITUTIONS[0];
    const relatedCases = MOCK_COMPLAINTS.filter((c) => c.institution_id === inst.id);
    const activeCases = relatedCases.filter((c) => c.status !== 'RESOLVED' && c.status !== 'DISPOSED');
    const disposedCases = relatedCases.filter((c) => c.status === 'RESOLVED' || c.status === 'DISPOSED');
    const involvedBureaus = Array.from(new Set(relatedCases.map((c) => c.bureau)));

    return {
      institution: inst,
      total_complaints: relatedCases.length,
      active_inquiries: activeCases.length,
      disposed_cases: disposedCases.length,
      involved_bureaus: involvedBureaus.length > 0 ? involvedBureaus : inst.active_bureaus,
      complaints: relatedCases,
      has_conflicts: inst.has_conflict,
      active_cases: relatedCases,
      historical_cases: [],
      conflict_summary: {
        is_conflicting: inst.has_conflict,
        involved_bureaus: inst.active_bureaus,
        active_count: relatedCases.length,
      },
    } as unknown as T;
  }

  // 4. Analytics & KPIs
  if (cleanEndpoint === '/api/v1/analytics/overview') {
    return MOCK_ANALYTICS as unknown as T;
  }

  // 5. Notifications
  if (cleanEndpoint === '/api/v1/notifications') {
    return MOCK_NOTIFICATIONS as unknown as T;
  }

  // 6. Audit logs & Verification
  if (cleanEndpoint === '/api/v1/audit/logs') {
    return { items: MOCK_AUDIT_LOGS, total: MOCK_AUDIT_LOGS.length } as unknown as T;
  }
  if (cleanEndpoint === '/api/v1/audit/verify-integrity') {
    return {
      is_intact: true,
      is_valid: true,
      total_records: MOCK_AUDIT_LOGS.length,
      total_blocks: MOCK_AUDIT_LOGS.length,
      details: 'Cryptographic SHA-256 ledger integrity verified 100% valid with unbroken chain links.',
      verified_at: new Date().toISOString(),
      head_hash: MOCK_AUDIT_LOGS[0]?.block_hash || '3bc721ad5e09f6e1f0e4b85552391bda31398877bcde69a031980a31be3298a0',
      message: 'Cryptographic SHA-256 ledger integrity verified 100% valid with unbroken chain links.',
    } as unknown as T;
  }

  // 7. Unified Search
  if (cleanEndpoint.startsWith('/api/v1/search/unified')) {
    let q = '';
    try {
      const parsedUrl = new URL('http://dummy' + endpoint);
      q = (parsedUrl.searchParams.get('q') || '').toLowerCase().trim();
    } catch {
      q = '';
    }

    const matchedInstitutions = MOCK_INSTITUTIONS.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.aicte_permanent_id.toLowerCase().includes(q) ||
        i.state.toLowerCase().includes(q) ||
        (i.address && i.address.toLowerCase().includes(q))
    ).map((i) => ({
      id: i.id,
      name: i.name,
      aicte_id: i.aicte_permanent_id,
      city: i.address.split(',').pop()?.trim() || i.state,
      state: i.state,
      region: i.region,
      active_complaints_count: i.active_cases_count,
      is_conflicting: i.has_conflict,
    }));

    const matchedComplaints = MOCK_COMPLAINTS.filter(
      (c) =>
        c.complaint_no.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        c.institution_name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );

    return {
      complaints: matchedComplaints,
      institutions: matchedInstitutions,
      total_matches: matchedComplaints.length + matchedInstitutions.length,
    } as unknown as T;
  }

  // 8. Bureaus
  if (cleanEndpoint === '/api/v1/bureaus') {
    return [
      { code: 'CENTRAL_ADMIN', name: 'Central Administration & AICTE HQ', default_sla_days: 15 },
      { code: 'REGULATION_BUREAU', name: 'Regulation Bureau', default_sla_days: 30 },
      { code: 'PGRC', name: 'Public Grievance Redressal Cell', default_sla_days: 30 },
      { code: 'APPROVAL_BUREAU', name: 'Approval Bureau', default_sla_days: 30 },
      { code: 'LEGAL_CELL', name: 'Legal Cell', default_sla_days: 21 },
      { code: 'VIGILANCE_CELL', name: 'Vigilance Cell', default_sla_days: 45 },
      { code: 'POLICY_BUREAU', name: 'Policy & Academic Bureau', default_sla_days: 30 },
    ] as unknown as T;
  }


  // 9. Auth login
  if (cleanEndpoint === '/api/v1/auth/login' && method === 'POST') {
    return {
      access_token: 'demo_token_' + Date.now(),
      token_type: 'bearer',
    } as unknown as T;
  }

  // 10. Mutating endpoints (POST/PATCH/PUT) default success responses
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    return {
      success: true,
      message: 'Operation recorded successfully (Demonstration fallback)',
      id: Math.floor(Math.random() * 1000) + 100,
    } as unknown as T;
  }

  return undefined;
}

