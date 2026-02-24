// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          terracotta: '#B8755E',
          gold: '#CBB674',
          forest: '#2F4F3F',
          cream: '#FAF9F7',
          charcoal: '#1C1C1E',
        },
        ui: {
          secondary: '#555555',
          tertiary: '#8E8E93',
          border: '#E5E5EA',
        },
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
        pill: '28px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
        'card-hover': '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
        cta: '0 8px 20px rgba(184,117,94,0.25)',
        panel: '0 4px 40px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: []
} satisfies Config
