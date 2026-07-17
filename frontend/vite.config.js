import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Inclure l'icône SVG et tous les PNG dans le précache
      includeAssets: ['favicon.ico', 'icons/*.svg', 'icons/*.png', 'imgfpronix.png'],
      manifest: {
        name: 'fpronix — Pronostics Football IA',
        short_name: 'fpronix',
        description: 'Pronostics football alimentés par IA et données temps réel. Forme, confrontations directes, blessures — analysés par Claude AI.',
        theme_color: '#6366f1',
        background_color: '#111315',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'fr',
        categories: ['sports', 'entertainment'],
        icons: [
          {
            src: '/imgfpronix.png',
            sizes: 'any',
            type: 'image/png',
          },
          {
            src: '/imgfpronix.png',
            sizes: 'any',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        screenshots: [
          {
            src: '/screenshots/home.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Pronostics du jour',
          },
        ],
      },
      workbox: {
        // Script personnalisé pour les notifications push
        importScripts: ['push-handler.js'],
        // Précacher tous les assets statiques
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp}'],
        // Stratégies de cache runtime
        runtimeCaching: [
          {
            // Cache des fonts Google
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache des matchs (5 min)
            urlPattern: /\/api\/matches(\?.*)?$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-matches',
              expiration: { maxEntries: 30, maxAgeSeconds: 300 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache des pronostics (5 min)
            urlPattern: /\/api\/matches\/.*\/predictions/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-predictions',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache des classements (10 min)
            urlPattern: /\/api\/standings/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-standings',
              expiration: { maxEntries: 20, maxAgeSeconds: 600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache des logos/images équipes (1 semaine)
            urlPattern: /^https:\/\/media\.api-sports\.io\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'team-logos',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Ne pas précacher les routes API dynamiques
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        // Activer le service worker en dev pour tester (désactiver si ça gêne)
        enabled: false,
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
