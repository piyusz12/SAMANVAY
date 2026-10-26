import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function ComplaintDetailModal({
  complaintId,
  onClose,
  currentUser,
  onComplaintUpdated,
  onSelectInstitution,
  onRequestTransfer,
  onRunSimilarityCheck
}) {
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);

  // Status update form state
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // File upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchComplaintData();
  }, [complaintId]);

  const fetchComplaintData = async () => {
    try {
      setLoading(true);
      const data = await api.getComplaint(complaintId);
      setComplaint(data);
      setNewStatus(data.status);

      // Fetch audit logs
      const logs = await api.getAuditLogs({ complaint_id: complaintId });
      setAuditLogs(logs);
    } catch (err) {
      setError(err.message || 'Failed to load complaint details.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsUpdatingStatus(true);
      const updated = await api.updateStatus(complaintId, {
        status: newStatus,
        notes: statusNotes,
        resolution_summary: resolutionSummary
      });
      setComplaint(updated);
      setStatusNotes('');
      setResolutionSummary('');
      // Refresh logs
      const logs = await api.getAuditLogs({ complaint_id: complaintId });
      setAuditLogs(logs);
      if (onComplaintUpdated) onComplaintUpdated(updated);
    } catch (err) {
      alert(`Error updating status: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    try {
      setIsUploading(true);
      await api.uploadEvidence(complaintId, uploadFile);
      setUploadFile(null);
      await fetchComplaintData();
      alert('Supporting document uploaded successfully.');
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (!complaintId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '850px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="font-mono" style={{ fontSize: '15px', fontWeight: '800', color: 'var(--accent-blue)' }}>
                {complaint?.complaint_no || 'Loading...'}
              </span>
              {complaint && (
                <span className="badge badge-blue font-mono" style={{ fontSize: '11px' }}>
                  {complaint.bureau.replace('_', ' ')}
                </span>
              )}
            </div>
            <h3 style={{ marginTop: '4px' }}>
              {complaint?.subject || 'Case Inspector'}
            </h3>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close window">✕</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="loading-spinner"></div>
            <p style={{ marginTop: '10px', color: 'var(--text-secondary)' }}>Loading case file...</p>
          </div>
        ) : error ? (
          <div style={{ color: 'var(--status-danger)', padding: '20px 0' }}>{error}</div>
        ) : (
          <div>
            {/* Quick Action Toolbar */}
            <div
              style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '20px',
                padding: '12px',
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                flexWrap: 'wrap'
              }}
            >
              <button
                className="btn-secondary"
                style={{ fontSize: '12.5px' }}
                onClick={() => {
                  onClose();
                  onSelectInstitution(complaint.institution_id);
                }}
              >
                🏢 View Institution 360° Dossier
              </button>

              <button
                className="btn-secondary"
                style={{ fontSize: '12.5px' }}
                onClick={() => {
                  onClose();
                  onRequestTransfer(complaint);
                }}
              >
                🔄 Request Inter-Bureau Transfer
              </button>

              <button
                className="btn-secondary"
                style={{ fontSize: '12.5px' }}
                onClick={() => {
                  onClose();
                  onRunSimilarityCheck(complaint);
                }}
              >
                🤖 Run Explainable AI Duplicate Check
              </button>
            </div>

            {/* Case Overview Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Target Institution</div>
                <div style={{ fontWeight: '600', fontSize: '13.5px', marginTop: '2px' }}>{complaint.institution_name}</div>
                <div className="font-mono" style={{ fontSize: '11px', color: 'var(--accent-gold)' }}>{complaint.institution_aicte_id}</div>
              </div>

              <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Complainant / Stakeholder</div>
                <div style={{ fontWeight: '600', fontSize: '13.5px', marginTop: '2px' }}>{complaint.complainant_name}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Category: {complaint.complainant_category}</div>
              </div>

              <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>SLA Progress (AICTE Charter: {complaint.sla_deadline_days}d)</div>
                <div style={{ fontWeight: '700', fontSize: '13.5px', marginTop: '2px' }}>
                  {complaint.days_open} Days Open
                </div>
                <div style={{ marginTop: '4px' }}>
                  {complaint.sla_status === 'OVERDUE' ? (
                    <span className="badge badge-danger">🚨 SLA Overdue</span>
                  ) : complaint.sla_status === 'APPROACHING_DEADLINE' ? (
                    <span className="badge badge-warning">⏳ Near Deadline</span>
                  ) : complaint.sla_status === 'RESOLVED' ? (
                    <span className="badge badge-success">✅ Resolved</span>
                  ) : (
                    <span className="badge badge-success">🟢 On Track</span>
                  )}
                </div>
              </div>

              <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Assigned Desk Officer</div>
                <div style={{ fontWeight: '600', fontSize: '13.5px', marginTop: '2px' }}>
                  {complaint.assigned_officer_name || 'Unassigned / Queue'}
                </div>
                <span className="badge badge-neutral" style={{ fontSize: '11px', marginTop: '4px' }}>
                  Priority: {complaint.priority}
                </span>
              </div>
            </div>

            {/* Grievance Narrative Description */}
            <div style={{ marginBottom: '20px' }}>
              <h5 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                OFFICIAL GRIEVANCE STATEMENT & PARTICULARS:
              </h5>
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13.5px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {complaint.description}
              </div>
            </div>

            {/* Internal Scrutiny Notes if present */}
            {complaint.internal_notes && (
              <div style={{ marginBottom: '20px' }}>
                <h5 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--accent-gold)' }}>
                  🔒 INTERNAL BUREAU SCRUTINY NOTES:
                </h5>
                <div
                  style={{
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {complaint.internal_notes}
                </div>
              </div>
            )}

            {/* Resolution Summary if present */}
            {complaint.resolution_summary && (
              <div style={{ marginBottom: '20px' }}>
                <h5 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--status-success)' }}>
                  ✅ REGULATORY RESOLUTION & DISPOSAL ORDER:
                </h5>
                <div
                  style={{
                    background: 'var(--status-success-bg)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    lineHeight: '1.5'
                  }}
                >
                  {complaint.resolution_summary}
                </div>
              </div>
            )}

            {/* Lifecycle Status Transition Form */}
            <div
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px',
                marginBottom: '24px'
              }}
            >
              <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>
                Take Action / Transition Case State
              </h4>

              <form onSubmit={handleStatusSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">New Status</label>
                    <select
                      id="update-status-select"
                      className="form-select"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <option value="LODGED">LODGED</option>
                      <option value="SCRUTINY_PENDING">SCRUTINY PENDING</option>
                      <option value="UNDER_INQUIRY">UNDER INQUIRY</option>
                      <option value="SHOW_CAUSE_ISSUED">SHOW CAUSE ISSUED</option>
                      <option value="HEARING_SCHEDULED">HEARING SCHEDULED</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="DISPOSED">DISPOSED</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Inquiry Notes / Remarks</label>
                    <input
                      id="update-notes-input"
                      type="text"
                      className="form-input"
                      placeholder="Add investigation update or directive..."
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                    />
                  </div>
                </div>

                {(newStatus === 'RESOLVED' || newStatus === 'DISPOSED') && (
                  <div className="form-group">
                    <label className="form-label">Official Disposal Summary & Regulatory Decision</label>
                    <textarea
                      id="update-resolution-input"
                      className="form-textarea"
                      rows="3"
                      placeholder="Specify penalty imposed, compliance verified, or closure findings..."
                      value={resolutionSummary}
                      onChange={(e) => setResolutionSummary(e.target.value)}
                      required
                    ></textarea>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    id="submit-status-update-btn"
                    type="submit"
                    className="btn-primary"
                    disabled={isUpdatingStatus}
                  >
                    {isUpdatingStatus ? 'Saving...' : 'Record State Transition & Audit Event'}
                  </button>
                </div>
              </form>
            </div>

            {/* Evidence Document Upload */}
            <div style={{ marginBottom: '24px' }}>
              <h5 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>
                Supporting Evidence & Verification Vault
              </h5>
              {complaint.evidence_file_name && (
                <div style={{ fontSize: '12.5px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  Current on record: <strong className="font-mono">{complaint.evidence_file_name}</strong>
                </div>
              )}
              <form onSubmit={handleFileUpload} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  id="evidence-file-input"
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  style={{ fontSize: '12.5px' }}
                />
                <button
                  type="submit"
                  className="btn-secondary"
                  disabled={!uploadFile || isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </form>
            </div>

            {/* Immutable Regulatory Audit Log Feed */}
            <div>
              <h5 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px' }}>
                Immutable Audit Trail for this Case ({auditLogs.length} events)
              </h5>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span><strong>{log.actor_name}</strong> ({log.actor_bureau}) • {log.action_type}</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <div style={{ color: 'var(--text-primary)', marginTop: '2px' }}>{log.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
