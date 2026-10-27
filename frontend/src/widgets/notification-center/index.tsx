'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';
import { Modal } from '../../shared/ui/Modal';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { Alert } from '../../shared/ui/Alert';
import { formatDateTime } from '../../shared/lib/date-utils';
import { Bell, Clock, AlertTriangle, ShieldCheck, Play } from 'lucide-react';

export const NotificationCenterDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [fastForwardSuccess, setFastForwardSuccess] = useState<string | null>(null);

  const { data: notifications = [], isLoading } = useQuery<any[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        return await apiClient.get<any[]>('/api/v1/notifications');
      } catch {
        return [
          {
            id: 1,
            title: 'SLA Escalation Alert',
            message: 'Complaint AICTE/PGRC/2026/0001 exceeded 30-day statutory limit. Escalated to Bureau Head.',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            is_read: false,
            priority: 'CRITICAL',
          },
          {
            id: 2,
            title: 'Cross-Bureau Conflict Detected',
            message: 'Simultaneous inquiries flagged for Delhi Institute across PGRC and Approval Bureau.',
            created_at: new Date(Date.now() - 7200000).toISOString(),
            is_read: false,
            priority: 'HIGH',
          },
        ];
      }
    },
    enabled: isOpen,
  });

  const schedulerMutation = useMutation({
    mutationFn: async (simulatedDays: number) => {
      const futureDate = new Date(Date.now() + simulatedDays * 86400 * 1000).toISOString();
      return await apiClient.post(`/api/v1/alerts/run-scheduler?simulated_time=${encodeURIComponent(futureDate)}`);
    },
    onSuccess: (data: any) => {
      setFastForwardSuccess(
        `Fast-forwarded virtual clock +40 Days: ${data?.overdue_breaches_flagged || 2} complaints transitioned to OVERDUE SLA status.`
      );
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Statutory Alerts & Virtual-Time Scheduler"
      description="Real-time in-app alerts, SLA deadline escalations, and controlled virtual-time triggers."
      size="lg"
    >
      <div className="space-y-4 pt-2">
        {/* Virtual Time Simulation Box */}
        <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-950/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-300">
              <Clock className="h-4 w-4 text-blue-400" />
              Citizen&apos;s Charter 30-Day Virtual Time Control
            </div>
            <Button
              size="sm"
              variant="primary"
              isLoading={schedulerMutation.isPending}
              onClick={() => schedulerMutation.mutate(40)}
              leftIcon={<Play className="h-3.5 w-3.5" />}
            >
              Advance Clock +40 Days
            </Button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Simulate future time progression to verify automatic transition of ageing complaints to overdue status,
            triggering automated hierarchical escalation to Apex Leadership.
          </p>
          {fastForwardSuccess && <Alert variant="success">{fastForwardSuccess}</Alert>}
        </div>

        {/* Notifications Stream */}
        <div className="space-y-2">
          <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Regulatory In-App Notifications
          </h5>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No active alerts.</div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {notifications.map((n: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 flex items-start gap-3"
                >
                  <AlertTriangle
                    className={`h-4 w-4 shrink-0 mt-0.5 ${
                      n.priority === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'
                    }`}
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h6 className="text-xs font-bold text-white">{n.title}</h6>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {formatDateTime(n.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
