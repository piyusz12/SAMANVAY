import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';

export interface Institution {
  id: number;
  aicte_permanent_id: string;
  name: string;
  shortName?: string;
  address?: string;
  city?: string;
  state?: string;
  district?: string;
  region?: string;
  pin_code?: string;
  status: string;
  aishe_code?: string;
  created_at: string;
  category?: string;
  domains?: string[];
  streams?: string[];
  framework?: string;
  nirfRank?: string;
  accreditation?: string;
  intakeCapacity?: number;
  website?: string;
  contact_phone?: string;
  contact_email?: string;
}

export interface InstitutionDossier {
  institution: Institution;
  total_complaints: number;
  active_inquiries: number;
  disposed_cases: number;
  involved_bureaus: string[];
  complaints: any[];
  has_conflicts: boolean;
}

export function useInstitutions(search?: string) {
  return useQuery<Institution[]>({
    queryKey: ['institutions', search],
    queryFn: async () => {
      return await apiClient.get<Institution[]>('/api/v1/institutions', {
        params: { search: search || undefined },
      });
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useInstitutionDossier(institutionId?: number | null) {
  return useQuery<InstitutionDossier>({
    queryKey: ['institution-dossier', institutionId],
    queryFn: async () => {
      if (!institutionId) throw new Error('No institution ID provided');
      return await apiClient.get<InstitutionDossier>(`/api/v1/institutions/${institutionId}/dossier`);
    },
    enabled: !!institutionId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useOverlappingConflicts() {
  return useQuery<any[]>({
    queryKey: ['conflicts', 'overlapping'],
    queryFn: async () => {
      return await apiClient.get<any[]>('/api/v1/conflicts/overlapping');
    },
    staleTime: 1000 * 30,
  });
}
