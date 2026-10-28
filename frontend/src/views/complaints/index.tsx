'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useComplaints, ComplaintStatusBadge, SlaBadge } from '../../entities/complaint';
import { BUREAUS, COMPLAINT_STATUSES } from '../../shared/config/constants';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { Select } from '../../shared/ui/FormControls';
import { formatDate, formatDateTime } from '../../shared/lib/date-utils';
import { apiClient } from '../../shared/api/api-client';
import { useAppStore } from '../../shared/lib/store';
import {
  FileText,
  Sparkles,
  ArrowRightLeft,
  RefreshCw,
  PlusCircle,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
} from 'lucide-react';

export const ComplaintsPage: React.FC<{
  onOpenLodge: () => void;
  onOpenOverlapReview: (id: number, no: string) => void;
  onOpenTransition: (comp: any) => void;
  onOpenTransfer: (comp: any) => void;
  onSelectComplaint?: (id: number) => void;
}> = ({
  onOpenLodge,
  onOpenOverlapReview,
  onOpenTransition,
  onOpenTransfer,
  onSelectComplaint,
}) => {
  const queryClient = useQueryClient();
  const currentUser = useAppStore((s) => s.currentUser);
  const [activeTab, setActiveTab] = useState<'cases' | 'transfers'>('cases');

  // Filters for cases
  const [bureauFilter, setBureauFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Query complaints
  const { data: complaintsData, isLoading } = useComplaints({
    bureau: bureauFilter !== 'ALL' ? bureauFilter : undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    page,
    page_size: pageSize,
  });

  const complaints = complaintsData?.items || [];
  const total = complaintsData?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Query movements
  const { data: movements = [], isLoading: isMovementsLoading } = useQuery<any[]>({
    queryKey: ['movements-docket'],
    queryFn: () => apiClient.get<any[]>('/api/v1/movements'),
    enabled: activeTab === 'transfers',
    staleTime: 1000 * 20,
  });

  // Transfer decision mutation
  const decideMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: number; decision: 'ACCEPTED' | 'REJECTED' }) => {
      const notes = window.prompt(
        decision === 'ACCEPTED'
          ? 'Enter acceptance notes / target officer instructions:'
          : 'Enter mandatory rejection justification:'
      );
      if (notes === null) return;
      return await apiClient.patch(`/api/v1/movements/${id}/decide`, {
        decision,
        notes: notes || (decision === 'ACCEPTED' ? 'Transfer accepted by bureau head' : 'Transfer rejected'),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements-docket'] });
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
    },
    onError: (err: any) => {
      alert(`Decision failed: ${err?.message || 'Unauthorized action'}`);
    },
  });

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

      {/* Sub-view navigation tabs */}
      <div className="flex border-b border-slate-800 gap-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('cases')}
          className={`px-4 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'cases'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Active Grievances & Repository ({total})
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`px-4 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'transfers'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Inter-Bureau Transfers Docket
        </button>
      </div>

      {/* TAB 1: CASES REPOSITORY */}
      {activeTab === 'cases' && (
        <div className="space-y-4">
          {/* Filter Chips Bar */}
          <Card className="p-3 bg-slate-900/60">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-full sm:w-48">
                <Select
                  value={bureauFilter}
                  onChange={(e) => {
                    setBureauFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 text-xs"
                  aria-label="Filter by Bureau"
                >
                  <option value="ALL">All Bureaus (Council-Wide)</option>
                  {Object.values(BUREAUS).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.id})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="w-full sm:w-44">
                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 text-xs"
                  aria-label="Filter by Status"
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
                Showing <strong className="text-white">{complaints.length}</strong> of{' '}
                <strong className="text-white">{total}</strong> complaints
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
                      className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors group"
                    >
                      <div
                        className="space-y-1.5 flex-1 cursor-pointer"
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
                            {comp.bureau || comp.bureau_id}
                          </Badge>
                          <ComplaintStatusBadge status={comp.status} size="sm" />
                          <SlaBadge
                            createdAt={comp.created_at}
                            dueDate={comp.sla_due_date}
                            status={comp.status}
                            size="sm"
                          />
                        </div>

                        <h4 className="text-sm font-bold text-slate-100 group-hover:text-blue-300 transition-colors">
                          {comp.subject}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-1">{comp.description}</p>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 flex-wrap">
                          <span className="flex items-center gap-1 text-slate-300 font-medium">
                            <Building2 className="h-3 w-3 text-slate-500" />
                            {comp.institution_name || 'Institution not recorded'}
                          </span>
                          <span>•</span>
                          <span>Category: {comp.category}</span>
                          <span>•</span>
                          <span>
                            Complainant: {comp.complainant_name || 'Anonymous'} (
                            {comp.complainant_category || 'Not specified'})
                          </span>
                          <span>•</span>
                          <span>Lodged: {formatDate(comp.created_at)}</span>
                        </div>
                      </div>

                      {/* Operational Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {onSelectComplaint && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onSelectComplaint(comp.id)}
                            leftIcon={<Eye className="h-3.5 w-3.5 text-slate-300" />}
                          >
                            Dossier
                          </Button>
                        )}
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

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Page <strong className="text-white">{page}</strong> of{' '}
                    <strong className="text-white">{totalPages}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: TRANSFERS DOCKET */}
      {activeTab === 'transfers' && (
        <Card className="bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-blue-400" />
              Inter-Bureau Case Transfer & Handover Ledger
            </CardTitle>
            <CardDescription>
              Chronological log of jurisdictional reassignments, cross-bureau co-handling requests, and handover approvals.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isMovementsLoading ? (
              <div className="p-12 text-center text-xs text-slate-500">Loading transfers docket...</div>
            ) : movements.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No inter-bureau file transfer requests currently recorded.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {movements.map((m) => {
                  const isPending = m.status === 'PENDING_APPROVAL';
                  const canDecide =
                    isPending &&
                    (currentUser.role === 'SUPER_ADMIN' ||
                      currentUser.bureau === m.to_bureau);

                  return (
                    <div
                      key={m.id}
                      className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-white">
                            {m.complaint_no || `Complaint #${m.complaint_id}`}
                          </span>
                          <span className="text-xs text-blue-400 font-semibold font-mono">
                            {m.from_bureau} ➔ {m.to_bureau}
                          </span>
                          <Badge
                            variant={
                              m.status === 'ACCEPTED'
                                ? 'emerald'
                                : m.status === 'REJECTED'
                                ? 'rose'
                                : 'amber'
                            }
                            size="sm"
                          >
                            {m.status}
                          </Badge>
                          <Badge variant="purple" size="sm">
                            {m.movement_type}
                          </Badge>
                        </div>

                        <p className="text-xs text-slate-200">
                          <strong>Transfer Justification:</strong> {m.reason}
                        </p>

                        <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-1 flex-wrap">
                          <span>Requested by: <strong className="text-slate-300">{m.requested_by_name || 'Case Officer'}</strong></span>
                          <span>•</span>
                          <span>Initiated: {formatDateTime(m.created_at)}</span>
                          {m.decided_by_name && (
                            <>
                              <span>•</span>
                              <span>
                                Decided by: <strong className="text-slate-300">{m.decided_by_name}</strong>{' '}
                                {m.decision_notes && `("${m.decision_notes}")`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Operational Handover Decisions */}
                      {canDecide && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => decideMutation.mutate({ id: m.id, decision: 'ACCEPTED' })}
                            disabled={decideMutation.isPending}
                            leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => decideMutation.mutate({ id: m.id, decision: 'REJECTED' })}
                            disabled={decideMutation.isPending}
                            leftIcon={<XCircle className="h-3.5 w-3.5 text-rose-400" />}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
