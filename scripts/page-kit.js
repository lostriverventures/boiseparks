/*
 * Shared chrome for every generated landing page — the topic guides
 * (scripts/guides.js) and the by-area pages (scripts/areas.js).
 *
 * Holds the page shell (head, schema, breadcrumb, FAQ block, cross-links) and
 * the park table, so the two callers only describe what's on their page rather
 * than repeating 120 lines of <head> each.
 */
const fs = require('fs');
const path = require('path');

// Every generated landing page, in one place. Both modules cross-link from this
// list, so adding a page here wires it into the nav on all the others.
const GUIDE_LINKS = [
  ['/best-playgrounds/', 'Playgrounds ranked'],
  ['/splash-pads/', 'Splash pads & fountains'],
  ['/restrooms/', 'Park restrooms'],
  ['/dog-parks/', 'Dog off-leash areas'],
  ['/picnic-shelters/', 'Picnic shelters'],
  ['/sport-courts/', 'Sport courts'],
  ['/fishing/', 'Fishing spots'],
  ['/greenbelt-parks/', 'Greenbelt access'],
];

// The city's own area field is the sourced truth, so these are its five values.
// The labels are the ones already used in the homepage area filter — we don't
// invent neighbourhood names ("North End", "the Bench") that no source backs.
const AREAS = [
  { key: 'North River', slug: 'north-boise', label: 'North & NW Boise' },
  { key: 'Downtown', slug: 'downtown-boise', label: 'Downtown Boise' },
  { key: 'Central Bench', slug: 'central-bench', label: 'Central Bench' },
  { key: 'West Bench', slug: 'west-boise', label: 'West Boise' },
  { key: 'Southeast', slug: 'southeast-boise', label: 'Southeast Boise' },
];
const areaFor = key => AREAS.find(a => a.key === key);

