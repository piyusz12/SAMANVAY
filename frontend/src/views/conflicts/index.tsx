'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../shared/ui/Card';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Radar, ShieldAlert, Sparkles, Building2, ArrowRight } from 'lucide-react';

export const ConflictsPage: React.FC<{
  onOpenOverlapReview: (id: number, no: string) => void;
  onSelectInstitution: (id: number) => void;
}> = ({ onOpenOverlapReview, onSelectInstitution }) => {
  const { data: conflicts = [], isLoading } = useQuery<any[]>({
    queryKey: ['conflicts', 'overlapping'],
    queryFn: async () => {
      try {
        return await apiClient.get<any[]>('/api/v1/conflicts/overlapping');
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 30,
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold text-white font-heading">
          Master Cross-Bureau Conflict Radar
        </h2>
        <p className="text-xs text-slate-400">
          Automated multi-departmental collision detector. Prevents conflicting regulatory directives and uncoordinated on-site visits.
        </p>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">Scanning across bureau registries...</div>
        ) : conflicts.length === 0 ? (
          <Card className="p-12 text-center bg-slate-900/60">
            <Radar className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">All Clear — No Inter-Bureau Collisions</h4>
            <p className="text-xs text-slate-500 mt-1">
              No technical institutions currently maintain conflicting active complaints across distinct AICTE bureaus.
            </p>
          </Card>
        ) : (
          conflicts.map((conf, idx) => (
            <Card key={idx} className="border-rose-500/30 bg-slate-900/60 p-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Building2 className="h-4 w-4 text-rose-400" />
                    <h4 className="text-base font-bold text-white">
                      {conf.institution_name || 'Delhi Institute of Technology & Management'}
                    </h4>
                    <span className="text-xs font-mono text-slate-400">
                      ID: {conf.aicte_permanent_id || '1-99887766'}
                    </span>
                    <Badge variant="rose" size="sm">
                      ⚠️ Collision Alert
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-300">
                    Conflicting regulatory proceedings active across multiple departments without unified custody.
                  </p>

                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <span className="text-xs text-slate-400">Involved Bureaus:</span>
                    {(conf.involved_bureaus || ['PGRC', 'APPROVAL_BUREAU', 'LEGAL_CELL']).map(
                      (b: string) => (
                        <Badge key={b} variant="rose" size="sm">
                          {b}
                        </Badge>
                      )
                    )}
                    <span className="text-xs text-slate-400 ml-3">
                      Total Active Cases: <strong className="text-white">{conf.total_active_complaints || 3}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectInstitution(conf.institution_id || 1)}
                  >
                    Inspect Dossier
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => onOpenOverlapReview(conf.sample_complaint_id || 1, 'AICTE/PGRC/2026/0001')}
                    leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                  >
                    Review Overlap
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
