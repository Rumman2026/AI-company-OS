#!/usr/bin/env node
// GreenCal Website and Lead Health Agent - report-only health check.
//
// Real, runnable implementation of the design in
// docs/agents/GREENCAL_WEBSITE_AND_LEAD_HEALTH_AGENT.md. Report-only:
// this script only reads (HTTP requests, page loads, console capture)
// and writes its own report file - it never submits a real lead, never
// modifies any content, never merges/deploys/touches credentials, and
// never accesses production data beyond what's already public on the
// site.
//
// Usage: node scripts/health-check.mjs [baseUrl]
// Default baseUrl: https://www.greencalpressurewashing.com

import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const baseUrl = process.argv[2] || 'https://www.greencalpressurewashing.com';

// A representative sample, not the full 80-city/13-service surface -
// see BUSINESS_FACTS.md/ADR-0007 for the full approved scope. Kept small
// so this check stays fast and cheap to run frequently.
const PAGES_TO_CHECK = [
  '/',
  '/services/roof-cleaning',
  '/services/house-washing',
  '/services/concrete-cleaning',
  '/commercial/building-washing',
  '/multi-family-hoa/hoa-pressure-washing',
  '/service-areas',
  '/contact-us',
  '/favicon-32x32.png',
  '/robots.txt',
  '/sitemap.xml',
];

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
];

async function checkHttpStatus(path) {
  const url = new URL(path, baseUrl).toString();
  const startedAt = Date.now();
  try {
    const response = await fetch(url, { redirect: 'follow' });
    return {
      path,
      url,
      status: response.status,
      ok: response.status >= 200 && response.status < 400,
      latencyMs: Date.now() - startedAt,
    };
  } catch (err) {
    return {
      path,
      url,
      status: 0,
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : 'unknown_error',
    };
  }
}

async function checkRendering(browser, viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('requestfailed', (req) => {
    networkErrors.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText ?? 'unknown'}`);
  });

  const result = { viewport: viewport.name, telLinkFound: false, estimateCtaFound: false, quoteFormFound: false };

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 20000 });
    result.telLinkFound = (await page.locator('a[href^="tel:"]').count()) > 0;
    result.estimateCtaFound = (await page.locator('a[href*="contact-us"], a[href*="#quote-form"]').count()) > 0;

    await page.goto(new URL('/contact-us', baseUrl).toString(), { waitUntil: 'networkidle', timeout: 20000 });
    result.quoteFormFound = (await page.locator('#quote-form, form').count()) > 0;
  } catch (err) {
    result.error = err instanceof Error ? err.message : 'unknown_error';
  } finally {
    await context.close();
  }

  result.consoleErrors = consoleErrors;
  result.networkErrors = networkErrors;
  return result;
}

async function main() {
  const startedAtIso = new Date().toISOString();

  const httpChecks = [];
  for (const path of PAGES_TO_CHECK) {
    httpChecks.push(await checkHttpStatus(path));
  }

  const browser = await chromium.launch();
  const renderChecks = [];
  for (const viewport of VIEWPORTS) {
    renderChecks.push(await checkRendering(browser, viewport));
  }
  await browser.close();

  const httpFailures = httpChecks.filter((c) => !c.ok);
  const renderFailures = renderChecks.filter(
    (r) => r.error || !r.telLinkFound || !r.estimateCtaFound || !r.quoteFormFound || r.consoleErrors.length > 0,
  );

  const report = {
    agent: 'greencal-website-and-lead-health-agent',
    mode: 'report-only',
    baseUrl,
    startedAtIso,
    completedAtIso: new Date().toISOString(),
    overallStatus: httpFailures.length === 0 && renderFailures.length === 0 ? 'healthy' : 'issues_found',
    httpChecks,
    renderChecks,
    summary: {
      pagesChecked: httpChecks.length,
      pagesFailing: httpFailures.length,
      viewportsChecked: renderChecks.length,
      viewportsWithIssues: renderFailures.length,
    },
  };

  const outPath = new URL('../health-check-report.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  if (report.overallStatus !== 'healthy') {
    process.exitCode = 1;
  }
}

void main();
