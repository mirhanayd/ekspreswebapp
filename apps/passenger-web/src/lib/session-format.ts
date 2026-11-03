/** Client-safe: lib/session.ts reads cookies on the server only. */
export function initials(first: string, last: string) {
  return `${first.trim()[0] ?? ''}${last.trim()[0] ?? ''}`.toLocaleUpperCase('tr-TR');
}
