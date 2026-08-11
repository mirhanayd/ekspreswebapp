const TR = 'tr-TR';

export function formatTime(value: string | Date): string {
  return new Date(value).toLocaleTimeString(TR, { hour: '2-digit', minute: '2-digit' });
}

export function formatDayMonth(value: string | Date): string {
  return new Date(value).toLocaleDateString(TR, { day: 'numeric', month: 'long' });
}

export function formatLongDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(TR, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function formatShortDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(TR, { day: '2-digit', month: '2-digit' });
}

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString(TR, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPrice(value: number): string {
  return `${value.toLocaleString(TR, { maximumFractionDigits: 2 })} ₺`;
}

export function formatMinorPrice(minor: number): string {
  return formatPrice(minor / 100);
}

/** Minutes → "3 sa 20 dk" (drops the hour part below 60 minutes). */
export function formatDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (!hours) return `${rest} dk`;
  return rest ? `${hours} sa ${rest} dk` : `${hours} sa`;
}

export function minutesBetween(from: string | Date, to: string | Date): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000);
}

/** ISO `YYYY-MM-DD` for a day offset from today, in local time. */
export function isoDate(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

export function dateFromIso(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

/**
 * Terminal names are long ("Diyarbakır Şehirlerarası Terminali"). Journey cards
 * lead with the settlement name and keep the full label as the caption.
 */
export function placeShortName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export const tripStatusLabel: Record<string, string> = {
  scheduled: 'Planlandı',
  boarding: 'Biniş başladı',
  in_transit: 'Yolda',
  completed: 'Tamamlandı',
  cancelled: 'İptal edildi',
};

export const ticketStatusLabel: Record<string, string> = {
  active: 'Aktif',
  used: 'Kullanıldı',
  cancelled: 'İptal',
  expired: 'Süresi doldu',
};
