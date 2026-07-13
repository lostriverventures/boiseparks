# boiseparks.com

The parent's guide to every park in Boise — 94 parks with playgrounds, splash pads,
restroom status (year-round vs seasonal), shade ratings, and an interactive
filterable map. Static site, no framework.

## Build

```
./build.sh
```

Runs `scripts/gen.js` (generates `js/parks-data.js`, one static SEO page per park
under `parks/<slug>/`, and `sitemap.xml`), then compiles purged Tailwind CSS to
`styles.css`. Run it after any change to content, data, or Tailwind classes.

## Data

All park facts come from official City of Boise sources, pulled July 2026:

- **BPR_Park_Amenities** feature layer (amenity matrix, descriptions, photos)
- **BPR_Playgrounds** feature layer (equipment, age classification, surfacing, ADA, install year)
- **BPR_Park_And_Street_Trees** feature layer (tree counts/diameters → shade rating)
- [Park restrooms page](https://www.cityofboise.org/departments/parks-and-recreation/park-restrooms/) (heated year-round vs winterized lists)
- [Splash pads page](https://www.cityofboise.org/departments/parks-and-recreation/splash-pads-and-fountains-in-city-parks/) (water feature type + season)

To refresh: `scripts/fetch-data.py` documents the full pipeline (it reads the raw
GeoJSON pulls and regenerates `data/parks.json`). The restroom and splash pad
lists inside it are hand-synced from the two city pages above — re-check those
when refreshing. `data/tips.json` holds hand-written parent notes; every claim
in it must be verifiable against the park's official city description.

**No verbatim city prose is published.** The City of Boise `Park_Description` is
their copyrighted text; we use it only as reference for writing our own original
notes. The pipeline splits it into `data/city-descriptions.local.json` (git-ignored
via `*.local.json`), and `scripts/gen.js` also strips any `desc` field before
emitting the bundle — so no verbatim description ships in the site, the JS bundle,
or the committed `data/parks.json`. Park pages instead link out to the official
city page for the source write-up.

Shade ratings are computed as tree-diameter-inches per acre from the city tree
inventory: `leafy` ≥ 90, `some` ≥ 25, else `full-sun`.

`data/parking.json` holds per-park parking (lot/street/downtown), built by
matching OSM parking features against park boundaries and verifying against
aerial imagery. The **Parent Score** (0–10) is computed in `scripts/gen.js`
purely from the amenity data. A **core out of 9** — playground (3.5), tree
cover (2.5), open grass (1.5), restrooms (1.5) — captures what makes a park
good for kids. Water features, shelters and trails are **bonuses that only add,
capped at +1**, so a park is never marked down for lacking them. Parking is
deliberately excluded from the score (it's shown as info only). The full
breakdown is displayed on every park. Visitor star ratings are per-device
(localStorage) — no backend.

## Photos

`data/photos.json` maps park slugs to openly-licensed hero photos (mostly
CC BY-SA 4.0) sourced from Wikimedia Commons, self-hosted under `parks-photos/`.
Each carries author + license + source-file URL and is credited in the UI
(a badge on cards/modal, a full credit line on park pages). 22 of 94 parks
have a photo; the rest fall back to the leaf placeholder. The site no longer
uses the City of Boise CDN images (`gen.js` strips the old `img` field). To add
or swap a photo: drop a licensed image in `parks-photos/<slug>.jpg`, add an
entry to `data/photos.json`, and rebuild.

## Deploy

Static hosting (GitHub Pages works — `CNAME` is set to boiseparks.com).
Everything in the repo root is servable; there is no server-side code.
