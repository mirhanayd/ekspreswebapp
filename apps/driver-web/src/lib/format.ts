/** Optional operations-center number for the "Ara" / "Sorun bildir" actions. */
export const OPERATIONS_PHONE = process.env.NEXT_PUBLIC_OPERATIONS_PHONE?.replace(/\s/g, '') || '';

export function formatTime(value: string | Date) {
  return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  );
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

export function formatToday(value: number) {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
  return `${day} · ${formatTime(date)}`;
}

/** 7.2 → "7,2". */
export function formatKm(km: number) {
  return (Math.round(km * 10) / 10).toFixed(1).replace('.', ',');
}

export function shortName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

const BACK_VOWELS = 'aıou';
const VOWELS = 'aıoueiöü';
const HARD_CONSONANTS = 'fstkçşhp';

function harmony(word: string) {
  const lower = word.toLocaleLowerCase('tr-TR');
  const vowels = lower.split('').filter((char) => VOWELS.includes(char));
  const back = BACK_VOWELS.includes(vowels[vowels.length - 1] ?? 'e');
  const last = lower[lower.length - 1] ?? '';
  return { back, endsInVowel: VOWELS.includes(last), hard: HARD_CONSONANTS.includes(last) };
}

/** "Batman" → "Batman’a"; "Siirt" → "Siirt’e". */
export function dative(place: string) {
  const { back, endsInVowel } = harmony(place);
  return `${place}’${endsInVowel ? 'y' : ''}${back ? 'a' : 'e'}`;
}

/** "Batman" → "Batman’da"; "Siirt" → "Siirt’te". */
export function locative(place: string) {
  const { back, hard } = harmony(place);
  return `${place}’${hard ? 't' : 'd'}${back ? 'a' : 'e'}`;
}

/** "Batman" → "Batman’dan"; "Siirt" → "Siirt’ten". */
export function ablative(place: string) {
  return `${locative(place)}n`;
}
