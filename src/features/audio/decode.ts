import { ALL_FORMATS, AudioSampleSink, BlobSource, Input } from 'mediabunny';
import { TARGET_SAMPLE_RATE, type MediaInfo } from '../../types';
import { ENERGY_FRAME_MS } from './energy';

export async function readMediaInfo(file: File): Promise<MediaInfo> {
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track) throw new Error('No audio track found');

    const codec = await track.getCodec();
    const channels = await track.getNumberOfChannels();
    const sampleRate = await track.getSampleRate();
    const duration = await input.computeDuration();
    const format = await input.getMimeType();

    return {
      name: file.name,
      size: file.size,
      duration,
      format,
      codec: codec ?? undefined,
      channels,
      sampleRate,
    };
  } finally {
    input.dispose();
  }
}

export async function scanEnergies(
  file: File,
  duration: number,
  onProgress?: (p: number) => void,
): Promise<{ energies: Float32Array; frameMs: number }> {
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track) throw new Error('No audio track found');

    const sampleRate = await track.getSampleRate();
    const sink = new AudioSampleSink(track);

    const frameSamples = Math.max(
      1,
      Math.round((TARGET_SAMPLE_RATE * ENERGY_FRAME_MS) / 1000),
    );
    const ratio = sampleRate / TARGET_SAMPLE_RATE;
    const energies: number[] = [];

    let sumSq = 0;
    let count = 0;

    let carry = new Float32Array(0);
    let carryStart = 0;
    let nextOut = 0;

    for await (const sample of sink.samples(0, duration)) {
      try {
        // `audioSampleToInterleavedFormat` is not exported by this mediabunny build;
        // `copyTo` with an interleaved `f32` destination performs the same conversion.
        const frames = sample.numberOfFrames;
        const channels = sample.numberOfChannels;
        const data = new Float32Array(frames * channels);
        sample.copyTo(data, { planeIndex: 0, format: 'f32' });

        const mono = new Float32Array(frames);
        if (channels === 1) {
          mono.set(data);
        } else {
          for (let i = 0; i < frames; i++) {
            let acc = 0;
            const base = i * channels;
            for (let c = 0; c < channels; c++) acc += data[base + c];
            mono[i] = acc / channels;
          }
        }

        const buf = new Float32Array(carry.length + frames);
        buf.set(carry, 0);
        buf.set(mono, carry.length);

        const limit = carryStart + buf.length;
        while (Math.floor(nextOut * ratio) + 1 < limit) {
          const pos = nextOut * ratio;
          const floor = Math.floor(pos);
          const idx = floor - carryStart;
          if (idx < 0) {
            nextOut++;
            continue;
          }
          const frac = pos - floor;
          const a = buf[idx];
          const b = buf[idx + 1];
          const v = a + (b - a) * frac;
          sumSq += v * v;
          count++;
          if (count === frameSamples) {
            energies.push(Math.sqrt(sumSq / frameSamples));
            sumSq = 0;
            count = 0;
          }
          nextOut++;
        }

        const keepFrom = Math.floor(nextOut * ratio) - carryStart;
        if (keepFrom >= 0 && keepFrom < buf.length) {
          carry = buf.slice(keepFrom);
          carryStart = carryStart + keepFrom;
        } else if (keepFrom >= buf.length) {
          carry = new Float32Array(0);
          carryStart = limit;
        }

        if (onProgress && duration > 0) {
          const p = (sample.timestamp + sample.duration) / duration;
          onProgress(Math.max(0, Math.min(1, p)));
        }
      } finally {
        sample.close();
      }
    }

    return { energies: Float32Array.from(energies), frameMs: ENERGY_FRAME_MS };
  } finally {
    input.dispose();
  }
}
