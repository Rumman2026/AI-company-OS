import type { InputHTMLAttributes, ReactNode } from 'react';

export interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  children?: ReactNode;
}

export function FormField({ label, error, hint, id, children, ...rest }: FormFieldProps) {
  const fieldId = id ?? rest.name;
  return (
    <div className="uikit-form-field">
      <label htmlFor={fieldId}>{label}</label>
      {children ?? (
        <input
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          {...rest}
        />
      )}
      {hint && !error ? (
        <p id={`${fieldId}-hint`} className="uikit-form-field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${fieldId}-error`} className="uikit-form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
