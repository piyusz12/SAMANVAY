/**
 * SAMANVAY Frontend — Auth Feature Module
 * Provides role permissions, active bureau access helpers, and authentication context.
 */

export const DEMO_PERSONAS = [
  { email: 'admin@samanvay.aicte.gov.in', name: 'Dr. Rajesh Sharma', role: 'SUPER_ADMIN', bureau: 'CENTRAL_ADMIN' },
  { email: 'admin.pgrc@samanvay.aicte.gov.in', name: 'Smt. Sunita Verma', role: 'BUREAU_ADMIN', bureau: 'PGRC' },
  { email: 'officer.pgrc@samanvay.aicte.gov.in', name: 'Shri Amit Patel', role: 'CASE_OFFICER', bureau: 'PGRC' },
  { email: 'admin.approval@samanvay.aicte.gov.in', name: 'Dr. Sanjay Rao', role: 'BUREAU_ADMIN', bureau: 'APPROVAL_BUREAU' },
  { email: 'officer.approval@samanvay.aicte.gov.in', name: 'Ms. Neha Gupta', role: 'CASE_OFFICER', bureau: 'APPROVAL_BUREAU' },
  { email: 'officer.rb@samanvay.aicte.gov.in', name: 'Shri R. K. Mishra', role: 'CASE_OFFICER', bureau: 'REGULATION_BUREAU' },
  { email: 'officer.legal@samanvay.aicte.gov.in', name: 'Adv. Meenakshi Sundaram', role: 'CASE_OFFICER', bureau: 'LEGAL_CELL' },
  { email: 'officer.vigilance@samanvay.aicte.gov.in', name: 'Dr. Anand Swaroop', role: 'CASE_OFFICER', bureau: 'VIGILANCE_CELL' },
  { email: 'viewer.pgrc@samanvay.aicte.gov.in', name: 'Shri Vikram Sen', role: 'BUREAU_VIEWER', bureau: 'PGRC' },
  { email: 'auditor@samanvay.aicte.gov.in', name: 'CMA Arvind Kejriwal', role: 'AUDITOR', bureau: 'CENTRAL_ADMIN' },
];

export function canMutateCases(role) {
  return role === 'SUPER_ADMIN' || role === 'BUREAU_ADMIN' || role === 'CASE_OFFICER';
}

export function isAuditor(role) {
  return role === 'AUDITOR';
}
