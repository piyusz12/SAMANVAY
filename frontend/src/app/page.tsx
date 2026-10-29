'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore } from '../shared/lib/store';
import { GlobalNavigationSidebar } from '../widgets/navigation-sidebar';
import { ExecutiveOverviewHeader } from '../widgets/overview-header';
import { PortalFooter } from '../widgets/portal-footer';

// 1. Primary Landing View (Loaded eagerly for instant FCP)
import { DashboardPage } from '../views/dashboard';

// Skeleton fallback for lazy views
const ViewSkeleton = () => (
  <div className="space-y-4 animate-pulse py-2">
    <div className="h-8 bg-slate-800/40 rounded-lg w-1/4" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="h-24 bg-slate-800/40 rounded-xl" />
      <div className="h-24 bg-slate-800/40 rounded-xl" />
      <div className="h-24 bg-slate-800/40 rounded-xl" />
      <div className="h-24 bg-slate-800/40 rounded-xl" />
    </div>
    <div className="h-72 bg-slate-800/40 rounded-xl" />
  </div>
);

// 2. Secondary Tab Views (Lazy loaded on demand with code-splitting)
const TrackComplaintPage = dynamic(
  () => import('../views/track-complaint').then((m) => m.TrackComplaintPage),
  { ssr: false, loading: ViewSkeleton }
);
const CitizensCharterPage = dynamic(
  () => import('../views/citizens-charter').then((m) => m.CitizensCharterPage),
  { ssr: false, loading: ViewSkeleton }
);
const CircularsPage = dynamic(
  () => import('../views/circulars').then((m) => m.CircularsPage),
  { ssr: false, loading: ViewSkeleton }
);
const ComplaintsPage = dynamic(
  () => import('../views/complaints').then((m) => m.ComplaintsPage),
  { ssr: false, loading: ViewSkeleton }
);
const InstitutionsPage = dynamic(
  () => import('../views/institutions').then((m) => m.InstitutionsPage),
  { ssr: false, loading: ViewSkeleton }
);
const ConflictsPage = dynamic(
  () => import('../views/conflicts').then((m) => m.ConflictsPage),
  { ssr: false, loading: ViewSkeleton }
);
const CoordinationPage = dynamic(
  () => import('../views/coordination').then((m) => m.CoordinationPage),
  { ssr: false, loading: ViewSkeleton }
);
const AnalyticsPage = dynamic(
  () => import('../views/analytics').then((m) => m.AnalyticsPage),
  { ssr: false, loading: ViewSkeleton }
);
const AuditPage = dynamic(
  () => import('../views/audit').then((m) => m.AuditPage),
  { ssr: false, loading: ViewSkeleton }
);

// 3. Modals, Drawers & Floating Widgets (Lazy loaded only when user triggers them)
const LodgeComplaintModal = dynamic(
  () => import('../features/lodge-complaint').then((m) => m.LodgeComplaintModal),
  { ssr: false }
);
const PersonaSwitcherModal = dynamic(
  () => import('../features/auth').then((m) => m.PersonaSwitcherModal),
  { ssr: false }
);
const OverlapReviewModal = dynamic(
  () => import('../features/overlap-review').then((m) => m.OverlapReviewModal),
  { ssr: false }
);
const StatusTransitionModal = dynamic(
  () => import('../features/status-transition').then((m) => m.StatusTransitionModal),
  { ssr: false }
);
const TransferFileModal = dynamic(
  () => import('../features/transfer-file').then((m) => m.TransferFileModal),
  { ssr: false }
);
const ComplaintDetailModal = dynamic(
  () => import('../features/complaint-detail').then((m) => m.ComplaintDetailModal),
  { ssr: false }
);
const HealthStatusModal = dynamic(
  () => import('../features/health-status').then((m) => m.HealthStatusModal),
  { ssr: false }
);
const UnifiedSearchModal = dynamic(
  () => import('../features/unified-search').then((m) => m.UnifiedSearchModal),
  { ssr: false }
);
const NotificationCenterDrawer = dynamic(
  () => import('../widgets/notification-center').then((m) => m.NotificationCenterDrawer),
  { ssr: false }
);
const AicteSahayakWidget = dynamic(
  () => import('../widgets/ai-sahayak').then((m) => m.AicteSahayakWidget),
  { ssr: false }
);

