import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-elevated': 'var(--surface-elevated)',
        amber: 'var(--accent-amber)',
        cyan: 'var(--accent-cyan)',
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        red: 'var(--accent-error)',
        muted: 'var(--text-muted)',
        border: 'var(--border)',
      },
      fontFamily: {
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        panel: '0 18px 54px rgba(0, 0, 0, 0.3)',
        cyan: '0 0 12px rgba(63, 188, 203, 0.08)',
        amber: '0 0 12px rgba(217, 154, 43, 0.08)',
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
        triggerPulse: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 12px rgba(217, 154, 43, 0.08)' },
          '50%': { transform: 'scale(1.04)', boxShadow: '0 0 24px rgba(217, 154, 43, 0.4)' },
        },
      },
      animation: {
        cardIn: 'cardIn 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        drawLine: 'drawLine 780ms cubic-bezier(0.22, 1, 0.36, 1) both',
        skeletonPulse: 'skeletonPulse 1.45s ease-in-out infinite',
        triggerPulse: 'triggerPulse 600ms ease-in-out 2',
      },
    },
  },
  plugins: [],
};

export default config;
