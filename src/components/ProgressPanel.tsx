import type { ChunkStatus, PipelineStatus, ProgressState } from '../types';

export interface ProgressPanelProps {
  status: PipelineStatus;
  progress: ProgressState;
  onCancel: () => void;
}

const STATUS_LABELS: Record<PipelineStatus, string> = {
  idle: 'Idle',
  loading: 'Loading media',
  planning: 'Planning chunks',
  processing: 'Transcribing',
  stitching: 'Stitching transcript',
  done: 'Done',
  error: 'Error',
  cancelled: 'Cancelled',
};

const CHUNK_COLORS: Record<ChunkStatus, string> = {
  pending: 'bg-slate-600',
  encoding: 'bg-amber-400',
  uploading: 'bg-sky-400',
  done: 'bg-emerald-500',
  error: 'bg-red-500',
};

const CHUNK_LABELS: Record<ChunkStatus, string> = {
  pending: 'Pending',
  encoding: 'Encoding',
  uploading: 'Uploading',
  done: 'Done',
  error: 'Error',
};

const isActive = (status: PipelineStatus): boolean =>
  status === 'loading' ||
  status === 'planning' ||
  status === 'processing' ||
  status === 'stitching';

export function ProgressPanel({ status, progress, onCancel }: ProgressPanelProps) {
  const { total, completed, currentIndex, perChunk } = progress;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">
          {STATUS_LABELS[status]}
        </h2>
        {isActive(status) && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-red-700 px-3 py-1.5 text-sm text-red-300 hover:bg-red-950"
          >
            Cancel
          </button>
        )}
      </div>

      <div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-sky-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-slate-400">
          {completed}/{total} chunks &middot; {percent}%
          {currentIndex >= 0 && total > 0 && <> &middot; current chunk {currentIndex + 1}</>}
        </p>
      </div>

      {perChunk.length > 0 && (
        <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {perChunk.map((chunkStatus, index) => (
            <li
              key={index}
              title={`Chunk ${index + 1}: ${CHUNK_LABELS[chunkStatus]}`}
              className="flex items-center gap-2 text-xs text-slate-400"
            >
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${CHUNK_COLORS[chunkStatus]}`}
              />
              <span>#{index + 1}</span>
              <span>{CHUNK_LABELS[chunkStatus]}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
