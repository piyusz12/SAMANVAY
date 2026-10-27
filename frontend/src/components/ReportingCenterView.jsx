import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const REPORT_TABS = [
  { id: 'bureau', label: 'Bureau Workload', icon: '🏛️', desc: 'Case distribution, resolution times & SLA compliance across AICTE bureaus' },
  { id: 'region', label: 'Regional Metrics', icon: '🗺️', desc: 'Complaints & institutional density across 7 AICTE administrative regions' },
  { id: 'institution', label: 'Institution Track Record', icon: '🏢', desc: 'Institution-wise complaint dossiers, repeat trends & grievance density' },
  { id: 'ageing', label: 'Pending Ageing', icon: '⏳', desc: 'Ageing distribution buckets (<15d, 15-30d, 31-60d, 61-90d, >90d)' },
  { id: 'trends', label: 'Disposal Trends', icon: '📈', desc: 'Longitudinal analysis of receipt volumes vs disposals & turnaround velocity' },
  { id: 'overlaps', label: 'Cross-Bureau Overlaps', icon: '🔗', desc: 'Inter-bureau candidate pairs, linkage verification & cluster density' },
  { id: 'deadlines', label: 'Deadlines & Escalations', icon: '⚠️', desc: 'Upcoming SLA breaches, overdue cases & 3-tier regulatory escalation' },
  { id: 'complaints', label: 'Master Complaints Dossier', icon: '📋', desc: 'Full case records with field-level disclosure rules & confidential PII redaction' },
];

const AICTE_BUREAUS = [
  { id: 'REGULATION_BUREAU', name: 'Regulation Bureau' },
  { id: 'PGRC', name: 'Public Grievance Redressal Cell' },
  { id: 'APPROVAL_BUREAU', name: 'Approval Bureau' },
  { id: 'LEGAL_CELL', name: 'Legal Cell' },
  { id: 'VIGILANCE_CELL', name: 'Vigilance Cell' },
  { id: 'POLICY_BUREAU', name: 'Policy & Academic Bureau' }
];

const AICTE_REGIONS = [
  'Northern', 'North-West', 'Eastern', 'Western',
  'Southern', 'South-West', 'Central'
];

const CATEGORIES = [
  'UNAPPROVED_INSTITUTION',
  'FACULTY_SALARY_WITHHELD',
  'CAPITATION_FEE',
  'ARBITRARY_DISMISSAL',
  'INADEQUATE_INFRASTRUCTURE',
  'ADMISSION_IRREGULARITY',
  'FINANCIAL_EMBEZZLEMENT'
];

