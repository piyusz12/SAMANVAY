'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';
import { useAppStore } from '../../shared/lib/store';
import { useInstitutions } from '../../entities/institution';
import { BUREAUS, COMPLAINT_CATEGORIES } from '../../shared/config/constants';
import { Modal } from '../../shared/ui/Modal';
import { Button } from '../../shared/ui/Button';
import { Input, Textarea, Select } from '../../shared/ui/FormControls';
import { Alert } from '../../shared/ui/Alert';
import { Badge } from '../../shared/ui/Badge';
import {
  ShieldCheck,
  ShieldAlert,
  Paperclip,
  CheckCircle2,
  KeyRound,
  FileCheck,
  Lock,
  Building2,
  Search,
  MapPin,
  Copy,
  Sparkles,
} from 'lucide-react';

export interface LodgeComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialInstitutionId?: number | null;
}

export const LodgeComplaintModal: React.FC<LodgeComplaintModalProps> = ({
  isOpen,
  onClose,
  initialInstitutionId,
}) => {
  const queryClient = useQueryClient();
  const { currentUser } = useAppStore();
  const { data: institutions = [] } = useInstitutions();

  const [formData, setFormData] = useState({
    institution_id: '',
    bureau:
      currentUser.bureau !== 'CENTRAL_ADMIN' && currentUser.bureau !== 'AICTE HQ'
        ? currentUser.bureau
        : 'PGRC',
    complainant_name: '',
    complainant_category: 'Student',
    complainant_phone: '',
    complainant_email: '',
    category: COMPLAINT_CATEGORIES[0].code,
    subject: '',
    description: '',
    priority: 'HIGH',
    is_anonymous_confidential: false,
  });

  // Institution Search State
  const [instSearchQuery, setInstSearchQuery] = useState('');
  const [isChangingInst, setIsChangingInst] = useState(false);

  // Success Confirmation State
  const [registeredComplaint, setRegisteredComplaint] = useState<{
    complaint_no: string;
    institution_name: string;
    subject: string;
    bureau: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // OTP Simulation State
  const [otpStage, setOtpStage] = useState<'idle' | 'sent' | 'verified'>('idle');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);

  // Evidence Attachment Simulation State
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    size: string;
    hash: string;
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync initialInstitutionId when passed or opened
  useEffect(() => {
    if (isOpen) {
      if (initialInstitutionId) {
        setFormData((prev) => ({ ...prev, institution_id: String(initialInstitutionId) }));
        setIsChangingInst(false);
      }
    } else {
      setRegisteredComplaint(null);
      setErrorMsg(null);
      setCopiedId(false);
    }
  }, [isOpen, initialInstitutionId]);

  // Selected Institution Object
  const selectedInstitution = useMemo(() => {
    return institutions.find((i) => String(i.id) === formData.institution_id);
  }, [institutions, formData.institution_id]);

  // Filtered institutions for search
  const filteredInstitutions = useMemo(() => {
    const q = instSearchQuery.toLowerCase().trim();
    if (!q) {
      return institutions.slice(0, 15);
    }
    return institutions.filter((inst) => {
      const matchName = inst.name.toLowerCase().includes(q);
      const matchId = (inst.aicte_permanent_id || (inst as any).aicte_id || '').toLowerCase().includes(q);
      const matchCity = (inst.city || '').toLowerCase().includes(q);
      const matchState = (inst.state || '').toLowerCase().includes(q);
      const matchAishe = (inst.aishe_code || '').toLowerCase().includes(q);
      return matchName || matchId || matchCity || matchState || matchAishe;
    });
  }, [institutions, instSearchQuery]);

  const isWhistleblower =
    formData.complainant_category === 'Whistleblower' || formData.is_anonymous_confidential;

  const handleSendOtp = () => {
    if (!formData.complainant_phone || formData.complainant_phone.trim().length < 10) {
      setOtpError('Please enter a valid 10-digit mobile number before requesting OTP.');
      return;
    }
    setOtpError(null);
    setOtpStage('sent');
  };

  const handleVerifyOtp = () => {
    if (enteredOtp.trim() === '123456' || enteredOtp.trim().length === 6) {
      setOtpStage('verified');
      setOtpError(null);
    } else {
      setOtpError('Invalid OTP code. Enter demo OTP: 123456');
    }
  };

  const handleSimulateAttach = () => {
    setAttachedFile({
      name: 'Fee_Demand_Notice_Receipt.pdf',
      size: '2.4 MB',
      hash: 'SHA256: 8f4e2b...d91c',
    });
  };

  const handleCopyComplaintId = () => {
    if (registeredComplaint?.complaint_no) {
      navigator.clipboard.writeText(registeredComplaint.complaint_no);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    }
  };

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiClient.post('/api/v1/complaints', payload);
    },
    // Optimistic UI pattern mandated by blueprint
    onMutate: async (newComplaint) => {
      await queryClient.cancelQueries({ queryKey: ['complaints'] });
      const previousComplaints = queryClient.getQueryData(['complaints']);
      queryClient.setQueriesData({ queryKey: ['complaints'] }, (old: any) => {
        const optimisticItem = {
          ...newComplaint,
          id: Date.now(),
          complaint_no: `AICTE/${newComplaint.bureau}/2026/OPT-${Math.floor(Math.random() * 900 + 100)}`,
          status: 'LODGED',
          created_at: new Date().toISOString(),
        };
        if (!old) return { items: [optimisticItem], total: 1 };
        return {
          ...old,
          items: [optimisticItem, ...(old.items || [])],
          total: (old.total || 0) + 1,
        };
      });
      return { previousComplaints };
    },
    onError: (_err, _newComplaint, context: any) => {
      if (context?.previousComplaints === undefined) {
        queryClient.removeQueries({ queryKey: ['complaints'], exact: true });
      } else {
        queryClient.setQueryData(['complaints'], context.previousComplaints);
      }
      setErrorMsg('Failed to lodge complaint. Please check your network or try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    },
    onSuccess: (data: any) => {
      const compNo =
        data?.complaint_no ||
        `AICTE/${formData.bureau}/2026/${Math.floor(1000 + Math.random() * 9000)}`;
      const instName = selectedInstitution?.name || 'Selected Technical Institution';
      setRegisteredComplaint({
        complaint_no: compNo,
        institution_name: instName,
        subject: formData.subject,
        bureau: formData.bureau,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.institution_id) {
      setErrorMsg('Please select a valid technical institution / university.');
      return;
    }
    if (!formData.subject.trim() || !formData.description.trim()) {
      setErrorMsg('Subject and detailed grievance allegations are mandatory.');
      return;
    }

    setErrorMsg(null);
    mutation.mutate({
      ...formData,
      complainant_name: isWhistleblower
        ? 'Whistleblower (Identity Encrypted)'
        : formData.complainant_name || 'Anonymous Citizen',
      institution_id: Number(formData.institution_id),
      is_anonymous_confidential: isWhistleblower,
    });
  };

  const handleResetAndClose = () => {
    setRegisteredComplaint(null);
    setFormData({
      institution_id: '',
      bureau:
        currentUser.bureau !== 'CENTRAL_ADMIN' && currentUser.bureau !== 'AICTE HQ'
          ? currentUser.bureau
          : 'PGRC',
      complainant_name: '',
      complainant_category: 'Student',
      complainant_phone: '',
      complainant_email: '',
      category: COMPLAINT_CATEGORIES[0].code,
      subject: '',
      description: '',
      priority: 'HIGH',
      is_anonymous_confidential: false,
    });
    setInstSearchQuery('');
    setIsChangingInst(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title={
        registeredComplaint
          ? 'Grievance Registration Confirmed'
          : 'Lodge New Inter-Bureau Complaint / Case'
      }
      description={
        registeredComplaint
          ? 'Statutory intake officially logged into AICTE national coordination portal.'
          : 'Single-window intake across AICTE cells. Select any technical university or college across India to register a formal grievance.'
      }
      size="xl"
    >
      {registeredComplaint ? (
        <div className="space-y-5 pt-2 pb-1">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                  Officially Registered &amp; Clock Started
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  SLA: 30 Calendar Days
                </span>
              </div>
              <h3 className="text-base font-bold text-white">
                Grievance Case Successfully Registered
              </h3>
              <p className="text-xs text-slate-300">
                Your complaint has been assigned a national tracking number and logged across AICTE bureaus.
              </p>
            </div>
          </div>

          {/* Official Complaint Tracking Number Display */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Permanent AICTE Case Tracking ID:
              </span>
              <button
                type="button"
                onClick={handleCopyComplaintId}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copiedId ? 'Copied to Clipboard!' : 'Copy Case ID'}</span>
              </button>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-xl font-extrabold font-mono text-emerald-400 tracking-wide">
                {registeredComplaint.complaint_no}
              </span>
              <Badge variant="emerald" size="md">
                STATUS: LODGED
              </Badge>
            </div>
          </div>

          {/* Case Summary Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-500 block uppercase font-semibold">Respondent Institution</span>
              <span className="font-bold text-white text-sm mt-0.5 block">{registeredComplaint.institution_name}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-500 block uppercase font-semibold">Jurisdictional AICTE Bureau</span>
              <span className="font-bold text-blue-400 text-sm mt-0.5 block">{registeredComplaint.bureau}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 sm:col-span-2">
              <span className="text-[11px] text-slate-500 block uppercase font-semibold">Subject Matter Allegation</span>
              <span className="font-medium text-slate-200 mt-0.5 block">{registeredComplaint.subject}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRegisteredComplaint(null);
                setFormData((prev) => ({ ...prev, subject: '', description: '' }));
              }}
            >
              Lodge Another Case
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleResetAndClose}
            >
              Done &amp; View Registry
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

          {/* 1. Intelligent Searchable Institution Selector */}
          <div className="space-y-2">
            {selectedInstitution && !isChangingInst ? (
              <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/40 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 shrink-0 mt-0.5">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Selected Institution
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        AICTE ID: <strong className="text-white">{selectedInstitution.aicte_permanent_id || (selectedInstitution as any).aicte_id}</strong>
                      </span>
                      {selectedInstitution.aishe_code && (
                        <span className="text-xs text-slate-400 font-mono">
                          • AISHE: <strong className="text-slate-300">{selectedInstitution.aishe_code}</strong>
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-white">
                      {selectedInstitution.name}
                    </h4>
                    <p className="text-xs text-slate-300 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      <span>{selectedInstitution.address || `${selectedInstitution.city}, ${selectedInstitution.state}`}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingInst(true);
                    setInstSearchQuery('');
                  }}
                  className="px-2.5 py-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/60 rounded-lg border border-blue-500/30 font-semibold cursor-pointer shrink-0 transition-colors"
                >
                  Change University
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-200">
                    Select University / Technical College *
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {institutions.length} Accredited Campuses Available
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search university (e.g. VNIT, Ramdeobaba, COEP, IIT, BITS) or city (Nagpur, Pune, Mumbai, Delhi)..."
                    value={instSearchQuery}
                    onChange={(e) => setInstSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus={isChangingInst}
                  />
                </div>

                {/* Filtered Institutions Quick Picker List */}
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/90 divide-y divide-slate-800/80">
                  {filteredInstitutions.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500">
                      No technical institutions found matching &ldquo;{instSearchQuery}&rdquo;.
                    </div>
                  ) : (
                    filteredInstitutions.map((inst) => (
                      <button
                        key={inst.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, institution_id: String(inst.id) });
                          setIsChangingInst(false);
                          setInstSearchQuery('');
                          setErrorMsg(null);
                        }}
                        className="w-full p-2.5 text-left hover:bg-blue-600/15 transition-colors cursor-pointer flex items-center justify-between gap-2 group"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="text-xs font-bold text-white group-hover:text-blue-300 truncate">
                            {inst.name}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span className="text-emerald-400 font-mono">
                              ID: {inst.aicte_permanent_id || (inst as any).aicte_id}
                            </span>
                            <span>•</span>
                            <span>{inst.city}, {inst.state}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
                          Select →
                        </span>
                      </button>
                    ))
                  )}
                </div>

                {/* Popular Shortcuts */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] text-slate-400">
                  <span className="text-slate-500 font-medium">Quick Pick:</span>
                  {[
                    { label: 'VNIT Nagpur', q: 'VNIT' },
                    { label: 'Ramdeobaba / RCOEM', q: 'Ramdeobaba' },
                    { label: 'COEP Pune', q: 'COEP' },
                    { label: 'IIT Bombay', q: 'IIT Bombay' },
                    { label: 'IIT Delhi', q: 'IIT Delhi' },
                    { label: 'BITS Pilani', q: 'BITS' },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setInstSearchQuery(chip.q)}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[10px] transition-colors cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Target Bureau and Grievance Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Target AICTE Bureau / Cell *"
              value={formData.bureau}
              onChange={(e) => setFormData({ ...formData, bureau: e.target.value })}
              required
            >
              {Object.values(BUREAUS).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.id})
                </option>
              ))}
            </Select>

            <Select
              label="Grievance Category *"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            >
              {COMPLAINT_CATEGORIES.map((cat) => (
                <option key={cat.code} value={cat.code}>
                  {cat.label}
                </option>
              ))}
            </Select>
          </div>

          {/* 3. Complainant Classification & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={
                isWhistleblower
                  ? 'Identity Redacted (Whistleblower Protection)'
                  : 'Complainant Full Name *'
              }
              placeholder={
                isWhistleblower
                  ? 'Identity Encrypted (Act 2014)'
                  : 'e.g. Ramesh Chandra / Parent / Student'
              }
              value={formData.complainant_name}
              disabled={isWhistleblower}
              onChange={(e) => setFormData({ ...formData, complainant_name: e.target.value })}
              required={!isWhistleblower}
            />

            <Select
              label="Complainant Standing"
              value={formData.complainant_category}
              onChange={(e) => {
                const cat = e.target.value;
                setFormData({
                  ...formData,
                  complainant_category: cat,
                  is_anonymous_confidential: cat === 'Whistleblower',
                });
              }}
            >
              <option value="Student">Student (Enrolled / Alumni)</option>
              <option value="Faculty">Faculty Member / Professor</option>
              <option value="Parent">Parent / Legal Guardian</option>
              <option value="Citizen">Citizen / Concerned Public</option>
              <option value="Whistleblower">Anonymous Whistleblower</option>
            </Select>
          </div>

          {/* 4. Whistleblower Protection Banner or Mobile OTP Verification */}
          {isWhistleblower ? (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <Lock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200">
                <span className="font-bold block">Whistleblower Protection Act (2014) Engaged</span>
                Your identity, IP coordinates, and personal identifiers will be cryptographically redacted from all records shared with the respondent technical college.
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <ShieldCheck className="h-4 w-4 text-blue-400" />
                  <span>Citizen Mobile e-Authentication (National SMS Gateway)</span>
                </div>
                {otpStage === 'verified' ? (
                  <Badge variant="emerald" size="sm" className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Mobile Verified
                  </Badge>
                ) : (
                  <span className="text-[11px] text-slate-400">Optional for faster tracking</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Mobile Number (for SMS Tracking)"
                  placeholder="e.g. 9876543210"
                  value={formData.complainant_phone}
                  onChange={(e) => setFormData({ ...formData, complainant_phone: e.target.value })}
                  disabled={otpStage === 'verified'}
                />
                <Input
                  label="Email Address (for Official Notices)"
                  placeholder="e.g. citizen@example.com"
                  value={formData.complainant_email}
                  onChange={(e) => setFormData({ ...formData, complainant_email: e.target.value })}
                />

                <div className="flex flex-col justify-end">
                  {otpStage === 'idle' ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={handleSendOtp}
                      leftIcon={<KeyRound className="h-3.5 w-3.5 text-blue-400" />}
                    >
                      Send OTP (Demo)
                    </Button>
                  ) : otpStage === 'sent' ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="OTP (123456)"
                        value={enteredOtp}
                        onChange={(e) => setEnteredOtp(e.target.value)}
                        className="w-24 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white text-center font-mono"
                      />
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleVerifyOtp}
                      >
                        Verify
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1 h-9">
                      <CheckCircle2 className="h-4 w-4" /> Authenticated
                    </div>
                  )}
                </div>
              </div>

              {otpError && <p className="text-[11px] text-rose-400 font-semibold">{otpError}</p>}
              {otpStage === 'sent' && (
                <p className="text-[11px] text-amber-300">
                  Demo code: Click Verify with <span className="font-mono font-bold underline">123456</span>
                </p>
              )}
            </div>
          )}

          {/* 5. Subject and Description */}
          <Input
            label="Grievance Subject Line *"
            placeholder="e.g. Exorbitant cash capitation fee demanded for CSE intake"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            required
          />

          <Textarea
            label="Substantive Allegations &amp; Evidence Summary *"
            rows={3}
            placeholder="Provide specific factual details regarding violations, amounts, dates, affected students, or non-compliance..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />

          {/* 6. Supporting Evidentiary Documents Attachment */}
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-blue-400" />
              {attachedFile ? (
                <div className="flex items-center gap-2 text-slate-200">
                  <FileCheck className="h-4 w-4 text-emerald-400" />
                  <span className="font-semibold">{attachedFile.name}</span>
                  <span className="text-slate-400 font-mono text-[10px]">({attachedFile.size})</span>
                  <Badge variant="blue" size="sm" className="font-mono text-[9px]">
                    {attachedFile.hash}
                  </Badge>
                </div>
              ) : (
                <span className="text-slate-400">
                  Supporting Evidence: Receipts, fee notices, correspondence (PDF/JPG up to 25MB)
                </span>
              )}
            </div>

            {!attachedFile ? (
              <button
                type="button"
                onClick={handleSimulateAttach}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer underline"
              >
                + Attach Evidence Doc
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
              >
                Remove
              </button>
            )}
          </div>

          {/* 7. Footer & Submission */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-400">
              30-day statutory SLA clock will initiate automatically upon registration.
            </div>
            <div className="flex gap-2.5">
              <Button type="button" variant="outline" onClick={handleResetAndClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={mutation.isPending}>
                Register Case
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};

