/**
 * Siirt Kurtalan Ekspres design tokens.
 *
 * The palette is derived from the company assets in `brand/`: the wordmark is a
 * heavy condensed red (~#B0342A) with a near-black outline, and the coach livery
 * adds a warm ember gradient over white. Neutrals are intentionally warm
 * (charcoal, not blue-slate) so the product reads as an intercity coach brand.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/**/*.{ts,tsx}',
    '../../apps/passenger-web/src/**/*.{ts,tsx}',
    '../../apps/admin-web/src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Semantic tokens (kept so existing shadcn-style utilities keep working).
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // Brand red — primary actions, active states, route lines.
        brand: {
          50: '#FFF5F2',
          100: '#FFE6DF',
          200: '#FFC9BB',
          300: '#FBA28C',
          400: '#F2705A',
          500: '#E14A33',
          600: '#C4331F',
          700: '#A32619',
          800: '#842016',
          900: '#6B1D16',
          950: '#3A0B07',
        },
        // Ember — the warm accent from the coach livery. Highlights only.
        ember: {
          50: '#FFF8ED',
          100: '#FFEDD2',
          200: '#FFD8A4',
          300: '#FFBC6B',
          400: '#FF9A33',
          500: '#F97D11',
          600: '#DC5F07',
          700: '#B6440A',
          800: '#93370F',
          900: '#792F10',
        },
        // Ink — warm charcoal neutrals used for headers, panels and text.
        ink: {
          50: '#F8F7F5',
          100: '#F1EEEA',
          200: '#E3DED8',
          300: '#CDC5BC',
          400: '#A79C91',
          500: '#857A6F',
          600: '#6A6058',
          700: '#4E4640',
          800: '#332D29',
          900: '#1E1A17',
          950: '#12100E',
        },
      },
      fontFamily: {
        sans: [
          'var(--font-inter)',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
        display: [
          'var(--font-display)',
          'var(--font-inter)',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        tightest: '-0.045em',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(30, 26, 23, 0.05), 0 10px 26px -20px rgba(30, 26, 23, 0.45)',
        lift: '0 2px 6px rgba(30, 26, 23, 0.06), 0 22px 46px -28px rgba(30, 26, 23, 0.55)',
        panel: '0 30px 70px -40px rgba(18, 16, 14, 0.75)',
        brand: '0 10px 26px -14px rgba(163, 38, 25, 0.75)',
        seat: 'inset 0 -2px 0 rgba(30, 26, 23, 0.12)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #C4331F 0%, #A32619 55%, #F97D11 160%)',
        'ink-gradient': 'linear-gradient(160deg, #1E1A17 0%, #12100E 55%, #2A211C 100%)',
        'ember-sweep':
          'radial-gradient(120% 90% at 85% 5%, rgba(249, 125, 17, 0.35) 0%, transparent 55%)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.55)' },
          '70%': { boxShadow: '0 0 0 8px rgba(16, 185, 129, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-up': 'fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
