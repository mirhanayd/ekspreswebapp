import type { Config } from 'tailwindcss';
import sharedConfig from '@ekspres/ui/tailwind.config';

const config: Pick<Config, 'prefix' | 'presets' | 'content' | 'theme'> = {
  content: ['./src/**/*.tsx'],
  presets: [sharedConfig],
  theme: {
    extend: {
      colors: {
        // Passenger app palette ("Yolcu Uygulaması" design).
        sk: {
          bg: '#F1F1EF',
          card: '#FFFFFF',
          ink: '#15161A',
          ink2: '#585D66',
          ink3: '#6A6F78',
          brand: '#C8231B',
          brandInk: '#A11C15',
          tint: '#FBEAE8',
          dark: '#16171B',
          line: '#E3E3DF',
          hair: '#EFEFEC',
          mute: '#B9BDC6',
          ok: '#17643E',
          okBg: '#E3F3EA',
        },
      },
      fontFamily: {
        sans: ['var(--font-archivo)', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['var(--font-archivo)', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      transitionTimingFunction: {
        nav: 'cubic-bezier(.32,.72,0,1)',
        spring: 'cubic-bezier(.34,1.56,.64,1)',
        settle: 'cubic-bezier(.22,1,.36,1)',
      },
    },
  },
};

export default config;
