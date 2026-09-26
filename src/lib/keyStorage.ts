export const SESSION_KEY = 'or_stt_api_key';

export function loadSessionKey(): string {
  try {
    if (typeof sessionStorage === 'undefined') return '';
    return sessionStorage.getItem(SESSION_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveSessionKey(key: string): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(SESSION_KEY, key);
  } catch {
    /* storage unavailable */
  }
}

export function clearSessionKey(): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
}
