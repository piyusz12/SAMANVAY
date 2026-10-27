import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const AICTE_BUREAUS_LIST = [
  { code: 'ALL', label: 'All Bureaus' },
  { code: 'REGULATION_BUREAU', label: 'Regulation Bureau' },
  { code: 'PGRC', label: 'Public Grievance Redressal Cell' },
  { code: 'APPROVAL_BUREAU', label: 'Approval Bureau' },
  { code: 'LEGAL_CELL', label: 'Legal Cell' },
  { code: 'VIGILANCE_CELL', label: 'Vigilance Cell' },
  { code: 'POLICY_BUREAU', label: 'Policy & Academic Bureau' }
];

const AICTE_REGIONS_LIST = [
  'ALL',
  'Northern',
  'North-West',
  'Eastern',
  'Western',
  'Southern',
  'South-West',
  'Central'
];

const STATUS_OPTIONS = [
  { code: 'ALL', label: 'All Statuses' },
  { code: 'LODGED', label: 'Lodged (Initial Intake)' },
  { code: 'SCRUTINY_PENDING', label: 'Scrutiny Pending' },
  { code: 'UNDER_INQUIRY', label: 'Under Inquiry' },
  { code: 'SHOW_CAUSE_ISSUED', label: 'Show Cause Issued' },
  { code: 'HEARING_SCHEDULED', label: 'Hearing Scheduled' },
  { code: 'COMMITTEE_REVIEW', label: 'Committee Review' },
  { code: 'RESOLVED', label: 'Resolved' },
  { code: 'DISPOSED', label: 'Disposed' },
  { code: 'TRANSFERRED', label: 'Transferred' }
];

const CATEGORY_OPTIONS = [
  { code: 'ALL', label: 'All Categories' },
  { code: 'FEE_EXTORTION', label: 'Fee Extortion / Caution Money' },
  { code: 'FACULTY_SALARY_WITHHELD', label: 'Faculty Salary Delayed / Withheld' },
  { code: 'INFRASTRUCTURE_DEFICIT', label: 'Infrastructure Deficit & Hazards' },
  { code: 'UNAPPROVED_COURSE', label: 'Unapproved Courses / Intake Violation' },
  { code: 'ADMISSION_IRREGULARITY', label: 'Admission Irregularity / Capitation' },
  { code: 'HARASSMENT_RAGGING', label: 'Harassment & Safety Violations' }
];

