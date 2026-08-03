export interface LoadingSpinnerProps {
  label?: string;
}

export function LoadingSpinner({ label = 'Loading…' }: LoadingSpinnerProps) {
  return (
    <div className="uikit-loading" role="status" aria-live="polite">
      <span className="uikit-loading__spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
