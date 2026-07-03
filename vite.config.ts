import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  optimizeDeps: {
    exclude: ['@imgly/background-removal']
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'BIRD-DEX 3 鳥精靈圖鑑',
        short_name: 'BIRD-DEX',
        description: '拍照認鳥 × IV養成 × AR投擲 × 貼圖去背 × 捕捉足跡',
        theme_color: '#00F0FF',
        background_color: '#0B0F19',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
      },
      devOptions: { enabled: false }
    }),
  ],
  server: {
    port: 3000,
    host: true,
  },
})