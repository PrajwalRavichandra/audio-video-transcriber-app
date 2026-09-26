export type PipelineStatus =
  | 'idle'
  | 'loading'
  | 'planning'
  | 'processing'
  | 'stitching'
  | 'done'
  | 'error'
  | 'cancelled';

export interface MediaInfo {
  name: string;
  size: number;
  duration: number;
  format?: string;
  codec?: string;
  channels?: number;
  sampleRate?: number;
}

export interface ChunkPlanItem {
  index: number;
  start: number;
  end: number;
  boundary: 'silence' | 'hard' | 'end';
}

export interface ChunkPlan {
  items: ChunkPlanItem[];
  duration: number;
  sampleRate: number;
}

export type ChunkStatus = 'pending' | 'encoding' | 'uploading' | 'done' | 'error';

export interface ProgressState {
  total: number;
  completed: number;
  currentIndex: number;
  perChunk: ChunkStatus[];
}

export interface SttModel {
  id: string;
  name: string;
  contextLength?: number;
  promptPrice?: string;
  completionPrice?: string;
}

export interface Settings {
  model: string;
  language: string;
  chunkSeconds: number;
  overlapSeconds: number;
  temperature: number;
}

export interface UsageSummary {
  cost: number;
  audioSeconds: number;
  promptTokens: number;
  completionTokens: number;
  chunks: number;
}

export interface TranscribedChunk {
  index: number;
  start: number;
  end: number;
  text: string;
}

export interface AudioWorkerRequest {
  type: 'plan' | 'encode' | 'cancel';
  jobId: number;
  file?: File;
  duration?: number;
  chunkSeconds?: number;
  overlapSeconds?: number;
  items?: ChunkPlanItem[];
}

export type AudioWorkerResponse =
  | { type: 'progress'; jobId: number; stage: 'decode' | 'encode'; progress: number }
  | { type: 'plan'; jobId: number; plan: ChunkPlan; media: MediaInfo }
  | { type: 'chunk'; jobId: number; index: number; buffer: ArrayBuffer }
  | { type: 'done'; jobId: number }
  | { type: 'error'; jobId: number; message: string }
  | { type: 'cancelled'; jobId: number };

export const DEFAULT_SETTINGS: Settings = {
  model: 'openai/whisper-large-v3',
  language: '',
  chunkSeconds: 300,
  overlapSeconds: 15,
  temperature: 0,
};

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
export const OPENROUTER_ATTRIBUTION = {
  referer: typeof window !== 'undefined' ? window.location.origin : 'https://localhost',
  title: 'OpenRouter Audio Transcriber',
};

export const MAX_FILE_BYTES = 2.5 * 1024 * 1024 * 1024;
export const TARGET_SAMPLE_RATE = 16_000;
export const MP3_BITRATE = 64_000;
