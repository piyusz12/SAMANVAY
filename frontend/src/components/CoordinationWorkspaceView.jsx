import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const DECISION_TYPES = [
  { value: 'JOINT_INSPECTION', label: 'Joint Physical Inspection (Multi-Bureau Team)' },
  { value: 'LEGAL_REFERRAL', label: 'Legal Referral / Standing Counsel Briefing' },
  { value: 'BUREAU_TRANSFER', label: 'Inter-Bureau Case Transfer Recommended' },
  { value: 'INDEPENDENT_PARALLEL_PROCEEDINGS', label: 'Independent Parallel Proceedings (Separate Jurisdiction)' },
  { value: 'HEARING_COORDINATED', label: 'Coordinated Standing Hearing Committee' },
  { value: 'EVIDENCE_SHARING', label: 'Cross-Bureau Evidence & Document Sharing' },
  { value: 'NO_ACTION_REQUIRED', label: 'No Joint Action Required (Distinct Regulatory Issues)' }
];

export default function CoordinationWorkspaceView({
  currentUser,
  onSelectComplaint,
  onSelectInstitution
}) {
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedLinkageId, setSelectedLinkageId] = useState(null);
  const [workspaceDetail, setWorkspaceDetail] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'CONFIRMED_RELATED' | 'PENDING_REVIEW'
  const [conflictWarning, setConflictWarning] = useState(null);

  // Modals
  const [decisionModal, setDecisionModal] = useState({
    isOpen: false,
    decision: 'JOINT_INSPECTION',
    leadBureau: '',
    leadOfficerId: '',
    notes: '',
    deadline: ''
  });
  const [taskModal, setTaskModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    targetBureau: '',
    assignedToId: '',
    complaintId: '',
    deadline: '',
    priority: 'HIGH'
  });
  const [completeTaskModal, setCompleteTaskModal] = useState({
    isOpen: false,
    taskId: null,
    notes: ''
  });
  const [unlinkModal, setUnlinkModal] = useState({
    isOpen: false,
    reason: ''
  });

  const [officers, setOfficers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, [statusFilter]);

  useEffect(() => {
    if (selectedLinkageId) {
      loadWorkspaceDetail(selectedLinkageId);
    }
  }, [selectedLinkageId]);

  const loadWorkspaces = async () => {
    try {
      setLoadingList(true);
      const params = {};
      if (statusFilter !== 'ALL') {
        params.status_filter = statusFilter;
      }
      const data = await api.getCoordinationWorkspaces(params);
      setWorkspaces(data || []);
      if (data && data.length > 0 && !selectedLinkageId) {
        setSelectedLinkageId(data[0].linkage_id);
      }
    } catch (err) {
      console.error('Error loading coordination workspaces:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const loadWorkspaceDetail = async (id) => {
    try {
      setLoadingDetail(true);
      setConflictWarning(null);
      const detail = await api.getCoordinationWorkspaceDetail(id);
      setWorkspaceDetail(detail);

      // Pre-populate lead bureau default
      if (detail && !decisionModal.leadBureau) {
        setDecisionModal((prev) => ({
          ...prev,
          leadBureau: detail.lead_bureau || detail.source_complaint.bureau
        }));
      }
    } catch (err) {
      console.error('Error loading workspace detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenDecisionModal = () => {
    if (!workspaceDetail) return;
    setDecisionModal({
      isOpen: true,
      decision: workspaceDetail.coordination_decision || 'JOINT_INSPECTION',
      leadBureau: workspaceDetail.lead_bureau || workspaceDetail.source_complaint.bureau,
      leadOfficerId: workspaceDetail.lead_officer_id || '',
      notes: workspaceDetail.coordination_notes || '',
      deadline: workspaceDetail.coordination_deadline
        ? workspaceDetail.coordination_deadline.split('T')[0]
        : ''
    });
  };

  const handleSubmitDecision = async () => {
    if (!decisionModal.notes.trim()) {
      alert('Mandatory Requirement: Please provide coordination notes and rationale for this inter-bureau decision.');
      return;
    }

    try {
      setIsSubmitting(true);
      setConflictWarning(null);

      const payload = {
        coordination_decision: decisionModal.decision,
        lead_bureau: decisionModal.leadBureau || null,
        lead_officer_id: decisionModal.leadOfficerId ? Number(decisionModal.leadOfficerId) : null,
        coordination_notes: decisionModal.notes,
        coordination_deadline: decisionModal.deadline ? new Date(decisionModal.deadline).toISOString() : null,
        expected_version: workspaceDetail.version // Concurrency token
      };

      const updated = await api.submitCoordinationDecision(workspaceDetail.linkage_id, payload);
      setWorkspaceDetail(updated);
      setDecisionModal({ ...decisionModal, isOpen: false });
      await loadWorkspaces();
      alert(`Coordination decision successfully recorded: ${decisionModal.decision.replace(/_/g, ' ')}`);
    } catch (err) {
      if (err.status === 409 || err.message?.includes('409') || err.message?.includes('conflict')) {
        setConflictWarning(err.message || 'Concurrent edit conflict detected! Another officer updated this workspace.');
      } else {
        alert(`Error recording decision: ${err.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTask = async () => {
    if (!taskModal.title.trim() || !taskModal.deadline) {
      alert('Please provide task title and deadline.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.addCoordinationTask(workspaceDetail.linkage_id, {
        title: taskModal.title,
        description: taskModal.description,
        target_bureau: taskModal.targetBureau || workspaceDetail.lead_bureau || workspaceDetail.source_complaint.bureau,
        assigned_to_id: taskModal.assignedToId ? Number(taskModal.assignedToId) : null,
        complaint_id: taskModal.complaintId ? Number(taskModal.complaintId) : workspaceDetail.source_complaint.id,
        deadline: new Date(taskModal.deadline).toISOString(),
        priority: taskModal.priority
      });
      setTaskModal({ ...taskModal, isOpen: false, title: '', description: '' });
      await loadWorkspaceDetail(workspaceDetail.linkage_id);
      alert('Inter-bureau follow-up task assigned successfully.');
    } catch (err) {
      alert(`Error adding task: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteTask = async () => {
    try {
      setIsSubmitting(true);
      await api.updateCoordinationTask(completeTaskModal.taskId, {
        status: 'COMPLETED',
        completion_notes: completeTaskModal.notes || 'Action verified and completed by desk officer.'
      });
      setCompleteTaskModal({ isOpen: false, taskId: null, notes: '' });
      await loadWorkspaceDetail(workspaceDetail.linkage_id);
      alert('Task marked as completed.');
    } catch (err) {
      alert(`Error updating task: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlink = async () => {
    if (!unlinkModal.reason.trim()) {
      alert('Please provide a mandatory justification for unlinking these cases.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.unlinkCoordinationCases(workspaceDetail.linkage_id, {
        unlink_reason: unlinkModal.reason,
        expected_version: workspaceDetail.version
      });
      setUnlinkModal({ isOpen: false, reason: '' });
      await loadWorkspaces();
      await loadWorkspaceDetail(workspaceDetail.linkage_id);
      alert('Cases unlinked successfully. History preserved in retention archive.');
    } catch (err) {
      alert(`Error unlinking cases: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* 1. Header & Title Banner */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '800' }}>Case Coordination Workspace</h2>
              <span className="badge badge-purple">Multi-Bureau Hub</span>
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Side-by-side complaint analysis, inter-bureau joint decisions, follow-up ownership, and conflict protection.
            </p>
          </div>

          {/* Quick Filters */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={statusFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => setStatusFilter('ALL')}
            >
              All Cases ({workspaces.length})
            </button>
            <button
              className={statusFilter === 'CONFIRMED_RELATED' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => setStatusFilter('CONFIRMED_RELATED')}
            >
              Confirmed Links
            </button>
            <button
              className={statusFilter === 'PENDING_REVIEW' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => setStatusFilter('PENDING_REVIEW')}
            >
              Pending Review
            </button>
          </div>
        </div>

        {/* Governance Non-destructive Rule Banner */}
        <div
          style={{
            marginTop: '12px',
            padding: '10px 14px',
            background: 'rgba(59, 130, 246, 0.08)',
            borderLeft: '4px solid var(--accent-blue)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12.5px',
            color: 'var(--text-secondary)'
          }}
        >
          <strong style={{ color: 'var(--accent-blue)' }}>📋 Statutory Coordination Mandate: </strong>
          Coordination decisions align regulatory actions without automatically merging records or altering individual case outcomes. Each complaint maintains independent status, officer ownership, and full action audit trails.
        </div>
      </div>

      {/* Concurrent Edit Conflict Warning Banner */}
      {conflictWarning && (
        <div
          style={{
            marginBottom: '16px',
            padding: '14px 18px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '2px solid var(--status-danger)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '13.5px'
          }}
        >
          <div style={{ fontWeight: '800', color: 'var(--status-danger)', marginBottom: '4px' }}>
            ⚠️ Concurrent Edit Conflict Detected!
          </div>
          <div>{conflictWarning}</div>
          <button
            className="btn-secondary"
            style={{ marginTop: '8px', fontSize: '12px', background: 'var(--bg-secondary)' }}
            onClick={() => loadWorkspaceDetail(selectedLinkageId)}
          >
            🔄 Reload Latest Server State
          </button>
        </div>
      )}

      {/* 2. Coordination Master Cases Carousel / Selector */}
      <div className="card" style={{ marginBottom: '22px', padding: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: 'var(--text-muted)' }}>
          SELECT ACTIVE COORDINATION CASE PAIR ({workspaces.length}):
        </div>

        {loadingList ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : workspaces.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
            No related cases found for coordination under your bureau permissions.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '6px' }}>
            {workspaces.map((w) => {
              const isSelected = w.linkage_id === selectedLinkageId;
              const scorePercent = Math.round(w.similarity_score * 100);

              return (
                <div
                  key={w.linkage_id}
                  onClick={() => setSelectedLinkageId(w.linkage_id)}
                  style={{
                    minWidth: '310px',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-subtle)',
                    border: `1.5px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span className="font-mono" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-blue)' }}>
                      #{w.linkage_id} • {w.source_complaint_no}
                    </span>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        background: scorePercent >= 75 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: scorePercent >= 75 ? 'var(--status-danger)' : 'var(--status-warning)'
                      }}
                    >
                      {scorePercent}% Overlap
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {w.institution_name}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    <span>{w.source_bureau.replace(/_/g, ' ')}</span>
                    <span>⟷</span>
                    <span>{w.target_bureau.replace(/_/g, ' ')}</span>
                    <span className="badge badge-neutral" style={{ marginLeft: 'auto', fontSize: '10px' }}>
                      {w.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {w.coordination_decision && (
                    <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--accent-gold)', fontWeight: '600' }}>
                      ⚡ {w.coordination_decision.replace(/_/g, ' ')}
                    </div>
                  )}

                  {w.overdue_tasks_count > 0 && (
                    <div style={{ marginTop: '4px', fontSize: '10.5px', color: 'var(--status-danger)', fontWeight: '700' }}>
                      ⚠️ {w.overdue_tasks_count} Overdue Task(s)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Detailed Workspace View */}
      {loadingDetail ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Loading side-by-side complaint dossiers and action histories...</p>
        </div>
      ) : !workspaceDetail ? (
        <div className="card empty-state">
          <h4>Select a coordination case above to launch the workspace</h4>
        </div>
      ) : (
        <div>
          {/* Top Coordination Status & Control Ribbon */}
          <div
            className="card"
            style={{
              marginBottom: '20px',
              padding: '16px 20px',
              background: 'linear-gradient(135deg, rgba(15, 27, 56, 0.85) 0%, rgba(22, 38, 77, 0.85) 100%)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0 }}>
                    {workspaceDetail.source_complaint.institution_name}
                  </h3>
                  <span className="badge badge-blue font-mono" style={{ fontSize: '11.5px' }}>
                    AICTE ID: {workspaceDetail.source_complaint.institution_aicte_id || 'N/A'}
                  </span>
                  <span className="badge badge-purple" style={{ fontSize: '11px' }}>
                    Status: {workspaceDetail.status.replace(/_/g, ' ')}
                  </span>
                  <span className="badge badge-neutral font-mono" style={{ fontSize: '11px' }}>
                    v{workspaceDetail.version}
                  </span>
                </div>

                <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Decision: <strong style={{ color: 'var(--accent-gold)' }}>{workspaceDetail.coordination_decision?.replace(/_/g, ' ') || 'Pending Inter-Bureau Decision'}</strong>
                  {workspaceDetail.lead_bureau && (
                    <span> • Lead Bureau: <strong>{workspaceDetail.lead_bureau.replace(/_/g, ' ')}</strong></span>
                  )}
                  {workspaceDetail.coordination_deadline && (
                    <span> • Target Deadline: <strong>{new Date(workspaceDetail.coordination_deadline).toLocaleDateString()}</strong></span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  className="btn-primary"
                  style={{ fontSize: '12.5px', background: 'var(--accent-gold)', color: '#000' }}
                  onClick={handleOpenDecisionModal}
                >
                  ⚡ Record Coordination Decision
                </button>

                <button
                  className="btn-secondary"
                  style={{ fontSize: '12.5px' }}
                  onClick={() => setTaskModal({ ...taskModal, isOpen: true })}
                >
                  ➕ Assign Follow-Up Task
                </button>

                {workspaceDetail.is_active && (
                  <button
                    className="btn-secondary"
                    style={{ fontSize: '12.5px', borderColor: 'var(--status-danger)', color: 'var(--status-danger)' }}
                    onClick={() => setUnlinkModal({ isOpen: true, reason: '' })}
                  >
                    Unlink Cases
                  </button>
                )}
              </div>
            </div>

            {/* Coordination Notes Block */}
            {workspaceDetail.coordination_notes && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12.5px',
                  color: 'var(--text-primary)',
                  fontStyle: 'italic'
                }}
              >
                "{workspaceDetail.coordination_notes}"
              </div>
            )}
          </div>

          {/* 4. Side-By-Side Comparison View */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
              gap: '20px',
              marginBottom: '24px'
            }}
          >
            {/* LEFT: Case 1 */}
            <div
              className="card"
              style={{
                borderTop: '4px solid var(--accent-blue)',
                padding: '20px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <span className="badge badge-blue font-mono" style={{ fontSize: '12px', fontWeight: '700' }}>
                    {workspaceDetail.source_complaint.bureau.replace(/_/g, ' ')}
                  </span>
                  <h4 style={{ fontSize: '16px', fontWeight: '800', marginTop: '6px', color: 'var(--accent-blue)' }}>
                    {workspaceDetail.source_complaint.complaint_no}
                  </h4>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                    {workspaceDetail.source_complaint.status.replace(/_/g, ' ')}
                  </span>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Priority: <strong>{workspaceDetail.source_complaint.priority}</strong>
                  </div>
                </div>
              </div>

              {/* Case Metadata Attributes */}
              <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '12.5px', marginBottom: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>Assigned Officer: <strong>{workspaceDetail.source_complaint.assigned_officer_name || 'Unassigned'}</strong></div>
                  <div>Category: <strong>{workspaceDetail.source_complaint.category.replace(/_/g, ' ')}</strong></div>
                  <div>Lodged: <strong>{new Date(workspaceDetail.source_complaint.created_at).toLocaleDateString()}</strong></div>
                  <div>
                    SLA Status:{' '}
                    <strong style={{ color: workspaceDetail.source_complaint.is_overdue ? 'var(--status-danger)' : 'var(--status-success)' }}>
                      {workspaceDetail.source_complaint.is_overdue
                        ? `Overdue (${workspaceDetail.source_complaint.days_overdue}d)`
                        : `On Track (${workspaceDetail.source_complaint.days_remaining}d left)`}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Narrative Subject & Description */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {workspaceDetail.source_complaint.subject}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.45', background: 'var(--bg-subtle)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                  {workspaceDetail.source_complaint.description}
                </div>
              </div>

              {/* Independent Status History */}
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-muted)' }}>
                  STATUS TRANSITION TRAIL ({workspaceDetail.source_complaint.status_history?.length || 0}):
                </div>
                <div style={{ maxHeight: '120px', overflowY: 'auto', paddingRight: '4px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', padding: '6px' }}>
                  {workspaceDetail.source_complaint.status_history?.map((sh) => (
                    <div
                      key={sh.id}
                      style={{
                        padding: '4px 6px',
                        borderBottom: '1px solid var(--border-subtle)',
                        fontSize: '11px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '6px'
                      }}
                    >
                      <div>
                        <span className="font-mono" style={{ color: 'var(--accent-blue)', fontWeight: '700' }}>
                          {sh.from_status ? `${sh.from_status} → ${sh.to_status}` : sh.to_status}
                        </span>
                        {sh.remarks && <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>({sh.remarks})</span>}
                      </div>
                      <div style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(sh.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chronological Action History */}
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-muted)' }}>
                  ACTION AUDIT TRAIL ({workspaceDetail.source_complaint.action_history?.length || 0}):
                </div>
                <div style={{ maxHeight: '120px', overflowY: 'auto', paddingRight: '4px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', padding: '6px' }}>
                  {workspaceDetail.source_complaint.action_history?.map((act) => (
                    <div
                      key={act.id}
                      style={{
                        padding: '4px 6px',
                        borderBottom: '1px solid var(--border-subtle)',
                        fontSize: '11px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '6px'
                      }}
                    >
                      <div>
                        <strong style={{ color: 'var(--accent-blue)' }}>{act.action_type}</strong>: {act.description}
                      </div>
                      <div style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(act.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Button to inspect full record */}
              <button
                className="btn-secondary"
                style={{ width: '100%', marginTop: '14px', fontSize: '12px' }}
                onClick={() => onSelectComplaint(workspaceDetail.source_complaint.id)}
              >
                Inspect Full Complaint File #{workspaceDetail.source_complaint.complaint_no}
              </button>
            </div>

            {/* RIGHT: Case 2 */}
            <div
              className="card"
              style={{
                borderTop: '4px solid var(--accent-purple)',
                padding: '20px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <span className="badge badge-purple font-mono" style={{ fontSize: '12px', fontWeight: '700' }}>
                    {workspaceDetail.target_complaint.bureau.replace(/_/g, ' ')}
                  </span>
                  <h4 style={{ fontSize: '16px', fontWeight: '800', marginTop: '6px', color: 'var(--accent-purple)' }}>
                    {workspaceDetail.target_complaint.complaint_no}
                  </h4>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                    {workspaceDetail.target_complaint.status.replace(/_/g, ' ')}
                  </span>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Priority: <strong>{workspaceDetail.target_complaint.priority}</strong>
                  </div>
                </div>
              </div>

              {/* Case Metadata Attributes */}
              <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '12.5px', marginBottom: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>Assigned Officer: <strong>{workspaceDetail.target_complaint.assigned_officer_name || 'Unassigned'}</strong></div>
                  <div>Category: <strong>{workspaceDetail.target_complaint.category.replace(/_/g, ' ')}</strong></div>
                  <div>Lodged: <strong>{new Date(workspaceDetail.target_complaint.created_at).toLocaleDateString()}</strong></div>
                  <div>
                    SLA Status:{' '}
                    <strong style={{ color: workspaceDetail.target_complaint.is_overdue ? 'var(--status-danger)' : 'var(--status-success)' }}>
                      {workspaceDetail.target_complaint.is_overdue
                        ? `Overdue (${workspaceDetail.target_complaint.days_overdue}d)`
                        : `On Track (${workspaceDetail.target_complaint.days_remaining}d left)`}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Narrative Subject & Description */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {workspaceDetail.target_complaint.subject}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.45', background: 'var(--bg-subtle)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                  {workspaceDetail.target_complaint.description}
                </div>
              </div>

              {/* Independent Status History */}
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-muted)' }}>
                  STATUS TRANSITION TRAIL ({workspaceDetail.target_complaint.status_history?.length || 0}):
                </div>
                <div style={{ maxHeight: '120px', overflowY: 'auto', paddingRight: '4px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', padding: '6px' }}>
                  {workspaceDetail.target_complaint.status_history?.map((sh) => (
                    <div
                      key={sh.id}
                      style={{
                        padding: '4px 6px',
                        borderBottom: '1px solid var(--border-subtle)',
                        fontSize: '11px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '6px'
                      }}
                    >
                      <div>
                        <span className="font-mono" style={{ color: 'var(--accent-purple)', fontWeight: '700' }}>
                          {sh.from_status ? `${sh.from_status} → ${sh.to_status}` : sh.to_status}
                        </span>
                        {sh.remarks && <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>({sh.remarks})</span>}
                      </div>
                      <div style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(sh.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chronological Action History */}
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-muted)' }}>
                  ACTION AUDIT TRAIL ({workspaceDetail.target_complaint.action_history?.length || 0}):
                </div>
                <div style={{ maxHeight: '120px', overflowY: 'auto', paddingRight: '4px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', padding: '6px' }}>
                  {workspaceDetail.target_complaint.action_history?.map((act) => (
                    <div
                      key={act.id}
                      style={{
                        padding: '4px 6px',
                        borderBottom: '1px solid var(--border-subtle)',
                        fontSize: '11px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '6px'
                      }}
                    >
                      <div>
                        <strong style={{ color: 'var(--accent-purple)' }}>{act.action_type}</strong>: {act.description}
                      </div>
                      <div style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(act.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Button to inspect full record */}
              <button
                className="btn-secondary"
                style={{ width: '100%', marginTop: '14px', fontSize: '12px' }}
                onClick={() => onSelectComplaint(workspaceDetail.target_complaint.id)}
              >
                Inspect Full Complaint File #{workspaceDetail.target_complaint.complaint_no}
              </button>
            </div>
          </div>

          {/* 5. Inter-Bureau Follow-Up Tasks & Action Tracker */}
          <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '16.5px', fontWeight: '800' }}>
                  Inter-Bureau Follow-Up Action Tasks ({workspaceDetail.follow_up_tasks?.length || 0})
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Assigned actions, deadlines, and deliverables required across bureaus.
                </p>
              </div>

              <button
                className="btn-primary"
                style={{ fontSize: '12px' }}
                onClick={() => setTaskModal({ ...taskModal, isOpen: true })}
              >
                ➕ Assign Follow-Up Task
              </button>
            </div>

            {workspaceDetail.follow_up_tasks?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                No follow-up tasks currently assigned for this coordination workspace.
              </div>
            ) : (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Action Deliverable</th>
                      <th>Target Bureau</th>
                      <th>Assigned Officer</th>
                      <th>Deadline</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspaceDetail.follow_up_tasks.map((task) => (
                      <tr key={task.id}>
                        <td>
                          <div style={{ fontWeight: '700', fontSize: '13px' }}>{task.title}</div>
                          {task.description && (
                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{task.description}</div>
                          )}
                          {task.completion_notes && (
                            <div style={{ fontSize: '11px', color: 'var(--status-success)', fontStyle: 'italic', marginTop: '2px' }}>
                              Completed: "{task.completion_notes}"
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-blue">{task.target_bureau?.replace(/_/g, ' ') || 'Shared'}</span>
                        </td>
                        <td style={{ fontSize: '12.5px' }}>{task.assigned_to_name || 'Unassigned'}</td>
                        <td style={{ fontSize: '12px' }}>
                          <span style={{ color: task.is_overdue ? 'var(--status-danger)' : 'inherit', fontWeight: task.is_overdue ? '800' : 'normal' }}>
                            {new Date(task.deadline).toLocaleDateString()}
                          </span>
                          {task.is_overdue && <span className="badge badge-danger" style={{ marginLeft: '6px', fontSize: '10px' }}>OVERDUE</span>}
                        </td>
                        <td>
                          <span className={`badge ${task.priority === 'URGENT' ? 'badge-danger' : task.priority === 'HIGH' ? 'badge-warning' : 'badge-neutral'}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${task.status === 'COMPLETED' ? 'badge-success' : task.status === 'OVERDUE' ? 'badge-danger' : 'badge-warning'}`}>
                            {task.status}
                          </span>
                        </td>
                        <td>
                          {task.status !== 'COMPLETED' && (
                            <button
                              className="btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '11px', borderColor: 'var(--status-success)', color: 'var(--status-success)' }}
                              onClick={() => setCompleteTaskModal({ isOpen: true, taskId: task.id, notes: '' })}
                            >
                              ✓ Complete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: RECORD COORDINATION DECISION
          ========================================================================= */}
      {decisionModal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800' }}>Record Inter-Bureau Coordination Decision</h3>
              <button className="btn-close" onClick={() => setDecisionModal({ ...decisionModal, isOpen: false })}>✕</button>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Document the formal regulatory plan agreed between <strong>{workspaceDetail?.source_complaint.bureau.replace(/_/g, ' ')}</strong> and <strong>{workspaceDetail?.target_complaint.bureau.replace(/_/g, ' ')}</strong>.
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                Coordination Decision Type <span style={{ color: 'var(--status-danger)' }}>*</span>:
              </label>
              <select
                className="form-select"
                value={decisionModal.decision}
                onChange={(e) => setDecisionModal({ ...decisionModal, decision: e.target.value })}
              >
                {DECISION_TYPES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div className="form-group">
                <label style={{ fontSize: '12.5px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                  Designated Lead Bureau:
                </label>
                <select
                  className="form-select"
                  value={decisionModal.leadBureau}
                  onChange={(e) => setDecisionModal({ ...decisionModal, leadBureau: e.target.value })}
                >
                  <option value={workspaceDetail?.source_complaint.bureau}>{workspaceDetail?.source_complaint.bureau.replace(/_/g, ' ')}</option>
                  <option value={workspaceDetail?.target_complaint.bureau}>{workspaceDetail?.target_complaint.bureau.replace(/_/g, ' ')}</option>
                  <option value="JOINT">Joint Shared Leadership</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12.5px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                  Target Coordination Deadline:
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={decisionModal.deadline}
                  onChange={(e) => setDecisionModal({ ...decisionModal, deadline: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                Action Plan & Minutes of Coordination <span style={{ color: 'var(--status-danger)' }}>*</span>:
              </label>
              <textarea
                className="form-input"
                rows="4"
                placeholder="Detail agreed regulatory action, joint inspection scope, standing counsel briefings, or evidence-sharing terms..."
                value={decisionModal.notes}
                onChange={(e) => setDecisionModal({ ...decisionModal, notes: e.target.value })}
                style={{ width: '100%', fontSize: '13px', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-secondary" onClick={() => setDecisionModal({ ...decisionModal, isOpen: false })} disabled={isSubmitting}>
                Cancel
              </button>
              <button className="btn-primary" style={{ background: 'var(--accent-gold)', color: '#000' }} onClick={handleSubmitDecision} disabled={isSubmitting}>
                {isSubmitting ? 'Recording...' : 'Submit Official Coordination Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: ASSIGN FOLLOW-UP TASK
          ========================================================================= */}
      {taskModal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800' }}>Assign Inter-Bureau Follow-Up Action</h3>
              <button className="btn-close" onClick={() => setTaskModal({ ...taskModal, isOpen: false })}>✕</button>
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                Deliverable / Task Title <span style={{ color: 'var(--status-danger)' }}>*</span>:
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Issue Notice under APH 2026-27 Section 4"
                value={taskModal.title}
                onChange={(e) => setTaskModal({ ...taskModal, title: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div className="form-group">
                <label style={{ fontSize: '12.5px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                  Responsible Target Bureau:
                </label>
                <select
                  className="form-select"
                  value={taskModal.targetBureau}
                  onChange={(e) => setTaskModal({ ...taskModal, targetBureau: e.target.value })}
                >
                  <option value={workspaceDetail?.source_complaint.bureau}>{workspaceDetail?.source_complaint.bureau.replace(/_/g, ' ')}</option>
                  <option value={workspaceDetail?.target_complaint.bureau}>{workspaceDetail?.target_complaint.bureau.replace(/_/g, ' ')}</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12.5px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                  Priority:
                </label>
                <select
                  className="form-select"
                  value={taskModal.priority}
                  onChange={(e) => setTaskModal({ ...taskModal, priority: e.target.value })}
                >
                  <option value="URGENT">URGENT</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                Completion Deadline <span style={{ color: 'var(--status-danger)' }}>*</span>:
              </label>
              <input
                type="date"
                className="form-input"
                value={taskModal.deadline}
                onChange={(e) => setTaskModal({ ...taskModal, deadline: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                Task Instructions / Scope:
              </label>
              <textarea
                className="form-input"
                rows="3"
                placeholder="Specific instructions, files to subpoena, or committee terms..."
                value={taskModal.description}
                onChange={(e) => setTaskModal({ ...taskModal, description: e.target.value })}
                style={{ width: '100%', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-secondary" onClick={() => setTaskModal({ ...taskModal, isOpen: false })} disabled={isSubmitting}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleCreateTask} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Assign Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: COMPLETE TASK
          ========================================================================= */}
      {completeTaskModal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '12px' }}>Complete Follow-Up Task</h3>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                Completion Verification Remarks:
              </label>
              <textarea
                className="form-input"
                rows="3"
                placeholder="Enter completion remarks, file references, or findings..."
                value={completeTaskModal.notes}
                onChange={(e) => setCompleteTaskModal({ ...completeTaskModal, notes: e.target.value })}
                style={{ width: '100%', fontSize: '13px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-secondary" onClick={() => setCompleteTaskModal({ isOpen: false, taskId: null, notes: '' })}>
                Cancel
              </button>
              <button className="btn-primary" style={{ background: 'var(--status-success)' }} onClick={handleCompleteTask} disabled={isSubmitting}>
                Mark Completed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: UNLINK CASES (RETENTION COMPLIANT)
          ========================================================================= */}
      {unlinkModal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '12px', color: 'var(--status-danger)' }}>
              Unlink Related Cases
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Unlinking removes the active coordination requirement between these complaints. Per AICTE retention rules, all past review history and the unlink reason will remain auditable in the system log.
            </p>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                Mandatory Unlink Justification <span style={{ color: 'var(--status-danger)' }}>*</span>:
              </label>
              <textarea
                className="form-input"
                rows="3"
                placeholder="Explain why these complaints are distinct or why coordination is no longer necessary..."
                value={unlinkModal.reason}
                onChange={(e) => setUnlinkModal({ ...unlinkModal, reason: e.target.value })}
                style={{ width: '100%', fontSize: '13px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-secondary" onClick={() => setUnlinkModal({ isOpen: false, reason: '' })}>
                Cancel
              </button>
              <button className="btn-primary" style={{ background: 'var(--status-danger)' }} onClick={handleUnlink} disabled={isSubmitting}>
                Confirm Unlink
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
