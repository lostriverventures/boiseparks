/*
 * Shared visual system for boiseparks.com: the amenity icon set and the Boise
 * foothills ridge motif. One source, used by the server-side generators
 * (gen.js, page-kit.js) and injected into index.html for the client-rendered
 * homepage cards, so a glyph is defined exactly once.
 *
 * Icons: 24x24 grid, single 1.8 stroke via the `.ico` class in src/input.css
 * (stroke = currentColor, so an icon inherits the colour of its label). Always
 * shown next to a text label, so legibility never rests on the glyph alone.
 */

// name -> inner SVG markup (paths only; the <svg> wrapper is added by icon()).
const iconPaths = {
  playground: '<path d="M20 5v12"/><path d="M20 9h-4"/><path d="M16 9L5 18"/><path d="M5 18H3"/>',            // slide
  water:      '<path d="M12 3s6 6 6 10a6 6 0 1 1-12 0c0-4 6-10 6-10z"/>',                                       // droplet
  pool:       '<path d="M3 8c2 0 2 1.6 4.5 1.6S10 8 12 8s2 1.6 4.5 1.6S19 8 21 8"/><path d="M3 13c2 0 2 1.6 4.5 1.6S10 13 12 13s2 1.6 4.5 1.6S19 13 21 13"/><path d="M3 18c2 0 2 1.6 4.5 1.6S10 18 12 18s2 1.6 4.5 1.6S19 18 21 18"/>', // waves
  restroom:   '<circle cx="12" cy="6" r="2.5"/><path d="M8.5 21v-6a3.5 3.5 0 0 1 7 0v6"/>',                     // figure
  shade:      '<circle cx="12" cy="9" r="6"/><path d="M12 15v6"/>',                                              // tree
  dog:        '<circle cx="7" cy="9" r="1.5"/><circle cx="12" cy="7.5" r="1.5"/><circle cx="17" cy="9" r="1.5"/><path d="M12 12c-3 0-5 2-5 4a3 3 0 0 0 10 0c0-2-2-4-5-4z"/>', // paw
  courts:     '<circle cx="12" cy="12" r="8.5"/><path d="M5 8.5c3 1 3 6 0 7"/><path d="M19 8.5c-3 1-3 6 0 7"/>', // ball
  fishing:    '<path d="M4 12c3-4.5 8-4.5 11 0-3 4.5-8 4.5-11 0z"/><path d="M15 12l5-3v6z"/><circle cx="8" cy="11" r=".7" fill="currentColor" stroke="none"/>', // fish
  greenbelt:  '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17l4-7h6l-3.5 7"/><path d="M10 10h5"/>', // bike
  shelter:    '<path d="M4 11l8-6 8 6"/><path d="M6.5 11v8h11v-8"/>',                                            // roof
  parking:    '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M9.5 16V8h3.2a2.4 2.4 0 0 1 0 4.8H9.5"/>', // P
  grass:      '<path d="M12 21V11"/><path d="M12 21c0-4-1.6-7-4.2-8"/><path d="M12 21c0-4 1.6-7 4.2-8"/>',        // grass blades
};

function icon(name, cls = '') {
  const p = iconPaths[name];
  if (!p) return '';
  return `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
}

// Ridge silhouette (Variant A) — three layered foothills in brand-green tints.
// preserveAspectRatio="none" so it stretches to any banner width. Sits at the
// bottom of a title band or fills a card/header banner on a meadow-light ground.
const RIDGE =
  '<svg class="pointer-events-none absolute inset-x-0 bottom-0 h-full w-full" viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true">'
  + '<path d="M0 200 V120 C120 90 220 140 340 120 C480 96 560 60 700 84 C840 108 940 150 1080 120 C1140 108 1180 118 1200 112 V200 Z" fill="#2C6E49" opacity="0.10"/>'
  + '<path d="M0 200 V150 C160 120 260 160 420 146 C560 134 660 104 820 124 C960 142 1060 172 1200 150 V200 Z" fill="#2C6E49" opacity="0.16"/>'
  + '<path d="M0 200 V176 C180 160 320 184 500 176 C680 168 820 150 1000 170 C1080 178 1150 182 1200 178 V200 Z" fill="#1D5537" opacity="0.14"/>'
  + '</svg>';

// A full banner (used where a park has no photo): the ridge on a meadow-light
// ground, at a given aspect via the caller's classes.
function ridgeBanner(extraClass = '') {
  return `<div class="relative overflow-hidden bg-meadow-light${extraClass ? ' ' + extraClass : ''}">${RIDGE}</div>`;
}

module.exports = { iconPaths, icon, RIDGE, ridgeBanner };
