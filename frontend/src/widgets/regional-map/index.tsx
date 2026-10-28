'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../shared/ui/Card';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import {
  MapPin,
  Building2,
  AlertTriangle,
  Compass,
  Phone,
  User,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export interface RegionalOfficeData {
  id: string;
  name: string;
  code: string;
  hqLocation: string;
  nodalOfficer: string;
  phone: string;
  activeHotspots: number;
  activeComplaints: number;
  statesCovered: string[];
  bureausActive: string[];
  coordinates: { x: number; y: number }; // Relative percentage for map SVG
}

export const REGIONAL_OFFICES: RegionalOfficeData[] = [
  {
    id: 'north',
    name: 'Northern Regional Office (NRO)',
    code: 'NRO',
    hqLocation: 'Kanpur & New Delhi HQ',
    nodalOfficer: 'Dr. R. K. Srivastav (Regional Officer)',
    phone: '011-29581040',
    activeHotspots: 4,
    activeComplaints: 11,
    statesCovered: ['Delhi', 'Uttar Pradesh', 'Uttarakhand', 'Punjab', 'Haryana'],
    bureausActive: ['APPROVAL_BUREAU', 'PGRC', 'LEGAL_CELL'],
    coordinates: { x: 42, y: 32 },
  },
  {
    id: 'west',
    name: 'Western Regional Office (WRO)',
    code: 'WRO',
    hqLocation: 'Industrial Assurance Bldg, Mumbai',
    nodalOfficer: 'Shri A. P. Deshmukh (Regional Officer)',
    phone: '022-22855412',
    activeHotspots: 3,
    activeComplaints: 9,
    statesCovered: ['Maharashtra', 'Gujarat', 'Goa', 'DNH & Daman'],
    bureausActive: ['REGULATION_BUREAU', 'PGRC', 'LEGAL_CELL'],
    coordinates: { x: 28, y: 55 },
  },
  {
    id: 'south-west',
    name: 'South-Western Regional Office (SWRO)',
    code: 'SWRO',
    hqLocation: 'Palace Road, Bangalore',
    nodalOfficer: 'Dr. Ramesh Unnikrishnan (Regional Officer)',
    phone: '080-22205979',
    activeHotspots: 2,
    activeComplaints: 6,
    statesCovered: ['Karnataka', 'Kerala', 'Lakshadweep'],
    bureausActive: ['VIGILANCE_CELL', 'PGRC'],
    coordinates: { x: 38, y: 78 },
  },
  {
    id: 'south',
    name: 'Southern Regional Office (SRO)',
    code: 'SRO',
    hqLocation: 'Shastri Bhavan, Chennai',
    nodalOfficer: 'Dr. K. Sundaramoorthy (Regional Officer)',
    phone: '044-28275650',
    activeHotspots: 1,
    activeComplaints: 4,
    statesCovered: ['Tamil Nadu', 'Puducherry', 'Andaman & Nicobar'],
    bureausActive: ['APPROVAL_BUREAU'],
    coordinates: { x: 46, y: 82 },
  },
  {
    id: 'central',
    name: 'Central Regional Office (CRO)',
    code: 'CRO',
    hqLocation: 'Tagore Hostel, Bhopal',
    nodalOfficer: 'Shri Manoj Sharma (Regional Officer)',
    phone: '0755-2660061',
    activeHotspots: 1,
    activeComplaints: 3,
    statesCovered: ['Madhya Pradesh', 'Chhattisgarh', 'Gujarat (Border)'],
    bureausActive: ['PGRC', 'REGULATION_BUREAU'],
    coordinates: { x: 44, y: 50 },
  },
  {
    id: 'east',
    name: 'Eastern Regional Office (ERO)',
    code: 'ERO',
    hqLocation: 'LB Block, Sector III, Salt Lake, Kolkata',
    nodalOfficer: 'Dr. B. K. Bhattacharya (Regional Officer)',
    phone: '033-23357312',
    activeHotspots: 1,
    activeComplaints: 4,
    statesCovered: ['West Bengal', 'Bihar', 'Jharkhand', 'Odisha', 'Assam'],
    bureausActive: ['REGULATION_BUREAU'],
    coordinates: { x: 72, y: 48 },
  },
];

export const RegionalMapRadar: React.FC<{
  onSelectRegion?: (regionName: string) => void;
}> = ({ onSelectRegion }) => {
  const [selectedOffice, setSelectedOffice] = useState<RegionalOfficeData>(REGIONAL_OFFICES[0]);
  const [viewMode, setViewMode] = useState<'visual' | 'table'>('visual');

  const handleSelect = (office: RegionalOfficeData) => {
    setSelectedOffice(office);
    if (onSelectRegion) {
      onSelectRegion(office.name);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/60 overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3 border-b border-slate-800/80 bg-slate-950/40">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-blue-400" />
            <CardTitle className="text-base font-bold text-white">
              Geographic Intelligence & Regional Hotspot Radar
            </CardTitle>
            <Badge variant="blue" size="sm">
              6 AICTE Regional Nodal Zones
            </Badge>
          </div>
          <CardDescription>
            Interactive geo-spatial distribution of inter-bureau collision hotspots across AICTE Regional Offices.
          </CardDescription>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs">
          <button
            onClick={() => setViewMode('visual')}
            className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
              viewMode === 'visual' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Visual Nodes
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
              viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Regional Matrix
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {viewMode === 'visual' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left: Interactive Radar Coordinate Display */}
            <div className="lg:col-span-7 bg-slate-950/80 rounded-2xl border border-slate-800/80 p-6 relative aspect-[4/3] flex items-center justify-center overflow-hidden shadow-inner">
              {/* Radar Rings Grid */}
              <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                <div className="w-80 h-80 rounded-full border border-blue-500/40" />
                <div className="absolute w-56 h-56 rounded-full border border-blue-500/50" />
                <div className="absolute w-32 h-32 rounded-full border border-blue-500/60" />
                <div className="absolute w-full h-[1px] bg-blue-500/30" />
                <div className="absolute h-full w-[1px] bg-blue-500/30" />
              </div>

              {/* Watermark map silhouette label */}
              <div className="absolute bottom-3 left-4 text-[10px] font-mono text-slate-600 uppercase tracking-widest pointer-events-none">
                AICTE GEO-RADAR COORDINATION GRID • BHARAT
              </div>

              {/* Interactive Region Radar Nodes */}
              {REGIONAL_OFFICES.map((off) => {
                const isSelected = selectedOffice.id === off.id;
                return (
                  <button
                    key={off.id}
                    onClick={() => handleSelect(off)}
                    style={{ left: `${off.coordinates.x}%`, top: `${off.coordinates.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-xl transition-all duration-200 cursor-pointer group z-10 flex flex-col items-center ${
                      isSelected
                        ? 'scale-110 ring-2 ring-blue-400 shadow-lg shadow-blue-500/50 bg-blue-900/90'
                        : 'hover:scale-105 bg-slate-900/90 border border-slate-700/80 hover:border-blue-400'
                    }`}
                  >
                    {/* Pulsing beacon if active hotspots > 1 */}
                    {off.activeHotspots > 1 && (
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      <MapPin
                        className={`h-3.5 w-3.5 ${
                          isSelected ? 'text-blue-300' : 'text-slate-400 group-hover:text-blue-400'
                        }`}
                      />
                      <span className="text-[11px] font-mono font-bold text-white">
                        {off.code}
                      </span>
                    </div>

                    <span className="text-[9px] text-amber-300 font-semibold font-mono">
                      {off.activeHotspots} Hotspots
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right: Regional Office Dossier & Lead Custody Card */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="blue" size="md" className="font-mono">
                    {selectedOffice.code}
                  </Badge>
                  <span className="text-xs font-mono text-rose-400 font-semibold flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    {selectedOffice.activeHotspots} Collisions Flagged
                  </span>
                </div>

                <h3 className="text-base font-bold text-white">
                  {selectedOffice.name}
                </h3>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    <span>HQ: <strong>{selectedOffice.hqLocation}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>Nodal: <strong>{selectedOffice.nodalOfficer}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span>Official: <strong className="font-mono">{selectedOffice.phone}</strong></span>
                  </div>
                </div>

                {/* States Covered */}
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block mb-1.5">Territorial Jurisdiction:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedOffice.statesCovered.map((st) => (
                      <span
                        key={st}
                        className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300"
                      >
                        {st}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Active Bureaus */}
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block mb-1.5">Active Conflicting Bureaus:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedOffice.bureausActive.map((b) => (
                      <Badge key={b} variant="rose" size="sm">
                        {b}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Table Matrix View */
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Zone</th>
                  <th className="p-3">Office Location</th>
                  <th className="p-3">Nodal Officer</th>
                  <th className="p-3">Hotspots</th>
                  <th className="p-3">Total Complaints</th>
                  <th className="p-3">Jurisdiction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {REGIONAL_OFFICES.map((off) => (
                  <tr
                    key={off.id}
                    onClick={() => handleSelect(off)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="p-3 font-mono font-bold text-white">{off.code}</td>
                    <td className="p-3">{off.hqLocation}</td>
                    <td className="p-3 text-slate-200">{off.nodalOfficer}</td>
                    <td className="p-3 font-mono font-bold text-rose-400">
                      ⚠️ {off.activeHotspots} Hotspots
                    </td>
                    <td className="p-3 font-mono text-slate-200">{off.activeComplaints} Cases</td>
                    <td className="p-3 text-slate-400 truncate max-w-xs">
                      {off.statesCovered.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
