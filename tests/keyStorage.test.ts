import { describe, it, expect, beforeEach } from 'vitest';
import {
  SESSION_KEY,
  clearSessionKey,
  loadSessionKey,
  saveSessionKey,
} from '../src/lib/keyStorage';

describe('keyStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('saves then loads the value', () => {
    saveSessionKey('sk-or-v1-abcdef123456');
    expect(loadSessionKey()).toBe('sk-or-v1-abcdef123456');
    expect(sessionStorage.getItem(SESSION_KEY)).toBe('sk-or-v1-abcdef123456');
  });

  it('clears the stored value', () => {
    saveSessionKey('sk-or-v1-abcdef123456');
    clearSessionKey();
    expect(loadSessionKey()).toBe('');
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('returns empty string when no value is stored', () => {
    expect(loadSessionKey()).toBe('');
  });
});
