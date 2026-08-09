import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // On enregistre le service worker nous-mêmes (voir src/index.jsx), en
      // différé après le rendu — le script <script src="/registerSW.js">
      // injecté automatiquement par injectRegister:'auto' est chargé de
      // façon bloquante et retardait le premier rendu (~1,2s mesurés).
      injectRegister: null,
      // Inclure l'icône SVG et tous les PNG dans le précache
      includeAssets: ['favicon.ico', 'icons/*.svg', 'icons/*.png', 'imgfpronix.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'fpronix — Pronostics Football IA',
        short_name: 'fpronix',
        description: 'Pronostics football alimentés par IA et données temps réel. Forme, confrontations directes, blessures — analysés par Claude AI.',
        theme_color: '#111315',
        background_color: '#111315',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'fr',
        categories: ['sports', 'entertainment'],
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
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
        // Le nouveau service worker prend le contrôle immédiatement (sans
        // attendre la fermeture de tous les onglets) et purge les anciens
        // caches — évite l'écran noir après un déploiement quand un onglet
        // reste ouvert avec l'ancienne version du site.
        clientsClaim: true,
        cleanupOutdatedCaches: true,
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
    rollupOptions: {
      output: {
        // Sépare les grosses libs partagées du code applicatif — sans ça,
        // TOUT (React, Query, i18n, icônes, Sentry...) finissait dans un seul
        // chunk "index" de ~870 Ko (277 Ko gzip) téléchargé d'un bloc avant le
        // premier rendu. En les isolant par groupe logique : (1) chaque chunk
        // se télécharge en parallèle avec les autres plutôt qu'en série,
        // (2) le navigateur les met en cache indépendamment — un déploiement
        // qui ne touche qu'au code applicatif n'oblige plus à retélécharger
        // React/Query/etc, seulement le petit chunk "app" qui a changé.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query', 'axios'],
          'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          'vendor-ui': ['lucide-react', 'date-fns'],
        },
      },
    },
  },
});
