import type { APIRoute } from 'astro';
import { services } from '../data/services';

// Indexable, real routes only. The route field on each ServiceRecord is the
// single source of truth for service-page paths - see src/data/services.ts.
const STATIC_ROUTES = ['/', '/contact-us', '/residential-services'];

export const GET: APIRoute = ({ site }) => {
  const base = site!.toString().replace(/\/$/, '');
  const routes = [...STATIC_ROUTES, ...services.map((service) => service.route)];

  const urls = routes
    .map((route) => `  <url>\n    <loc>${base}${route}</loc>\n  </url>`)
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml' },
  });
};
