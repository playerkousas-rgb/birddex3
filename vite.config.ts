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