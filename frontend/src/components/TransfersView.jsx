import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function TransfersView({ currentUser, onSelectComplaint }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [decidingId, setDecidingId] = useState(null);

  useEffect(() => {
    loadMovements();
  }, []);

  const loadMovements = async () => {
    try {
      setLoading(true);
      const data = await api.getMovements();
      setMovements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (movementId, decision) => {
    try {
      await api.decideTransfer(movementId, {
        decision,
        notes: decisionNotes || `Decision recorded by ${currentUser?.full_name}`
      });
      alert(`Transfer request ${decision.toLowerCase()} successfully.`);
      setDecisionNotes('');
      setDecidingId(null);
      await loadMovements();
    } catch (err) {
      alert(`Error recording decision: ${err.message}`);
    }
  };

  const isBureauHeadOrAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'BUREAU_HEAD';

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '800' }}>Inter-Bureau File Movements & Co-Handling</h2>
          <span className="badge badge-purple">Workflow Engine</span>
        </div>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Formal inter-departmental transfers, vigilance escalations, and joint co-handling requests between AICTE bureaus.
        </p>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="loading-spinner"></div>
            <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Loading transfer registry...</p>
          </div>
        ) : movements.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📂</div>
            <h4>No Active Inter-Bureau Movements</h4>
            <p>All case files are currently being processed within their initial intake bureau.</p>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case Number</th>
                  <th>Origin Bureau</th>
                  <th>Target Bureau</th>
                  <th>Movement Type</th>
                  <th>Reason & Justification</th>
                  <th>Requested By</th>
                  <th>Status</th>
                  <th>Authorization</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span
                        className="font-mono"
                        style={{ color: 'var(--accent-blue)', fontWeight: '700', cursor: 'pointer' }}
                        onClick={() => onSelectComplaint(m.complaint_id)}
                        title="Click to inspect case"
                      >
                        {m.complaint_no}
                      </span>
                    </td>

                    <td>
                      <span className="badge badge-neutral font-mono" style={{ fontSize: '11px' }}>
                        {m.from_bureau.replace('_', ' ')}
                      </span>
                    </td>

                    <td>
                      <span className="badge badge-blue font-mono" style={{ fontSize: '11px' }}>
                        {m.to_bureau.replace('_', ' ')}
                      </span>
                    </td>

                    <td>
                      <span className="badge badge-purple" style={{ fontSize: '11px' }}>
                        {m.movement_type.replace('_', ' ')}
                      </span>
                    </td>

                    <td style={{ maxWidth: '300px', fontSize: '12.5px' }}>
                      {m.reason}
                      {m.decision_notes && (
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Decision note: {m.decision_notes}
                        </div>
                      )}
                    </td>

                    <td style={{ fontSize: '12px' }}>
                      {m.requested_by_name || 'Officer'}
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          m.status === 'ACCEPTED'
                            ? 'badge-success'
                            : m.status === 'REJECTED'
                            ? 'badge-danger'
                            : 'badge-warning'
                        }`}
                      >
                        {m.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td>
                      {m.status === 'PENDING_APPROVAL' && isBureauHeadOrAdmin ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn-primary"
                            style={{ padding: '4px 10px', fontSize: '12px', background: 'var(--status-success)' }}
                            onClick={() => handleDecision(m.id, 'ACCEPTED')}
                          >
                            Approve
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--status-danger)' }}
                            onClick={() => handleDecision(m.id, 'REJECTED')}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {m.decided_by_name ? `Decided by ${m.decided_by_name}` : 'Completed'}
                        </span>
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
  );
}
