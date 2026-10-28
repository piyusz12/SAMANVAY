'use client';

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';
import { useAppStore } from '../../shared/lib/store';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { Bell, Wifi, WifiOff, PlusCircle, Search, Activity } from 'lucide-react';

export const ExecutiveOverviewHeader: React.FC<{
  onOpenLodge: () => void;
  onOpenNotifications: () => void;
  onOpenPersona: () => void;
  onOpenSearch: () => void;
  onOpenHealth: () => void;
}> = ({
  onOpenLodge,
  onOpenNotifications,
  onOpenPersona,
  onOpenSearch,
  onOpenHealth,
}) => {
  const { isOnline, offlineQueue, searchQuery, currentUser, token } = useAppStore();

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ['notifications'],
    queryFn: () => apiClient.get<any[]>('/api/v1/notifications'),
    enabled: !!token,
    staleTime: 30000,
  });

  const hasUnread = Array.isArray(notifications) && notifications.some((n) => !n.is_read);

  // Keyboard shortcut Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearch]);

  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
      {/* 1. Official Government Top Header Bar */}
      <div className="bg-slate-950 px-6 py-1.5 border-b border-slate-800/50 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span>🏛️</span>
          <span>Government of India • Ministry of Education • All India Council for Technical Education</span>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={onOpenHealth}
            className="flex items-center gap-1.5 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
            title="Inspect live system diagnostics and database latency"
          >
            <Activity className="h-3 w-3 text-emerald-400" />
            <span>Diagnostics</span>
          </button>
          <span className="text-slate-600">|</span>
          <span className="text-blue-400 font-mono font-medium">Citizen&apos;s Charter 30-Day SLA Active</span>
        </div>
      </div>

      {/* 2. Executive Action Bar */}
      <div className="h-16 px-6 flex items-center justify-between gap-4">
        {/* Global Search Bar (Trigger for Unified Search Palette) */}
        <div className="relative max-w-md w-full">
          <button
            onClick={onOpenSearch}
            className="w-full pl-10 pr-12 py-2 text-xs rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-left flex items-center transition-all cursor-pointer shadow-inner"
            aria-label="Open Unified Search Modal"
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <span className="truncate">
              {searchQuery || 'Search by Institution, AICTE ID, or Complaint No...'}
            </span>
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 border border-slate-700 rounded text-slate-400 shadow-sm">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Status Indicators & Actions */}
        <div className="flex items-center gap-3">
          {/* Offline-First Sync Badge */}
          {isOnline ? (
            <Badge variant="emerald" size="sm" className="hidden sm:inline-flex items-center gap-1">
              <Wifi className="h-3 w-3 text-emerald-400" />
              Online / Synced
            </Badge>
          ) : (
            <Badge variant="rose" size="sm" className="inline-flex items-center gap-1 animate-pulse">
              <WifiOff className="h-3 w-3 text-rose-400" />
              Offline — {offlineQueue.length} pending
            </Badge>
          )}

          {/* Quick Persona Badge */}
          <button
            onClick={onOpenPersona}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
            aria-label="Switch User Persona"
          >
            <span className="text-sm">{currentUser.avatar}</span>
            <div className="hidden md:block">
              <p className="text-xs font-bold text-white leading-tight">{currentUser.name}</p>
              <p className="text-[10px] text-blue-400 font-mono leading-tight">{currentUser.bureau}</p>
            </div>
          </button>

          {/* Notifications Toggle */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label={hasUnread ? 'Open notifications (unread alerts present)' : 'Open notifications'}
          >
            <Bell className="h-4 w-4" />
            {hasUnread && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            )}
          </button>

          {/* Lodge Complaint CTA */}
          <Button
            size="sm"
            variant="primary"
            onClick={onOpenLodge}
            leftIcon={<PlusCircle className="h-4 w-4" />}
          >
            Lodge Complaint
          </Button>
        </div>
      </div>
    </header>
  );
};
