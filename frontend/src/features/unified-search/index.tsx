'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';
import { Modal } from '../../shared/ui/Modal';
import { Badge } from '../../shared/ui/Badge';
import { ComplaintStatusBadge } from '../../entities/complaint';
import { Search, Building2, FileText, ArrowRight, AlertTriangle, Sparkles, X } from 'lucide-react';

export interface UnifiedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectComplaint: (id: number) => void;
  onSelectInstitution: (id: number) => void;
}

export const UnifiedSearchModal: React.FC<UnifiedSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectComplaint,
  onSelectInstitution,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'complaints' | 'institutions'>('all');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm.trim());
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data, isLoading } = useQuery<any>({
    queryKey: ['unified-search', debouncedTerm],
    queryFn: () => apiClient.get<any>(`/api/v1/search/unified?q=${encodeURIComponent(debouncedTerm)}`),
    enabled: isOpen && debouncedTerm.length > 0,
    staleTime: 1000 * 15,
  });

  const complaints = data?.complaints || [];
  const institutions = data?.institutions || [];
  const totalMatches = data?.total_matches || 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Global Unified Search"
      description="Instant multi-entity search across grievances, institutions, AICTE IDs, and docket numbers."
      size="xl"
    >
      <div className="space-y-4">
        {/* Search Input Box */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            autoFocus
            aria-label="Search grievances, institutions, or reference numbers"
            placeholder="Type Institution Name, AICTE ID (e.g. 1-10293), or Complaint No (e.g. CMP-2026)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-3 text-sm rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        {debouncedTerm && data && (
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              All Matches ({totalMatches})
            </button>
            <button
              onClick={() => setFilterType('complaints')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterType === 'complaints'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <FileText className="h-3 w-3" />
              Grievances ({complaints.length})
            </button>
            <button
              onClick={() => setFilterType('institutions')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterType === 'institutions'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Building2 className="h-3 w-3" />
              Institutions ({institutions.length})
            </button>
          </div>
        )}

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
          {isLoading && (
            <div className="py-12 text-center text-xs text-slate-400">
              Searching national database records...
            </div>
          )}

          {!isLoading && debouncedTerm.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-500 space-y-1">
              <Sparkles className="h-6 w-6 text-blue-400/60 mx-auto mb-2" />
              <p className="font-semibold text-slate-400">Start typing to search council-wide</p>
              <p>Supports fuzzy titles, exact complaint reference numbers, and AICTE IDs.</p>
            </div>
          )}

          {!isLoading && debouncedTerm.length > 0 && totalMatches === 0 && (
            <div className="py-12 text-center text-xs text-slate-400 space-y-1">
              <p className="font-bold text-slate-300">No records found matching &ldquo;{debouncedTerm}&rdquo;</p>
              <p className="text-slate-500">Try searching by partial institution name or complaint identifier.</p>
            </div>
          )}

          {/* Complaints Section */}
          {!isLoading &&
            (filterType === 'all' || filterType === 'complaints') &&
            complaints.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-blue-400" />
                  Grievances & Regulatory Cases ({complaints.length})
                </h4>
                <div className="divide-y divide-slate-800/80 rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
                  {complaints.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onSelectComplaint(c.id);
                        onClose();
                      }}
                      className="w-full p-3.5 text-left hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                            {c.complaint_no}
                          </span>
                          <Badge variant="blue" size="sm">
                            {c.bureau}
                          </Badge>
                          <ComplaintStatusBadge status={c.status} size="sm" />
                          {c.is_overdue && (
                            <Badge variant="rose" size="sm">
                              🚨 OVERDUE SLA
                            </Badge>
                          )}
                        </div>
                        <h5 className="text-xs font-bold text-slate-200">{c.subject}</h5>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-slate-500" />
                          <span>{c.institution_name}</span>
                          <span>•</span>
                          <span>Category: {c.category?.replace(/_/g, ' ')}</span>
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* Institutions Section */}
          {!isLoading &&
            (filterType === 'all' || filterType === 'institutions') &&
            institutions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-emerald-400" />
                  Technical Institutions ({institutions.length})
                </h4>
                <div className="divide-y divide-slate-800/80 rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
                  {institutions.map((inst: any) => (
                    <button
                      key={inst.id}
                      onClick={() => {
                        onSelectInstitution(inst.id);
                        onClose();
                      }}
                      className="w-full p-3.5 text-left hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-white group-hover:text-emerald-400 transition-colors">
                            {inst.name}
                          </span>
                          <Badge variant="purple" size="sm">
                            AICTE ID: {inst.aicte_id}
                          </Badge>
                          {inst.is_conflicting && (
                            <Badge variant="rose" size="sm">
                              ⚠️ Active Conflicts
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {inst.city ? `${inst.city}, ` : ''}{inst.state} ({inst.region} Region)
                          <span className="ml-2 text-slate-500 font-mono">
                            • Active Cases: <strong className="text-slate-300">{inst.active_complaints_count || 0}</strong>
                          </span>
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>
    </Modal>
  );
};
