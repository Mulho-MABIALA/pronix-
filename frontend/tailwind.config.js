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
          950: '#0d0e10',
          900: '#171819',   // fond page — gris pur, zéro tint bleu
          800: '#212327',   // fond carte
          700: '#2b2d31',   // hover
          600: '#3a3c41',   // bordures, séparateurs
          500: '#4a4c52',   // éléments inactifs
          400: '#5c5e64',
        },
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
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
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
      },
    },
  },
  plugins: [formsPlugin],
};
