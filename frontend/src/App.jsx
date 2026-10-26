import React, { useState, useEffect } from 'react';
import { api, setAuthToken } from './services/api';

// Components
import ExecutiveOverview from './components/ExecutiveOverview';
import ConflictRadarView from './components/ConflictRadarView';
import CasesRepositoryView from './components/CasesRepositoryView';
import InstitutionDossierView from './components/InstitutionDossierView';
import AISimilarityView from './components/AISimilarityView';
import TransfersView from './components/TransfersView';
import LodgeComplaintView from './components/LodgeComplaintView';
import AuditTrailView from './components/AuditTrailView';
import ComplaintDetailModal from './components/ComplaintDetailModal';
import HealthStatusModal from './components/HealthStatusModal';

const DEMO_PERSONAS = [
  {
    email: 'admin@samanvay.aicte.gov.in',
    name: 'Dr. Rajeshwar Sharma [SYNTHETIC]',
    role: 'SUPER_ADMIN',
    bureau: 'CENTRAL_ADMIN',
    designation: 'Central System Admin / AICTE HQ'
  },
  {
    email: 'head.rb@samanvay.aicte.gov.in',
    name: 'Prof. Anita Desai [SYNTHETIC]',
    role: 'BUREAU_HEAD',
    bureau: 'REGULATION_BUREAU',
    designation: 'Advisor & Head, Regulation Bureau'
  },
  {
    email: 'head.pgrc@samanvay.aicte.gov.in',
    name: 'Dr. K. V. Raman [SYNTHETIC]',
    role: 'BUREAU_HEAD',
    bureau: 'PGRC',
    designation: 'Director, Public Grievance Redressal Cell'
  },
  {
    email: 'head.legal@samanvay.aicte.gov.in',
    name: 'Adv. S. K. Mukherjee [SYNTHETIC]',
    role: 'BUREAU_HEAD',
    bureau: 'LEGAL_CELL',
    designation: 'Legal Advisor & Head, Legal Cell'
  },
  {
    email: 'head.vigilance@samanvay.aicte.gov.in',
    name: 'Col. R. S. Rathore (Retd.) [SYNTHETIC]',
    role: 'BUREAU_HEAD',
    bureau: 'VIGILANCE_CELL',
    designation: 'Chief Vigilance Officer'
  },
  {
    email: 'officer.rb@samanvay.aicte.gov.in',
    name: 'Sunil Verma [SYNTHETIC]',
    role: 'CASE_OFFICER',
    bureau: 'REGULATION_BUREAU',
    designation: 'Assistant Director / Scrutiny Officer'
  },
  {
    email: 'officer.pgrc@samanvay.aicte.gov.in',
    name: 'Pooja Hegde [SYNTHETIC]',
    role: 'CASE_OFFICER',
    bureau: 'PGRC',
    designation: 'Grievance Redressal Officer'
  },
  {
    email: 'bureau.officer.rb@samanvay.aicte.gov.in',
    name: 'Meera Swaminathan [SYNTHETIC]',
    role: 'BUREAU_OFFICER',
    bureau: 'REGULATION_BUREAU',
    designation: 'Section Officer / Reviewer'
  },
  {
    email: 'auditor@samanvay.aicte.gov.in',
    name: 'Sh. N. K. Sinha [SYNTHETIC]',
    role: 'AUDITOR',
    bureau: 'CENTRAL_ADMIN',
    designation: 'Read-Only Compliance & Performance Auditor'
  }
];

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [activeTab, setActiveTab] = useState('overview');
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedPersonaEmail, setSelectedPersonaEmail] = useState('admin@samanvay.aicte.gov.in');

  // Global State
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [loadingConflicts, setLoadingConflicts] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);

  // Complaints Table State
  const [complaints, setComplaints] = useState([]);
  const [totalComplaints, setTotalComplaints] = useState(0);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [complaintFilters, setComplaintFilters] = useState({
    page: 1,
    page_size: 20,
    bureau: 'ALL',
    status: 'ALL',
    priority: 'ALL',
    search: '',
    is_overdue: false
  });

  // Modal & Selection State
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(null);
  const [similaritySubjectCase, setSimilaritySubjectCase] = useState(null);

  // Transfer Request Dialog State
  const [transferComplaint, setTransferComplaint] = useState(null);
  const [targetBureau, setTargetBureau] = useState('REGULATION_BUREAU');
  const [transferReason, setTransferReason] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  // Initialize theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Authenticate as initial persona
  useEffect(() => {
    switchPersona(selectedPersonaEmail);
  }, [selectedPersonaEmail]);

  // Load overview, conflicts, notifications
  useEffect(() => {
    refreshDashboardData();
  }, [currentUser]);

  // Refresh complaints list whenever filters change
  useEffect(() => {
    loadComplaints(complaintFilters);
  }, [complaintFilters]);

  const switchPersona = async (email) => {
    try {
      const res = await api.login(email, 'Demo@AICTE2026!');
      setAuthToken(res.access_token);
      setCurrentUser(res.user);
    } catch (err) {
      console.error('Failed to authenticate persona:', err);
    }
  };

  const refreshDashboardData = async () => {
    try {
      setLoadingOverview(true);
      setLoadingConflicts(true);
      const [ovData, cfData, notifs] = await Promise.all([
        api.getAnalyticsOverview(),
        api.getOverlappingConflicts(),
        api.getNotifications().catch(() => [])
      ]);
      setOverview(ovData);
      setConflicts(cfData);
      setNotifications(notifs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOverview(false);
      setLoadingConflicts(false);
    }
  };

  const loadComplaints = async (filters) => {
    try {
      setLoadingComplaints(true);
      const res = await api.getComplaints(filters);
      setComplaints(res.items);
      setTotalComplaints(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComplaints(false);
    }
  };

  const handleSelectInstitution = (instId) => {
    setSelectedInstitutionId(instId);
    setActiveTab('dossier');
  };

  const handleRunSimilarity = (complaint) => {
    setSimilaritySubjectCase(complaint);
    setActiveTab('similarity');
  };

  const handleInitiateTransfer = (complaint) => {
    setTransferComplaint(complaint);
    setTargetBureau(complaint.bureau === 'PGRC' ? 'REGULATION_BUREAU' : 'PGRC');
  };

  const submitTransferRequest = async (e) => {
    e.preventDefault();
    if (!transferComplaint || !transferReason) return;
    try {
      setIsSubmittingTransfer(true);
      await api.requestTransfer(transferComplaint.id, {
        to_bureau: targetBureau,
        movement_type: 'TRANSFER_REQUEST',
        reason: transferReason
      });
      alert(`Transfer request forwarded to ${targetBureau.replace('_', ' ')}.`);
      setTransferComplaint(null);
      setTransferReason('');
      refreshDashboardData();
    } catch (err) {
      alert(`Transfer failed: ${err.message}`);
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="app-container">
      {/* 1. Official Government Top Header Bar */}
      <div className="gov-top-bar">
        <div className="gov-flag">
          <span>🏛️</span>
          <span>Government of India • Ministry of Education • All India Council for Technical Education</span>
        </div>
        <div className="gov-ps-tag">
          SIH PS 26264: AICTE Cross-Bureau Complaint Coordination Platform
        </div>
      </div>

      {/* 2. Main Executive Navigation Bar */}
      <header className="app-navbar">
        <div className="nav-brand">
          <div className="nav-emblem">⚖️</div>
          <div className="brand-text">
            <h1>
              SAMANVAY <span className="brand-badge">SIH PS 26264</span>
            </h1>
            <p>Smart Integrated Dashboard for Institution Complaint Tracking Across AICTE Bureaus</p>
          </div>
        </div>

        <div className="nav-actions">
          {/* Persona Switcher */}
          <div className="persona-selector">
            <span>👤</span>
            <select
              id="persona-switcher-select"
              className="persona-select"
              value={selectedPersonaEmail}
              onChange={(e) => setSelectedPersonaEmail(e.target.value)}
              title="Switch demo persona to test RBAC roles"
            >
              {DEMO_PERSONAS.map((p) => (
                <option key={p.email} value={p.email}>
                  {p.name} ({p.bureau.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          {/* Notifications Button */}
          <button
            id="notifications-bell-btn"
            className="btn-icon"
            onClick={() => setShowNotificationDrawer(!showNotificationDrawer)}
            title="Cross-bureau alerts & SLA notifications"
          >
            🔔
            {unreadNotificationsCount > 0 && (
              <span className="badge-counter">{unreadNotificationsCount}</span>
            )}
          </button>

          {/* Health Check Diagnostics Button */}
          <button
            id="health-status-btn"
            className="btn-icon"
            onClick={() => setShowHealthModal(true)}
            title="System Health & Database Diagnostics"
          >
            🩺
          </button>

          {/* Theme Toggle */}
          <button
            id="theme-toggle-btn"
            className="btn-icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle Light / Dark mode"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Notification Drawer Dropdown */}
      {showNotificationDrawer && (
        <div className="notification-drawer" id="notification-drawer">
          <div className="notification-header">
            <h4 style={{ fontSize: '14px', fontWeight: '700' }}>
              Notifications & Alerts ({notifications.length})
            </h4>
            <button
              className="btn-icon"
              style={{ width: '28px', height: '28px' }}
              onClick={() => setShowNotificationDrawer(false)}
            >
              ✕
            </button>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No active notifications.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notification-item ${!n.is_read ? 'unread' : ''} ${n.alert_type === 'OVERLAP_ALERT' ? 'overlap' : ''}`}
                  onClick={async () => {
                    if (!n.is_read) {
                      await api.markNotificationRead(n.id);
                      setNotifications(notifications.map((item) => item.id === n.id ? { ...item, is_read: true } : item));
                    }
                    if (n.complaint_id) {
                      setSelectedComplaintId(n.complaint_id);
                      setShowNotificationDrawer(false);
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span className="badge badge-danger" style={{ fontSize: '10.5px' }}>
                      {n.alert_type.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>{n.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{n.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. Navigation Tabs Menu */}
      <nav className="nav-tabs-container">
        <button
          id="tab-overview"
          className={`nav-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Executive Overview
        </button>

        <button
          id="tab-conflicts"
          className={`nav-tab-btn ${activeTab === 'conflicts' ? 'active' : ''}`}
          onClick={() => setActiveTab('conflicts')}
        >
          🚨 Conflict Radar
          {conflicts.length > 0 && (
            <span className="tab-badge">{conflicts.length}</span>
          )}
        </button>

        <button
          id="tab-cases"
          className={`nav-tab-btn ${activeTab === 'cases' ? 'active' : ''}`}
          onClick={() => setActiveTab('cases')}
        >
          📁 Complaints Repository
        </button>

        <button
          id="tab-dossier"
          className={`nav-tab-btn ${activeTab === 'dossier' ? 'active' : ''}`}
          onClick={() => setActiveTab('dossier')}
        >
          🏢 Institution 360° Dossier
        </button>

        <button
          id="tab-similarity"
          className={`nav-tab-btn ${activeTab === 'similarity' ? 'active' : ''}`}
          onClick={() => setActiveTab('similarity')}
        >
          🤖 AI Similarity & Deduplication
        </button>

        <button
          id="tab-transfers"
          className={`nav-tab-btn ${activeTab === 'transfers' ? 'active' : ''}`}
          onClick={() => setActiveTab('transfers')}
        >
          🔄 Inter-Bureau Transfers
        </button>

        <button
          id="tab-lodge"
          className={`nav-tab-btn ${activeTab === 'lodge' ? 'active' : ''}`}
          onClick={() => setActiveTab('lodge')}
        >
          ➕ Lodge New Complaint
        </button>

        <button
          id="tab-audit"
          className={`nav-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          📜 Audit Trail Log
        </button>
      </nav>

      {/* 4. Active Main Content Area */}
      <main className="main-content">
        {activeTab === 'overview' && (
          <ExecutiveOverview
            overview={overview}
            loading={loadingOverview}
            onSelectTab={setActiveTab}
            onSelectInstitution={handleSelectInstitution}
            onSelectComplaint={setSelectedComplaintId}
          />
        )}

        {activeTab === 'conflicts' && (
          <ConflictRadarView
            conflicts={conflicts}
            loading={loadingConflicts}
            onSelectInstitution={handleSelectInstitution}
            onSelectComplaint={setSelectedComplaintId}
            onRequestTransfer={handleInitiateTransfer}
          />
        )}

        {activeTab === 'cases' && (
          <CasesRepositoryView
            complaints={complaints}
            total={totalComplaints}
            loading={loadingComplaints}
            filters={complaintFilters}
            onFilterChange={setComplaintFilters}
            onSelectComplaint={setSelectedComplaintId}
            onSelectInstitution={handleSelectInstitution}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'dossier' && (
          <InstitutionDossierView
            selectedInstitutionId={selectedInstitutionId}
            onSelectComplaint={setSelectedComplaintId}
          />
        )}

        {activeTab === 'similarity' && (
          <AISimilarityView
            initialComplaint={similaritySubjectCase}
            onSelectComplaint={setSelectedComplaintId}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'transfers' && (
          <TransfersView
            currentUser={currentUser}
            onSelectComplaint={setSelectedComplaintId}
          />
        )}

        {activeTab === 'lodge' && (
          <LodgeComplaintView
            onComplaintCreated={(newCase) => {
              refreshDashboardData();
              loadComplaints(complaintFilters);
              setSelectedComplaintId(newCase.id);
            }}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'audit' && (
          <AuditTrailView
            onSelectComplaint={setSelectedComplaintId}
          />
        )}
      </main>

      {/* 5. Complaint Detail / Action Modal Drawer */}
      {selectedComplaintId && (
        <ComplaintDetailModal
          complaintId={selectedComplaintId}
          onClose={() => setSelectedComplaintId(null)}
          currentUser={currentUser}
          onComplaintUpdated={(updated) => {
            refreshDashboardData();
            loadComplaints(complaintFilters);
          }}
          onSelectInstitution={handleSelectInstitution}
          onRequestTransfer={handleInitiateTransfer}
          onRunSimilarityCheck={handleRunSimilarity}
        />
      )}

      {/* 6. Inter-Bureau Transfer Modal */}
      {transferComplaint && (
        <div className="modal-overlay" onClick={() => setTransferComplaint(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Inter-Bureau Transfer</h3>
              <button className="btn-icon" onClick={() => setTransferComplaint(null)}>✕</button>
            </div>

            <form onSubmit={submitTransferRequest}>
              <div style={{ marginBottom: '14px', fontSize: '13px' }}>
                Transferring case: <strong className="font-mono" style={{ color: 'var(--accent-blue)' }}>{transferComplaint.complaint_no}</strong>
                <div>Current Bureau: <strong>{transferComplaint.bureau.replace('_', ' ')}</strong></div>
              </div>

              <div className="form-group">
                <label className="form-label">Target Bureau *</label>
                <select
                  id="target-bureau-select"
                  className="form-select"
                  value={targetBureau}
                  onChange={(e) => setTargetBureau(e.target.value)}
                  required
                >
                  <option value="REGULATION_BUREAU">Regulation Bureau (RB)</option>
                  <option value="PGRC">Public Grievance Redressal Cell (PGRC)</option>
                  <option value="APPROVAL_BUREAU">Approval Bureau (AB)</option>
                  <option value="LEGAL_CELL">Legal Cell (LC)</option>
                  <option value="VIGILANCE_CELL">Vigilance Cell (VC)</option>
                  <option value="POLICY_BUREAU">Policy & Academic Planning Bureau</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Reason & Justification for Transfer *</label>
                <textarea
                  id="transfer-reason-textarea"
                  className="form-textarea"
                  rows="4"
                  placeholder="Explain why this case falls under the statutory purview of the target bureau..."
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  required
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setTransferComplaint(null)}
                >
                  Cancel
                </button>
                <button
                  id="submit-transfer-btn"
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmittingTransfer}
                >
                  {isSubmittingTransfer ? 'Forwarding...' : 'Submit Transfer Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. System Health Status Modal */}
      {showHealthModal && (
        <HealthStatusModal onClose={() => setShowHealthModal(false)} />
      )}
    </div>
  );
}
