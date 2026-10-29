'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';
import { MOCK_ANALYTICS } from '../../shared/api/mock-data';
import { Card, CardContent } from '../../shared/ui/Card';
import { FileText, AlertTriangle, Building2, CheckCircle2 } from 'lucide-react';

export const DepartmentMetricsBoard: React.FC = () => {
  const { data: metrics } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => apiClient.get<any>('/api/v1/analytics/overview'),
    initialData: MOCK_ANALYTICS,
    staleTime: 1000 * 60 * 5,
  });

  const cards = [
    {
      title: 'Total Active Grievances',
      value: metrics?.total_complaints ?? 0,
      change: 'Council-wide intake',
      icon: FileText,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    {
      title: 'Conflict Radar Hotspots',
      value: metrics?.conflicting_institutions_count ?? 0,
      change: 'Concurrent multi-bureau inquiries',
      icon: AlertTriangle,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
    },
    {
      title: 'SLA Overdue Breaches',
      value: metrics?.sla_overdue_count ?? metrics?.overdue_complaints ?? 0,
      change: '> 30-day statutory limit breached',
      icon: AlertTriangle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
    },
    {
      title: 'Disposed & Resolved',
      value: metrics?.disposed_count ?? metrics?.disposed_complaints ?? metrics?.resolved_complaints ?? 0,
      change: 'Complied with official summary',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <Card key={i} className={`border ${card.borderColor} bg-slate-900/60`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {card.title}
                </p>
                <h3 className="text-2xl font-black text-white mt-1 font-heading">{card.value}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{card.change}</p>
              </div>
              <div className={`p-3 rounded-xl ${card.bgColor} ${card.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
