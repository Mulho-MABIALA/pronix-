import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

/**
 * Marchés live (1X2/over-under/score exact/corners recalculés minute par
 * minute) pour un match en cours — voir predictionService.deriveLiveMarkets
 * côté backend. Rien n'est stocké : chaque appel recalcule à partir de
 * l'état courant du match. Réservé Premium (403 sinon, silencieux ici —
 * retry désactivé pour ne pas marteler l'API pour un compte gratuit).
 */
export function useLiveMarkets(matchId, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['live-markets', matchId],
    queryFn: async () => {
      const res = await api.get(`/matches/${matchId}/live-markets`);
      return res.data?.data ?? null;
    },
    enabled: enabled && !!matchId,
    refetchInterval: 25_000,
    staleTime: 20_000,
    retry: false,
  });
}
