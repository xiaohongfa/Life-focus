/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        strategy: {
          bg: '#0f1311',
          panel: '#161d18',
          'panel-light': '#202b23',
          card: '#1a231d',
          border: '#2c3a2f',
          'border-gold': '#967b36',
          gold: '#cfa847',
          'gold-light': '#f7e192',
          text: '#e7e0cc',
          muted: '#8b9b8f',
          active: '#22c55e',
          completed: '#d4af37',
          paused: '#d97706',
          revoked: '#ef4444',
          secret: '#b91c1c',
          paper: '#e8dfce',
          steel: '#334139',
        }
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'SimSun', 'Georgia', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'Courier New', 'monospace'],
      }
    },
  },
  plugins: [],
}
