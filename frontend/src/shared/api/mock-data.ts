/**
 * SAMANVAY — Synthetic Demonstration Dataset Fallback
 * Provides deterministic AICTE demonstration data when backend is in standalone preview or offline mode.
 */

export const MOCK_CONFLICTS = [
  {
    institution_id: 1,
    institution_name: 'Apex Institute of Engineering & Technology [SYNTHETIC]',
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
    institution_name: 'National Institute of Science & Technology [SYNTHETIC]',
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
    institution_name: 'Delhi Institute of Technology & Management [SYNTHETIC]',
    aicte_id: '1-99887766',
    aicte_permanent_id: '1-99887766',
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

export const MOCK_INSTITUTIONS = [
  {
    id: 1,
    name: 'Apex Institute of Engineering & Technology [SYNTHETIC]',
    aicte_permanent_id: '1-10293847',
    aishe_code: 'C-49102',
    address: 'Sector 12, Knowledge Park III, Navi Mumbai',
    state: 'Maharashtra',
    region: 'Western',
    category: 'Engineering & Technology',
    status: 'ACTIVE',
    active_cases_count: 3,
    active_bureaus: ['REGULATION_BUREAU', 'PGRC', 'LEGAL_CELL'],
    has_conflict: true,
  },
  {
    id: 2,
    name: 'National Institute of Science & Technology [SYNTHETIC]',
    aicte_permanent_id: '1-28491022',
    aishe_code: 'C-38291',
    address: 'Plot 45, Electronic City Phase 1, Bangalore',
    state: 'Karnataka',
    region: 'South-West',
    category: 'Engineering & Technology',
    status: 'ACTIVE',
    active_cases_count: 2,
    active_bureaus: ['VIGILANCE_CELL', 'PGRC'],
    has_conflict: true,
  },
  {
    id: 3,
    name: 'Delhi Institute of Technology & Management [SYNTHETIC]',
    aicte_permanent_id: '1-99887766',
    aishe_code: 'C-27483',
    address: 'Institutional Area, Rohini Sector 22, New Delhi',
    state: 'Delhi',
    region: 'Northern',
    category: 'Engineering & Technology',
    status: 'ACTIVE',
    active_cases_count: 4,
    active_bureaus: ['APPROVAL_BUREAU', 'PGRC', 'LEGAL_CELL'],
    has_conflict: true,
  },
  {
    id: 4,
    name: 'Kolkata Polytechnic Institute [SYNTHETIC]',
    aicte_permanent_id: '1-66554433',
    aishe_code: 'C-16572',
    address: 'Raja SC Mullick Road, Jadavpur, Kolkata',
    state: 'West Bengal',
    region: 'Eastern',
    category: 'Polytechnic Diploma',
    status: 'ACTIVE',
    active_cases_count: 1,
    active_bureaus: ['REGULATION_BUREAU'],
    has_conflict: false,
  },
  {
    id: 5,
    name: 'Chennai Global Engineering College [SYNTHETIC]',
    aicte_permanent_id: '1-55443322',
    aishe_code: 'C-05661',
    address: 'Rajiv Gandhi Salai (OMR), Karapakkam, Chennai',
    state: 'Tamil Nadu',
    region: 'Southern',
    category: 'Engineering & Technology',
    status: 'ACTIVE',
    active_cases_count: 0,
    active_bureaus: [],
    has_conflict: false,
  },
  {
    id: 6,
    name: 'Bhopal Institute of Science & Applied Tech [SYNTHETIC]',
    aicte_permanent_id: '1-44332211',
    aishe_code: 'C-94750',
    address: 'Airport Road, Gandhinagar, Bhopal',
    state: 'Madhya Pradesh',
    region: 'Central',
    category: 'Engineering & Technology',
    status: 'ACTIVE',
    active_cases_count: 0,
    active_bureaus: [],
    has_conflict: false,
  },
];

export const MOCK_COMPLAINTS = [
  {
    id: 1,
    complaint_no: 'AICTE/PGRC/2026/0001',
    institution_id: 1,
    institution_name: 'Apex Institute of Engineering & Technology [SYNTHETIC]',
    aicte_permanent_id: '1-10293847',
    bureau: 'PGRC',
    category: 'FEE_EXTORTION',
    subject: 'Withholding original B.Tech degree certificates until illegal caution deposit is paid',
    description: 'The college administration is unlawfully withholding original degree certificates and grade cards of graduating 2025-26 B.Tech batch students, demanding an additional illegal payment of Rs 45,000 titled caution money settlement without receipt.',
    status: 'UNDER_INQUIRY',
    priority: 'HIGH',
    assigned_officer_id: 3,
    assigned_officer_name: 'Shri Amit Patel',
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
    institution_name: 'Apex Institute of Engineering & Technology [SYNTHETIC]',
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
    institution_name: 'Apex Institute of Engineering & Technology [SYNTHETIC]',
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
    institution_name: 'Delhi Institute of Technology & Management [SYNTHETIC]',
    aicte_permanent_id: '1-99887766',
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
    institution_name: 'Delhi Institute of Technology & Management [SYNTHETIC]',
    aicte_permanent_id: '1-99887766',
    bureau: 'PGRC',
    category: 'FEE_EXTORTION',
    subject: 'Illegal capitation fee and cash donation demanded for Computer Science admission',
    description: 'Parent grievance reporting demand of Rs 3,50,000 cash capitation fee for management quota seat in unapproved Computer Science branch.',
    status: 'UNDER_INQUIRY',
    priority: 'HIGH',
    assigned_officer_id: 3,
    assigned_officer_name: 'Shri Amit Patel',
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
    institution_name: 'Kolkata Polytechnic Institute [SYNTHETIC]',
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

export const MOCK_AUDIT_LOGS = [
  {
    id: 1,
    event_type: 'CONFLICT_DETECTED',
    bureau: 'AICTE_CENTRAL',
    action_by: 'SYSTEM_COLLISION_RADAR',
    details: 'Automated radar flagged 3 overlapping active cases for Apex Institute of Engineering & Technology (AICTE ID 1-10293847)',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    block_hash: '8f4a18e9d5671a4bc564f8490a0f443b8791093f4122d4889c1fe0e8e49b841a',
    previous_hash: '0000000000000000000000000000000000000000000000000000000000000000',
  },
  {
    id: 2,
    event_type: 'COMPLAINT_LODGED',
    bureau: 'PGRC',
    action_by: 'Shri Amit Patel (Case Officer)',
    details: 'Complaint AICTE/PGRC/2026/0001 registered against Apex Institute. Category: FEE_EXTORTION.',
    timestamp: new Date(Date.now() - 12 * 86400000).toISOString(),
    block_hash: '3bc721ad5e09f6e1f0e4b85552391bda31398877bcde69a031980a31be3298a0',
    previous_hash: '8f4a18e9d5671a4bc564f8490a0f443b8791093f4122d4889c1fe0e8e49b841a',
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

  // 2. Complaints list & detail
  if (cleanEndpoint === '/api/v1/complaints') {
    let items = [...MOCK_COMPLAINTS];
    if (params?.bureau && params.bureau !== 'ALL') {
      items = items.filter((c) => c.bureau === params.bureau);
    }
    if (params?.status && params.status !== 'ALL') {
      items = items.filter((c) => c.status === params.status);
    }
    return { items, total: items.length } as unknown as T;
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
        allowed_transitions: ['UNDER_INQUIRY', 'SHOW_CAUSE_ISSUED', 'HEARING_SCHEDULED', 'RESOLVED_DISPOSED'],
      } as unknown as T;
    }
    return comp as unknown as T;
  }

  // 3. Institutions & Dossier
  if (cleanEndpoint === '/api/v1/institutions') {
    return MOCK_INSTITUTIONS as unknown as T;
  }

  const dossierMatch = cleanEndpoint.match(/^\/api\/v1\/institutions\/(\d+)\/dossier/);
  if (dossierMatch) {
    const instId = parseInt(dossierMatch[1], 10);
    const inst = MOCK_INSTITUTIONS.find((i) => i.id === instId) || MOCK_INSTITUTIONS[0];
    const relatedCases = MOCK_COMPLAINTS.filter((c) => c.institution_id === inst.id);
    return {
      institution: inst,
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
      is_valid: true,
      total_blocks: 28,
      verified_at: new Date().toISOString(),
      head_hash: '3bc721ad5e09f6e1f0e4b85552391bda31398877bcde69a031980a31be3298a0',
      message: 'Cryptographic SHA-256 ledger integrity verified 100% valid with unbroken chain links.',
    } as unknown as T;
  }

  // 7. Bureaus
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

  // 8. Workspaces
  if (cleanEndpoint === '/api/v1/coordination/workspaces') {
    return [
      {
        id: 1,
        linkage_id: 1,
        lead_bureau: 'APPROVAL_BUREAU',
        institution_name: 'Delhi Institute of Technology & Management [SYNTHETIC]',
        status: 'ACTIVE',
        decision: 'JOINT_INQUIRY',
        tasks: [
          { id: 1, title: 'Joint physical on-site scrutiny of AY 2026 admissions', status: 'IN_PROGRESS', bureau: 'APPROVAL_BUREAU' },
          { id: 2, title: 'Verification of original student fee receipts and capitation refund', status: 'PENDING', bureau: 'PGRC' },
        ],
        involved_cases: ['AICTE/AB/2026/0008', 'AICTE/PGRC/2026/0009'],
        updated_at: new Date().toISOString(),
      },
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
