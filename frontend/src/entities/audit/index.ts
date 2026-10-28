import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';

export interface AuditLog {
  id: number;
  complaint_id?: number;
  institution_id?: number;
  actor_id?: number;
  actor_name: string;
  actor_role: string;
  actor_bureau: string;
  action_type: string;
  description: string;
  previous_state?: any;
  new_state?: any;
  timestamp: string;
  prev_hash?: string;
  entry_hash?: string;
}

export interface ChainIntegrity {
  is_intact: boolean;
  total_records: number;
  head_hash?: string;
  tampered_entry_id?: number;
  details: string;
  violation_type?: string;
  first_timestamp?: string;
  latest_timestamp?: string;
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
