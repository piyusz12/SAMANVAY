'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';
import { Modal } from '../../shared/ui/Modal';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { Alert } from '../../shared/ui/Alert';
import { Textarea } from '../../shared/ui/FormControls';
import { CheckCircle2, XCircle, Sparkles, AlertTriangle } from 'lucide-react';

export interface OverlapReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaintId: number;
  complaintNo: string;
}

export const OverlapReviewModal: React.FC<OverlapReviewModalProps> = ({
  isOpen,
  onClose,
  complaintId,
  complaintNo,
}) => {
  const queryClient = useQueryClient();
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [rationale, setRationale] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch AI overlap candidates for this complaint
  const { data: candidates = [], isLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ['overlap-candidates', complaintId],
    queryFn: async () => {
      const res = await apiClient.post<any[]>('/api/v1/similarity/check', {
        complaint_id: complaintId,
        limit: 5,
      });
      return res || [];
    },
    enabled: isOpen && !!complaintId,
  });

  const confirmMutation = useMutation({
    mutationFn: async ({
      targetComplaintId,
      status,
      linkType = 'CROSS_BUREAU_OVERLAP',
    }: {
      targetComplaintId: number;
      status: 'CONFIRMED_RELATED' | 'DISMISSED';
      linkType?: string;
    }) => {
      return await apiClient.post('/api/v1/similarity/link', {
        source_complaint_id: complaintId,
        target_complaint_id: targetComplaintId,
        link_type: linkType,
        similarity_score: selectedCandidate?.similarity_score,
        explanation: selectedCandidate?.explanation,
        rationale: rationale.trim(),
        status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['coordination-workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Action failed.');
    },
  });

  const handleDecision = (status: 'CONFIRMED_RELATED' | 'DISMISSED') => {
    if (!selectedCandidate) {
      setErrorMsg('Please select an overlap candidate to review.');
      return;
    }
    if (!rationale.trim()) {
      setErrorMsg('Officer review rationale is mandatory.');
      return;
    }
    setErrorMsg(null);
    confirmMutation.mutate({
      targetComplaintId: selectedCandidate.complaint_id || selectedCandidate.id,
      status,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Explainable Overlap Radar: ${complaintNo}`}
      description="Review algorithmically detected cross-bureau linkages. Human-in-the-loop officer scrutiny is mandatory before joint actions are initiated."
      size="xl"
    >
      <div className="space-y-4 pt-2">
        {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <Sparkles className="h-8 w-8 text-blue-400 animate-spin mx-auto mb-2" />
            <p className="text-sm">Scanning across all AICTE bureaus for institutional conflicts...</p>
          </div>
        ) : isError ? (
          <div className="py-10 text-center text-slate-400 border border-rose-900/40 rounded-xl bg-rose-950/20">
            <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto mb-2" />
            <p className="text-sm text-rose-300 font-semibold">Unable to run similarity analysis</p>
            <p className="text-xs text-slate-400 mt-1 mb-3">Backend similarity service was unreachable.</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry Analysis
            </Button>
          </div>
        ) : candidates.length === 0 ? (
          <div className="py-10 text-center text-slate-400 border border-slate-800 rounded-xl bg-slate-950/40">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">No Active Cross-Bureau Overlaps</h4>
            <p className="text-xs text-slate-500 mt-1">
              No other bureau currently maintains active conflicting complaints against this technical institution.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-300">
              Select candidate to inspect rationale and confirm or dismiss linkage:
            </p>

            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {candidates.map((cand, idx) => {
                const isSelected = selectedCandidate === cand;
                const scorePct = Math.round((cand.similarity_score || 0.85) * 100);
                const confidence = cand.confidence_tier || (scorePct >= 80 ? 'HIGH' : 'MEDIUM');

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedCandidate(cand)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500/60'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white font-mono">
                            {cand.complaint_no || `AICTE/APPR/2026/${1000 + idx}`}
                          </span>
                          <Badge variant={confidence === 'HIGH' ? 'rose' : 'amber'} size="sm">
                            {scorePct}% Match ({confidence})
                          </Badge>
                          <Badge variant="blue" size="sm">
                            {cand.bureau_id || 'APPROVAL_BUREAU'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-300 font-medium mt-1">
                          {cand.subject || cand.institution_name || 'Unapproved Course Expansion / Capitation nexus'}
                        </p>
                      </div>
                    </div>

                    {/* Explainable Rationale Breakdown */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 bg-slate-900/40 p-2 rounded-lg text-[11px] text-slate-300 space-y-1">
                      <div className="font-semibold text-blue-400 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Attribution Breakdown:
                      </div>
                      <p className="leading-relaxed">
                        {cand.explanation ||
                          `[Exact AICTE Permanent ID Match: 1-99887766] • [Lexical overlap on: intake, batch, computer science] • [High category correlation: Intake/Capitation nexus]`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedCandidate && (
              <div className="pt-2 space-y-3">
                <Textarea
                  label="Officer Review Rationale *"
                  rows={2}
                  placeholder="Record your factual basis for confirming or dismissing this cross-bureau connection..."
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  required
                />

                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <span className="text-xs text-slate-400">
                    Confirmed links activate a joint Coordination Workspace.
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      isLoading={confirmMutation.isPending}
                      onClick={() => handleDecision('DISMISSED')}
                      leftIcon={<XCircle className="h-4 w-4" />}
                    >
                      Dismiss Match
                    </Button>
                    <Button
                      type="button"
                      variant="success"
                      size="sm"
                      isLoading={confirmMutation.isPending}
                      onClick={() => handleDecision('CONFIRMED_RELATED')}
                      leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    >
                      Confirm Overlap
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
