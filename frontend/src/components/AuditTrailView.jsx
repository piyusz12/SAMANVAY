import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function AuditTrailView({ onSelectComplaint }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs({ limit: 100 });
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '800' }}>Immutable Regulatory Audit Trail</h2>
          <span className="badge badge-neutral">Traceability Log</span>
        </div>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Cryptographic regulatory ledger recording every case action, status transition, inter-bureau transfer, and officer assignment across all AICTE divisions.
        </p>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="loading-spinner"></div>
            <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Loading regulatory audit ledger...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📜</div>
            <h4>No Audit Logs Recorded</h4>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action Type</th>
                  <th>Actor / Official</th>
                  <th>Bureau & Role</th>
                  <th>Case ID</th>
                  <th>Details & State Transition</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>

                    <td>
                      <span className="badge badge-purple" style={{ fontSize: '11px' }}>
                        {log.action_type}
                      </span>
                    </td>

                    <td style={{ fontWeight: '600' }}>
                      {log.actor_name}
                    </td>

                    <td>
                      <div style={{ fontSize: '12px' }}>
                        <span className="badge badge-blue font-mono" style={{ fontSize: '10px' }}>
                          {log.actor_bureau.replace('_', ' ')}
                        </span>
                        <span style={{ marginLeft: '6px', color: 'var(--text-muted)' }}>{log.actor_role}</span>
                      </div>
                    </td>

                    <td>
                      {log.complaint_id ? (
                        <button
                          className="btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '11.5px', fontFamily: 'var(--font-mono)' }}
                          onClick={() => onSelectComplaint(log.complaint_id)}
                        >
                          Case #{log.complaint_id}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>

                    <td style={{ maxWidth: '350px', fontSize: '12.5px' }}>
                      <div>{log.description}</div>
                      {log.previous_state && log.new_state && (
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          State diff: <span style={{ textDecoration: 'line-through' }}>{log.previous_state}</span> → <strong style={{ color: 'var(--accent-blue)' }}>{log.new_state}</strong>
                        </div>
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
