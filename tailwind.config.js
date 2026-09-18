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
          bg: '#14171a',
          panel: '#1a1e22',
          'panel-light': '#23282f',
          card: '#1d2126',
          border: '#373e47',
          'border-light': '#4e5864',
          'border-gold': '#c59b27',
          gold: '#e5c158',
          'gold-light': '#fef08a',
          'gold-dark': '#855d14',
          text: '#ffffff',
          'text-secondary': '#e2e8f0',
          muted: '#94a3b8',
          active: '#22c55e',
          completed: '#eab308',
          paused: '#f59e0b',
          revoked: '#ef4444',
          secret: '#dc2626',
          paper: '#dfd7c6',
          'paper-dark': '#c8beaa',
          'paper-text': '#181512',
          steel: '#2d333b',
          'military-green': '#2e3d30',
          'military-green-border': '#4d634f',
          'military-green-hover': '#3b4e3e',
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
