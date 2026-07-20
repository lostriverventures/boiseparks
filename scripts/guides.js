/*
 * Guide pages for boiseparks.com — the shareable "answer" pages:
 *   /splash-pads/       every water feature, grouped by what it actually is
 *   /restrooms/         which parks have a restroom open in winter
 *   /best-playgrounds/  all 57 playgrounds ranked by Parent Score
 *
 * These exist so a single URL answers a question a parent just asked, instead
 * of dropping them on the homepage to re-filter it themselves. Everything here
 * is derived from data/parks.json at build time — no hand-maintained lists, so
 * a data refresh updates the guides automatically.
 *
 * Called from scripts/gen.js, which owns the shared chrome and helpers.
 */
const fs = require('fs');
const path = require('path');

module.exports = function buildGuides(ctx) {
  const { ROOT, SITE, parks, esc, header, footer, gaSnippet,
          RESTROOM_LABEL, SHADE_LABEL, scoreClasses, fmtScore,
          ORG, webPageSchema } = ctx;

  const byScore = (a, b) => b.score - a.score || a.name.localeCompare(b.name);
  const AREA_ORDER = ['North River', 'Downtown', 'Central Bench', 'West Bench', 'Southeast'];

  // Guides cross-link to each other from every page — internal links are most of
  // the SEO value here, and a parent reading one list usually wants a second.
  const GUIDES = [
    { slug: 'splash-pads', icon: '💦', label: 'Splash pads and fountains', blurb: 'Locations, hours and restrooms for all 8 water features.' },
    { slug: 'restrooms', icon: '🚻', label: 'Park restrooms', blurb: 'Which restrooms stay open through the winter.' },
    { slug: 'best-playgrounds', icon: '🛝', label: 'Playgrounds ranked', blurb: 'All 57 playgrounds, scored on equipment, shade and restrooms.' },
  ];

  function relatedGuides(currentSlug) {
    const others = GUIDES.filter(g => g.slug !== currentSlug);
    return `
  <section class="mt-14">
    <h2 class="font-display text-xl font-bold text-meadow-deep">Other guides</h2>
    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      ${others.map(g => `<a href="/${g.slug}/" class="card-lift flex items-start gap-3 rounded-2xl border border-meadow/15 bg-white p-4 shadow-card">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-meadow-light text-xl">${g.icon}</span>
        <span><span class="block font-display text-[16px] font-bold text-meadow-deep">${esc(g.label)}</span><span class="mt-0.5 block text-[13.5px] text-bark">${esc(g.blurb)}</span></span>
      </a>`).join('\n      ')}
      <a href="/#map" class="card-lift flex items-start gap-3 rounded-2xl border border-meadow/15 bg-white p-4 shadow-card">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-light text-xl">🗺️</span>
        <span><span class="block font-display text-[16px] font-bold text-meadow-deep">The full map</span><span class="mt-0.5 block text-[13.5px] text-bark">All 94 parks, with filters for amenities and area.</span></span>
      </a>
    </div>
  </section>`;
  }

  // ---------- shared page shell ----------
  function writeGuide({ slug, title, metaDesc, h1, lede, body, faq, itemList }) {
    const url = `${SITE}/${slug}/`;
    const schemas = [
      { '@context': 'https://schema.org', ...ORG },
      webPageSchema({ url, name: title, description: metaDesc, breadcrumbId: url + '#breadcrumb' }),
      {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        '@id': url + '#breadcrumb',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Boise Parks', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: h1, item: url },
        ],
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
  <nav class="text-[13px] text-bark" aria-label="Breadcrumb"><a href="/" class="hover:text-meadow-deep">Boise Parks</a> <span class="mx-1 text-bark/50">/</span> <span class="font-medium text-meadow-deep">${esc(h1)}</span></nav>
  <h1 class="mt-3 font-display text-3xl font-bold leading-tight text-meadow-deep sm:text-4xl">${h1}</h1>
  <div class="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-ink/80">${lede}</div>
${body}
${faqHtml}
${relatedGuides(slug)}
  <p class="mt-10 text-[13px] leading-relaxed text-bark">Built from <a class="underline hover:text-meadow-deep" href="https://opendata.cityofboise.org/" rel="noopener">City of Boise open data</a> and Boise Parks and Recreation pages. boiseparks.com is not affiliated with the City of Boise. Amenities change; check the park's official city page before relying on a specific one.</p>
</main>
${footer}
</body>
</html>
`;
    const dir = path.join(ROOT, slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
  }

  // ---------- shared bits ----------
  const scorePill = p =>
    `<span class="inline-block rounded-lg px-2 py-0.5 text-[13px] font-bold ${scoreClasses(p.score)}">${fmtScore(p.score)}</span>`;

  const SHADE_SHORT = { leafy: '🌳 Leafy', some: '⛅ Some shade', 'full-sun': '☀️ Full sun' };
  const RESTROOM_SHORT = {
    'year-round': '✅ Year-round',
    'seasonal+portable': '🚻 Seasonal + portable',
    'seasonal': '⚠️ Seasonal only',
    'none': '— None',
  };

  // Compact scannable table — the format that actually survives being read on a
  // phone in a parking lot. Wrapped in an overflow container so it never forces
  // the page to scroll sideways.
  function parkTable(list, { showRestroom = true, showShade = true, showArea = true, rank = false } = {}) {
    if (!list.length) return '';
    return `<div class="mt-4 overflow-x-auto rounded-2xl border border-meadow/15 bg-white shadow-card">
    <table class="w-full min-w-[${showArea ? 34 : 26}rem] text-left text-[14px]">
      <thead class="border-b border-meadow/15 text-[12.5px] uppercase tracking-wide text-bark">
        <tr>
          ${rank ? '<th class="px-3 py-2.5 font-semibold">#</th>' : ''}
          <th class="px-4 py-2.5 font-semibold">Park</th>
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
          ${showArea ? `<td class="px-3 py-2.5 text-[13.5px] text-bark">${esc(p.area)}</td>` : ''}
          ${showShade ? `<td class="px-3 py-2.5 text-[13.5px] whitespace-nowrap">${SHADE_SHORT[p.shade]}</td>` : ''}
          ${showRestroom ? `<td class="px-3 py-2.5 text-[13.5px] whitespace-nowrap">${RESTROOM_SHORT[p.restroom]}</td>` : ''}
          <td class="px-3 py-2.5 text-right">${scorePill(p)}</td>
        </tr>`).join('\n        ')}
      </tbody>
    </table>
  </div>`;
  }

  /* =====================================================================
   * 1. /splash-pads/
   * ===================================================================== */
  function splashPads() {
    const water = parks.filter(p => p.water);
    const pools = parks.filter(p => p.pool);
    // The city lumps very different things under "water feature". A parent
    // driving across town for a splash pad does not want to arrive at misters,
    // so the page groups by what you'll actually find.
    const groups = [
      {
        key: 'pads', icon: '💦', heading: 'Splash pads and spray pads',
        note: 'Ground-level jets kids run through. Bring towels and dry clothes.',
        list: water.filter(p => /splash|spray/i.test(p.water.type)).sort(byScore),
      },
      {
        key: 'fountains', icon: '⛲', heading: 'Interactive fountains',
        note: 'Fountains designed to be played in, in a larger park or plaza.',
        list: water.filter(p => /fountain/i.test(p.water.type)).sort(byScore),
      },
      {
        key: 'misters', icon: '🌫️', heading: 'Misting stations',
        note: 'Overhead misters that put out a fine spray. No jets, and kids will not get soaked.',
        list: water.filter(p => /mister/i.test(p.water.type)).sort(byScore),
      },
    ];

    const card = p => `<div class="rounded-2xl border border-sky/20 bg-white p-5 shadow-card">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="font-display text-[19px] font-bold text-meadow-deep"><a class="hover:text-meadow" href="/parks/${p.slug}/">${esc(p.name)}</a></h3>
          <p class="mt-0.5 text-[13px] text-bark">${esc(p.area)} · ${esc(p.address)}</p>
        </div>
        <span class="shrink-0 rounded-xl px-2.5 py-1 text-[15px] font-bold ${scoreClasses(p.score)}">${fmtScore(p.score)}<span class="text-[11px] font-semibold opacity-70">/10</span></span>
      </div>
      <dl class="mt-3.5 space-y-1.5 text-[14px]">
        <div class="flex gap-2"><dt class="w-24 shrink-0 font-semibold text-sky">Water</dt><dd>${esc(p.water.type)}</dd></div>
        <div class="flex gap-2"><dt class="w-24 shrink-0 font-semibold text-sky">Hours</dt><dd>${esc(p.water.hours)}</dd></div>
        <div class="flex gap-2"><dt class="w-24 shrink-0 font-semibold text-sky">Restrooms</dt><dd>${esc(RESTROOM_LABEL[p.restroom])}</dd></div>
        <div class="flex gap-2"><dt class="w-24 shrink-0 font-semibold text-sky">Shade</dt><dd>${esc(SHADE_LABEL[p.shade])}</dd></div>
        <div class="flex gap-2"><dt class="w-24 shrink-0 font-semibold text-sky">Playground</dt><dd>${p.playground ? (p.playground.toddler && p.playground.bigKid ? 'Yes — toddler and big-kid equipment' : p.playground.toddler ? 'Yes — toddler equipment (2–5)' : 'Yes') : 'No playground at this park'}</dd></div>
      </dl>
      <a href="/parks/${p.slug}/" class="mt-4 inline-block rounded-lg bg-sky-light px-3 py-1.5 text-[13px] font-semibold text-sky hover:bg-sky/15">Full details →</a>
    </div>`;

    const body = `
  <div class="mt-6 flex flex-wrap gap-2 text-[13px] font-semibold">
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">💦 ${water.length} water features</span>
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">🏊 ${pools.length} outdoor pools</span>
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">🆓 Free to use</span>
  </div>

  ${groups.filter(g => g.list.length).map(g => `
  <section id="${g.key}" class="mt-12">
    <h2 class="font-display text-2xl font-bold text-meadow-deep"><span aria-hidden="true">${g.icon}</span> ${esc(g.heading)}</h2>
    <p class="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink/75">${esc(g.note)}</p>
    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      ${g.list.map(card).join('\n      ')}
    </div>
  </section>`).join('\n')}

  <section id="pools" class="mt-12">
    <h2 class="font-display text-2xl font-bold text-meadow-deep"><span aria-hidden="true">🏊</span> Outdoor pools</h2>
    <p class="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink/75">City-run swimming pools, not splash pads. They have a separate season, hours and admission, listed on the city page for each.</p>
    ${parkTable(pools.sort(byScore))}
  </section>

  <section class="mt-12">
    <h2 class="font-display text-2xl font-bold text-meadow-deep">Practical notes</h2>
    <ul class="mt-4 space-y-2.5 rounded-2xl border border-sun/40 bg-sun-light px-5 py-4 text-[14.5px] leading-relaxed">
      <li class="flex gap-2.5"><span class="text-sun">·</span> <span>Restroom status varies by park and is listed with each one above. Some of these parks have no restroom.</span></li>
      <li class="flex gap-2.5"><span class="text-sun">·</span> <span>Concrete pads get hot in direct sun. Water shoes help.</span></li>
      <li class="flex gap-2.5"><span class="text-sun">·</span> <span>Shade also varies. Several of these parks are rated full sun.</span></li>
      <li class="flex gap-2.5"><span class="text-sun">·</span> <span>Water features are sometimes shut off for repairs. The park's city page lists current alerts.</span></li>
    </ul>
  </section>`;

    writeGuide({
      slug: 'splash-pads',
      title: 'Boise Splash Pads, Fountains and Misters — Locations and Hours | Boise Parks',
      metaDesc: `All ${water.length} splash pads, fountains and misting stations in Boise parks, plus ${pools.length} outdoor pools. Hours, restroom status, shade and playgrounds for each. Free, Memorial Day through Labor Day.`,
      h1: 'Boise splash pads and fountains',
      lede: `Boise has ${water.length} water features in city parks, plus ${pools.length} outdoor pools. The water features are free and run <strong>Memorial Day through Labor Day</strong>. They are not all the same thing: some are ground-jet splash pads, some are interactive fountains, and some are misting stations. Each listing below gives the type, hours, restroom status, shade rating and whether there is a playground.`,
      itemList: [...water].sort(byScore),
      faq: [
        ['When do Boise splash pads open and close?',
         'Splash pads, spray pads and interactive fountains run from Memorial Day through Labor Day. Daily hours vary by type: splash and spray pads generally run 10 a.m. to 8 p.m., fountains and misters sunrise to sunset. Each park above lists its own hours.'],
        ['Are Boise splash pads free?',
         'Yes. The splash pads, spray pads, misters and interactive fountains in city parks are free and open to the public. City outdoor pools are separate and charge admission.'],
        ['Which Boise splash pads have restrooms?',
         'Restroom status is listed with each park above. Parks marked year-round have heated buildings that stay open all year; seasonal ones close in the winter, some with a portable toilet as backup. A few of these parks have no restroom at all.'],
        ['What is the difference between a splash pad and a misting station?',
         'A splash pad or spray pad has ground-level jets that kids run through and get soaked in. A misting station puts out a fine overhead spray that cools the air. Three of Boise\'s eight water features are misting stations.'],
        ['Which splash pad works best with a toddler?',
         'Check each listing for toddler playground equipment, shade rating and restroom status. The Parent Score shown with each park is calculated from those factors.'],
      ],
      body,
    });
    return 'splash-pads';
  }

  /* =====================================================================
   * 2. /restrooms/
   * ===================================================================== */
  function restrooms() {
    const g = k => parks.filter(p => p.restroom === k).sort(byScore);
    const yearRound = g('year-round');
    const portable = g('seasonal+portable');
    const seasonal = g('seasonal');
    const none = g('none');

    // Year-round is the whole point of the page, so it gets the richest
    // treatment: grouped by side of town, because "is there one near me" is the
    // actual question behind the search.
    const byArea = AREA_ORDER
      .map(area => ({ area, list: yearRound.filter(p => p.area === area) }))
      .filter(a => a.list.length);

    const body = `
  <div class="mt-6 flex flex-wrap gap-2 text-[13px] font-semibold">
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">✅ ${yearRound.length} open year-round</span>
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">🚻 ${portable.length} with a winter portable</span>
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">⚠️ ${seasonal.length} closed in winter</span>
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">— ${none.length} with none at all</span>
  </div>

  <section id="year-round" class="mt-12">
    <h2 class="font-display text-2xl font-bold text-meadow-deep"><span aria-hidden="true">✅</span> Open year-round (${yearRound.length} parks)</h2>
    <p class="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink/75">Heated restroom buildings that stay open through the winter. Grouped by area.</p>
    ${byArea.map(a => `
    <h3 class="mt-7 font-display text-[17px] font-bold text-meadow">${esc(a.area)} <span class="font-sans text-[13px] font-medium text-bark">· ${a.list.length} ${a.list.length === 1 ? 'park' : 'parks'}</span></h3>
    ${parkTable(a.list, { showRestroom: false, showArea: false })}`).join('\n')}
  </section>

  <section id="portable" class="mt-12">
    <h2 class="font-display text-2xl font-bold text-meadow-deep"><span aria-hidden="true">🚻</span> Winterized, but with a portable toilet (${portable.length} parks)</h2>
    <p class="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink/75">The permanent building is closed for the season and the city leaves a portable toilet on site. Portable units have no running water or sink.</p>
    ${parkTable(portable, { showRestroom: false })}
  </section>

  <section id="seasonal" class="mt-12">
    <h2 class="font-display text-2xl font-bold text-meadow-deep"><span aria-hidden="true">⚠️</span> Seasonal only — nothing in winter (${seasonal.length} parks)</h2>
    <p class="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink/75">Open in the warm months, winterized after that, with no portable toilet as backup.</p>
    ${parkTable(seasonal, { showRestroom: false })}
  </section>

  <section id="none" class="mt-12">
    <h2 class="font-display text-2xl font-bold text-meadow-deep">No restrooms at all (${none.length} parks)</h2>
    <p class="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink/75">No restrooms at any time of year. Mostly neighborhood and mini parks.</p>
    <p class="mt-4 text-[14.5px] leading-relaxed text-ink/85">${none.map(p => `<a class="underline decoration-meadow/30 underline-offset-2 hover:text-meadow-deep" href="/parks/${p.slug}/">${esc(p.name)}</a>`).join(' · ')}</p>
  </section>`;

    writeGuide({
      slug: 'restrooms',
      title: 'Boise Park Restrooms — Which Are Open in Winter | Boise Parks',
      metaDesc: `Restroom status for all 94 Boise parks: ${yearRound.length} heated and open year-round, ${portable.length} with a portable toilet in winter, ${seasonal.length} seasonal only, ${none.length} with none. Grouped by area.`,
      h1: 'Boise parks with restrooms open in winter',
      lede: `Boise winterizes most park restrooms in the cold months. <strong>${yearRound.length} of the city's 94 parks</strong> have heated restrooms that stay open year-round. Another ${portable.length} keep a portable toilet on site once the building closes, ${seasonal.length} close entirely, and ${none.length} parks have no restroom at any time of year. Full lists below.`,
      itemList: yearRound,
      faq: [
        ['Which Boise parks have restrooms open in the winter?',
         `${yearRound.length} parks have heated restroom buildings that stay open year-round. Another ${portable.length} have their permanent restrooms winterized but keep a portable toilet on site. Both lists are above, grouped by area.`],
        ['Why are so many park restrooms closed in winter?',
         'Most park restroom buildings are unheated, so the city winterizes them by shutting off and draining the water lines to keep the plumbing from freezing. Only heated buildings can stay open through the cold months.'],
        ['Do the winter portable toilets have running water?',
         'No. A portable toilet is a standalone unit with no sink or running water.'],
        ['How do I find the closest park restroom?',
         'The year-round list above is grouped by area: North River, Downtown, Central Bench, West Bench and Southeast. The map on the homepage has a restroom filter and can sort parks by distance from your location.'],
        ['Is this restroom information official?',
         'It follows the City of Boise\'s published park restroom list, which names the heated year-round buildings and the winterized ones. Status can change; for a specific park on a specific day, check that park\'s city page.'],
      ],
      body,
    });
    return 'restrooms';
  }

  /* =====================================================================
   * 3. /best-playgrounds/
   * ===================================================================== */
  function bestPlaygrounds() {
    const pgs = parks.filter(p => p.playground).sort(byScore);
    const TOP_N = 12;
    const top = pgs.slice(0, TOP_N);

    // "Best for X" shortcuts — a lot of parents arrive with one specific
    // constraint (a napping-schedule-sized window, a toddler, 100° heat) and
    // just want the one answer, not a ranking.
    const picks = [
      { icon: '🧸', label: 'Toddler equipment', why: 'Equipment for ages 2–5, with shade and a restroom.',
        list: pgs.filter(p => p.playground.toddler && p.restroom !== 'none' && p.shade !== 'full-sun').slice(0, 5) },
      { icon: '🌳', label: 'Most shade', why: 'Rated leafy — dense mature tree cover.',
        list: pgs.filter(p => p.shade === 'leafy').slice(0, 5) },
      { icon: '🚻', label: 'Year-round restroom', why: 'Heated restrooms, open in winter.',
        list: pgs.filter(p => p.restroom === 'year-round').slice(0, 5) },
      // Sorted by install year rather than score, so the trailing label shows the
      // year — a "· 7.3" next to a list ordered by date just looks broken.
      { icon: '✨', label: 'Newest equipment', why: 'Most recent install year on record.',
        meta: p => p.playground.newestYear,
        list: pgs.filter(p => p.playground.newestYear >= 2019).sort((a, b) => b.playground.newestYear - a.playground.newestYear).slice(0, 5) },
      { icon: '💦', label: 'Water in the same park', why: 'A splash pad, fountain or pool on site.',
        list: pgs.filter(p => p.water || p.pool).slice(0, 5) },
      { icon: '🛞', label: 'Zip lines and merry-go-rounds', why: 'Track rides, spinners and merry-go-rounds.',
        list: pgs.filter(p => p.playground.features.some(f => /zipline|track ride|merry|spinner/i.test(f))).slice(0, 5) },
    ].filter(p => p.list.length);

    const reasons = p => {
      const r = [];
      const pg = p.playground;
      if (pg.toddler && pg.bigKid) r.push('Equipment for toddlers and big kids');
      else if (pg.toddler) r.push('Toddler equipment (2–5)');
      else if (pg.bigKid) r.push('Built for big kids (5–12)');
      if (pg.features.length) r.push(pg.features.join(', ').replace(/^./, c => c.toUpperCase()));
      if (pg.rubberSurface) r.push('Bonded rubber surfacing — stroller and wheelchair friendly');
      else if (pg.ada) r.push('ADA-accessible equipment');
      if (pg.newestYear) r.push(`Newest structure installed ${pg.newestYear}`);
      r.push(SHADE_LABEL[p.shade]);
      r.push(RESTROOM_LABEL[p.restroom]);
      if (p.water) r.push(`${p.water.type} on site`);
      else if (p.pool) r.push('Outdoor pool on site');
      return r;
    };

    const rankedCard = (p, i) => `<article class="rounded-2xl border border-meadow/15 bg-white p-5 shadow-card">
      <div class="flex items-start gap-4">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-meadow-light font-display text-[17px] font-bold text-meadow-deep">${i + 1}</span>
        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="font-display text-[20px] font-bold leading-tight text-meadow-deep"><a class="hover:text-meadow" href="/parks/${p.slug}/">${esc(p.name)}</a></h3>
              <p class="mt-0.5 text-[13px] text-bark">${esc(p.area)} · ${esc(p.address)}</p>
            </div>
            <span class="shrink-0 rounded-xl px-2.5 py-1 text-[15px] font-bold ${scoreClasses(p.score)}">${fmtScore(p.score)}<span class="text-[11px] font-semibold opacity-70">/10</span></span>
          </div>
          ${p.tip ? `<p class="mt-3 text-[14.5px] leading-relaxed text-ink/85">${esc(p.tip)}</p>` : ''}
          <ul class="mt-3 grid gap-x-5 gap-y-1 text-[13.5px] text-ink/80 sm:grid-cols-2">
            ${reasons(p).map(r => `<li class="flex gap-1.5"><span class="text-meadow">✓</span> <span>${esc(r)}</span></li>`).join('\n            ')}
          </ul>
        </div>
      </div>
    </article>`;

    const body = `
  <div class="mt-6 flex flex-wrap gap-2 text-[13px] font-semibold">
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">🛝 ${pgs.length} playgrounds ranked</span>
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">📊 Scored from city data</span>
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">🔍 <a class="underline" href="/#about">Methodology</a></span>
  </div>

  <section id="picks" class="mt-12">
    <h2 class="font-display text-2xl font-bold text-meadow-deep">Shortlists</h2>
    <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      ${picks.map(pk => `<div class="flex flex-col rounded-2xl border border-meadow/20 bg-white p-5 shadow-card">
        <div class="flex items-center gap-2.5">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-meadow-light text-xl">${pk.icon}</span>
          <div><h3 class="font-display text-[16px] font-bold leading-tight text-meadow-deep">${esc(pk.label)}</h3><p class="text-[11.5px] text-bark">${esc(pk.why)}</p></div>
        </div>
        <ol class="mt-3.5 flex-1 space-y-1.5 text-[14px] font-medium">
          ${pk.list.map(p => `<li><a class="hover:text-meadow" href="/parks/${p.slug}/">${esc(p.name)}</a> <span class="font-normal text-bark/60">· ${esc(pk.meta ? pk.meta(p) : fmtScore(p.score))}</span></li>`).join('\n          ')}
        </ol>
      </div>`).join('\n      ')}
    </div>
  </section>

  <section id="ranked" class="mt-14">
    <h2 class="font-display text-2xl font-bold text-meadow-deep">Top ${TOP_N}</h2>
    <p class="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink/75">Ranked by Parent Score. Each park page shows the full point breakdown.</p>
    <div class="mt-5 space-y-4">
      ${top.map(rankedCard).join('\n      ')}
    </div>
  </section>

  <section id="all" class="mt-14">
    <h2 class="font-display text-2xl font-bold text-meadow-deep">All ${pgs.length} playgrounds</h2>
    <p class="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink/75">Every Boise park with playground equipment. A low score usually means full sun, no restroom, or both.</p>
    ${parkTable(pgs, { rank: true })}
  </section>`;

    writeGuide({
      slug: 'best-playgrounds',
      title: 'Boise Playgrounds Ranked — All 57, Scored for Parents | Boise Parks',
      metaDesc: `All 57 Boise parks with playground equipment, ranked by equipment and age range, tree cover, restrooms and open grass. Includes shortlists for toddlers, shade and year-round restrooms.`,
      h1: 'Boise playgrounds, ranked',
      lede: `All ${pgs.length} Boise parks with playground equipment, ranked by Parent Score. The score is a 0–10 measure built from the city's playground and tree inventories: it weighs the equipment and the ages it's built for, tree cover, open grass and restrooms. Shortlists for common requirements are below, then the top ${TOP_N} in detail, then the full ranked list.`,
      itemList: top,
      faq: [
        ['What is the highest-rated playground in Boise?',
         `${top[0].name} in ${top[0].area}, at ${fmtScore(top[0].score)} out of 10. It combines strong playground equipment with tree cover, open grass and a year-round restroom. The top ${TOP_N} are listed above with the details for each.`],
        ['How are these playgrounds ranked?',
         'Each park gets a 0–10 Parent Score computed from official city data: the playground (up to 3.5 points, based on age range, accessible surfacing and install year), tree cover (2.5), open grass (1.5) and restrooms (1.5). Water features, shelters and trails are bonuses capped at +1, so a park is not marked down for lacking them. Parking is listed but not scored.'],
        ['Which Boise playgrounds have equipment for toddlers?',
         'The shortlist above covers parks with equipment for ages 2–5 that also have shade and a restroom. Each park page states whether the equipment is built for toddlers, ages 5–12, or both.'],
        ['Are any Boise playgrounds fenced?',
         'The city\'s open data does not record playground fencing, so this site does not list it. Park size and layout are on each park page.'],
        ['Which Boise playgrounds have shade?',
         'Shade ratings are calculated from the city tree inventory as trunk diameter per acre. Parks rated leafy have dense mature canopy; those are listed in the shade shortlist above.'],
      ],
      body,
    });
    return 'best-playgrounds';
  }

  return [splashPads(), restrooms(), bestPlaygrounds()];
};
