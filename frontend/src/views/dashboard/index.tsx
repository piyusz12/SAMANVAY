'use client';

import React from 'react';
import { DepartmentMetricsBoard } from '../../widgets/department-metrics';
import { ConflictRadarWidget } from '../../widgets/conflict-radar';
import { useComplaints, ComplaintStatusBadge, SlaBadge } from '../../entities/complaint';
import { useAppStore } from '../../shared/lib/store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { formatDate } from '../../shared/lib/date-utils';
import {
  FileText,
  ArrowRight,
  Sparkles,
  Building2,
  Eye,
  Search,
  Scale,
  BookOpen,
  Shield,
  HelpCircle,
} from 'lucide-react';

const PUBLIC_SERVICES = [
  {
    title: 'Track Grievance Status',
    desc: 'Enter your AICTE complaint tracking number to view real-time stage progress, assigned desk officer, and download official receipts.',
    tab: 'track',
    icon: Search,
    color: 'text-blue-400',
    border: 'hover:border-blue-500/50',
    actionLabel: 'Track Now',
  },
  {
    title: 'Citizen’s Charter & 30-Day SLA',
    desc: 'Mandatory statutory resolution windows, student rights, whistleblower encryption, and 4-tier hierarchical escalation procedures.',
    tab: 'charter',
    icon: Scale,
    color: 'text-amber-400',
    border: 'hover:border-amber-500/50',
    actionLabel: 'View Charter',
  },
  {
    title: 'Fee Refund & Anti-Ragging Rules',
    desc: 'Official gazette circulars mandating 100% fee refunds on cancellation and strict statutory prohibition against retaining original certificates.',
    tab: 'circulars',
    icon: BookOpen,
    color: 'text-emerald-400',
    border: 'hover:border-emerald-500/50',
    actionLabel: 'Browse Circulars',
  },
  {
    title: 'Technical Institutions 360°',
    desc: 'Official registry of approved engineering, polytechnic, and management colleges across India with compliance records and active cells.',
    tab: 'institutions',
    icon: Building2,
    color: 'text-indigo-400',
    border: 'hover:border-indigo-500/50',
    actionLabel: 'Inspect Directory',
  },
] as const;

export const DashboardPage: React.FC<{
  onOpenLodge: () => void;
  onOpenOverlapReview: (id: number, no: string) => void;
  onSelectInstitution: (id: number) => void;
  onSelectComplaint?: (id: number) => void;
}> = ({ onOpenLodge, onOpenOverlapReview, onSelectInstitution, onSelectComplaint }) => {
  const { setActiveTab } = useAppStore();
  const { data: complaintsData, isLoading } = useComplaints({ priority: undefined });
  const complaints = complaintsData?.items || [];

  return (
    <div className="space-y-6">
      {/* 1. Citizen & Public Quick Services Hub */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PUBLIC_SERVICES.map((svc, idx) => {
          const Icon = svc.icon;
          return (
            <Card
              key={idx}
              className={`border-slate-800 bg-slate-900/60 p-4 transition-all duration-200 ${svc.border} flex flex-col justify-between`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg bg-slate-800/80 ${svc.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">Service {idx + 1}</span>
                </div>
                <h4 className="text-sm font-bold text-white">{svc.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                  {svc.desc}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-800/80">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab(svc.tab as any)}
                  className="w-full justify-between"
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                >
                  {svc.actionLabel}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 2. Key Metrics Overview */}
      <DepartmentMetricsBoard />

      {/* 3. Conflict Radar Section */}
      <ConflictRadarWidget onSelectInstitution={onSelectInstitution} />

      {/* 4. Recent Intake and Active Inquiries Grid */}
      <Card className="bg-slate-900/60">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-400" />
              Recent Cross-Bureau Intake Stream
            </CardTitle>
            <CardDescription>
              Chronological log of newly registered grievances across all AICTE bureaus.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setActiveTab('complaints')}
            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
          >
            View All Complaints
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading complaints...</div>
          ) : complaints.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No complaints registered yet.</div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {complaints.slice(0, 5).map((comp) => (
                <div
                  key={comp.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors group"
                >
                  <div
                    className="space-y-1 cursor-pointer flex-1"
                    onClick={() => onSelectComplaint && onSelectComplaint(comp.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && onSelectComplaint) onSelectComplaint(comp.id);
                    }}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white font-mono group-hover:text-blue-400 transition-colors">
                        {comp.complaint_no}
                      </span>
                      <Badge variant="blue" size="sm">
                        {comp.bureau || comp.bureau_id || 'AICTE'}
                      </Badge>
                      <ComplaintStatusBadge status={comp.status} size="sm" />
                      <SlaBadge createdAt={comp.created_at} dueDate={comp.sla_due_date} status={comp.status} size="sm" />
                    </div>
                    <h5 className="text-xs font-semibold text-slate-200 group-hover:text-blue-300 transition-colors">
                      {comp.subject}
                    </h5>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-slate-500" />
                        {comp.institution_name || 'Institution not recorded'}
                      </span>
                      <span>•</span>
                      <span>Category: {comp.category}</span>
                      <span>•</span>
                      <span>Lodged: {formatDate(comp.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onSelectComplaint && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onSelectComplaint(comp.id)}
                        leftIcon={<Eye className="h-3.5 w-3.5 text-slate-400" />}
                      >
                        Inspect
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenOverlapReview(comp.id, comp.complaint_no)}
                      leftIcon={<Sparkles className="h-3.5 w-3.5 text-blue-400" />}
                    >
                      Check Overlaps
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
