# GreenCal Pressure Washing — Business Facts

Owner-approved business scope for `apps/greencal-website`. Durable
reference, not auto-loaded — read when scoping GreenCal work. See
[DECISIONS.md](DECISIONS.md) ADR-0007 for the full rationale and
[docs/INDEX.md](docs/INDEX.md) for routing. The **code** is the enforced
source of truth for services and cities
(`apps/greencal-website/src/data/services.ts`,
`apps/greencal-website/src/data/quote-form-service-options.ts`,
`apps/greencal-website/src/data/cities.ts`) — this document must stay in
sync with it; if they ever disagree, the code and its tests win.

## Owner approval

- **Approval date**: 2026-07-22.
- **Source reference**: Service-category structure, commercial/multi-family
  service groupings, and city-coverage pattern modeled on the published
  structure of `washedoutpressurewashing.com` (inspected 2026-07-22) —
  used only to verify a reasonable scope and information architecture for
  a Southern California pressure-washing business. No wording, branding,
  logo, images, reviews, ratings, statistics, licenses, certifications,
  address, phone number, staff information, warranties, guarantees, or
  pricing from that site was copied. All GreenCal copy is original.

## Approved services

**Residential**

- Roof Cleaning
- House Washing (stucco, siding, painted exterior surfaces; soft washing)
- Concrete Cleaning (driveways, sidewalks, walkways, patios, entry areas,
  pool decks as a concrete surface only, brick, stone)

**Commercial**

- Commercial Building Washing
- Storefront Cleaning
- Commercial Concrete Cleaning (sidewalks, walkways, entrances,
  parking-area flatwork, loading docks, dumpster pads, drive-thru lanes,
  common-area concrete, brick/stone)
- Dumpster Pad Cleaning
- Drive-Thru Cleaning
- Gum and Stain Removal (stain treatment/reduction — results depend on
  stain type, age, surface, and prior treatment; complete removal is
  never guaranteed)
- Recurring Exterior Cleaning / Maintenance Plans

**Multi-Family & HOA**

- Apartment and Condo Exterior Cleaning
- HOA Exterior Cleaning
- Multi-Unit Building Washing
- Multi-Unit / Common-Area Concrete Cleaning

The last two multi-family options map to the same two published pages
(`/multi-family-hoa/apartment-condo-cleaning`,
`/multi-family-hoa/hoa-pressure-washing`) rather than getting dedicated
near-duplicate pages — see ADR-0007.

## Excluded services

Never published, advertised, quoted, or referenced in structured
data/SEO for this site:

- Auto detailing, mobile detailing, car washing, fleet detailing
- Pool cleaning, pool maintenance, pool chemical service, pool repair
  (a concrete pool **deck** may be cleaned as a concrete surface — this
  is not pool cleaning)
- Carpet cleaning, upholstery cleaning
- Paver sealing, concrete sealing, driveway sealing, brick sealing, stone
  sealing, joint-sand/polymeric-sand installation
- Holiday lighting, permanent lighting, lighting installation
- Landscaping, painting
- Roofing installation, roof repair, gutter installation, solar
  installation
- Janitorial service, maid service, indoor cleaning
- All other unapproved services

## Approved counties

- San Diego County
- Orange County
- Riverside County

**Los Angeles County is not an approved service area.** Do not publish
"serving all of Southern California" or "serving all of [county]" claims
— use: _"Serving approved communities across San Diego, Orange, and
Riverside Counties."_

## Approved city list (80 communities)

Canonical source: `apps/greencal-website/src/data/cities.ts`. Every
city-dependent feature (navigation, quote form, service-area pages,
sitemap, structured data, footer, internal links) derives from that file
— no separate hand-maintained city list exists anywhere else in the app.

