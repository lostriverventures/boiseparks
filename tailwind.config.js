/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './parks/**/*.html', './scripts/gen.js', './scripts/guides.js', './scripts/areas.js', './scripts/page-kit.js'],
  theme: {
    screens: {
      xs: '400px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    // One type scale, no half-pixels. Font-size only (line-height stays with the
    // existing leading-* utilities), so this is a pure size normalisation. Any
    // future text-[13.5px] now stands out as off-system instead of blending in.
    fontSize: {
      '2xs': '0.75rem',    // 12 — meta, credits, badges
      xs: '0.8125rem',     // 13 — dense secondary text, table cells, chips
      sm: '0.875rem',      // 14 — nav, buttons, compact UI
      base: '0.9375rem',   // 15 — body copy
      lg: '1.0625rem',     // 17 — lead paragraphs, card titles
      xl: '1.25rem',       // 20 — sub-section headings
      '2xl': '1.5rem',     // 24 — section headings
      '3xl': '1.875rem',   // 30 — page headings
      '4xl': '2.375rem',   // 38 — hero
    },
    extend: {
      colors: {
        // Palette: forest green + warm clay on cream — the "vintage national-park"
        // family — with a muted teal reserved strictly for water. Each hue has one
        // job: meadow = brand/structure, sun (clay) = the single warm accent for
        // callouts and mid-tier scores, sky (teal) = water features only.
        meadow: { DEFAULT: '#2C6E49', dark: '#1D5537', deep: '#143D2A', light: '#E8F1EA' }, // brand pine/forest green
        sky: { DEFAULT: '#2C6E7C', light: '#E4EEF0' },   // muted teal — water features only
        sun: { DEFAULT: '#A8492A', light: '#F7E9DF' },   // warm clay — the one accent
        bark: { DEFAULT: '#5B5349', light: '#8B8377' },  // warm neutral for muted text
        cream: '#FDFBF7',
        ink: '#2A2622',   // warm near-black body text (was cool slate #1F2937)
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Shadows carry a faint green tint (the brand deep green, 20/61/42) so
        // elevation reads warm rather than grey.
        card: '0 1px 2px rgba(20,61,42,0.05), 0 8px 24px -12px rgba(20,61,42,0.18)',
        lift: '0 12px 32px -12px rgba(20,61,42,0.30)',
      },
    },
  },
};
