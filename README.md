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

Shade ratings are computed as tree-diameter-inches per acre from the city tree
inventory: `leafy` ≥ 90, `some` ≥ 25, else `full-sun`.

`data/parking.json` holds per-park parking (lot/street/downtown), built by
matching OSM parking features against park boundaries and verifying against
aerial imagery. The **Parent Score** (0–10) is computed in `scripts/gen.js`
purely from the amenity data (playground 3, restrooms 2, shade 1.5, water 1,
parking 1, shelter 0.5, extras 1) with the breakdown shown on every park.
Visitor star ratings are per-device (localStorage) — no backend.

## Deploy

Static hosting (GitHub Pages works — `CNAME` is set to boiseparks.com).
Everything in the repo root is servable; there is no server-side code.
