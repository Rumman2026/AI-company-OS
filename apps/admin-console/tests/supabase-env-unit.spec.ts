import { test, expect } from '@playwright/test';
import { isPlausibleSupabaseUrl } from '../src/lib/supabase/url-validation';

test.describe('isPlausibleSupabaseUrl', () => {
  test('accepts a bare project URL', () => {
    expect(isPlausibleSupabaseUrl('https://abcdefgh.supabase.co')).toBe(true);
    expect(isPlausibleSupabaseUrl('https://abcdefgh.supabase.co/')).toBe(true);
  });

  test('rejects a URL with the REST endpoint path baked in - the exact production incident this guards against', () => {
    expect(isPlausibleSupabaseUrl('https://abcdefgh.supabase.co/rest/v1')).toBe(false);
    expect(isPlausibleSupabaseUrl('https://abcdefgh.supabase.co/rest/v1/')).toBe(false);
  });

  test('rejects any other extra path segment', () => {
    expect(isPlausibleSupabaseUrl('https://abcdefgh.supabase.co/auth/v1')).toBe(false);
  });

  test('rejects a non-https URL', () => {
    expect(isPlausibleSupabaseUrl('http://abcdefgh.supabase.co')).toBe(false);
  });

  test('rejects a malformed value rather than throwing', () => {
    expect(isPlausibleSupabaseUrl('not-a-url')).toBe(false);
    expect(isPlausibleSupabaseUrl('')).toBe(false);
  });
});
