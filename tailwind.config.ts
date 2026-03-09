import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        bg:       '#09090b',
        surface:  '#111113',
        surface2: '#18181b',
        border:   'rgba(255,255,255,0.07)',
        border2:  'rgba(255,255,255,0.12)',
        muted:    '#71717a',
        subtle:   '#a1a1aa',
        accent:   '#22c55e',
      },
      borderRadius: {
        DEFAULT: '10px',
        sm: '6px',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
}

export default config
