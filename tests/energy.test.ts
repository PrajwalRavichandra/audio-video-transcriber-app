import { describe, it, expect } from 'vitest';
import { dbFromRms, downsampleTo16k, frameEnergy } from '../src/features/audio/energy';

describe('frameEnergy', () => {
  it('computes ~0.707 RMS for a full-scale sine', () => {
    const sampleRate = 16000;
    const mono = new Float32Array(sampleRate);
    for (let i = 0; i < mono.length; i++) {
      mono[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate);
    }

    const energies = frameEnergy(mono, sampleRate, 20);
    expect(energies.length).toBe(50);
    for (const v of energies) {
      expect(Math.abs(v - 0.7071)).toBeLessThan(0.01);
    }
  });

  it('returns ~0 for silence and -Infinity dB', () => {
    const energies = frameEnergy(new Float32Array(16000), 16000, 20);
    expect(energies.length).toBe(50);
    for (const v of energies) {
      expect(v).toBeLessThan(1e-6);
    }
    expect(dbFromRms(0)).toBe(-Infinity);
  });
});

describe('downsampleTo16k', () => {
  it('produces output length proportional to the rate ratio', () => {
    const out = downsampleTo16k(new Float32Array(48000), 48000);
    expect(out.length).toBe(16000);
    expect(downsampleTo16k(new Float32Array(44100), 44100).length).toBe(16000);
  });

  it('preserves DC', () => {
    const dc = new Float32Array(48000).fill(0.5);
    const out = downsampleTo16k(dc, 48000);
    expect(out.length).toBe(16000);
    for (const v of out) {
      expect(Math.abs(v - 0.5)).toBeLessThan(1e-4);
    }
  });
});
