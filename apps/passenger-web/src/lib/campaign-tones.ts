import type { Campaign } from './campaigns';

/** Card colours per campaign artwork: brand red, dark, and white. `--accent` colours the reward figure. */
export const CAMPAIGN_TONES: Record<Campaign['artwork'], string> = {
  ticket: 'border-sk-brand bg-sk-brand text-white [--accent:#FFFFFF]',
  seats: 'border-sk-dark bg-sk-dark text-white [--accent:#FF8A80]',
  invite: 'border-sk-line bg-white text-sk-ink [--accent:#C8231B]',
};
