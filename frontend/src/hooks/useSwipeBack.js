import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * useSwipeBack()
 *
 * Geste "glisser depuis le bord gauche vers la droite" pour revenir en arrière
 * (comme le swipe-back natif iOS). Ne se déclenche que si le doigt démarre
 * près du bord gauche de l'écran, pour ne jamais entrer en conflit avec les
 * carrousels/chips scrollables horizontalement ailleurs dans l'app.
 */
export function useSwipeBack({ edgeWidth = 24, threshold = 80 } = {}) {
  const navigate = useNavigate();

  useEffect(() => {
    let startX = null;
    let startY = null;
    let tracking = false;

    const onTouchStart = (e) => {
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      // Seulement si le doigt démarre près du bord gauche de l'écran
      if (x > edgeWidth) { tracking = false; return; }
      startX = x;
      startY = y;
      tracking = true;
    };

    const onTouchMove = (e) => {
      if (!tracking || startX === null) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      // Si le mouvement est plus vertical qu'horizontal → laisser scroller normalement
      if (Math.abs(dy) > Math.abs(dx)) { tracking = false; }
    };

    const onTouchEnd = (e) => {
      if (!tracking || startX === null) { startX = null; return; }
      const dx = (e.changedTouches?.[0]?.clientX ?? startX) - startX;
      tracking = false;
      startX = null;
      if (dx >= threshold) {
        navigate(-1);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove',  onTouchMove,  { passive: true });
    window.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove',  onTouchMove);
      window.removeEventListener('touchend',   onTouchEnd);
    };
  }, [navigate, edgeWidth, threshold]);
}
