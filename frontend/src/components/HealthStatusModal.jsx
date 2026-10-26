import React, { useState, useEffect } from 'react';

export default function HealthStatusModal({ onClose }) {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/health');
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }
      const data = await response.json();
      setHealthData(data);
    } catch (err) {
      setError(err.message || 'Health check failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🩺</span>
            <h3 style={{ fontSize: '17px', fontWeight: '700' }}>System Health & Diagnostics</h3>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close">✕</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div className="loading-spinner"></div>
            <p style={{ marginTop: '10px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              Pinging health and database connectivity endpoints...
            </p>
          </div>
        ) : error ? (
          <div style={{ padding: '20px', background: 'var(--status-danger-bg)', borderRadius: 'var(--radius-md)', color: '#f87171', fontSize: '13px' }}>
            <strong>System Health Degraded / Unreachable:</strong>
            <div style={{ marginTop: '4px' }}>{error}</div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Check if the backend server is running on port 8000 and database is accessible.
            </div>
            <button className="btn-secondary" style={{ marginTop: '12px', fontSize: '12px' }} onClick={fetchHealth}>
              Retry Ping
            </button>
          </div>
        ) : healthData ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Overall Operational Status</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: healthData.status === 'healthy' ? 'var(--status-success)' : 'var(--status-danger)' }}>
                  {healthData.status === 'healthy' ? '🟢 OPERATIONAL (HEALTHY)' : '🔴 DEGRADED'}
                </div>
              </div>
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={fetchHealth}>
                Re-check
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Service:</span>
                <strong>{healthData.service}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Version:</span>
                <span className="font-mono">v{healthData.version}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Environment:</span>
                <span className="badge badge-blue font-mono" style={{ fontSize: '11px' }}>
                  {healthData.environment}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Database Status:</span>
                <span className="badge badge-success" style={{ fontSize: '11px' }}>
                  {healthData.database?.status} ({healthData.database?.dialect})
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Database Ping Latency:</span>
                <span className="font-mono">{healthData.database?.latency_ms} ms</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Checked At:</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {new Date(healthData.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
