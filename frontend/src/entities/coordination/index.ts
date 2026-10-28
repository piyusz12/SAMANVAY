import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';

export interface FollowUpTask {
  id: number;
  linkage_id?: number;
  complaint_id?: number;
  title: string;
  target_bureau?: string;
  assigned_to_name?: string;
  deadline: string;
  status: string;
  priority: string;
  is_overdue?: boolean;
  created_at: string;
}

export interface CoordinationWorkspace {
  linkage_id: number;
  id?: number; // alias
  institution_id: number;
  institution_name: string;
  institution_aicte_id?: string;
  source_complaint_id: number;
  source_complaint_no: string;
  source_bureau: string;
  source_status: string;
  target_complaint_id: number;
  target_complaint_no: string;
  target_bureau: string;
  target_status: string;
  lead_bureau?: string;
  coordination_decision?: string;
  coordination_notes?: string;
  coordination_deadline?: string;
  status: string;
  is_active: boolean;
  similarity_score: number;
  confidence_tier: string;
  outstanding_tasks_count?: number;
  overdue_tasks_count?: number;
  created_at: string;
  updated_at: string;
  follow_up_tasks?: FollowUpTask[];
  tasks?: FollowUpTask[];
}

export function useWorkspaces() {
  return useQuery<CoordinationWorkspace[]>({
    queryKey: ['coordination-workspaces'],
    queryFn: async () => {
      const res = await apiClient.get<CoordinationWorkspace[]>('/api/v1/coordination/workspaces');
      return (res || []).map((ws) => ({
        ...ws,
        id: ws.linkage_id,
        tasks: ws.follow_up_tasks || ws.tasks || [],
      }));
    },
    staleTime: 1000 * 30,
  });
}

export function useWorkspaceDetail(linkageId?: number | null) {
  return useQuery<CoordinationWorkspace>({
    queryKey: ['coordination-workspace', linkageId],
    queryFn: async () => {
      if (!linkageId) throw new Error('Linkage ID required');
      const res = await apiClient.get<CoordinationWorkspace>(`/api/v1/coordination/workspaces/${linkageId}`);
      return {
        ...res,
        id: res.linkage_id,
        tasks: res.follow_up_tasks || [],
      };
    },
    enabled: !!linkageId,
    staleTime: 1000 * 30,
  });
}
