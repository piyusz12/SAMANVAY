export interface BureauDef {
  id: string;
  name: string;
  badgeColor: string;
  description: string;
}

export const BUREAUS: Record<string, BureauDef> = {
  PGRC: {
    id: 'PGRC',
    name: 'Public Grievance Redressal Cell',
    badgeColor: 'blue',
    description: 'Student & faculty personal grievances, fee extortion, salary disputes',
  },
  APPROVAL_BUREAU: {
    id: 'APPROVAL_BUREAU',
    name: 'Approval Bureau',
    badgeColor: 'emerald',
    description: 'Extension of Approval (EoA), intake sanctioning, unapproved courses',
  },
  REGULATION_BUREAU: {
    id: 'REGULATION_BUREAU',
    name: 'Regulation Bureau',
    badgeColor: 'amber',
    description: 'Faculty cadre ratios, land norms, regulatory compliance, affiliation rules',
  },
  LEGAL_CELL: {
    id: 'LEGAL_CELL',
    name: 'Legal Cell',
    badgeColor: 'purple',
    description: 'Court hearings, writ petitions, contempt proceedings, stay orders',
  },
  VIGILANCE_CELL: {
    id: 'VIGILANCE_CELL',
    name: 'Vigilance Cell',
    badgeColor: 'rose',
    description: 'Ghost faculty, forged credentials, anti-corruption inquiries',
  },
  POLICY_BUREAU: {
    id: 'POLICY_BUREAU',
    name: 'Policy & Academic Planning Bureau',
    badgeColor: 'indigo',
    description: 'NEP compliance, curricula, credit frameworks, academic guidelines',
  },
};

export const COMPLAINT_STATUSES: Record<string, { label: string; color: string; step: number }> = {
  LODGED: { label: 'Lodged', color: 'slate', step: 1 },
  RECEIVED: { label: 'Received / Lodged', color: 'slate', step: 1 },
  SCRUTINY_PENDING: { label: 'Scrutiny Pending', color: 'blue', step: 2 },
  UNDER_REVIEW: { label: 'Under Review', color: 'blue', step: 2 },
  UNDER_INQUIRY: { label: 'Under Inquiry', color: 'indigo', step: 3 },
  IN_PROGRESS: { label: 'In Progress', color: 'indigo', step: 3 },
  AWAITING_INFORMATION: { label: 'Awaiting Information', color: 'amber', step: 3 },
  SHOW_CAUSE_ISSUED: { label: 'Show Cause Issued', color: 'amber', step: 4 },
  SHOW_CAUSE: { label: 'Show Cause Issued', color: 'amber', step: 4 },
  HEARING_SCHEDULED: { label: 'Hearing Scheduled', color: 'purple', step: 5 },
  RESOLVED: { label: 'Resolved', color: 'emerald', step: 6 },
  DISPOSED: { label: 'Disposed', color: 'green', step: 7 },
  TRANSFERRED: { label: 'Transferred', color: 'cyan', step: 3 },
  ESCALATED: { label: 'Escalated', color: 'rose', step: 4 },
};

export interface ComplaintCategoryDef {
  code: string;
  label: string;
}

export const COMPLAINT_CATEGORIES: ComplaintCategoryDef[] = [
  { code: 'FEE_EXTORTION', label: 'Fee Extortion & Caution Money Withholding' },
  { code: 'FACULTY_SALARY_WITHHELD', label: 'Faculty Salary Non-Payment / Delayed Disbursement' },
  { code: 'INFRASTRUCTURE_DEFICIT', label: 'Infrastructure Deficit & Safety Hazards' },
  { code: 'RECOGNITION_DISPUTE', label: 'Recognition & Court Litigation Disputes' },
  { code: 'FAKE_DEGREES_DOCUMENTS', label: 'Fraudulent Ghost Faculty & Fake Documents' },
  { code: 'UNAPPROVED_COURSES', label: 'Unapproved Programs / Excess Intake' },
  { code: 'RAGGING_HARASSMENT', label: 'Ragging & Student Harassment' },
  { code: 'ADMISSION_FRAUD', label: 'Admission Fraud / Capitation Fees' },
];

export const DEMO_PERSONAS = [
  {
    role: 'SUPER_ADMIN',
    name: 'Dr. Rajeshwar Sharma',
    bureau: 'CENTRAL_ADMIN',
    email: 'admin@samanvay.aicte.gov.in',
    designation: 'Central System Administrator / AICTE HQ',
    avatar: '👨‍💼',
  },
  {
    role: 'CASE_OFFICER',
    name: 'Pooja Hegde',
    bureau: 'PGRC',
    email: 'officer.pgrc@samanvay.aicte.gov.in',
    designation: 'Grievance Redressal Officer — PGRC',
    avatar: '🧑‍💻',
  },
  {
    role: 'BUREAU_ADMIN',
    name: 'Dr. Rameshwar Nath',
    bureau: 'APPROVAL_BUREAU',
    email: 'head.approval@samanvay.aicte.gov.in',
    designation: 'Advisor & Head — Approval Bureau',
    avatar: '👩‍💼',
  },
  {
    role: 'CASE_OFFICER',
    name: 'Sunil Verma',
    bureau: 'REGULATION_BUREAU',
    email: 'officer.rb@samanvay.aicte.gov.in',
    designation: 'Assistant Director / Scrutiny Officer',
    avatar: '👨‍🏫',
  },
  {
    role: 'BUREAU_ADMIN',
    name: 'Adv. S. K. Mukherjee',
    bureau: 'LEGAL_CELL',
    email: 'head.legal@samanvay.aicte.gov.in',
    designation: 'Legal Advisor & Head — Legal Cell',
    avatar: '⚖️',
  },
  {
    role: 'BUREAU_ADMIN',
    name: 'Col. R. S. Rathore (Retd.)',
    bureau: 'VIGILANCE_CELL',
    email: 'head.vigilance@samanvay.aicte.gov.in',
    designation: 'Chief Vigilance Officer',
    avatar: '🕵️',
  },
  {
    role: 'AUDITOR',
    name: 'Sh. N. K. Sinha',
    bureau: 'CENTRAL_ADMIN',
    email: 'auditor@samanvay.aicte.gov.in',
    designation: 'Read-Only Compliance & Performance Auditor',
    avatar: '🔍',
  },
];

