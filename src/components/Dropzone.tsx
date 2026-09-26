import { useRef, useState } from 'react';
import { MAX_FILE_BYTES, type MediaInfo } from '../types';

export interface DropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
  media?: MediaInfo | null;
}

const ACCEPT =
  'audio/*,video/*,.mp3,.m4a,.wav,.flac,.ogg,.opus,.webm,.mkv,.aac,.ts,.mp4,.mov';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function Dropzone({ onFile, disabled, media }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const accept = (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      setError(
        `File is too large (${formatBytes(file.size)}). Maximum is ${formatBytes(
          MAX_FILE_BYTES,
        )}.`,
      );
      return;
    }
    setError(null);
    onFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file) accept(file);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) accept(file);
    event.target.value = '';
  };

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        } ${
          dragging
            ? 'border-sky-500 bg-sky-500/10'
            : 'border-slate-700 bg-slate-900 hover:border-slate-600'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          disabled={disabled}
          onChange={handleChange}
          className="sr-only"
        />
        <p className="text-sm font-medium text-slate-200">
          Drag &amp; drop an audio or video file here
        </p>
        <p className="mt-1 text-xs text-slate-500">
          or click to browse &middot; max {formatBytes(MAX_FILE_BYTES)}
        </p>
      </div>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      {media && (
        <p className="mt-2 text-sm text-slate-400">
          {media.name} &middot; {formatBytes(media.size)}
          {media.duration > 0 && <> &middot; {media.duration.toFixed(1)}s</>}
        </p>
      )}
    </div>
  );
}
