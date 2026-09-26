export interface ErrorBannerProps {
  message: string | null;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 rounded-lg border border-red-800 bg-red-950/70 px-4 py-3 text-sm text-red-200"
    >
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="shrink-0 rounded px-2 text-red-300 hover:bg-red-900/60"
        >
          &times;
        </button>
      )}
    </div>
  );
}
