'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';
import { BUREAUS } from '../../shared/config/constants';
import { Modal } from '../../shared/ui/Modal';
import { Button } from '../../shared/ui/Button';
import { Select, Textarea } from '../../shared/ui/FormControls';
import { Alert } from '../../shared/ui/Alert';

export const TransferFileModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  complaint: { id: number; complaint_no: string; bureau_id: string };
}> = ({ isOpen, onClose, complaint }) => {
  const queryClient = useQueryClient();
  const [toBureau, setToBureau] = useState('');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post('/api/v1/movements/transfer', {
        complaint_id: complaint.id,
        target_bureau_id: toBureau,
        reason: reason.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaint', complaint.id] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Transfer failed. Check permissions.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toBureau) {
      setErrorMsg('Please select target recipient bureau.');
      return;
    }
    if (toBureau === complaint.bureau_id) {
      setErrorMsg('Target bureau cannot be identical to current holding bureau.');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('Official regulatory justification is mandatory.');
      return;
    }
    setErrorMsg(null);
    mutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Inter-Bureau File Transfer: ${complaint.complaint_no}`}
      description="Formally transfer investigative custody and file jurisdiction to another specialized AICTE cell."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
          Current Custody: <strong className="text-white">{complaint.bureau_id}</strong>
        </div>

        <Select
          label="Transfer Jurisdiction To *"
          value={toBureau}
          onChange={(e) => setToBureau(e.target.value)}
          required
        >
          <option value="">-- Select Recipient Bureau --</option>
          {Object.values(BUREAUS)
            .filter((b) => b.id !== complaint.bureau_id)
            .map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.id})
              </option>
            ))}
        </Select>

        <Textarea
          label="Administrative Transfer Justification *"
          rows={3}
          placeholder="State specific jurisdictional reasons (e.g. Criminal fraud requires Vigilance inquiry; High Court writ requires Legal Cell representation)..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />

        <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={mutation.isPending}>
            Execute File Transfer
          </Button>
        </div>
      </form>
    </Modal>
  );
};
