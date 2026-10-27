import React, { useState } from 'react';

export default function CasesRepositoryView({
  complaints,
  total,
  loading,
  filters,
  onFilterChange,
  onSelectComplaint,
  onSelectInstitution,
  currentUser
}) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onFilterChange({ ...filters, search: searchTerm, page: 1 });
  };

  const bureaus = [
    { id: 'ALL', label: 'All Bureaus' },
    { id: 'REGULATION_BUREAU', label: 'Regulation Bureau (RB)' },
    { id: 'PGRC', label: 'PGRC (Grievances)' },
    { id: 'APPROVAL_BUREAU', label: 'Approval Bureau (AB)' },
    { id: 'LEGAL_CELL', label: 'Legal Cell (LC)' },
    { id: 'VIGILANCE_CELL', label: 'Vigilance Cell (VC)' },
    { id: 'POLICY_BUREAU', label: 'Policy Bureau' },
  ];

  const statuses = [
    'ALL',
    'LODGED',
    'SCRUTINY_PENDING',
    'UNDER_INQUIRY',
    'SHOW_CAUSE_ISSUED',
    'HEARING_SCHEDULED',
    'RESOLVED',
    'DISPOSED',
    'TRANSFERRED',
    'ESCALATED',
    'AWAITING_INFORMATION'
  ];

  const priorities = [
    'ALL',
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW'
  ];

  const sortOptions = [
    { value: 'created_at', label: 'Lodged Date' },
    { value: 'priority', label: 'Priority' },
    { value: 'sla_due_date', label: 'SLA Target Due Date' },
    { value: 'status', label: 'Status' }
  ];

  const currentPage = filters.page || 1;
  const pageSize = filters.page_size || 20;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const startRecord = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, total);

  return (
    <div>
      {/* Title & Stats Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800' }}>AICTE Council Complaints Repository</h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
            Single-window database of institution-related grievances across all bureaus and cells ({total} records total)
          </p>
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="card" style={{ marginBottom: '20px', padding: '18px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <input
              id="cases-search-input"
              type="text"
              className="form-input"
              placeholder="Search by Complaint No, Institution Name, AICTE ID, Complainant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button id="cases-search-btn" type="submit" className="btn-primary">
            Search Repository
          </button>

          {(filters.search || filters.bureau !== 'ALL' || filters.status !== 'ALL' || filters.priority !== 'ALL' || filters.is_overdue || filters.sort_by) && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSearchTerm('');
                onFilterChange({
                  bureau: 'ALL',
                  status: 'ALL',
                  priority: 'ALL',
                  search: '',
                  sort_by: 'created_at',
                  sort_dir: 'desc',
                  is_overdue: false,
                  page: 1,
                  page_size: pageSize
                });
              }}
            >
              Reset Filters
            </button>
          )}
        </form>

        {/* Multi-Facet Filter Row */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', fontSize: '13px' }}>
          {/* Bureau Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Bureau:</span>
            <select
              id="bureau-filter-select"
              className="form-select"
              style={{ width: 'auto', padding: '5px 10px', fontSize: '12.5px' }}
              value={filters.bureau || 'ALL'}
              onChange={(e) => onFilterChange({ ...filters, bureau: e.target.value, page: 1 })}
            >
              {bureaus.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Status:</span>
            <select
              id="status-filter-select"
              className="form-select"
              style={{ width: 'auto', padding: '5px 10px', fontSize: '12.5px' }}
              value={filters.status || 'ALL'}
              onChange={(e) => onFilterChange({ ...filters, status: e.target.value, page: 1 })}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* Priority Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Priority:</span>
            <select
              id="priority-filter-select"
              className="form-select"
              style={{ width: 'auto', padding: '5px 10px', fontSize: '12.5px' }}
              value={filters.priority || 'ALL'}
              onChange={(e) => onFilterChange({ ...filters, priority: e.target.value, page: 1 })}
            >
              {priorities.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Sort:</span>
            <select
              id="sort-by-select"
              className="form-select"
              style={{ width: 'auto', padding: '5px 10px', fontSize: '12.5px' }}
              value={filters.sort_by || 'created_at'}
              onChange={(e) => onFilterChange({ ...filters, sort_by: e.target.value, page: 1 })}
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '4px 8px', fontSize: '11px' }}
              title="Toggle Sort Direction"
              onClick={() => onFilterChange({ ...filters, sort_dir: (filters.sort_dir === 'asc' ? 'desc' : 'asc'), page: 1 })}
            >
              {filters.sort_dir === 'asc' ? '▲ ASC' : '▼ DESC'}
            </button>
          </div>

          {/* Overdue SLA Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginLeft: 'auto' }}>
            <input
              id="overdue-only-checkbox"
              type="checkbox"
              checked={!!filters.is_overdue}
              onChange={(e) => onFilterChange({ ...filters, is_overdue: e.target.checked || undefined, page: 1 })}
            />
            <span style={{ color: filters.is_overdue ? '#f87171' : 'var(--text-secondary)', fontWeight: '600' }}>
              ⚠️ Overdue SLA Only
            </span>
          </label>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="loading-spinner"></div>
            <p style={{ marginTop: '14px', color: 'var(--text-secondary)' }}>Filtering council complaint files...</p>
          </div>
        ) : complaints.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h4>No Complaints Matching Selection</h4>
            <p>Try loosening your search term or bureau filters.</p>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table" id="complaints-data-table">
              <thead>
                <tr>
                  <th>Case Reference</th>
                  <th>Institution / Permanent ID</th>
                  <th>Bureau</th>
                  <th>Subject & Category</th>
                  <th>Priority</th>
                  <th>SLA Track</th>
                  <th>Current Owner</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="font-mono" style={{ fontWeight: '700', color: 'var(--accent-blue)', fontSize: '12px' }}>
                        {c.complaint_no}
                      </span>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    <td>
                      <div
                        style={{ fontWeight: '600', cursor: 'pointer', color: 'var(--text-primary)' }}
                        onClick={() => onSelectInstitution(c.institution_id)}
                        title="Click to view 360° Institution Dossier"
                      >
                        {c.institution_name}
                      </div>
                      <div className="font-mono" style={{ fontSize: '11px', color: 'var(--accent-gold)' }}>
                        {c.institution_aicte_id}
                      </div>
                    </td>

                    <td>
                      <span className="badge badge-blue font-mono" style={{ fontSize: '10.5px' }}>
                        {c.bureau.replace('_', ' ').replace('BUREAU', '').replace('CELL', '')}
                      </span>
                    </td>

                    <td style={{ maxWidth: '300px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.subject}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Category: <strong>{c.category.replace(/_/g, ' ')}</strong>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          c.priority === 'CRITICAL'
                            ? 'badge-danger'
                            : c.priority === 'HIGH'
                            ? 'badge-warning'
                            : 'badge-neutral'
                        }`}
                        style={{ fontSize: '11px' }}
                      >
                        {c.priority}
                      </span>
                    </td>

                    <td>
                      {c.sla_status === 'OVERDUE' ? (
                        <span className="badge badge-danger" style={{ fontSize: '11px' }}>
                          🚨 Overdue ({c.days_open}d / {c.sla_deadline_days}d)
                        </span>
                      ) : c.sla_status === 'APPROACHING_DEADLINE' ? (
                        <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                          ⏳ Warning ({c.days_open}d / {c.sla_deadline_days}d)
                        </span>
                      ) : c.sla_status === 'RESOLVED' ? (
                        <span className="badge badge-success" style={{ fontSize: '11px' }}>
                          ✅ Closed ({c.days_open}d)
                        </span>
                      ) : (
                        <span className="badge badge-success" style={{ fontSize: '11px' }}>
                          🟢 On Track ({c.days_open}d / {c.sla_deadline_days}d)
                        </span>
                      )}
                    </td>

                    <td>
                      <span style={{ fontSize: '12px', color: c.assigned_officer_name ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: c.assigned_officer_name ? '600' : '400' }}>
                        {c.assigned_officer_name || 'Unassigned'}
                      </span>
                    </td>

                    <td>
                      <span className="badge badge-neutral font-mono" style={{ fontSize: '10.5px' }}>
                        {c.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td>
                      <button
                        id={`btn-open-case-${c.id}`}
                        className="btn-primary"
                        style={{ padding: '4px 10px', fontSize: '11.5px' }}
                        onClick={() => onSelectComplaint(c.id)}
                      >
                        Inspect Case →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 18px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-subtle)',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '12.5px'
          }}
        >
          <div style={{ color: 'var(--text-secondary)' }}>
            Showing <strong>{startRecord}</strong> to <strong>{endRecord}</strong> of <strong>{total}</strong> cases
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Page Size:</span>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '3px 8px', fontSize: '12px' }}
              value={pageSize}
              onChange={(e) => onFilterChange({ ...filters, page_size: Number(e.target.value), page: 1 })}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>

            <button
              id="pagination-prev-btn"
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: '12px' }}
              disabled={currentPage <= 1 || loading}
              onClick={() => onFilterChange({ ...filters, page: currentPage - 1 })}
            >
              ‹ Previous
            </button>

            <span style={{ fontWeight: '700', padding: '0 6px' }}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              id="pagination-next-btn"
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: '12px' }}
              disabled={currentPage >= totalPages || loading}
              onClick={() => onFilterChange({ ...filters, page: currentPage + 1 })}
            >
              Next ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
