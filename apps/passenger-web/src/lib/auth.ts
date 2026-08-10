export const ACCESS_TOKEN_COOKIE = 'ekspres_access_token';

export function safeReturnTo(value?: string): string {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/';
}
