import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const BUREAUS = [
  { id: 'ALL', label: 'All Authorized Bureaus' },
  { id: 'REGULATION_BUREAU', label: 'Regulation Bureau (RB)' },
  { id: 'PGRC', label: 'PGRC (Grievances)' },
  { id: 'APPROVAL_BUREAU', label: 'Approval Bureau (AB)' },
  { id: 'LEGAL_CELL', label: 'Legal Cell (LC)' },
  { id: 'VIGILANCE_CELL', label: 'Vigilance Cell (VC)' },
  { id: 'POLICY_BUREAU', label: 'Policy Bureau' }
];

const REGIONS = [
  'ALL',
  'Northern',
  'Southern',
  'Western',
  'Eastern',
  'Central',
  'North-West',
  'South-West',
  'South-Central'
];

const CATEGORIES = [
  { id: 'ALL', label: 'All Categories' },
  { id: 'FEE_EXTORTION', label: 'Fee Extortion / Caution Money' },
  { id: 'FACULTY_SALARY_WITHHELD', label: 'Faculty Salary Withheld' },
  { id: 'INFRASTRUCTURE_DEFICIT', label: 'Infrastructure Deficit & Safety' },
  { id: 'RECOGNITION_DISPUTE', label: 'Recognition & Court Litigation' },
  { id: 'FAKE_DEGREES_DOCUMENTS', label: 'Ghost Faculty / Fake Records' },
  { id: 'UNAPPROVED_COURSES', label: 'Unapproved Courses / Excess Intake' },
  { id: 'RAGGING_HARASSMENT', label: 'Ragging & Harassment' },
  { id: 'ADMISSION_FRAUD', label: 'Admission Fraud / Capitation' }
];

const STATUSES = [
  'ALL',
  'LODGED',
  'SCRUTINY_PENDING',
  'UNDER_INQUIRY',
  'SHOW_CAUSE_ISSUED',
  'HEARING_SCHEDULED',
  'RESOLVED',
  'DISPOSED',
  'TRANSFERRED'
];

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Lodged / Created Date' },
  { value: 'priority', label: 'Case Priority' },
  { value: 'sla_due_date', label: 'SLA Due Date' },
  { value: 'status', label: 'Current Status' },
  { value: 'complaint_no', label: 'Case Reference ID' }
];

