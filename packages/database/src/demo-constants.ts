import { createHash } from 'crypto';

export const DEMO_CREDENTIALS = {
  passenger: { email: 'yolcu@siirtkurtalan.demo', password: 'Demo123!' },
  admin: { email: 'admin@siirtkurtalan.demo', password: 'Admin123!' },
} as const;

export function demoUuid(name: string): string {
  const hex = createHash('sha256').update(`siirt-kurtalan-demo:${name}`).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

export const DEMO_IDS = {
  passenger: demoUuid('user:passenger'),
  admin: demoUuid('user:admin'),
  siirt: demoUuid('location:siirt'),
  kurtalan: demoUuid('location:kurtalan'),
  batman: demoUuid('location:batman'),
  diyarbakir: demoUuid('location:diyarbakir'),
  route: demoUuid('route:siirt-diyarbakir'),
  bus: demoUuid('bus:56-ske-01'),
  morningTrip: demoUuid('trip:tomorrow-morning'),
  afternoonTrip: demoUuid('trip:tomorrow-afternoon'),
  followingTrip: demoUuid('trip:following-morning'),
  liveTrip: demoUuid('trip:live'),
  activeOrder: demoUuid('order:active-ticket'),
  activePayment: demoUuid('payment:active-ticket'),
  activeTicket: demoUuid('ticket:active'),
  activeQrTokenHash: createHash('sha256').update('siirt-kurtalan-demo:ticket-qr').digest('hex'),
} as const;
