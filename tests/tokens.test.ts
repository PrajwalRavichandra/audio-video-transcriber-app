import { describe, it, expect } from 'vitest';
import { tokenize, normalizeToken, longestOverlap } from '../src/lib/tokens';

describe('tokenize', () => {
  it('splits on multiple spaces and newlines', () => {
    expect(tokenize('  hello   world\n\nfoo\t bar ')).toEqual(['hello', 'world', 'foo', 'bar']);
  });

  it('returns empty array for whitespace only', () => {
    expect(tokenize('   \n\t ')).toEqual([]);
  });

  it('keeps punctuation attached', () => {
    expect(tokenize('hello, world!')).toEqual(['hello,', 'world!']);
  });
});

describe('normalizeToken', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalizeToken('Hello,')).toBe('hello');
    expect(normalizeToken('"WORLD!"')).toBe('world');
  });

  it('keeps unicode letters and digits', () => {
    expect(normalizeToken('(Café)')).toBe('café');
    expect(normalizeToken('#42')).toBe('42');
  });
});

describe('longestOverlap', () => {
  it('finds exact match', () => {
    expect(longestOverlap(['a', 'b', 'c'], ['c', 'd'], 10)).toBe(1);
    expect(longestOverlap(['a', 'b', 'c'], ['b', 'c', 'd'], 10)).toBe(2);
  });

  it('returns 0 when no match', () => {
    expect(longestOverlap(['a', 'b'], ['c', 'd'], 10)).toBe(0);
  });

  it('matches despite case and punctuation differences', () => {
    expect(longestOverlap(['Hello', 'World'], ['world', 'Again'], 10)).toBe(1);
    expect(longestOverlap(['end.', 'of', 'sentence'], ['Of', 'sentence'], 10)).toBe(2);
  });

  it('respects maxTokens', () => {
    expect(longestOverlap(['x', 'a', 'b'], ['a', 'b', 'c'], 2)).toBe(2);
    expect(longestOverlap(['x', 'a', 'b'], ['a', 'b', 'c'], 1)).toBe(0);
    expect(longestOverlap(['x', 'a', 'b', 'c'], ['a', 'b', 'c'], 3)).toBe(3);
    expect(longestOverlap(['x', 'a', 'b', 'c'], ['a', 'b', 'c'], 2)).toBe(0);
  });
});
