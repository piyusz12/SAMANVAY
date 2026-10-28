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

export interface AppState {
  // Navigation & View
  activeTab:
    | 'dashboard'
    | 'track'
    | 'complaints'
    | 'institutions'
    | 'conflicts'
    | 'coordination'
    | 'charter'
    | 'circulars'
    | 'analytics'
    | 'audit';
  portalMode: 'citizen' | 'officer';
  sidebarCollapsed: boolean;
  activeBureauFilter: string;
  searchQuery: string;

  // Accessibility & Localization
  fontSize: 'normal' | 'large' | 'larger';
  highContrast: boolean;
  language: 'en' | 'hi';
  theme: 'dark' | 'light';

  // User Geolocation for Proximity Discovery
  userLocation: {
    city: string;
    state?: string;
    latitude: number;
    longitude: number;
    displayName: string;
    accuracyMeters?: number;
    source: 'gps' | 'preset' | 'manual';
  } | null;

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
  setPortalMode: (mode: 'citizen' | 'officer') => void;
  toggleSidebar: () => void;
  setFontSize: (size: 'normal' | 'large' | 'larger') => void;
  toggleHighContrast: () => void;
  setLanguage: (lang: 'en' | 'hi') => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  setUserLocation: (
    location: {
      city: string;
      state?: string;
      latitude: number;
      longitude: number;
      displayName: string;
      accuracyMeters?: number;
      source: 'gps' | 'preset' | 'manual';
    } | null
  ) => void;
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

const applyThemeToDOM = (theme: 'dark' | 'light') => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('samanvay-theme', theme);
    } catch {}
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    }
  }
};

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'dashboard',
  portalMode: 'officer',
  sidebarCollapsed: false,
  activeBureauFilter: 'ALL',
  searchQuery: '',

  fontSize: 'normal',
  highContrast: false,
  language: 'en',
  theme: 'light', // Default is light mode ("let white one be the first expression")
  userLocation: null,
  setUserLocation: (userLocation) => set({ userLocation }),

  selectedComplaintId: null,
  selectedInstitutionId: null,
  activeModal: null,

  currentUser: DEMO_PERSONAS[1], // Default: Amit Patel, PGRC Officer
  token: null,

  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  offlineQueue: [],

  setActiveTab: (tab) => set({ activeTab: tab }),
  setPortalMode: (mode) => set({ portalMode: mode }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setFontSize: (size) => set({ fontSize: size }),
  toggleHighContrast: () => set((state) => ({ highContrast: !state.highContrast })),
  setLanguage: (lang) => set({ language: lang }),
  setTheme: (theme) => {
    applyThemeToDOM(theme);
    set({ theme });
  },
  toggleTheme: () => {
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      applyThemeToDOM(nextTheme);
      return { theme: nextTheme };
    });
  },
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
