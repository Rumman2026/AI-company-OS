import type { APIRoute } from 'astro';
import { services } from '../data/services';
import { COUNTIES, countySlug } from '../data/cities';

// Indexable, real routes only. Draft/noindex individual city pages are
// deliberately excluded - see the city-page publication policy in
// DECISIONS.md ADR-0007 ("Do not allow draft or noindex city pages into
// the XML sitemap"). The route field on each ServiceRecord is the single
// source of truth for service-page paths - see src/data/services.ts. The
// county slugs come from src/data/cities.ts - the canonical city/county
// source - not a separately hand-typed list.
const STATIC_ROUTES = [
  '/',
  '/contact-us',
  '/residential',
  '/commercial',
  '/multi-family-hoa',
  '/service-areas',
];
const COUNTY_ROUTES = COUNTIES.map((county) => `/service-areas/${countySlug[county]}`);

export const GET: APIRoute = ({ site }) => {
  const base = site!.toString().replace(/\/$/, '');
  const routes = [...STATIC_ROUTES, ...services.map((service) => service.route), ...COUNTY_ROUTES];

  const urls = routes
    .map((route) => `  <url>\n    <loc>${base}${route}</loc>\n  </url>`)
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml' },
  });
};
