'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';
import { COMPLAINT_STATUSES } from '../../shared/config/constants';
import { Modal } from '../../shared/ui/Modal';
import { Button } from '../../shared/ui/Button';
import { Select, Textarea } from '../../shared/ui/FormControls';
import { Alert } from '../../shared/ui/Alert';

export const StatusTransitionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  complaint: { id: number; complaint_no: string; status: string };
}> = ({ isOpen, onClose, complaint }) => {
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      return await apiClient.patch(`/api/v1/complaints/${complaint.id}/status`, {
        status: newStatus,
        notes: notes.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaint', complaint.id] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Status transition failed.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus) {
      setErrorMsg('Please select target lifecycle state.');
      return;
    }
    if (!notes.trim()) {
      setErrorMsg('Mandatory officer scrutiny notes required for regulatory record.');
      return;
    }
    setErrorMsg(null);
    mutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Update Status: ${complaint.complaint_no}`}
      description="Advance case through the statutory state machine lifecycle."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
          Current State: <strong className="text-white">{complaint.status}</strong>
        </div>

        <Select
          label="Transition To New State *"
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
          required
        >
          <option value="">-- Select New Lifecycle State --</option>
          {Object.entries(COMPLAINT_STATUSES)
            .filter(([key]) => key !== complaint.status)
            .map(([key, val]) => (
              <option key={key} value={key}>
                {val.label} ({key})
              </option>
            ))}
        </Select>

        <Textarea
          label="Official Officer Notes / Regulatory Rationale *"
          rows={3}
          placeholder="Record findings, inspection summary, show-cause directive, or formal disposal summary..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          required
        />

        <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={mutation.isPending}>
            Update Status
          </Button>
        </div>
      </form>
    </Modal>
  );
};
