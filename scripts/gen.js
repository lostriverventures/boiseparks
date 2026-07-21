#!/usr/bin/env node
/*
 * Build-time generator for boiseparks.com. Produces:
 *   js/parks-data.js        — window.BOISE_PARKS bundle (parks.json merged with tips.json)
 *   parks/<slug>/index.html — static SEO page per park with schema.org Park JSON-LD
 *   <guide>/index.html      — topic guide pages (see scripts/guides.js)
 *   sitemap.xml             — homepage + every park page + guides, lastmod = today
 * Data pipeline that creates data/parks.json lives in scripts/fetch-data.py.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const buildGuides = require('./guides');
const buildAreas = require('./areas');
const createKit = require('./page-kit');
const { areaFor } = require('./page-kit');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://boiseparks.com';
const BUILD_DATE = new Date().toISOString().slice(0, 10);
// Placeholder for each page's real last-modified date. Pages are generated with
// the token in place, hashed, and only then is the token resolved (see
// "honest lastmod" below) — so a page whose content didn't change keeps its old
// date instead of claiming it changed on every deploy.
const DATE_TOKEN = '@@DATEMOD@@';

// Publisher identity, emitted on every page. Answer engines and search engines
// both weigh "who says this and where did it come from" — naming the publisher
// and the upstream data source in machine-readable form makes the site
// attributable rather than an anonymous page of facts.
const ORG = {
  '@type': 'Organization',
  '@id': SITE + '/#org',
  name: 'boiseparks.com',
  url: SITE,
  description: 'Independent guide to Boise, Idaho city parks for families, built from City of Boise open data.',
};
const webPageSchema = ({ url, name, description, breadcrumbId }) => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': url + '#webpage',
  url, name, description,
  inLanguage: 'en-US',
  isPartOf: { '@type': 'WebSite', '@id': SITE + '/#website', name: 'Boise Parks', url: SITE },
  publisher: { '@id': SITE + '/#org' },
  dateModified: DATE_TOKEN,
  license: 'https://opendata.cityofboise.org/',
  ...(breadcrumbId ? { breadcrumb: { '@id': breadcrumbId } } : {}),
});

// Google Analytics 4 — single source of truth. Stamped into every park page's
// <head> below and into index.html (between the ga:start/ga:end markers).
const GA_ID = 'G-RE6TED2HBZ';
const gaSnippet =
`<!-- Google Analytics (GA4) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>`;
const parks = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/parks.json'), 'utf8'));
const tips = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/tips.json'), 'utf8'));
const parking = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/parking.json'), 'utf8'));
const photos = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/photos.json'), 'utf8'));

for (const p of parks) {
  if (tips[p.slug]) p.tip = tips[p.slug];
  if (parking[p.slug]) p.parking = parking[p.slug];
  // Use only openly-licensed Wikimedia Commons photos (data/photos.json); never
  // the City of Boise CDN images that used to live in p.img.
  delete p.img;
  if (photos[p.slug]) p.photo = photos[p.slug];
}

// ---------- Parent Score: transparent 0–10, computed only from the amenity data ----------
// Philosophy: what actually makes a park good for kids is the playground, tree
// cover, and open grass — plus restrooms. Those four are the CORE (max 9). Water
// features, shelters and trails are nice-to-haves, so they're small BONUSES that
// only ADD (capped at +1) and never drag a park down for lacking them. Parking is
// logistics, not park quality, so it's shown separately and left out of the score.
const round1 = n => Math.round(n * 10) / 10;
function parentScore(p) {
  const core = [];
  // Playground (max 3.5) — the #1 reason you take kids to a park
  let v = 0;
  if (p.playground) {
    v = 2;
    if (p.playground.toddler && p.playground.bigKid) v += 0.5;    // equipment for both age ranges
    if (p.playground.rubberSurface || p.playground.ada) v += 0.5; // accessible surfacing
    if (p.playground.newestYear >= 2015) v += 0.5;                // built or rebuilt recently
  }
  core.push(['Playground', v, 3.5]);
  // Tree cover / shade (max 2.5) — comfort on a Boise summer afternoon
  core.push(['Tree cover', { leafy: 2.5, some: 1.25, 'full-sun': 0 }[p.shade], 2.5]);
  // Open grass & room to run (max 1.5). The city's Open_Play_Areas flag misses
  // some obviously grassy parks (e.g. 148-acre Ann Morrison), so also count
  // grassy sports fields (soccer/football/softball/cricket/multi-use) as room to run.
  const hasGrass = p.openPlay || (p.fields && p.fields.length > 0);
  core.push(['Open grass & room to run', hasGrass ? 1.5 : 0, 1.5]);
  // Restrooms (max 1.5)
  core.push(['Restrooms', { 'year-round': 1.5, 'seasonal+portable': 1, 'seasonal': 0.75, 'none': 0 }[p.restroom], 1.5]);

  // Bonuses — presence only, capped at +1, never a penalty
  const bonusDefs = [
    ['Splash pad / water', (p.water || p.pool), 0.5],
    ['Picnic shelter', (p.shelter || p.reservable), 0.25],
    ['Greenbelt / trails', p.greenbelt, 0.25],
    ['Fishing', p.fishing, 0.25],
    ['Sport courts & fields', (p.courts.length || p.fields.length), 0.25],
  ];
  const earned = bonusDefs.filter(b => b[1]);
  const bonusRaw = earned.reduce((a, b) => a + b[2], 0);
  const bonus = Math.min(1, bonusRaw);

  const coreSum = core.reduce((a, b) => a + b[1], 0);
  p.score = round1(Math.min(10, coreSum + bonus));
  p.scoreRows = core.map(([label, got, max]) => ({ label, got, max }));
  p.bonus = { got: round1(bonus), items: earned.map(b => b[0]) };
}
parks.forEach(parentScore);

// The raw City of Boise Park_Description is kept in data/parks.json only as
// source material for writing/verifying our own notes. It is never published:
// strip it here so no verbatim city text ships in the bundle or on any page.
parks.forEach(p => { delete p.desc; });

// ---------- js/parks-data.js ----------
fs.mkdirSync(path.join(ROOT, 'js'), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, 'js/parks-data.js'),
  '// Generated by scripts/gen.js — do not edit by hand. Source: data/parks.json + data/tips.json\n' +
  'window.BOISE_PARKS = ' + JSON.stringify(parks) + ';\n'
);

// ---------- helpers ----------
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

const RESTROOM_LABEL = {
  'year-round': 'Heated restrooms, open year-round',
  'seasonal+portable': 'Seasonal restrooms; portable toilet in winter',
  'seasonal': 'Seasonal restrooms (closed in winter)',
  'none': 'No restrooms at this park',
};
const SHADE_LABEL = { 'leafy': 'Leafy — lots of mature tree cover', 'some': 'Some shade — a mix of trees and open lawn', 'full-sun': 'Mostly full sun — pack hats and sunscreen' };
const PARKING_LABEL = { lot: 'Dedicated parking lot', street: 'On-street parking', downtown: 'Metered street parking & paid garages nearby' };
const parkingText = p => p.parking ? (p.parking.note || PARKING_LABEL[p.parking.type]) : null;
const scoreClasses = s => s >= 8 ? 'bg-meadow text-white' : s >= 6 ? 'bg-meadow-light text-meadow-deep' : s >= 4 ? 'bg-sun-light text-sun' : 'bg-stone-100 text-bark';
const fmtScore = s => (s % 1 === 0 ? s.toFixed(0) : s.toFixed(1));

// ---------- nearby parks ----------
// Park pages used to link only to the homepage and the guides, which made all
// 94 of them dead ends: no park linked to any other park. This gives every page
// lateral links to its actual neighbours, which is both the obvious next
// question for a reader ("what else is near here?") and the geographic
// relationship an answer engine needs to handle "parks near the North End".
const EARTH_MI = 3958.8;
const toRad = d => d * Math.PI / 180;
function distanceMi(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_MI * Math.asin(Math.sqrt(h));
}
const nearbyParks = (p, n = 6) => parks
  .filter(o => o.slug !== p.slug)
  .map(o => ({ p: o, mi: distanceMi(p, o) }))
  .sort((a, b) => a.mi - b.mi)
  .slice(0, n);

const RESTROOM_SHORT = {
  'year-round': 'Year-round restroom',
  'seasonal+portable': 'Seasonal restroom',
  'seasonal': 'Seasonal restroom',
  'none': 'No restroom',
};
const SHADE_SHORT = { 'leafy': 'Leafy', 'some': 'Some shade', 'full-sun': 'Full sun' };

// Google Maps place link (shows the park's location, not directions).
function mapsUrl(p) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`${p.name}, ${p.address}, Boise, ID ${p.zip}`);
}

// Per-park questions, generated from the amenity data. These exist because the
// queries people actually type ("does camel's back park have a bathroom") are
// questions, and both search snippets and AI answer engines lift a direct
// question-and-answer pair far more readily than a fact buried in a table.
// Rendered visibly on the page AND as FAQPage JSON-LD — Google requires the
// answer text to be present on the page, not schema-only.
function parkFaq(p) {
  const q = [];
  const pg = p.playground;

  q.push([`Does ${p.name} have a restroom?`, {
    'year-round': `Yes. ${p.name} has a heated restroom building that stays open year-round, including through the winter.`,
    'seasonal+portable': `${p.name} has a restroom that is open in the warm months. The building is winterized for the cold months, but the city leaves a portable toilet on site.`,
    'seasonal': `${p.name} has a seasonal restroom. It is open in the warm months and closed for the winter, with no portable toilet as backup.`,
    'none': `No. ${p.name} has no restroom at any time of year.`,
  }[p.restroom]]);

  if (pg) {
    const ages = pg.toddler && pg.bigKid ? 'equipment for both toddlers (ages 2–5) and big kids (ages 5–12)'
      : pg.toddler ? 'equipment for toddlers (ages 2–5)'
      : pg.bigKid ? 'equipment for big kids (ages 5–12)' : 'playground equipment';
    let a = `Yes. ${p.name} has ${ages}`;
    a += pg.features.length ? `, including ${pg.features.join(', ')}.` : '.';
    if (pg.surface) a += ` The surfacing is ${pg.surface}${pg.rubberSurface ? ', which is stroller and wheelchair friendly' : ''}.`;
    if (pg.newestYear) a += ` The newest structure was installed in ${pg.newestYear}.`;
    q.push([`Does ${p.name} have a playground?`, a]);
  } else {
    q.push([`Does ${p.name} have a playground?`, `No. ${p.name} has no playground equipment.`]);
  }

  if (p.water) q.push([`Does ${p.name} have a splash pad?`,
    `${p.name} has a ${p.water.type.toLowerCase()}. It runs ${p.water.hours.toLowerCase()} and is free to use.`]);
  if (p.pool) q.push([`Does ${p.name} have a swimming pool?`,
    `Yes. ${p.name} has a city-run outdoor pool. Its season, hours and admission are listed on the City of Boise page for the park.`]);

  const treeNote = p.trees ? ` The city tree inventory lists ${p.trees.toLocaleString()} trees in the park.` : '';
  q.push([`Is there shade at ${p.name}?`, {
    'leafy': `${p.name} is rated leafy, meaning dense mature tree cover.${treeNote}`,
    'some': `${p.name} has some shade — a mix of trees and open lawn.${treeNote}`,
    'full-sun': `${p.name} is mostly full sun, with little tree cover.${treeNote}`,
  }[p.shade]]);

  if (p.parking) q.push([`Where do you park at ${p.name}?`, `${parkingText(p)}.`]);

  q.push([`How big is ${p.name}?`,
    `${p.name} is ${p.acres} acres. It is classified by the city as a ${p.type.toLowerCase()} park and is located in the ${p.area} area of Boise at ${p.address}.`]);

  return q;
}

function playgroundBits(p) {
  const pg = p.playground;
  if (!pg) return null;
  const ages = pg.toddler && pg.bigKid ? 'toddlers (2–5) and big kids (5–12)' : pg.toddler ? 'toddlers (2–5)' : pg.bigKid ? 'big kids (5–12)' : null;
  const bits = [];
  if (ages) bits.push(`Equipment for ${ages}`);
  if (pg.features.length) bits.push(cap(pg.features.join(', ')));
  if (pg.surface) bits.push(`${cap(pg.surface)} surfacing${pg.rubberSurface ? ' (stroller & wheelchair friendly)' : ''}`);
  if (pg.ada) bits.push('ADA-accessible equipment');
  if (pg.newestYear) bits.push(`Newest structure installed ${pg.newestYear}`);
  return bits;
}

// ---------- park pages ----------
const header = `
<header class="sticky top-0 z-40 border-b border-meadow/15 bg-cream/90 backdrop-blur">
  <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
    <a href="/" class="flex items-center gap-2.5">
      <img src="/favicon.svg" alt="" class="h-8 w-8">
      <span class="font-display text-lg font-bold text-meadow-deep">boise<span class="text-meadow">parks</span>.com</span>
    </a>
    <nav class="flex items-center gap-3 text-[13px] font-medium text-bark sm:gap-5 sm:text-sm">
      <a href="/best-playgrounds/" class="hidden xs:inline hover:text-meadow-deep">Playgrounds</a>
      <a href="/splash-pads/" class="hover:text-meadow-deep">Splash pads</a>
      <a href="/#map" class="hover:text-meadow-deep">Map</a>
      <a href="/#parks" class="whitespace-nowrap rounded-full bg-meadow px-3 py-1.5 text-white hover:bg-meadow-dark sm:px-3.5">All parks</a>
    </nav>
  </div>
</header>`;

// Sitewide footer links. Kept to the guides most people want plus the area
// hubs — every generated page also carries the full cross-link block.
const { GUIDE_LINKS, AREAS } = require('./page-kit');
const FOOTER_LINKS = [
  ...GUIDE_LINKS,
  ...AREAS.map(a => [`/areas/${a.slug}/`, a.label]),
];

const footer = `
<footer class="mt-16 border-t border-meadow/15 bg-meadow-deep py-10 text-sm text-white/80">
  <div class="mx-auto max-w-6xl px-4">
    <div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
      <div class="max-w-md">
        <p class="font-display text-base font-bold text-white">boiseparks.com</p>
        <p class="mt-2">The parent's guide to every park in Boise — playgrounds, splash pads, restrooms, shade and more, built from official City of Boise data.</p>
        <ul class="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 font-medium text-white">
          ${FOOTER_LINKS.map(([href, label]) => `<li><a class="underline decoration-white/40 underline-offset-2 hover:decoration-white" href="${href}">${label}</a></li>`).join('\n          ')}
        </ul>
      </div>
      <div class="text-white/70">
        <p>Park data: <a class="underline hover:text-white" href="https://opendata.cityofboise.org/" rel="noopener">City of Boise Open Data</a> &amp; <a class="underline hover:text-white" href="https://www.cityofboise.org/departments/parks-and-recreation/" rel="noopener">Boise Parks and Recreation</a>.</p>
        <p class="mt-1">Not affiliated with the City of Boise. Details can change — check the city page before you count on a specific amenity.</p>
      </div>
    </div>
  </div>
</footer>`;

const pgDir = path.join(ROOT, 'parks');
fs.rmSync(pgDir, { recursive: true, force: true });

for (const p of parks) {
  const url = `${SITE}/parks/${p.slug}/`;
  const pgBits = playgroundBits(p);
  const title = `${p.name} — Playground, Restrooms & Amenities | Boise Parks`;
  const descText = p.tip || `${p.name} in Boise, Idaho: amenities, playground details, restrooms and more.`;
  const metaDesc = esc(descText.replace(/\s+/g, ' ').slice(0, 158));

  const amenities = [];
  if (p.playground) amenities.push('Playground');
  if (p.water) amenities.push(p.water.type);
  if (p.pool) amenities.push('Outdoor pool');
  if (p.restroom !== 'none') amenities.push('Restrooms');
  if (p.shelter) amenities.push('Picnic shelter');
  if (p.greenbelt) amenities.push('Greenbelt access');
  if (p.fishing) amenities.push('Fishing');
  if (p.dogPark) amenities.push('Dog off-leash area');
  if (p.openPlay) amenities.push('Open play areas');
  amenities.push(...p.courts.map(cap), ...p.fields.map(cap), ...p.extras.map(cap));

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Park',
    name: p.name,
    url,
    address: { '@type': 'PostalAddress', streetAddress: p.address, addressLocality: 'Boise', addressRegion: 'ID', postalCode: p.zip, addressCountry: 'US' },
    geo: { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lon },
    description: descText.replace(/\s+/g, ' ').slice(0, 300),
    amenityFeature: amenities.map(a => ({ '@type': 'LocationFeatureSpecification', name: a, value: true })),
    isAccessibleForFree: true,
    ...(p.photo ? { image: SITE + p.photo.file } : {}),
  };
  // Three-level breadcrumb (site → area → park) so the area pages sit in the
  // hierarchy as a real hub rather than a floating list.
  const area = areaFor(p.area);
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    '@id': url + '#breadcrumb',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Boise Parks', item: SITE + '/' },
      ...(area ? [{ '@type': 'ListItem', position: 2, name: `Parks in ${area.label}`, item: `${SITE}/areas/${area.slug}/` }] : []),
      { '@type': 'ListItem', position: area ? 3 : 2, name: p.name, item: url },
    ],
  };
  const faqs = parkFaq(p);
  const faqSchema = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map(([q, a]) => ({
      '@type': 'Question', name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
  const orgSchema = { '@context': 'https://schema.org', ...ORG };
  const pageSchema = webPageSchema({ url, name: title, description: descText.replace(/\s+/g, ' ').slice(0, 300), breadcrumbId: url + '#breadcrumb' });

  const factRows = [
    ['Size', `${p.acres} acres`],
    ['Area', p.area],
    ['Type', p.type + ' park'],
    ['Address', `${p.address}, Boise, ID ${p.zip}`],
    ['Restrooms', RESTROOM_LABEL[p.restroom]],
    ...(p.parking ? [['Parking', parkingText(p)]] : []),
    ['Shade', SHADE_LABEL[p.shade] + (p.trees ? ` (${p.trees.toLocaleString()} park trees in the city inventory)` : '')],
  ];
  if (p.water) factRows.push(['Water play', `${p.water.type} — ${p.water.hours}`]);
  if (p.reservable) factRows.push(['Reservations', 'Picnic shelter/area reservable through the city']);

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${gaSnippet}
  <title>${esc(title)}</title>
  <meta name="description" content="${metaDesc}">
  <link rel="canonical" href="${url}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${metaDesc}">
  <meta property="og:type" content="place">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${p.photo ? SITE + p.photo.file : SITE + '/og-image.png'}">
  ${p.photo ? '' : '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">'}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${metaDesc}">
  <meta name="twitter:image" content="${p.photo ? SITE + p.photo.file : SITE + '/og-image.png'}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
  <link rel="stylesheet" href="/styles.css">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>
  <script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(pageSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(orgSchema)}</script>
</head>
<body class="bg-cream font-sans text-ink">
${header}
<main class="mx-auto max-w-4xl px-4 pb-8 pt-8">
  <nav class="text-[13px] text-bark" aria-label="Breadcrumb"><a href="/" class="hover:text-meadow-deep">Boise Parks</a> <span class="mx-1 text-bark/50">/</span> ${area ? `<a href="/areas/${area.slug}/" class="hover:text-meadow-deep">${esc(area.label)}</a> <span class="mx-1 text-bark/50">/</span> ` : ''}<span class="font-medium text-meadow-deep">${esc(p.name)}</span></nav>
  <h1 class="mt-3 font-display text-3xl font-bold text-meadow-deep sm:text-4xl">${esc(p.name)}</h1>
  <p class="mt-1.5 text-[15px] text-bark"><a href="${mapsUrl(p)}" rel="noopener" class="underline decoration-meadow/40 underline-offset-2 hover:text-meadow-deep">${esc(p.address)}, Boise, ID ${esc(p.zip)}</a> · ${p.acres} acres · ${esc(p.area)}</p>

  ${p.photo ? `<figure class="mt-6">
    <img src="${esc(p.photo.file)}" alt="${esc(p.name)} in Boise, Idaho" class="aspect-[16/8] w-full rounded-2xl object-cover shadow-card" loading="lazy">
    <figcaption class="mt-1.5 text-[11.5px] text-bark">Photo: <a href="${esc(p.photo.source)}" rel="noopener" class="underline hover:text-meadow-deep">${esc(p.photo.author)}</a> · <a href="${esc(p.photo.licenseUrl)}" rel="noopener" class="underline hover:text-meadow-deep">${esc(p.photo.license)}</a> via Wikimedia Commons</figcaption>
  </figure>` : ''}

  ${p.tip ? `<div class="mt-6 rounded-2xl border border-sun/40 bg-sun-light px-5 py-4"><p class="text-[13px] font-bold uppercase tracking-wide text-sun">Parent notes</p><p class="mt-1.5 text-[15px] leading-relaxed">${esc(p.tip)}</p></div>` : ''}

  <div class="mt-8 grid gap-8 sm:grid-cols-5">
    <div class="sm:col-span-3">
      <h2 class="font-display text-xl font-bold text-meadow-deep">The essentials</h2>
      <dl class="mt-3 divide-y divide-meadow/10 rounded-2xl border border-meadow/15 bg-white px-5 shadow-card">
        ${factRows.map(([k, v]) => `<div class="flex gap-4 py-3 text-[14.5px]"><dt class="w-28 shrink-0 font-semibold text-meadow-deep">${esc(k)}</dt><dd class="text-ink/90">${esc(v)}</dd></div>`).join('\n        ')}
      </dl>
      ${pgBits ? `
      <h2 class="mt-8 font-display text-xl font-bold text-meadow-deep">Playground</h2>
      <ul class="mt-3 space-y-2 rounded-2xl border border-meadow/15 bg-white px-5 py-4 text-[14.5px] shadow-card">
        ${pgBits.map(b => `<li class="flex gap-2"><span class="text-meadow">·</span> ${esc(b)}</li>`).join('\n        ')}
      </ul>` : `<p class="mt-8 rounded-2xl border border-meadow/15 bg-white px-5 py-4 text-[14.5px] text-bark shadow-card">No playground at this park.</p>`}
      <h2 class="mt-8 font-display text-xl font-bold text-meadow-deep">Common questions about ${esc(p.name)}</h2>
      <div class="mt-3 divide-y divide-meadow/10 rounded-2xl border border-meadow/15 bg-white px-5 shadow-card">
        ${faqs.map(([q, a]) => `<div class="py-3.5">
          <h3 class="text-[15px] font-bold text-meadow-deep">${esc(q)}</h3>
          <p class="mt-1 text-[14.5px] leading-relaxed text-ink/85">${esc(a)}</p>
        </div>`).join('\n        ')}
      </div>
      ${p.cityUrl ? `
      <p class="mt-8 text-[13px] text-bark">For the city's official write-up and any current alerts, see the <a href="${esc(p.cityUrl)}" class="underline hover:text-meadow-deep" rel="noopener">${esc(p.name)} page at Boise Parks and Recreation</a>.</p>` : ''}
    </div>
    <aside class="sm:col-span-2">
      <div class="mb-4 overflow-hidden rounded-2xl border border-meadow/15 bg-white shadow-card">
        <div id="locmap" class="h-48 w-full"></div>
        <p class="px-5 py-3 text-[13px] leading-snug"><a href="${mapsUrl(p)}" rel="noopener" class="underline hover:text-meadow-deep">${esc(p.address)}, Boise, ID ${esc(p.zip)}</a> <span class="text-bark">— view on Google Maps</span></p>
      </div>
      <div class="mb-4 rounded-2xl border border-meadow/15 bg-white p-5 shadow-card">
        <div class="flex items-center justify-between gap-3">
          <h2 class="font-display text-lg font-bold text-meadow-deep">Parent Score</h2>
          <span class="rounded-xl px-2.5 py-1 text-lg font-bold ${scoreClasses(p.score)}">${fmtScore(p.score)}<span class="text-[12px] font-semibold opacity-70">/10</span></span>
        </div>
        <ul class="mt-3 space-y-1.5 text-[13px] text-ink/85">
          ${p.scoreRows.map(r => `<li class="flex items-baseline justify-between gap-2"><span>${esc(r.label)}</span><span class="font-semibold ${r.got === 0 ? 'text-bark/50' : 'text-meadow-deep'}">${fmtScore(r.got)}<span class="font-normal text-bark/60">/${fmtScore(r.max)}</span></span></li>`).join('\n          ')}
          <li class="flex items-baseline justify-between gap-2 border-t border-meadow/10 pt-1.5"><span>Bonus features${p.bonus.items.length ? ` <span class="text-bark/60">(${esc(p.bonus.items.join(', '))})</span>` : ''}</span><span class="font-semibold ${p.bonus.got === 0 ? 'text-bark/50' : 'text-meadow-deep'}">+${fmtScore(p.bonus.got)}<span class="font-normal text-bark/60">/1</span></span></li>
        </ul>
        <p class="mt-3 text-[12px] leading-snug text-bark">How good a visit is with kids — playground, tree cover and grass count most; water, shelters and trails are bonuses; parking never counts against a park. <a href="/#about" class="underline">Methodology</a>.</p>
      </div>
      <div class="rounded-2xl border border-meadow/15 bg-white p-5 shadow-card">
        <h2 class="font-display text-lg font-bold text-meadow-deep">Everything here</h2>
        <ul class="mt-3 flex flex-wrap gap-1.5 text-[12.5px] font-medium">
          ${amenities.map(a => `<li class="rounded-md bg-meadow-light px-2 py-1 text-meadow-deep">${esc(a)}</li>`).join('\n          ')}
        </ul>
        <div class="mt-5 grid gap-2">
          <a href="/?park=${p.slug}#map" class="rounded-xl bg-meadow px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-meadow-dark">See on the full map</a>
          ${p.cityUrl ? `<a href="${esc(p.cityUrl)}" target="_blank" rel="noopener" class="rounded-xl border border-meadow/30 bg-white px-4 py-2.5 text-center text-sm font-semibold text-meadow-deep hover:bg-meadow-light">Official city page</a>` : ''}
        </div>
      </div>
    </aside>
  </div>

  <section class="mt-12">
    <h2 class="font-display text-2xl font-bold text-meadow-deep">Parks near ${esc(p.name)}</h2>
    <p class="mt-1.5 text-[14.5px] text-ink/75">The closest other parks, by straight-line distance.${area ? ` See all <a class="underline decoration-meadow/40 underline-offset-2 hover:text-meadow-deep" href="/areas/${area.slug}/">parks in ${esc(area.label)}</a>.` : ''}</p>
    <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      ${nearbyParks(p).map(({ p: n, mi }) => `<a href="/parks/${n.slug}/" class="card-lift rounded-2xl border border-meadow/15 bg-white p-4 shadow-card">
        <span class="flex items-start justify-between gap-2">
          <span class="font-display text-[16px] font-bold leading-snug text-meadow-deep">${esc(n.name)}</span>
          <span class="shrink-0 rounded-lg px-1.5 py-0.5 text-[12px] font-bold ${scoreClasses(n.score)}">${fmtScore(n.score)}</span>
        </span>
        <span class="mt-0.5 block text-[12.5px] text-bark">${mi.toFixed(1)} mi · ${esc(n.area)}</span>
        <span class="mt-1.5 block text-[13px] text-ink/80">${esc([n.playground ? 'Playground' : 'No playground', RESTROOM_SHORT[n.restroom], SHADE_SHORT[n.shade]].join(' · '))}</span>
      </a>`).join('\n      ')}
    </div>
  </section>
</main>
${footer}
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<script>
(function(){
  var lat=${p.lat}, lon=${p.lon};
  var m=L.map('locmap',{scrollWheelZoom:false,attributionControl:true}).setView([lat,lon],15);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',maxZoom:19}).addTo(m);
  L.circleMarker([lat,lon],{radius:9,color:'#fff',weight:2,fillColor:'#2E7D32',fillOpacity:.95}).addTo(m).bindPopup(${JSON.stringify(p.name)});
})();
</script>
</body>
</html>
`;
  const dir = path.join(pgDir, p.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

// ---------- guide pages (/splash-pads/, /restrooms/, /best-playgrounds/) ----------
const pageCtx = {
  ROOT, SITE, parks, esc, cap, header, footer, gaSnippet,
  RESTROOM_LABEL, SHADE_LABEL, scoreClasses, fmtScore,
  ORG, webPageSchema,
};
const guidePaths = buildGuides(pageCtx);
const areaPaths = buildAreas(pageCtx);
const generatedPaths = [...guidePaths, ...areaPaths];

// ---------- static park list for the homepage ----------
// Mirrors what render() draws client-side, minus the photos and interactive
// bits. Without this the homepage ships 99 characters of body text: every park
// name, amenity and link lives only in js/parks-data.js, invisible to any
// crawler that doesn't run JavaScript. This is also the only place the site
// links to all 94 park pages, so it carries the internal link graph.
const staticCards = [...parks]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map(p => {
    const facts = [
      p.playground ? 'Playground' : null,
      p.water ? p.water.type : null,
      p.pool ? 'Outdoor pool' : null,
      RESTROOM_LABEL[p.restroom],
      SHADE_LABEL[p.shade].split(' — ')[0],
    ].filter(Boolean);
    return `<article class="overflow-hidden rounded-2xl border border-meadow/15 bg-white p-4 shadow-card">`
      + `<h3 class="font-display text-[17px] font-bold leading-snug text-meadow-deep"><a href="/parks/${p.slug}/" class="hover:text-meadow">${esc(p.name)}</a></h3>`
      + `<p class="mt-0.5 text-[12.5px] text-bark">${p.acres} acres · ${esc(p.area)} · Parent Score ${fmtScore(p.score)}/10</p>`
      + `<p class="mt-1.5 text-[13px] text-ink/80">${esc(facts.join(' · '))}</p>`
      + (p.tip ? `<p class="mt-1.5 text-[13px] leading-relaxed text-ink/75">${esc(p.tip)}</p>` : '')
      + `</article>`;
  })
  .join('\n        ');

// ---------- cache-bust the data bundle + stamp analytics into index.html ----------
const idxPath = path.join(ROOT, 'index.html');
const stamp = Date.now().toString(36);
let idxHtml = fs.readFileSync(idxPath, 'utf8')
  .replace(/js\/parks-data\.js\?v=[a-z0-9]+/, `js/parks-data.js?v=${stamp}`)
  .replace(/<!-- ga:start -->[\s\S]*?<!-- ga:end -->/, `<!-- ga:start -->\n  ${gaSnippet}\n  <!-- ga:end -->`)
  .replace(/<!-- parks:start -->[\s\S]*?<!-- parks:end -->/, `<!-- parks:start -->\n        ${staticCards}\n        <!-- parks:end -->`)
  .replace(/<!-- guides:start -->[\s\S]*?<!-- guides:end -->/,
    '<!-- guides:start -->' + createKit(pageCtx).crossLinks('/', { id: 'guides' }) + '\n  <!-- guides:end -->')
  .replace(/<!-- footer-links:start -->[\s\S]*?<!-- footer-links:end -->/,
    '<!-- footer-links:start -->\n        <ul class="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 font-medium text-white">\n          '
    + FOOTER_LINKS.map(([href, label]) => `<li><a class="underline decoration-white/40 underline-offset-2 hover:decoration-white" href="${href}">${esc(label)}</a></li>`).join('\n          ')
    + '\n        </ul>\n        <!-- footer-links:end -->')
  .replace(/<!-- webpage:start -->[\s\S]*?<!-- webpage:end -->/,
    '<!-- webpage:start -->\n  <script type="application/ld+json">'
    + JSON.stringify(webPageSchema({
        url: SITE + '/',
        name: 'Boise Parks for Families — Playground, Splash Pad & Shade Finder',
        description: `Every Boise park rated for parents: ${parks.filter(p => p.playground).length} playgrounds, ${parks.filter(p => p.water).length} splash pads and fountains, ${parks.filter(p => p.restroom === 'year-round').length} year-round restrooms, shade ratings and an interactive map.`,
      }))
    + '</script>\n  <!-- webpage:end -->');
fs.writeFileSync(idxPath, idxHtml);

// ---------- honest lastmod ----------
// Every page used to be stamped with the build date, so a one-word fix in one
// guide told Google that all 94 park pages had changed. Google only honours
// lastmod when it's consistently accurate, so a sitemap that cries wolf on
// every deploy is worse than no lastmod at all.
//
// Instead: hash each generated page (with volatile bits — the cache-bust query
// and the date token itself — normalised out), compare against the hashes
// committed in data/page-hashes.json, and only move the date when the content
// genuinely changed. The build is deterministic apart from those two things, so
// Netlify rebuilding from a clean clone reproduces the same hashes and leaves
// the dates alone.
const HASH_FILE = path.join(ROOT, 'data/page-hashes.json');
const prevHashes = fs.existsSync(HASH_FILE) ? JSON.parse(fs.readFileSync(HASH_FILE, 'utf8')) : {};

const pageFiles = [
  ['/', 'index.html'],
  ...generatedPaths.map(pn => [pn, pn.replace(/^\/|\/$/g, '') + '/index.html']),
  ...parks.map(p => [`/parks/${p.slug}/`, `parks/${p.slug}/index.html`]),
];

const normalise = html => html
  .replace(/parks-data\.js\?v=[a-z0-9]+/g, 'parks-data.js')
  .replace(new RegExp(DATE_TOKEN, 'g'), '');

const nextHashes = {};
const lastmod = {};
for (const [urlPath, relFile] of pageFiles) {
  const file = path.join(ROOT, relFile);
  const html = fs.readFileSync(file, 'utf8');
  const hash = crypto.createHash('sha256').update(normalise(html)).digest('hex').slice(0, 16);
  const prev = prevHashes[urlPath];
  const date = prev && prev.hash === hash ? prev.lastmod : BUILD_DATE;
  nextHashes[urlPath] = { hash, lastmod: date };
  lastmod[urlPath] = date;
  fs.writeFileSync(file, html.split(DATE_TOKEN).join(date));
}
// Sorted keys so the committed file diffs cleanly.
fs.writeFileSync(HASH_FILE, JSON.stringify(
  Object.fromEntries(Object.keys(nextHashes).sort().map(k => [k, nextHashes[k]])), null, 2) + '\n');

// Compare against the stored hash, not the resolved date — on a day when the
// content did change, "date === today" is true for untouched pages too.
const changed = pageFiles.filter(([u]) => !prevHashes[u] || prevHashes[u].hash !== nextHashes[u].hash).length;

// ---------- sitemap ----------
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pageFiles.map(([u]) => `  <url><loc>${SITE}${u}</loc><lastmod>${lastmod[u]}</lastmod></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);

// ---------- llms.txt ----------
// Emerging convention (llmstxt.org): a plain-markdown map of the site for
// language models, so an answer engine can find the canonical page for a
// question without parsing 94 HTML documents. Generated, not hand-written, so
// the counts and the park index can't drift from the data.
const counts = {
  playgrounds: parks.filter(p => p.playground).length,
  water: parks.filter(p => p.water).length,
  pools: parks.filter(p => p.pool).length,
  yearRound: parks.filter(p => p.restroom === 'year-round').length,
  portable: parks.filter(p => p.restroom === 'seasonal+portable').length,
  leafy: parks.filter(p => p.shade === 'leafy').length,
  dog: parks.filter(p => p.dogPark).length,
  reservable: parks.filter(p => p.reservable).length,
  firstCome: parks.filter(p => p.shelter && !p.reservable).length,
  fishing: parks.filter(p => p.fishing).length,
  greenbelt: parks.filter(p => p.greenbelt).length,
  fields: parks.filter(p => p.fields.length).length,
};
const llms = `# boiseparks.com

> An independent, ad-free guide to all ${parks.length} City of Boise parks, written for parents of young
> children. Every park is documented with playground equipment and age range, restroom
> season (heated year-round vs. winterized), tree-cover shade rating, parking and a
> transparent 0-10 Parent Score. Facts come from City of Boise open GIS data and Boise
> Parks and Recreation pages; the site is not affiliated with the City of Boise.

Key figures across the ${parks.length} parks: ${counts.playgrounds} have playgrounds, ${counts.water} have splash pads,
fountains or misters, ${counts.pools} contain city outdoor pools, ${counts.yearRound} have heated restrooms open
year-round, ${counts.portable} keep a portable toilet once the building is winterized, and ${counts.leafy}
are rated leafy for dense mature tree cover.

Data last refreshed from city sources: July 2026. Most recent page update: ${Object.values(lastmod).sort().pop()}.

## Guides

- [Splash pads and fountains](${SITE}/splash-pads/): All ${counts.water} water features grouped by type (ground-jet splash pads, interactive fountains, misting stations) plus the ${counts.pools} outdoor pools, with hours, restroom status and shade for each.
- [Park restrooms open in winter](${SITE}/restrooms/): Which of the ${parks.length} parks have restrooms available in the cold months — ${counts.yearRound} heated year-round, ${counts.portable} with a winter portable toilet — grouped by area.
- [Playgrounds ranked](${SITE}/best-playgrounds/): All ${counts.playgrounds} playgrounds scored on equipment and age range, tree cover, open grass and restrooms, with shortlists for toddler equipment, shade and year-round restrooms.
- [Dog off-leash areas](${SITE}/dog-parks/): The ${counts.dog} city parks with a designated off-leash area for dogs.
- [Picnic shelters](${SITE}/picnic-shelters/): ${counts.reservable} parks with shelters reservable through Boise Parks and Recreation, plus ${counts.firstCome} more with first-come covered picnic areas.
- [Sport courts](${SITE}/sport-courts/): Tennis, basketball, pickleball, volleyball, horseshoe and bocce courts by sport, plus the ${counts.fields} parks with sports fields.
- [Fishing](${SITE}/fishing/): The ${counts.fishing} city parks with fishing access — ponds, lakes and river frontage.
- [Greenbelt access](${SITE}/greenbelt-parks/): The ${counts.greenbelt} parks connecting directly to the Boise River Greenbelt.

## Parks by area

${AREAS.map(a => {
  const n = parks.filter(p => p.area === a.key);
  const pg = n.filter(p => p.playground).length;
  const yr = n.filter(p => p.restroom === 'year-round').length;
  const q = (c, s, pl = s + 's') => `${c} ${c === 1 ? s : pl}`;
  return `- [Parks in ${a.label}](${SITE}/areas/${a.slug}/): All ${q(n.length, 'City of Boise park')} in ${a.label}, ranked, with ${q(pg, 'playground')} and ${q(yr, 'year-round restroom')}.`;
}).join('\n')}

## Reference

- [Homepage and interactive map](${SITE}/): Filterable map and list of all ${parks.length} parks, plus methodology for the shade rating and Parent Score.
- [Park data as JSON](${SITE}/data/parks.json): The underlying dataset — amenities, playground details, restroom season, tree counts and coordinates for every park.

## Parks

${[...parks].sort((a, b) => a.name.localeCompare(b.name)).map(p => {
  const bits = [
    p.playground ? 'playground' : 'no playground',
    p.water ? p.water.type.toLowerCase() : null,
    p.pool ? 'outdoor pool' : null,
    RESTROOM_LABEL[p.restroom].toLowerCase(),
    SHADE_LABEL[p.shade].split(' — ')[0].toLowerCase() + ' shade',
  ].filter(Boolean).join(', ');
  return `- [${p.name}](${SITE}/parks/${p.slug}/): ${p.acres} acres in ${p.area}; ${bits}; Parent Score ${fmtScore(p.score)}/10.`;
}).join('\n')}
`;
fs.writeFileSync(path.join(ROOT, 'llms.txt'), llms);

console.log(`✓ ${parks.length} park pages, ${guidePaths.length} guides, ${areaPaths.length} area pages, js/parks-data.js, llms.txt`);
console.log(`✓ sitemap.xml — ${changed} of ${pageFiles.length} pages changed content, rest kept their previous lastmod`);
