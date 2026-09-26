import { describe, it, expect } from 'vitest';
import type { TranscribedChunk } from '../src/types';
import { stitchTranscripts, stitchPartial, wordCount } from '../src/features/stitch/stitcher';

function chunk(index: number, text: string): TranscribedChunk {
  return { index, start: 0, end: 0, text };
}

describe('stitchTranscripts', () => {
  it('dedupes an overlapping phrase exactly once', () => {
    const result = stitchTranscripts([
      chunk(0, 'the quick brown fox'),
      chunk(1, 'brown fox jumps over'),
    ]);
    expect(result).toBe('the quick brown fox jumps over');
  });

  it('chains three chunks correctly', () => {
    const result = stitchTranscripts([
      chunk(0, 'one two three'),
      chunk(1, 'two three four'),
      chunk(2, 'three four five'),
    ]);
    expect(result).toBe('one two three four five');
  });

  it('skips an empty middle chunk', () => {
    const result = stitchTranscripts([
      chunk(0, 'alpha beta'),
      chunk(1, '   '),
      chunk(2, 'beta gamma'),
    ]);
    expect(result).toBe('alpha beta gamma');
  });

  it('concatenates when there is no overlap', () => {
    const result = stitchTranscripts([chunk(0, 'hello world'), chunk(1, 'goodbye moon')]);
    expect(result).toBe('hello world goodbye moon');
  });

  it('passes a single chunk through', () => {
    expect(stitchTranscripts([chunk(0, '  solo chunk  ')])).toBe('solo chunk');
  });

  it('preserves punctuation and case in output', () => {
    const result = stitchTranscripts([chunk(0, 'Hello, World!'), chunk(1, 'world! Again.')]);
    expect(result).toBe('Hello, World! Again.');
  });

  it('sorts chunks by index before stitching', () => {
    const result = stitchTranscripts([chunk(1, 'two three'), chunk(0, 'one two')]);
    expect(result).toBe('one two three');
  });
});

describe('stitchPartial', () => {
  it('behaves like stitchTranscripts for two', () => {
    const prev = 'the quick brown fox';
    const next = 'brown fox jumps';
    const viaPartial = stitchPartial(prev, next);
    const viaChunks = stitchTranscripts([chunk(0, prev), chunk(1, next)]);
    expect(viaPartial).toBe(viaChunks);
    expect(viaPartial).toBe('the quick brown fox jumps');
  });
});

describe('wordCount', () => {
  it('counts whitespace-separated tokens', () => {
    expect(wordCount('  hello   world\nfoo ')).toBe(3);
    expect(wordCount('')).toBe(0);
  });
});
