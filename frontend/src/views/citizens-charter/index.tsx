'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../shared/ui/Card';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import {
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Search,
  Scale,
  Building,
  HelpCircle,
  PhoneCall,
  FileCheck,
} from 'lucide-react';

export const CitizensCharterPage: React.FC<{ onOpenLodge: () => void }> = ({ onOpenLodge }) => {
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const slaCategories = [
    {
      category: 'Ragging & Harassment',
      sla: '24 Hours',
      bureau: 'PGRC & Anti-Ragging Cell',
      priority: 'CRITICAL',
      mandate: 'Immediate FIR / Inquiry Committee within 24 hours under AICTE Ragging Regulations.',
      color: 'rose',
    },
    {
      category: 'Fee Extortion & Certificate Withholding',
      sla: '15 Working Days',
      bureau: 'Public Grievance Redressal Cell (PGRC)',
      priority: 'HIGH',
      mandate: 'Mandatory release of certificates within 7 days; 100% fee refund compliance order.',
      color: 'amber',
    },
    {
      category: 'Unapproved Courses & False Affiliation',
      sla: '21 Working Days',
      bureau: 'Approval Bureau',
      priority: 'HIGH',
      mandate: 'Show cause notice and public warning issued to prevent student misguidance.',
      color: 'blue',
    },
    {
      category: 'Faculty 7th CPC Salary Non-Disbursement',
      sla: '30 Working Days',
      bureau: 'Regulation Bureau',
      priority: 'HIGH',
      mandate: 'Cadre compliance and salary disbursement verification via PFMS / Bank audit.',
      color: 'indigo',
    },
    {
      category: 'Fraudulent Ghost Faculty & Forged Norms',
      sla: '30 Working Days',
      bureau: 'Vigilance Cell',
      priority: 'CRITICAL',
      mandate: 'Aadhaar / PAN deduplication and on-site surprise biometric inspection.',
      color: 'rose',
    },
  ];

  const escalationTiers = [
    {
      level: 'Tier 1',
      title: 'Desk Case Officer',
      timeline: 'Days 1 to 15',
      desc: 'Initial digital intake, evidence validation, and respondent institution notice.',
    },
    {
      level: 'Tier 2',
      title: 'Bureau Head / Regional Director',
      timeline: 'Days 16 to 30',
      desc: 'Formal show-cause hearings, joint multi-bureau review, and draft directions.',
    },
    {
      level: 'Tier 3',
      title: 'Member Secretary, AICTE',
      timeline: 'Day 31 (Overdue Breach)',
      desc: 'Statutory escalation trigger. Review of administrative delay and penalty sanctioning.',
    },
    {
      level: 'Tier 4',
      title: 'Chairman & Council Appellate Bench',
      timeline: 'Appellate Benchmark',
      desc: 'Final council appellate order, withdrawal of approval, or affiliation freeze.',
    },
  ];

  const faqs = [
    {
      q: 'Can an institution withhold my original 10th, 12th, or degree certificates?',
      a: 'STRICTLY PROHIBITED. Under AICTE Gazette Notification No. 14-4/NC/2020, institutions are strictly forbidden from retaining original educational certificates under any circumstances, including pending fee disputes. Any institution refusing to return original documents faces punitive action, including reduction of intake or total withdrawal of approval.',
    },
    {
      q: 'What is the AICTE policy on fee refunds when a student cancels admission?',
      a: 'If a student withdraws before the formal start of the academic session, the entire fee collected from the student, after deducting a maximum processing fee of not more than Rs 1,000/-, must be refunded within 15 days. Even after the start of the session, if the vacated seat is filled by another student, the fee must be refunded proportionate to the remaining semester duration.',
    },
    {
      q: 'Can I lodge a complaint confidentially without revealing my identity?',
      a: 'YES. SAMANVAY features an encrypted Whistleblower Protection Mode under Section 12 of the AICTE Vigilance Protocol. When lodged as confidential, your identity is encrypted and redacted from all respondent communications. You receive a cryptographic tracking number to check progress without disclosing your personal details.',
    },
    {
      q: 'What happens if a college operates an unapproved course or extra seats?',
      a: 'Such courses are null and void under the AICTE Act. The Approval Bureau issues an immediate Show Cause notice, freezes Extension of Approval (EoA), and publishes a public statutory warning on the AICTE portal to safeguard prospective students.',
    },
    {
      q: 'How does the 30-Day Citizen’s Charter guarantee work?',
      a: 'From the minute a complaint is registered, an immutable digital clock begins. If no final resolution or interim regulatory directive is issued within 30 calendar days, the system automatically triggers an alert to the Member Secretary and marks the case as an OVERDUE BREACH in public reports.',
    },
    {
      q: 'How can faculty members report non-payment or delayed disbursement of salaries?',
      a: 'Faculty can lodge grievances under the "Faculty Salary Withheld" category in the PGRC/Regulation Bureau. The complaint must include proof of appointment and bank statements. AICTE summons the governing body and directs compliance under 7th CPC norms.',
    },
  ];

  const filteredFaqs = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* 1. Hero Charter Card */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900 border border-blue-500/30 p-6 sm:p-8 relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-amber-400" />
            <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">
              Statutory Transparency & Accountability
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading">
            AICTE Citizen&apos;s Charter & SLA Matrix
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            All India Council for Technical Education is committed to transparent, time-bound, and corruption-free governance. Under the AICTE Citizen&apos;s Charter, every grievance against technical institutions is subject to strict statutory resolution windows.
          </p>
          <div className="pt-2 flex items-center gap-3 flex-wrap">
            <Button
              variant="primary"
              onClick={onOpenLodge}
              leftIcon={<Shield className="h-4 w-4" />}
            >
              Lodge Public Grievance
            </Button>
            <div className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              <span>30-Day Resolution Mandate Enforced by Cryptographic Clock</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Statutory SLA Matrix Table */}
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-bold text-white font-heading">
            Statutory Resolution Windows by Category
          </h3>
          <p className="text-xs text-slate-400">
            Mandatory maximum disposal timeframes governed by the Citizen&apos;s Charter 2026.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {slaCategories.map((item, idx) => (
            <Card key={idx} className="border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Badge variant={item.color as any} size="sm">
                    {item.priority}
                  </Badge>
                  <span className="text-xs font-mono font-bold text-white flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-blue-400" />
                    {item.sla}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">{item.category}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{item.mandate}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1">
                <span>Custodian:</span>
                <strong className="text-slate-200">{item.bureau}</strong>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 3. 4-Tier Escalation Hierarchy */}
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-bold text-white font-heading">
            4-Tier Automatic Escalation Hierarchy
          </h3>
          <p className="text-xs text-slate-400">
            If an inquiry is delayed, SAMANVAY escalates custody hierarchically without requiring applicant follow-up.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {escalationTiers.map((tier, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 relative"
            >
              <div className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider">
                {tier.level} • {tier.timeline}
              </div>
              <h4 className="text-sm font-bold text-white">{tier.title}</h4>
              <p className="text-xs text-slate-300">{tier.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Frequently Asked Questions (FAQs) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white font-heading">
              Frequently Asked Questions (FAQs)
            </h3>
            <p className="text-xs text-slate-400">
              Clear legal and regulatory clarifications for students, parents, and faculty.
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              placeholder="Search FAQs..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="space-y-2.5">
          {filteredFaqs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No matching questions found for &quot;{faqSearch}&quot;.
            </div>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/40"
                  >
                    <span className="text-sm font-bold text-white">{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-blue-400 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. Contact & Helpline Directory */}
      <Card className="border-slate-800 bg-slate-950/60 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-blue-400" />
              National Student & Citizen Grievance Helplines
            </h4>
            <p className="text-xs text-slate-400">
              Direct assistance during official working hours (Monday to Friday, 9:30 AM to 5:30 PM).
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-3.5 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
              <span className="text-slate-400 block text-[10px]">Toll-Free Helpline</span>
              <strong className="text-blue-300 font-mono text-sm">1800-111-555</strong>
            </div>
            <div className="px-3.5 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs">
              <span className="text-slate-400 block text-[10px]">Anti-Ragging 24x7</span>
              <strong className="text-rose-300 font-mono text-sm">1800-180-5522</strong>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

