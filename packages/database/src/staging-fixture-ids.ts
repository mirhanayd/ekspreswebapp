import { DEMO_IDS, demoUuid } from './demo-constants.js';

// Dedicated staging records. Older demo trips and their bookings are left untouched.
export const stagingUuid = (name: string) => demoUuid(`driver-ready:${name}`);

export const STAGING_IDS = {
  siirt: DEMO_IDS.siirt,
  kurtalan: DEMO_IDS.kurtalan,
  batman: DEMO_IDS.batman,
  diyarbakir: DEMO_IDS.diyarbakir,
  route: stagingUuid('route'),
  bus: stagingUuid('bus'),
  liveTrip: stagingUuid('trip:live'),
  morningTrip: stagingUuid('trip:tomorrow-morning'),
  afternoonTrip: stagingUuid('trip:tomorrow-afternoon'),
  followingTrip: stagingUuid('trip:following-morning'),
  activeOrder: stagingUuid('order:active-ticket'),
  activePayment: stagingUuid('payment:active-ticket'),
  activeTicket: stagingUuid('ticket:active'),
} as const;
