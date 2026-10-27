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
  SCRUTINY_PENDING: { label: 'Scrutiny Pending', color: 'blue', step: 2 },
  UNDER_INQUIRY: { label: 'Under Inquiry', color: 'indigo', step: 3 },
  SHOW_CAUSE: { label: 'Show Cause Issued', color: 'amber', step: 4 },
  HEARING_SCHEDULED: { label: 'Hearing Scheduled', color: 'purple', step: 5 },
  RESOLVED: { label: 'Resolved', color: 'emerald', step: 6 },
  DISPOSED: { label: 'Disposed', color: 'green', step: 7 },
  TRANSFERRED: { label: 'Transferred', color: 'cyan', step: 3 },
  ESCALATED: { label: 'Escalated', color: 'rose', step: 4 },
};

export const COMPLAINT_CATEGORIES = [
  'Fee Extortion',
  'Faculty Salary Withheld',
  'Infrastructure Deficit',
  'Unapproved Courses',
  'Harassment & Ragging',
  'Admission Fraud',
  'Fake Faculty / Documents',
  'Recognition & Affiliation Dispute',
  'Withholding of Certificates',
  'Governance Malpractice',
];

export const DEMO_PERSONAS = [
  {
    role: 'SUPER_ADMIN',
    name: 'Dr. Rajesh Sharma',
    bureau: 'AICTE HQ',
    email: 'admin@samanvay.aicte.gov.in',
    designation: 'Member Secretary & Apex Administrator',
    avatar: '👨‍💼',
  },
  {
    role: 'CASE_OFFICER',
    name: 'Amit Patel',
    bureau: 'PGRC',
    email: 'officer.pgrc@samanvay.aicte.gov.in',
    designation: 'Senior Desk Officer — Grievance Cell',
    avatar: '🧑‍💻',
  },
  {
    role: 'BUREAU_ADMIN',
    name: 'Smt. Priya Sundaram',
    bureau: 'APPROVAL_BUREAU',
    email: 'head.approval@samanvay.aicte.gov.in',
    designation: 'Advisor & Bureau Head — Approval',
    avatar: '👩‍💼',
  },
  {
    role: 'CASE_OFFICER',
    name: 'Sunil Verma',
    bureau: 'REGULATION_BUREAU',
    email: 'officer.regulation@samanvay.aicte.gov.in',
    designation: 'Inspection Officer — Regulation',
    avatar: '👨‍🏫',
  },
  {
    role: 'CASE_OFFICER',
    name: 'Adv. Meenakshi Lekhi',
    bureau: 'LEGAL_CELL',
    email: 'officer.legal@samanvay.aicte.gov.in',
    designation: 'Legal Officer — High Court Division',
    avatar: '⚖️',
  },
  {
    role: 'CASE_OFFICER',
    name: 'Vikramaditya Roy',
    bureau: 'VIGILANCE_CELL',
    email: 'officer.vigilance@samanvay.aicte.gov.in',
    designation: 'Chief Vigilance Investigator',
    avatar: '🕵️',
  },
  {
    role: 'AUDITOR',
    name: 'CMA Arvind Kejriwal',
    bureau: 'AICTE HQ',
    email: 'auditor@samanvay.aicte.gov.in',
    designation: 'Central Regulatory Auditor (Read-Only)',
    avatar: '🔍',
  },
];
