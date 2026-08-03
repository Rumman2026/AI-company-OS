import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const VARIANT_STYLE: Record<ButtonVariant, string> = {
  primary: 'uikit-button--primary',
  secondary: 'uikit-button--secondary',
  danger: 'uikit-button--danger',
};

export function Button({ variant = 'primary', className, children, ...rest }: ButtonProps) {
  const classes = ['uikit-button', VARIANT_STYLE[variant], className].filter(Boolean).join(' ');
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
