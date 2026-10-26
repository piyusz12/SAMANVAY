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
      errorMsg = errJson.detail || errorMsg;
    } catch (_) {}
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
    const qs = new URLSearchParams(params).toString();
    return request(`/institutions${qs ? `?${qs}` : ''}`);
  },
  getInstitution: (id) => request(`/institutions/${id}`),
  getInstitutionDossier: (id) => request(`/institutions/${id}/dossier`),

  // Complaints
  getComplaints: (params = {}) => {
    const cleanParams = {};
    Object.keys(params).forEach((k) => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '' && params[k] !== 'ALL') {
        cleanParams[k] = params[k];
      }
    });
    const qs = new URLSearchParams(cleanParams).toString();
    return request(`/complaints${qs ? `?${qs}` : ''}`);
  },
  getComplaint: (id) => request(`/complaints/${id}`),
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
  assignOfficer: (id, officerId) =>
    request(`/complaints/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ officer_id: officerId }),
    }),
  uploadEvidence: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/complaints/${id}/upload`, {
      method: 'POST',
      body: formData,
    });
  },

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

  // Movements & Transfers
  getMovements: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
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
  getAnalyticsOverview: () => request('/analytics/overview'),

  // Audit Logs
  getAuditLogs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/audit/logs${qs ? `?${qs}` : ''}`);
  },

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) =>
    request(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),
};
