import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

/**
 * Petite bulle d'aide tactile — remplace les tooltips `title` natifs (invisibles
 * sur mobile, faute de survol). Clic pour ouvrir/fermer, clic en dehors pour fermer.
 * Bloque la propagation pour rester utilisable à l'intérieur d'un <Link> englobant.
 */
export default function InfoTooltip({ text, size = 11, align = 'center', wide = false, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [open]);

  const alignClass = align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2';

  return (
    <span ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        aria-label="Explication"
        aria-expanded={open}
        className="inline-flex items-center justify-center text-ink-4 hover:text-ink-2 transition-colors"
        style={{ width: size + 5, height: size + 5 }}
      >
        <Info size={size} />
      </button>
      {open && (
        <span
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className={`absolute z-50 bottom-full ${alignClass} mb-1.5 ${wide ? 'w-64' : 'w-52'} px-2.5 py-2 rounded-lg text-[11px] leading-snug text-ink-2 shadow-xl border border-white/10 whitespace-pre-line`}
          style={{ background: 'rgba(20,21,22,0.98)' }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