export default function ExecutiveOverview({
  overview: initialOverview,
  loading: initialLoading,
  currentUser,
  onSelectTab,
  onSelectInstitution,
  onSelectComplaint,
  onRefresh
}) {
  const [data, setData] = useState(initialOverview);
  const [loading, setLoading] = useState(initialLoading);
  const [trendView, setTrendView] = useState('monthly'); // 'monthly' | 'quarterly'
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  // Filter state
  const [filters, setFilters] = useState({
    bureau: 'ALL',
    region: 'ALL',
    status: 'ALL',
    category: 'ALL',
    date_from: '',
    date_to: ''
  });

  const isBureauRestricted = currentUser && !['SUPER_ADMIN', 'AUDITOR'].includes(currentUser.role);
  const userBureau = currentUser?.bureau;

  useEffect(() => {
    if (initialOverview) {
      setData(initialOverview);
    }
  }, [initialOverview]);

  // Adjust bureau filter if user is restricted
  useEffect(() => {
    if (isBureauRestricted && userBureau) {
      setFilters((prev) => ({ ...prev, bureau: userBureau }));
    }
  }, [isBureauRestricted, userBureau]);

  const handleApplyFilters = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const queryParams = {};
      if (filters.bureau && filters.bureau !== 'ALL') queryParams.bureau = filters.bureau;
      if (filters.region && filters.region !== 'ALL') queryParams.region = filters.region;
      if (filters.status && filters.status !== 'ALL') queryParams.status = filters.status;
      if (filters.category && filters.category !== 'ALL') queryParams.category = filters.category;
      if (filters.date_from) queryParams.date_from = filters.date_from;
      if (filters.date_to) queryParams.date_to = filters.date_to;

      const res = await api.getAnalyticsOverview(queryParams);
      setData(res);
    } catch (err) {
      console.error('Failed to load filtered analytics:', err);
      setErrorMsg(err.message || 'Failed to load dashboard metrics for selected filters.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = async () => {
    const defaultFilters = {
      bureau: isBureauRestricted ? userBureau : 'ALL',
      region: 'ALL',
      status: 'ALL',
      category: 'ALL',
      date_from: '',
      date_to: ''
    };
    setFilters(defaultFilters);
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.getAnalyticsOverview(
        isBureauRestricted ? { bureau: userBureau } : {}
      );
      setData(res);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to reset analytics filters.');
    } finally {
      setLoading(false);
    }
  };

  if ((loading && !data) || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <div className="loading-spinner"></div>
        <p style={{ marginTop: '14px', color: 'var(--text-secondary)' }}>
          Aggregating role-aware AICTE bureau analytics and live case metrics...
        </p>
      </div>
    );
  }

  const {
    user_scope_bureau,
    user_role,
    total_complaints_received = data.total_complaints || 0,
    open_pending_complaints = 0,
    complaints_under_process = 0,
    disposed_complaints = data.resolved_complaints || 0,
    transferred_complaints = 0,
    overdue_complaints = 0,
    total_institutions_count = data.total_institutions || 0,
    conflicting_institutions_count = 0,
    potential_overlaps_awaiting_review = 0,
    confirmed_related_groups_count = 0,
    ageing_distribution = [],
    bureau_metrics = [],
    region_metrics = [],
    category_distribution = [],
    monthly_trends = [],
    quarterly_trends = [],
    resolution_metrics = {
      average_resolution_days: 0,
      median_resolution_days: 0,
      sla_compliance_rate_percent: 100,
      total_disposed: 0,
      resolved_count: 0,
      disposed_count: 0,
      rejected_count: 0
    },
    institution_summaries = []
  } = data;

  // Filter institution summaries by local search
  const filteredInstitutions = institution_summaries.filter((inst) => {
    if (!institutionSearch) return true;
    const term = institutionSearch.toLowerCase();
    return (
      inst.name.toLowerCase().includes(term) ||
      inst.aicte_id.toLowerCase().includes(term) ||
      inst.state.toLowerCase().includes(term)
    );
  });

  return (
    <div>
      {/* 1. Header & Role Awareness Scope Pill */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '20px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '800' }}>
              Executive Monitoring & Analytics Dashboard
            </h2>
            <span className="badge badge-blue">SIH PS 26264</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Real-time cross-bureau monitoring, longitudinal disposal velocity, statutory SLA tracking, and institution conflict radar.
          </p>
        </div>

        {/* Role and Bureau Scope Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--bg-card)',
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: '12px'
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>Security Scope:</span>
          <span className="badge badge-purple font-mono" style={{ fontSize: '11px' }}>
            {user_role?.replace('_', ' ') || 'CENTRAL ADMIN'}
          </span>
          <span
            className={`badge ${user_scope_bureau ? 'badge-warning' : 'badge-success'}`}
            style={{ fontSize: '11px' }}
          >
            {user_scope_bureau ? `Scoped: ${user_scope_bureau.replace('_', ' ')}` : 'Apex Full AICTE HQ Scope'}
          </span>
        </div>
      </div>

      {/* 2. Error State Banner if filter query fails */}
      {errorMsg && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid var(--status-danger)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <strong>Error: </strong> {errorMsg}
          </div>
          <button className="btn-secondary" style={{ fontSize: '11.5px' }} onClick={handleResetFilters}>
            Reset Filters
          </button>
        </div>
      )}

      {/* 3. Comprehensive Filter Bar */}
      <div
        className="card"
        style={{
          marginBottom: '20px',
          padding: '16px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <div style={{ fontSize: '12.5px', fontWeight: '700', marginBottom: '10px', color: 'var(--text-muted)' }}>
          FILTER DASHBOARD METRICS:
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '12px',
            alignItems: 'flex-end'
          }}
        >
          {/* Bureau Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-secondary)' }}>
              AICTE Bureau / Cell:
            </label>
            <select
              id="analytics-filter-bureau"
              className="form-input"
              style={{ fontSize: '12px', padding: '6px 8px', height: '36px' }}
              value={filters.bureau}
              disabled={isBureauRestricted}
              onChange={(e) => setFilters({ ...filters, bureau: e.target.value })}
              title={isBureauRestricted ? `Locked to your authorized bureau: ${userBureau}` : 'Filter by Bureau'}
            >
              {AICTE_BUREAUS_LIST.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          {/* Region Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-secondary)' }}>
              Geographic Region:
            </label>
            <select
              id="analytics-filter-region"
              className="form-input"
              style={{ fontSize: '12px', padding: '6px 8px', height: '36px' }}
              value={filters.region}
              onChange={(e) => setFilters({ ...filters, region: e.target.value })}
            >
              {AICTE_REGIONS_LIST.map((r) => (
                <option key={r} value={r}>
                  {r === 'ALL' ? 'All Regions' : `${r} Region`}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-secondary)' }}>
              Lifecycle Status:
            </label>
            <select
              id="analytics-filter-status"
              className="form-input"
              style={{ fontSize: '12px', padding: '6px 8px', height: '36px' }}
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-secondary)' }}>
              Complaint Category:
            </label>
            <select
              id="analytics-filter-category"
              className="form-input"
              style={{ fontSize: '12px', padding: '6px 8px', height: '36px' }}
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-secondary)' }}>
              Received Date From:
            </label>
            <input
              id="analytics-filter-date-from"
              type="date"
              className="form-input"
              style={{ fontSize: '12px', padding: '5px 8px', height: '36px' }}
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            />
          </div>

          {/* Date To */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-secondary)' }}>
              Received Date To:
            </label>
            <input
              id="analytics-filter-date-to"
              type="date"
              className="form-input"
              style={{ fontSize: '12px', padding: '5px 8px', height: '36px' }}
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              id="btn-apply-analytics-filters"
              className="btn-primary"
              style={{ flex: 1, height: '36px', fontSize: '12px', padding: '6px 12px' }}
              onClick={handleApplyFilters}
              disabled={loading}
            >
              {loading ? 'Filtering...' : '🔍 Apply'}
            </button>
            <button
              id="btn-reset-analytics-filters"
              className="btn-secondary"
              style={{ height: '36px', fontSize: '12px', padding: '6px 12px' }}
              onClick={handleResetFilters}
              title="Reset all filters"
            >
              ↺ Reset
            </button>
          </div>
        </div>
      </div>

      {/* 4. Cross-Bureau Overlap Alert Banner */}
      {conflicting_institutions_count > 0 && (
        <div className="conflict-radar-banner" id="conflict-radar-alert">
          <div className="conflict-radar-content">
            <div className="conflict-radar-icon">⚠️</div>
            <div className="conflict-radar-text">
              <h4>CRITICAL MULTI-BUREAU OVERLAP DETECTED</h4>
              <p>
                <strong>{conflicting_institutions_count} technical institutions</strong> currently have concurrent active complaints across 2 or more AICTE bureaus. Joint review in the Case Coordination Workspace is recommended before issuing unilateral closure orders.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              id="view-conflicts-btn"
              className="btn-conflict-action"
              onClick={() => onSelectTab('conflicts')}
            >
              Launch Conflict Radar →
            </button>
            <button
              id="launch-coordination-btn"
              className="btn-conflict-action"
              style={{ background: 'var(--accent-purple)' }}
              onClick={() => onSelectTab('coordination')}
            >
              🤝 Coordination Workspace →
            </button>
          </div>
        </div>
      )}

      {/* 5. Primary Volume Metric KPI Cards (Strictly Non-Overlapping Partitions) */}
      <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>
        CORE COMPLAINT LIFECYCLE VOLUMES (MUTUALLY EXCLUSIVE PARTITIONS — NO DOUBLE-COUNTING):
      </div>

      <div className="kpi-grid">
        {/* Total Received */}
        <div className="kpi-card">
          <div className="kpi-info">
            <h5>Total Complaints</h5>
            <div className="kpi-number" id="kpi-total-received">{total_complaints_received}</div>
            <span className="kpi-subtitle">Distinct registered cases</span>
          </div>
          <div className="kpi-icon-wrapper icon-blue">📋</div>
        </div>

        {/* Open & Pending */}
        <div className="kpi-card">
          <div className="kpi-info">
            <h5>Open & Pending</h5>
            <div className="kpi-number" id="kpi-open-pending">{open_pending_complaints}</div>
            <span className="kpi-subtitle">Lodged / Initial scrutiny</span>
          </div>
          <div className="kpi-icon-wrapper icon-gold">📥</div>
        </div>

        {/* Under Process */}
        <div className="kpi-card">
          <div className="kpi-info">
            <h5>Under Process</h5>
            <div className="kpi-number" id="kpi-under-process">{complaints_under_process}</div>
            <span className="kpi-subtitle">Inquiry / Show Cause / Hearing</span>
          </div>
          <div className="kpi-icon-wrapper icon-purple">⚡</div>
        </div>

        {/* Disposed */}
        <div className="kpi-card">
          <div className="kpi-info">
            <h5>Disposed & Resolved</h5>
            <div className="kpi-number" id="kpi-disposed" style={{ color: 'var(--status-success)' }}>
              {disposed_complaints}
            </div>
            <span className="kpi-subtitle">Final orders / Disposals</span>
          </div>
          <div className="kpi-icon-wrapper icon-green">✅</div>
        </div>

        {/* Transferred */}
        <div className="kpi-card">
          <div className="kpi-info">
            <h5>Transferred</h5>
            <div className="kpi-number" id="kpi-transferred">{transferred_complaints}</div>
            <span className="kpi-subtitle">Inter-bureau transfers</span>
          </div>
          <div className="kpi-icon-wrapper icon-blue">🔄</div>
        </div>

        {/* Overdue */}
        <div className="kpi-card" style={{ borderLeft: '3px solid var(--status-danger)' }}>
          <div className="kpi-info">
            <h5>Overdue Cases</h5>
            <div className="kpi-number" id="kpi-overdue" style={{ color: overdue_complaints > 0 ? 'var(--status-danger)' : 'var(--text-primary)' }}>
              {overdue_complaints}
            </div>
            <span className="kpi-subtitle">Breached Citizen Charter SLA</span>
          </div>
          <div className="kpi-icon-wrapper icon-red">⏱️</div>
        </div>
      </div>

      {/* 6. Entity Count Distinction Ribbon */}
      <div
        className="card"
        style={{
          marginBottom: '24px',
          padding: '14px 20px',
          background: 'linear-gradient(135deg, rgba(15, 27, 56, 0.9) 0%, rgba(26, 42, 86, 0.9) 100%)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Distinct Institutions
            </div>
            <div className="font-mono" style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-blue)', marginTop: '2px' }}>
              {total_institutions_count}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Registered in scope</div>
          </div>

          <div style={{ width: '1px', height: '36px', background: 'var(--border-subtle)' }}></div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Multi-Bureau Hotspots
            </div>
            <div className="font-mono" style={{ fontSize: '20px', fontWeight: '800', color: 'var(--status-danger)', marginTop: '2px' }}>
              {conflicting_institutions_count}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Concurrent actions &gt;1 bureau</div>
          </div>

          <div style={{ width: '1px', height: '36px', background: 'var(--border-subtle)' }}></div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Potential Overlaps
            </div>
            <div className="font-mono" style={{ fontSize: '20px', fontWeight: '800', color: 'var(--status-warning)', marginTop: '2px' }}>
              {potential_overlaps_awaiting_review}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>AI candidate links awaiting review</div>
          </div>

          <div style={{ width: '1px', height: '36px', background: 'var(--border-subtle)' }}></div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Confirmed Case Groups
            </div>
            <div className="font-mono" style={{ fontSize: '20px', fontWeight: '800', color: 'var(--status-success)', marginTop: '2px' }}>
              {confirmed_related_groups_count}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Coordinated case pairs</div>
          </div>
        </div>
      </div>

      {/* 7. Ageing Distribution & Resolution Velocity Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '20px', marginBottom: '24px' }}>
        {/* Ageing Distribution Section */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Active Case Ageing Distribution</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Age distribution of active complaints from date of receipt against 30-day statutory charter
              </p>
            </div>
            <span className="badge badge-neutral font-mono" style={{ fontSize: '11px' }}>
              Total Active: {open_pending_complaints + complaints_under_process}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ageing_distribution.map((b) => {
              let barColor = 'var(--status-success)';
              if (b.bucket === '31-60 Days') barColor = 'var(--status-warning)';
              if (b.bucket === '61-90 Days') barColor = '#f97316';
              if (b.bucket === '90+ Days') barColor = 'var(--status-danger)';

              return (
                <div key={b.bucket}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{b.bucket}</span>
                    <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                      <strong>{b.count} cases</strong> ({b.percentage}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--bg-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, b.percentage)}%`,
                        height: '100%',
                        background: barColor,
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resolution & Disposal Velocity Card */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Resolution & Disposal Metrics</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Statutory closure velocity and SLA adherence compliance
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg Resolution</div>
              <div className="font-mono" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-blue)', marginTop: '4px' }}>
                {resolution_metrics.average_resolution_days} <span style={{ fontSize: '12px' }}>days</span>
              </div>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Median Resolution</div>
              <div className="font-mono" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-purple)', marginTop: '4px' }}>
                {resolution_metrics.median_resolution_days} <span style={{ fontSize: '12px' }}>days</span>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: '600' }}>Overall SLA Adherence Rate</span>
              <span className="font-mono" style={{ fontSize: '13px', fontWeight: '800', color: resolution_metrics.sla_compliance_rate_percent >= 80 ? 'var(--status-success)' : 'var(--status-warning)' }}>
                {resolution_metrics.sla_compliance_rate_percent}%
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--bg-card)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${resolution_metrics.sla_compliance_rate_percent}%`,
                  height: '100%',
                  background: resolution_metrics.sla_compliance_rate_percent >= 80 ? 'var(--status-success)' : 'var(--status-warning)',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          {/* Outcome Breakdown */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            <span>Resolved: <strong style={{ color: 'var(--text-primary)' }}>{resolution_metrics.resolved_count}</strong></span>
            <span>Disposed: <strong style={{ color: 'var(--text-primary)' }}>{resolution_metrics.disposed_count}</strong></span>
            <span>Rejected: <strong style={{ color: 'var(--text-primary)' }}>{resolution_metrics.rejected_count}</strong></span>
          </div>
        </div>
      </div>

      {/* 8. Longitudinal Monthly & Quarterly Trends */}
      <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Longitudinal Case Velocity & Intake Trends</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Complaints received versus complaints disposed across active operational periods
            </p>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              id="btn-trend-monthly"
              className={trendView === 'monthly' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '12px', padding: '5px 12px' }}
              onClick={() => setTrendView('monthly')}
            >
              Monthly View
            </button>
            <button
              id="btn-trend-quarterly"
              className={trendView === 'quarterly' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '12px', padding: '5px 12px' }}
              onClick={() => setTrendView('quarterly')}
            >
              Quarterly View
            </button>
          </div>
        </div>

        {/* Dual Bar Trend Chart */}
        {((trendView === 'monthly' ? monthly_trends : quarterly_trends).length === 0) ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
            No trend data available for current filter selection.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '10px' }}>
            {(trendView === 'monthly' ? monthly_trends : quarterly_trends).map((item) => {
              const label = trendView === 'monthly' ? item.period : item.quarter;
              const maxVal = Math.max(1, ...((trendView === 'monthly' ? monthly_trends : quarterly_trends).map((t) => Math.max(t.received, t.disposed))));
              const recHeight = Math.max(8, (item.received / maxVal) * 90);
              const dispHeight = Math.max(8, (item.disposed / maxVal) * 90);

              return (
                <div
                  key={label}
                  style={{
                    minWidth: '90px',
                    flex: 1,
                    background: 'var(--bg-subtle)',
                    padding: '12px 8px 8px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                >
                  {/* Bars Container */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '100px', width: '48px', justifyContent: 'center' }}>
                    {/* Received Bar */}
                    <div
                      title={`Received: ${item.received}`}
                      style={{
                        width: '18px',
                        height: `${recHeight}px`,
                        background: 'var(--accent-blue)',
                        borderRadius: '3px 3px 0 0',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '9.5px',
                        fontWeight: '700',
                        paddingTop: '2px'
                      }}
                    >
                      {item.received > 0 ? item.received : ''}
                    </div>

                    {/* Disposed Bar */}
                    <div
                      title={`Disposed: ${item.disposed}`}
                      style={{
                        width: '18px',
                        height: `${dispHeight}px`,
                        background: 'var(--status-success)',
                        borderRadius: '3px 3px 0 0',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '9.5px',
                        fontWeight: '700',
                        paddingTop: '2px'
                      }}
                    >
                      {item.disposed > 0 ? item.disposed : ''}
                    </div>
                  </div>

                  {/* Period Label */}
                  <div className="font-mono" style={{ fontSize: '11px', fontWeight: '700', marginTop: '8px', color: 'var(--text-primary)' }}>
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '12px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', background: 'var(--accent-blue)', borderRadius: '2px' }}></span>
            <span>Complaints Received</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', background: 'var(--status-success)', borderRadius: '2px' }}></span>
            <span>Complaints Disposed</span>
          </div>
        </div>
      </div>

      {/* 9. Bureau-Wise Workload & Disposal Matrix Table */}
      <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Bureau-Wise Workload & Disposal Matrix</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Jurisdictional caseload, active inquiry load, overdue count, and SLA compliance
            </p>
          </div>
          <span className="badge badge-blue">Official AICTE Bureaus</span>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bureau / Cell</th>
                <th>Total Cases</th>
                <th>Open / Pending</th>
                <th>Under Process</th>
                <th>Active Total</th>
                <th>Disposed</th>
                <th>Overdue</th>
                <th>Avg Disposal</th>
                <th>SLA Compliance</th>
              </tr>
            </thead>
            <tbody>
              {bureau_metrics.map((bm) => (
                <tr key={bm.bureau}>
                  <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                    {bm.bureau_name || bm.bureau.replace(/_/g, ' ')}
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontWeight: '700' }}>{bm.total_cases}</span>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{bm.open_pending || 0}</span>
                  </td>
                  <td>
                    <span className="badge badge-purple">{bm.under_process || 0}</span>
                  </td>
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
                  <td style={{ fontSize: '12px' }}>
                    {bm.avg_resolution_days > 0 ? `${bm.avg_resolution_days}d` : '—'}
                  </td>
                  <td>
                    <span
                      className="font-mono"
                      style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: bm.sla_compliance_percent >= 80 ? 'var(--status-success)' : 'var(--status-warning)'
                      }}
                    >
                      {bm.sla_compliance_percent || 100}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 10. Regional Geographic Matrix & Category Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Regional Geographic Workload */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800' }}>AICTE Regional Caseload Matrix</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Complaints and cross-bureau conflicts by AICTE regional office zones
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                  <span style={{ fontWeight: '700', fontSize: '13px' }}>{rm.region} Region</span>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {rm.total_cases} total filed • {rm.active_cases} active
                  </div>
                </div>

                <div>
                  {rm.conflicting_institutions > 0 ? (
                    <span className="badge badge-danger">
                      ⚠️ {rm.conflicting_institutions} Overlap(s)
                    </span>
                  ) : (
                    <span className="badge badge-neutral" style={{ fontSize: '10.5px' }}>Normal</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Category Breakdown</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Complaints categorized by primary statutory issue
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {category_distribution.map((cat) => {
              const totalCases = total_complaints_received || 1;
              const pct = Math.round((cat.count / totalCases) * 100);

              return (
                <div key={cat.category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '3px' }}>
                    <span style={{ fontWeight: '600' }}>{cat.category.replace(/_/g, ' ')}</span>
                    <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                      <strong>{cat.count}</strong> ({pct}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--bg-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: 'var(--accent-blue)',
                        borderRadius: '3px'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 11. Institution-Wise Complaint Summaries Table */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Institution-Wise Complaint Summaries ({institution_summaries.length})</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Consolidated institutional dossier metrics, active multi-bureau collisions, and coordination links
            </p>
          </div>

          {/* Quick Search */}
          <input
            id="analytics-institution-search"
            type="text"
            className="form-input"
            style={{ width: '260px', fontSize: '12px', padding: '6px 10px', height: '34px' }}
            placeholder="Search by Institution or AICTE ID..."
            value={institutionSearch}
            onChange={(e) => setInstitutionSearch(e.target.value)}
          />
        </div>

        {filteredInstitutions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
            No institution records found matching search or filter parameters.
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>AICTE ID</th>
                  <th>Institution Name</th>
                  <th>Region & State</th>
                  <th>Active Cases</th>
                  <th>Overdue</th>
                  <th>Disposed</th>
                  <th>Total Cases</th>
                  <th>Bureaus Involved</th>
                  <th>Conflict Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInstitutions.map((inst) => (
                  <tr key={inst.institution_id}>
                    <td>
                      <span className="font-mono" style={{ color: 'var(--accent-blue)', fontWeight: '700' }}>
                        {inst.aicte_id}
                      </span>
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                      {inst.name}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {inst.region} • {inst.state}
                    </td>
                    <td>
                      <span className="badge badge-warning">{inst.active_cases} active</span>
                    </td>
                    <td>
                      {inst.overdue_cases > 0 ? (
                        <span className="badge badge-danger">{inst.overdue_cases}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-success">{inst.disposed_cases}</span>
                    </td>
                    <td>
                      <span className="font-mono" style={{ fontWeight: '700' }}>{inst.total_cases}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {inst.bureaus_involved.map((b) => (
                          <span key={b} className="badge badge-blue" style={{ fontSize: '10px' }}>
                            {b.replace(/_/g, ' ').replace('BUREAU', '').replace('CELL', '')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {inst.is_conflicting ? (
                        <span className="badge badge-danger">⚠️ Overlap Alert</span>
                      ) : (
                        <span className="badge badge-neutral">Single Bureau</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '11.5px' }}
                        onClick={() => onSelectInstitution(inst.institution_id)}
                      >
                        View 360° Dossier
                      </button>
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
