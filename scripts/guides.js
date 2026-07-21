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
const createKit = require('./page-kit');
const { AREAS } = require('./page-kit');

module.exports = function buildGuides(ctx) {
  const { parks, esc, RESTROOM_LABEL, SHADE_LABEL, scoreClasses, fmtScore } = ctx;
  const { writePage, parkTable } = createKit(ctx);

  const byScore = (a, b) => b.score - a.score || a.name.localeCompare(b.name);
  const AREA_ORDER = AREAS.map(a => a.key);
  const list = fn => parks.filter(fn).sort(byScore);

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
        key: 'pads', heading: 'Splash pads and spray pads',
        note: 'Ground-level jets kids run through. Bring towels and dry clothes.',
        list: water.filter(p => /splash|spray/i.test(p.water.type)).sort(byScore),
      },
      {
        key: 'fountains', heading: 'Interactive fountains',
        note: 'Fountains designed to be played in, in a larger park or plaza.',
        list: water.filter(p => /fountain/i.test(p.water.type)).sort(byScore),
      },
      {
        key: 'misters', heading: 'Misting stations',
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
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">${water.length} water features</span>
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">${pools.length} outdoor pools</span>
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">Free to use</span>
  </div>

  ${groups.filter(g => g.list.length).map(g => `
  <section id="${g.key}" class="mt-12">
    <h2 class="font-display text-2xl font-bold text-meadow-deep">${esc(g.heading)}</h2>
    <p class="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink/75">${esc(g.note)}</p>
    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      ${g.list.map(card).join('\n      ')}
    </div>
  </section>`).join('\n')}

  <section id="pools" class="mt-12">
    <h2 class="font-display text-2xl font-bold text-meadow-deep">Outdoor pools</h2>
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

    writePage({
      pathname: '/splash-pads/',
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
    return '/splash-pads/';
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
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">${yearRound.length} open year-round</span>
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">${portable.length} with a winter portable</span>
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">${seasonal.length} closed in winter</span>
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">${none.length} with none at all</span>
  </div>

  <section id="year-round" class="mt-12">
    <h2 class="font-display text-2xl font-bold text-meadow-deep">Open year-round (${yearRound.length} parks)</h2>
    <p class="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink/75">Heated restroom buildings that stay open through the winter. Grouped by area.</p>
    ${byArea.map(a => `
    <h3 class="mt-7 font-display text-[17px] font-bold text-meadow">${esc(a.area)} <span class="font-sans text-[13px] font-medium text-bark">· ${a.list.length} ${a.list.length === 1 ? 'park' : 'parks'}</span></h3>
    ${parkTable(a.list, { showRestroom: false, showArea: false })}`).join('\n')}
  </section>

  <section id="portable" class="mt-12">
    <h2 class="font-display text-2xl font-bold text-meadow-deep">Winterized, but with a portable toilet (${portable.length} parks)</h2>
    <p class="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink/75">The permanent building is closed for the season and the city leaves a portable toilet on site. Portable units have no running water or sink.</p>
    ${parkTable(portable, { showRestroom: false })}
  </section>

  <section id="seasonal" class="mt-12">
    <h2 class="font-display text-2xl font-bold text-meadow-deep">Seasonal only — nothing in winter (${seasonal.length} parks)</h2>
    <p class="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink/75">Open in the warm months, winterized after that, with no portable toilet as backup.</p>
    ${parkTable(seasonal, { showRestroom: false })}
  </section>

  <section id="none" class="mt-12">
    <h2 class="font-display text-2xl font-bold text-meadow-deep">No restrooms at all (${none.length} parks)</h2>
    <p class="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink/75">No restrooms at any time of year. Mostly neighborhood and mini parks.</p>
    <p class="mt-4 text-[14.5px] leading-relaxed text-ink/85">${none.map(p => `<a class="underline decoration-meadow/30 underline-offset-2 hover:text-meadow-deep" href="/parks/${p.slug}/">${esc(p.name)}</a>`).join(' · ')}</p>
  </section>`;

    writePage({
      pathname: '/restrooms/',
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
    return '/restrooms/';
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
      { label: 'Toddler equipment', why: 'Equipment for ages 2–5, with shade and a restroom.',
        list: pgs.filter(p => p.playground.toddler && p.restroom !== 'none' && p.shade !== 'full-sun').slice(0, 5) },
      { label: 'Most shade', why: 'Rated leafy — dense mature tree cover.',
        list: pgs.filter(p => p.shade === 'leafy').slice(0, 5) },
      { label: 'Year-round restroom', why: 'Heated restrooms, open in winter.',
        list: pgs.filter(p => p.restroom === 'year-round').slice(0, 5) },
      // Sorted by install year rather than score, so the trailing label shows the
      // year — a "· 7.3" next to a list ordered by date just looks broken.
      { label: 'Newest equipment', why: 'Most recent install year on record.',
        meta: p => p.playground.newestYear,
        list: pgs.filter(p => p.playground.newestYear >= 2019).sort((a, b) => b.playground.newestYear - a.playground.newestYear).slice(0, 5) },
      { label: 'Water in the same park', why: 'A splash pad, fountain or pool on site.',
        list: pgs.filter(p => p.water || p.pool).slice(0, 5) },
      { label: 'Zip lines and merry-go-rounds', why: 'Track rides, spinners and merry-go-rounds.',
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
            ${reasons(p).map(r => `<li class="flex gap-1.5"><span class="text-meadow">·</span> <span>${esc(r)}</span></li>`).join('\n            ')}
          </ul>
        </div>
      </div>
    </article>`;

    const body = `
  <div class="mt-6 flex flex-wrap gap-2 text-[13px] font-semibold">
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">${pgs.length} playgrounds ranked</span>
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">Scored from city data</span>
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card"><a class="underline" href="/#about">Methodology</a></span>
  </div>

  <section id="picks" class="mt-12">
    <h2 class="font-display text-2xl font-bold text-meadow-deep">Shortlists</h2>
    <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      ${picks.map(pk => `<div class="flex flex-col rounded-2xl border border-meadow/20 bg-white p-5 shadow-card">
        <div class="flex items-center gap-2.5">
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

    writePage({
      pathname: '/best-playgrounds/',
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
    return '/best-playgrounds/';
  }

  /* =====================================================================
   * 4. Single-list amenity guides
   * Same shape each time — a filtered, ranked table with an intro and an FAQ —
   * so they share one builder rather than three near-identical copies.
   * ===================================================================== */
  function simpleGuide({ pathname, filter, chips, title, metaDesc, h1, lede, notes, faq, extraCol }) {
    const matches = list(filter);
    const body = `
  <div class="mt-6 flex flex-wrap gap-2 text-[13px] font-semibold">
    ${chips(matches).map(c => `<span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">${c}</span>`).join('\n    ')}
  </div>

  <section class="mt-10">
    ${parkTable(matches, { extraCol })}
  </section>
${notes ? `
  <section class="mt-12">
    <h2 class="font-display text-2xl font-bold text-meadow-deep">Practical notes</h2>
    <ul class="mt-4 space-y-2.5 rounded-2xl border border-sun/40 bg-sun-light px-5 py-4 text-[14.5px] leading-relaxed">
      ${notes.map(n => `<li class="flex gap-2.5"><span class="text-sun">·</span> <span>${n}</span></li>`).join('\n      ')}
    </ul>
  </section>` : ''}`;
    writePage({ pathname, title, metaDesc, h1, lede, body, faq, itemList: matches });
    return pathname;
  }

  const dogParks = () => simpleGuide({
    pathname: '/dog-parks/',
    filter: p => p.dogPark,
    chips: m => [`${m.length} off-leash areas`, 'Free to use'],
    title: 'Boise Dog Parks — Every Off-Leash Area in a City Park | Boise Parks',
    metaDesc: 'Every Boise city park with a designated off-leash dog area, with location, restroom status and shade for each. Built from City of Boise park amenity data.',
    h1: 'Boise parks with off-leash dog areas',
    lede: `${parks.filter(p => p.dogPark).length} City of Boise parks have a designated off-leash area for dogs. They are listed below with the area of town, shade rating and restroom status. Dogs are expected to be leashed in the rest of the park system.`,
    notes: [
      'These are designated off-leash areas inside city parks, not separate fenced dog parks in every case. Fencing is not recorded in the city data, so check the park before letting a dog off leash.',
      'Shade ratings are for the whole park, not specifically the off-leash area.',
      'Rules, hours and any closures are on the <a class="underline hover:text-meadow-deep" href="https://www.cityofboise.org/departments/parks-and-recreation/" rel="noopener">Boise Parks and Recreation</a> site.',
    ],
    faq: [
      ['How many Boise parks have off-leash dog areas?',
       `${parks.filter(p => p.dogPark).length} City of Boise parks have a designated off-leash area. The full list, with the area of town for each, is above.`],
      ['Are Boise dog parks fenced?',
       'The city\'s open data does not record fencing for off-leash areas, so this site does not state it either way. Check the specific park before relying on it.'],
      ['Do Boise dog parks cost anything?',
       'No. Off-leash areas in city parks are free and open to the public.'],
      ['Can dogs go off leash in other Boise parks?',
       'No. Off-leash use is limited to the designated areas listed above; dogs are expected to be leashed elsewhere in the park system. Some parks, such as Esther Simplot Park, do not allow pets at all.'],
    ],
  });

  const fishing = () => simpleGuide({
    pathname: '/fishing/',
    filter: p => p.fishing,
    chips: m => [`${m.length} parks with fishing`],
    title: 'Fishing in Boise City Parks — Every Pond and Access Point | Boise Parks',
    metaDesc: 'Every Boise city park with fishing access, including ponds and river access, with restroom status, shade and parking for each. From City of Boise park data.',
    h1: 'Boise parks with fishing',
    lede: `${parks.filter(p => p.fishing).length} City of Boise parks have fishing access — a stocked pond, a lake, or river frontage. Restroom status and shade matter more than usual for a fishing trip with kids, so both are listed for each.`,
    notes: [
      'An Idaho fishing licence is required for anglers 14 and older. Licences, seasons and limits are handled by <a class="underline hover:text-meadow-deep" href="https://idfg.idaho.gov/" rel="noopener">Idaho Fish and Game</a>, not the city.',
      'Some of these ponds are part of the Fish and Game community pond stocking programme; stocking schedules are published by Idaho Fish and Game.',
    ],
    faq: [
      ['Which Boise parks have fishing ponds?',
       `${parks.filter(p => p.fishing).length} city parks have fishing access, listed above with the area of town, restroom status and shade for each.`],
      ['Do you need a fishing licence in Boise city parks?',
       'Yes. Idaho requires a fishing licence for anglers aged 14 and older, including in city park ponds. Licences are issued by Idaho Fish and Game.'],
      ['Are Boise park ponds stocked?',
       'Several are stocked through Idaho Fish and Game\'s community pond programme. Stocking schedules and species are published by Idaho Fish and Game rather than the city.'],
    ],
  });

  const greenbelt = () => simpleGuide({
    pathname: '/greenbelt-parks/',
    filter: p => p.greenbelt,
    chips: m => [`${m.length} parks on the Greenbelt`],
    title: 'Boise Greenbelt Parks — Every Park on the Path | Boise Parks',
    metaDesc: 'Every Boise city park with direct Boise River Greenbelt access, with parking, restroom status and shade — useful for planning a ride or walk with kids.',
    h1: 'Boise parks on the Greenbelt',
    lede: `${parks.filter(p => p.greenbelt).length} City of Boise parks connect directly to the Boise River Greenbelt. These are the practical stopping points on a ride or walk: the table shows which have restrooms, how much shade to expect and what the parking is like.`,
    notes: [
      'Parking type for each park is listed on its own page — several Greenbelt parks have dedicated lots that work as trailheads.',
      'Restroom status is the thing to check before a long ride with kids. Only some of these stay open through the winter.',
    ],
    faq: [
      ['Which Boise parks are on the Greenbelt?',
       `${parks.filter(p => p.greenbelt).length} city parks have direct Boise River Greenbelt access. They are listed above with restroom status and shade.`],
      ['Where can you park to get on the Boise Greenbelt?',
       'Several Greenbelt parks have dedicated parking lots that work as trailheads. Each park page lists its parking type — dedicated lot, on-street, or downtown metered.'],
      ['Which Greenbelt parks have restrooms open in winter?',
       'Restroom status is shown for each park above. Parks marked year-round have heated buildings that stay open through the winter; the full citywide list is in the park restrooms guide.'],
    ],
  });

  /* =====================================================================
   * 5. /picnic-shelters/
   * ===================================================================== */
  function picnicShelters() {
    const reservable = list(p => p.reservable);
    const firstCome = list(p => p.shelter && !p.reservable);
    const body = `
  <div class="mt-6 flex flex-wrap gap-2 text-[13px] font-semibold">
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">${reservable.length} reservable</span>
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">${firstCome.length} first-come</span>
  </div>

  <section id="reservable" class="mt-12">
    <h2 class="font-display text-2xl font-bold text-meadow-deep">Reservable shelters (${reservable.length} parks)</h2>
    <p class="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink/75">These take bookings through Boise Parks and Recreation. Summer weekends at the larger parks book out well in advance.</p>
    ${parkTable(reservable)}
  </section>

  <section id="first-come" class="mt-12">
    <h2 class="font-display text-2xl font-bold text-meadow-deep">First-come shelters (${firstCome.length} parks)</h2>
    <p class="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink/75">Covered picnic areas that are not reservable. Free to use, but nothing is held for you.</p>
    ${parkTable(firstCome)}
  </section>`;
    writePage({
      pathname: '/picnic-shelters/',
      title: 'Boise Park Picnic Shelters — Reservable and First-Come | Boise Parks',
      metaDesc: `Boise city parks with picnic shelters: ${reservable.length} reservable through Boise Parks and Recreation and ${firstCome.length} first-come, with restroom status and shade for each.`,
      h1: 'Boise parks with picnic shelters',
      lede: `Boise park shelters fall into two groups: ${reservable.length} parks take reservations through the city, and ${firstCome.length} more have covered picnic areas on a first-come basis. For a birthday party or a group, the reservable list is the one that matters — and restroom status is worth checking before you commit.`,
      itemList: reservable,
      faq: [
        ['Which Boise parks have reservable picnic shelters?',
         `${reservable.length} city parks take shelter reservations through Boise Parks and Recreation. They are listed above with restroom status and shade.`],
        ['How do you reserve a picnic shelter in Boise?',
         'Reservations are handled by Boise Parks and Recreation, not by this site. Their park pages carry the current booking process, fees and availability.'],
        ['Are Boise picnic shelters free?',
         `The ${firstCome.length} first-come shelters listed above are free to use. Reserved shelters are booked through the city and their fees are set by Boise Parks and Recreation.`],
        ['Which park is best for a kids\' birthday party?',
         'Look for a reservable shelter alongside a playground, a restroom and shade. The table above shows restroom status and shade for every reservable park, and the Parent Score reflects the playground.'],
      ],
      body,
    });
    return '/picnic-shelters/';
  }

  /* =====================================================================
   * 6. /sport-courts/
   * ===================================================================== */
  function sportCourts() {
    const SPORTS = [
      ['tennis', 'Tennis courts'],
      ['basketball', 'Basketball courts'],
      ['pickleball', 'Pickleball courts'],
      ['volleyball', 'Volleyball courts'],
      ['horseshoes', 'Horseshoe pits'],
      ['bocce', 'Bocce courts'],
    ].map(([key, heading]) => ({ key, heading, list: list(p => p.courts.includes(key)) }))
      .filter(s => s.list.length);

    const withFields = list(p => p.fields.length);
    const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);

    const body = `
  <div class="mt-6 flex flex-wrap gap-2 text-[13px] font-semibold">
    ${SPORTS.map(s => `<a href="#${s.key}" class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card hover:bg-meadow-light">${s.list.length} ${esc(s.heading.toLowerCase())}</a>`).join('\n    ')}
  </div>

  ${SPORTS.map(s => `
  <section id="${s.key}" class="mt-12">
    <h2 class="font-display text-2xl font-bold text-meadow-deep">${esc(s.heading)} (${s.list.length} parks)</h2>
    ${parkTable(s.list, { showShade: false })}
  </section>`).join('\n')}

  <section id="fields" class="mt-12">
    <h2 class="font-display text-2xl font-bold text-meadow-deep">Sports fields (${withFields.length} parks)</h2>
    <p class="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink/75">Grass fields for softball, baseball, soccer and multi-use play. Many are booked by leagues in season.</p>
    ${parkTable(withFields, { showShade: false, extraCol: { heading: 'Fields', value: p => p.fields.map(cap1).join(', ') } })}
  </section>`;

    writePage({
      pathname: '/sport-courts/',
      title: 'Boise Park Sport Courts — Tennis, Pickleball, Basketball | Boise Parks',
      metaDesc: `Every sport court in a Boise city park by type: ${SPORTS.map(s => `${s.list.length} ${s.heading.toLowerCase()}`).join(', ')}. Plus ${withFields.length} parks with sports fields.`,
      h1: 'Sport courts in Boise parks',
      lede: `Courts in City of Boise parks, listed by sport. ${SPORTS.map(s => `${s.list.length} parks have ${s.heading.toLowerCase()}`).join(', ')}. Courts are free and first-come unless a league or the city has them booked.`,
      itemList: SPORTS[0] ? SPORTS[0].list : [],
      faq: [
        ['Which Boise parks have pickleball courts?',
         (() => { const s = SPORTS.find(x => x.key === 'pickleball'); return s ? `${s.list.length} city parks have pickleball courts: ${s.list.map(p => p.name).join(', ')}.` : 'No pickleball courts are recorded in the city park data.'; })()],
        ['Which Boise parks have tennis courts?',
         (() => { const s = SPORTS.find(x => x.key === 'tennis'); return s ? `${s.list.length} city parks have tennis courts. The full list, with the area of town for each, is above.` : 'No tennis courts are recorded in the city park data.'; })()],
        ['Are Boise park courts free to use?',
         'Yes. Courts in city parks are free and generally first-come, first-served. Some are reserved for league play or city programming at certain times.'],
        ['Can you reserve a court in a Boise park?',
         'Court reservations and league bookings are handled by Boise Parks and Recreation. This site lists which parks have courts, not their booking calendars.'],
      ],
      body,
    });
    return '/sport-courts/';
  }

  return [
    splashPads(), restrooms(), bestPlaygrounds(),
    dogParks(), picnicShelters(), sportCourts(), fishing(), greenbelt(),
  ];
};
