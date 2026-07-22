/**
 * Stable, approved event taxonomy. Do not rename these casually - see
 * README.md's event-to-GA4/Ads mapping, which depends on these exact names.
 */
export type TrackedEventName =
  | 'page_view'
  | 'phone_click'
  | 'email_click'
  | 'quote_cta_click'
  | 'quote_form_view'
  | 'quote_form_start'
  | 'quote_form_validation_failed'
  | 'quote_form_pending_configuration'
  | 'quote_form_delivery_failed'
  | 'quote_form_success';

/**
 * Non-PII event parameters only. Never add a field that can carry a name,
 * phone number, email address, service address, or free-text customer
 * content - see README.md's PII-exclusion list.
 */
export interface TrackEventParams {
  pagePath?: string;
  pageTitle?: string;
  placement?: string;
  serviceContext?: string;
  formId?: string;
  errorCount?: number;
  submissionState?: string;
  contactMethod?: string;
}

export interface TrackEventInput {
  name: TrackedEventName;
  params?: TrackEventParams;
}

export interface TrackingConfig {
  /** A validated GTM container id (e.g. "GTM-XXXXXXX"), or null if absent/malformed. */
  gtmContainerId: string | null;
}

/**
 * Narrowly scoped to tracking preferences only - never carries PII, business
 * data, or anything beyond this one boolean.
 */
export interface ConsentState {
  analyticsGranted: boolean;
}

export type DataLayerEvent = Record<string, unknown>;

export interface TrackContext {
  config?: TrackingConfig;
  consent?: ConsentState;
  /** Defaults to a window.dataLayer push. Tests inject a mock sink here. */
  sink?: (event: DataLayerEvent) => void;
}

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
  }
}
