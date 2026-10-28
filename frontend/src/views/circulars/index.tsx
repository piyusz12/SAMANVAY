'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../shared/ui/Card';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import {
  FileText,
  Download,
  Search,
  Filter,
  Calendar,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  FileCheck2,
} from 'lucide-react';

interface Circular {
  id: string;
  circular_no: string;
  title: string;
  category: string;
  date: string;
  summary: string;
  file_size: string;
  badge_color: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate';
}

export const CircularsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);

  const circulars: Circular[] = [
    {
      id: 'circ-1',
      circular_no: 'AICTE/AB/APH/2026-27/01',
      title: 'AICTE Approval Process Handbook (APH) 2026-27',
      category: 'APPROVALS',
      date: '15 January 2026',
      summary:
        'Comprehensive statutory norms, procedures, and conditions for Grant of Extension of Approval (EoA), introduction of new courses, and intake variations.',
      file_size: '4.8 MB (PDF)',
      badge_color: 'blue',
    },
    {
      id: 'circ-2',
      circular_no: 'AICTE/PGRC/REFUND/2026/08',
      title: 'Mandatory Full Fee Refund on Seat Cancellation for AY 2026-27',
      category: 'STUDENT_WELFARE',
      date: '02 February 2026',
      summary:
        'Statutory directive mandating 100% refund of fees collected with a maximum processing deduction of Rs 1,000/- if cancellation is submitted within prescribed windows.',
      file_size: '640 KB (PDF)',
      badge_color: 'emerald',
    },
    {
      id: 'circ-3',
      circular_no: 'AICTE/REGL/CERT-RETAIN/2026/14',
      title: 'Strict Prohibition on Retention of Original Certificates by Technical Institutions',
      category: 'REGULATIONS',
      date: '10 March 2026',
      summary:
        'Strict prohibition on withholding original 10th, 12th, diploma, or degree certificates under any circumstances including fee disputes. Punitive action mandated.',
      file_size: '410 KB (PDF)',
      badge_color: 'rose',
    },
    {
      id: 'circ-4',
      circular_no: 'AICTE/PGRC/SGRC-NORMS/2026',
      title: 'Mandatory Establishment of Student Grievance Redressal Committee (SGRC) & Ombudsman',
      category: 'STUDENT_WELFARE',
      date: '18 March 2026',
      summary:
        'Every technical institution must constitute an active Student Grievance Redressal Committee (SGRC) chaired by a senior professor, with an appointed University Ombudsman.',
      file_size: '720 KB (PDF)',
      badge_color: 'amber',
    },
    {
      id: 'circ-5',
      circular_no: 'AICTE/VIGL/GHOST-FACULTY/2026/03',
      title: 'Surprise Biometric Scrutiny & Cross-PAN Verification of Faculty Cadres',
      category: 'VIGILANCE',
      date: '05 April 2026',
      summary:
        'Nationwide verification protocol against fraudulent duplicate faculty entries. Institutions with identical Aadhaar/PAN mappings face immediate FIR and de-recognition.',
      file_size: '890 KB (PDF)',
      badge_color: 'rose',
    },
    {
      id: 'circ-6',
      circular_no: 'AICTE/LEGL/WHISTLEBLOWER/2026/02',
      title: 'AICTE Whistleblower & Citizen Identity Protection Framework (Rule 14)',
      category: 'LEGAL',
      date: '20 April 2026',
      summary:
        'Official procedure for confidential filings in the SAMANVAY national portal. Mandatory redaction of student and whistleblower personal identifiers in legal records.',
      file_size: '520 KB (PDF)',
      badge_color: 'blue',
    },
  ];

  const categories = [
    { id: 'ALL', label: 'All Notifications' },
    { id: 'STUDENT_WELFARE', label: 'Student Welfare & Fees' },
    { id: 'APPROVALS', label: 'Approvals & Intake' },
    { id: 'REGULATIONS', label: 'Regulations & Norms' },
    { id: 'VIGILANCE', label: 'Vigilance & Biometrics' },
    { id: 'LEGAL', label: 'Legal & Whistleblower' },
  ];

  const filtered = circulars.filter((c) => {
    const matchesCat = selectedCategory === 'ALL' || c.category === selectedCategory;
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.circular_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.summary.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleDownload = (id: string, title: string) => {
    // Generate text brief download for demo
    const blob = new Blob([`AICTE OFFICIAL NOTIFICATION\n\nTitle: ${title}\nPortal: SAMANVAY Integrated Portal\nDate: ${new Date().toLocaleDateString()}\nStatus: Statutorily Valid in Council Gazette.`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${id}_AICTE_Circular.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccessId(id);
    setTimeout(() => setDownloadSuccessId(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950/40 border border-slate-800 p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="h-5 w-5 text-blue-400" />
          <span className="text-xs font-bold text-blue-300 uppercase tracking-widest">
            Official Regulatory Repository
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading">
          AICTE Circulars, Gazettes & Guidelines
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
          Official statutory orders, handbooks, fee refund mandates, and anti-ragging gazette notifications issued under the AICTE Act.
        </p>

        {/* Search */}
        <div className="mt-6 relative max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search circulars by title, number, or keyword..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* 2. Category Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 3. Circulars List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No circulars match the selected filter criteria.
          </div>
        ) : (
          filtered.map((item) => (
            <Card key={item.id} className="border-slate-800/80 bg-slate-900/60 p-5 hover:border-slate-700/80 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={item.badge_color} size="sm">
                      {item.category.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs font-mono text-slate-400">
                      {item.circular_no}
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-slate-500" />
                      {item.date}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white hover:text-blue-300 transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                    {item.summary}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] font-mono text-slate-500">
                    {item.file_size}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(item.id, item.title)}
                    leftIcon={
                      downloadSuccessId === item.id ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Download className="h-3.5 w-3.5 text-blue-400" />
                      )
                    }
                  >
                    {downloadSuccessId === item.id ? 'Downloaded' : 'Download'}
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

