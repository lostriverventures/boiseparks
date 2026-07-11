#!/usr/bin/env bash
# Production build for boiseparks.com:
#   1. Generate js/parks-data.js + static /parks/<slug>/ pages + sitemap.xml (scripts/gen.js)
#   2. Compile purged, minified Tailwind CSS -> styles.css
# Run this before committing after any content, data, or class change.
set -euo pipefail
cd "$(dirname "$0")"

echo "› generating park pages + data + sitemap…"
node scripts/gen.js

echo "› building CSS…"
npx -y tailwindcss@3.4.17 -c tailwind.config.js -i src/input.css -o styles.css --minify

echo "✓ build complete"
