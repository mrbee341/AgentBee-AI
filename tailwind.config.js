/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0a0c0b',
          raised: '#0f1311',
          panel: '#121815',
          line: '#1c2420',
          'line-strong': '#2a352f',
        },
        paper: {
          DEFAULT: '#e4ece6',
          muted: '#9aa7a0',
        },
        phosphor: {
          DEFAULT: '#5ee89a',
          dim: '#2f9e62',
          ink: '#06140d',
        },
        amber: {
          DEFAULT: '#f2b84b',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        draw: {
          from: { strokeDashoffset: '1' },
          to: { strokeDashoffset: '0' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(0.8)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 400ms ease-out both',
        blink: 'blink 1s steps(1) infinite',
        draw: 'draw 1.2s ease-out both',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
