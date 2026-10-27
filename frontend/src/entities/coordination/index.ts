import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';

export interface FollowUpTask {
  id: number;
  task_title: string;
  assigned_to_bureau: string;
  assigned_officer_id?: number;
  deadline?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  created_at: string;
}

export interface CoordinationWorkspace {
  id: number;
  institution_id: number;
  institution_name?: string;
  lead_bureau: string;
  coordination_decision: string;
  decision_notes?: string;
  involved_bureaus: string[];
  tasks: FollowUpTask[];
  created_at: string;
  updated_at: string;
}

export function useWorkspaces() {
  return useQuery<CoordinationWorkspace[]>({
    queryKey: ['coordination-workspaces'],
    queryFn: async () => {
      try {
        return await apiClient.get<CoordinationWorkspace[]>('/api/v1/coordination/workspaces');
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 30,
  });
}
