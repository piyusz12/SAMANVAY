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
import { FileText, ArrowRight, Sparkles, Building2, Eye } from 'lucide-react';

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
      {/* 1. Key Metrics Overview */}
      <DepartmentMetricsBoard />

      {/* 2. Conflict Radar Section */}
      <ConflictRadarWidget onSelectInstitution={onSelectInstitution} />

      {/* 3. Recent Intake and Active Inquiries Grid */}
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
