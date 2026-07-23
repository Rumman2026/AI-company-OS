import type { CityRecord, County } from '../types/content';

/**
 * The single canonical service-area city/community source - see
 * DECISIONS.md ADR-0007 and BUSINESS_FACTS.md. Every city-dependent
 * feature (navigation, quote form, service-area pages, sitemap, structured
 * data, footer, internal links) must derive from this array - do not
 * maintain a second, separately-typed-in city list anywhere else.
 *
 * Every record starts `publishStatus: 'draft'` / `indexable: false` and
 * `projectReferences: []` - no real project record exists yet for any
 * city, so no individual city page is indexed or claims local completed
 * work (see the city-page publication policy in ADR-0007). The three
 * county pages and the /service-areas index remain indexable: they list
 * coverage factually without fabricating city-specific proof.
 */

function record(name: string, slug: string, county: County, aliases: string[] = []): CityRecord {
  return {
    name,
    slug,
    county,
    region: 'Southern California',
    state: 'CA',
    active: true,
    residentialAvailability: true,
    commercialAvailability: true,
    multiFamilyHoaAvailability: true,
    publishStatus: 'draft',
    indexable: false,
    priority: 50,
    nearbyCities: [],
    relevantServices: [],
    projectReferences: [],
    canonicalPath: `/service-areas/${slug}`,
    aliases,
    metadataStatus: 'generated',
    contentStatus: 'template-only',
  };
}

