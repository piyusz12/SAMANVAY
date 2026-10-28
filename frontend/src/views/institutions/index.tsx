'use client';

import React, { useState } from 'react';
import { useInstitutions, useInstitutionDossier } from '../../entities/institution';
import { ComplaintStatusBadge, SlaBadge } from '../../entities/complaint';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { formatDate } from '../../shared/lib/date-utils';
import { Building2, Search, AlertTriangle, FileText, MapPin, CheckCircle2 } from 'lucide-react';

export const InstitutionsPage: React.FC<{
  selectedId: number | null;
  onSelectId: (id: number | null) => void;
  onOpenLodge?: (institutionId?: number) => void;
}> = ({ selectedId, onSelectId, onOpenLodge }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: institutions = [], isLoading } = useInstitutions(searchTerm);

  // Default to first institution or selected ID
  const activeInstId = selectedId || (institutions.length > 0 ? institutions[0].id : null);
  const { data: dossier, isLoading: isDossierLoading } = useInstitutionDossier(activeInstId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold text-white font-heading">
          Technical Institutions Registry & 360° Dossier
        </h2>
        <p className="text-xs text-slate-400">
          Council-wide unified profile consolidating regulatory approval records, active bureau tags, and complete cross-departmental complaint history.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Institution List with Search */}
        <Card className="bg-slate-900/60 lg:col-span-1 h-[360px] lg:h-[650px] flex flex-col">
          <div className="p-3 border-b border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search name, AICTE ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading institutions...</div>
            ) : institutions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No institutions found.</div>
            ) : (
              institutions.map((inst) => {
                const isSelected = activeInstId === inst.id;
                return (
                  <button
                    key={inst.id}
                    onClick={() => onSelectId(inst.id)}
                    className={`w-full p-3.5 text-left transition-colors cursor-pointer flex flex-col gap-1 ${
                      isSelected ? 'bg-blue-950/40 border-l-2 border-blue-500' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate max-w-[190px]">
                        {inst.name}
                      </span>
                      <Badge variant="blue" size="sm">
                        {inst.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                      <span>ID: {inst.aicte_permanent_id}</span>
                      <span>•</span>
                      <span>{inst.city || 'City not recorded'}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Right: 360° Dossier View */}
        <Card className="bg-slate-900/60 lg:col-span-2 min-h-[460px] lg:h-[650px] flex flex-col">
          {isDossierLoading ? (
            <div className="p-12 text-center text-xs text-slate-500">Loading 360° institutional dossier...</div>
          ) : !dossier ? (
            <div className="p-12 text-center text-xs text-slate-500">
              Select an institution from the registry to view its 360-degree dossier.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Institution Header Profile */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="h-5 w-5 text-blue-400" />
                    <h3 className="text-lg font-bold text-white font-heading">
                      {dossier.institution.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                    <span>AICTE Permanent ID: <strong className="text-white">{dossier.institution.aicte_permanent_id}</strong></span>
                    <span>•</span>
                    <span>AISHE: <strong className="text-white">{dossier.institution.aishe_code || 'Not recorded'}</strong></span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1 pt-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    {dossier.institution.address || 'Address not recorded'}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge variant={dossier.has_conflicts ? 'rose' : 'emerald'} size="md">
                    {dossier.has_conflicts ? '⚠️ Cross-Bureau Collision Active' : '🟢 Clean Inter-Bureau Standing'}
                  </Badge>
                  <span className="text-[11px] text-slate-500 font-mono">Status: {dossier.institution.status}</span>
                  {onOpenLodge && (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => onOpenLodge(dossier.institution.id)}
                      leftIcon={<FileText className="h-3.5 w-3.5" />}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm text-xs mt-1"
                    >
                      Register Case Against Institution
                    </Button>
                  )}
                </div>
              </div>

              {/* Cross-Bureau Presence Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Lifetime Complaints</p>
                  <h4 className="text-xl font-bold text-white mt-1">{dossier.total_complaints || 0}</h4>
                </div>
                <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-950/20">
                  <p className="text-[11px] font-semibold text-rose-300 uppercase">Active Inquiries</p>
                  <h4 className="text-xl font-bold text-rose-400 mt-1">{dossier.active_inquiries || 0}</h4>
                </div>
                <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-950/20">
                  <p className="text-[11px] font-semibold text-emerald-300 uppercase">Disposed Cases</p>
                  <h4 className="text-xl font-bold text-emerald-400 mt-1">{dossier.disposed_cases || 0}</h4>
                </div>
              </div>

              {/* Active Bureau Tags */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Departments Maintaining Active Jurisdictional Inquiries:
                </h5>
                <div className="flex gap-2 flex-wrap">
                  {dossier.involved_bureaus && dossier.involved_bureaus.length > 0 ? (
                    dossier.involved_bureaus.map((b) => (
                      <Badge key={b} variant="rose" size="md">
                        🏛️ {b}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">No active jurisdictional inquiries.</span>
                  )}
                </div>
              </div>

              {/* Complaints History Section */}
              <div className="space-y-3 pt-2">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Consolidated Complaint Records ({dossier.complaints?.length || 0}):
                </h5>
                <div className="space-y-2.5">
                  {(dossier.complaints || []).map((comp: any) => (
                    <div
                      key={comp.id}
                      className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white font-mono">{comp.complaint_no}</span>
                          <Badge variant="blue" size="sm">{comp.bureau || comp.bureau_id}</Badge>
                          <ComplaintStatusBadge status={comp.status} size="sm" />
                          <SlaBadge createdAt={comp.created_at} dueDate={comp.sla_due_date} status={comp.status} size="sm" />
                        </div>
                        <p className="text-xs text-slate-200 font-medium">{comp.subject}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          Category: {comp.category} • Date: {formatDate(comp.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
