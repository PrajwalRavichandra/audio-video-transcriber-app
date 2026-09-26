import { useEffect, useMemo, useRef, useState } from 'react';
import type { SttModel } from '../types';

export interface ModelComboboxProps {
  models: SttModel[];
  value: string;
  onChange: (v: string) => void;
  onRefresh?: () => void;
  error?: string | null;
}

const MAX_RESULTS = 50;

export function ModelCombobox({
  models,
  value,
  onChange,
  onRefresh,
  error,
}: ModelComboboxProps) {
  const [query, setQuery] = useState<string>(value);
  const [open, setOpen] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? models.filter(
          (model) =>
            model.id.toLowerCase().includes(q) ||
            model.name.toLowerCase().includes(q),
        )
      : models;
    return list.slice(0, MAX_RESULTS);
  }, [models, query]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (id: string) => {
    setQuery(id);
    onChange(id);
    setOpen(false);
    setActiveIndex(-1);
  };

  const commitFreeValue = () => {
    const trimmed = query.trim();
    if (trimmed.length > 0 && trimmed !== value) {
      onChange(trimmed);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      if (open && activeIndex >= 0 && activeIndex < filtered.length) {
        event.preventDefault();
        select(filtered[activeIndex].id);
      } else {
        commitFreeValue();
        setOpen(false);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="model-listbox"
          aria-autocomplete="list"
          value={query}
          placeholder="openai/whisper-large-v3"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setOpen(false);
          }}
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
        />
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="shrink-0 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Refresh
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}

      {open && filtered.length > 0 && (
        <ul
          id="model-listbox"
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-700 bg-slate-900 py-1 shadow-xl"
        >
          {filtered.map((model, index) => (
            <li
              key={model.id}
              role="option"
              aria-selected={model.id === value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(model.id)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                index === activeIndex
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              <div className="font-medium">{model.id}</div>
              {model.name !== model.id && (
                <div className="text-xs text-slate-400">{model.name}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
