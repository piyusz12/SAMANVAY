'use client';

import React, { useState } from 'react';
import { useAuditLogs, useVerifyAuditIntegrity } from '../../entities/audit';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { Alert } from '../../shared/ui/Alert';
import { formatDateTime } from '../../shared/lib/date-utils';
import { ShieldCheck, ShieldAlert, CheckCircle2, Lock, KeyRound } from 'lucide-react';

export const AuditPage: React.FC = () => {
  const { data: logs = [], isLoading } = useAuditLogs();
  const { data: integrity, refetch, isFetching } = useVerifyAuditIntegrity();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <h2 className="text-xl font-extrabold text-white font-heading">
            Regulatory Audit Ledger & Cryptographic Chain
          </h2>
          <p className="text-xs text-slate-400">
            Immutable, append-only event ledger secured via SHA-256 hash chaining to ensure court-admissible forensic tamper evidence.
          </p>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={() => refetch()}
          isLoading={isFetching}
          leftIcon={<ShieldCheck className="h-4 w-4" />}
        >
          Verify Chain Integrity
        </Button>
      </div>

      {/* Verification Status Card */}
      {integrity && (
        <Card className={`border ${integrity.is_intact ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-rose-500/30 bg-rose-950/20'} p-4`}>
          <div className="flex items-start gap-3">
            {integrity.is_intact ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">
                  {integrity.is_intact
                    ? 'Cryptographic Audit Chain Intact: 100% Valid'
                    : 'Tamper Detected in Audit Chain'}
                </h4>
                <Badge variant={integrity.is_intact ? 'emerald' : 'rose'} size="sm">
                  {integrity.total_records_verified} Blocks Verified
                </Badge>
              </div>
              <p className="text-xs text-slate-300">
                {integrity.message || 'All sequential SHA-256 block hashes match their preceding block hash records.'}
              </p>
              {integrity.head_hash && (
                <p className="text-[11px] font-mono text-slate-400 truncate">
                  Head Hash: <span className="text-emerald-400">{integrity.head_hash}</span>
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Audit Log Stream */}
      <Card className="bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-blue-400" />
            Immutable Event Blocks
          </CardTitle>
          <CardDescription>
            Chronological cryptographic chain of state changes, file transfers, and coordination actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500">Loading audit ledger...</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">No audit events recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-800/60 font-mono">
              {logs.map((log) => (
                <div key={log.id} className="p-4 space-y-2 hover:bg-slate-800/20 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white font-sans">{log.action_type}</span>
                      <Badge variant="blue" size="sm">
                        {log.actor_bureau || 'AICTE'}
                      </Badge>
                      <span className="text-[11px] text-slate-400 font-sans">
                        By: <strong className="text-slate-200">{log.actor_email || 'admin@samanvay.aicte.gov.in'}</strong> ({log.actor_role || 'SUPER_ADMIN'})
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {formatDateTime(log.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    {log.narrative}
                  </p>

                  <div className="pt-1.5 border-t border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-slate-500">
                    <span className="truncate">
                      Prev Hash: <span className="text-slate-400">{log.previous_hash ? log.previous_hash.substring(0, 24) + '...' : 'GENESIS_BLOCK_00000000'}</span>
                    </span>
                    <span className="truncate">
                      Block Hash: <span className="text-emerald-400 font-bold">{log.record_hash ? log.record_hash.substring(0, 24) + '...' : 'SHA256_ACTIVE'}</span>
                    </span>
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
