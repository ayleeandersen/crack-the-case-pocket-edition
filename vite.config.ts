/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { copyFileSync } from 'node:fs';

// '/' locally; '/<repo>/' on GitHub Pages (set by the deploy workflow).
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Crack the Case Pocket Edition',
        short_name: 'Crack the Case',
        description: 'A pocket murder-mystery party game.',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1a1512',
        theme_color: '#5c0d14',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: `${base}index.html`,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
    {
      // GitHub Pages has no SPA rewrites; serving index.html as 404.html makes deep links like /case/23 work.
      name: 'spa-404-fallback',
      apply: 'build',
      closeBundle() {
        copyFileSync('dist/index.html', 'dist/404.html');
      },
    },
  ],
  build: {
    rolldownOptions: {
      output: {
        // Keep the card data in its own chunk so the app-code budget is easy to see.
        codeSplitting: { groups: [{ name: 'cards', test: /crack-the-case-cards\.json/ }] },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
