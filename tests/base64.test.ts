import { describe, it, expect } from 'vitest';
import { arrayBufferToBase64, base64ToArrayBuffer } from '../src/lib/base64';

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(length));
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

function bytesFromString(value: string): ArrayBuffer {
  return new TextEncoder().encode(value).buffer;
}

describe('base64', () => {
  it('encodes known string', () => {
    expect(arrayBufferToBase64(bytesFromString('Man'))).toBe('TWFu');
  });

  it('encodes empty buffer', () => {
    expect(arrayBufferToBase64(new ArrayBuffer(0))).toBe('');
  });

  it('round-trips random bytes including 0 and 255 and non-multiple-of-3 lengths', () => {
    for (const length of [1, 2, 3, 4, 5, 31, 4096, 70000]) {
      const bytes = randomBytes(length);
      bytes[0] = 0;
      if (length > 1) {
        bytes[length - 1] = 255;
      }

      const encoded = arrayBufferToBase64(bytes.buffer);
      const decoded = new Uint8Array(base64ToArrayBuffer(encoded));

      expect(decoded.length).toBe(length);
      expect(Array.from(decoded)).toEqual(Array.from(bytes));
    }
  });

  it('decodes empty string', () => {
    expect(new Uint8Array(base64ToArrayBuffer('')).length).toBe(0);
  });
});
