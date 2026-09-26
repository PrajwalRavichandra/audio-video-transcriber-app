import { useEffect, useMemo, useState } from 'react';
import { ApiKeyGate } from './components/ApiKeyGate';
import { Dropzone } from './components/Dropzone';
import { ErrorBanner } from './components/ErrorBanner';
import { ProgressPanel } from './components/ProgressPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { TranscriptView } from './components/TranscriptView';
import { UsageSummary } from './components/UsageSummary';
import { loadMedia, runTranscription, cancelRun } from './features/pipeline/orchestrator';
import { fetchSttModels } from './features/stt/modelCatalog';
import { loadSessionKey } from './lib/keyStorage';
import { useAppStore } from './state/store';

const ACTIVE_STATUSES = new Set(['loading', 'planning', 'processing', 'stitching']);

export default function App() {
  const apiKey = useAppStore((s) => s.apiKey);
  const setApiKey = useAppStore((s) => s.setApiKey);
  const setRememberKey = useAppStore((s) => s.setRememberKey);
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const models = useAppStore((s) => s.models);
  const setModels = useAppStore((s) => s.setModels);
  const modelsError = useAppStore((s) => s.modelsError);
  const setModelsError = useAppStore((s) => s.setModelsError);
  const media = useAppStore((s) => s.media);
  const status = useAppStore((s) => s.status);
  const progress = useAppStore((s) => s.progress);
  const transcript = useAppStore((s) => s.transcript);
  const usage = useAppStore((s) => s.usage);
  const error = useAppStore((s) => s.error);
  const setError = useAppStore((s) => s.setError);

  const [file, setFile] = useState<File | null>(null);
  const [showGate, setShowGate] = useState(false);

  const active = ACTIVE_STATUSES.has(status);
  const gateOpen = showGate || apiKey.length === 0;

  const refreshModels = async () => {
    setModelsError(null);
    try {
      setModels(await fetchSttModels());
    } catch (err) {
      setModelsError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    const stored = loadSessionKey();
    if (stored) {
      setApiKey(stored);
      setRememberKey(true);
    }
    void refreshModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = (selected: File) => {
    setFile(selected);
    void loadMedia(selected);
  };

  const handleRun = () => {
    if (!file) return;
    void runTranscription(file);
  };

  const canRun = useMemo(
    () => Boolean(file) && Boolean(media) && apiKey.length > 0 && !active,
    [file, media, apiKey, active],
  );

  return (
    <div className="mx-auto flex min-h-full max-w-4xl flex-col gap-5 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Audio Transcriber</h1>
          <p className="text-sm text-slate-400">
            Long-form transcription powered by OpenRouter · runs entirely in your browser
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowGate(true)}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
        >
          {apiKey ? 'API key set' : 'Add API key'}
        </button>
      </header>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <Dropzone onFile={handleFile} disabled={active} media={media} />

      <SettingsPanel
        settings={settings}
        onChange={setSettings}
        disabled={active}
        models={models}
        onRefreshModels={() => void refreshModels()}
        modelsError={modelsError}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleRun}
          disabled={!canRun}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Transcribe
        </button>
        {active && (
          <button
            type="button"
            onClick={cancelRun}
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
        )}
        {media && (
          <span className="text-sm text-slate-400">
            {media.name} · {Math.round(media.duration)}s · {media.channels ?? '?'}ch
            {media.sampleRate ? ` · ${media.sampleRate} Hz` : ''}
          </span>
        )}
      </div>

      <ProgressPanel status={status} progress={progress} onCancel={cancelRun} />

      <TranscriptView transcript={transcript} status={status} />

      <UsageSummary usage={usage} />

      <ApiKeyGate
        open={gateOpen}
        onSubmit={(key, remember) => {
          setApiKey(key);
          setRememberKey(remember);
          setShowGate(false);
        }}
      />
    </div>
  );
}
