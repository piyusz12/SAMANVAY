import { create } from 'zustand';
import { DEMO_PERSONAS } from '../config/constants';

export interface OfflineAction {
  id: string;
  type: string;
  endpoint: string;
  method: string;
  payload: any;
  timestamp: string;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
}

export interface UserPersona {
  role: string;
  name: string;
  bureau: string;
  email: string;
  designation: string;
  avatar: string;
}

interface AppState {
  // Navigation & View
  activeTab: 'dashboard' | 'complaints' | 'institutions' | 'conflicts' | 'coordination' | 'analytics' | 'audit';
  sidebarCollapsed: boolean;
  activeBureauFilter: string;
  searchQuery: string;

  // Selected Entities
  selectedComplaintId: number | null;
  selectedInstitutionId: number | null;
  activeModal: string | null;

  // Authentication Persona
  currentUser: UserPersona;
  token: string | null;

  // Offline-First Action Queue
  isOnline: boolean;
  offlineQueue: OfflineAction[];

  // Actions
  setActiveTab: (tab: AppState['activeTab']) => void;
  toggleSidebar: () => void;
  setBureauFilter: (bureau: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedComplaintId: (id: number | null) => void;
  setSelectedInstitutionId: (id: number | null) => void;
  openModal: (modalName: string) => void;
  closeModal: () => void;
  setCurrentUser: (persona: UserPersona) => void;
  setToken: (token: string | null) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  queueOfflineAction: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'status'>) => void;
  removeOfflineAction: (id: string) => void;
  clearOfflineQueue: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'dashboard',
  sidebarCollapsed: false,
  activeBureauFilter: 'ALL',
  searchQuery: '',

  selectedComplaintId: null,
  selectedInstitutionId: null,
  activeModal: null,

  currentUser: DEMO_PERSONAS[1], // Default: Amit Patel, PGRC Officer
  token: null,

  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  offlineQueue: [],

  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setBureauFilter: (bureau) => set({ activeBureauFilter: bureau }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedComplaintId: (id) => set({ selectedComplaintId: id }),
  setSelectedInstitutionId: (id) => set({ selectedInstitutionId: id }),
  openModal: (modalName) => set({ activeModal: modalName }),
  closeModal: () => set({ activeModal: null }),
  setCurrentUser: (persona) => set({ currentUser: persona }),
  setToken: (token) => set({ token }),
  setOnlineStatus: (isOnline) => set({ isOnline }),
  queueOfflineAction: (action) =>
    set((state) => ({
      offlineQueue: [
        ...state.offlineQueue,
        {
          ...action,
          id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toISOString(),
          status: 'pending',
        },
      ],
    })),
  removeOfflineAction: (id) =>
    set((state) => ({
      offlineQueue: state.offlineQueue.filter((a) => a.id !== id),
    })),
  clearOfflineQueue: () => set({ offlineQueue: [] }),
}));
