'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';
import { useAppStore } from '../../shared/lib/store';
import {
  PRESET_LOCATIONS,
  NATIONAL_COLLEGES_DIRECTORY,
  INDIAN_PIN_CODE_INDEX,
  getNearbyColleges,
  calculateDistanceKm,
  getCompassBearing,
  getGoogleMapsDirectionsUrl,
  findNearestPreset,
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
  Award,
  Globe,
  SlidersHorizontal,
  Map,
} from 'lucide-react';

export interface UnifiedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectComplaint: (id: number) => void;
  onSelectInstitution: (id: number) => void;
  onLodgeComplaintForInstitution?: (id: number) => void;
}

export const UnifiedSearchModal: React.FC<UnifiedSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectComplaint,
  onSelectInstitution,
  onLodgeComplaintForInstitution,
}) => {
  const { userLocation, setUserLocation } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [filterType, setFilterType] = useState<'colleges' | 'complaints' | 'all'>('colleges');

  // Location & GPS Selector States
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(!userLocation);
  const [customLocationInput, setCustomLocationInput] = useState('');
  const [radiusFilter, setRadiusFilter] = useState<number | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Debounce search term for backend grievance queries (200ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm.trim());
    }, 200);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fast Network-based IP Geolocation Fallback
  const detectLocationByIP = useCallback(async () => {
    try {
      const res = await fetch('https://ipapi.co/json/', {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          const lat = parseFloat(data.latitude);
          const lng = parseFloat(data.longitude);
          const city = data.city || data.region || 'Nearby';
          const state = data.region || '';
          return {
            latitude: lat,
            longitude: lng,
            city,
            state,
            displayName: `${city}${state ? `, ${state}` : ''} (Network Located)`,
            accuracyMeters: 1000,
            source: 'manual' as const,
          };
        }
      }
    } catch {
      // Quiet fail if offline or blocked
    }
    return null;
  }, []);

  // Enhanced GPS Geolocation Detection with Live Reverse Geocoding
  const handleDetectLocation = useCallback(async () => {
    setIsDetectingLocation(true);
    setLocationError(null);

    // Try HTML5 GPS first
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = Math.round(position.coords.accuracy || 20);

          let resolvedName = '';
          let city = '';
          let state = '';

          // Real-time reverse geocoding via OpenStreetMap Nominatim with strict timeout
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
              { signal: controller.signal }
            );
            clearTimeout(timeoutId);

            if (res.ok) {
              const data = await res.json();
              const addr = data.address || {};
              const locality =
                addr.suburb ||
                addr.neighbourhood ||
                addr.residential ||
                addr.city_district ||
                '';
              city = addr.city || addr.town || addr.municipality || addr.district || '';
              state = addr.state || '';
              const pin = addr.postcode ? ` - ${addr.postcode}` : '';

              if (locality && city) {
                resolvedName = `${locality}, ${city}${state ? `, ${state}` : ''}${pin}`;
              } else if (city) {
                resolvedName = `${city}${state ? `, ${state}` : ''}${pin}`;
              } else if (state) {
                resolvedName = `${state} Region`;
              }
            }
          } catch {
            // Network timed out — fallback to nearest preset
          }

          if (!resolvedName) {
            const nearest = findNearestPreset(lat, lng);
            city = nearest.city;
            state = nearest.state;
            resolvedName = `${nearest.label} (GPS ±${accuracy}m)`;
          }

          setUserLocation({
            latitude: lat,
            longitude: lng,
            city: city || 'Your Location',
            state: state,
            displayName: resolvedName,
            accuracyMeters: accuracy,
            source: 'gps',
          });

          setIsDetectingLocation(false);
          setShowLocationPicker(false);
        },
        async (err) => {
          // If browser GPS fails or was denied, try fast IP fallback
          const ipLoc = await detectLocationByIP();
          if (ipLoc) {
            setUserLocation(ipLoc);
            setIsDetectingLocation(false);
            setShowLocationPicker(false);
          } else {
            setIsDetectingLocation(false);
            if (err.code === 1) {
              setLocationError('GPS permission was blocked. Please choose your city or enter a 6-digit PIN code below.');
            } else {
              setLocationError('GPS coordinates unavailable. Please choose your city below.');
            }
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0,
        }
      );
    } else {
      // Geolocation not supported, use IP
      const ipLoc = await detectLocationByIP();
      if (ipLoc) {
        setUserLocation(ipLoc);
        setIsDetectingLocation(false);
        setShowLocationPicker(false);
      } else {
        setIsDetectingLocation(false);
        setLocationError('Please choose your city from the list below.');
      }
    }
  }, [detectLocationByIP, setUserLocation]);

  // Auto-detect location when modal opens if user location is not set yet
  useEffect(() => {
    if (isOpen && !userLocation) {
      handleDetectLocation();
    }
  }, [isOpen, userLocation, handleDetectLocation]);

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

  const handleCustomLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customLocationInput.trim();
    if (!trimmed) return;

    // Check if user entered a 6-digit Indian PIN code
    const pinMatch = trimmed.match(/^(\d{3})\d{3}$/);
    if (pinMatch && INDIAN_PIN_CODE_INDEX[pinMatch[1]]) {
      const pinInfo = INDIAN_PIN_CODE_INDEX[pinMatch[1]];
      setUserLocation({
        latitude: pinInfo.lat,
        longitude: pinInfo.lng,
        city: pinInfo.city,
        state: pinInfo.state,
        displayName: `${pinInfo.city} (PIN: ${trimmed})`,
        source: 'manual',
      });
      setShowLocationPicker(false);
      setCustomLocationInput('');
      return;
    }

    // Check if user entered a known city name or abbreviation
    const matched = PRESET_LOCATIONS.find(
      (p) =>
        p.city.toLowerCase().includes(trimmed.toLowerCase()) ||
        p.label.toLowerCase().includes(trimmed.toLowerCase()) ||
        trimmed.toLowerCase().includes(p.city.toLowerCase())
    );

    if (matched) {
      handleSelectPreset(matched);
    } else {
      // Custom named location
      setUserLocation({
        latitude: 21.1458,
        longitude: 79.0882,
        city: trimmed,
        displayName: trimmed,
        source: 'manual',
      });
      setShowLocationPicker(false);
    }
    setCustomLocationInput('');
  };

  // Zero-latency reactive keystroke calculation
  const nearbyColleges = useMemo(() => {
    const coords = userLocation
      ? { lat: userLocation.latitude, lng: userLocation.longitude }
      : null;

    return getNearbyColleges(searchTerm, coords, radiusFilter, categoryFilter);
  }, [searchTerm, userLocation, radiusFilter, categoryFilter]);

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
      title="National Technical Institutions Directory & Live Campus Radar"
      description="Real-time proximity discovery across premier IITs, NITs, Central/State universities, and AICTE autonomous colleges."
      size="xl"
    >
      <div className="space-y-3.5 pt-1">
        {/* 1. Global Search Input Box */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
          <input
            type="text"
            autoFocus
            aria-label="Search grievances, colleges, or reference numbers"
            placeholder={
              userLocation
                ? `Search colleges near ${userLocation.city} (e.g. VNIT, IIT, COEP, DTU, RCOEM, BITS)...`
                : 'Search college name, acronym (e.g. VNIT, IIT, DTU, COEP), city, AICTE ID, or Complaint No...'
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

        {/* 2. Top Location Bar & Quick-Select Hubs */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border border-blue-500/30 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <MapPin className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="text-slate-300">
                {userLocation ? (
                  <>
                    Campus Radar Centered At:{' '}
                    <strong className="text-white font-bold">{userLocation.displayName}</strong>
                  </>
                ) : (
                  <span className="text-amber-300 font-semibold">
                    Location Not Set — Click &ldquo;Detect My Location&rdquo; or pick your city below
                  </span>
                )}
              </span>
              {userLocation?.accuracyMeters && (
                <Badge variant="emerald" size="sm" className="font-mono text-[10px] hidden md:inline-flex">
                  ±{userLocation.accuracyMeters}m GPS
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isDetectingLocation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
              >
                <LocateFixed className={`h-3.5 w-3.5 ${isDetectingLocation ? 'animate-spin' : ''}`} />
                <span>{isDetectingLocation ? 'Detecting...' : '📍 Detect My Live Location (GPS)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowLocationPicker(!showLocationPicker)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer underline flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span>{showLocationPicker ? 'Hide Cities' : 'Pick City'}</span>
              </button>
            </div>
          </div>

          {locationError && (
            <p className="text-[11px] text-rose-300 bg-rose-500/15 p-2 rounded-lg border border-rose-500/30 font-medium">
              {locationError}
            </p>
          )}

          {/* Quick-Select City Chips (Always accessible or expandable) */}
          <div className="pt-1 border-t border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              <span>Quick Select Your Academic Zone:</span>
              <span className="text-slate-500 lowercase font-mono">1-click coordinates switch</span>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {PRESET_LOCATIONS.map((preset) => {
                const isSelected =
                  userLocation?.city.toLowerCase() === preset.city.toLowerCase() ||
                  userLocation?.displayName.includes(preset.city);

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-sm ring-1 ring-blue-400'
                        : 'bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:border-blue-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>📍</span>
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom PIN or District Input */}
            {showLocationPicker && (
              <form onSubmit={handleCustomLocationSubmit} className="flex gap-2 pt-1.5">
                <input
                  type="text"
                  placeholder="Enter 6-digit PIN code (e.g. 440010, 411001, 560001, 110001) or City..."
                  value={customLocationInput}
                  onChange={(e) => setCustomLocationInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg border border-slate-700 cursor-pointer shrink-0"
                >
                  Locate PIN / City
                </button>
              </form>
            )}
          </div>
        </div>

        {/* 3. Distance Radius Selector & Filter Navigation */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs flex-wrap gap-2">
          {/* Main Entities Switcher */}
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
              Colleges & Universities ({nearbyColleges.length})
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
                Regulatory Cases ({complaints.length})
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

          {/* Radius Selector */}
          {userLocation && filterType === 'colleges' && (
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <SlidersHorizontal className="h-3 w-3 text-blue-400" />
              <span className="font-semibold text-slate-300">Radius:</span>
              {[
                { label: 'Within 10 km', val: 10 },
                { label: '25 km', val: 25 },
                { label: '50 km', val: 50 },
                { label: '100 km', val: 100 },
                { label: '250 km', val: 250 },
                { label: 'All India', val: 'ALL' },
              ].map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => setRadiusFilter(r.val as any)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                    radiusFilter === r.val
                      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4. Real-time Results Area */}
        <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
          {/* Header indicator */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              {searchTerm.length > 0 ? (
                <span>
                  Real-time matches for &ldquo;<strong className="text-white">{searchTerm}</strong>&rdquo;
                  {userLocation && ` (ranked by distance from ${userLocation.city})`}
                </span>
              ) : userLocation ? (
                <span>
                  Showing institutions near <strong className="text-white">{userLocation.city}</strong>{' '}
                  {radiusFilter !== 'ALL' ? (
                    <span className="inline-flex items-center gap-1 ml-1 text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/60 font-semibold text-[11px]">
                      within {radiusFilter} km
                      <button
                        type="button"
                        onClick={() => setRadiusFilter('ALL')}
                        className="hover:text-white cursor-pointer ml-0.5"
                        title="Clear radius filter"
                      >
                        ×
                      </button>
                    </span>
                  ) : (
                    <span className="text-slate-500 font-normal">
                      (sorted closest to farthest)
                    </span>
                  )}
                </span>
              ) : (
                <span>All Recognized Technical Institutions (National Directory)</span>
              )}
            </span>

            <span className="text-[11px] text-slate-500 font-mono">
              {nearbyColleges.length} institution{nearbyColleges.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Colleges List */}
          {(filterType === 'colleges' || filterType === 'all') && (
            <div className="space-y-2.5">
              {nearbyColleges.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800/80 space-y-3 px-4">
                  <Building2 className="h-8 w-8 text-slate-600 mx-auto" />
                  {searchTerm.length > 0 ? (
                    <div>
                      <p className="font-bold text-slate-200 text-sm">
                        No technical institutions match &ldquo;{searchTerm}&rdquo;
                        {radiusFilter !== 'ALL' && userLocation && ` within ${radiusFilter} km of ${userLocation.city}`}
                      </p>
                      <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                        Try searching by popular acronym (e.g. VNIT, IIT, DTU, COEP, RCOEM, BITS, VIT) or expanding your radius.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-slate-200 text-sm">
                        No technical institutions found within {radiusFilter} km of {userLocation?.city || 'your location'}
                      </p>
                      <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                        There are premier technical colleges and universities located further in the surrounding region. Broaden your search radius:
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                    {typeof radiusFilter === 'number' && radiusFilter < 50 && (
                      <button
                        type="button"
                        onClick={() => setRadiusFilter(50)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Expand to 50 km
                      </button>
                    )}
                    {typeof radiusFilter === 'number' && radiusFilter < 100 && (
                      <button
                        type="button"
                        onClick={() => setRadiusFilter(100)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Expand to 100 km
                      </button>
                    )}
                    {typeof radiusFilter === 'number' && radiusFilter < 250 && (
                      <button
                        type="button"
                        onClick={() => setRadiusFilter(250)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Expand to 250 km
                      </button>
                    )}
                    {radiusFilter !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setRadiusFilter('ALL')}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow cursor-pointer transition-colors"
                      >
                        Show All India Directory ({NATIONAL_COLLEGES_DIRECTORY.length} Institutions)
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80 rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
                  {nearbyColleges.map((col) => {
                    const directionsUrl = getGoogleMapsDirectionsUrl(
                      col.coordinates.lat,
                      col.coordinates.lng,
                      userLocation?.latitude,
                      userLocation?.longitude
                    );

                    return (
                      <div
                        key={col.id}
                        className="p-3.5 hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          {/* Badges: Proximity, NIRF, AICTE ID */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {col.distanceKm !== undefined && (
                              <Badge
                                variant={
                                  col.distanceKm < 15
                                    ? 'emerald'
                                    : col.distanceKm < 60
                                      ? 'blue'
                                      : 'slate'
                                }
                                size="sm"
                                className="font-mono flex items-center gap-1 font-bold"
                              >
                                <Navigation className="h-3 w-3" />
                                {col.distanceKm < 1
                                  ? '< 1 km away'
                                  : `${col.distanceKm} km away`}
                                {col.compassBearing && ` • ${col.compassBearing}`}
                              </Badge>
                            )}

                            {col.nirfRank && (
                              <Badge
                                variant="amber"
                                size="sm"
                                className="font-semibold flex items-center gap-1"
                              >
                                <Award className="h-3 w-3 text-amber-400" />
                                {col.nirfRank}
                              </Badge>
                            )}

                            <Badge variant="purple" size="sm" className="font-mono">
                              AICTE ID: {col.aicte_id}
                            </Badge>

                            {col.estdYear && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Estd. {col.estdYear}
                              </span>
                            )}

                            {col.is_conflicting && (
                              <Badge variant="rose" size="sm">
                                ⚠️ Regulatory Inquiries
                              </Badge>
                            )}
                          </div>

                          {/* College Name & Short Acronym */}
                          <div className="flex items-baseline gap-2">
                            <h4
                              onClick={() => {
                                onSelectInstitution(col.id);
                                onClose();
                              }}
                              className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors cursor-pointer truncate"
                            >
                              {col.name}
                            </h4>
                            {col.shortName && (
                              <span className="text-xs text-blue-400 font-mono font-semibold shrink-0">
                                ({col.shortName})
                              </span>
                            )}
                          </div>

                          {/* Address & Academic Metadata */}
                          <p className="text-[11px] text-slate-300 flex items-center gap-1.5 flex-wrap">
                            <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                            <span>{col.address}</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-400 font-mono">PIN: {col.pin_code}</span>
                          </p>

                          <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap pt-0.5">
                            <span className="text-emerald-400 font-medium">
                              {col.institution_type}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span>{col.category}</span>
                            {col.accreditation && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span className="text-amber-300 font-mono">
                                  {col.accreditation}
                                </span>
                              </>
                            )}
                            {col.intakeCapacity && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span className="text-slate-400 font-mono">
                                  Intake: {col.intakeCapacity.toLocaleString()} seats
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
                          <a
                            href={directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 px-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700/80 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                            title="Get real directions on Google Maps"
                          >
                            <Navigation className="h-3 w-3 text-blue-400" />
                            <span>Directions</span>
                          </a>

                          {col.website && (
                            <a
                              href={col.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 px-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700/80 text-[11px] text-slate-400 hover:text-white transition-colors"
                              title="Visit Official University Website"
                            >
                              <Globe className="h-3.5 w-3.5" />
                            </a>
                          )}

                          {onLodgeComplaintForInstitution && (
                            <button
                              type="button"
                              onClick={() => {
                                onLodgeComplaintForInstitution(col.id);
                                onClose();
                              }}
                              className="p-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer shrink-0"
                              title={`Lodge grievance / register case against ${col.name}`}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>Register Case</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              onSelectInstitution(col.id);
                              onClose();
                            }}
                            className="p-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                          >
                            <span>Dossier</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Grievances & Cases Section */}
          {(filterType === 'complaints' || filterType === 'all') &&
            searchTerm.length > 0 &&
            complaints.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-blue-400" />
                  Regulatory Cases & Citizen Inquiries ({complaints.length})
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
