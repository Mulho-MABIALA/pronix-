import formsPlugin from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#edfff5',
          100: '#d3ffe5',
          200: '#a3f5c5',
          300: '#56e898',
          400: '#16d465',   // hover
          500: '#09bb57',   // main — vert vif, sportif
          600: '#059044',
          700: '#077336',
          800: '#0a5a2c',
          900: '#094b24',
        },
        surface: {
          950: '#080808',
          900: '#111111',   // fond page — gris pur, zéro tint bleu
          800: '#1a1a1a',   // fond carte
          700: '#222222',   // hover
          600: '#2d2d2d',   // bordures, séparateurs
          500: '#3a3a3a',   // éléments inactifs
          400: '#4a4a4a',
        },
        accent: {
          400: '#fb923c',   // orange clair
          500: '#f97316',   // orange principal — CTAs premium
          600: '#ea580c',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      boxShadow: {
        card:    '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.25)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
        glow:    '0 0 20px rgba(0,180,110,0.25)',
      },
      animation: {
        shimmer:    'shimmer 1.5s infinite',
        'fade-in':  'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        pulse:      'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
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
      },
    },
  },
  plugins: [formsPlugin],
};
