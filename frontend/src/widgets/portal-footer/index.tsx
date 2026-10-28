'use client';

import React from 'react';
import { useAppStore } from '../../shared/lib/store';
import { SamanvayLogo } from '../../shared/ui/Logo';
import { Shield, Phone, Mail, MapPin, ExternalLink, Globe } from 'lucide-react';

export const PortalFooter: React.FC = () => {
  const { setActiveTab } = useAppStore();

  return (
    <footer className="mt-16 bg-slate-950 border-t border-slate-800/80 text-slate-400 text-xs">
      {/* 1. Indian Tricolor Accent Line */}
      <div className="h-1 w-full flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* 2. Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-28 md:pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: About */}
          <div className="space-y-3">
            <SamanvayLogo size="md" />
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              Integrated National Grievance Monitoring & Inter-Bureau Coordination Platform. Dismantling institutional silos across AICTE bureaus through automated conflict detection, 360° dossiers, and tamper-evident audit trails.
            </p>
            <div className="pt-2 flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <Shield className="h-4 w-4" />
              <span>Ministry of Education, Government of India</span>
            </div>
          </div>

          {/* Col 2: Citizen & Student Services */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider font-heading">
              Citizen & Student Services
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button
                  onClick={() => setActiveTab('track')}
                  className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-left"
                >
                  Track Grievance Status
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('charter')}
                  className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-left"
                >
                  Citizen&apos;s Charter & 30-Day SLA
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('circulars')}
                  className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-left"
                >
                  Fee Refund & Anti-Ragging Rules
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('institutions')}
                  className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-left"
                >
                  Approved Technical Colleges Directory
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('audit')}
                  className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-left"
                >
                  Cryptographic Audit Ledger
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Government National Portals */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider font-heading">
              National Portals & Links
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <a
                  href="https://www.india.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="group text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-colors inline-flex items-center gap-1.5"
                >
                  <span>National Portal of India</span>
                  <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-blue-600 dark:text-slate-500 dark:group-hover:text-white transition-colors" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.education.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="group text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Ministry of Education (MoE)</span>
                  <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-blue-600 dark:text-slate-500 dark:group-hover:text-white transition-colors" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.aicte-india.org"
                  target="_blank"
                  rel="noreferrer"
                  className="group text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-colors inline-flex items-center gap-1.5"
                >
                  <span>AICTE Main Apex Portal</span>
                  <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-blue-600 dark:text-slate-500 dark:group-hover:text-white transition-colors" />
                </a>
              </li>
              <li>
                <a
                  href="https://scholarships.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="group text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-colors inline-flex items-center gap-1.5"
                >
                  <span>National Scholarship Portal (NSP)</span>
                  <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-blue-600 dark:text-slate-500 dark:group-hover:text-white transition-colors" />
                </a>
              </li>
              <li>
                <a
                  href="https://swayam.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="group text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-colors inline-flex items-center gap-1.5"
                >
                  <span>SWAYAM Online Education</span>
                  <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-blue-600 dark:text-slate-500 dark:group-hover:text-white transition-colors" />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Helpdesk */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider font-heading">
              AICTE Headquarters & Helplines
            </h4>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-500 shrink-0" />
                <span>Toll-Free Student Helpline: 1800-111-555</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-rose-500 shrink-0" />
                <span>Anti-Ragging 24x7: 1800-180-5522</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>grievances@aicte-india.org</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Bottom Legal & Compliance Strip */}
        <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © 2026 All India Council for Technical Education (AICTE). All Rights Reserved.
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="hover:text-slate-800 dark:hover:text-slate-300 transition-colors cursor-pointer">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-slate-800 dark:hover:text-slate-300 transition-colors cursor-pointer">Terms of Use</span>
            <span>•</span>
            <span className="hover:text-slate-800 dark:hover:text-slate-300 transition-colors cursor-pointer">Hyperlinking Policy</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">WCAG 2.1 AA Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

