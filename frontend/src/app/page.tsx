'use client';

import React, { useState } from 'react';
import { useAppStore } from '../shared/lib/store';
import { GlobalNavigationSidebar } from '../widgets/navigation-sidebar';
import { ExecutiveOverviewHeader } from '../widgets/overview-header';
import { NotificationCenterDrawer } from '../widgets/notification-center';
import { PortalFooter } from '../widgets/portal-footer';
import { AicteSahayakWidget } from '../widgets/ai-sahayak';

// FSD Views
import { DashboardPage } from '../views/dashboard';
import { ComplaintsPage } from '../views/complaints';
import { InstitutionsPage } from '../views/institutions';
import { ConflictsPage } from '../views/conflicts';
import { CoordinationPage } from '../views/coordination';
import { AnalyticsPage } from '../views/analytics';
import { AuditPage } from '../views/audit';
import { TrackComplaintPage } from '../views/track-complaint';
import { CitizensCharterPage } from '../views/citizens-charter';
import { CircularsPage } from '../views/circulars';

// Features / Modals
import { LodgeComplaintModal } from '../features/lodge-complaint';
import { PersonaSwitcherModal } from '../features/auth';
import { OverlapReviewModal } from '../features/overlap-review';
import { StatusTransitionModal } from '../features/status-transition';
import { TransferFileModal } from '../features/transfer-file';
import { ComplaintDetailModal } from '../features/complaint-detail';
import { HealthStatusModal } from '../features/health-status';
import { UnifiedSearchModal } from '../features/unified-search';

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
        {/* 1. Global Navigation Sidebar */}
        <GlobalNavigationSidebar onOpenPersona={() => setIsPersonaOpen(true)} />

        {/* 2. Main Content Canvas */}
        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
            sidebarCollapsed ? 'ml-18' : 'ml-64'
          }`}
        >
          {/* Header Bar */}
          <ExecutiveOverviewHeader
            onOpenLodge={() => handleOpenLodge(null)}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            onOpenPersona={() => setIsPersonaOpen(true)}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenHealth={() => setIsHealthOpen(true)}
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

      {/* Floating 24x7 Helpdesk AI Assistant */}
      <AicteSahayakWidget
        onOpenLodge={() => handleOpenLodge(null)}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Global Modals & Drawers */}
      <LodgeComplaintModal
        isOpen={isLodgeOpen}
        onClose={() => {
          setIsLodgeOpen(false);
          setPreselectedInstitutionId(null);
        }}
        initialInstitutionId={preselectedInstitutionId}
      />

      <PersonaSwitcherModal
        isOpen={isPersonaOpen}
        onClose={() => setIsPersonaOpen(false)}
      />

      <NotificationCenterDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      <HealthStatusModal
        isOpen={isHealthOpen}
        onClose={() => setIsHealthOpen(false)}
      />

      <UnifiedSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectComplaint={handleSelectComplaint}
        onSelectInstitution={handleSelectInstitution}
        onLodgeComplaintForInstitution={(id) => handleOpenLodge(id)}
      />

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
