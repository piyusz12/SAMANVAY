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

export const LodgeComplaintModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const { currentUser } = useAppStore();
  const { data: institutions = [] } = useInstitutions();

  const [formData, setFormData] = useState({
    institution_id: '',
    bureau: currentUser.bureau !== 'CENTRAL_ADMIN' && currentUser.bureau !== 'AICTE HQ' ? currentUser.bureau : 'PGRC',
    complainant_name: '',
    complainant_category: 'Student',
    category: COMPLAINT_CATEGORIES[0].code,
    subject: '',
    description: '',
    priority: 'HIGH',
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      institution_id: Number(formData.institution_id),
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Complainant Name (Optional for Whistleblower)"
            placeholder="e.g. Ramesh Chandra (or Anonymous)"
            value={formData.complainant_name}
            onChange={(e) => setFormData({ ...formData, complainant_name: e.target.value })}
          />

          <Select
            label="Complainant Category"
            value={formData.complainant_category}
            onChange={(e) => setFormData({ ...formData, complainant_category: e.target.value })}
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

        <Input
          label="Grievance Subject Line *"
          placeholder="e.g. Exorbitant cash capitation fee demanded for CSE intake"
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          required
        />

        <Textarea
          label="Substantive Allegations & Evidence Summary *"
          rows={4}
          placeholder="Provide specific factual details regarding violations, amounts, dates, affected students, or non-compliance..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />

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
