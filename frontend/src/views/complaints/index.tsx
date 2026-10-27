'use client';

import React, { useState } from 'react';
import { useComplaints, ComplaintStatusBadge, SlaBadge } from '../../entities/complaint';
import { BUREAUS, COMPLAINT_STATUSES } from '../../shared/config/constants';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { Select } from '../../shared/ui/FormControls';
import { formatDate } from '../../shared/lib/date-utils';
import { FileText, Sparkles, ArrowRightLeft, RefreshCw, PlusCircle, Building2 } from 'lucide-react';

export const ComplaintsPage: React.FC<{
  onOpenLodge: () => void;
  onOpenOverlapReview: (id: number, no: string) => void;
  onOpenTransition: (comp: any) => void;
  onOpenTransfer: (comp: any) => void;
}> = ({ onOpenLodge, onOpenOverlapReview, onOpenTransition, onOpenTransfer }) => {
  const [bureauFilter, setBureauFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: complaintsData, isLoading } = useComplaints({
    bureau: bureauFilter !== 'ALL' ? bureauFilter : undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
  });

  const complaints = complaintsData?.items || [];

  return (
    <div className="space-y-4">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <h2 className="text-xl font-extrabold text-white font-heading">
            Complaint Intake & Case Repository
          </h2>
          <p className="text-xs text-slate-400">
            Multi-bureau repository with statutory SLA countdowns, jurisdictional state transitions, and file transfers.
          </p>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={onOpenLodge}
          leftIcon={<PlusCircle className="h-4 w-4" />}
        >
          Lodge Complaint
        </Button>
      </div>

      {/* Filter Chips Bar */}
      <Card className="p-3 bg-slate-900/60">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-48">
            <Select
              value={bureauFilter}
              onChange={(e) => setBureauFilter(e.target.value)}
              className="h-8 text-xs"
            >
              <option value="ALL">All Bureaus (Council-Wide)</option>
              {Object.values(BUREAUS).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.id})
                </option>
              ))}
            </Select>
          </div>

          <div className="w-44">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 text-xs"
            >
              <option value="ALL">All Lifecycle States</option>
              {Object.entries(COMPLAINT_STATUSES).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="text-xs text-slate-400 ml-auto font-mono">
            Showing <strong className="text-white">{complaints.length}</strong> complaints
          </div>
        </div>
      </Card>

      {/* Complaints Table */}
      <Card className="bg-slate-900/60">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500">Loading complaints...</div>
          ) : complaints.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No complaints match the selected bureau and status criteria.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {complaints.map((comp) => (
                <div
                  key={comp.id}
                  className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white font-mono">{comp.complaint_no}</span>
                      <Badge variant="blue" size="sm">
                        {comp.bureau_id}
                      </Badge>
                      <ComplaintStatusBadge status={comp.status} size="sm" />
                      <SlaBadge createdAt={comp.created_at} dueDate={comp.sla_due_date} status={comp.status} size="sm" />
                    </div>

                    <h4 className="text-sm font-bold text-slate-100">{comp.subject}</h4>
                    <p className="text-xs text-slate-400 line-clamp-1">{comp.description}</p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-slate-300 font-medium">
                        <Building2 className="h-3 w-3 text-slate-500" />
                        {comp.institution_name || 'Technical Institution'}
                      </span>
                      <span>•</span>
                      <span>Category: {comp.category}</span>
                      <span>•</span>
                      <span>Complainant: {comp.complainant_name || 'Anonymous'} ({comp.complainant_category || 'Student'})</span>
                      <span>•</span>
                      <span>Lodged: {formatDate(comp.created_at)}</span>
                    </div>
                  </div>

                  {/* Operational Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenOverlapReview(comp.id, comp.complaint_no)}
                      leftIcon={<Sparkles className="h-3.5 w-3.5 text-blue-400" />}
                    >
                      Overlap Radar
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onOpenTransition(comp)}
                      leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                    >
                      Status
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onOpenTransfer(comp)}
                      leftIcon={<ArrowRightLeft className="h-3.5 w-3.5" />}
                    >
                      Transfer
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
