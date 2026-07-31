import formsPlugin from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Vert "pitch" — inspiré du vert de marque BeSoccer (#3B811F), réchauffé
        // vers une teinte plus "terrain" et resaturé pour rester lisible en dark UI.
        primary: {
          50:  '#eafbf0',
          100: '#ccf5dc',
          200: '#99eabb',
          300: '#5dd890',
          400: '#2ec16a',   // hover
          500: '#1aa656',   // main — vert pitch, plus profond que l'émeraude générique
          600: '#128542',
          700: '#0f6936',
          800: '#0e532c',
          900: '#0d4425',
        },
        surface: {
          // 950 reste fixe (utilisé pour quelques fonds toujours très sombres,
          // ex. overlays/modales) — les autres nuances sont pilotées par des
          // variables CSS (voir index.css :root / html.light) pour basculer
          // automatiquement en mode clair sans toucher aux ~250 usages dans
          // les composants (bg-surface-800, border-surface-600, etc.).
          950: '#0d0e10',
          900: 'rgb(var(--surface-900-rgb) / <alpha-value>)',
          800: 'rgb(var(--surface-800-rgb) / <alpha-value>)',
          700: 'rgb(var(--surface-700-rgb) / <alpha-value>)',
          600: 'rgb(var(--surface-600-rgb) / <alpha-value>)',
          500: 'rgb(var(--surface-500-rgb) / <alpha-value>)',
          400: 'rgb(var(--surface-400-rgb) / <alpha-value>)',
        },
        // Texte — remplace les text-gray-100/200/300/400/700 codés en dur
        // pour qu'ils basculent avec le thème (voir index.css).
        ink: {
          1: 'rgb(var(--ink-1-rgb) / <alpha-value>)',
          2: 'rgb(var(--ink-2-rgb) / <alpha-value>)',
          3: 'rgb(var(--ink-3-rgb) / <alpha-value>)',
          4: 'rgb(var(--ink-4-rgb) / <alpha-value>)',
          5: 'rgb(var(--ink-5-rgb) / <alpha-value>)',
        },
        // Placeholders de champs personnalisés (hors .input, qui a son propre style)
        ph: {
          a: 'rgb(var(--ph-a-rgb) / <alpha-value>)',
          b: 'rgb(var(--ph-b-rgb) / <alpha-value>)',
        },
        // Remplace bg-white/[x] / border-white/[x] / divide-white/[x] / ring-white/[x] :
        // un voile clair en mode sombre, sombre en mode clair, même opacité.
        overlay: 'rgb(var(--overlay-rgb) / <alpha-value>)',
        accent: {
          400: '#fb923c',   // orange clair
          500: '#f97316',   // orange principal — CTAs premium, démarque du vert "marque"
          600: '#ea580c',
          700: '#c2410c',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        live: {
          400: '#f87171',
          500: '#ef4444',   // rouge "en direct" — cohérent avec les codes du secteur
        },
        // Bleu pour les états UI actifs/sélectionnés (nav, filtres, tabs)
        // distinct du vert marque et de l'ambre confiance-moyenne
        select: {
          400: '#60a5fa',   // blue-400 — texte actif
          500: '#3b82f6',   // blue-500 — fond teinté
        },
      },
      fontFamily: {
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Barlow', 'sans-serif'],
      },
      boxShadow: {
        card:    '0 1px 2px rgba(0,0,0,0.3), 0 8px 24px -6px rgba(0,0,0,0.35)',
        'card-hover': '0 10px 30px -8px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
        glow:    '0 0 22px rgba(26,166,86,0.3)',
        'glow-accent': '0 0 22px rgba(249,115,22,0.25)',
        soft:    '0 1px 1px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.18)',
      },
      animation: {
        shimmer:    'shimmer 1.5s infinite',
        'fade-in':  'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        pop:        'pop 0.2s ease-out',
        pulse:      'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
        marquee:          'marquee 38s linear infinite',
        'marquee-reverse': 'marquee-reverse 32s linear infinite',
        bump:       'bump 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        'bounce-in': 'bounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        unfold:     'unfold 0.45s cubic-bezier(0.16,1,0.3,1)',
        flash:      'flash 0.6s ease-out',
        'glow-pulse': 'glowPulse 2.4s ease-in-out infinite',
        'cascade-in': 'fadeIn 0.35s ease-out both, slideUp 0.35s ease-out both',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%':   { opacity: '0', transform: 'scale(0.85)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          '0%':   { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
        bump: {
          '0%':   { transform: 'scale(1)' },
          '40%':  { transform: 'scale(1.35)' },
          '100%': { transform: 'scale(1)' },
        },
        bounceIn: {
          '0%':   { opacity: '0', transform: 'translateY(-14px) scale(0.95)' },
          '60%':  { opacity: '1', transform: 'translateY(2px) scale(1.01)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        unfold: {
          '0%':   { opacity: '0', transform: 'scaleY(0.9) translateY(-6px)' },
          '100%': { opacity: '1', transform: 'scaleY(1) translateY(0)' },
        },
        flash: {
          '0%':   { backgroundColor: 'rgba(26,166,86,0.35)' },
          '100%': { backgroundColor: 'transparent' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 14px rgba(26,166,86,0.25)' },
          '50%':      { boxShadow: '0 0 28px rgba(26,166,86,0.55)' },
        },
      },
    },
  },
  plugins: [formsPlugin],
};
