'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';
import { Modal } from '../../shared/ui/Modal';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { Input, Textarea, Select } from '../../shared/ui/FormControls';
import { ComplaintStatusBadge, SlaBadge } from '../../entities/complaint';
import { formatDate, formatDateTime, calculateSla } from '../../shared/lib/date-utils';
import { useAppStore } from '../../shared/lib/store';
import {
  FileText,
  Building2,
  ShieldCheck,
  UploadCloud,
  Download,
  AlertTriangle,
  ArrowRightLeft,
  RefreshCw,
  Sparkles,
  UserCheck,
  CheckCircle2,
  History,
  Paperclip,
  Clock,
  ShieldAlert,
  FileCheck2,
} from 'lucide-react';

export interface ComplaintDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaintId: number | null;
  onOpenTransition?: (comp: any) => void;
  onOpenTransfer?: (comp: any) => void;
  onOpenOverlapReview?: (id: number, no: string) => void;
}

export const ComplaintDetailModal: React.FC<ComplaintDetailModalProps> = ({
  isOpen,
  onClose,
  complaintId,
  onOpenTransition,
  onOpenTransfer,
  onOpenOverlapReview,
}) => {
  const queryClient = useQueryClient();
  const currentUser = useAppStore((s) => s.currentUser);
  const token = useAppStore((s) => s.token);
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'timeline'>('overview');

  // File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadIsConfidential, setUploadIsConfidential] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Officer assignment state
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);

  // Fetch full complaint detail with histories
  const { data: complaint, isLoading: isDetailLoading, error: detailError } = useQuery<any>({
    queryKey: ['complaint-detail', complaintId],
    queryFn: () => apiClient.get<any>(`/api/v1/complaints/${complaintId}/detail`),
    enabled: isOpen && !!complaintId,
  });

  // Fetch evidence attachments
  const { data: attachments = [], isLoading: isEvidenceLoading, refetch: refetchEvidence } = useQuery<any[]>({
    queryKey: ['complaint-evidence', complaintId],
    queryFn: () => apiClient.get<any[]>(`/api/v1/evidence/complaint/${complaintId}`),
    enabled: isOpen && !!complaintId,
  });

  // Fetch movements history
  const { data: movements = [], isLoading: isMovementsLoading } = useQuery<any[]>({
    queryKey: ['complaint-movements', complaintId],
    queryFn: () => apiClient.get<any[]>(`/api/v1/movements?complaint_id=${complaintId}`),
    enabled: isOpen && !!complaintId,
  });

  // Fetch bureau officers for assignment
  const { data: officers = [] } = useQuery<any[]>({
    queryKey: ['bureau-officers', complaint?.bureau],
    queryFn: () => apiClient.get<any[]>(`/api/v1/complaints/officers?bureau=${complaint?.bureau}`),
    enabled: isOpen && !!complaint?.bureau && (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'BUREAU_ADMIN'),
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/evidence/complaint/${complaintId}/upload`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      );
      if (!response.ok) {
        const text = await response.text();
        let errMsg = `Upload failed: HTTP ${response.status}`;
        try {
          const json = JSON.parse(text);
          errMsg = json.detail || errMsg;
        } catch {
          // ignore
        }
        throw new Error(errMsg);
      }
      return await response.json();
    },
    onSuccess: () => {
      setUploadSuccess('Evidence uploaded, verified, and cryptographic checksum recorded.');
      setUploadError(null);
      setUploadFile(null);
      setUploadDescription('');
      setUploadIsConfidential(false);
      refetchEvidence();
      queryClient.invalidateQueries({ queryKey: ['complaint-detail', complaintId] });
    },
    onError: (err: any) => {
      setUploadError(err.message || 'Failed to upload document.');
      setUploadSuccess(null);
    },
  });

  // Assign officer mutation
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOfficerId) throw new Error('Please select an authorized case officer.');
      return await apiClient.post(`/api/v1/complaints/${complaintId}/assign`, {
        officer_id: Number(selectedOfficerId),
        assignment_notes: assignmentNotes,
      });
    },
    onSuccess: () => {
      setIsAssigning(false);
      setSelectedOfficerId('');
      setAssignmentNotes('');
      setAssignError(null);
      queryClient.invalidateQueries({ queryKey: ['complaint-detail', complaintId] });
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
    },
    onError: (err: any) => {
      setAssignError(err.message || 'Assignment failed.');
    },
  });

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a file to upload.');
      return;
    }
    const formData = new FormData();
    formData.append('file', uploadFile);
    if (uploadDescription) formData.append('description', uploadDescription);
    formData.append('is_confidential', String(uploadIsConfidential));
    uploadMutation.mutate(formData);
  };

  const slaInfo = complaint ? calculateSla(complaint.created_at, complaint.sla_due_date, complaint.status) : null;
  const isSuperOrBureauAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'BUREAU_ADMIN';
  const isAuditor = currentUser.role === 'AUDITOR';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={complaint ? `Case File: ${complaint.complaint_no}` : 'Complaint Detail'}
      description="360-Degree Jurisdictional Dossier, Evidence Vault, and Statutory SLA Tracking"
      size="2xl"
    >
      {isDetailLoading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading complete case dossier...</div>
      ) : detailError || !complaint ? (
        <div className="p-6 text-center text-xs text-rose-400">
          Unable to retrieve complaint record. Please verify network or operational permissions.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top Status & SLA Banner */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-extrabold text-white font-mono">{complaint.complaint_no}</span>
              <Badge variant="blue" size="sm">
                {complaint.bureau || complaint.bureau_id}
              </Badge>
              <ComplaintStatusBadge status={complaint.status} size="sm" />
              <Badge variant="purple" size="sm">
                Priority: {complaint.priority || 'MEDIUM'}
              </Badge>
            </div>

            {slaInfo && (
              <div className="flex items-center gap-3">
                <SlaBadge createdAt={complaint.created_at} dueDate={complaint.sla_due_date} status={complaint.status} size="sm" />
                <span className="text-xs text-slate-400 font-mono">
                  SLA Target: <strong className="text-slate-200">{formatDate(complaint.sla_due_date)}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 gap-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Case Overview & SLA
            </button>
            <button
              onClick={() => setActiveTab('evidence')}
              className={`px-4 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'evidence'
                  ? 'border-blue-500 text-blue-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Paperclip className="h-3.5 w-3.5" />
              Evidence Vault ({attachments.length})
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-4 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'timeline'
                  ? 'border-blue-500 text-blue-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              Timeline & Movements ({movements.length})
            </button>
          </div>

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-4 pt-1">
              {/* Subject & Narrative */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-2">
                <h4 className="text-sm font-bold text-white">{complaint.subject}</h4>
                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {complaint.description}
                </p>
                <div className="pt-2 flex items-center gap-4 text-[11px] text-slate-400 border-t border-slate-800/60 flex-wrap">
                  <span>Category: <strong className="text-slate-200">{complaint.category?.replace(/_/g, ' ')}</strong></span>
                  <span>•</span>
                  <span>Lodged: <strong className="text-slate-200">{formatDateTime(complaint.created_at)}</strong></span>
                  <span>•</span>
                  <span>Last Updated: <strong className="text-slate-200">{formatDateTime(complaint.updated_at)}</strong></span>
                </div>
              </div>

              {/* Institution and Complainant Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Institution Details */}
                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Building2 className="h-4 w-4 text-blue-400" />
                    <span>Technical Institution</span>
                  </div>
                  <div className="text-xs text-slate-200 font-semibold">
                    {complaint.institution_name || 'Institution not recorded'}
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
                    <div>AICTE ID: {complaint.institution_aicte_id || complaint.aicte_id || 'Not recorded'}</div>
                    <div>Region: {complaint.region || 'National Jurisdiction'}</div>
                  </div>
                </div>

                {/* Complainant Details */}
                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Complainant Disclosure</span>
                  </div>
                  <div className="text-xs text-slate-200 flex items-center gap-2">
                    <span>{complaint.complainant_name || 'Anonymous Grievance'}</span>
                    {complaint.is_anonymous_confidential && (
                      <Badge variant="rose" size="sm">
                        🔒 Confidential / Whistleblower
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-0.5">
                    <div>Category: <strong className="text-slate-300">{complaint.complainant_category || 'Not specified'}</strong></div>
                    <div>Email: <span className="font-mono text-slate-300">{complaint.complainant_email || 'Protected'}</span></div>
                  </div>
                </div>
              </div>

              {/* Desk Officer Assignment Section */}
              <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <UserCheck className="h-4 w-4 text-purple-400" />
                    <span>Assigned Desk Officer</span>
                  </div>
                  {isSuperOrBureauAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsAssigning(!isAssigning)}
                      className="text-xs h-7"
                    >
                      {complaint.assigned_officer_name ? 'Reassign Officer' : 'Assign Officer'}
                    </Button>
                  )}
                </div>

                <div className="text-xs text-slate-300 flex items-center gap-3">
                  {complaint.assigned_officer_name ? (
                    <div>
                      <span className="font-bold text-white">{complaint.assigned_officer_name}</span>
                      <span className="text-slate-400 ml-2 font-mono text-[11px]">
                        ({complaint.assigned_officer_designation || 'Desk Officer'} • {complaint.bureau})
                      </span>
                    </div>
                  ) : (
                    <span className="text-amber-400 text-xs italic">
                      ⚠️ No officer currently assigned. Pending bureau intake triage.
                    </span>
                  )}
                </div>

                {/* Inline Assignment Form */}
                {isAssigning && (
                  <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-700 space-y-2.5">
                    <h5 className="text-xs font-bold text-white">Select Bureau Officer Directive</h5>
                    <Select
                      label="Available Case Officers"
                      value={selectedOfficerId}
                      onChange={(e) => setSelectedOfficerId(e.target.value)}
                    >
                      <option value="">-- Select Officer --</option>
                      {officers.map((off) => (
                        <option key={off.id} value={off.id}>
                          {off.full_name} ({off.designation || off.role})
                        </option>
                      ))}
                    </Select>
                    <Input
                      label="Assignment Directive / Notes"
                      placeholder="e.g. Conduct compliance verification on faculty payroll records..."
                      value={assignmentNotes}
                      onChange={(e) => setAssignmentNotes(e.target.value)}
                    />
                    {assignError && <p className="text-xs text-rose-400">{assignError}</p>}
                    <div className="flex justify-end gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => setIsAssigning(false)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => assignMutation.mutate()}
                        disabled={assignMutation.isPending || !selectedOfficerId}
                      >
                        {assignMutation.isPending ? 'Assigning...' : 'Confirm Assignment'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs text-slate-400 font-medium">Available Actions:</span>
                <div className="flex items-center gap-2">
                  {onOpenOverlapReview && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenOverlapReview(complaint.id, complaint.complaint_no)}
                      leftIcon={<Sparkles className="h-3.5 w-3.5 text-blue-400" />}
                    >
                      AI Overlap Radar
                    </Button>
                  )}
                  {onOpenTransition && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onOpenTransition(complaint)}
                      leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                    >
                      Transition Status
                    </Button>
                  )}
                  {onOpenTransfer && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onOpenTransfer(complaint)}
                      leftIcon={<ArrowRightLeft className="h-3.5 w-3.5" />}
                    >
                      Transfer File
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Evidence Vault */}
          {activeTab === 'evidence' && (
            <div className="space-y-4 pt-1">
              {/* Existing Documents List */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="h-4 w-4 text-blue-400" />
                    Verified Evidence Documents ({attachments.length})
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    SHA-256 Tamper Protected
                  </span>
                </div>

                {isEvidenceLoading ? (
                  <div className="py-6 text-center text-xs text-slate-500">Loading evidence vault...</div>
                ) : attachments.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No supporting documents attached to this case file yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/80">
                    {attachments.map((att) => (
                      <div key={att.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                        <div className="space-y-0.5 flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <FileCheck2 className="h-4 w-4 text-emerald-400 shrink-0" />
                            <span className="text-xs font-bold text-slate-100 truncate">
                              {att.original_file_name || att.file_name}
                            </span>
                            {att.is_confidential && (
                              <Badge variant="rose" size="sm">
                                🔒 Confidential
                              </Badge>
                            )}
                            <Badge variant="emerald" size="sm">
                              {att.malware_scan_status || 'CLEAN'}
                            </Badge>
                          </div>
                          {att.description && (
                            <p className="text-[11px] text-slate-400 pl-6">{att.description}</p>
                          )}
                          <div className="text-[10px] text-slate-500 font-mono pl-6 flex items-center gap-3">
                            <span>Size: {(att.file_size_bytes / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span>SHA-256: {att.sha256_checksum?.substring(0, 16)}...</span>
                            <span>•</span>
                            <span>Uploaded: {formatDate(att.created_at)}</span>
                          </div>
                        </div>

                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/evidence/${att.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700/80 text-xs text-blue-400 hover:text-white transition-colors flex items-center gap-1.5 shrink-0"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload Form (Officer / Admin only) */}
              {!isAuditor ? (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <UploadCloud className="h-4 w-4 text-blue-400" />
                    Upload Supporting Evidence Document
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Permitted formats: <strong>PDF, DOCX, XLSX, CSV, PNG, JPG, TXT</strong>. Max size: 15MB.
                    Server automatically validates magic bytes and runs malware integrity scan.
                  </p>

                  <form onSubmit={handleUploadSubmit} className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <input
                        type="file"
                        accept=".pdf,.docx,.xlsx,.csv,.png,.jpg,.jpeg,.txt"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-700 file:bg-slate-800 file:text-xs file:font-semibold file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                      />
                      {uploadFile && (
                        <span className="text-xs text-blue-400 font-mono">
                          Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                        </span>
                      )}
                    </div>

                    <Input
                      label="Document Label / Brief Description"
                      placeholder="e.g. Scrutiny inspection notes, signed faculty attendance sheet..."
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                    />

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="chk-confidential"
                        checked={uploadIsConfidential}
                        onChange={(e) => setUploadIsConfidential(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="chk-confidential" className="text-xs text-slate-300 cursor-pointer">
                        Mark as Confidential / Whistleblower Evidence (Restricted Viewing)
                      </label>
                    </div>

                    {uploadError && <p className="text-xs text-rose-400 font-medium">⚠️ {uploadError}</p>}
                    {uploadSuccess && <p className="text-xs text-emerald-400 font-medium">✓ {uploadSuccess}</p>}

                    <div className="flex justify-end pt-1">
                      <Button
                        type="submit"
                        size="sm"
                        variant="primary"
                        disabled={!uploadFile || uploadMutation.isPending}
                        leftIcon={<UploadCloud className="h-3.5 w-3.5" />}
                      >
                        {uploadMutation.isPending ? 'Scanning & Uploading...' : 'Upload & Verify Evidence'}
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400">
                  🔒 Auditors have read-only permissions to inspect and download case evidence attachments.
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Timeline & Movements */}
          {activeTab === 'timeline' && (
            <div className="space-y-4 pt-1">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <History className="h-4 w-4 text-purple-400" />
                    Inter-Bureau Transfers & Case History
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Audit Logged
                  </span>
                </div>

                {isMovementsLoading ? (
                  <div className="py-6 text-center text-xs text-slate-500">Loading movements ledger...</div>
                ) : movements.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No inter-bureau movements or file transfers recorded for this case file.
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    {movements.map((m) => (
                      <div
                        key={m.id}
                        className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <ArrowRightLeft className="h-3.5 w-3.5 text-blue-400" />
                            <span className="text-xs font-bold text-white font-mono">
                              {m.from_bureau} ➔ {m.to_bureau}
                            </span>
                            <Badge
                              variant={
                                m.status === 'ACCEPTED'
                                  ? 'emerald'
                                  : m.status === 'REJECTED'
                                  ? 'rose'
                                  : 'amber'
                              }
                              size="sm"
                            >
                              {m.status}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {formatDateTime(m.created_at)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300">
                          <strong>Transfer Reason:</strong> {m.reason}
                        </p>

                        <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 flex items-center justify-between flex-wrap gap-2">
                          <span>
                            Requested by: <strong className="text-slate-200">{m.requested_by_name || 'Case Officer'}</strong>
                          </span>
                          {m.decided_by_name && (
                            <span>
                              Decided by: <strong className="text-slate-200">{m.decided_by_name}</strong>
                              {m.decision_notes && ` ("${m.decision_notes}")`}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status History from Backend */}
              {complaint.status_history && complaint.status_history.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Lifecycle State Transitions
                  </h4>
                  <div className="divide-y divide-slate-800/80 text-xs">
                    {complaint.status_history.map((sh: any, i: number) => (
                      <div key={i} className="py-2.5 flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-200">
                            {sh.from_status ? `${sh.from_status} ➔ ${sh.to_status}` : sh.to_status}
                          </span>
                          {sh.notes && <p className="text-[11px] text-slate-400 pt-0.5">{sh.notes}</p>}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatDateTime(sh.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
