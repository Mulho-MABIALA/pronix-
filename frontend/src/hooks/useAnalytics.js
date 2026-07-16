// Hook léger pour logger les événements analytics sans bloquer l'UI
import { useCallback } from 'react';
import api from '../services/api';

export function useAnalytics() {
  const track = useCallback((event, entityId = null, metadata = null) => {
    api.post('/analytics/log', { event, entityId, metadata }).catch(() => {});
  }, []);

  return { track };
}
