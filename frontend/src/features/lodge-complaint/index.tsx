'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';

export const LodgeComplaintModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
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
    },
    onSuccess: () => {
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.institution_id) {
      setErrorMsg('Please select a valid technical institution.');
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lodge New Inter-Bureau Complaint"
      description="Single-window intake across AICTE cells. The system will automatically index institutional history and scan for cross-bureau conflicts."
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

        {/* 1. Institution and Target Bureau */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Technical Institution *"
            value={formData.institution_id}
            onChange={(e) => setFormData({ ...formData, institution_id: e.target.value })}
            required
          >
            <option value="">-- Select Technical Institution --</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name} (ID: {inst.aicte_permanent_id})
              </option>
            ))}
          </Select>

          <Select
            label="Target AICTE Bureau *"
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
        </div>

        {/* 2. Complainant Classification & Category */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label={
              isWhistleblower
                ? 'Identity Redacted (Whistleblower Protection)'
                : 'Complainant Name *'
            }
            placeholder={
              isWhistleblower
                ? 'Identity Encrypted (Act 2014)'
                : 'e.g. Ramesh Chandra / Parent'
            }
            value={formData.complainant_name}
            disabled={isWhistleblower}
            onChange={(e) => setFormData({ ...formData, complainant_name: e.target.value })}
            required={!isWhistleblower}
          />

          <Select
            label="Complainant Category"
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
            <option value="Student">Student</option>
            <option value="Faculty">Faculty Member</option>
            <option value="Parent">Parent / Guardian</option>
            <option value="Citizen">Citizen / Activist</option>
            <option value="Whistleblower">Anonymous Whistleblower</option>
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

        {/* 3. Whistleblower Protection Banner or Mobile OTP Verification */}
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

        {/* 4. Subject and Description */}
        <Input
          label="Grievance Subject Line *"
          placeholder="e.g. Exorbitant cash capitation fee demanded for CSE intake"
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          required
        />

        <Textarea
          label="Substantive Allegations & Evidence Summary *"
          rows={3}
          placeholder="Provide specific factual details regarding violations, amounts, dates, affected students, or non-compliance..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />

        {/* 5. Supporting Evidentiary Documents Attachment */}
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

        {/* 6. Footer & Submission */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            30-day statutory SLA clock will initiate automatically upon registration.
          </div>
          <div className="flex gap-2.5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={mutation.isPending}>
              Register Case
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
