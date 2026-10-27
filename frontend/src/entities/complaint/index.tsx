'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';
import { Badge } from '../../shared/ui/Badge';
import { COMPLAINT_STATUSES } from '../../shared/config/constants';
import { calculateSla } from '../../shared/lib/date-utils';

export interface Complaint {
  id: number;
  complaint_no: string;
  institution_id: number;
  institution_name?: string;
  aicte_permanent_id?: string;
  bureau_id: string;
  assigned_officer_id?: number;
  assigned_officer_name?: string;
  complainant_name?: string;
  complainant_category?: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at?: string;
  sla_due_date?: string;
  is_overdue?: boolean;
}

export function useComplaints(filters?: {
  bureau?: string;
  status?: string;
  priority?: string;
  search?: string;
  institution_id?: number;
}) {
  return useQuery<{ items: Complaint[]; total: number }>({
    queryKey: ['complaints', filters],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (filters?.bureau && filters.bureau !== 'ALL') params.bureau = filters.bureau;
      if (filters?.status) params.status = filters.status;
      if (filters?.priority) params.priority = filters.priority;
      if (filters?.search) params.search = filters.search;
      if (filters?.institution_id) params.institution_id = filters.institution_id;

      const res = await apiClient.get<any>('/api/v1/complaints', { params });
      if (Array.isArray(res)) {
        return { items: res, total: res.length };
      }
      return { items: res.items || [], total: res.total || 0 };
    },
    staleTime: 1000 * 30,
  });
}

export function useComplaint(complaintId?: number | null) {
  return useQuery<Complaint>({
    queryKey: ['complaint', complaintId],
    queryFn: async () => {
      if (!complaintId) throw new Error('No complaint ID');
      return await apiClient.get<Complaint>(`/api/v1/complaints/${complaintId}`);
    },
    enabled: !!complaintId,
    staleTime: 1000 * 30,
  });
}

export const ComplaintStatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({
  status,
  size = 'md',
}) => {
  const conf = COMPLAINT_STATUSES[status] || { label: status, color: 'slate' };
  return (
    <Badge variant={conf.color as any} size={size}>
      {conf.label}
    </Badge>
  );
};

export const SlaBadge: React.FC<{
  createdAt?: string | null;
  dueDate?: string | null;
  status?: string;
  size?: 'sm' | 'md';
}> = ({ createdAt, dueDate, status, size = 'md' }) => {
  const sla = calculateSla(createdAt, dueDate, status);
  return (
    <Badge variant={sla.badgeColor as any} size={size}>
      ⏱️ {sla.label}
    </Badge>
  );
};