export default function UnifiedSearchView({
  currentUser,
  onSelectComplaint,
  onSelectInstitution,
  initialQuery = ''
}) {
  // Parse initial parameters from current URL if present
  const getUrlParams = () => {
    if (typeof window === 'undefined') return {};
    const sp = new URLSearchParams(window.location.search);
    return {
      q: sp.get('q') || initialQuery || '',
      entityType: sp.get('entity') || 'ALL',
      bureau: sp.get('bureau') || 'ALL',
      region: sp.get('region') || 'ALL',
      category: sp.get('category') || 'ALL',
      status: sp.get('status') || 'ALL',
      dateFrom: sp.get('date_from') || '',
      dateTo: sp.get('date_to') || '',
      isOverdue: sp.get('is_overdue') === 'true',
      sortBy: sp.get('sort_by') || 'created_at',
      sortDir: sp.get('sort_dir') || 'desc',
      page: parseInt(sp.get('page') || '1', 10),
      pageSize: parseInt(sp.get('page_size') || '15', 10)
    };
  };

  const initialParams = getUrlParams();

  // Search State
  const [q, setQ] = useState(initialParams.q);
  const [activeEntityType, setActiveEntityType] = useState(initialParams.entityType); // 'ALL', 'COMPLAINTS', 'INSTITUTIONS'
  const [selectedBureau, setSelectedBureau] = useState(initialParams.bureau);
  const [selectedRegion, setSelectedRegion] = useState(initialParams.region);
  const [selectedCategory, setSelectedCategory] = useState(initialParams.category);
  const [selectedStatus, setSelectedStatus] = useState(initialParams.status);
  const [dateFrom, setDateFrom] = useState(initialParams.dateFrom);
  const [dateTo, setDateTo] = useState(initialParams.dateTo);
  const [isOverdue, setIsOverdue] = useState(initialParams.isOverdue);
  const [sortBy, setSortBy] = useState(initialParams.sortBy);
  const [sortDir, setSortDir] = useState(initialParams.sortDir);
  const [page, setPage] = useState(initialParams.page);
  const [pageSize, setPageSize] = useState(initialParams.pageSize);

  // Results State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [queryExecutionTimeMs, setQueryExecutionTimeMs] = useState(null);

  const [unifiedData, setUnifiedData] = useState({
    complaints: [],
    institutions: [],
    complaintsCount: 0,
    institutionsCount: 0,
    totalMatches: 0,
    totalPages: 1
  });

  // Sync state into browser URL for navigable sharing and bookmarking
  const syncToUrl = useCallback(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams();
    sp.set('tab', 'search');
    if (q) sp.set('q', q);
    if (activeEntityType !== 'ALL') sp.set('entity', activeEntityType);
    if (selectedBureau !== 'ALL') sp.set('bureau', selectedBureau);
    if (selectedRegion !== 'ALL') sp.set('region', selectedRegion);
    if (selectedCategory !== 'ALL') sp.set('category', selectedCategory);
    if (selectedStatus !== 'ALL') sp.set('status', selectedStatus);
    if (dateFrom) sp.set('date_from', dateFrom);
    if (dateTo) sp.set('date_to', dateTo);
    if (isOverdue) sp.set('is_overdue', 'true');
    if (sortBy !== 'created_at') sp.set('sort_by', sortBy);
    if (sortDir !== 'desc') sp.set('sort_dir', sortDir);
    if (page > 1) sp.set('page', page.toString());
    if (pageSize !== 15) sp.set('page_size', pageSize.toString());

    const newUrl = `${window.location.pathname}?${sp.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [
    q,
    activeEntityType,
    selectedBureau,
    selectedRegion,
    selectedCategory,
    selectedStatus,
    dateFrom,
    dateTo,
    isOverdue,
    sortBy,
    sortDir,
    page,
    pageSize
  ]);

  // Execute Search
  const executeSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();

    try {
      syncToUrl();

      if (activeEntityType === 'ALL') {
        // Unified search
        const res = await api.unifiedSearch({
          q: q.trim(),
          bureau: selectedBureau,
          region: selectedRegion,
          category: selectedCategory,
          status_filter: selectedStatus,
          page,
          page_size: pageSize
        });
        setUnifiedData({
          complaints: res.complaints || [],
          institutions: res.institutions || [],
          complaintsCount: res.complaints_count || 0,
          institutionsCount: res.institutions_count || 0,
          totalMatches: res.total_matches || 0,
          totalPages: Math.max(1, Math.ceil((res.total_matches || 0) / pageSize))
        });
      } else if (activeEntityType === 'COMPLAINTS') {
        // Complaints focused search
        const res = await api.searchComplaints({
          q: q.trim(),
          bureau: selectedBureau,
          region: selectedRegion,
          category: selectedCategory,
          status_filter: selectedStatus,
          is_overdue: isOverdue ? 'true' : undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          sort_by: sortBy,
          sort_dir: sortDir,
          page,
          page_size: pageSize
        });
        setUnifiedData({
          complaints: res.items || [],
          institutions: [],
          complaintsCount: res.total || 0,
          institutionsCount: 0,
          totalMatches: res.total || 0,
          totalPages: res.total_pages || 1
        });
      } else if (activeEntityType === 'INSTITUTIONS') {
        // Institutions focused search
        const res = await api.searchInstitutions({
          q: q.trim(),
          region: selectedRegion,
          sort_by: sortBy === 'created_at' ? 'name' : sortBy,
          sort_dir: sortDir,
          page,
          page_size: pageSize
        });
        setUnifiedData({
          complaints: [],
          institutions: res.items || [],
          complaintsCount: 0,
          institutionsCount: res.total || 0,
          totalMatches: res.total || 0,
          totalPages: res.total_pages || 1
        });
      }
    } catch (err) {
      setError(err.message || 'An error occurred during search execution.');
    } finally {
      const elapsed = (performance.now() - startTime).toFixed(1);
      setQueryExecutionTimeMs(elapsed);
      setLoading(false);
    }
  }, [
    q,
    activeEntityType,
    selectedBureau,
    selectedRegion,
    selectedCategory,
    selectedStatus,
    dateFrom,
    dateTo,
    isOverdue,
    sortBy,
    sortDir,
    page,
    pageSize,
    syncToUrl
  ]);

  // Automatically trigger search on query / filter change with debounce
  useEffect(() => {
    executeSearch();
  }, [
    activeEntityType,
    selectedBureau,
    selectedRegion,
    selectedCategory,
    selectedStatus,
    dateFrom,
    dateTo,
    isOverdue,
    sortBy,
    sortDir,
    page,
    pageSize
  ]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    executeSearch();
  };

  const handleResetFilters = () => {
    setQ('');
    setActiveEntityType('ALL');
    setSelectedBureau('ALL');
    setSelectedRegion('ALL');
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
    setDateFrom('');
    setDateTo('');
    setIsOverdue(false);
    setSortBy('created_at');
    setSortDir('desc');
    setPage(1);
  };

  const isUserBureauScoped =
    currentUser &&
    currentUser.role !== 'SUPER_ADMIN' &&
    currentUser.role !== 'AUDITOR' &&
    currentUser.bureau;

  return (
    <div className="unified-search-view" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header Title & Executive Guidance */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🔍</span> Unified AICTE Search & Repository Filtering
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Cross-entity indexing for institutions, complaint cases, permanent IDs, and text descriptions with validated server-side pagination.
          </p>
        </div>

        {isUserBureauScoped && (
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            🔒 Bureau-Scoped Search: <strong>{currentUser.bureau.replace('_', ' ')}</strong>
          </div>
        )}
      </div>

      {/* 2. Main Search Query Bar & Entity Selector */}
      <div className="card" style={{ padding: '20px' }}>
        <form onSubmit={handleSearchSubmit}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div style={{ flex: '1 1 400px', position: 'relative' }}>
              <input
                id="unified-search-input"
                type="text"
                className="form-input"
                style={{
                  height: '46px',
                  fontSize: '15px',
                  paddingLeft: '40px',
                  paddingRight: q ? '40px' : '14px',
                  borderRadius: '10px'
                }}
                placeholder="Search across AICTE ID (1-10293847), Case No (AICTE/RB/2026/0002), Institution name, or keywords..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <span
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '13px',
                  fontSize: '16px',
                  color: 'var(--text-muted)'
                }}
              >
                🔎
              </span>
              {q && (
                <button
                  type="button"
                  onClick={() => {
                    setQ('');
                    setPage(1);
                  }}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '12px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                  title="Clear search query"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              id="unified-search-submit-btn"
              type="submit"
              className="btn-primary"
              style={{ height: '46px', padding: '0 24px', fontSize: '14.5px', borderRadius: '10px' }}
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search Engine'}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={handleResetFilters}
              style={{ height: '46px', borderRadius: '10px' }}
            >
              Reset All Filters
            </button>
          </div>

          {/* Quick Presets / Helper Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Quick Identifiers:</span>
            <button
              type="button"
              className="badge"
              style={{ cursor: 'pointer', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}
              onClick={() => {
                setQ('1-10293847');
                setPage(1);
              }}
            >
              🏢 Apex Permanent ID (1-10293847)
            </button>
            <button
              type="button"
              className="badge"
              style={{ cursor: 'pointer', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}
              onClick={() => {
                setQ('AICTE/RB/2026/0002');
                setPage(1);
              }}
            >
              📁 Regulation Bureau Case (AICTE/RB/2026/0002)
            </button>
            <button
              type="button"
              className="badge"
              style={{ cursor: 'pointer', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}
              onClick={() => {
                setQ('faculty');
                setPage(1);
              }}
            >
              👨‍🏫 Keyword: "faculty"
            </button>
            <button
              type="button"
              className="badge"
              style={{ cursor: 'pointer', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}
              onClick={() => {
                setQ('subletting');
                setPage(1);
              }}
            >
              🏫 Keyword: "subletting"
            </button>
          </div>

          {/* Detailed Filters Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-color)'
            }}
          >
            {/* Bureau Filter */}
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Bureau / Cell
              </label>
              <select
                id="search-bureau-select"
                className="form-input"
                style={{ marginTop: '4px' }}
                value={selectedBureau}
                disabled={isUserBureauScoped}
                onChange={(e) => {
                  setSelectedBureau(e.target.value);
                  setPage(1);
                }}
              >
                {BUREAUS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Region Filter */}
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Geographical Region
              </label>
              <select
                id="search-region-select"
                className="form-input"
                style={{ marginTop: '4px' }}
                value={selectedRegion}
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  setPage(1);
                }}
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r === 'ALL' ? 'All India Regions' : `${r} Region`}
                  </option>
                ))}
              </select>
            </div>

            {/* Complaint Category */}
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Complaint Category
              </label>
              <select
                id="search-category-select"
                className="form-input"
                style={{ marginTop: '4px' }}
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Current Status
              </label>
              <select
                id="search-status-select"
                className="form-input"
                style={{ marginTop: '4px' }}
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === 'ALL' ? 'All Statuses' : s.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range: From */}
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Received Date From
              </label>
              <input
                id="search-date-from"
                type="date"
                className="form-input"
                style={{ marginTop: '4px' }}
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* Date Range: To */}
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Received Date To
              </label>
              <input
                id="search-date-to"
                type="date"
                className="form-input"
                style={{ marginTop: '4px' }}
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* Sort Field */}
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Sort By
              </label>
              <select
                id="search-sort-by"
                className="form-input"
                style={{ marginTop: '4px' }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Direction & Overdue toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={`btn-secondary ${sortDir === 'desc' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '7px 10px', fontSize: '12px' }}
                  onClick={() => setSortDir(sortDir === 'desc' ? 'asc' : 'desc')}
                  title="Toggle Ascending / Descending"
                >
                  {sortDir === 'desc' ? '⬇ Descending' : '⬆ Ascending'}
                </button>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                <input
                  id="search-overdue-checkbox"
                  type="checkbox"
                  checked={isOverdue}
                  onChange={(e) => {
                    setIsOverdue(e.target.checked);
                    setPage(1);
                  }}
                />
                <span style={{ color: isOverdue ? 'var(--status-critical)' : 'inherit', fontWeight: isOverdue ? '700' : 'normal' }}>
                  ⚠️ Overdue SLA only
                </span>
              </label>
            </div>
          </div>
        </form>
      </div>

      {/* 3. Entity Selector Tabs & Stats Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            id="search-entity-all-btn"
            className={`nav-tab-btn ${activeEntityType === 'ALL' ? 'active' : ''}`}
            style={{ borderRadius: '8px', padding: '8px 16px', fontSize: '13px' }}
            onClick={() => {
              setActiveEntityType('ALL');
              setPage(1);
            }}
          >
            🌐 All Entities ({unifiedData.totalMatches})
          </button>
          <button
            id="search-entity-complaints-btn"
            className={`nav-tab-btn ${activeEntityType === 'COMPLAINTS' ? 'active' : ''}`}
            style={{ borderRadius: '8px', padding: '8px 16px', fontSize: '13px' }}
            onClick={() => {
              setActiveEntityType('COMPLAINTS');
              setPage(1);
            }}
          >
            📁 Complaint Cases ({unifiedData.complaintsCount})
          </button>
          <button
            id="search-entity-institutions-btn"
            className={`nav-tab-btn ${activeEntityType === 'INSTITUTIONS' ? 'active' : ''}`}
            style={{ borderRadius: '8px', padding: '8px 16px', fontSize: '13px' }}
            onClick={() => {
              setActiveEntityType('INSTITUTIONS');
              setPage(1);
            }}
          >
            🏢 Institutions Registry ({unifiedData.institutionsCount})
          </button>
        </div>

        {queryExecutionTimeMs !== null && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            ⚡ Execution time: <strong>{queryExecutionTimeMs} ms</strong> • PostgreSQL full-text/indexed scan
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            color: 'var(--status-critical)',
            fontSize: '13.5px'
          }}
        >
          <strong>Search Error:</strong> {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 16px auto' }}></div>
          <p style={{ fontSize: '14px' }}>Executing parameterized query against AICTE database...</p>
        </div>
      )}

      {/* 4. Results Presentation */}
      {!loading && !error && unifiedData.totalMatches === 0 && (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>🔎</div>
          <h3 style={{ fontSize: '18px', fontWeight: '700' }}>No matching records found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', maxWidth: '500px', margin: '8px auto 20px auto' }}>
            We could not find any complaints or institutions matching your active query and filters. Try clearing region, bureau, or category constraints.
          </p>
          <button className="btn-secondary" onClick={handleResetFilters}>
            Clear All Filters & Reset Search
          </button>
        </div>
      )}

      {!loading && !error && unifiedData.totalMatches > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section A: Institutions Matches */}
          {(activeEntityType === 'ALL' || activeEntityType === 'INSTITUTIONS') && unifiedData.institutions.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🏢</span> Matched Institutions ({unifiedData.institutions.length})
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '14px' }}>
                {unifiedData.institutions.map((inst) => (
                  <div
                    key={inst.id}
                    className="card"
                    style={{
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'transform 0.15s ease, border-color 0.15s ease',
                      border: inst.is_conflicting ? '1px solid rgba(239, 68, 68, 0.4)' : undefined
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '6px' }}>
                        <div>
                          <span className="badge badge-info" style={{ fontSize: '11px', marginRight: '6px' }}>
                            {inst.region} Region
                          </span>
                          <span className="badge" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)' }}>
                            {inst.institution_type}
                          </span>
                        </div>
                        {inst.is_conflicting && (
                          <span className="badge badge-danger" style={{ fontSize: '10.5px' }}>
                            🚨 Multi-Bureau Conflict
                          </span>
                        )}
                      </div>

                      <h4
                        style={{
                          fontSize: '15px',
                          fontWeight: '700',
                          color: 'var(--text-primary)',
                          marginBottom: '6px',
                          cursor: 'pointer'
                        }}
                        onClick={() => onSelectInstitution && onSelectInstitution(inst.id)}
                      >
                        {inst.name}
                      </h4>

                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                        <div>
                          <strong>AICTE ID:</strong>{' '}
                          <code style={{ background: 'var(--bg-secondary)', padding: '2px 5px', borderRadius: '4px' }}>
                            {inst.aicte_id}
                          </code>
                        </div>
                        {inst.aishe_code && (
                          <div>
                            <strong>AISHE:</strong> {inst.aishe_code}
                          </div>
                        )}
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                        📍 {inst.city}, {inst.state}
                      </div>

                      {/* Highlights */}
                      {inst.match_highlights && inst.match_highlights.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                          {inst.match_highlights.map((h, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: '11px',
                                background: 'rgba(234, 179, 8, 0.15)',
                                color: '#facc15',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                border: '1px solid rgba(234, 179, 8, 0.3)'
                              }}
                            >
                              ✓ {h}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        paddingTop: '12px',
                        borderTop: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <strong>{inst.active_complaints_count}</strong> active / {inst.total_complaints_count} total cases
                      </div>
                      <button
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => onSelectInstitution && onSelectInstitution(inst.id)}
                      >
                        Open 360° Dossier →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section B: Complaint Cases Matches */}
          {(activeEntityType === 'ALL' || activeEntityType === 'COMPLAINTS') && unifiedData.complaints.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📁</span> Matched Complaint Cases ({unifiedData.complaints.length})
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {unifiedData.complaints.map((c) => (
                  <div
                    key={c.id}
                    className="card"
                    style={{
                      padding: '16px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      cursor: 'pointer',
                      borderLeft: c.is_overdue
                        ? '4px solid var(--status-critical)'
                        : c.priority === 'CRITICAL'
                        ? '4px solid #ef4444'
                        : '4px solid var(--brand-primary)'
                    }}
                    onClick={() => onSelectComplaint && onSelectComplaint(c.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <code
                          style={{
                            fontSize: '13px',
                            fontWeight: '700',
                            padding: '3px 8px',
                            background: 'var(--bg-secondary)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)'
                          }}
                        >
                          {c.complaint_no}
                        </code>
                        <span className="badge badge-info" style={{ fontSize: '11px' }}>
                          {c.bureau.replace('_', ' ')}
                        </span>
                        <span
                          className={`badge ${
                            c.priority === 'CRITICAL'
                              ? 'badge-danger'
                              : c.priority === 'HIGH'
                              ? 'badge-warning'
                              : 'badge-secondary'
                          }`}
                          style={{ fontSize: '11px' }}
                        >
                          {c.priority}
                        </span>
                        <span className="badge badge-secondary" style={{ fontSize: '11px' }}>
                          {c.status.replace('_', ' ')}
                        </span>
                        {c.is_overdue && (
                          <span className="badge badge-danger" style={{ fontSize: '11px' }}>
                            ⚠️ OVERDUE ({c.days_open}d open)
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Lodged: {new Date(c.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {c.subject}
                      </h4>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.45', margin: 0 }}>
                        {c.description_snippet}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-color)', fontSize: '12px' }}>
                      <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)' }}>
                        <div>
                          <strong>Institution:</strong>{' '}
                          <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{c.institution_name}</span>
                          {c.institution_aicte_id && <span> ({c.institution_aicte_id})</span>}
                        </div>
                        {c.region && <div><strong>Region:</strong> {c.region}</div>}
                        {c.assigned_officer_name && <div><strong>Assigned:</strong> {c.assigned_officer_name}</div>}
                      </div>

                      {/* Match Highlights */}
                      {c.match_highlights && c.match_highlights.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {c.match_highlights.map((h, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: '11px',
                                background: 'rgba(234, 179, 8, 0.15)',
                                color: '#facc15',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                border: '1px solid rgba(234, 179, 8, 0.3)'
                              }}
                            >
                              ✓ {h}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Pagination Controls */}
          {unifiedData.totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '16px',
                background: 'var(--card-bg)',
                borderRadius: '10px',
                border: '1px solid var(--border-color)'
              }}
            >
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Page <strong>{page}</strong> of <strong>{unifiedData.totalPages}</strong> ({unifiedData.totalMatches} matches)
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  id="search-prev-page-btn"
                  className="btn-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{ padding: '6px 14px', fontSize: '12.5px' }}
                >
                  ← Previous
                </button>

                {Array.from({ length: Math.min(5, unifiedData.totalPages) }, (_, i) => {
                  let pNum = i + 1;
                  if (unifiedData.totalPages > 5 && page > 3) {
                    pNum = page - 2 + i;
                    if (pNum > unifiedData.totalPages) pNum = unifiedData.totalPages - 4 + i;
                  }
                  return (
                    <button
                      key={pNum}
                      className={page === pNum ? 'btn-primary' : 'btn-secondary'}
                      style={{ padding: '6px 12px', fontSize: '12.5px', minWidth: '34px' }}
                      onClick={() => setPage(pNum)}
                    >
                      {pNum}
                    </button>
                  );
                })}

                <button
                  id="search-next-page-btn"
                  className="btn-secondary"
                  disabled={page >= unifiedData.totalPages}
                  onClick={() => setPage((p) => Math.min(unifiedData.totalPages, p + 1))}
                  style={{ padding: '6px 14px', fontSize: '12.5px' }}
                >
                  Next →
                </button>

                <select
                  className="form-input"
                  style={{ width: 'auto', padding: '6px 10px', fontSize: '12.5px' }}
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value, 10));
                    setPage(1);
                  }}
                >
                  <option value={10}>10 / page</option>
                  <option value={15}>15 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
