import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
  optimizeDeps: {
    exclude: ['@imgly/background-removal']
  },
  plugins: [
    react(),
    VitePWA({
      // docs/46 UP1：更新唔准背景偷換版 — 新 SW 停在 waiting，由用戶按「立即更新」先接手。
      registerType: 'prompt',
      // 自己喺 src/lib/pwa.ts 用 virtual:pwa-register 註冊（要 onNeedRefresh / UP4掛勾）。
      injectRegister: false,
      includeAssets: ['favicon.svg'],
      // index.html links to the canonical public/manifest.json. Do not inject a second manifest.
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,avif,ico,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        // R2 鳥卡由 App 內「下載離線圖卡」預載／上網時順便快取，離線由 SW 出。
        runtimeCaching: [{
          urlPattern: /^https:\/\/pub-[^/]+\.r2\.dev\/birdcards\/.*\.avif$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'bd-birdcards-v1',
            expiration: { maxEntries: 700, maxAgeSeconds: 60 * 60 * 24 * 180 },
            cacheableResponse: { statuses: [0, 200] },
          },
        }],
      },
      devOptions: { enabled: false }
    }),
  ],
  preview: {
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app'],
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['.e2b.app'],
  },
})