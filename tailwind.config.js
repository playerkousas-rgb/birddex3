/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rarity: {
          uc: '#9CA3AF',    // Uncommon - 灰
          c: '#E5E7EB',     // Common - 白銀
          r: '#60A5FA',     // Rare - 藍
          sr: '#A78BFA',    // Super Rare - 紫
          ssr: '#FBBF24',   // Super Super Rare - 金
          ur: '#F472B6',    // Ultra Rare - 粉虹
          lr: '#1F2937',    // Legend Rare - 黑金
        },
        dex: {
          bg: '#0B0F19',
          surface: '#111827',
          border: '#1F2937',
          neon: '#00F0FF',
          accent: '#FF3366',
          gold: '#FFD700',
          success: '#10B981',
          warning: '#F59E0B',
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      animation: {
        'scan-line': 'scanLine 2.5s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'sparkle': 'sparkle 1.5s ease-in-out infinite',
      },
      keyframes: {
        scanLine: {
          '0%': { top: '0%' },
          '50%': { top: '100%' },
          '100%': { top: '0%' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        sparkle: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
      }
    },
  },
  plugins: [],
}