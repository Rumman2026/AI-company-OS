import type { ServiceRecord } from '../types/content';

export const services: ServiceRecord[] = [
  {
    slug: 'roof-cleaning',
    route: '/roof',
    title: 'Roof Cleaning',
    summary: 'Exterior roof cleaning to address surface dirt, debris, and organic growth.',
    body: [
      'Roof cleaning addresses the buildup of dirt, debris, and organic growth that can accumulate on exterior roofing surfaces over time.',
      'The general goal is to clean visible roofing surfaces as part of routine exterior property maintenance.',
    ],
    metaTitle: 'Roof Cleaning | GreenCal Pressure Washing',
    metaDescription:
      'Exterior roof cleaning services from GreenCal Pressure Washing, serving Southern California.',
  },
  {
    slug: 'house-washing',
    route: '/restoration/house-washing',
    title: 'House & Stucco Washing',
    summary: 'Exterior house and stucco surface cleaning as part of routine property care.',
    body: [
      'House and stucco washing addresses dirt and buildup on exterior siding and stucco surfaces.',
      'The general goal is to clean visible exterior surfaces as part of routine property maintenance.',
    ],
    metaTitle: 'House & Stucco Washing | GreenCal Pressure Washing',
    metaDescription:
      'Exterior house and stucco cleaning services from GreenCal Pressure Washing, serving Southern California.',
  },
];
