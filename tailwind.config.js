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
          // 淺色系（2026-11-17：「太陰沉」改版 — 陽光户外感，白卡＋雲白底）
          bg: '#F3F6FC',
          surface: '#FFFFFF',
          border: '#E3E8F2',
          text: '#1B1F2A',   // 主文字
          muted: '#626B80',  // 次文字
          ink: '#14161C',    // 彩色按鈕上嘅深字（text-dex-bg 嘅新身分）
          neon: '#0FA958',   // 草綠：白底可讀、配 ink 字對比夠
          accent: '#FF3366',
          gold: '#D08A00',   // 白底可讀嘅金
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