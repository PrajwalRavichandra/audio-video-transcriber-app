import { create } from 'zustand';
import {
  DEFAULT_SETTINGS,
  type ChunkPlan,
  type ChunkStatus,
  type MediaInfo,
  type PipelineStatus,
  type ProgressState,
  type Settings,
  type SttModel,
  type UsageSummary,
} from '../types';

interface AppState {
  apiKey: string;
  rememberKey: boolean;
  models: SttModel[];
  modelsError: string | null;
  status: PipelineStatus;
  media: MediaInfo | null;
  plan: ChunkPlan | null;
  settings: Settings;
  progress: ProgressState;
  partialTranscripts: (string | null)[];
  transcript: string;
  usage: UsageSummary | null;
  error: string | null;

  setApiKey: (key: string) => void;
  setRememberKey: (remember: boolean) => void;
  setModels: (models: SttModel[]) => void;
  setModelsError: (message: string | null) => void;
  setSettings: (patch: Partial<Settings>) => void;
  setStatus: (status: PipelineStatus) => void;
  setMedia: (media: MediaInfo | null) => void;
  setPlan: (plan: ChunkPlan | null) => void;
  initProgress: (total: number) => void;
  setChunkStatus: (index: number, status: ChunkStatus) => void;
  setCurrentIndex: (index: number) => void;
  setPartialTranscript: (index: number, text: string) => void;
  setTranscript: (text: string) => void;
  setUsage: (usage: UsageSummary | null) => void;
  setError: (message: string | null) => void;
  resetRun: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  apiKey: '',
  rememberKey: false,
  models: [],
  modelsError: null,
  status: 'idle',
  media: null,
  plan: null,
  settings: { ...DEFAULT_SETTINGS },
  progress: { total: 0, completed: 0, currentIndex: -1, perChunk: [] },
  partialTranscripts: [],
  transcript: '',
  usage: null,
  error: null,

  setApiKey: (apiKey) => set({ apiKey }),
  setRememberKey: (rememberKey) => set({ rememberKey }),
  setModels: (models) => set({ models }),
  setModelsError: (modelsError) => set({ modelsError }),
  setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  setStatus: (status) => set({ status }),
  setMedia: (media) => set({ media }),
  setPlan: (plan) => set({ plan }),
  initProgress: (total) =>
    set({
      progress: {
        total,
        completed: 0,
        currentIndex: -1,
        perChunk: Array.from({ length: total }, () => 'pending' as ChunkStatus),
      },
      partialTranscripts: Array.from({ length: total }, () => null),
    }),
  setChunkStatus: (index, status) =>
    set((s) => {
      const perChunk = s.progress.perChunk.slice();
      perChunk[index] = status;
      const completed = perChunk.filter((c) => c === 'done').length;
      return { progress: { ...s.progress, perChunk, completed } };
    }),
  setCurrentIndex: (currentIndex) =>
    set((s) => ({ progress: { ...s.progress, currentIndex } })),
  setPartialTranscript: (index, text) =>
    set((s) => {
      const partialTranscripts = s.partialTranscripts.slice();
      partialTranscripts[index] = text;
      return { partialTranscripts };
    }),
  setTranscript: (transcript) => set({ transcript }),
  setUsage: (usage) => set({ usage }),
  setError: (error) => set({ error }),
  resetRun: () =>
    set({
      status: 'idle',
      media: null,
      plan: null,
      progress: { total: 0, completed: 0, currentIndex: -1, perChunk: [] },
      partialTranscripts: [],
      transcript: '',
      usage: null,
      error: null,
    }),
}));

export type { AppState };
