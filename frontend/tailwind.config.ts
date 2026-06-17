import type { Config } from 'tailwindcss';

// Tokens de marca Exiracks: oro sobre negro.
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1280px' } },
    extend: {
      colors: {
        // Paleta de marca
        ink: '#0B0B0B', // negro principal
        coal: '#141414', // superficie / cards
        gold: {
          DEFAULT: '#C9A24B',
          light: '#E8CE8B',
          deep: '#9A7B36',
        },
        cream: '#F5F1E8',
        // Tokens semánticos (shadcn-style)
        border: '#262220',
        input: '#2A2622',
        ring: '#C9A24B',
        background: '#0B0B0B',
        foreground: '#F5F1E8',
        primary: { DEFAULT: '#C9A24B', foreground: '#0B0B0B' },
        secondary: { DEFAULT: '#1C1A18', foreground: '#F5F1E8' },
        muted: { DEFAULT: '#1C1A18', foreground: '#A39E95' },
        accent: { DEFAULT: '#E8CE8B', foreground: '#0B0B0B' },
        destructive: { DEFAULT: '#B4452F', foreground: '#F5F1E8' },
        card: { DEFAULT: '#141414', foreground: '#F5F1E8' },
        popover: { DEFAULT: '#141414', foreground: '#F5F1E8' },
      },
      fontFamily: {
        // Jost: geométrico art-déco que dialoga con el logo EXIRACKS. Cormorant: display de lujo.
        sans: ['Jost', 'system-ui', 'sans-serif'],
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      letterSpacing: { brand: '0.42em' },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      boxShadow: {
        gold: '0 0 0 1px rgba(201,162,75,0.25), 0 24px 60px -20px rgba(201,162,75,0.35)',
        'gold-sm': '0 14px 40px -18px rgba(201,162,75,0.4)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #8A6B2E 0%, #C9A24B 30%, #F0DDA6 52%, #C9A24B 74%, #8A6B2E 100%)',
        'gold-line': 'linear-gradient(90deg, transparent, #C9A24B 50%, transparent)',
        spotlight: 'radial-gradient(60% 60% at 50% 38%, rgba(201,162,75,0.18) 0%, rgba(201,162,75,0.04) 45%, transparent 72%)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
      },
      // sin fill-mode "both": el estado base es visible aunque la animación no corra.
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        marquee: 'marquee 34s linear infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
