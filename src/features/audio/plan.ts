import type { ChunkPlanItem } from '../../types';

export const DEFAULT_FRAME_MS = 20;

export function buildChunkPlan(opts: {
  duration: number;
  energies: Float32Array;
  frameMs?: number;
  chunkSeconds: number;
  overlapSeconds: number;
}): ChunkPlanItem[] {
  const { duration, energies, chunkSeconds, overlapSeconds } = opts;
  const frameMs = opts.frameMs ?? DEFAULT_FRAME_MS;
  const frameSec = frameMs / 1000;
  const items: ChunkPlanItem[] = [];

  if (!(duration > 0) || !(chunkSeconds > 0)) return items;

  const minChunk = chunkSeconds * 0.5;
  let start = 0;
  let index = 0;

  for (;;) {
    const nominalEnd = Math.min(start + chunkSeconds, duration);

    if (duration - nominalEnd <= 1e-6 || nominalEnd >= duration) {
      items.push({ index, start, end: duration, boundary: 'end' });
      break;
    }

    const windowStart = nominalEnd - overlapSeconds;
    const windowEnd = nominalEnd + overlapSeconds;

    let bestIdx = -1;
    let bestRms = Infinity;
    const firstFrame = Math.max(0, Math.ceil(windowStart / frameSec - 1e-9));
    for (let i = firstFrame; i < energies.length; i++) {
      const t = i * frameSec;
      if (t < windowStart - 1e-9) continue;
      if (t > windowEnd + 1e-9) break;
      if (energies[i] < bestRms) {
        bestRms = energies[i];
        bestIdx = i;
      }
    }

    let end: number;
    let boundary: ChunkPlanItem['boundary'];
    if (bestIdx < 0) {
      end = nominalEnd;
      boundary = 'hard';
    } else {
      end = bestIdx * frameSec;
      end = Math.max(start + minChunk, Math.min(end, duration));
      boundary = 'silence';
    }

    items.push({ index, start, end, boundary });

    let nextStart = end - overlapSeconds;
    if (nextStart <= start + 1) nextStart = end;
    start = nextStart;
    index++;

    if (items.length > 1_000_000) break;
  }

  return items;
}
