'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../shared/ui/Card';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Modal } from '../../shared/ui/Modal';
import { formatDate } from '../../shared/lib/date-utils';
import { MOCK_COMPLAINTS } from '../../shared/api/mock-data';
import {
  Search,
  CheckCircle2,
  Clock,
  Shield,
  Building2,
  FileText,
  Printer,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Sparkles,
  QrCode,
  Stamp,
  Download,
} from 'lucide-react';

export const TrackComplaintPage: React.FC<{
  onOpenLodge: () => void;
  onSelectInstitution?: (id: number) => void;
}> = ({ onOpenLodge, onSelectInstitution }) => {
  const [trackingInput, setTrackingInput] = useState('AICTE/PGRC/2026/0001');
  const [activeTrackingNo, setActiveTrackingNo] = useState('AICTE/PGRC/2026/0001');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Find complaint in mock complaints or default to first
  const complaint =
    MOCK_COMPLAINTS.find(
      (c) =>
        c.complaint_no.toLowerCase().includes(activeTrackingNo.trim().toLowerCase()) ||
        String(c.id) === activeTrackingNo.trim()
    ) || MOCK_COMPLAINTS[0];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingInput.trim()) {
      setActiveTrackingNo(trackingInput.trim());
      setFeedbackSubmitted(false);
    }
  };

  const sampleNumbers = [
    { no: 'AICTE/PGRC/2026/0001', label: 'PGRC Fee Extortion' },
    { no: 'AICTE/AB/2026/0008', label: 'Approval Unapproved Course' },
    { no: 'AICTE/LC/2026/0003', label: 'Legal High Court Writ' },
    { no: 'AICTE/REGL/2026/0007', label: 'Regulation SLA Overdue' },
  ];

  // Pipeline stages
  const stages = [
    {
      title: 'Digital Intake',
      desc: 'Registered on Portal',
      status: 'completed',
      date: formatDate(complaint.created_at),
    },
    {
      title: 'Preliminary Scrutiny',
      desc: 'Bureau Allocated',
      status: 'completed',
      date: formatDate(complaint.created_at),
    },
    {
      title: 'Formal Inquiry',
      desc: complaint.status === 'LODGED' ? 'Pending Scrutiny' : 'Active Investigation',
      status: complaint.status === 'LODGED' ? 'pending' : 'current',
      date: 'In Progress',
    },
    {
      title: 'Hearing & Committee',
      desc: complaint.status === 'HEARING_SCHEDULED' ? 'Hearing Ongoing' : 'Scheduled if Contested',
      status: complaint.status === 'HEARING_SCHEDULED' ? 'current' : 'pending',
      date: 'As Applicable',
    },
    {
      title: 'Statutory Disposal',
      desc: complaint.status === 'RESOLVED' ? 'Final Order Dispatched' : 'Within 30-Day SLA',
      status: complaint.status === 'RESOLVED' ? 'completed' : 'pending',
      date: formatDate(complaint.sla_due_date),
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-900/60 via-slate-900 to-indigo-950/60 border border-blue-500/20 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Citizen & Student Self-Service
              </span>
              <span className="text-xs text-slate-400">• AICTE Citizen&apos;s Charter Guaranteed</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading">
              Track Grievance & Inquiries
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Real-time transparent monitoring of complaints lodged by students, parents, faculty, and citizens across all AICTE specialized cells.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={onOpenLodge}
            leftIcon={<FileText className="h-4 w-4" />}
            className="shrink-0 shadow-lg shadow-blue-600/30"
          >
            Lodge New Grievance
          </Button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mt-6">
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              placeholder="Enter Complaint Tracking No (e.g. AICTE/PGRC/2026/0001)..."
              className="w-full pl-12 pr-32 py-3.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-inner"
            />
            <button
              type="submit"
              className="absolute right-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              Track Case
            </button>
          </div>
        </form>

        {/* Quick presets */}
        <div className="mt-3 flex items-center gap-2 flex-wrap text-xs text-slate-400">
          <span>Quick Samples:</span>
          {sampleNumbers.map((s) => (
            <button
              key={s.no}
              onClick={() => {
                setTrackingInput(s.no);
                setActiveTrackingNo(s.no);
                setFeedbackSubmitted(false);
              }}
              className={`px-2.5 py-1 rounded-md border text-[11px] font-mono transition-all cursor-pointer ${
                activeTrackingNo === s.no
                  ? 'bg-blue-500/20 border-blue-400 text-blue-200'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {s.label} ({s.no})
            </button>
          ))}
        </div>
      </div>

      {/* 2. Tracking Result Details */}
      <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-slate-950/50 border-b border-slate-800/80 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="blue" size="md" className="font-mono">
                  {complaint.complaint_no}
                </Badge>
                <Badge
                  variant={
                    complaint.is_overdue
                      ? 'rose'
                      : complaint.status === 'RESOLVED'
                        ? 'emerald'
                        : 'amber'
                  }
                  size="md"
                >
                  {complaint.is_overdue
                    ? '⚠️ SLA Breached'
                    : complaint.status.replace('_', ' ')}
                </Badge>
                <span className="text-xs text-slate-400">
                  Priority: <strong className="text-white">{complaint.priority}</strong>
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-2">
                {complaint.subject}
              </h3>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<FileText className="h-4 w-4 text-blue-400" />}
                onClick={() => setIsReceiptModalOpen(true)}
              >
                Official Receipt
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Printer className="h-4 w-4" />}
                onClick={() => window.print()}
              >
                Print Slip
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Progress Tracker */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Grievance Lifecycle Progression
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {stages.map((stage, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border relative ${
                    stage.status === 'completed'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                      : stage.status === 'current'
                        ? 'bg-blue-500/15 border-blue-500/50 text-blue-200 shadow-md ring-1 ring-blue-500/30'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono font-bold">Step {idx + 1}</span>
                    {stage.status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : stage.status === 'current' ? (
                      <Clock className="h-4 w-4 text-blue-400 animate-pulse" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-slate-700" />
                    )}
                  </div>
                  <div className="font-bold text-xs text-white">{stage.title}</div>
                  <div className="text-[11px] opacity-80 mt-0.5">{stage.desc}</div>
                  <div className="text-[10px] font-mono opacity-60 mt-1">{stage.date}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Facts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Institution Card */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Building2 className="h-4 w-4 text-blue-400" />
                <span>Respondent Technical Institution</span>
              </div>
              <h4 className="text-sm font-bold text-white">
                {complaint.institution_name}
              </h4>
              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                <span>AICTE ID: {complaint.aicte_permanent_id}</span>
              </div>
              {onSelectInstitution && (
                <button
                  onClick={() => onSelectInstitution(complaint.institution_id)}
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer pt-1"
                >
                  Inspect Public College Dossier <ExternalLink className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* SLA & Charter Compliance Card */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Shield className="h-4 w-4 text-emerald-400" />
                <span>AICTE Citizen&apos;s Charter SLA Standing</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">
                    Mandatory 30-Day Statutory Limit
                  </div>
                  <div className="text-xs text-slate-400">
                    Statutory Due Date: <strong className="text-slate-200">{formatDate(complaint.sla_due_date)}</strong>
                  </div>
                </div>
                <div className="text-right">
                  {complaint.is_overdue ? (
                    <Badge variant="rose" size="md">
                      ⚠️ Overdue
                    </Badge>
                  ) : (
                    <Badge variant="emerald" size="md">
                      ✓ Compliant
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-[11px] text-slate-400 pt-1">
                Desk Officer In-Charge:{' '}
                <strong className="text-slate-200">
                  {complaint.assigned_officer_name || 'Desk Officer (Allocated)'}
                </strong>{' '}
                • {complaint.bureau}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80">
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Grievance Narrative Abstract
            </h5>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {complaint.description}
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Shield className="h-3.5 w-3.5" />
                Whistleblower & Citizen Identity Encrypted under AICTE Whistleblower Protocol
              </span>
              <span>Lodged Date: {formatDate(complaint.created_at)}</span>
            </div>
          </div>

          {/* Citizen Actions */}
          <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h5 className="text-xs font-bold text-blue-200">Have Additional Evidence or Inquiries?</h5>
              <p className="text-[11px] text-blue-300/80">
                You can submit supplemental documents or request an escalation if your case exceeds the statutory 30-day timeline.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {feedbackSubmitted ? (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Expedite Request Logged
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setFeedbackSubmitted(true)}
                  leftIcon={<Clock className="h-3.5 w-3.5 text-amber-400" />}
                >
                  Request SLA Expedite
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Official Government Acknowledgment Receipt Modal */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Official Statutory Acknowledgment Receipt"
        description="Government of India • Ministry of Education • AICTE SAMANVAY Central Inquiries Docket"
        size="lg"
      >
        <div className="space-y-4 pt-2">
          {/* Printable Receipt Paper Container */}
          <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl space-y-5 text-slate-200 relative overflow-hidden">
            {/* Top Tricolor Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 flex">
              <div className="flex-1 bg-[#FF9933]" />
              <div className="flex-1 bg-white" />
              <div className="flex-1 bg-[#138808]" />
            </div>

            {/* Official Header */}
            <div className="text-center space-y-1 pb-3 border-b border-slate-800">
              <div className="text-xl">🇮🇳</div>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Government of India • Ministry of Education
              </p>
              <h3 className="text-base font-bold text-white font-heading">
                ALL INDIA COUNCIL FOR TECHNICAL EDUCATION
              </h3>
              <p className="text-[11px] text-blue-400 font-mono">
                SAMANVAY Unified Grievance & Regulatory Compliance Intake
              </p>
            </div>

            {/* Docket Summary */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                  Docket Tracking Number
                </span>
                <span className="font-mono font-bold text-white text-sm">
                  {complaint.complaint_no}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                  Registration Date
                </span>
                <span className="font-mono text-slate-200">
                  {formatDate(complaint.created_at)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                  Allocated Custody Bureau
                </span>
                <span className="font-bold text-blue-300">
                  {complaint.bureau}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                  Statutory SLA Target
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  {formatDate(complaint.sla_due_date)} (30 Days)
                </span>
              </div>
            </div>

            {/* Institution Under Scrutiny */}
            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-xs space-y-1">
              <span className="text-slate-500 text-[10px] uppercase font-semibold block">
                Respondent Technical Institution
              </span>
              <p className="font-bold text-white">{complaint.institution_name}</p>
              <p className="text-slate-400 font-mono text-[11px]">
                AICTE Permanent ID: {complaint.aicte_permanent_id}
              </p>
            </div>

            {/* Grievance Subject */}
            <div className="text-xs space-y-1">
              <span className="text-slate-500 text-[10px] uppercase font-semibold block">
                Grievance Matter / Allegations
              </span>
              <p className="text-slate-300 font-medium">{complaint.subject}</p>
            </div>

            {/* Cryptographic Seal & Verification QR */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                  <Stamp className="h-4 w-4" />
                  <span>Digitally Certified by AICTE Central Intake Server</span>
                </div>
                <p className="text-[10px] font-mono text-slate-500">
                  SHA-256: 4f89d32be91cb071e62a8731d94cf21a9
                </p>
              </div>

              {/* QR Code Graphic Placeholder */}
              <div className="p-1.5 bg-white rounded shadow-sm shrink-0">
                <QrCode className="h-12 w-12 text-slate-950" />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400">
              Valid for legal submission and formal RTI inquiries.
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReceiptModalOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Printer className="h-4 w-4" />}
                onClick={() => window.print()}
              >
                Print Receipt
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
