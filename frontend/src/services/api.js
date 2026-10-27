const API_BASE = '/api/v1';

let authToken = localStorage.getItem('samanvay_token') || '';

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    localStorage.setItem('samanvay_token', token);
  } else {
    localStorage.removeItem('samanvay_token');
  }
};

export const getAuthToken = () => authToken;

const request = async (endpoint, options = {}) => {
  const headers = {
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const errJson = await response.json();
      if (typeof errJson.detail === 'string') {
        errorMsg = errJson.detail;
      } else if (Array.isArray(errJson.detail)) {
        errorMsg = errJson.detail.map((d) => d.msg || JSON.stringify(d)).join('; ');
      } else if (errJson.message) {
        errorMsg = errJson.message;
      }
    } catch (_) {}

    if (response.status === 401 && endpoint !== '/auth/login') {
      setAuthToken('');
    }
    throw new Error(errorMsg);
  }

  return response.json();
};

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => request('/auth/me'),

  // Institutions
  getInstitutions: (params = {}) => {
    const qs = new URLSearchParams(cleanObject(params)).toString();
    return request(`/institutions${qs ? `?${qs}` : ''}`);
  },
  getInstitution: (id) => request(`/institutions/${id}`),
  getInstitutionDossier: (id) => request(`/institutions/${id}/dossier`),
  getInstitutionAuditHistory: (id) => request(`/institutions/${id}/audit-history`),
  checkInstitutionDuplicate: (data) =>
    request('/institutions/match', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createInstitution: (data) =>
    request('/institutions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateInstitution: (id, data) =>
    request(`/institutions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  importInstitutionsCSV: (file, dryRun = true) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/institutions/import-csv?dry_run=${dryRun}`, {
      method: 'POST',
      body: formData,
    });
  },

  // Complaints
  getComplaints: (params = {}) => {
    const qs = new URLSearchParams(cleanObject(params)).toString();
    return request(`/complaints${qs ? `?${qs}` : ''}`);
  },
  getComplaint: (id) => request(`/complaints/${id}`),
  getComplaintDetail: (id) => request(`/complaints/${id}/detail`),
  getComplaintTimeline: (id) => request(`/complaints/${id}/timeline`),
  getAllowedTransitions: (id) => request(`/complaints/${id}/allowed-transitions`),
  getWorkflowStatuses: () => request('/complaints/workflow/statuses'),
  getBureauOfficers: (bureau) => request(`/complaints/officers${bureau ? `?bureau=${bureau}` : ''}`),
  createComplaint: (data) =>
    request('/complaints', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStatus: (id, data) =>
    request(`/complaints/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  assignOfficer: (id, officerId, notes) =>
    request(`/complaints/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ officer_id: officerId, assignment_notes: notes }),
    }),
  reassignOfficer: (id, data) =>
    request(`/complaints/${id}/reassign`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  uploadEvidence: (id, file, description = '', isConfidential = false) => {
    const formData = new FormData();
    formData.append('file', file);
    if (description) formData.append('description', description);
    if (isConfidential) formData.append('is_confidential', 'true');
    return request(`/evidence/complaint/${id}/upload`, {
      method: 'POST',
      body: formData,
    });
  },
  getEvidenceAttachments: (complaintId) => request(`/evidence/complaint/${complaintId}`),
  getEvidenceMetadata: (attachmentId) => request(`/evidence/${attachmentId}`),
  downloadEvidence: async (attachmentId, filename) => {
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    const response = await fetch(`${API_BASE}/evidence/${attachmentId}/download`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      let msg = `Download failed (${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson.detail) msg = errJson.detail;
      } catch (_) {}
      throw new Error(msg);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `evidence_${attachmentId}.dat`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
  deleteEvidence: (attachmentId, reason) =>
    request(`/evidence/${attachmentId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
  toggleEvidenceLegalHold: (attachmentId, legalHold, reason) =>
    request(`/evidence/${attachmentId}/legal-hold`, {
      method: 'POST',
      body: JSON.stringify({ legal_hold: legalHold, reason }),
    }),

  // Conflict Radar
  getOverlappingConflicts: () => request('/conflicts/overlapping'),
  getInstitutionConflict: (instId) => request(`/conflicts/institution/${instId}`),

  // Similarity & Linkages
  checkSimilarity: (data) =>
    request('/similarity/check', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getLinkages: () => request('/similarity/linkages'),
  createLinkage: (data) =>
    request('/similarity/link', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  reviewLinkage: (id, data) =>
    request(`/similarity/linkages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  evaluateBenchmarkDataset: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/similarity/evaluate-benchmark${qs ? `?${qs}` : ''}`);
  },
  getOptimalThresholds: () => request('/similarity/optimal-thresholds'),

  // Case Coordination Workspace (Phase 08)
  getCoordinationWorkspaces: (params = {}) => {
    const qs = new URLSearchParams(cleanObject(params)).toString();
    return request(`/coordination/workspaces${qs ? `?${qs}` : ''}`);
  },
  getCoordinationWorkspaceDetail: (id) =>
    request(`/coordination/workspaces/${id}`),
  submitCoordinationDecision: (id, data) =>
    request(`/coordination/workspaces/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  unlinkCoordinationCases: (id, data) =>
    request(`/coordination/workspaces/${id}/unlink`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  addCoordinationTask: (id, data) =>
    request(`/coordination/workspaces/${id}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCoordinationTask: (taskId, data) =>
    request(`/coordination/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getOutstandingCoordinationTasks: (params = {}) => {
    const qs = new URLSearchParams(cleanObject(params)).toString();
    return request(`/coordination/tasks/outstanding${qs ? `?${qs}` : ''}`);
  },

  // Movements & Transfers
  getMovements: (params = {}) => {
    const qs = new URLSearchParams(cleanObject(params)).toString();
    return request(`/movements${qs ? `?${qs}` : ''}`);
  },
  requestTransfer: (complaintId, data) =>
    request(`/movements/complaint/${complaintId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  decideTransfer: (movementId, data) =>
    request(`/movements/${movementId}/decide`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Analytics & KPIs
  getAnalyticsOverview: (params = {}) => {
    const qs = new URLSearchParams(cleanObject(params)).toString();
    return request(`/analytics/overview${qs ? `?${qs}` : ''}`);
  },

  // Audit Logs
  getAuditLogs: (params = {}) => {
    const qs = new URLSearchParams(cleanObject(params)).toString();
    return request(`/audit/logs${qs ? `?${qs}` : ''}`);
  },

  // Phase 11: Deadlines, Alerts & Escalations
  getNotifications: (params = {}) => {
    const qs = new URLSearchParams(cleanObject(params)).toString();
    return request(`/notifications${qs ? `?${qs}` : ''}`);
  },
  getUnreadNotificationCount: () => request('/notifications/unread-count'),
  markNotificationRead: (id) =>
    request(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),
  markAllNotificationsRead: () =>
    request('/notifications/mark-all-read', {
      method: 'POST',
    }),
  getNotificationDeliveryAttempts: (id) => request(`/notifications/${id}/delivery-attempts`),
  runDeadlineScheduler: (simulatedTime = null) => {
    const qs = simulatedTime ? `?simulated_time=${encodeURIComponent(simulatedTime)}` : '';
    return request(`/alerts/run-scheduler${qs}`, {
      method: 'POST',
    });
  },
  getAlertConfig: () => request('/alerts/config'),
  updateAlertConfig: (data) =>
    request('/alerts/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  retryFailedDeliveries: () =>
    request('/alerts/retry-deliveries', {
      method: 'POST',
    }),

  // Phase 10: Unified Search & Filtering
  unifiedSearch: (params = {}) => {
    const qs = new URLSearchParams(cleanObject(params)).toString();
    return request(`/search/unified${qs ? `?${qs}` : ''}`);
  },
  searchComplaints: (params = {}) => {
    const qs = new URLSearchParams(cleanObject(params)).toString();
    return request(`/search/complaints${qs ? `?${qs}` : ''}`);
  },
  searchInstitutions: (params = {}) => {
    const qs = new URLSearchParams(cleanObject(params)).toString();
    return request(`/search/institutions${qs ? `?${qs}` : ''}`);
  },

  // Phase 13: Reporting & Exports
  getBureauReport: (params = {}) => {
    const qs = new URLSearchParams(cleanObject(params)).toString();
    return request(`/reports/bureau${qs ? `?${qs}` : ''}`);
  },
  getRegionReport: (params = {}) => {
    const qs = new URLSearchParams(cleanObject(params)).toString();
    return request(`/reports/region${qs ? `?${qs}` : ''}`);
  },
  getInstitutionHistoryReport: (params = {}) => {
    const qs = new URLSearchParams(cleanObject(params)).toString();
    return request(`/reports/institution${qs ? `?${qs}` : ''}`);
  },
  getPendingAgeingReport: (params = {}) => {
    const qs = new URLSearchParams(cleanObject(params)).toString();
    return request(`/reports/ageing${qs ? `?${qs}` : ''}`);
  },
  getDisposalTrendsReport: (params = {}) => {
    const qs = new URLSearchParams(cleanObject(params)).toString();
    return request(`/reports/trends${qs ? `?${qs}` : ''}`);
  },
  getOverlapReport: (params = {}) => {
    const qs = new URLSearchParams(cleanObject(params)).toString();
    return request(`/reports/overlaps${qs ? `?${qs}` : ''}`);
  },
  getDeadlineEscalationReport: (params = {}) => {
    const qs = new URLSearchParams(cleanObject(params)).toString();
    return request(`/reports/deadlines${qs ? `?${qs}` : ''}`);
  },
  downloadReportCsv: async (reportType, params = {}, defaultFilename = null) => {
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    const cleanParams = cleanObject({ ...params, report_type: reportType });
    const qs = new URLSearchParams(cleanParams).toString();
    const response = await fetch(`${API_BASE}/reports/export/csv${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`CSV export failed: ${errText || response.statusText}`);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename || `samanvay_${reportType}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
  downloadReportPdf: async (reportType, params = {}, defaultFilename = null) => {
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    const cleanParams = cleanObject({ ...params, report_type: reportType });
    const qs = new URLSearchParams(cleanParams).toString();
    const response = await fetch(`${API_BASE}/reports/export/pdf${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`PDF export failed: ${errText || response.statusText}`);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename || `samanvay_${reportType}_summary_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};

function cleanObject(obj = {}) {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
      result[k] = typeof v === 'string' ? v.trim() : v;
    }
  }
  return result;
}