import {
  LayoutDashboard,
  Compass,
  PlusCircle,
  Search,
  Menu,
} from 'lucide-react';

export default function Home() {
  const {
    activeTab,
    sidebarCollapsed,
    selectedInstitutionId,
    setSelectedInstitutionId,
    fontSize,
    highContrast,
  } = useAppStore();

  // Modals state
  const [isLodgeOpen, setIsLodgeOpen] = useState(false);
  const [preselectedInstitutionId, setPreselectedInstitutionId] = useState<number | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isPersonaOpen, setIsPersonaOpen] = useState(false);
  const [isHealthOpen, setIsHealthOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Active case / inspection states
  const [detailComplaintId, setDetailComplaintId] = useState<number | null>(null);
  const [overlapReviewData, setOverlapReviewData] = useState<{ id: number; no: string } | null>(null);
  const [statusTransitionComplaint, setStatusTransitionComplaint] = useState<any | null>(null);
  const [transferComplaint, setTransferComplaint] = useState<any | null>(null);

  const handleOpenLodge = (institutionId?: number | null) => {
    setPreselectedInstitutionId(institutionId ?? null);
    setIsLodgeOpen(true);
  };

  const handleSelectInstitution = (id: number) => {
    setSelectedInstitutionId(id);
    useAppStore.getState().setActiveTab('institutions');
  };

  const handleSelectComplaint = (id: number) => {
    setDetailComplaintId(id);
  };

  return (
    <div
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col ${
        highContrast ? 'contrast-125 saturate-125' : ''
      } ${fontSize === 'large' ? 'text-[15px]' : fontSize === 'larger' ? 'text-[16px]' : 'text-sm'}`}
    >
      <div className="flex-1 flex">
        {/* 1. Global Navigation Sidebar (Responsive Desktop & Mobile Drawer) */}
        <GlobalNavigationSidebar
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onOpenPersona={() => setIsPersonaOpen(true)}
        />

        {/* 2. Main Content Canvas */}
        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ml-0 ${
            sidebarCollapsed ? 'md:ml-18' : 'md:ml-64'
          } pb-16 md:pb-0`}
        >
          {/* Header Bar */}
          <ExecutiveOverviewHeader
            onOpenLodge={() => handleOpenLodge(null)}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            onOpenPersona={() => setIsPersonaOpen(true)}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenHealth={() => setIsHealthOpen(true)}
            onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
          />

          {/* Dynamic Page Views */}
          <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
            {activeTab === 'dashboard' && (
              <DashboardPage
                onOpenLodge={() => handleOpenLodge(null)}
                onOpenOverlapReview={(id, no) => setOverlapReviewData({ id, no })}
                onSelectInstitution={handleSelectInstitution}
                onSelectComplaint={handleSelectComplaint}
              />
            )}

            {activeTab === 'track' && (
              <TrackComplaintPage
                onOpenLodge={() => handleOpenLodge(null)}
                onSelectInstitution={handleSelectInstitution}
              />
            )}

            {activeTab === 'charter' && (
              <CitizensCharterPage onOpenLodge={() => handleOpenLodge(null)} />
            )}

            {activeTab === 'circulars' && <CircularsPage />}

            {activeTab === 'complaints' && (
              <ComplaintsPage
                onOpenLodge={() => handleOpenLodge(null)}
                onOpenOverlapReview={(id, no) => setOverlapReviewData({ id, no })}
                onOpenTransition={(comp) => setStatusTransitionComplaint(comp)}
                onOpenTransfer={(comp) => setTransferComplaint(comp)}
                onSelectComplaint={handleSelectComplaint}
              />
            )}

            {activeTab === 'institutions' && (
              <InstitutionsPage
                selectedId={selectedInstitutionId}
                onSelectId={(id) => setSelectedInstitutionId(id)}
                onOpenLodge={(id) => handleOpenLodge(id)}
              />
            )}

            {activeTab === 'conflicts' && (
              <ConflictsPage
                onOpenOverlapReview={(id, no) => setOverlapReviewData({ id, no })}
                onSelectInstitution={handleSelectInstitution}
              />
            )}

            {activeTab === 'coordination' && <CoordinationPage />}

            {activeTab === 'analytics' && <AnalyticsPage />}

            {activeTab === 'audit' && <AuditPage />}
          </main>

          {/* 3. Comprehensive Portal Footer */}
          <PortalFooter />
        </div>
      </div>

      {/* 4. Native-Style Mobile Bottom Navigation Bar (Smartphones < md) */}
      <nav
        aria-label="Mobile Navigation Bar"
        className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/90 py-1.5 px-3 md:hidden flex items-center justify-around shadow-2xl"
      >
        <button
          type="button"
          onClick={() => useAppStore.getState().setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg text-[10px] transition-colors cursor-pointer ${
            activeTab === 'dashboard' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg text-[10px] transition-colors cursor-pointer ${
            isSearchOpen ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="h-4 w-4" />
          <span>Colleges</span>
        </button>

        <button
          type="button"
          onClick={() => handleOpenLodge(null)}
          className="flex flex-col items-center justify-center -mt-4 bg-gradient-to-tr from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white rounded-full h-11 w-11 shadow-lg shadow-blue-500/40 border-2 border-slate-900 transition-transform active:scale-95 cursor-pointer"
          aria-label="Lodge New Grievance"
        >
          <PlusCircle className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => useAppStore.getState().setActiveTab('track')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg text-[10px] transition-colors cursor-pointer ${
            activeTab === 'track' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="h-4 w-4" />
          <span>Track</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg text-[10px] transition-colors cursor-pointer ${
            isMobileMenuOpen ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Menu className="h-4 w-4" />
          <span>Menu</span>
        </button>
      </nav>

      {/* Floating 24x7 Helpdesk AI Assistant */}
      <AicteSahayakWidget
        onOpenLodge={() => handleOpenLodge(null)}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Global Modals & Drawers — Mount on-demand to save memory and DOM nodes */}
      {isLodgeOpen && (
        <LodgeComplaintModal
          isOpen={true}
          onClose={() => {
            setIsLodgeOpen(false);
            setPreselectedInstitutionId(null);
          }}
          initialInstitutionId={preselectedInstitutionId}
        />
      )}

      {isPersonaOpen && (
        <PersonaSwitcherModal
          isOpen={true}
          onClose={() => setIsPersonaOpen(false)}
        />
      )}

      {isNotificationsOpen && (
        <NotificationCenterDrawer
          isOpen={true}
          onClose={() => setIsNotificationsOpen(false)}
        />
      )}

      {isHealthOpen && (
        <HealthStatusModal
          isOpen={true}
          onClose={() => setIsHealthOpen(false)}
        />
      )}

      {isSearchOpen && (
        <UnifiedSearchModal
          isOpen={true}
          onClose={() => setIsSearchOpen(false)}
          onSelectComplaint={handleSelectComplaint}
          onSelectInstitution={handleSelectInstitution}
          onLodgeComplaintForInstitution={(id) => handleOpenLodge(id)}
        />
      )}

      {detailComplaintId !== null && (
        <ComplaintDetailModal
          isOpen={true}
          onClose={() => setDetailComplaintId(null)}
          complaintId={detailComplaintId}
          onOpenTransition={(comp) => {
            setDetailComplaintId(null);
            setStatusTransitionComplaint(comp);
          }}
          onOpenTransfer={(comp) => {
            setDetailComplaintId(null);
            setTransferComplaint(comp);
          }}
          onOpenOverlapReview={(id, no) => {
            setDetailComplaintId(null);
            setOverlapReviewData({ id, no });
          }}
        />
      )}

      {overlapReviewData && (
        <OverlapReviewModal
          isOpen={true}
          onClose={() => setOverlapReviewData(null)}
          complaintId={overlapReviewData.id}
          complaintNo={overlapReviewData.no}
        />
      )}

      {statusTransitionComplaint && (
        <StatusTransitionModal
          isOpen={true}
          onClose={() => setStatusTransitionComplaint(null)}
          complaint={statusTransitionComplaint}
        />
      )}

      {transferComplaint && (
        <TransferFileModal
          isOpen={true}
          onClose={() => setTransferComplaint(null)}
          complaint={transferComplaint}
        />
      )}
    </div>
  );
}
