import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        amber: 'var(--accent-amber)',
        cyan: 'var(--accent-cyan)',
        primary: 'var(--text-primary)',
        red: 'var(--accent-red)',
        muted: 'var(--text-muted)',
      },
      fontFamily: {
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        panel: '0 18px 54px rgba(0, 0, 0, 0.24)',
        cyan: '0 0 18px rgba(77, 216, 232, 0.18)',
        amber: '0 0 18px rgba(255, 138, 61, 0.18)',
      },
      keyframes: {
        cardIn: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        drawLine: {
          '0%': { strokeDashoffset: '260' },
          '100%': { strokeDashoffset: '0' },
        },
        skeletonPulse: {
          '0%, 100%': { opacity: '0.42' },
          '50%': { opacity: '0.82' },
        },
      },
      animation: {
        cardIn: 'cardIn 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        drawLine: 'drawLine 780ms cubic-bezier(0.22, 1, 0.36, 1) both',
        skeletonPulse: 'skeletonPulse 1.45s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
