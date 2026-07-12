export interface SiteInfo {
  businessName: string;
  phoneDisplay: string;
  phoneHref: string;
  emailDisplay: string;
  emailHref: string;
  region: string;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface ServiceRecord {
  slug: string;
  route: string;
  title: string;
  summary: string;
  body: string[];
  metaTitle: string;
  metaDescription: string;
}

export interface PageMeta {
  title: string;
  description: string;
}
