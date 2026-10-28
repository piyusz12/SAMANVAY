'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';
import { useAppStore } from '../../shared/lib/store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../shared/ui/Card';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { AlertTriangle, Building2, ExternalLink, ShieldAlert } from 'lucide-react';

export const ConflictRadarWidget: React.FC<{ onSelectInstitution: (id: number) => void }> = ({
  onSelectInstitution,
}) => {
  const { data: conflicts = [], isLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ['conflicts', 'overlapping'],
    queryFn: () => apiClient.get<any[]>('/api/v1/conflicts/overlapping'),
    staleTime: 1000 * 30,
  });

  return (
    <Card className="border-rose-500/20 bg-slate-900/60">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              Live Cross-Bureau Conflict Radar
            </CardTitle>
            <Badge variant="rose" size="sm">
              {conflicts.length} Active Hotspots
            </Badge>
          </div>
          <CardDescription>
            Flagging technical institutions facing concurrent, non-disposed inquiries across two or more AICTE cells.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading conflict radar...</div>
        ) : isError ? (
          <div className="p-6 text-center text-xs text-rose-400">
            Unable to load live conflict radar data.{' '}
            <button onClick={() => refetch()} className="ml-1 underline text-white hover:text-blue-300 cursor-pointer">
              Retry
            </button>
          </div>
        ) : conflicts.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No active multi-bureau collisions detected across technical institutions.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {conflicts.slice(0, 5).map((conf, idx) => (
              <div
                key={idx}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <h5 className="text-sm font-bold text-white">
                      {conf.institution_name || 'Institution not recorded'}
                    </h5>
                    <span className="text-[11px] font-mono text-slate-400">
                      {conf.aicte_id || conf.aicte_permanent_id
                        ? `ID: ${conf.aicte_id || conf.aicte_permanent_id}`
                        : 'ID: Not recorded'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400">Involved Bureaus:</span>
                    {(conf.bureaus_involved || conf.involved_bureaus) &&
                    (conf.bureaus_involved || conf.involved_bureaus).length > 0 ? (
                      (conf.bureaus_involved || conf.involved_bureaus).map((b: string) => (
                        <Badge key={b} variant="rose" size="sm">
                          {b}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-500">None specified</span>
                    )}
                    <span className="text-[11px] text-rose-400 font-semibold ml-2">
                      ⚠️ {conf.active_cases_count ?? conf.total_active_complaints ?? 0} active cases
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={!conf.institution_id}
                  onClick={() => conf.institution_id && onSelectInstitution(conf.institution_id)}
                  rightIcon={<ExternalLink className="h-3.5 w-3.5" />}
                >
                  View 360° Dossier
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
