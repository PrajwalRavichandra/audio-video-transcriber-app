import { describe, it, expect } from 'vitest';
import { buildChunkPlan, DEFAULT_FRAME_MS } from '../src/features/audio/plan';

function uniformEnergies(seconds: number, value = 0.5): Float32Array {
  const frames = Math.round((seconds * 1000) / DEFAULT_FRAME_MS);
  return new Float32Array(frames).fill(value);
}

function silenceAt(energies: Float32Array, seconds: number): void {
  energies[Math.round((seconds * 1000) / DEFAULT_FRAME_MS)] = 0;
}

describe('buildChunkPlan', () => {
  it('snaps a boundary to the quiet frame near the nominal end', () => {
    const duration = 30;
    const energies = uniformEnergies(duration);
    silenceAt(energies, 10);

    const items = buildChunkPlan({ duration, energies, chunkSeconds: 10, overlapSeconds: 2 });

    expect(items.length).toBeGreaterThan(1);
    expect(items[0].start).toBe(0);
    expect(items[0].end).toBeCloseTo(10, 6);
    expect(items[0].boundary).toBe('silence');
  });

  it('produces the expected chunk count for a long duration', () => {
    const duration = 1000;
    const energies = uniformEnergies(duration);
    silenceAt(energies, 300);
    silenceAt(energies, 600);
    silenceAt(energies, 900);

    const items = buildChunkPlan({ duration, energies, chunkSeconds: 300, overlapSeconds: 15 });

    expect(items.length).toBe(4);
    expect(items[0].end).toBeCloseTo(300, 6);
    expect(items[1].end).toBeCloseTo(600, 6);
    expect(items[2].end).toBeCloseTo(900, 6);
  });

  it('ends the final item at the duration with boundary "end"', () => {
    const duration = 1000;
    const energies = uniformEnergies(duration);

    const items = buildChunkPlan({ duration, energies, chunkSeconds: 300, overlapSeconds: 15 });
    const last = items[items.length - 1];

    expect(last.end).toBeCloseTo(duration, 6);
    expect(last.boundary).toBe('end');
  });

  it('overlaps consecutive items by the overlap duration', () => {
    const duration = 60;
    const energies = uniformEnergies(duration);

    const items = buildChunkPlan({ duration, energies, chunkSeconds: 10, overlapSeconds: 2 });

    expect(items.length).toBeGreaterThan(1);
    for (let i = 0; i < items.length - 1; i++) {
      expect(items[i + 1].start).toBeCloseTo(items[i].end - 2, 6);
      expect(items[i + 1].start).toBeLessThan(items[i].end);
    }
  });

  it('does not loop forever on zero energy', () => {
    const duration = 120;
    const energies = uniformEnergies(duration, 0);

    const items = buildChunkPlan({ duration, energies, chunkSeconds: 10, overlapSeconds: 2 });

    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThan(100);
    for (const item of items) {
      expect(item.end).toBeGreaterThan(item.start);
    }
  });
});
