/*
 * By-area landing pages for boiseparks.com — /areas/<slug>/.
 *
 * These add the hub layer the site was missing: before this the homepage linked
 * straight to 94 leaf pages with nothing in between, and "parks in west Boise"
 * had no page to rank. Each park page links up to its area page, and each area
 * page links down to every park in it.
 *
 * The five areas are the City of Boise's own area field — the sourced truth.
 * The labels are the ones already used in the homepage area filter. We
 * deliberately don't invent finer neighbourhood names ("the North End", "the
 * Bench"): no source in the data backs a park-by-park assignment to those, and
 * every claim on this site has to trace to one.
 */
const createKit = require('./page-kit');
const { AREAS } = require('./page-kit');

module.exports = function buildAreas(ctx) {
  const { parks, esc, fmtScore } = ctx;
  const { writePage, parkTable } = createKit(ctx);
  const byScore = (a, b) => b.score - a.score || a.name.localeCompare(b.name);

  // Downtown has 3 parks and no playgrounds, so these pages have to read
  // correctly at counts of 0 and 1, not just at 46.
  const qty = (c, singular, plural = singular + 's') => `${c} ${c === 1 ? singular : plural}`;
  const have = c => (c === 1 ? 'has' : 'have');

  return AREAS.map(area => {
    const inArea = parks.filter(p => p.area === area.key).sort(byScore);
    const withPlayground = inArea.filter(p => p.playground);
    const yearRound = inArea.filter(p => p.restroom === 'year-round');
    const water = inArea.filter(p => p.water || p.pool);
    const leafy = inArea.filter(p => p.shade === 'leafy');
    const acres = Math.round(inArea.reduce((a, p) => a + p.acres, 0));

    // Only claim a "best for kids" shortlist where there's actually a choice to
    // make — Downtown has three parks and one playground, so a top-five there
    // would be padding.
    const picks = withPlayground.slice(0, 5);

    const body = `
  <div class="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">${qty(inArea.length, 'park')}</span>
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">${qty(withPlayground.length, 'playground')}</span>
    <span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">${qty(yearRound.length, 'year-round restroom')}</span>
    ${water.length ? `<span class="rounded-full bg-white px-3 py-1.5 text-meadow-deep shadow-card">${water.length} with water play</span>` : ''}
  </div>
${picks.length >= 3 ? `
  <section class="mt-12">
    <h2 class="font-display text-2xl font-bold text-meadow-deep">Best with kids in ${esc(area.label)}</h2>
    <p class="mt-1.5 max-w-2xl text-base leading-relaxed text-ink/75">The highest Parent Scores in this part of town — the score weighs playground equipment, tree cover, open grass and restrooms.</p>
    <ol class="mt-4 space-y-2.5">
      ${picks.map((p, i) => `<li class="flex items-start gap-3 rounded-2xl border border-meadow/15 bg-white p-4 shadow-card">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-meadow-light font-display text-base font-bold text-meadow-deep">${i + 1}</span>
        <span class="min-w-0 flex-1">
          <a class="font-display text-lg font-bold text-meadow-deep hover:text-meadow" href="/parks/${p.slug}/">${esc(p.name)}</a>
          <span class="ml-2 text-xs text-bark">${fmtScore(p.score)}/10</span>
          ${p.tip ? `<span class="mt-1 block text-xs leading-relaxed text-ink/80">${esc(p.tip)}</span>` : ''}
        </span>
      </li>`).join('\n      ')}
    </ol>
  </section>` : ''}

  <section class="mt-12">
    <h2 class="font-display text-2xl font-bold text-meadow-deep">All ${inArea.length} parks in ${esc(area.label)}</h2>
    <p class="mt-1.5 max-w-2xl text-base leading-relaxed text-ink/75">Ranked by Parent Score. ${acres.toLocaleString()} acres of park land in total.</p>
    ${parkTable(inArea, { showArea: false, rank: true })}
  </section>`;

    const faq = [
      [`How many parks are there in ${area.label}?`,
       `The City of Boise lists ${qty(inArea.length, 'park')} in ${area.label}, covering about ${acres.toLocaleString()} acres. `
       + (withPlayground.length ? `${withPlayground.length} of them ${have(withPlayground.length)} playground equipment.` : 'None of them have playground equipment.')],
      [`Which park in ${area.label} is best with young kids?`,
       picks.length
         ? `${picks[0].name} has the highest Parent Score in ${area.label} at ${fmtScore(picks[0].score)} out of 10, based on its playground, tree cover, open grass and restrooms. The full ranking for the area is above.`
         : `No park in ${area.label} has playground equipment. All ${qty(inArea.length, 'park')} in the area are listed above, and the citywide playground ranking covers the rest of Boise.`],
      [`Which parks in ${area.label} have restrooms open in winter?`,
       yearRound.length
         ? `${yearRound.length} of the ${qty(inArea.length, 'park')} in ${area.label} ${have(yearRound.length)} heated restrooms that stay open year-round: ${yearRound.map(p => p.name).join(', ')}.`
         : `No park in ${area.label} has a heated restroom open year-round. The citywide list of parks that do is in the park restrooms guide.`],
    ];
    if (water.length) {
      faq.push([`Are there splash pads in ${area.label}?`,
        `${water.length} ${water.length === 1 ? 'park' : 'parks'} in ${area.label} ${water.length === 1 ? 'has' : 'have'} water play: ${water.map(p => p.name).join(', ')}. Water features run Memorial Day through Labor Day.`]);
    }
    if (leafy.length) {
      faq.push([`Which parks in ${area.label} have the most shade?`,
        `${leafy.length} ${leafy.length === 1 ? 'park is' : 'parks are'} rated leafy in ${area.label}, meaning dense mature tree cover measured from the city tree inventory: ${leafy.slice(0, 8).map(p => p.name).join(', ')}${leafy.length > 8 ? ' and others' : ''}.`]);
    }

    return writePage({
      pathname: `/areas/${area.slug}/`,
      title: `Parks in ${area.label} — All ${inArea.length}, Rated for Parents | Boise Parks`,
      metaDesc: `All ${qty(inArea.length, 'park')} in ${area.label}, Boise: ${qty(withPlayground.length, 'playground')}, ${qty(yearRound.length, 'year-round restroom')}, shade ratings and a Parent Score for each.`,
      h1: `Parks in ${area.label}`,
      lede: `The City of Boise lists <strong>${qty(inArea.length, 'park')}</strong> in ${area.label}, about ${acres.toLocaleString()} acres in total. `
        + `${withPlayground.length ? `${withPlayground.length} ${have(withPlayground.length)} playground equipment` : 'None have playground equipment'}, `
        + `${yearRound.length ? `${yearRound.length} ${have(yearRound.length)} a restroom that stays open through the winter` : 'none have a restroom open through the winter'}`
        + `${water.length ? `, and ${water.length} ${have(water.length)} a splash pad, fountain or pool` : ''}. `
        + `Every park below is scored on what matters with kids.`,
      itemList: inArea,
      faq,
      body,
    });
  });
};
