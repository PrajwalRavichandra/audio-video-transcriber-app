import { useState } from 'react';
import { clearSessionKey, loadSessionKey, saveSessionKey } from '../lib/keyStorage';

export interface ApiKeyGateProps {
  open: boolean;
  onSubmit: (key: string, remember: boolean) => void;
}

export function ApiKeyGate({ open, onSubmit }: ApiKeyGateProps) {
  const [key, setKey] = useState<string>(() => loadSessionKey());
  const [remember, setRemember] = useState<boolean>(() => loadSessionKey().length > 0);

  if (!open) return null;

  const canSubmit = key.trim().length >= 10;

  const handleClear = () => {
    clearSessionKey();
    setKey('');
    setRemember(false);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    if (remember) {
      saveSessionKey(key.trim());
    } else {
      clearSessionKey();
    }
    onSubmit(key.trim(), remember);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="OpenRouter API key"
        className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
      >
        <h2 className="text-lg font-semibold text-slate-100">OpenRouter API key</h2>
        <p className="mt-2 text-sm text-slate-400">
          Use a dedicated OpenRouter key with a spend/credit limit so a runaway
          transcription cannot drain your account. Keys are sent directly to
          OpenRouter from your browser and are never stored on a server.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="api-key"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              API key
            </label>
            <input
              id="api-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <label className="flex items-start gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-950"
            />
            <span>Remember for this session (cleared when you close the tab)</span>
          </label>

          <div className="flex items-center justify-between gap-3">
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-sky-400 underline hover:text-sky-300"
            >
              Create a key at openrouter.ai/keys
            </a>
            {key.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
              >
                Clear key
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save key
          </button>
        </form>
      </div>
    </div>
  );
}
