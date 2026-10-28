'use client';

import React from 'react';
import { useAppStore } from '../../shared/lib/store';
import {
  LayoutDashboard,
  FileText,
  Building2,
  Radar,
  Users2,
  BarChart3,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Search,
  Scale,
  BookOpen,
} from 'lucide-react';

export const GlobalNavigationSidebar: React.FC<{ onOpenPersona: () => void }> = ({
  onOpenPersona,
}) => {
  const { activeTab, setActiveTab, sidebarCollapsed, toggleSidebar, currentUser } = useAppStore();

  const citizenNavItems = [
    { id: 'track', label: 'Track Grievance', icon: Search },
    { id: 'charter', label: 'Citizen’s Charter', icon: Scale },
    { id: 'circulars', label: 'Circulars & Rules', icon: BookOpen },
  ];

  const officerNavItems = [
    { id: 'dashboard', label: 'Executive Overview', icon: LayoutDashboard },
    { id: 'complaints', label: 'Complaint Intake', icon: FileText },
    { id: 'institutions', label: 'Institution Dossiers', icon: Building2 },
    { id: 'conflicts', label: 'Conflict Radar', icon: Radar },
    { id: 'coordination', label: 'Joint Workspaces', icon: Users2 },
    { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
    { id: 'audit', label: 'Regulatory Audit', icon: ShieldAlert },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 bg-slate-950/95 backdrop-blur-2xl border-r border-slate-800/80 transition-all duration-300 flex flex-col justify-between ${
        sidebarCollapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex-1 overflow-y-auto scrollbar-none">
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 sticky top-0 bg-slate-950/95 z-10">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-lg shadow-sm">
                ⚖️
              </div>
              <div>
                <h1 className="text-base font-extrabold text-white tracking-wider font-heading">
                  SAMANVAY
                </h1>
                <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest block -mt-0.5">
                  AICTE National Portal
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto text-xl">⚖️</div>
          )}

          <button
            onClick={toggleSidebar}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Section 1: Public Citizen Services */}
        <div className="p-3">
          {!sidebarCollapsed && (
            <div className="px-3 pb-1.5 text-[10px] font-bold text-amber-400/90 uppercase tracking-wider flex items-center gap-1.5">
              <span>🎓</span>
              <span>Citizen & Student Services</span>
            </div>
          )}
          <nav className="space-y-1" aria-label="Citizen Services">
            {citizenNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
                  } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Section 2: Officer & Regulatory Intranet */}
        <div className="p-3 pt-0">
          {!sidebarCollapsed && (
            <div className="px-3 pb-1.5 text-[10px] font-bold text-blue-400/90 uppercase tracking-wider flex items-center gap-1.5 border-t border-slate-800/80 pt-3">
              <span>🏛️</span>
              <span>Regulatory Intranet</span>
            </div>
          )}
          <nav className="space-y-1" aria-label="Regulatory Intranet">
            {officerNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 border border-blue-400/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
                  } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Active Persona Profile Card */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950">
        <button
          onClick={onOpenPersona}
          className={`w-full p-2.5 rounded-xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-800/60 transition-colors text-left flex items-center gap-2.5 cursor-pointer ${
            sidebarCollapsed ? 'justify-center p-2' : ''
          }`}
          aria-label="Switch User Persona"
          title="Switch Persona"
        >
          <span className="text-xl shrink-0">{currentUser.avatar}</span>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <h5 className="text-xs font-bold text-white truncate flex items-center gap-1">
                {currentUser.name}
              </h5>
              <p className="text-[10px] text-blue-400 font-mono truncate">{currentUser.bureau}</p>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