module.exports = function createKit(ctx) {
  const { ROOT, SITE, esc, header, footer, gaSnippet, ORG, webPageSchema,
          scoreClasses, fmtScore } = ctx;

  const SHADE_SHORT = { 'leafy': '🌳 Leafy', 'some': '⛅ Some shade', 'full-sun': '☀️ Full sun' };
  const RESTROOM_SHORT = {
    'year-round': '✅ Year-round',
    'seasonal+portable': '🚻 Seasonal + portable',
    'seasonal': '⚠️ Seasonal only',
    'none': '— None',
  };

  const scorePill = p =>
    `<span class="inline-block rounded-lg px-2 py-0.5 text-[13px] font-bold ${scoreClasses(p.score)}">${fmtScore(p.score)}</span>`;

  // Compact scannable table — the format that survives being read on a phone in
  // a parking lot, and the one answer engines extract most reliably. Wrapped in
  // an overflow container so a wide table never scrolls the whole page sideways.
  function parkTable(list, { showRestroom = true, showShade = true, showArea = true, rank = false, extraCol = null } = {}) {
    if (!list.length) return '';
    const minW = 20 + (showArea ? 7 : 0) + (showShade ? 7 : 0) + (showRestroom ? 9 : 0) + (extraCol ? 9 : 0);
    return `<div class="mt-4 overflow-x-auto rounded-2xl border border-meadow/15 bg-white shadow-card">
    <table class="w-full min-w-[${minW}rem] text-left text-[14px]">
      <thead class="border-b border-meadow/15 text-[12.5px] uppercase tracking-wide text-bark">
        <tr>
          ${rank ? '<th class="px-3 py-2.5 font-semibold">#</th>' : ''}
          <th class="px-4 py-2.5 font-semibold">Park</th>
          ${extraCol ? `<th class="px-3 py-2.5 font-semibold">${esc(extraCol.heading)}</th>` : ''}
          ${showArea ? '<th class="px-3 py-2.5 font-semibold">Area</th>' : ''}
          ${showShade ? '<th class="px-3 py-2.5 font-semibold">Shade</th>' : ''}
          ${showRestroom ? '<th class="px-3 py-2.5 font-semibold">Restrooms</th>' : ''}
          <th class="px-3 py-2.5 text-right font-semibold">Score</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-meadow/10">
        ${list.map((p, i) => `<tr class="align-middle">
          ${rank ? `<td class="px-3 py-2.5 text-[13px] font-bold text-bark/70">${i + 1}</td>` : ''}
          <td class="px-4 py-2.5"><a class="font-semibold text-meadow-deep underline decoration-meadow/30 underline-offset-2 hover:text-meadow" href="/parks/${p.slug}/">${esc(p.name)}</a>${p.playground ? '' : ' <span class="text-[12px] text-bark">(no playground)</span>'}</td>
          ${extraCol ? `<td class="px-3 py-2.5 text-[13.5px] text-ink/85">${esc(extraCol.value(p))}</td>` : ''}
          ${showArea ? `<td class="px-3 py-2.5 text-[13.5px] text-bark">${esc(p.area)}</td>` : ''}
          ${showShade ? `<td class="px-3 py-2.5 text-[13.5px] whitespace-nowrap">${SHADE_SHORT[p.shade]}</td>` : ''}
          ${showRestroom ? `<td class="px-3 py-2.5 text-[13.5px] whitespace-nowrap">${RESTROOM_SHORT[p.restroom]}</td>` : ''}
          <td class="px-3 py-2.5 text-right">${scorePill(p)}</td>
        </tr>`).join('\n        ')}
      </tbody>
    </table>
  </div>`;
  }

  // Compact link rows rather than cards: with 13 generated pages, a card grid at
  // the foot of every one would outweigh the content above it.
  function crossLinks(currentPath, { id } = {}) {
    const row = items => items
      .filter(([href]) => href !== currentPath)
      .map(([href, label]) => `<a class="underline decoration-meadow/30 underline-offset-2 hover:text-meadow-deep" href="${href}">${esc(label)}</a>`)
      .join(' <span class="text-bark/40">·</span> ');
    return `
  <section${id ? ` id="${id}"` : ''} class="mt-14 rounded-2xl border border-meadow/15 bg-white px-5 py-5 shadow-card">
    <h2 class="font-display text-lg font-bold text-meadow-deep">Other guides</h2>
    <p class="mt-2 text-[14px] leading-relaxed text-ink/85">${row(GUIDE_LINKS)}</p>
    <h2 class="mt-5 font-display text-lg font-bold text-meadow-deep">Parks by area</h2>
    <p class="mt-2 text-[14px] leading-relaxed text-ink/85">${row(AREAS.map(a => [`/areas/${a.slug}/`, a.label]))}</p>
    <p class="mt-5 text-[14px]"><a class="font-semibold text-meadow-deep underline decoration-meadow/30 underline-offset-2 hover:text-meadow" href="/#map">All 94 parks on the map →</a></p>
  </section>`;
  }

  function writePage({ pathname, title, metaDesc, h1, lede, body, faq, itemList, breadcrumb }) {
    const url = SITE + pathname;
    const crumbs = [
      { name: 'Boise Parks', item: SITE + '/' },
      ...(breadcrumb || []),
      { name: h1, item: url },
    ];
    const schemas = [
      { '@context': 'https://schema.org', ...ORG },
      webPageSchema({ url, name: title, description: metaDesc, breadcrumbId: url + '#breadcrumb' }),
      {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        '@id': url + '#breadcrumb',
        itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item })),
      },
    ];
    if (itemList) {
      schemas.push({
        '@context': 'https://schema.org', '@type': 'ItemList', name: h1, url,
        numberOfItems: itemList.length,
        itemListElement: itemList.map((p, i) => ({
          '@type': 'ListItem', position: i + 1, name: p.name, url: `${SITE}/parks/${p.slug}/`,
        })),
      });
    }
    if (faq && faq.length) {
      schemas.push({
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: faq.map(([q, a]) => ({
          '@type': 'Question', name: q,
          acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') },
        })),
      });
    }

    const faqHtml = faq && faq.length ? `
  <section id="faq" class="mt-14">
    <h2 class="font-display text-2xl font-bold text-meadow-deep">Common questions</h2>
    <div class="mt-4 divide-y divide-meadow/10 rounded-2xl border border-meadow/15 bg-white px-5 shadow-card">
      ${faq.map(([q, a]) => `<div class="py-4">
        <h3 class="font-display text-[16.5px] font-bold text-meadow-deep">${esc(q)}</h3>
        <p class="mt-1.5 text-[14.5px] leading-relaxed text-ink/85">${a}</p>
      </div>`).join('\n      ')}
    </div>
  </section>` : '';

    const crumbHtml = crumbs.slice(0, -1)
      .map(c => `<a href="${c.item.replace(SITE, '') || '/'}" class="hover:text-meadow-deep">${esc(c.name)}</a>`)
      .join(' <span class="mx-1 text-bark/50">/</span> ');

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${gaSnippet}
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(metaDesc)}">
  <link rel="canonical" href="${url}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(metaDesc)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE}/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(metaDesc)}">
  <meta name="twitter:image" content="${SITE}/og-image.png">
  <meta name="geo.region" content="US-ID">
  <meta name="geo.placename" content="Boise">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
${schemas.map(s => `  <script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n')}
</head>
<body class="bg-cream font-sans text-ink">
${header}
<main class="mx-auto max-w-4xl px-4 pb-8 pt-8">
  <nav class="text-[13px] text-bark" aria-label="Breadcrumb">${crumbHtml} <span class="mx-1 text-bark/50">/</span> <span class="font-medium text-meadow-deep">${esc(h1)}</span></nav>
  <h1 class="mt-3 font-display text-3xl font-bold leading-tight text-meadow-deep sm:text-4xl">${h1}</h1>
  <div class="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-ink/80">${lede}</div>
${body}
${faqHtml}
${crossLinks(pathname)}
  <p class="mt-10 text-[13px] leading-relaxed text-bark">Built from <a class="underline hover:text-meadow-deep" href="https://opendata.cityofboise.org/" rel="noopener">City of Boise open data</a> and Boise Parks and Recreation pages. boiseparks.com is not affiliated with the City of Boise. Amenities change; check the park's official city page before relying on a specific one.</p>
</main>
${footer}
</body>
</html>
`;
    const dir = path.join(ROOT, pathname.replace(/^\/|\/$/g, ''));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    return pathname;
  }

  return { writePage, parkTable, scorePill, crossLinks, SHADE_SHORT, RESTROOM_SHORT };
};

module.exports.GUIDE_LINKS = GUIDE_LINKS;
module.exports.AREAS = AREAS;
module.exports.areaFor = areaFor;
