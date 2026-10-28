'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';
import { RegionalMapRadar } from '../../widgets/regional-map';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { Select } from '../../shared/ui/FormControls';
import {
  BarChart3,
  Download,
  FileText,
  Clock,
  AlertTriangle,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [selectedReportType, setSelectedReportType] = useState('complaints');

  // Overview analytics
  const { data: analytics, isLoading, isError, refetch } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => apiClient.get<any>('/api/v1/analytics/overview'),
    staleTime: 1000 * 30,
  });

  // Pending ageing distribution
  const { data: ageingData } = useQuery({
    queryKey: ['reports', 'ageing'],
    queryFn: () => apiClient.get<any>('/api/v1/reports/pending-ageing'),
    staleTime: 1000 * 60,
  });

  // Deadlines & escalations report
  const { data: deadlinesData } = useQuery({
    queryKey: ['reports', 'deadlines'],
    queryFn: () => apiClient.get<any>('/api/v1/reports/deadlines-escalations'),
    staleTime: 1000 * 60,
  });

  const handleDownloadExport = (format: 'pdf' | 'csv') => {
    const url = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/reports/export/${format}?report_type=${selectedReportType}`;
    window.open(url, '_blank');
  };

  const ageingDistribution = ageingData?.data?.distribution || [
    { bucket: '< 15 Days', count: 0, color: 'bg-emerald-500' },
    { bucket: '15 - 30 Days', count: 0, color: 'bg-blue-500' },
    { bucket: '31 - 60 Days', count: 0, color: 'bg-amber-500' },
    { bucket: '61 - 90 Days', count: 0, color: 'bg-orange-500' },
    { bucket: '> 90 Days', count: 0, color: 'bg-rose-500' },
  ];

  const deadlinesSummary = deadlinesData?.data?.summary || {
    upcoming_7_days: 0,
    upcoming_15_days: 0,
    overdue_cases: 0,
    escalated_level_3: 0,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <h2 className="text-xl font-extrabold text-white font-heading">
            Executive Analytics & Regulatory Reporting
          </h2>
          <p className="text-xs text-slate-400">
            Real-time cross-departmental resolution velocity, pendency ageing distribution, and statutory SLA audit dockets.
          </p>
        </div>
      </div>

      {/* Official Export Center Card */}
      <Card className="bg-slate-900/80 border border-blue-500/30 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Download className="h-4 w-4 text-blue-400" />
              Controlled Regulatory Export Suite
            </h3>
            <p className="text-xs text-slate-400">
              Server-generated official reports with PII disclosure masking and cryptographic audit trail timestamps.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-48">
              <Select
                aria-label="Select report type for export"
                value={selectedReportType}
                onChange={(e) => setSelectedReportType(e.target.value)}
                className="h-8 text-xs"
              >
                <option value="complaints">Master Cases Docket</option>
                <option value="bureau">Bureau Caseloads</option>
                <option value="ageing">Pendency Ageing</option>
                <option value="deadlines">Critical SLA Breaches</option>
              </Select>
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleDownloadExport('csv')}
              leftIcon={<FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />}
            >
              Export CSV
            </Button>

            <Button
              size="sm"
              variant="primary"
              onClick={() => handleDownloadExport('pdf')}
              leftIcon={<FileText className="h-3.5 w-3.5" />}
            >
              Executive PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Deadlines & Escalation Alerts Docket */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-400" />
          Statutory Deadlines & Escalation Alerts
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3.5 bg-slate-900/60 border-l-4 border-l-blue-500">
            <span className="text-[11px] text-slate-400 font-semibold block">Upcoming (7 Days)</span>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {deadlinesSummary.upcoming_7_days ?? 0}
            </div>
            <span className="text-[10px] text-blue-400">Cases nearing statutory limit</span>
          </Card>

          <Card className="p-3.5 bg-slate-900/60 border-l-4 border-l-sky-500">
            <span className="text-[11px] text-slate-400 font-semibold block">Upcoming (15 Days)</span>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {deadlinesSummary.upcoming_15_days ?? 0}
            </div>
            <span className="text-[10px] text-sky-400">Mid-cycle inquiry review</span>
          </Card>

          <Card className="p-3.5 bg-slate-900/60 border-l-4 border-l-rose-500">
            <span className="text-[11px] text-slate-400 font-semibold block">Overdue SLA Cases</span>
            <div className="text-xl font-bold font-mono text-rose-400 mt-1">
              {deadlinesSummary.overdue_cases ?? 0}
            </div>
            <span className="text-[10px] text-rose-400">Citizen&apos;s Charter Breached</span>
          </Card>

          <Card className="p-3.5 bg-slate-900/60 border-l-4 border-l-amber-500">
            <span className="text-[11px] text-slate-400 font-semibold block">Tier 3 Escalations</span>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">
              {deadlinesSummary.escalated_level_3 ?? 0}
            </div>
            <span className="text-[10px] text-amber-400">Secretary / Chairman Level</span>
          </Card>
        </div>
      </div>

      {/* Pendency Ageing Distribution */}
      <Card className="bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            Pendency Ageing Distribution
          </CardTitle>
          <CardDescription>
            Chronological aging buckets across all bureaus to highlight stalled investigations and procedural bottlenecks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {ageingDistribution.map((item: any, i: number) => (
              <div key={i} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold">{item.bucket}</span>
                  <span className="font-mono text-slate-300 font-bold">{item.count ?? 0}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color || 'bg-blue-500'}`}
                    style={{ width: `${Math.min(100, Math.max(8, ((item.count || 0) / 10) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bureau Performance Matrix */}
      <Card className="bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-400" />
            AICTE Bureau Operational Caseload Matrix
          </CardTitle>
          <CardDescription>
            Live caseload distribution, disposal velocity, and overdue SLA breach ratios.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading performance matrix...</div>
          ) : isError ? (
            <div className="p-8 text-center text-xs text-rose-400">
              Failed to load analytics data.{' '}
              <button onClick={() => refetch()} className="ml-1 underline text-white hover:text-blue-300 cursor-pointer">
                Retry
              </button>
            </div>
          ) : !analytics?.bureau_breakdown || analytics.bureau_breakdown.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No bureau breakdown available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Bureau / Cell</th>
                    <th className="p-3.5">Active Inquiries</th>
                    <th className="p-3.5">Disposed & Resolved</th>
                    <th className="p-3.5">Overdue Breaches</th>
                    <th className="p-3.5">Disposal Velocity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {analytics.bureau_breakdown.map((row: any, i: number) => {
                    const totalCaseload = Math.max(1, (row.active || 0) + (row.resolved || 0));
                    const healthPct = Math.round(((row.resolved || 0) / totalCaseload) * 100);
                    return (
                      <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 font-sans font-bold text-white flex items-center gap-2">
                          <span>🏛️</span>
                          <span>{row.bureau}</span>
                        </td>
                        <td className="p-3.5 text-blue-400 font-bold">{row.active || 0}</td>
                        <td className="p-3.5 text-emerald-400 font-bold">{row.resolved || 0}</td>
                        <td className="p-3.5 text-rose-400 font-bold">
                          {row.overdue > 0 ? `⚠️ ${row.overdue}` : '0'}
                        </td>
                        <td className="p-3.5">
                          <Badge variant={healthPct >= 50 ? 'emerald' : 'amber'} size="sm">
                            {healthPct}% Disposed
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regional Office Geospatial Intelligence */}
      <RegionalMapRadar />
    </div>
  );
};
