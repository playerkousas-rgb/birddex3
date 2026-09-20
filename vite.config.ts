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
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg'],
      // index.html links to the canonical public/manifest.json. Do not inject a second manifest.
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
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