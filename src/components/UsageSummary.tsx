import type { UsageSummary as UsageSummaryData } from '../types';

export interface UsageSummaryProps {
  usage: UsageSummaryData | null;
}

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  return parts.join(' ');
}

function formatUsd(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-sm font-medium text-slate-200">{value}</dd>
    </div>
  );
}

export function UsageSummary({ usage }: UsageSummaryProps) {
  if (!usage) return null;

  return (
    <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-sm font-semibold text-slate-200">Usage</h2>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Item label="Chunks" value={usage.chunks.toLocaleString()} />
        <Item label="Audio" value={formatDuration(usage.audioSeconds)} />
        <Item label="Prompt tokens" value={usage.promptTokens.toLocaleString()} />
        <Item label="Completion tokens" value={usage.completionTokens.toLocaleString()} />
        <Item label="Cost" value={formatUsd(usage.cost)} />
      </dl>
    </section>
  );
}
