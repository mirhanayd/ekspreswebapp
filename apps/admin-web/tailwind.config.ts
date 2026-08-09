import type { Config } from 'tailwindcss';
import sharedConfig from '@ekspres/ui/tailwind.config';

const config: Pick<Config, 'prefix' | 'presets' | 'content'> = {
  content: ['./src/**/*.tsx'],
  presets: [sharedConfig],
};

export default config;
