import type { ConsentState } from './types';

// Narrowly scoped to tracking preferences only - never a general
// "preferences" or "user data" key, and never mixed with anything else.
const STORAGE_KEY = 'greencal-tracking-consent';

const DEFAULT_STATE: ConsentState = { analyticsGranted: false };

function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    // Some browsers throw when localStorage is blocked entirely.
    return false;
  }
}

/**
 * Reads the current consent preference. Defaults to not-granted whenever
 * storage is unavailable, empty, or contains anything unexpected - consent
 * is never assumed.
 */
export function getConsentState(): ConsentState {
  if (!hasLocalStorage()) return DEFAULT_STATE;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;

    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'analyticsGranted' in parsed &&
      typeof (parsed as { analyticsGranted: unknown }).analyticsGranted === 'boolean'
    ) {
      return { analyticsGranted: (parsed as ConsentState).analyticsGranted };
    }
    return DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

/** Persists a consent preference. Fails silently if storage is unavailable. */
export function setConsentState(state: ConsentState): void {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full/blocked (e.g. private browsing) - tracking simply stays
    // at its default, safe (inactive) state.
  }
}
