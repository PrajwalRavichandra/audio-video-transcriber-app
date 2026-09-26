import { useAppStore } from '../../state/store';
import type {
  AudioWorkerRequest,
  AudioWorkerResponse,
  TranscribedChunk,
} from '../../types';
import { readMediaInfo } from '../audio/decode';
import { transcribeWithRetry } from '../stt/client';
import { stitchTranscripts } from '../stitch/stitcher';

const UPLOAD_CONCURRENCY = 2;

let worker: Worker | null = null;
let jobCounter = 0;
let activeJob = 0;
let abortController: AbortController | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../audio/worker.ts', import.meta.url), {
      type: 'module',
    });
  }
  return worker;
}

function post(message: AudioWorkerRequest): void {
  getWorker().postMessage(message);
}

export async function loadMedia(file: File): Promise<void> {
  const store = useAppStore.getState();
  store.setError(null);
  store.setStatus('loading');
  try {
    const media = await readMediaInfo(file);
    store.setMedia(media);
    store.setStatus('idle');
  } catch (error) {
    store.setError(error instanceof Error ? error.message : String(error));
    store.setMedia(null);
    store.setStatus('error');
  }
}

export function cancelRun(): void {
  abortController?.abort();
  if (activeJob) {
    post({ type: 'cancel', jobId: activeJob });
  }
  useAppStore.getState().setStatus('cancelled');
}

export async function runTranscription(file: File): Promise<void> {
  const store = useAppStore.getState();
  const { apiKey, settings } = store;

  if (!apiKey) {
    store.setError('An OpenRouter API key is required.');
    return;
  }
  if (!settings.model.trim()) {
    store.setError('Select or enter a transcription model.');
    return;
  }

  const jobId = ++jobCounter;
  activeJob = jobId;
  abortController = new AbortController();
  const signal = abortController.signal;

  store.setError(null);
  store.setTranscript('');
  store.setUsage(null);
  store.setPlan(null);
  store.setStatus('planning');

  const queue: { index: number; buffer: ArrayBuffer }[] = [];
  const uploads = new Set<Promise<void>>();
  let encodeDone = false;
  let failed = false;
  let settled = false;

  let cost = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let reportedSeconds = 0;

  const maybeFinalize = () => {
    if (settled || failed || !encodeDone || queue.length > 0 || uploads.size > 0) {
      return;
    }
    settled = true;
    const state = useAppStore.getState();
    const plan = state.plan;
    if (!plan) return;
    const chunks: TranscribedChunk[] = plan.items.map((item, index) => ({
      index: item.index,
      start: item.start,
      end: item.end,
      text: state.partialTranscripts[index] ?? '',
    }));
    state.setStatus('stitching');
    state.setTranscript(stitchTranscripts(chunks));
    const plannedSeconds = plan.items.reduce((sum, item) => sum + (item.end - item.start), 0);
    state.setUsage({
      cost,
      audioSeconds: reportedSeconds > 0 ? reportedSeconds : plannedSeconds,
      promptTokens,
      completionTokens,
      chunks: plan.items.length,
    });
    state.setStatus('done');
    activeJob = 0;
  };

  const upload = async (buffer: ArrayBuffer, index: number) => {
    const state = useAppStore.getState();
    state.setChunkStatus(index, 'uploading');
    state.setCurrentIndex(index);
    try {
      const result = await transcribeWithRetry(
        {
          apiKey: state.apiKey,
          model: state.settings.model.trim(),
          data: buffer,
          format: 'mp3',
          language: state.settings.language.trim() || undefined,
          temperature: state.settings.temperature,
          signal,
        },
        { signal },
      );
      if (signal.aborted) return;
      state.setPartialTranscript(index, result.text ?? '');
      state.setChunkStatus(index, 'done');
      if (result.usage) {
        cost += result.usage.cost ?? 0;
        promptTokens += result.usage.promptTokens ?? 0;
        completionTokens += result.usage.completionTokens ?? 0;
        reportedSeconds += result.usage.seconds ?? 0;
      }
    } catch (error) {
      if (signal.aborted) return;
      failed = true;
      state.setChunkStatus(index, 'error');
      state.setError(error instanceof Error ? error.message : String(error));
      state.setStatus('error');
      abortController?.abort();
      activeJob = 0;
    }
  };

  const pump = () => {
    while (queue.length > 0 && uploads.size < UPLOAD_CONCURRENCY && !failed) {
      const next = queue.shift();
      if (!next) break;
      const task = upload(next.buffer, next.index).finally(() => {
        uploads.delete(task);
        pump();
        maybeFinalize();
      });
      uploads.add(task);
    }
  };

  getWorker().onmessage = (event: MessageEvent<AudioWorkerResponse>) => {
    const msg = event.data;
    if (msg.jobId !== activeJob) return;

    switch (msg.type) {
      case 'plan': {
        const state = useAppStore.getState();
        state.setPlan(msg.plan);
        state.setMedia(msg.media);
        state.initProgress(msg.plan.items.length);
        state.setStatus('processing');
        post({ type: 'encode', jobId, file, items: msg.plan.items });
        break;
      }
      case 'chunk': {
        queue.push({ index: msg.index, buffer: msg.buffer });
        pump();
        break;
      }
      case 'progress': {
        break;
      }
      case 'done': {
        encodeDone = true;
        pump();
        maybeFinalize();
        break;
      }
      case 'error': {
        failed = true;
        const state = useAppStore.getState();
        state.setError(msg.message);
        state.setStatus('error');
        abortController?.abort();
        activeJob = 0;
        break;
      }
      case 'cancelled': {
        useAppStore.getState().setStatus('cancelled');
        activeJob = 0;
        break;
      }
    }
  };

  post({
    type: 'plan',
    jobId,
    file,
    chunkSeconds: settings.chunkSeconds,
    overlapSeconds: settings.overlapSeconds,
  });
}
