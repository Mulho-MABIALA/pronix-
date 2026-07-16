import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * usePullToRefresh(onRefresh, options?)
 *
 * options.threshold  : distance en px pour déclencher le refresh (défaut 72)
 * options.resistance : facteur de résistance (défaut 2.5 — 1 = linéaire, + = résiste plus)
 *
 * Retourne :
 *   pulling       : boolean — en train de tirer
 *   pullDistance  : number  — px tirés (pour l'indicateur visuel)
 *   refreshing    : boolean — refresh en cours
 *   threshold     : number  — valeur de seuil
 */
export function usePullToRefresh(onRefresh, { threshold = 72, resistance = 2.5 } = {}) {
  const [pulling, setPulling]           = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing]     = useState(false);

  // Refs pour éviter les re-renders dans les listeners
  const startYRef       = useRef(null);
  const pullingRef      = useRef(false);
  const pullDistRef     = useRef(0);
  const refreshingRef   = useRef(false);
  const onRefreshRef    = useRef(onRefresh);
  onRefreshRef.current  = onRefresh;

  const trigger = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      await onRefreshRef.current();
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const getScrollTop = () =>
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    const onTouchStart = (e) => {
      // Seulement si on est tout en haut
      if (getScrollTop() > 5) return;
      startYRef.current = e.touches[0].clientY;
    };

    const onTouchMove = (e) => {
      if (startYRef.current === null) return;
      if (refreshingRef.current) return;

      const dy = e.touches[0].clientY - startYRef.current;

      // Scroll vers le bas → ignorer
      if (dy <= 0) {
        startYRef.current = null;
        if (pullingRef.current) {
          pullingRef.current = false;
          pullDistRef.current = 0;
          setPulling(false);
          setPullDistance(0);
        }
        return;
      }

      // Résistance progressive
      const dist = Math.min(Math.pow(dy, 0.8) * (threshold / Math.pow(threshold, 0.8)), threshold * 1.4);
      pullDistRef.current = dist;
      pullingRef.current  = true;
      setPulling(true);
      setPullDistance(dist);
    };

    const onTouchEnd = async () => {
      if (startYRef.current === null) return;
      startYRef.current = null;

      const shouldRefresh = pullingRef.current && pullDistRef.current >= threshold;

      pullingRef.current  = false;
      pullDistRef.current = 0;
      setPulling(false);
      setPullDistance(0);

      if (shouldRefresh) {
        await trigger();
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove',  onTouchMove,  { passive: true });
    window.addEventListener('touchend',   onTouchEnd);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove',  onTouchMove);
      window.removeEventListener('touchend',   onTouchEnd);
    };
  }, [threshold, trigger]);

  return { pulling, pullDistance, refreshing, threshold };
}
