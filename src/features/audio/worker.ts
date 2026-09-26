/// <reference lib="webworker" />
import {
  DEFAULT_SETTINGS,
  TARGET_SAMPLE_RATE,
  type AudioWorkerRequest,
  type AudioWorkerResponse,
  type ChunkPlan,
} from '../../types';
import { readMediaInfo, scanEnergies } from './decode';
import { encodeSliceToMp3 } from './encode';
import { buildChunkPlan } from './plan';

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const cancelled = new Set<number>();

function post(message: AudioWorkerResponse, transfer?: Transferable[]): void {
  if (transfer && transfer.length > 0) {
    ctx.postMessage(message, transfer);
  } else {
    ctx.postMessage(message);
  }
}

ctx.onmessage = async (event: MessageEvent<AudioWorkerRequest>): Promise<void> => {
  const req = event.data;

  if (req.type === 'cancel') {
    cancelled.add(req.jobId);
    return;
  }

  try {
    if (req.type === 'plan') {
      const file = req.file;
      if (!file) throw new Error('Missing file for plan job');

      const media = await readMediaInfo(file);
      const { energies, frameMs } = await scanEnergies(file, media.duration, (progress) =>
        post({ type: 'progress', jobId: req.jobId, stage: 'decode', progress }),
      );

      if (cancelled.has(req.jobId)) {
        cancelled.delete(req.jobId);
        post({ type: 'cancelled', jobId: req.jobId });
        return;
      }

      const items = buildChunkPlan({
        duration: media.duration,
        energies,
        frameMs,
        chunkSeconds: req.chunkSeconds ?? DEFAULT_SETTINGS.chunkSeconds,
        overlapSeconds: req.overlapSeconds ?? DEFAULT_SETTINGS.overlapSeconds,
      });
      const plan: ChunkPlan = {
        items,
        duration: media.duration,
        sampleRate: TARGET_SAMPLE_RATE,
      };

      post({ type: 'plan', jobId: req.jobId, plan, media });
      return;
    }

    if (req.type === 'encode') {
      const file = req.file;
      if (!file) throw new Error('Missing file for encode job');
      const items = req.items ?? [];
      const total = items.length || 1;
      let completed = 0;

      for (const item of items) {
        if (cancelled.has(req.jobId)) {
          cancelled.delete(req.jobId);
          post({ type: 'cancelled', jobId: req.jobId });
          return;
        }

        const buffer = await encodeSliceToMp3(file, item.start, item.end, (progress) =>
          post({
            type: 'progress',
            jobId: req.jobId,
            stage: 'encode',
            progress: (completed + progress) / total,
          }),
        );

        if (cancelled.has(req.jobId)) {
          cancelled.delete(req.jobId);
          post({ type: 'cancelled', jobId: req.jobId });
          return;
        }

        post({ type: 'chunk', jobId: req.jobId, index: item.index, buffer }, [buffer]);
        completed++;
      }

      post({ type: 'done', jobId: req.jobId });
      return;
    }
  } catch (error) {
    post({
      type: 'error',
      jobId: req.jobId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

export {};
