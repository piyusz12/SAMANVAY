'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';
import { RegionalMapRadar } from '../../widgets/regional-map';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../shared/ui/Card';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Radar, ShieldAlert, Sparkles, Building2, ArrowRight } from 'lucide-react';

export const ConflictsPage: React.FC<{
  onOpenOverlapReview: (id: number, no: string) => void;
  onSelectInstitution: (id: number) => void;
}> = ({ onOpenOverlapReview, onSelectInstitution }) => {
  const { data: conflicts = [], isLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ['conflicts', 'overlapping'],
    queryFn: () => apiClient.get<any[]>('/api/v1/conflicts/overlapping'),
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

      {/* Regional Office Geospatial Radar Map */}
      <RegionalMapRadar />

      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">Scanning across bureau registries...</div>
        ) : isError ? (
          <Card className="p-8 text-center bg-slate-900/60 border-rose-500/30">
            <p className="text-sm text-rose-400 font-semibold mb-2">Unable to load conflict radar data</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry Scan
            </Button>
          </Card>
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
                      {conf.institution_name || 'Institution not recorded'}
                    </h4>
                    <span className="text-xs font-mono text-slate-400">
                      {conf.aicte_id || conf.aicte_permanent_id
                        ? `ID: ${conf.aicte_id || conf.aicte_permanent_id}`
                        : 'ID: Not recorded'}
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
                    {(conf.bureaus_involved || conf.involved_bureaus) &&
                    (conf.bureaus_involved || conf.involved_bureaus).length > 0 ? (
                      (conf.bureaus_involved || conf.involved_bureaus).map((b: string) => (
                        <Badge key={b} variant="rose" size="sm">
                          {b}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">None specified</span>
                    )}
                    <span className="text-xs text-slate-400 ml-3">
                      Total Active Cases:{' '}
                      <strong className="text-white">
                        {conf.active_cases_count ?? conf.total_active_complaints ?? 0}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!conf.institution_id}
                    onClick={() => conf.institution_id && onSelectInstitution(conf.institution_id)}
                  >
                    Inspect Dossier
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!conf.sample_complaint_id && !conf.cases?.[0]?.id}
                    onClick={() => {
                      const sampleId = conf.sample_complaint_id || conf.cases?.[0]?.id;
                      const sampleNo =
                        conf.sample_complaint_no ||
                        conf.cases?.[0]?.complaint_no ||
                        `Complaint #${sampleId}`;
                      if (sampleId) onOpenOverlapReview(sampleId, sampleNo);
                    }}
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
