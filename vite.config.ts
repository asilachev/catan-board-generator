import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  define: {
    // Vercel Web Analytics only in builds that run on Vercel; other builds drop it entirely.
    __VERCEL_ANALYTICS__: JSON.stringify(process.env.VERCEL === '1'),
  },
  plugins: [
    react(),
    // Installable, offline-first PWA. The service worker precaches the whole build and waits for
    // RELOAD (prompt mode); the board is in the URL and in storage, so reloading is safe.
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Board Generator for CATAN (unofficial)',
        short_name: 'Catan Boards',
        description:
          'Fair, shareable boards for the CATAN base game and all nine Seafarers scenarios.',
        lang: 'en',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0d3f5e',
        theme_color: '#0d3f5e',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'engine',
          include: ['src/engine/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          include: ['src/ui/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          setupFiles: ['src/test/setup.ts'],
        },
      },
    ],
  },
})
