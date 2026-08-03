/**
 * Plain CSS for every component in this package, as a string - same
 * "inline once, no CSS-in-JS runtime" approach as tokens.ts. A consuming
 * app's layout imports both `tokensCss` and `componentsCss` into one
 * <style> tag.
 */
export const componentsCss = `
.uikit-button {
  font-family: var(--font-sans);
  font-size: var(--font-size-sm);
  font-weight: 600;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  cursor: pointer;
  min-height: 44px;
}
.uikit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.uikit-button--primary {
  background: var(--color-primary);
  color: #ffffff;
}
.uikit-button--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}
.uikit-button--secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border-color: var(--color-border);
}
.uikit-button--danger {
  background: var(--color-danger-bg);
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.uikit-badge {
  display: inline-block;
  font-size: var(--font-size-sm);
  font-weight: 600;
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;
  white-space: nowrap;
}
.uikit-badge--neutral {
  background: var(--color-neutral-bg);
  color: var(--color-neutral-text);
}
.uikit-badge--success {
  background: var(--color-success-bg);
  color: var(--color-success-text);
}
.uikit-badge--warning {
  background: var(--color-warning-bg);
  color: var(--color-warning-text);
}
.uikit-badge--danger {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}

.uikit-empty-state {
  text-align: center;
  padding: var(--space-8) var(--space-4);
  color: var(--color-text-muted);
}
.uikit-empty-state__title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 var(--space-2);
}
.uikit-empty-state__description {
  margin: 0 0 var(--space-4);
}

.uikit-error-banner {
  background: var(--color-danger-bg);
  color: var(--color-danger);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
}

.uikit-loading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-muted);
  padding: var(--space-4);
}
.uikit-loading__spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  animation: uikit-spin 0.7s linear infinite;
}
@keyframes uikit-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .uikit-loading__spinner {
    animation: none;
  }
}

.uikit-table-scroll {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.uikit-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.uikit-table th,
.uikit-table td {
  text-align: left;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}
.uikit-table th {
  color: var(--color-text-muted);
  font-weight: 600;
  background: var(--color-neutral-bg);
}
.uikit-table tbody tr:last-child td {
  border-bottom: none;
}
.uikit-table__row--clickable {
  cursor: pointer;
}
.uikit-table__row--clickable:hover {
  background: var(--color-neutral-bg);
}

.uikit-form-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-bottom: var(--space-4);
}
.uikit-form-field label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text);
}
.uikit-form-field input,
.uikit-form-field select,
.uikit-form-field textarea {
  font-family: var(--font-sans);
  font-size: var(--font-size-base);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  min-height: 44px;
}
.uikit-form-field input:focus-visible,
.uikit-form-field select:focus-visible,
.uikit-form-field textarea:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}
.uikit-form-field__hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin: 0;
}
.uikit-form-field__error {
  font-size: var(--font-size-sm);
  color: var(--color-danger);
  margin: 0;
}
`;
