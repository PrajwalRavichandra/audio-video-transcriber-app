import { ModelCombobox } from './ModelCombobox';
import type { Settings, SttModel } from '../types';

export interface SettingsPanelProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  disabled?: boolean;
  models: SttModel[];
  onRefreshModels?: () => void;
  modelsError?: string | null;
}

const labelClass = 'mb-1 block text-sm font-medium text-slate-300';

export function SettingsPanel({
  settings,
  onChange,
  disabled,
  models,
  onRefreshModels,
  modelsError,
}: SettingsPanelProps) {
  return (
    <fieldset
      disabled={disabled}
      className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4"
    >
      <div>
        <label className={labelClass} htmlFor="settings-model">
          Model
        </label>
        <ModelCombobox
          models={models}
          value={settings.model}
          onChange={(model) => onChange({ model })}
          onRefresh={onRefreshModels}
          error={modelsError}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="settings-language">
            Language (optional ISO-639-1)
          </label>
          <input
            id="settings-language"
            type="text"
            maxLength={5}
            value={settings.language}
            placeholder="en"
            onChange={(event) => onChange({ language: event.target.value })}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="settings-temperature">
            Temperature
          </label>
          <input
            id="settings-temperature"
            type="number"
            min={0}
            max={1}
            step={0.1}
            value={settings.temperature}
            onChange={(event) => onChange({ temperature: Number(event.target.value) })}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="settings-chunk-seconds">
            Chunk seconds
          </label>
          <input
            id="settings-chunk-seconds"
            type="number"
            min={10}
            max={1800}
            step={5}
            value={settings.chunkSeconds}
            onChange={(event) => onChange({ chunkSeconds: Number(event.target.value) })}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="settings-overlap-seconds">
            Overlap seconds
          </label>
          <input
            id="settings-overlap-seconds"
            type="number"
            min={0}
            max={60}
            step={1}
            value={settings.overlapSeconds}
            onChange={(event) => onChange({ overlapSeconds: Number(event.target.value) })}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          />
        </div>
      </div>
    </fieldset>
  );
}
