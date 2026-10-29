import type { Config } from 'tailwindcss';
import sharedConfig from '@ekspres/ui/tailwind.config';

/**
 * Admin console runs its own light corporate palette. `ink` and `brand` are
 * remapped here so every existing utility (tickets, reports) follows the
 * console tokens instead of the passenger forest/lime system.
 */
const config: Pick<Config, 'prefix' | 'presets' | 'content' | 'theme'> = {
  content: ['./src/**/*.tsx'],
  presets: [sharedConfig],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#F4F5F7',
          100: '#EEF0F3',
          200: '#E3E6EB',
          300: '#CBD2DC',
          400: '#8A96A8',
          500: '#5D6B7E',
          600: '#4A5668',
          700: '#344054',
          800: '#1D2939',
          900: '#101828',
          950: '#0B111C',
        },
        brand: {
          50: '#FBEDEB',
          100: '#F6D9D5',
          200: '#EDB5AE',
          300: '#E08A80',
          400: '#D45E52',
          500: '#C63E31',
          600: '#B8261B',
          700: '#B8261B',
          800: '#9C1F16',
          900: '#7A1811',
        },
        adm: {
          bg: '#F4F5F7',
          surface: '#FFFFFF',
          line: '#E3E6EB',
          text: '#101828',
          muted: '#5D6B7E',
          brand: '#B8261B',
          'brand-hover': '#9C1F16',
          'sel-bg': '#FBEDEB',
          'sel-text': '#A3221A',
          bar: '#CBD2DC',
        },
      },
      fontFamily: {
        sans: ['var(--font-plex-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-plex-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04)',
      },
    },
  },
};

export default config;
