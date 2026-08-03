import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="uikit-empty-state" role="status">
      <p className="uikit-empty-state__title">{title}</p>
      {description ? <p className="uikit-empty-state__description">{description}</p> : null}
      {action ? <div className="uikit-empty-state__action">{action}</div> : null}
    </div>
  );
}
