import { test, expect } from '@playwright/test';
import { isPublicPath } from '../src/lib/auth/public-paths';

test.describe('isPublicPath', () => {
  test('login, forgot-password, and reset-password pages are public', () => {
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/forgot-password')).toBe(true);
    expect(isPublicPath('/reset-password')).toBe(true);
  });

  test('their API routes, including the auth callback, are public', () => {
    expect(isPublicPath('/api/auth/login')).toBe(true);
    expect(isPublicPath('/api/auth/forgot-password')).toBe(true);
    expect(isPublicPath('/api/auth/reset-password')).toBe(true);
    expect(isPublicPath('/api/auth/callback')).toBe(true);
  });

  test('the dashboard and every CRM route require authentication', () => {
    expect(isPublicPath('/')).toBe(false);
    expect(isPublicPath('/leads')).toBe(false);
    expect(isPublicPath('/leads/abc-123')).toBe(false);
    expect(isPublicPath('/contacts')).toBe(false);
    expect(isPublicPath('/contacts/abc-123')).toBe(false);
    expect(isPublicPath('/api/leads/abc-123/transition')).toBe(false);
  });

  test('a path that merely starts with a public prefix as a different route is not treated as public', () => {
    // Guards against a naive startsWith() match, e.g. a hypothetical
    // "/login-history" page being wrongly treated as public.
    expect(isPublicPath('/login-history')).toBe(false);
    expect(isPublicPath('/reset-password-policy')).toBe(false);
  });
});
