import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['seva-vaani-logo.png', 'seva-vaani-logo.webp', 'robots.txt'],
      manifest: {
        name: 'SEVA VAANI — सेवा वाणी',
        short_name: 'SevaVaani',
        description: 'Multilingual Voice-Based Assistant for Indian Government Services — आवाज़ से सरकारी सेवाएं',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        lang: 'hi',
        categories: ['government', 'utilities', 'productivity'],
        icons: [
          {
            src: '/icons/pwa-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/pwa-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/pwa-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Post-Matric Scholarship',
            short_name: 'Scholarship',
            description: 'Apply for Post-Matric Scholarship',
            url: '/app/service/post-matric-scholarship',
            icons: [{ src: '/icons/pwa-192.png', sizes: '192x192' }]
          },
          {
            name: 'Voice Assistant',
            short_name: 'Voice',
            description: 'Start voice-guided service',
            url: '/app/services',
            icons: [{ src: '/icons/pwa-192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        // Cache app shell + static assets
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff,woff2,ico}'],
        // Never cache sensitive API routes
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/api\/auth/,
          /^\/api\/speech/,
          /^\/api\/service-sessions/
        ],
        runtimeCaching: [
          {
            // Google Fonts — cache-first, 1 year
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Static public assets — stale while revalidate
            urlPattern: /\.(png|webp|svg|ico|woff2?)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
          // NOTE: /api/* routes are intentionally excluded from all caching.
          // Authenticated API responses, OTPs, government documents and personal
          // data must NEVER be stored in the service worker cache (security rule).
        ],
        skipWaiting: true,
        clientsClaim: true
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  }
})
