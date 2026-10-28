'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';
import { useAppStore } from '../../shared/lib/store';
import { VoiceReader } from '../../shared/lib/voice-reader';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import {
  Bell,
  Wifi,
  WifiOff,
  PlusCircle,
  Search,
  Activity,
  Globe,
  Sliders,
  Sparkles,
  PhoneCall,
  Volume2,
  VolumeX,
  HelpCircle,
  Eye,
  Menu,
  Sun,
  Moon,
} from 'lucide-react';

export const ExecutiveOverviewHeader: React.FC<{
  onOpenLodge: () => void;
  onOpenNotifications: () => void;
  onOpenPersona: () => void;
  onOpenSearch: () => void;
  onOpenHealth: () => void;
  onToggleMobileMenu?: () => void;
}> = ({
  onOpenLodge,
  onOpenNotifications,
  onOpenPersona,
  onOpenSearch,
  onOpenHealth,
  onToggleMobileMenu,
}) => {
  const {
    isOnline,
    offlineQueue,
    searchQuery,
    currentUser,
    token,
    portalMode,
    setPortalMode,
    activeTab,
    setActiveTab,
    fontSize,
    setFontSize,
    highContrast,
    toggleHighContrast,
    language,
    setLanguage,
    userLocation,
    theme,
    toggleTheme,
  } = useAppStore();

  const [tickerIndex, setTickerIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const tickerAlerts = [
    'Mandatory 30-Day Resolution Guarantee under AICTE Citizen’s Charter Active',
    '🚨 National Anti-Ragging 24x7 Toll-Free Helpline: 1800-180-5522',
    '📋 Strict Prohibition on Retention of Original Certificates (Gazette No. 14-4/NC/2020)',
    '⚖️ 100% Fee Refund Mandate within 15 Days of Admission Cancellation',
    '🏛️ Extension of Approval (EoA) Scrutiny Active across Western & Northern Regions',
  ];

  const handleToggleSpeech = () => {
    if (isSpeaking) {
      VoiceReader.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      const activeAlert = tickerAlerts[tickerIndex];
      const textToSpeak =
        language === 'hi'
          ? `समन्वय पोर्टल। अखिल भारतीय तकनीकी शिक्षा परिषद। सक्रिय सूचना: ${activeAlert}`
          : `Welcome to SAMANVAY Portal. All India Council for Technical Education. Current statutory notice: ${activeAlert}`;
      VoiceReader.speak(textToSpeak, language, () => {
        setIsSpeaking(false);
      });
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % tickerAlerts.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [tickerAlerts.length]);

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
    <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80">
      {/* 1. Indian Tricolor Ribbon */}
      <div className="h-0.5 w-full flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* 2. Official Government Top Identity & Accessibility Toolbar */}
      <div className="bg-slate-950 px-4 sm:px-6 py-1.5 border-b border-slate-800/50 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">🇮🇳</span>
          <span className="font-semibold text-slate-300">
            {language === 'hi' ? 'भारत सरकार | शिक्षा मंत्रालय' : 'Government of India • Ministry of Education'}
          </span>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden md:inline text-blue-400 font-medium">
            {language === 'hi' ? 'अखिल भारतीय तकनीकी शिक्षा परिषद (AICTE)' : 'All India Council for Technical Education'}
          </span>
        </div>

        {/* Accessibility Tools & Language */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          {/* Text Sizer */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded px-1 py-0.5 gap-1">
            <button
              onClick={() => setFontSize('normal')}
              className={`px-1 rounded text-[10px] ${fontSize === 'normal' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Standard Text Size"
            >
              A
            </button>
            <button
              onClick={() => setFontSize('large')}
              className={`px-1 rounded text-[11px] font-bold ${fontSize === 'large' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Larger Text Size"
            >
              A+
            </button>
          </div>

          {/* High Contrast Toggle */}
          <button
            onClick={toggleHighContrast}
            className={`p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer ${highContrast ? 'text-amber-400' : ''}`}
            title="Toggle High Contrast"
          >
            <Eye className="h-3 w-3" />
          </button>

          {/* Theme Mode Toggle (Dark / Light) */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode (Default)'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-3 w-3 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="h-3 w-3 text-indigo-400" />
                <span>Dark</span>
              </>
            )}
          </button>

          {/* Audio Speech Reader (Accessibility) */}
          <button
            onClick={handleToggleSpeech}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
              isSpeaking
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
            title={isSpeaking ? 'Stop Audio Readout' : 'Audio Screen Reader (Web Speech)'}
          >
            {isSpeaking ? <VolumeX className="h-3 w-3 text-rose-400" /> : <Volume2 className="h-3 w-3 text-amber-400" />}
            <span className="hidden sm:inline">{isSpeaking ? 'Stop' : (language === 'hi' ? 'सुनें' : 'Listen')}</span>
          </button>

          {/* Hindi / English Toggle */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            className="text-[11px] font-medium text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <Globe className="h-3 w-3 text-blue-400" />
            <span>{language === 'en' ? 'हिन्दी' : 'English'}</span>
          </button>

          <span className="text-slate-700">|</span>

          {/* Diagnostics Modal Button */}
          <button
            onClick={onOpenHealth}
            className="flex items-center gap-1 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
            title="Inspect live system diagnostics and database latency"
          >
            <Activity className="h-3 w-3 text-emerald-400" />
            <span>System Health</span>
          </button>
        </div>
      </div>

      {/* 3. Live Emergency Notice Bulletin Ticker */}
      <div className="bg-blue-950/30 border-b border-blue-500/20 px-4 sm:px-6 py-1 flex items-center justify-between text-[11px] overflow-hidden">
        <div className="flex items-center gap-2 w-full">
          <span className="px-2 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 text-[9px] uppercase tracking-wider shrink-0">
            NOTICE
          </span>
          <div className="text-slate-200 truncate font-medium">
            {tickerAlerts[tickerIndex]}
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-3 shrink-0 text-slate-400 text-[10px]">
          <span>Helpline: <strong>1800-111-555</strong></span>
        </div>
      </div>

      {/* 4. Main Executive Navigation Bar */}
      <div className="h-16 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
        {/* Mobile Navigation Drawer Toggle */}
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Open Navigation Menu"
          >
            <Menu className="h-5 w-5 text-blue-400" />
          </button>
        )}

        {/* Global Search Bar (Trigger for Unified Search Palette) */}
        <div className="relative flex-1 max-w-sm sm:max-w-md">
          <button
            onClick={onOpenSearch}
            className="w-full pl-9 sm:pl-10 pr-4 sm:pr-12 py-2 text-xs rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-left flex items-center transition-all cursor-pointer shadow-inner"
            aria-label="Open Unified Search Modal"
          >
            <Search className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-3.5 sm:h-4 w-3.5 sm:w-4 text-slate-500" />
            <span className="truncate">
              {searchQuery ||
                (userLocation
                  ? `📍 Colleges near ${userLocation.city}...`
                  : '📍 Search colleges near you...')}
            </span>
            <kbd className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 border border-slate-700 rounded text-slate-400 shadow-sm">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Portal Mode Pill Toggle */}
        <div className="hidden xl:flex items-center bg-slate-900/90 border border-slate-800 p-0.5 rounded-xl">
          <button
            onClick={() => {
              setPortalMode('citizen');
              setActiveTab('track');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'track' || activeTab === 'charter' || activeTab === 'circulars'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🎓 Citizen Services
          </button>
          <button
            onClick={() => {
              setPortalMode('officer');
              setActiveTab('dashboard');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab !== 'track' && activeTab !== 'charter' && activeTab !== 'circulars'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🏛️ Officer Intranet
          </button>
        </div>

        {/* Status Indicators & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Offline-First Sync Badge */}
          {isOnline ? (
            <Badge variant="emerald" size="sm" className="hidden lg:inline-flex items-center gap-1">
              <Wifi className="h-3 w-3 text-emerald-400" />
              Online
            </Badge>
          ) : (
            <Badge variant="rose" size="sm" className="inline-flex items-center gap-1 animate-pulse">
              <WifiOff className="h-3 w-3 text-rose-400" />
              Offline
            </Badge>
          )}

          {/* Quick Persona Badge */}
          <button
            onClick={onOpenPersona}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
            aria-label="Switch User Persona"
          >
            <span className="text-sm">{currentUser.avatar}</span>
            <div className="hidden md:block">
              <p className="text-xs font-bold text-white leading-tight">{currentUser.name}</p>
              <p className="text-[10px] text-blue-400 font-mono leading-tight">{currentUser.bureau}</p>
            </div>
          </button>

          {/* Theme Mode Toggle (Sun / Moon) */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme (Default)'}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode (Default)'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-400 hover:-rotate-12 transition-transform" />
            )}
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
            className="shrink-0"
          >
            <span className="hidden sm:inline">Lodge Complaint</span>
            <span className="sm:hidden">Lodge</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
