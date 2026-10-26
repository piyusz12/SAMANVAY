import React from 'react';

export default function ConflictRadarView({
  conflicts,
  loading,
  onSelectInstitution,
  onSelectComplaint,
  onRequestTransfer
}) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <div className="loading-spinner"></div>
        <p style={{ marginTop: '14px', color: 'var(--text-secondary)' }}>Scanning AICTE cross-bureau conflict radar...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '800' }}>Master Cross-Bureau Conflict Radar</h2>
          <span className="badge badge-danger">Live Collisions ({conflicts.length})</span>
        </div>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '900px' }}>
          This radar flags instances where multiple AICTE bureaus and cells (e.g. Regulation Bureau, PGRC, Vigilance Cell, Legal Cell) are concurrently taking regulatory or grievance actions against the same technical institution. It prevents siloed decisions, redundant inspections, and contradictory orders.
        </p>
      </div>

      {conflicts.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">🛡️</div>
          <h4>No Cross-Bureau Conflicts Detected</h4>
          <p>All active institution complaints are currently being managed within single coordinated bureaus.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {conflicts.map((c) => (
            <div
              key={c.institution_id}
              className="card"
              style={{
                borderLeft: '4px solid var(--status-danger)',
                background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.05) 0%, var(--bg-card) 40%)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{c.institution_name}</h3>
                    <span className="badge badge-danger" style={{ fontWeight: '700' }}>
                      ⚠️ {c.bureaus_involved.length} Bureaus Investigating
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    AICTE Permanent ID: <strong className="font-mono" style={{ color: 'var(--accent-blue)' }}>{c.aicte_id}</strong> • Region: {c.region} ({c.state})
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn-primary"
                    style={{ fontSize: '13px', padding: '6px 14px' }}
                    onClick={() => onSelectInstitution(c.institution_id)}
                  >
                    View 360° Unified Dossier →
                  </button>
                </div>
              </div>

              {/* Side-by-side active cases per bureau */}
              <div style={{ marginTop: '12px' }}>
                <h5 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', letterSpacing: '0.05em' }}>
                  Concurrent Open Cases Requiring Cross-Bureau Alignment:
                </h5>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '14px'
                  }}
                >
                  {c.cases.map((cs) => (
                    <div
                      key={cs.id}
                      style={{
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span className="badge badge-blue font-mono" style={{ fontSize: '11px' }}>
                            {cs.bureau.replace('_', ' ')}
                          </span>
                          <span className={`badge ${cs.priority === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}`}>
                            {cs.priority}
                          </span>
                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {cs.complaint_no}
                        </div>

                        <div style={{ fontSize: '13.5px', fontWeight: '600', marginTop: '6px', color: 'var(--text-primary)' }}>
                          {cs.subject}
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: '14px',
                          paddingTop: '10px',
                          borderTop: '1px solid var(--border-subtle)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                          Status: {cs.status.replace('_', ' ')}
                        </span>

                        <button
                          className="btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '12px' }}
                          onClick={() => onSelectComplaint(cs.id)}
                        >
                          Case Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