export const cities: CityRecord[] = [
  record('Aliso Viejo', 'aliso-viejo', 'Orange County'),
  record('Alpine', 'alpine', 'San Diego County'),
  record('Bonita', 'bonita', 'San Diego County'),
  record('Bonsall', 'bonsall', 'San Diego County'),
  record('Borrego Springs', 'borrego-springs', 'San Diego County'),
  record('Buena Park', 'buena-park', 'Orange County'),
  record('Camp Pendleton', 'camp-pendleton', 'San Diego County'),
  record('Capistrano Beach', 'capistrano-beach', 'Orange County'),
  record('Cardiff-by-the-Sea', 'cardiff-by-the-sea', 'San Diego County', [
    'Cardiff By The Sea',
    'Cardiff',
  ]),
  record('Carlsbad', 'carlsbad', 'San Diego County'),
  record('Chula Vista', 'chula-vista', 'San Diego County'),
  record('Corona', 'corona', 'Riverside County'),
  record('Corona del Mar', 'corona-del-mar', 'Orange County', ['Corona Del Mar']),
  record('Coronado', 'coronado', 'San Diego County'),
  record('Costa Mesa', 'costa-mesa', 'Orange County'),
  record('Cypress', 'cypress', 'Orange County'),
  record('Dana Point', 'dana-point', 'Orange County'),
  record('Del Mar', 'del-mar', 'San Diego County'),
  record('El Cajon', 'el-cajon', 'San Diego County'),
  record('El Toro', 'el-toro', 'Orange County'),
  record('Encinitas', 'encinitas', 'San Diego County'),
  record('Escondido', 'escondido', 'San Diego County'),
  record('Fallbrook', 'fallbrook', 'San Diego County'),
  record('Foothill Ranch', 'foothill-ranch', 'Orange County'),
  record('Fountain Valley', 'fountain-valley', 'Orange County'),
  record('Hemet', 'hemet', 'Riverside County'),
  record('Homeland', 'homeland', 'Riverside County'),
  record('Huntington Beach', 'huntington-beach', 'Orange County'),
  record('Imperial Beach', 'imperial-beach', 'San Diego County'),
  record('Irvine', 'irvine', 'Orange County'),
  record('Jacumba', 'jacumba', 'San Diego County'),
  record('Jamul', 'jamul', 'San Diego County'),
  record('Julian', 'julian', 'San Diego County'),
  record('La Habra', 'la-habra', 'Orange County'),
  record('La Jolla', 'la-jolla', 'San Diego County'),
  record('La Mesa', 'la-mesa', 'San Diego County'),
  record('Ladera Ranch', 'ladera-ranch', 'Orange County'),
  record('Laguna Beach', 'laguna-beach', 'Orange County'),
  record('Laguna Hills', 'laguna-hills', 'Orange County'),
  record('Laguna Niguel', 'laguna-niguel', 'Orange County'),
  record('Laguna Woods', 'laguna-woods', 'Orange County'),
  record('Lake Elsinore', 'lake-elsinore', 'Riverside County'),
  record('Lake Forest', 'lake-forest', 'Orange County'),
  record('Lakeside', 'lakeside', 'San Diego County'),
  record('Lemon Grove', 'lemon-grove', 'San Diego County'),
  record('Los Alamitos', 'los-alamitos', 'Orange County'),
  record('Mission Viejo', 'mission-viejo', 'Orange County'),
  record('Moreno Valley', 'moreno-valley', 'Riverside County'),
  record('Mount Laguna', 'mount-laguna', 'San Diego County', ['Mt Laguna', 'Mt. Laguna']),
  record('Murrieta', 'murrieta', 'Riverside County'),
  record('National City', 'national-city', 'San Diego County'),
  record('Newport Beach', 'newport-beach', 'Orange County'),
  record('Newport Coast', 'newport-coast', 'Orange County'),
  record('Oceanside', 'oceanside', 'San Diego County'),
  record('Pala', 'pala', 'San Diego County'),
  record('Palomar Mountain', 'palomar-mountain', 'San Diego County', [
    'Palomar Mtn',
    'Palomar Mtn.',
  ]),
  record('Perris', 'perris', 'Riverside County'),
  record('Poway', 'poway', 'San Diego County'),
  record('Ramona', 'ramona', 'San Diego County'),
  record('Ranchita', 'ranchita', 'San Diego County'),
  record('Rancho Santa Fe', 'rancho-santa-fe', 'San Diego County'),
  record('Rancho Santa Margarita', 'rancho-santa-margarita', 'Orange County'),
  record('San Clemente', 'san-clemente', 'Orange County'),
  record('San Diego', 'san-diego', 'San Diego County'),
  record('San Jacinto', 'san-jacinto', 'Riverside County'),
  record('San Juan Capistrano', 'san-juan-capistrano', 'Orange County'),
  record('San Luis Rey', 'san-luis-rey', 'San Diego County'),
  record('San Marcos', 'san-marcos', 'San Diego County'),
  record('Santa Ana', 'santa-ana', 'Orange County'),
  record('Seal Beach', 'seal-beach', 'Orange County'),
  record('Solana Beach', 'solana-beach', 'San Diego County'),
  record('Spring Valley', 'spring-valley', 'San Diego County'),
  record('Sun City', 'sun-city', 'Riverside County'),
  record('Temecula', 'temecula', 'Riverside County'),
  record('Trabuco Canyon', 'trabuco-canyon', 'Orange County'),
  record('Tustin', 'tustin', 'Orange County'),
  record('Valley Center', 'valley-center', 'San Diego County'),
  record('Vista', 'vista', 'San Diego County'),
  record('Wildomar', 'wildomar', 'Riverside County'),
  record('Winchester', 'winchester', 'Riverside County'),
];

export const COUNTIES: readonly County[] = [
  'San Diego County',
  'Orange County',
  'Riverside County',
];

export const countySlug: Record<County, string> = {
  'San Diego County': 'san-diego-county',
  'Orange County': 'orange-county',
  'Riverside County': 'riverside-county',
};

export function citiesByCounty(county: County): CityRecord[] {
  return cities.filter((city) => city.county === county);
}

export function findCityBySlug(slug: string): CityRecord | undefined {
  return cities.find((city) => city.slug === slug);
}

// Duplicate-slug guard, evaluated at module load: fails fast (build-time
// error, not just a test) if two records ever collide - see the
// "duplicate city slugs" automated-validation requirement in ADR-0007.
const seenSlugs = new Set<string>();
for (const city of cities) {
  if (seenSlugs.has(city.slug)) {
    throw new Error(`Duplicate city slug in src/data/cities.ts: ${city.slug}`);
  }
  seenSlugs.add(city.slug);
}
