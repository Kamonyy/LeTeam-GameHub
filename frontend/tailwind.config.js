/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './games/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        hub: {
          bg: '#0f1117',
          surface: '#1a1d27',
          card: '#222633',
          border: '#2e3345',
          muted: '#6b7280',
          accent: '#3b82f6',
          'accent-dim': '#2563eb',
          success: '#22c55e',
          warning: '#f59e0b',
          danger: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'tile-snap': 'tileSnap 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'drop-glow': 'dropGlow 1.5s ease-in-out infinite',
        'tile-lift': 'tileLift 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'hand-deal': 'handDeal 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) backwards',
        'table-glow': 'tableGlow 3s ease-in-out infinite',
        'drop-pulse': 'dropPulse 1.2s ease-in-out infinite',
        'overlay-pop': 'overlayPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        tileSnap: {
          '0%': { opacity: '0.6', transform: 'scale(0.85) translateY(12px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        dropGlow: {
          '0%, 100%': {
            boxShadow: '0 0 12px rgba(52, 211, 153, 0.25)',
            borderColor: 'rgba(52, 211, 153, 0.5)',
          },
          '50%': {
            boxShadow: '0 0 24px rgba(52, 211, 153, 0.55)',
            borderColor: 'rgba(52, 211, 153, 0.85)',
          },
        },
        overlayPop: {
          '0%': { opacity: '0', transform: 'scale(0.7)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        tileLift: {
          '0%': { transform: 'translateY(0) scale(1)' },
          '100%': { transform: 'translateY(-8px) scale(1.05)' },
        },
        handDeal: {
          '0%': { opacity: '0', transform: 'translateY(24px) scale(0.85)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        tableGlow: {
          '0%, 100%': { boxShadow: 'inset 0 0 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)' },
          '50%': { boxShadow: 'inset 0 0 50px rgba(16,185,129,0.08), 0 0 0 1px rgba(52,211,153,0.12)' },
        },
        dropPulse: {
          '0%, 100%': { opacity: '0.85', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.04)' },
        },
      },
    },
  },
  plugins: [],
};