export default function ReportingCenterView({ currentUser }) {
  const [activeReportTab, setActiveReportTab] = useState('bureau');
  const [loading, setLoading] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState(null);
  const [reportResult, setReportResult] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    bureau: '',
    region: '',
    category: '',
    status: '',
    priority: '',
    q: ''
  });

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let resp;
      const cleanParams = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v) cleanParams[k] = v;
      });

      switch (activeReportTab) {
        case 'bureau':
          resp = await api.getBureauReport(cleanParams);
          break;
        case 'region':
          resp = await api.getRegionReport(cleanParams);
          break;
        case 'institution':
          resp = await api.getInstitutionHistoryReport(cleanParams);
          break;
        case 'ageing':
          resp = await api.getPendingAgeingReport(cleanParams);
          break;
        case 'trends':
          resp = await api.getDisposalTrendsReport(cleanParams);
          break;
        case 'overlaps':
          resp = await api.getOverlapReport(cleanParams);
          break;
        case 'deadlines':
          resp = await api.getDeadlineEscalationReport(cleanParams);
          break;
        case 'complaints':
          // Use searchComplaints or bureau report as preview
          resp = await api.searchComplaints({ ...cleanParams, page: 1, page_size: 25 });
          // Format with synthetic metadata
          resp = {
            metadata: {
              report_type: 'complaints',
              report_title: 'AICTE Complaint Records Master Dossier',
              generated_at: new Date().toISOString(),
              generated_by: currentUser?.name || 'Officer',
              user_role: currentUser?.role || 'OFFICER',
              user_bureau: currentUser?.bureau || 'HQ',
              selected_filters: cleanParams,
              record_count: resp.total_count || resp.complaints?.length || 0,
              is_truncated: (resp.total_count || 0) > 25
            },
            data: resp.complaints || []
          };
          break;
        default:
          resp = await api.getBureauReport(cleanParams);
      }
      setReportResult(resp);
    } catch (err) {
      console.error('Failed to load report:', err);
      setError(err.message || 'Failed to generate server report.');
    } finally {
      setLoading(false);
    }
  }, [activeReportTab, filters, currentUser]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const cleanParams = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v) cleanParams[k] = v;
      });
      await api.downloadReportCsv(activeReportTab, cleanParams);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const cleanParams = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v) cleanParams[k] = v;
      });
      await api.downloadReportPdf(activeReportTab, cleanParams);
    } catch (err) {
      alert(`PDF export failed: ${err.message}`);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      date_from: '',
      date_to: '',
      bureau: '',
      region: '',
      category: '',
      status: '',
      priority: '',
      q: ''
    });
  };

  const currentTabMeta = REPORT_TABS.find(t => t.id === activeReportTab) || REPORT_TABS[0];
  const metadata = reportResult?.metadata;

  return (
    <div className="reporting-center space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl border border-indigo-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">📊</span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Management Reporting & Controlled Exports
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Phase 13 Active
                  </span>
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Server-generated analytics, formula-safe CSV exports, executive PDF summaries & field-level PII protection.
                </p>
              </div>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCsv}
              disabled={exportingCsv || loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-semibold flex items-center gap-2 transition shadow-md disabled:opacity-50"
              title="Download formula-injection safe CSV export with UTF-8 BOM"
            >
              {exportingCsv ? (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full"></span>
              ) : (
                <span>📥</span>
              )}
              Export CSV (Safe)
            </button>

            <button
              onClick={handleExportPdf}
              disabled={exportingPdf || loading}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition shadow-md disabled:opacity-50"
              title="Generate server-side executive PDF summary"
            >
              {exportingPdf ? (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
              ) : (
                <span>📄</span>
              )}
              Export PDF Summary
            </button>
          </div>
        </div>

        {/* User Scope & Security Notice */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Authorized Scope:</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono font-medium border border-slate-700">
              {currentUser?.role || 'OFFICER'} ({currentUser?.bureau || 'HQ'})
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span>🛡️</span> Field-Level PII Redaction Active
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-amber-400 flex items-center gap-1">
              <span>🔒</span> Anti-Formula Injection Enabled
            </span>
          </div>

          <div className="text-slate-400">
            Export Bounded at <strong className="text-slate-300">5,000 records</strong> per batch with audit logging.
          </div>
        </div>
      </div>

      {/* Report Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        {REPORT_TABS.map(tab => {
          const isActive = activeReportTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-700/60'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
            <span>🔍</span>
            <span>Report Parameters & Data Range Filters</span>
          </div>
          <button
            onClick={resetFilters}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Date From */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={e => handleFilterChange('date_from', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={e => handleFilterChange('date_to', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Bureau */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Bureau</label>
            <select
              value={filters.bureau}
              onChange={e => handleFilterChange('bureau', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Bureaus</option>
              {AICTE_BUREAUS.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Region */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Region</label>
            <select
              value={filters.region}
              onChange={e => handleFilterChange('region', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All 7 Regions</option>
              {AICTE_REGIONS.map(r => (
                <option key={r} value={r}>{r} Region</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Category</label>
            <select
              value={filters.category}
              onChange={e => handleFilterChange('category', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Priority</label>
            <select
              value={filters.priority}
              onChange={e => handleFilterChange('priority', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report Header Metadata Bar */}
      {metadata && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white">{metadata.report_title}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">
              Generated: <strong className="text-slate-300">{new Date(metadata.generated_at).toLocaleString()}</strong>
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">
              Officer: <strong className="text-slate-300">{metadata.generated_by}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded bg-slate-800 text-indigo-300 border border-slate-700 font-mono font-medium">
              Records: {metadata.record_count} {metadata.is_truncated && '(Truncated to preview)'}
            </span>
            <button
              onClick={fetchReport}
              className="p-1 text-slate-400 hover:text-white transition"
              title="Refresh Report Data"
            >
              🔄
            </button>
          </div>
        </div>
      )}

      {/* Main Report Content Area */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-3"></div>
          <p className="text-sm text-slate-400">Generating server-side report dataset...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-xl text-center">
          <span className="text-2xl mb-2 block">⚠️</span>
          <p className="text-sm font-semibold text-rose-300 mb-1">Failed to generate report</p>
          <p className="text-xs text-rose-400">{error}</p>
        </div>
      ) : reportResult ? (
        <div>
          {activeReportTab === 'bureau' && <BureauReportView data={reportResult.data} />}
          {activeReportTab === 'region' && <RegionReportView data={reportResult.data} />}
          {activeReportTab === 'institution' && <InstitutionHistoryView data={reportResult.data} />}
          {activeReportTab === 'ageing' && <PendingAgeingView data={reportResult.data} />}
          {activeReportTab === 'trends' && <DisposalTrendsView data={reportResult.data} />}
          {activeReportTab === 'overlaps' && <OverlapReportView data={reportResult.data} />}
          {activeReportTab === 'deadlines' && <DeadlinesReportView data={reportResult.data} />}
          {activeReportTab === 'complaints' && <MasterComplaintsView data={reportResult.data} />}
        </div>
      ) : null}
    </div>
  );
}

// =========================================================================
// SUB-COMPONENTS: REPORT TABLES & VISUALIZATIONS
// =========================================================================

function BureauReportView({ data }) {
  if (!data || data.length === 0) return <EmptyReportState />;

  const totalCases = data.reduce((s, i) => s + (i.total_cases || 0), 0);
  const totalOpen = data.reduce((s, i) => s + (i.open_cases || 0), 0);
  const totalDisposed = data.reduce((s, i) => s + (i.disposed_cases || 0), 0);
  const totalOverdue = data.reduce((s, i) => s + (i.overdue_cases || 0), 0);

  return (
    <div className="space-y-4">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Grievances" value={totalCases} color="indigo" icon="📊" />
        <SummaryCard label="Open & In-Process" value={totalOpen} color="amber" icon="⏳" />
        <SummaryCard label="Total Disposed" value={totalDisposed} color="emerald" icon="✅" />
        <SummaryCard label="Overdue SLA Cases" value={totalOverdue} color="rose" icon="🚨" />
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-700">
            <tr>
              <th className="px-4 py-3">Bureau / Cell</th>
              <th className="px-3 py-3 text-right">Total</th>
              <th className="px-3 py-3 text-right">Open</th>
              <th className="px-3 py-3 text-right">In Process</th>
              <th className="px-3 py-3 text-right">Disposed</th>
              <th className="px-3 py-3 text-right">Transferred</th>
              <th className="px-3 py-3 text-right">Overdue</th>
              <th className="px-3 py-3 text-right">Avg Days</th>
              <th className="px-3 py-3 text-right">SLA %</th>
              <th className="px-3 py-3 text-right">Officers</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {data.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-800/40 transition">
                <td className="px-4 py-3 font-sans font-medium text-slate-200">
                  <div className="font-semibold">{item.bureau_name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{item.bureau}</div>
                </td>
                <td className="px-3 py-3 text-right font-bold text-white">{item.total_cases}</td>
                <td className="px-3 py-3 text-right text-amber-300">{item.open_cases}</td>
                <td className="px-3 py-3 text-right text-sky-300">{item.under_process_cases}</td>
                <td className="px-3 py-3 text-right text-emerald-400 font-semibold">{item.disposed_cases}</td>
                <td className="px-3 py-3 text-right text-slate-400">{item.transferred_cases}</td>
                <td className={`px-3 py-3 text-right font-bold ${item.overdue_cases > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                  {item.overdue_cases}
                </td>
                <td className="px-3 py-3 text-right text-slate-300">{item.avg_resolution_days} d</td>
                <td className="px-3 py-3 text-right">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    item.sla_compliance_rate >= 80 ? 'bg-emerald-500/20 text-emerald-300' :
                    item.sla_compliance_rate >= 60 ? 'bg-amber-500/20 text-amber-300' :
                    'bg-rose-500/20 text-rose-300'
                  }`}>
                    {item.sla_compliance_rate}%
                  </span>
                </td>
                <td className="px-3 py-3 text-right text-slate-400">{item.officer_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RegionReportView({ data }) {
  if (!data || data.length === 0) return <EmptyReportState />;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-700">
          <tr>
            <th className="px-4 py-3">Region</th>
            <th className="px-3 py-3 text-right">Institutions Tracked</th>
            <th className="px-3 py-3 text-right">Total Grievances</th>
            <th className="px-3 py-3 text-right">Active Grievances</th>
            <th className="px-3 py-3 text-right">Resolved</th>
            <th className="px-3 py-3 text-right">Overdue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-mono">
          {data.map((item, idx) => (
            <tr key={idx} className="hover:bg-slate-800/40 transition">
              <td className="px-4 py-3 font-sans font-medium text-slate-200">
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-xs font-semibold mr-2">
                  {item.region}
                </span>
              </td>
              <td className="px-3 py-3 text-right text-slate-300">{item.total_institutions}</td>
              <td className="px-3 py-3 text-right font-bold text-white">{item.total_complaints}</td>
              <td className="px-3 py-3 text-right text-amber-300 font-semibold">{item.active_complaints}</td>
              <td className="px-3 py-3 text-right text-emerald-400">{item.resolved_complaints}</td>
              <td className={`px-3 py-3 text-right font-bold ${item.overdue_complaints > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                {item.overdue_complaints}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InstitutionHistoryView({ data }) {
  if (!data || data.length === 0) return <EmptyReportState />;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-700">
          <tr>
            <th className="px-4 py-3">Institution Name & AISHE</th>
            <th className="px-3 py-3">Region & State</th>
            <th className="px-3 py-3 text-right">Total</th>
            <th className="px-3 py-3 text-right">Active</th>
            <th className="px-3 py-3 text-right">Resolved</th>
            <th className="px-3 py-3">Max Priority</th>
            <th className="px-3 py-3">Primary Category</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-mono">
          {data.map((item, idx) => (
            <tr key={idx} className="hover:bg-slate-800/40 transition">
              <td className="px-4 py-3 font-sans font-medium text-slate-200">
                <div className="font-semibold text-white">{item.institution_name}</div>
                <div className="text-[11px] text-slate-500 font-mono">{item.aishe_code || `ID #${item.institution_id}`}</div>
              </td>
              <td className="px-3 py-3 font-sans text-slate-400">
                {item.region} • {item.state}
              </td>
              <td className="px-3 py-3 text-right font-bold text-white">{item.total_complaints}</td>
              <td className="px-3 py-3 text-right text-amber-300 font-semibold">{item.active_complaints}</td>
              <td className="px-3 py-3 text-right text-emerald-400">{item.resolved_complaints}</td>
              <td className="px-3 py-3 font-sans">
                <PriorityBadge priority={item.highest_priority} />
              </td>
              <td className="px-3 py-3 font-sans text-slate-400 text-[11px]">
                {item.primary_category.replace(/_/g, ' ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PendingAgeingView({ data }) {
  if (!data || !data.buckets) return <EmptyReportState />;

  return (
    <div className="space-y-4">
      {/* Ageing Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Total Pending Cases" value={data.total_pending} color="amber" icon="⏳" />
        <SummaryCard label="Average Age" value={`${data.average_age_days} Days`} color="indigo" icon="📅" />
        <SummaryCard label="Oldest Open Case" value={`${data.oldest_case_days} Days`} color="rose" icon="🚨" />
      </div>

      {/* Ageing Buckets Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
          Ageing Distribution Buckets
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {data.buckets.map((b, idx) => (
            <div key={idx} className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-400 font-medium mb-1">{b.bucket}</div>
              <div className="text-lg font-bold text-white font-mono">{b.case_count}</div>
              <div className="text-[10px] text-indigo-400 font-semibold mt-0.5">{b.percentage}% of pending</div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-700">
            <tr>
              <th className="px-4 py-3">Case Ref</th>
              <th className="px-3 py-3">Institution</th>
              <th className="px-3 py-3">Bureau</th>
              <th className="px-3 py-3 text-right">Days Open</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Priority</th>
              <th className="px-3 py-3">Assigned Officer</th>
              <th className="px-3 py-3 text-center">Overdue?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {(data.ageing_cases || []).map((c, idx) => (
              <tr key={idx} className="hover:bg-slate-800/40 transition">
                <td className="px-4 py-3 font-semibold text-indigo-300">{c.complaint_no}</td>
                <td className="px-3 py-3 font-sans text-slate-300">{c.institution_name}</td>
                <td className="px-3 py-3 font-sans text-slate-400">{c.bureau}</td>
                <td className="px-3 py-3 text-right font-bold text-amber-300">{c.days_open} d</td>
                <td className="px-3 py-3 font-sans text-[11px] text-slate-400">{c.status}</td>
                <td className="px-3 py-3 font-sans">
                  <PriorityBadge priority={c.priority} />
                </td>
                <td className="px-3 py-3 font-sans text-slate-400">{c.assigned_officer}</td>
                <td className="px-3 py-3 text-center">
                  {c.is_overdue ? (
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                      OVERDUE
                    </span>
                  ) : (
                    <span className="text-slate-600 font-bold text-[10px]">IN SLA</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DisposalTrendsView({ data }) {
  if (!data || data.length === 0) return <EmptyReportState />;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-700">
          <tr>
            <th className="px-4 py-3">Period (YYYY-MM)</th>
            <th className="px-3 py-3 text-right">Received Cases</th>
            <th className="px-3 py-3 text-right">Disposed Cases</th>
            <th className="px-3 py-3 text-right">Avg Resolution Duration</th>
            <th className="px-3 py-3 text-right">Disposal Rate %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-mono">
          {data.map((item, idx) => (
            <tr key={idx} className="hover:bg-slate-800/40 transition">
              <td className="px-4 py-3 font-sans font-semibold text-indigo-300">{item.period}</td>
              <td className="px-3 py-3 text-right text-white font-bold">{item.received_count}</td>
              <td className="px-3 py-3 text-right text-emerald-400 font-bold">{item.disposed_count}</td>
              <td className="px-3 py-3 text-right text-slate-300">{item.avg_resolution_days} days</td>
              <td className="px-3 py-3 text-right">
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  item.disposed_percentage >= 70 ? 'bg-emerald-500/20 text-emerald-300' :
                  item.disposed_percentage >= 40 ? 'bg-amber-500/20 text-amber-300' :
                  'bg-rose-500/20 text-rose-300'
                }`}>
                  {item.disposed_percentage}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OverlapReportView({ data }) {
  if (!data) return <EmptyReportState />;

  return (
    <div className="space-y-4">
      {/* Overlap Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Candidate Pairs" value={data.total_candidate_pairs} color="indigo" icon="🔗" />
        <SummaryCard label="Pending Review" value={data.pending_review} color="amber" icon="⏳" />
        <SummaryCard label="Confirmed Related" value={data.confirmed_linked} color="emerald" icon="🤝" />
        <SummaryCard label="Dismissed" value={data.dismissed} color="slate" icon="🚫" />
      </div>

      {/* Cross-Bureau Matrix */}
      {data.cross_bureau_summary && Object.keys(data.cross_bureau_summary).length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Inter-Bureau Overlap Distribution
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.cross_bureau_summary).map(([pair, count], idx) => (
              <div key={idx} className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs flex items-center gap-2">
                <span className="text-indigo-300 font-medium">{pair}:</span>
                <span className="font-mono font-bold text-white bg-slate-900 px-1.5 py-0.5 rounded">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Candidate Linkages Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-700">
            <tr>
              <th className="px-4 py-3">Linkage ID</th>
              <th className="px-3 py-3">Case Pair</th>
              <th className="px-3 py-3">Bureaus Involved</th>
              <th className="px-3 py-3 text-right">Score</th>
              <th className="px-3 py-3">Tier</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Matching Reasons</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {(data.linkage_records || []).map((l, idx) => (
              <tr key={idx} className="hover:bg-slate-800/40 transition">
                <td className="px-4 py-3 font-semibold text-slate-400">#{l.id}</td>
                <td className="px-3 py-3 text-indigo-300 font-medium">
                  #{l.source_complaint_id} ↔ #{l.target_complaint_id}
                </td>
                <td className="px-3 py-3 font-sans text-slate-400 text-[11px]">
                  {l.source_bureau} ↔ {l.target_bureau}
                </td>
                <td className="px-3 py-3 text-right font-bold text-white">
                  {(l.confidence_score * 100).toFixed(0)}%
                </td>
                <td className="px-3 py-3 font-sans">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    l.confidence_tier === 'HIGH' ? 'bg-emerald-500/20 text-emerald-300' :
                    l.confidence_tier === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {l.confidence_tier || 'TIER'}
                  </span>
                </td>
                <td className="px-3 py-3 font-sans text-[11px] text-slate-300">{l.status}</td>
                <td className="px-3 py-3 font-sans text-slate-400 text-[11px] truncate max-w-xs" title={l.reasons}>
                  {l.reasons}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeadlinesReportView({ data }) {
  if (!data) return <EmptyReportState />;

  return (
    <div className="space-y-4">
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Upcoming (7 Days)" value={data.upcoming_7_days} color="indigo" icon="⏰" />
        <SummaryCard label="Upcoming (15 Days)" value={data.upcoming_15_days} color="sky" icon="📅" />
        <SummaryCard label="Overdue Cases" value={data.overdue_cases} color="rose" icon="🚨" />
        <SummaryCard label="Escalation Tier 3" value={data.escalated_level_3} color="amber" icon="⚡" />
      </div>

      {/* Critical Overdue List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <span className="text-xs font-semibold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>🚨</span> Critical Overdue SLA Docket
          </span>
          <span className="text-[11px] text-slate-400">
            {data.critical_overdue_list?.length || 0} Breached Cases
          </span>
        </div>
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/40 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-700">
            <tr>
              <th className="px-4 py-3">Case Ref</th>
              <th className="px-3 py-3">Institution</th>
              <th className="px-3 py-3">Bureau</th>
              <th className="px-3 py-3">Priority</th>
              <th className="px-3 py-3">Officer</th>
              <th className="px-3 py-3">SLA Due Date</th>
              <th className="px-3 py-3 text-right">Days Past</th>
              <th className="px-3 py-3">Escalation Tier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {(data.critical_overdue_list || []).map((c, idx) => (
              <tr key={idx} className="hover:bg-slate-800/40 transition">
                <td className="px-4 py-3 font-semibold text-rose-300">{c.complaint_no}</td>
                <td className="px-3 py-3 font-sans text-slate-300">{c.institution_name}</td>
                <td className="px-3 py-3 font-sans text-slate-400">{c.bureau}</td>
                <td className="px-3 py-3 font-sans">
                  <PriorityBadge priority={c.priority} />
                </td>
                <td className="px-3 py-3 font-sans text-slate-400">{c.assigned_officer}</td>
                <td className="px-3 py-3 text-slate-400">{c.sla_due_date?.slice(0, 10)}</td>
                <td className="px-3 py-3 text-right font-bold text-rose-400">{c.days_overdue} d</td>
                <td className="px-3 py-3 font-sans">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold text-[10px]">
                    {c.escalation_tier}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MasterComplaintsView({ data }) {
  if (!data || data.length === 0) return <EmptyReportState />;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="p-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between text-xs text-slate-400">
        <span>Showing authorized cases with active field-level disclosure masking</span>
        <span className="text-emerald-400">🛡️ Confidentiality Preserved</span>
      </div>
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-slate-800/40 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-700">
          <tr>
            <th className="px-4 py-3">Case Ref</th>
            <th className="px-3 py-3">Bureau</th>
            <th className="px-3 py-3">Category</th>
            <th className="px-3 py-3">Complainant</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Priority</th>
            <th className="px-3 py-3">Received</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-mono">
          {data.map((c, idx) => (
            <tr key={idx} className="hover:bg-slate-800/40 transition">
              <td className="px-4 py-3 font-semibold text-indigo-300">{c.complaint_no}</td>
              <td className="px-3 py-3 font-sans text-slate-400">{c.bureau}</td>
              <td className="px-3 py-3 font-sans text-slate-300 text-[11px]">
                {c.category?.replace(/_/g, ' ')}
              </td>
              <td className="px-3 py-3 font-sans">
                {c.is_anonymous_confidential ? (
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-semibold">
                    [CONFIDENTIAL]
                  </span>
                ) : (
                  <span className="text-slate-300 text-[11px]">{c.complainant_name}</span>
                )}
              </td>
              <td className="px-3 py-3 font-sans text-[11px] text-slate-300">{c.status}</td>
              <td className="px-3 py-3 font-sans">
                <PriorityBadge priority={c.priority} />
              </td>
              <td className="px-3 py-3 text-slate-400">{c.created_at?.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =========================================================================
// HELPER UI ELEMENTS
// =========================================================================

function SummaryCard({ label, value, color, icon }) {
  const colorMap = {
    indigo: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    rose: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    sky: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    slate: 'border-slate-700 bg-slate-800/50 text-slate-400'
  };

  return (
    <div className={`p-4 rounded-xl border backdrop-blur ${colorMap[color] || colorMap.indigo} shadow-lg`}>
      <div className="flex items-center justify-between text-xs mb-1 opacity-80">
        <span>{label}</span>
        <span>{icon}</span>
      </div>
      <div className="text-2xl font-bold font-mono text-white tracking-tight">{value}</div>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const map = {
    CRITICAL: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    HIGH: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    MEDIUM: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    LOW: 'bg-slate-500/20 text-slate-400 border-slate-600'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${map[priority] || map.MEDIUM}`}>
      {priority}
    </span>
  );
}

function EmptyReportState() {
  return (
    <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl shadow-xl">
      <span className="text-4xl block mb-2">📊</span>
      <h3 className="text-sm font-semibold text-slate-300 mb-1">No Records Found</h3>
      <p className="text-xs text-slate-500 max-w-sm mx-auto">
        No case records or linkages match the selected filters within your authorized bureau scope.
      </p>
    </div>
  );
}
