import { useState } from 'react';
import type { PipelineStatus } from '../types';

export interface TranscriptViewProps {
  transcript: string;
  status: PipelineStatus;
}

export function TranscriptView({ transcript, status }: TranscriptViewProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const words = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const characters = transcript.length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleDownload = () => {
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'transcript.txt';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const empty = transcript.length === 0;

  return (
    <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">Transcript</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={empty}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={empty}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Download .txt
          </button>
        </div>
      </div>

      {empty ? (
        <p className="py-6 text-center text-sm text-slate-500">
          {status === 'idle'
            ? 'Load a file and start transcription to see the transcript here.'
            : 'No transcript yet.'}
        </p>
      ) : (
        <textarea
          readOnly
          value={transcript}
          className="h-72 w-full resize-y rounded-md border border-slate-800 bg-slate-950 p-3 font-mono text-sm text-slate-200 focus:outline-none"
        />
      )}

      <p className="text-xs text-slate-500">
        {characters.toLocaleString()} characters &middot; {words.toLocaleString()} words
      </p>
    </section>
  );
}
