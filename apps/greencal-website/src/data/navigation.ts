import type { NavItem } from '../types/content';
import { servicesByCategory } from './services';

// Derived from the canonical services.ts list - do not hand-duplicate
// service labels/hrefs here (see DECISIONS.md ADR-0007).
function categoryChildren(category: 'residential' | 'commercial' | 'multi-family-hoa'): NavItem[] {
  return servicesByCategory(category).map((service) => ({
    label: service.title,
    href: service.route,
  }));
}

// "Projects", "Before & After", and "About" are intentionally not included:
// no real project photos or an owner-verified bio exist yet (see
// .claude/rules/websites.md's verified-content requirement) - adding stub
// pages for them now would mean fabricating content. They can be added in
// a future stage once real, owner-provided material exists.
export const headerNav: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Residential', href: '/residential', children: categoryChildren('residential') },
  { label: 'Commercial', href: '/commercial', children: categoryChildren('commercial') },
  {
    label: 'Multi-Family & HOA',
    href: '/multi-family-hoa',
    children: categoryChildren('multi-family-hoa'),
  },
  { label: 'Service Areas', href: '/service-areas' },
  { label: 'Contact', href: '/contact-us' },
  { label: 'Request a Quote', href: '/contact-us#quote-form' },
];

export const footerNav: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Residential', href: '/residential' },
  { label: 'Commercial', href: '/commercial' },
  { label: 'Multi-Family & HOA', href: '/multi-family-hoa' },
  { label: 'Service Areas', href: '/service-areas' },
  { label: 'Contact', href: '/contact-us' },
];
