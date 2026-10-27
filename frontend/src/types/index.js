/**
 * SAMANVAY Frontend — Domain Constants & Types
 */

export const BUREAUS = [
  { code: 'CENTRAL_ADMIN', name: 'Central Administration / HQ' },
  { code: 'REGULATION_BUREAU', name: 'Regulation Bureau' },
  { code: 'PGRC', name: 'Public Grievance Redressal Cell' },
  { code: 'APPROVAL_BUREAU', name: 'Approval Bureau' },
  { code: 'LEGAL_CELL', name: 'Legal Cell' },
  { code: 'VIGILANCE_CELL', name: 'Vigilance Cell' },
  { code: 'POLICY_BUREAU', name: 'Policy & Academic Bureau' }
];

export const COMPLAINT_CATEGORIES = [
  { code: 'FEE_EXTORTION', name: 'Fee Extortion & Caution Money Withholding' },
  { code: 'FACULTY_SALARY_WITHHELD', name: 'Faculty Salary Non-Payment' },
  { code: 'INFRASTRUCTURE_DEFICIT', name: 'Infrastructure Deficit & Safety Hazards' },
  { code: 'RECOGNITION_DISPUTE', name: 'Recognition & Court Litigation Disputes' },
  { code: 'FAKE_DEGREES_DOCUMENTS', name: 'Fraudulent Ghost Faculty & Fake Documents' },
  { code: 'UNAPPROVED_COURSES', name: 'Unapproved Programs / Excess Intake' },
  { code: 'ADMISSION_IRREGULARITY', name: 'Admissions Malpractices / Quota Violation' },
  { code: 'SEXUAL_HARASSMENT_ICC', name: 'ICC / POSH Non-Compliance' }
];

export const COMPLAINT_STATUSES = [
  'LODGED',
  'UNDER_INQUIRY',
  'SHOW_CAUSE_ISSUED',
  'HEARING_SCHEDULED',
  'RESOLVED',
  'DISPOSED',
  'REJECTED'
];

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const ROLES = [
  'SUPER_ADMIN',
  'BUREAU_ADMIN',
  'CASE_OFFICER',
  'BUREAU_VIEWER',
  'AUDITOR'
];

export const COORDINATION_DECISIONS = [
  'JOINT_INQUIRY',
  'TRANSFER_CUSTODY',
  'PARALLEL_MONITORING',
  'DISMISSED_UNRELATED'
];
