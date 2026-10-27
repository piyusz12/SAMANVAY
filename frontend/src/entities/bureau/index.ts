import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';
import { BUREAUS, BureauDef } from '../../shared/config/constants';

export interface Bureau {
  id: string;
  name: string;
  description?: string;
  active_cases_count?: number;
}

export function useBureaus() {
  return useQuery<Bureau[]>({
    queryKey: ['bureaus'],
    queryFn: async () => {
      try {
        const res = await apiClient.get<Bureau[]>('/api/v1/bureaus');
        return res;
      } catch {
        // Fallback to static bureaus if backend endpoint is unavailable
        return Object.values(BUREAUS).map((b) => ({
          id: b.id,
          name: b.name,
          description: b.description,
        }));
      }
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
