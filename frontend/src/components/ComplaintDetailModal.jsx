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
  const [detailData, setDetailData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [allowedTransitions, setAllowedTransitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'timeline', 'history'

  // Status transition state
  const [selectedNextStatus, setSelectedNextStatus] = useState('');
  const [transitionReason, setTransitionReason] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusActionError, setStatusActionError] = useState('');

  // Officer Assignment / Reassignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [bureauOfficers, setBureauOfficers] = useState([]);
  const [targetOfficerId, setTargetOfficerId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  // Evidence Vault state
  const [attachments, setAttachments] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadIsConfidential, setUploadIsConfidential] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [actionNotice, setActionNotice] = useState('');
  const [deletingAttId, setDeletingAttId] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [legalHoldPromptId, setLegalHoldPromptId] = useState(null);
  const [legalHoldReason, setLegalHoldReason] = useState('');
  const [isUpdatingHold, setIsUpdatingHold] = useState(false);

  const userRole = currentUser?.role ? currentUser.role.toUpperCase().replace(/\s+/g, '_') : '';
  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'BUREAU_ADMIN';
  const isAuditor = userRole === 'AUDITOR';

  useEffect(() => {
    fetchComplaintAllData();
  }, [complaintId]);

  const fetchComplaintAllData = async () => {
    try {
      setLoading(true);
      setError('');
      setStatusActionError('');

      // Fetch base complaint, detail with history, timeline, transitions, and evidence attachments concurrently
      const [baseData, detailRes, timelineRes, transitionsRes, evidenceRes] = await Promise.all([
        api.getComplaint(complaintId),
        api.getComplaintDetail(complaintId).catch(() => null),
        api.getComplaintTimeline(complaintId).catch(() => []),
        api.getAllowedTransitions(complaintId).catch(() => ({ allowed_transitions: [] })),
        api.getEvidenceAttachments(complaintId).catch(() => [])
      ]);

      setComplaint(baseData);
      setDetailData(detailRes);
      setTimeline(timelineRes || []);
      setAttachments(evidenceRes || []);

      const transitions = transitionsRes?.allowed_transitions || [];
      setAllowedTransitions(transitions);
      if (transitions.length > 0) {
        setSelectedNextStatus(transitions[0].status);
      } else {
        setSelectedNextStatus('');
      }

      // Fetch bureau officers for assignment controls
      if (baseData?.bureau) {
        api.getBureauOfficers(baseData.bureau)
          .then((officers) => setBureauOfficers(officers || []))
          .catch(() => setBureauOfficers([]));
      }
    } catch (err) {
      setError(err.message || 'Failed to load complaint data.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    setStatusActionError('');

    if (!selectedNextStatus) {
      setStatusActionError('Please select a valid target status.');
      return;
    }

    const targetConfig = allowedTransitions.find(t => t.status === selectedNextStatus);
    const requiresReason = targetConfig?.requires_reason;

    if (requiresReason && (!transitionReason || !transitionReason.trim())) {
      setStatusActionError(`Transitioning to '${selectedNextStatus}' requires an official reason or justification.`);
      return;
    }

    if ((selectedNextStatus === 'RESOLVED' || selectedNextStatus === 'DISPOSED') && (!resolutionSummary || !resolutionSummary.trim())) {
      setStatusActionError('Final case closure requires an official resolution summary.');
      return;
    }

    try {
      setIsUpdatingStatus(true);
      const updated = await api.updateStatus(complaintId, {
        status: selectedNextStatus,
        reason: transitionReason || null,
        notes: transitionReason || null,
        resolution_summary: resolutionSummary || null,
        action_taken: `TRANSITION_TO_${selectedNextStatus}`
      });

      setComplaint(updated);
      setTransitionReason('');
      setResolutionSummary('');
      await fetchComplaintAllData();
      if (onComplaintUpdated) onComplaintUpdated(updated);
      alert(`Case state successfully transitioned to ${updated.status}.`);
    } catch (err) {
      setStatusActionError(err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAssignmentSubmit = async (e) => {
    e.preventDefault();
    if (!targetOfficerId) {
      alert('Please select an authorized officer.');
      return;
    }

    const isReassign = !!complaint.assigned_officer_id;
    if (isReassign && (!reassignReason || !reassignReason.trim())) {
      alert('Reassigning an active case requires a formal justification reason.');
      return;
    }

    try {
      setIsSavingAssignment(true);
      let updated;
      if (isReassign) {
        updated = await api.reassignOfficer(complaintId, {
          officer_id: Number(targetOfficerId),
          reassignment_reason: reassignReason
        });
      } else {
        updated = await api.assignOfficer(complaintId, Number(targetOfficerId), reassignReason || 'Initial desk assignment');
      }

      setComplaint(updated);
      setShowAssignModal(false);
      setTargetOfficerId('');
      setReassignReason('');
      await fetchComplaintAllData();
      if (onComplaintUpdated) onComplaintUpdated(updated);
      alert(`Case successfully ${isReassign ? 'reassigned' : 'assigned'} to ${updated.assigned_officer_name || 'selected officer'}.`);
    } catch (err) {
      alert(`Assignment failed: ${err.message}`);
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleDownloadAttachment = async (att) => {
    try {
      setDownloadingId(att.id);
      setActionNotice('');
      await api.downloadEvidence(att.id, att.original_file_name || att.file_name);
      setActionNotice(`Document '${att.file_name}' downloaded successfully.`);
      const updated = await api.getEvidenceAttachments(complaintId);
      setAttachments(updated);
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleToggleLegalHold = async (att) => {
    if (!legalHoldReason.trim() || legalHoldReason.trim().length < 5) {
      alert('Please provide a valid administrative/legal reason (at least 5 characters).');
      return;
    }
    try {
      setIsUpdatingHold(true);
      await api.toggleEvidenceLegalHold(att.id, !att.legal_hold, legalHoldReason.trim());
      setLegalHoldPromptId(null);
      setLegalHoldReason('');
      setActionNotice(`Legal hold ${!att.legal_hold ? 'applied to' : 'released from'} '${att.file_name}'.`);
      const [updated, tl] = await Promise.all([
        api.getEvidenceAttachments(complaintId),
        api.getComplaintTimeline(complaintId).catch(() => [])
      ]);
      setAttachments(updated);
      setTimeline(tl);
    } catch (err) {
      alert(`Legal hold update failed: ${err.message}`);
    } finally {
      setIsUpdatingHold(false);
    }
  };

  const handleDeleteAttachment = async (att) => {
    if (!deleteReason.trim() || deleteReason.trim().length < 10) {
      alert('Mandatory justification reason must be at least 10 characters.');
      return;
    }
    try {
      setIsDeleting(true);
      await api.deleteEvidence(att.id, deleteReason.trim());
      setDeletingAttId(null);
      setDeleteReason('');
      setActionNotice(`Evidence document '${att.file_name}' soft-deleted under regulatory retention.`);
      const [updated, tl] = await Promise.all([
        api.getEvidenceAttachments(complaintId),
        api.getComplaintTimeline(complaintId).catch(() => [])
      ]);
      setAttachments(updated);
      setTimeline(tl);
    } catch (err) {
      alert(`Evidence deletion failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    setUploadError('');
    setActionNotice('');
    if (!uploadFile) return;

    const allowed = ['.pdf', '.docx', '.xlsx', '.csv', '.png', '.jpg', '.jpeg', '.txt'];
    const name = uploadFile.name.toLowerCase();
    if (!allowed.some(ext => name.endsWith(ext))) {
      setUploadError('Permitted formats: PDF, DOCX, XLSX, CSV, PNG, JPG, TXT.');
      return;
    }
    if (uploadFile.size > 15 * 1024 * 1024) {
      setUploadError('File size exceeds the 15 MB maximum limit.');
      return;
    }

    try {
      setIsUploading(true);
      await api.uploadEvidence(complaintId, uploadFile, uploadDescription, uploadIsConfidential);
      setUploadFile(null);
      setUploadDescription('');
      setUploadIsConfidential(false);
      const fileInput = document.getElementById('vault-file-input');
      if (fileInput) fileInput.value = '';
      setActionNotice('Supporting document uploaded and verified in secure evidence vault.');
      await fetchComplaintAllData();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (!complaintId) return null;

  const currentTransitionConfig = allowedTransitions.find(t => t.status === selectedNextStatus);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '960px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="font-mono" style={{ fontSize: '15px', fontWeight: '800', color: 'var(--accent-blue)' }}>
                {complaint?.complaint_no || 'Case Reference'}
              </span>
              {complaint && (
                <>
                  <span className="badge badge-blue font-mono" style={{ fontSize: '11px' }}>
                    {complaint.bureau.replace('_', ' ')}
                  </span>
                  <span className="badge badge-neutral font-mono" style={{ fontSize: '11px' }}>
                    {complaint.status.replace('_', ' ')}
                  </span>
                  <span
                    className={`badge ${
                      complaint.priority === 'CRITICAL'
                        ? 'badge-danger'
                        : complaint.priority === 'HIGH'
                        ? 'badge-warning'
                        : 'badge-neutral'
                    }`}
                    style={{ fontSize: '11px' }}
                  >
                    Priority: {complaint.priority}
                  </span>
                  {complaint.assigned_officer_name ? (
                    <span className="badge badge-success font-mono" style={{ fontSize: '11px' }}>
                      👤 Assigned: {complaint.assigned_officer_name}
                    </span>
                  ) : (
                    <span className="badge badge-warning font-mono" style={{ fontSize: '11px' }}>
                      ⚠️ Unassigned
                    </span>
                  )}
                </>
              )}
            </div>
            <h3 style={{ marginTop: '6px', fontSize: '17px', fontWeight: '700' }}>
              {complaint?.subject || 'Complaint Lifecycle Management'}
            </h3>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close window">✕</button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '8px 0',
            background: 'var(--bg-subtle)'
          }}
        >
          <button
            className={`btn-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '6px 14px',
              fontSize: '12.5px',
              fontWeight: activeTab === 'overview' ? '700' : '500',
              borderBottom: activeTab === 'overview' ? '2px solid var(--accent-blue)' : 'none',
              background: 'transparent',
              color: activeTab === 'overview' ? 'var(--accent-blue)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            📋 Case Overview & Narrative
          </button>

          <button
            id="tab-evidence-vault"
            className={`btn-tab ${activeTab === 'evidence' ? 'active' : ''}`}
            onClick={() => setActiveTab('evidence')}
            style={{
              padding: '6px 14px',
              fontSize: '12.5px',
              fontWeight: activeTab === 'evidence' ? '700' : '500',
              borderBottom: activeTab === 'evidence' ? '2px solid var(--accent-blue)' : 'none',
              background: 'transparent',
              color: activeTab === 'evidence' ? 'var(--accent-blue)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            📁 Evidence Vault ({attachments.length})
          </button>

          <button
            id="tab-activity-timeline"
            className={`btn-tab ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
            style={{
              padding: '6px 14px',
              fontSize: '12.5px',
              fontWeight: activeTab === 'timeline' ? '700' : '500',
              borderBottom: activeTab === 'timeline' ? '2px solid var(--accent-blue)' : 'none',
              background: 'transparent',
              color: activeTab === 'timeline' ? 'var(--accent-blue)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            ⏱️ Activity Timeline ({timeline.length})
          </button>

          <button
            id="tab-status-history"
            className={`btn-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            style={{
              padding: '6px 14px',
              fontSize: '12.5px',
              fontWeight: activeTab === 'history' ? '700' : '500',
              borderBottom: activeTab === 'history' ? '2px solid var(--accent-blue)' : 'none',
              background: 'transparent',
              color: activeTab === 'history' ? 'var(--accent-blue)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            📜 Status & Assignment History
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <div className="loading-spinner"></div>
              <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Loading complaint dossier...</p>
            </div>
          ) : error ? (
            <div style={{ color: 'var(--status-danger)', padding: '20px' }}>⚠️ {error}</div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div>
                  {/* Quick Action Toolbar */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '10px',
                      marginBottom: '18px',
                      padding: '10px 14px',
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      flexWrap: 'wrap',
                      alignItems: 'center'
                    }}
                  >
                    <button
                      className="btn-secondary"
                      style={{ fontSize: '12px' }}
                      onClick={() => {
                        onClose();
                        onSelectInstitution(complaint.institution_id);
                      }}
                    >
                      🏢 Institution 360° Dossier
                    </button>

                    <button
                      className="btn-secondary"
                      style={{ fontSize: '12px' }}
                      onClick={() => {
                        onClose();
                        onRequestTransfer(complaint);
                      }}
                    >
                      🔄 Request Inter-Bureau Transfer
                    </button>

                    <button
                      className="btn-secondary"
                      style={{ fontSize: '12px' }}
                      onClick={() => {
                        onClose();
                        onRunSimilarityCheck(complaint);
                      }}
                    >
                      🤖 Run AI Similarity & Conflict Check
                    </button>

                    {isAdmin && (
                      <button
                        id="btn-open-assign-modal"
                        className="btn-primary"
                        style={{ fontSize: '12px', marginLeft: 'auto' }}
                        onClick={() => setShowAssignModal(true)}
                      >
                        {complaint.assigned_officer_id ? '🔄 Reassign Officer' : '👤 Assign Officer'}
                      </button>
                    )}
                  </div>

                  {/* Metadata Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '18px' }}>
                    <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Target Institution</div>
                      <div
                        style={{ fontWeight: '700', fontSize: '13px', marginTop: '2px', cursor: 'pointer', color: 'var(--accent-blue)' }}
                        onClick={() => {
                          onClose();
                          onSelectInstitution(complaint.institution_id);
                        }}
                      >
                        {complaint.institution_name}
                      </div>
                      <div className="font-mono" style={{ fontSize: '11px', color: 'var(--accent-gold)' }}>
                        {complaint.institution_aicte_id}
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Complainant / Stakeholder</div>
                      <div style={{ fontWeight: '600', fontSize: '13px', marginTop: '2px' }}>
                        {complaint.complainant_name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Category: <strong>{complaint.complainant_category}</strong>
                      </div>
                      {complaint.complainant_email && (
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          {complaint.complainant_email}
                        </div>
                      )}
                    </div>

                    <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SLA & Ageing Track</div>
                      <div style={{ fontWeight: '700', fontSize: '13px', marginTop: '2px' }}>
                        {complaint.days_open} Days Active / {complaint.sla_deadline_days}d SLA
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        {complaint.sla_status === 'OVERDUE' ? (
                          <span className="badge badge-danger">🚨 SLA Overdue</span>
                        ) : complaint.sla_status === 'APPROACHING_DEADLINE' ? (
                          <span className="badge badge-warning">⏳ Approaching Deadline</span>
                        ) : complaint.sla_status === 'RESOLVED' ? (
                          <span className="badge badge-success">✅ Resolved</span>
                        ) : (
                          <span className="badge badge-success">🟢 SLA On Track</span>
                        )}
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Current Owner / Officer</div>
                      <div style={{ fontWeight: '700', fontSize: '13px', marginTop: '2px' }}>
                        {complaint.assigned_officer_name || 'Unassigned (Queue)'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Bureau: <strong>{complaint.bureau.replace('_', ' ')}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Grievance Narrative Description */}
                  <div style={{ marginBottom: '18px' }}>
                    <h5 style={{ fontSize: '12.5px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                      OFFICIAL GRIEVANCE STATEMENT:
                    </h5>
                    <div
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '13px',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {complaint.description}
                    </div>
                  </div>

                  {/* Internal Scrutiny Notes if present */}
                  {complaint.internal_notes && (
                    <div style={{ marginBottom: '18px' }}>
                      <h5 style={{ fontSize: '12.5px', fontWeight: '700', marginBottom: '6px', color: 'var(--accent-gold)' }}>
                        🔒 CONFIDENTIAL INTERNAL SCRUTINY NOTES:
                      </h5>
                      <div
                        style={{
                          background: 'rgba(245, 158, 11, 0.08)',
                          border: '1px solid rgba(245, 158, 11, 0.25)',
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '12.5px',
                          lineHeight: '1.5',
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {complaint.internal_notes}
                      </div>
                    </div>
                  )}

                  {/* Resolution Order if present */}
                  {complaint.resolution_summary && (
                    <div style={{ marginBottom: '18px' }}>
                      <h5 style={{ fontSize: '12.5px', fontWeight: '700', marginBottom: '6px', color: 'var(--status-success)' }}>
                        ✅ REGULATORY RESOLUTION & DISPOSAL ORDER:
                      </h5>
                      <div
                        style={{
                          background: 'var(--status-success-bg)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '12.5px',
                          lineHeight: '1.5'
                        }}
                      >
                        {complaint.resolution_summary}
                      </div>
                    </div>
                  )}

                  {/* Configurable Workflow Transition Action Bar */}
                  {!isAuditor && (
                    <div
                      style={{
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '16px',
                        marginBottom: '20px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h4 style={{ fontSize: '14.5px', fontWeight: '700' }}>
                          ⚡ Workflow Transition Engine (Current State: <span className="font-mono" style={{ color: 'var(--accent-blue)' }}>{complaint.status}</span>)
                        </h4>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          Role: {userRole}
                        </span>
                      </div>

                      {allowedTransitions.length === 0 ? (
                        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', padding: '10px 0' }}>
                          ℹ️ No authorized forward state transitions available for this case in its current status. Case may be terminal or requires administrative privileges.
                        </div>
                      ) : (
                        <form onSubmit={handleStatusSubmit}>
                          {statusActionError && (
                            <div style={{ color: 'var(--status-danger)', fontSize: '12px', marginBottom: '10px' }}>
                              ⚠️ {statusActionError}
                            </div>
                          )}

                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
                              Select Permitted Next Status:
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {allowedTransitions.map((t) => (
                                <button
                                  key={t.status}
                                  type="button"
                                  className={`btn-transition-choice ${selectedNextStatus === t.status ? 'selected' : ''}`}
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: selectedNextStatus === t.status ? '2px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                                    background: selectedNextStatus === t.status ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-card)',
                                    color: selectedNextStatus === t.status ? 'var(--accent-blue)' : 'var(--text-primary)',
                                    fontWeight: selectedNextStatus === t.status ? '700' : '500',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => setSelectedNextStatus(t.status)}
                                >
                                  {t.status.replace(/_/g, ' ')}
                                  {t.requires_reason && <span style={{ marginLeft: '4px', color: '#f59e0b' }}>*</span>}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Mandatory Reason Input when applicable */}
                          {currentTransitionConfig?.requires_reason && (
                            <div className="form-group" style={{ marginBottom: '12px' }}>
                              <label className="form-label" style={{ fontSize: '12px' }}>
                                Formal Justification / Reason for {selectedNextStatus.replace(/_/g, ' ')} *
                              </label>
                              <input
                                id="transition-reason-input"
                                type="text"
                                className="form-input"
                                placeholder={`Specify exact regulatory reason for transitioning to ${selectedNextStatus}...`}
                                value={transitionReason}
                                onChange={(e) => setTransitionReason(e.target.value)}
                                required
                              />
                            </div>
                          )}

                          {/* Remarks for other transitions */}
                          {!currentTransitionConfig?.requires_reason && (
                            <div className="form-group" style={{ marginBottom: '12px' }}>
                              <label className="form-label" style={{ fontSize: '12px' }}>
                                Investigation Remarks / Order Notes (Optional)
                              </label>
                              <input
                                id="transition-notes-input"
                                type="text"
                                className="form-input"
                                placeholder="Add investigation directive or notes..."
                                value={transitionReason}
                                onChange={(e) => setTransitionReason(e.target.value)}
                              />
                            </div>
                          )}

                          {/* Closure Resolution Summary */}
                          {(selectedNextStatus === 'RESOLVED' || selectedNextStatus === 'DISPOSED') && (
                            <div className="form-group" style={{ marginBottom: '12px' }}>
                              <label className="form-label" style={{ fontSize: '12px' }}>
                                Official Regulatory Disposal Summary & Council Finding *
                              </label>
                              <textarea
                                id="transition-resolution-input"
                                className="form-textarea"
                                rows="3"
                                placeholder="State penalty, compliance verified, or closure findings in detail..."
                                value={resolutionSummary}
                                onChange={(e) => setResolutionSummary(e.target.value)}
                                required
                              ></textarea>
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button
                              id="btn-execute-transition"
                              type="submit"
                              className="btn-primary"
                              disabled={isUpdatingStatus || !selectedNextStatus}
                            >
                              {isUpdatingStatus ? 'Executing...' : `Transition Case to ${selectedNextStatus.replace(/_/g, ' ')}`}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {/* Evidence Vault Card Summary */}
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h5 style={{ fontSize: '13px', fontWeight: '700', margin: 0 }}>
                        📁 Permitted Attachments & Evidence Vault ({attachments.length} active)
                      </h5>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '11px', padding: '3px 8px' }}
                        onClick={() => setActiveTab('evidence')}
                      >
                        Open Vault Tab →
                      </button>
                    </div>

                    {attachments.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                        {attachments.slice(0, 3).map((att) => (
                          <div
                            key={att.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              background: 'var(--bg-subtle)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '12px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                              <span>📄</span>
                              <strong style={{ color: 'var(--accent-blue)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {att.original_file_name || att.file_name}
                              </strong>
                              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                ({(att.file_size_bytes / 1024).toFixed(1)} KB)
                              </span>
                              {att.legal_hold && (
                                <span className="badge badge-warning" style={{ fontSize: '9.5px' }}>⚖️ HOLD</span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ fontSize: '11px', padding: '2px 8px' }}
                              onClick={() => handleDownloadAttachment(att)}
                              disabled={downloadingId === att.id}
                            >
                              {downloadingId === att.id ? '...' : '⬇️ Download'}
                            </button>
                          </div>
                        ))}
                        {attachments.length > 3 && (
                          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', textAlign: 'right' }}>
                            + {attachments.length - 3} more file{attachments.length - 3 === 1 ? '' : 's'} in Evidence Vault tab
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', marginBottom: '10px', color: 'var(--text-muted)' }}>
                        No evidence documents registered on record.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: ACTIVITY TIMELINE */}
              {activeTab === 'timeline' && (
                <div id="timeline-container">
                  <div style={{ marginBottom: '14px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '700' }}>
                      ⏱️ Chronological Case Activity Timeline
                    </h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      Complete chronological log across status changes, officer assignments, inter-bureau movements, attachments, and regulatory audits.
                    </p>
                  </div>

                  {timeline.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">📭</div>
                      <h4>No Timeline Events Recorded</h4>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {timeline.map((ev, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            gap: '12px',
                            background: 'var(--bg-subtle)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            padding: '12px 16px'
                          }}
                        >
                          <div style={{ fontSize: '20px', lineHeight: '1' }}>
                            {ev.event_type === 'STATUS_CHANGE'
                              ? '🔄'
                              : ev.event_type.includes('ASSIGNMENT')
                              ? '👤'
                              : ev.event_type === 'MOVEMENT'
                              ? '📨'
                              : ev.event_type === 'ATTACHMENT'
                              ? '📎'
                              : '📝'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>
                                {ev.title}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {new Date(ev.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                              {ev.description}
                            </div>
                            <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                              {ev.actor_name && (
                                <span>Actor: <strong>{ev.actor_name}</strong> ({ev.actor_role})</span>
                              )}
                              {ev.bureau && (
                                <span>Bureau: <strong>{ev.bureau}</strong></span>
                              )}
                              {ev.remarks && (
                                <span style={{ fontStyle: 'italic', color: 'var(--accent-gold)' }}>Remarks: "{ev.remarks}"</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: STATUS & ASSIGNMENT HISTORY */}
              {activeTab === 'history' && (
                <div>
                  {/* Status Progression History Table */}
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '14.5px', fontWeight: '700', marginBottom: '8px' }}>
                      Status Progression History ({detailData?.status_history?.length || 0} transitions)
                    </h4>
                    {detailData?.status_history?.length === 0 ? (
                      <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>No status history available.</div>
                    ) : (
                      <div className="data-table-container">
                        <table className="data-table" style={{ fontSize: '12px' }}>
                          <thead>
                            <tr>
                              <th>From Status</th>
                              <th>To Status</th>
                              <th>Action / Remarks</th>
                              <th>Changed By</th>
                              <th>Timestamp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailData?.status_history?.map((h) => (
                              <tr key={h.id}>
                                <td>
                                  <span className="font-mono">{h.from_status || 'INIT'}</span>
                                </td>
                                <td>
                                  <span className="badge badge-neutral font-mono">{h.to_status}</span>
                                </td>
                                <td>
                                  <div>{h.action_taken || 'Status Updated'}</div>
                                  {h.notes && (
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                      {h.notes}
                                    </div>
                                  )}
                                </td>
                                <td>User #{h.changed_by_id}</td>
                                <td>{new Date(h.created_at).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Assignment History Table */}
                  <div>
                    <h4 style={{ fontSize: '14.5px', fontWeight: '700', marginBottom: '8px' }}>
                      Desk Officer Assignment & Reassignment History ({detailData?.assignment_history?.length || 0} changes)
                    </h4>
                    {detailData?.assignment_history?.length === 0 ? (
                      <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>No assignment history available.</div>
                    ) : (
                      <div className="data-table-container">
                        <table className="data-table" style={{ fontSize: '12px' }}>
                          <thead>
                            <tr>
                              <th>Assigned Officer</th>
                              <th>Previous Officer</th>
                              <th>Bureau</th>
                              <th>Assignment Justification</th>
                              <th>Status</th>
                              <th>Timestamp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailData?.assignment_history?.map((a) => (
                              <tr key={a.id}>
                                <td>
                                  <strong>User #{a.assigned_officer_id}</strong>
                                </td>
                                <td>
                                  {a.previous_officer_id ? `User #${a.previous_officer_id}` : 'None (Initial)'}
                                </td>
                                <td>
                                  <span className="badge badge-blue font-mono" style={{ fontSize: '10px' }}>
                                    {a.bureau}
                                  </span>
                                </td>
                                <td>
                                  {a.assignment_notes || '—'}
                                </td>
                                <td>
                                  {a.is_current ? (
                                    <span className="badge badge-success font-mono">CURRENT OWNER</span>
                                  ) : (
                                    <span className="badge badge-neutral font-mono">HISTORICAL</span>
                                  )}
                                </td>
                                <td>{new Date(a.created_at).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: EVIDENCE VAULT */}
              {activeTab === 'evidence' && (
                <div id="evidence-vault-container">
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📁</span> Permitted Attachments & Secure Evidence Vault
                      <span className="badge badge-blue font-mono" style={{ fontSize: '11px' }}>
                        {attachments.length} / 10 Files Active
                      </span>
                    </h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      Tamper-proof evidence repository. Files are validated via magic byte inspection, verified with SHA-256 integrity checksums, scanned for malware threats, and stored in isolated storage outside publicly accessible web roots.
                    </p>
                  </div>

                  {actionNotice && (
                    <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: '14px', fontSize: '12.5px', color: '#16a34a' }}>
                      ✓ {actionNotice}
                    </div>
                  )}

                  {/* Attachment Cards / List */}
                  {attachments.length === 0 ? (
                    <div className="empty-state" style={{ marginBottom: '20px' }}>
                      <div className="empty-state-icon">📭</div>
                      <h4>No Evidence Files Attached</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Upload official inspection reports, faculty registers, bank statements, or supporting affidavits below.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '22px' }}>
                      {attachments.map((att) => (
                        <div
                          key={att.id}
                          style={{
                            background: 'var(--bg-card)',
                            border: att.legal_hold ? '1.5px solid #f59e0b' : '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            padding: '14px',
                            boxShadow: 'var(--shadow-sm)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ flex: 1, minWidth: '240px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                <span style={{ fontSize: '18px' }}>
                                  {att.file_name.endsWith('.pdf') ? '📄' : att.file_name.endsWith('.png') || att.file_name.endsWith('.jpg') ? '🖼️' : att.file_name.endsWith('.xlsx') || att.file_name.endsWith('.csv') ? '📊' : '📝'}
                                </span>
                                <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
                                  {att.original_file_name || att.file_name}
                                </strong>
                                {att.is_confidential && (
                                  <span className="badge badge-purple" style={{ fontSize: '10px' }}>🔒 CONFIDENTIAL</span>
                                )}
                                {att.legal_hold && (
                                  <span className="badge badge-warning font-mono" style={{ fontSize: '10px' }}>⚖️ LEGAL HOLD</span>
                                )}
                                <span className={`badge ${att.malware_scan_status === 'CLEAN' ? 'badge-success' : 'badge-danger'} font-mono`} style={{ fontSize: '10px' }}>
                                  {att.malware_scan_status === 'CLEAN' ? '🛡️ CLEAN' : '⚠️ THREAT'}
                                </span>
                              </div>

                              {att.description && (
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 8px 0' }}>
                                  {att.description}
                                </p>
                              )}

                              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--text-muted)' }}>
                                <span>Size: <strong>{(att.file_size_bytes / 1024).toFixed(1)} KB</strong></span>
                                <span>Format: <strong className="font-mono">{att.mime_type}</strong></span>
                                <span>Downloads: <strong>{att.download_count}</strong></span>
                                <span>Uploaded: {new Date(att.created_at).toLocaleString()}</span>
                              </div>

                              <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                SHA-256: <code className="font-mono" style={{ color: 'var(--text-secondary)', background: 'var(--bg-subtle)', padding: '1px 5px', borderRadius: '3px' }}>{att.sha256_checksum}</code>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ fontSize: '12px' }}
                                onClick={() => handleDownloadAttachment(att)}
                                disabled={downloadingId === att.id}
                              >
                                {downloadingId === att.id ? 'Streaming...' : '⬇️ Download'}
                              </button>

                              {!isAuditor && (
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  style={{ fontSize: '12px' }}
                                  onClick={() => {
                                    setLegalHoldPromptId(legalHoldPromptId === att.id ? null : att.id);
                                    setLegalHoldReason('');
                                  }}
                                >
                                  ⚖️ {att.legal_hold ? 'Release Hold' : 'Legal Hold'}
                                </button>
                              )}

                              {isAdmin && (
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  style={{ fontSize: '12px', color: 'var(--status-danger)' }}
                                  disabled={att.legal_hold}
                                  onClick={() => {
                                    setDeletingAttId(deletingAttId === att.id ? null : att.id);
                                    setDeleteReason('');
                                  }}
                                  title={att.legal_hold ? 'Cannot delete document under active legal hold' : 'Soft-delete evidence document'}
                                >
                                  🗑️ Delete
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Legal Hold Prompt Dialog */}
                          {legalHoldPromptId === att.id && (
                            <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-subtle)', border: '1px dashed #f59e0b', borderRadius: 'var(--radius-sm)' }}>
                              <h6 style={{ fontSize: '12.5px', fontWeight: '700', marginBottom: '6px', color: '#d97706' }}>
                                ⚖️ {att.legal_hold ? 'Release Legal Hold Order' : 'Apply Legal Hold Order (Preserves Evidence Against Deletion)'}
                              </h6>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="State regulatory or judicial order reason (min 5 chars)..."
                                value={legalHoldReason}
                                onChange={(e) => setLegalHoldReason(e.target.value)}
                                style={{ fontSize: '12px', marginBottom: '8px' }}
                              />
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  style={{ fontSize: '11px' }}
                                  onClick={() => setLegalHoldPromptId(null)}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="btn-primary"
                                  style={{ fontSize: '11px' }}
                                  disabled={isUpdatingHold || legalHoldReason.trim().length < 5}
                                  onClick={() => handleToggleLegalHold(att)}
                                >
                                  {isUpdatingHold ? 'Updating...' : att.legal_hold ? 'Confirm Release' : 'Confirm Hold'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Soft Delete Prompt Dialog */}
                          {deletingAttId === att.id && (
                            <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-subtle)', border: '1px dashed var(--status-danger)', borderRadius: 'var(--radius-sm)' }}>
                              <h6 style={{ fontSize: '12.5px', fontWeight: '700', marginBottom: '6px', color: 'var(--status-danger)' }}>
                                ⚠️ Regulatory Evidence Soft-Deletion
                              </h6>
                              <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                To prevent unlawful destruction of evidence during an active case, the file will be soft-deleted and retained on disk for court records. A formal justification reason (minimum 10 characters) is required by AICTE regulations.
                              </p>
                              <textarea
                                className="form-textarea"
                                rows="2"
                                placeholder="Specify official reason for removal (e.g. superseded by verified high court affidavit #...)"
                                value={deleteReason}
                                onChange={(e) => setDeleteReason(e.target.value)}
                                style={{ fontSize: '12px', marginBottom: '8px' }}
                              ></textarea>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  style={{ fontSize: '11px' }}
                                  onClick={() => setDeletingAttId(null)}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="btn-primary"
                                  style={{ fontSize: '11px', background: 'var(--status-danger)', borderColor: 'var(--status-danger)' }}
                                  disabled={isDeleting || deleteReason.trim().length < 10}
                                  onClick={() => handleDeleteAttachment(att)}
                                >
                                  {isDeleting ? 'Deleting...' : 'Confirm Soft Deletion'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Form Box */}
                  {!isAuditor ? (
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                      <h5 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>
                        📤 Upload New Supporting Evidence Document
                      </h5>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                        Permitted formats: <strong>PDF, DOCX, XLSX, CSV, PNG, JPG, TXT</strong>. Max file size: <strong>15 MB</strong>. Executables, scripts, and masqueraded payloads are strictly rejected.
                      </p>

                      <form onSubmit={handleFileUpload} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <input
                            id="vault-file-input"
                            type="file"
                            accept=".pdf,.docx,.xlsx,.csv,.png,.jpg,.jpeg,.txt"
                            onChange={(e) => setUploadFile(e.target.files[0])}
                            style={{ fontSize: '12px' }}
                          />
                          {uploadFile && (
                            <span style={{ fontSize: '12px', color: 'var(--accent-blue)' }}>
                              Selected: <strong>{uploadFile.name}</strong> ({(uploadFile.size / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </div>

                        <div>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Document label or brief description (e.g. Scrutiny inspection notes, signed faculty attendance sheet)..."
                            value={uploadDescription}
                            onChange={(e) => setUploadDescription(e.target.value)}
                            style={{ fontSize: '12px' }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            id="chk-confidential"
                            checked={uploadIsConfidential}
                            onChange={(e) => setUploadIsConfidential(e.target.checked)}
                          />
                          <label htmlFor="chk-confidential" style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            Mark as Confidential / Whistleblower Evidence (Restricted Viewing)
                          </label>
                        </div>

                        {uploadError && (
                          <div style={{ color: 'var(--status-danger)', fontSize: '12px' }}>
                            ⚠️ {uploadError}
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                          <button
                            type="submit"
                            className="btn-primary"
                            style={{ fontSize: '12.5px' }}
                            disabled={!uploadFile || isUploading}
                          >
                            {isUploading ? 'Scanning & Uploading...' : 'Upload & Verify Evidence'}
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                      🔒 Auditors have read-only access to view and download case attachments. Upload and deletion privileges are restricted to Bureau Case Officers and Administrators.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Reassignment Modal Dialog */}
        {showAssignModal && (
          <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowAssignModal(false)}>
            <div
              className="modal-card"
              style={{ maxWidth: '500px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h4>
                  {complaint.assigned_officer_id ? '🔄 Reassign Desk Officer' : '👤 Assign Desk Officer'}
                </h4>
                <button className="btn-icon" onClick={() => setShowAssignModal(false)}>✕</button>
              </div>

              <form onSubmit={handleAssignmentSubmit} style={{ marginTop: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Authorized Case Officer ({complaint.bureau.replace('_', ' ')}) *</label>
                  <select
                    id="reassign-officer-select"
                    className="form-select"
                    value={targetOfficerId}
                    onChange={(e) => setTargetOfficerId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Officer --</option>
                    {bureauOfficers.map((off) => (
                      <option key={off.id} value={off.id}>
                        {off.full_name} ({off.designation || off.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {complaint.assigned_officer_id ? 'Formal Reassignment Justification *' : 'Assignment Notes (Optional)'}
                  </label>
                  <textarea
                    id="reassign-reason-input"
                    className="form-textarea"
                    rows="3"
                    placeholder={
                      complaint.assigned_officer_id
                        ? "Specify reason for transferring active inquiry to another officer (e.g. specialized technical review, officer on leave, workload balance)..."
                        : "Initial assignment directive or priority instructions..."
                    }
                    value={reassignReason}
                    onChange={(e) => setReassignReason(e.target.value)}
                    required={!!complaint.assigned_officer_id}
                  ></textarea>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowAssignModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-confirm-reassign"
                    type="submit"
                    className="btn-primary"
                    disabled={isSavingAssignment}
                  >
                    {isSavingAssignment ? 'Saving...' : 'Confirm Assignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
