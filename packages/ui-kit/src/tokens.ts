/**
 * Design tokens shared across every admin-facing app. Emitted as a CSS
 * string (`tokensCss`) so a consuming Astro layout can inline it once in
 * <head> - no CSS-in-JS runtime, no build-step dependency.
 */
export const tokensCss = `
:root {
  --color-bg: #f8fafc;
  --color-surface: #ffffff;
  --color-border: #d9dfe7;
  --color-text: #1a2233;
  --color-text-muted: #5b6577;
  --color-primary: #1f6f4a;
  --color-primary-hover: #175a3b;
  --color-danger: #b3261e;
  --color-danger-bg: #fbe9e7;
  --color-warning-bg: #fff4e0;
  --color-warning-text: #8a5a00;
  --color-success-bg: #e6f4ea;
  --color-success-text: #1e6b3a;
  --color-neutral-bg: #eef1f5;
  --color-neutral-text: #43506b;

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  --radius-sm: 6px;
  --radius-md: 10px;

  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.5rem;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0f1520;
    --color-surface: #161d2b;
    --color-border: #2a3446;
    --color-text: #e6e9ef;
    --color-text-muted: #97a1b5;
    --color-primary: #3fae7c;
    --color-primary-hover: #56c090;
    --color-danger: #ff6b62;
    --color-danger-bg: #3a1d1b;
    --color-warning-bg: #3a2c0f;
    --color-warning-text: #f2c675;
    --color-success-bg: #16311f;
    --color-success-text: #7fd89b;
    --color-neutral-bg: #1e2634;
    --color-neutral-text: #b7c0d1;
  }
}
`;
