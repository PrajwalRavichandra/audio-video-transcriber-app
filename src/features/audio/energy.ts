import { TARGET_SAMPLE_RATE } from '../../types';

export const ENERGY_FRAME_MS = 20;

export function frameEnergy(
  mono: Float32Array,
  sampleRate: number,
  frameMs: number = ENERGY_FRAME_MS,
): Float32Array {
  const frameSamples = Math.max(1, Math.round((sampleRate * frameMs) / 1000));
  const frameCount = Math.floor(mono.length / frameSamples);
  const out = new Float32Array(frameCount);
  for (let f = 0; f < frameCount; f++) {
    const offset = f * frameSamples;
    let sumSq = 0;
    for (let i = 0; i < frameSamples; i++) {
      const v = mono[offset + i];
      sumSq += v * v;
    }
    out[f] = Math.sqrt(sumSq / frameSamples);
  }
  return out;
}

export function downsampleTo16k(mono: Float32Array, inputRate: number): Float32Array {
  if (inputRate === TARGET_SAMPLE_RATE) return mono.slice();
  if (inputRate <= 0 || mono.length === 0) return new Float32Array(0);
  const outLen = Math.floor((mono.length * TARGET_SAMPLE_RATE) / inputRate);
  const out = new Float32Array(outLen);
  const ratio = inputRate / TARGET_SAMPLE_RATE;
  const last = mono.length - 1;
  for (let m = 0; m < outLen; m++) {
    const pos = m * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = mono[idx];
    const b = mono[idx >= last ? last : idx + 1];
    out[m] = a + (b - a) * frac;
  }
  return out;
}

export function dbFromRms(rms: number): number {
  return rms > 0 ? 20 * Math.log10(rms) : -Infinity;
}
