import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  canEncodeAudio,
  Conversion,
  Input,
  Mp3OutputFormat,
  Output,
} from 'mediabunny';
import { registerMp3Encoder } from '@mediabunny/mp3-encoder';
import { MP3_BITRATE, TARGET_SAMPLE_RATE } from '../../types';

export async function ensureMp3Support(): Promise<void> {
  if (!(await canEncodeAudio('mp3'))) {
    registerMp3Encoder();
  }
}

export async function encodeSliceToMp3(
  file: File,
  start: number,
  end: number,
  onProgress?: (p: number) => void,
): Promise<ArrayBuffer> {
  await ensureMp3Support();

  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  try {
    const target = new BufferTarget();
    const output = new Output({ format: new Mp3OutputFormat(), target });

    const conversion = await Conversion.init({
      input,
      output,
      trim: { start, end },
      video: { discard: true },
      audio: {
        codec: 'mp3',
        numberOfChannels: 1,
        sampleRate: TARGET_SAMPLE_RATE,
        bitrate: MP3_BITRATE,
      },
      showWarnings: false,
    });

    if (onProgress) {
      conversion.onProgress = (progress) => {
        onProgress(progress);
      };
    }

    await conversion.execute();

    const buffer = target.buffer;
    if (!buffer) throw new Error('MP3 encoding produced no output');
    return buffer;
  } finally {
    input.dispose();
  }
}
