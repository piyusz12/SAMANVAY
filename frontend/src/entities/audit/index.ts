import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';

export interface AuditLog {
  id: number;
  complaint_id?: number;
  institution_id?: number;
  actor_id?: number;
  actor_email?: string;
  actor_role?: string;
  actor_bureau?: string;
  action_type: string;
  narrative: string;
  previous_state?: any;
  new_state?: any;
  previous_hash?: string;
  record_hash?: string;
  created_at: string;
}

export interface ChainIntegrity {
  is_intact: boolean;
  total_records_verified: number;
  head_hash?: string;
  broken_at_id?: number;
  message: string;
}

export function useAuditLogs(complaintId?: number) {
  return useQuery<AuditLog[]>({
    queryKey: ['audit-logs', complaintId],
    queryFn: async () => {
      const params = complaintId ? { complaint_id: complaintId } : undefined;
      const res = await apiClient.get<any>('/api/v1/audit/logs', { params });
      return Array.isArray(res) ? res : res.items || [];
    },
    staleTime: 1000 * 20,
  });
}

export function useVerifyAuditIntegrity() {
  return useQuery<ChainIntegrity>({
    queryKey: ['audit', 'verify-integrity'],
    queryFn: async () => {
      return await apiClient.get<ChainIntegrity>('/api/v1/audit/verify-integrity');
    },
    staleTime: 1000 * 60,
  });
}
