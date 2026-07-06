import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

/**
 * Récupère les cotes réelles (The Odds API) pour un match.
 * Retourne null si pas de clé API configurée ou match introuvable dans le cache.
 * Le frontend doit toujours prévoir un fallback mock.
 */
export function useOdds(matchId, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['odds', matchId],
    queryFn: async () => {
      const res = await api.get(`/matches/${matchId}/odds`);
      return res.data?.data ?? null;
    },
    enabled: enabled && !!matchId,
    staleTime: 30 * 60 * 1000, // 30 min — les cotes ne changent pas trop vite
    gcTime:    60 * 60 * 1000, // 1h en cache
    retry: false,
  });
}
