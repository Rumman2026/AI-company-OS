export interface ErrorBannerProps {
  message: string;
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div className="uikit-error-banner" role="alert">
      {message}
    </div>
  );
}
