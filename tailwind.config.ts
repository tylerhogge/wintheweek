import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
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
        'icon-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '30%':      { transform: 'translateY(-2px)' },
          '60%':      { transform: 'translateY(1px)' },
        },
        'icon-wiggle': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '20%':      { transform: 'rotate(-8deg)' },
          '40%':      { transform: 'rotate(8deg)' },
          '60%':      { transform: 'rotate(-4deg)' },
          '80%':      { transform: 'rotate(4deg)' },
        },
        'icon-tilt': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '30%':      { transform: 'rotate(-12deg)' },
          '60%':      { transform: 'rotate(4deg)' },
        },
        'icon-spin': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(120deg)' },
        },
      },
      animation: {
        'fade-in':     'fade-in 0.2s ease-out',
        'icon-bounce': 'icon-bounce 0.4s ease-in-out',
        'icon-wiggle': 'icon-wiggle 0.5s ease-in-out',
        'icon-tilt':   'icon-tilt 0.4s ease-in-out',
        'icon-spin':   'icon-spin 0.4s ease-in-out',
      },
    },
  },
  plugins: [],
}

export default config
