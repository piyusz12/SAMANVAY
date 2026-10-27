'use client';

import React from 'react';
import { useAppStore } from '../../shared/lib/store';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { Bell, Wifi, WifiOff, PlusCircle, Search, UserCheck } from 'lucide-react';

export const ExecutiveOverviewHeader: React.FC<{
  onOpenLodge: () => void;
  onOpenNotifications: () => void;
  onOpenPersona: () => void;
}> = ({ onOpenLodge, onOpenNotifications, onOpenPersona }) => {
  const { isOnline, offlineQueue, searchQuery, setSearchQuery, currentUser } = useAppStore();

  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
      {/* 1. Official Government Top Header Bar */}
      <div className="bg-slate-950 px-6 py-1.5 border-b border-slate-800/50 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span>🏛️</span>
          <span>Government of India • Ministry of Education • All India Council for Technical Education</span>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span className="text-slate-500">Official Portal</span>
          <span className="text-slate-600">|</span>
          <span className="text-blue-400 font-mono font-medium">Citizen&apos;s Charter 30-Day SLA Active</span>
        </div>
      </div>

      {/* 2. Executive Action Bar */}
      <div className="h-16 px-6 flex items-center justify-between gap-4">
        {/* Global Search Bar */}
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Institution, AICTE ID, or Complaint No..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
          />
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
            aria-label="Open notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
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
