import React from 'react';

export default function ExecutiveOverview({
  overview,
  loading,
  onSelectTab,
  onSelectInstitution,
  onSelectComplaint
}) {
  if (loading || !overview) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <div className="loading-spinner"></div>
        <p style={{ marginTop: '14px', color: 'var(--text-secondary)' }}>Loading council overview & metrics...</p>
      </div>
    );
  }

  const {
    total_institutions,
    total_complaints,
    active_complaints,
    resolved_complaints,
    overdue_complaints,
    conflicting_institutions_count,
    pending_transfers_count,
    bureau_metrics,
    region_metrics,
    category_distribution,
    hotspot_institutions
  } = overview;

  return (
    <div>
      {/* Master Conflict Radar Banner if active conflicts exist */}
      {conflicting_institutions_count > 0 && (
        <div className="conflict-radar-banner" id="conflict-radar-alert">
          <div className="conflict-radar-content">
            <div className="conflict-radar-icon">⚠️</div>
            <div className="conflict-radar-text">
              <h4>CRITICAL CROSS-BUREAU OVERLAP DETECTED</h4>
              <p>
                <strong>{conflicting_institutions_count} institutions</strong> currently have concurrent active cases across 2 or more AICTE bureaus (e.g. Regulation Bureau & PGRC). Immediate coordination required to avoid contradictory regulatory directives.
              </p>
            </div>
          </div>
          <button
            id="view-conflicts-btn"
            className="btn-conflict-action"
            onClick={() => onSelectTab('conflicts')}
          >
            Launch Conflict Radar →
          </button>
        </div>
      )}

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-info">
            <h5>Total Complaints</h5>
            <div className="kpi-number">{total_complaints}</div>
            <span className="kpi-subtitle">Across all AICTE Bureaus</span>
          </div>
          <div className="kpi-icon-wrapper icon-blue">📋</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <h5>Active Grievances</h5>
            <div className="kpi-number">{active_complaints}</div>
            <span className="kpi-subtitle">In Scrutiny / Inquiry / Hearing</span>
          </div>
          <div className="kpi-icon-wrapper icon-gold">⏳</div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '3px solid var(--status-danger)' }}>
          <div className="kpi-info">
            <h5>Multi-Bureau Overlaps</h5>
            <div className="kpi-number" style={{ color: 'var(--status-danger)' }}>
              {conflicting_institutions_count}
            </div>
            <span className="kpi-subtitle">Institutions with concurrent actions</span>
          </div>
          <div className="kpi-icon-wrapper icon-red">🚨</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <h5>Overdue Cases</h5>
            <div className="kpi-number" style={{ color: overdue_complaints > 0 ? '#f87171' : 'var(--text-primary)' }}>
              {overdue_complaints}
            </div>
            <span className="kpi-subtitle">Breached 30-Day Citizen Charter</span>
          </div>
          <div className="kpi-icon-wrapper icon-red">⏱️</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <h5>Inter-Bureau Transfers</h5>
            <div className="kpi-number">{pending_transfers_count}</div>
            <span className="kpi-subtitle">Awaiting bureau authorization</span>
          </div>
          <div className="kpi-icon-wrapper icon-purple">🔄</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <h5>Disposed / Resolved</h5>
            <div className="kpi-number" style={{ color: 'var(--status-success)' }}>
              {resolved_complaints}
            </div>
            <span className="kpi-subtitle">Final regulatory orders issued</span>
          </div>
          <div className="kpi-icon-wrapper icon-green">✅</div>
        </div>
      </div>

      {/* Two Column Layout: Bureau Performance & Regional Heatmap */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', marginBottom: '24px' }}>
        {/* Bureau Performance Comparison Matrix */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>AICTE Bureau & Cell Performance Matrix</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Cross-bureau comparison of case volume, active inquiry load, and disposal velocity
              </p>
            </div>
            <span className="badge badge-blue">Official Cells</span>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bureau / Cell</th>
                  <th>Total Cases</th>
                  <th>Active</th>
                  <th>Resolved</th>
                  <th>Overdue</th>
                  <th>Avg Disposal</th>
                </tr>
              </thead>
              <tbody>
                {bureau_metrics.map((bm) => (
                  <tr key={bm.bureau}>
                    <td style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-blue)' }}></span>
                      {bm.bureau.replace('_', ' ').replace('BUREAU', '').replace('CELL', '')}
                    </td>
                    <td>{bm.total_cases}</td>
                    <td>
                      <span className="badge badge-warning">{bm.active_cases}</span>
                    </td>
                    <td>
                      <span className="badge badge-success">{bm.resolved_cases}</span>
                    </td>
                    <td>
                      {bm.overdue_cases > 0 ? (
                        <span className="badge badge-danger">{bm.overdue_cases}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>
                    <td>{bm.avg_resolution_days > 0 ? `${bm.avg_resolution_days} days` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Regional Geographic Distribution */}
        <div className="card">
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>AICTE Regional Distribution</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Regional workload and cross-bureau conflicts by AICTE zone
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {region_metrics.map((rm) => (
              <div
                key={rm.region}
                style={{
                  background: 'var(--bg-subtle)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <span style={{ fontWeight: '600', fontSize: '13.5px' }}>{rm.region} Region</span>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    {rm.total_cases} total filed • {rm.active_cases} ongoing
                  </div>
                </div>

                <div>
                  {rm.conflicting_institutions > 0 ? (
                    <span className="badge badge-danger">
                      {rm.conflicting_institutions} Overlap Alert
                    </span>
                  ) : (
                    <span className="badge badge-neutral">Normal</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hotspot Institutions Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>High-Risk Institution Hotspot Radar</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Institutions with highest complaint velocity and simultaneous multi-department actions
            </p>
          </div>
          <button
            className="btn-secondary"
            onClick={() => onSelectTab('dossier')}
          >
            Search Any Institution ID →
          </button>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>AICTE Permanent ID</th>
                <th>Institution Name</th>
                <th>State</th>
                <th>Active Cases</th>
                <th>Bureaus Involved</th>
                <th>Conflict Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {hotspot_institutions.map((h) => (
                <tr key={h.institution_id}>
                  <td>
                    <span className="font-mono" style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>
                      {h.aicte_id}
                    </span>
                  </td>
                  <td style={{ fontWeight: '600' }}>{h.name}</td>
                  <td>{h.state}</td>
                  <td>
                    <span className="badge badge-warning">{h.active_cases} active</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {h.bureaus_involved.map((b) => (
                        <span key={b} className="badge badge-blue" style={{ fontSize: '10.5px' }}>
                          {b.replace('_', ' ').replace('BUREAU', '').replace('CELL', '')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {h.is_conflicting ? (
                      <span className="badge badge-danger">⚠️ Cross-Bureau Overlap</span>
                    ) : (
                      <span className="badge badge-neutral">Single Bureau</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => onSelectInstitution(h.institution_id)}
                    >
                      View 360° Dossier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
