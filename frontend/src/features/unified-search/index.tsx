'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';
import { useAppStore } from '../../shared/lib/store';
import {
  PRESET_LOCATIONS,
  NATIONAL_COLLEGES_DIRECTORY,
  getNearbyColleges,
  calculateDistanceKm,
  PresetLocation,
  CollegeGeoItem,
} from '../../shared/config/colleges-geo';
import { Modal } from '../../shared/ui/Modal';
import { Badge } from '../../shared/ui/Badge';
import { ComplaintStatusBadge } from '../../entities/complaint';
import {
  Search,
  Building2,
  FileText,
  ArrowRight,
  AlertTriangle,
  Sparkles,
  X,
  MapPin,
  LocateFixed,
  Navigation,
  CheckCircle2,
  RefreshCw,
  Compass,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';

export interface UnifiedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectComplaint: (id: number) => void;
  onSelectInstitution: (id: number) => void;
}

export const UnifiedSearchModal: React.FC<UnifiedSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectComplaint,
  onSelectInstitution,
}) => {
  const { userLocation, setUserLocation } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [filterType, setFilterType] = useState<'colleges' | 'complaints' | 'all'>('colleges');

  // Location Selector States
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(!userLocation);
  const [customCityInput, setCustomCityInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Debounce search term for backend queries (200ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm.trim());
    }, 200);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Geolocation detector using Web Geolocation API
  const handleDetectLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationError('Geolocation is not supported by your current browser.');
      return;
    }

    setIsDetectingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Find closest known city preset for readable display
        let closestPreset = PRESET_LOCATIONS[0];
        let minDistance = Infinity;
        for (const preset of PRESET_LOCATIONS) {
          const d = calculateDistanceKm(lat, lng, preset.lat, preset.lng);
          if (d < minDistance) {
            minDistance = d;
            closestPreset = preset;
          }
        }

        setUserLocation({
          latitude: lat,
          longitude: lng,
          city: closestPreset.city,
          state: closestPreset.state,
          displayName:
            minDistance < 60
              ? `${closestPreset.label} (GPS Detected)`
              : `Current Coordinates (${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E)`,
          source: 'gps',
        });
        setIsDetectingLocation(false);
        setShowLocationPicker(false);
      },
      (err) => {
        setIsDetectingLocation(false);
        if (err.code === 1) {
          setLocationError('Location access was denied. Please select your city from the presets below.');
        } else {
          setLocationError('Unable to determine GPS location. Please choose a city below.');
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSelectPreset = (preset: PresetLocation) => {
    setUserLocation({
      latitude: preset.lat,
      longitude: preset.lng,
      city: preset.city,
      state: preset.state,
      displayName: preset.label,
      source: 'preset',
    });
    setShowLocationPicker(false);
    setLocationError(null);
  };

  const handleCustomCitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customCityInput.trim();
    if (!trimmed) return;

    const matched = PRESET_LOCATIONS.find(
      (p) =>
        p.city.toLowerCase().includes(trimmed.toLowerCase()) ||
        p.label.toLowerCase().includes(trimmed.toLowerCase())
    );

    if (matched) {
      handleSelectPreset(matched);
    } else {
      setUserLocation({
        latitude: 28.6139,
        longitude: 77.209,
        city: trimmed,
        displayName: trimmed,
        source: 'manual',
      });
      setShowLocationPicker(false);
    }
    setCustomCityInput('');
  };

  // Real-time Keystroke Proximity Suggestions (Zero-latency calculation)
  const nearbyColleges = useMemo(() => {
    const coords = userLocation
      ? { lat: userLocation.latitude, lng: userLocation.longitude }
      : null;
    let list = getNearbyColleges(searchTerm, coords);
    if (categoryFilter !== 'ALL') {
      list = list.filter((c) =>
        c.category.toLowerCase().includes(categoryFilter.toLowerCase())
      );
    }
    return list;
  }, [searchTerm, userLocation, categoryFilter]);

  // Backend query for grievances & complaints matching search
  const { data: backendData } = useQuery<any>({
    queryKey: ['unified-search', debouncedTerm],
    queryFn: () => apiClient.get<any>(`/api/v1/search/unified?q=${encodeURIComponent(debouncedTerm)}`),
    enabled: isOpen && debouncedTerm.length > 0,
    staleTime: 1000 * 15,
  });

  const complaints = backendData?.complaints || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Global Proximity & Directory Search"
      description="Instant location-aware college discovery, university rankings, and multi-entity regulatory search."
      size="xl"
    >
      <div className="space-y-4 pt-1">
        {/* 1. Global Search Input Box */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
          <input
            type="text"
            autoFocus
            aria-label="Search grievances, colleges, or reference numbers"
            placeholder={
              userLocation
                ? `Search colleges near ${userLocation.city}, AICTE ID, or Complaint No...`
                : 'Search college name, city, AICTE ID (e.g. 1-10293), or Complaint No...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-3 text-sm rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 2. Interactive Location Banner & Proximity Selector */}
        {!userLocation || showLocationPicker ? (
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <MapPin className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Set Your Location to Discover Colleges Around You</span>
              </div>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isDetectingLocation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer self-start sm:self-auto shrink-0"
              >
                <LocateFixed
                  className={`h-3.5 w-3.5 ${isDetectingLocation ? 'animate-spin' : ''}`}
                />
                <span>
                  {isDetectingLocation ? 'Detecting GPS...' : 'Detect My Location (GPS)'}
                </span>
              </button>
            </div>

            <p className="text-[11px] text-slate-300">
              Calculate exact kilometer distance from your campus, home, or district to all AICTE approved institutions.
            </p>

            {locationError && (
              <p className="text-[11px] text-rose-400 font-medium">{locationError}</p>
            )}

            {/* Quick City Presets */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Or Select Your City / Zone:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_LOCATIONS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:border-blue-400 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    📍 {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual City / PIN Form */}
            <form onSubmit={handleCustomCitySubmit} className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Enter city or district name (e.g. Pune, Lucknow, Kochi)..."
                value={customCityInput}
                onChange={(e) => setCustomCityInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg border border-slate-700 cursor-pointer"
              >
                Set City
              </button>
            </form>
          </div>
        ) : (
          /* Active Location Status Ribbon */
          <div className="p-2.5 px-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs text-slate-300 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <MapPin className="h-3.5 w-3.5 text-blue-400" />
              <span>
                Location Active:{' '}
                <strong className="text-white">{userLocation.displayName}</strong>
              </span>
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                • Distances measured from coordinates
              </span>
            </div>

            <button
              onClick={() => setShowLocationPicker(true)}
              className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Change Location
            </button>
          </div>
        )}

        {/* 3. Filter Tabs (Colleges, Complaints, All) */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterType('colleges')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterType === 'colleges'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              Colleges Around You ({nearbyColleges.length})
            </button>

            {searchTerm.length > 0 && (
              <button
                onClick={() => setFilterType('complaints')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  filterType === 'complaints'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Grievances ({complaints.length})
              </button>
            )}

            {searchTerm.length > 0 && (
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                All Matches ({nearbyColleges.length + complaints.length})
              </button>
            )}
          </div>

          {/* Category Filter Chips for Colleges */}
          {filterType === 'colleges' && (
            <div className="flex items-center gap-1 text-[11px]">
              {['ALL', 'Engineering', 'Management', 'Polytechnic'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-slate-700 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4. Real-time Results Area */}
        <div className="max-h-[55vh] overflow-y-auto space-y-4 pr-1">
          {/* Header indicator */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              {searchTerm.length > 0 ? (
                <span>
                  Real-time matches for &ldquo;<strong className="text-white">{searchTerm}</strong>&rdquo;
                  {userLocation && ` (ranked by proximity to ${userLocation.city})`}
                </span>
              ) : userLocation ? (
                <span>
                  Colleges and Universities sorted by distance from{' '}
                  <strong className="text-white">{userLocation.displayName}</strong>
                </span>
              ) : (
                <span>All Approved Technical Institutions</span>
              )}
            </span>

            <span className="text-[11px] text-slate-500 font-mono">
              {nearbyColleges.length} institution{nearbyColleges.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Colleges List */}
          {(filterType === 'colleges' || filterType === 'all') && (
            <div className="space-y-2">
              {nearbyColleges.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800/80">
                  <Building2 className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="font-bold text-slate-300">
                    No institutions match &ldquo;{searchTerm}&rdquo;
                  </p>
                  <p className="text-slate-500 mt-1">
                    Try searching by state, city, permanent AICTE ID, or discipline.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80 rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
                  {nearbyColleges.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => {
                        onSelectInstitution(col.id);
                        onClose();
                      }}
                      className="w-full p-3.5 text-left hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        {/* Badges & Proximity Tag */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {col.distanceKm !== undefined && (
                            <Badge
                              variant={col.distanceKm < 30 ? 'emerald' : col.distanceKm < 150 ? 'blue' : 'slate'}
                              size="sm"
                              className="font-mono flex items-center gap-1 font-bold"
                            >
                              <MapPin className="h-3 w-3" />
                              {col.distanceKm} km away
                            </Badge>
                          )}

                          <Badge variant="purple" size="sm" className="font-mono">
                            AICTE ID: {col.aicte_id}
                          </Badge>

                          <Badge
                            variant={
                              col.approval_status === 'APPROVED'
                                ? 'emerald'
                                : col.approval_status === 'SHOW_CAUSE_NOTICE'
                                  ? 'rose'
                                  : 'amber'
                            }
                            size="sm"
                          >
                            {col.approval_status.replace(/_/g, ' ')}
                          </Badge>

                          {col.is_conflicting && (
                            <Badge variant="rose" size="sm">
                              ⚠️ Collision Hotspot
                            </Badge>
                          )}
                        </div>

                        {/* College Name */}
                        <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                          {col.name}
                        </h4>

                        {/* Location, Region & Category */}
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                          <span className="text-slate-300 font-medium">
                            {col.city}, {col.state} ({col.region} Region)
                          </span>
                          <span className="text-slate-600">•</span>
                          <span>{col.category}</span>
                          <span className="text-slate-600">•</span>
                          <span className="font-mono text-slate-400">{col.institution_type}</span>
                          {col.active_complaints_count > 0 && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="text-rose-400 font-semibold font-mono">
                                {col.active_complaints_count} active case{col.active_complaints_count === 1 ? '' : 's'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-blue-400 font-semibold hidden md:inline group-hover:underline">
                          View Dossier
                        </span>
                        <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Grievances & Regulatory Cases Section */}
          {(filterType === 'complaints' || filterType === 'all') &&
            searchTerm.length > 0 &&
            complaints.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-blue-400" />
                  Regulatory Cases & Citizen Grievances ({complaints.length})
                </h4>
                <div className="divide-y divide-slate-800/80 rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
                  {complaints.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onSelectComplaint(c.id);
                        onClose();
                      }}
                      className="w-full p-3.5 text-left hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                            {c.complaint_no}
                          </span>
                          <Badge variant="blue" size="sm">
                            {c.bureau}
                          </Badge>
                          <ComplaintStatusBadge status={c.status} size="sm" />
                          {c.is_overdue && (
                            <Badge variant="rose" size="sm">
                              🚨 OVERDUE SLA
                            </Badge>
                          )}
                        </div>
                        <h5 className="text-xs font-bold text-slate-200 truncate">
                          {c.subject}
                        </h5>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-slate-500 shrink-0" />
                          <span className="truncate">{c.institution_name}</span>
                          <span>•</span>
                          <span>Category: {c.category?.replace(/_/g, ' ')}</span>
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>
    </Modal>
  );
};
