export type TripStatus = 'scheduled' | 'boarding' | 'in_transit' | 'completed' | 'cancelled';

export const tripStatusMeta: Record<TripStatus, { label: string; bg: string; fg: string }> = {
  scheduled: { label: 'Planlandı', bg: '#EEF0F3', fg: '#344054' },
  boarding: { label: 'Yolcu alımı', bg: '#FEF3C7', fg: '#92400E' },
  in_transit: { label: 'Yolda', bg: '#DBEAFE', fg: '#1E40AF' },
  completed: { label: 'Tamamlandı', bg: '#DCFCE7', fg: '#166534' },
  cancelled: { label: 'İptal', bg: '#FEE2E2', fg: '#991B1B' },
};

/** Solid tones for distribution bars; each status keeps its chip hue family. */
export const tripStatusBar: Record<TripStatus, string> = {
  scheduled: '#8A96A8',
  boarding: '#F59E0B',
  in_transit: '#3B82F6',
  completed: '#22C55E',
  cancelled: '#EF4444',
};

export const tripStatusOrder: TripStatus[] = [
  'scheduled',
  'boarding',
  'in_transit',
  'completed',
  'cancelled',
];

export function statusMeta(status: string) {
  return tripStatusMeta[status as TripStatus] ?? { label: status, bg: '#EEF0F3', fg: '#344054' };
}

export const isClosedTrip = (status: string) => status === 'completed' || status === 'cancelled';

/** Operations run on Turkey time; server components render on UTC hosts. */
export const OPERATIONS_TIME_ZONE = 'Europe/Istanbul';

export function formatClock(value: string | Date) {
  return new Date(value).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: OPERATIONS_TIME_ZONE,
  });
}

export function formatDay(value: string | Date) {
  return new Date(value).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    timeZone: OPERATIONS_TIME_ZONE,
  });
}

/** YYYY-MM-DD in operations time, comparable with report day keys. */
export function dayKey(value: string | Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: OPERATIONS_TIME_ZONE }).format(
    new Date(value),
  );
}

/** Short operator-facing code derived from the trip id (no separate trip number exists). */
export function tripCode(id: string) {
  return `SF-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

export function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toLocaleUpperCase('tr-TR');
}

export function isSameOperationsDay(value: string | Date, reference: string | Date = new Date()) {
  return dayKey(value) === dayKey(reference);
}

export function formatMoney(minor: number) {
  return `${(minor / 100).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺`;
}

/** Two trips overlap when their [departure, arrival] windows intersect. */
export function tripsOverlap(
  a: { departureTime: string; arrivalTime: string },
  b: { departureTime: string; arrivalTime: string },
) {
  return (
    new Date(a.departureTime).getTime() < new Date(b.arrivalTime).getTime() &&
    new Date(b.departureTime).getTime() < new Date(a.arrivalTime).getTime()
  );
}