**San Diego County**: Alpine, Bonita, Bonsall, Borrego Springs, Camp
Pendleton, Cardiff-by-the-Sea, Carlsbad, Chula Vista, Coronado, Del Mar,
El Cajon, Encinitas, Escondido, Fallbrook, Imperial Beach, Jacumba,
Jamul, Julian, La Jolla, La Mesa, Lakeside, Lemon Grove, Mount Laguna,
National City, Oceanside, Pala, Palomar Mountain, Poway, Ramona,
Ranchita, Rancho Santa Fe, San Diego, San Luis Rey, San Marcos, Solana
Beach, Spring Valley, Valley Center, Vista.

**Orange County**: Aliso Viejo, Buena Park, Capistrano Beach, Corona del
Mar, Costa Mesa, Cypress, Dana Point, El Toro, Foothill Ranch, Fountain
Valley, Huntington Beach, Irvine, La Habra, Ladera Ranch, Laguna Beach,
Laguna Hills, Laguna Niguel, Laguna Woods, Lake Forest, Los Alamitos,
Mission Viejo, Newport Beach, Newport Coast, Rancho Santa Margarita, San
Clemente, San Juan Capistrano, Santa Ana, Seal Beach, Trabuco Canyon,
Tustin.

**Riverside County**: Corona, Hemet, Homeland, Lake Elsinore, Moreno
Valley, Murrieta, Perris, San Jacinto, Sun City, Temecula, Wildomar,
Winchester.

That is 38 San Diego County + 30 Orange County + 12 Riverside County = 80
communities total, matching the source list exactly. If this count ever
disagrees with `cities.ts`, `cities.ts` and its duplicate-slug guard are
authoritative.

## City-name normalization

Display names use their standard published form; slugs are lowercase
kebab-case. Examples:

| Display name           | Slug                     |
| ---------------------- | ------------------------ |
| Cardiff-by-the-Sea     | `cardiff-by-the-sea`     |
| Corona del Mar         | `corona-del-mar`         |
| Mount Laguna           | `mount-laguna`           |
| Palomar Mountain       | `palomar-mountain`       |
| Rancho Santa Margarita | `rancho-santa-margarita` |
| San Juan Capistrano    | `san-juan-capistrano`    |

Do not create duplicate variant slugs/pages (e.g. "Palomar Mtn", "Cardiff
By The Sea") — use the `aliases` field on the relevant `CityRecord` for
redirect/search matching instead.

## Prohibited assumptions

- Do not infer service-area coverage from geographic proximity to an
  approved city — only the 80 listed communities are approved.
- Do not assume every service is available in every listed city beyond
  what `cities.ts`'s availability flags state; when no restriction is
  recorded, the site presents the approved service categories generally
  and subjects submissions to service confirmation (see the disclaimer
  below).
- Do not claim GreenCal has completed work in any city, or fabricate
  local landmarks, climate claims, regulations, response times, or
  rankings, without a real, owner-verified project record.

**Standard disclaimer** (used across service-area pages): _"Service
availability may depend on property location, project size, access,
scope, and scheduling. Submit your project details for confirmation."_

## Publication-quality policy

The approved city list defines coverage, not automatic SEO publication.
Every city page is generated (the reusable system covers all 80), but
starts `publishStatus: 'draft'` / `indexable: false` — excluded from
`sitemap.xml.ts` and marked `noindex` — until a future stage adds real,
unique, non-fabricated content and proof for that specific city. The
`/service-areas` index and the three county pages remain indexable now
because their content (a factual list, a disclaimer, and links to real
service pages) doesn't depend on unverified per-city claims.

## Future scope-change procedure

Any service outside the approved list, any city outside the 80-entry
list, or any county outside San Diego/Orange/Riverside Counties requires
a new, explicit owner approval — recorded as a new or amended ADR in
[DECISIONS.md](DECISIONS.md) — before it may be added to navigation, the
quote form, structured data, or any generated page. Automated tests
(`apps/greencal-website/tests/scope-exclusions.spec.ts`) enforce the
current boundary and must be updated as part of that same approval, not
loosened ahead of it.
