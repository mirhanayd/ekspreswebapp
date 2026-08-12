/**
 * Design tokens for the Siirt Kurtalan Ekspres apps.
 *
 * Every value here is sampled from the canonical reference screens in `/ui`
 * rather than from any earlier implementation:
 *
 *   ui/mobile-home-reference.png  → sage canvas #E8F3E9, near-black forest
 *                                    #051A09 chrome, lime #CEDE44 active tab
 *   ui/trip-search-reference.png  → cream canvas #F3F2E7, lime #BCCB30 rail and
 *                                    selected date, butter #FFFA93 facts strip
 *   ui/live-map-reference.png     → #1F1F1F journey panel, amber #F7AA12 active
 *                                    stop and duration pill, orange route pin
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
        // Semantic tokens, so shadcn-style utilities keep resolving.
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

        /* Near-black forest green. All chrome, headings and body copy in the
           references sit on this scale — it is never blue-grey. */
        ink: {
          50: '#F1F5F1',
          100: '#E1E8E2',
          200: '#C4D0C6',
          300: '#9CAE9F',
          400: '#6E8372',
          500: '#4C6050',
          600: '#334634',
          700: '#20321F',
          800: '#12220F',
          900: '#051A09',
          950: '#021005',
        },
        /* Home canvas: soft sage. */
        sage: {
          50: '#F3F9F3',
          100: '#E8F3E9',
          200: '#DAEBDD',
          300: '#C6DBCB',
          400: '#A9C6B0',
          500: '#8AAD93',
          600: '#6B8F75',
        },
        /* Booking canvas: warm cream. */
        cream: {
          50: '#FBFBF4',
          100: '#F7F6E2',
          200: '#F3F2E7',
          300: '#E9E7D5',
          400: '#DBD7C6',
          500: '#C7C1A9',
          600: '#A8A189',
        },
        /* Primary action / selection accent. */
        lime: {
          100: '#F1F6C8',
          200: '#E4EE96',
          300: '#DCE96A',
          400: '#CEDE44',
          500: '#BCCB30',
          600: '#A3B221',
          700: '#7F8C1A',
          800: '#5F6915',
          900: '#3F4610',
        },
        /* Live journey highlight: durations, active stop, vehicle marker. */
        amber: {
          100: '#FFF0CE',
          200: '#FFDE93',
          300: '#FFC759',
          400: '#F7AA12',
          500: '#E09206',
          600: '#B57206',
          700: '#8A5606',
        },
        /* The pale yellow facts strip under a journey card. */
        butter: {
          100: '#FFFDD9',
          200: '#FFFA93',
          300: '#F4EC6A',
          400: '#DDD245',
        },
        /* Map pin / route marker orange from the tracking reference. */
        signal: {
          400: '#FF8A4C',
          500: '#F0632A',
          600: '#D24C17',
        },

        /* Compatibility aliases. The admin console is out of scope for this
           reference rebuild, so its existing `brand-*` / `ember-*` utilities are
           remapped onto the new system instead of being rewritten: in `/ui` the
           primary action fill is the near-black forest and the warm accent is
           amber. */
        brand: {
          50: '#F1F5F1',
          100: '#E1E8E2',
          200: '#C4D0C6',
          300: '#9CAE9F',
          400: '#6E8372',
          500: '#4C6050',
          600: '#334634',
          700: '#20321F',
          800: '#12220F',
          900: '#051A09',
          950: '#021005',
        },
        ember: {
          50: '#FFF9EB',
          100: '#FFF0CE',
          200: '#FFDE93',
          300: '#FFC759',
          400: '#F7AA12',
          500: '#E09206',
          600: '#B57206',
          700: '#8A5606',
          800: '#6B4306',
          900: '#4D3105',
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
        display: ['3.25rem', { lineHeight: '0.95', letterSpacing: '-0.04em' }],
      },
      letterSpacing: {
        tightest: '-0.045em',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        tile: '1.125rem',
        card: '1.5rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(5, 26, 9, 0.04), 0 12px 28px -22px rgba(5, 26, 9, 0.4)',
        lift: '0 2px 8px rgba(5, 26, 9, 0.06), 0 22px 44px -28px rgba(5, 26, 9, 0.5)',
        float: '0 10px 30px -12px rgba(5, 26, 9, 0.35)',
        panel: '0 26px 60px -34px rgba(2, 16, 5, 0.8)',
        glass: '0 6px 20px -8px rgba(5, 26, 9, 0.3)',
      },
      backgroundImage: {
        'sage-bloom': 'radial-gradient(90% 60% at 50% 42%, #C6DBCB 0%, #E8F3E9 68%)',
        'ink-gradient': 'linear-gradient(165deg, #12220F 0%, #051A09 60%, #0C2312 100%)',
        'hero-scrim':
          'linear-gradient(to top, rgba(2,16,5,0.86) 0%, rgba(2,16,5,0.62) 34%, rgba(2,16,5,0.18) 62%, rgba(2,16,5,0) 86%)',
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
          '0%': { boxShadow: '0 0 0 0 rgba(247, 170, 18, 0.6)' },
          '70%': { boxShadow: '0 0 0 8px rgba(247, 170, 18, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(247, 170, 18, 0)' },
        },
        /* The opening animation and the drifting road declare their keyframes
           beside the classes that use them, in the passenger stylesheet:
           Tailwind only emits a `@keyframes` block when an `animate-*` utility
           references it, and those are driven from raw CSS. */
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
