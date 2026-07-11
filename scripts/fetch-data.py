#!/usr/bin/env python3
"""Consolidate City of Boise open-data layers into parks.json for boiseparks.com.

Sources (all official City of Boise):
  - BPR_Park_Amenities FeatureServer     -> park_amenities.geojson  (amenity matrix, descriptions, images)
  - BPR_Playgrounds FeatureServer        -> playgrounds.geojson     (equipment, age class, surface, ADA, year)
  - BPR_Park_And_Street_Trees (stats)    -> tree_stats.json         (tree count + diameter sum per park)
  - cityofboise.org park-restrooms page  -> hardcoded lists below   (year-round vs seasonal)
  - cityofboise.org splash pads page     -> hardcoded dict below    (water feature type + season)
"""
import json, re, unicodedata

SCRATCH = '/private/tmp/claude-501/-Users-connordriscoll-Desktop-FloatBoise/103a1230-1cf1-4cfb-90fa-e9b58f157b58/scratchpad/'

# ---- restroom lists from https://www.cityofboise.org/departments/parks-and-recreation/park-restrooms/ (fetched 2026-07-11)
HEATED_YEAR_ROUND = ["Ann Morrison Park","Bowler Park","Camel's Back Park","Cherie Buckner-Webb Park","Cottonwood Park","C.W. Moore Park","Esther Simplot Park","Fort Boise Park","Franklin Park","Hillside to Hollow Reserve","Hobble Creek Park","Hyatt Hidden Lakes Reserve","Idaho Fallen Firefighters Memorial Park","Julia Davis Park","Kathryn Albertson Park","Kristin Armstrong Municipal Park","Marianne Williams Park","Morris Hill Park","Oregon Trail Reserve","Parkcenter Park","Redwood Park","Shoreline Park","Terry Day Park","Veterans Memorial Park","Warm Springs Park"]
WINTER_PORTABLES = ["Ann Morrison Park","Baggley Park","Borah Park","Cassia Park","Castle Hills Park","Catalpa Park","Charles F. McDevitt Youth Sports Complex","DeMeyer Park","Eagle Rock Park","Elm Grove Park","Fairmont Park","Florence Park","Helen B. Lowder Park","Ivywild Park","Julia Davis Park","Liberty Park","Magnolia Park","Manitou Park","Mariposa Park","Molenaar Park","Optimist Youth Sports Complex","Owyhee Park","Peppermint Park","Primrose Park","Shoshone Park","Stewart Gulch Park","Sunset Park","Sycamore Park","Williams Park","Willow Lane Park","Winstead Park"]

# ---- water features from https://www.cityofboise.org/departments/parks-and-recreation/splash-pads-and-fountains-in-city-parks/ (fetched 2026-07-11)
WATER = {
  "Ann Morrison Memorial Park": {"type":"Interactive fountain","hours":"Sunrise–sunset, Memorial Day–Labor Day"},
  "Borah Park": {"type":"Spray pad","hours":"10 a.m.–8 p.m., Memorial Day–Labor Day"},
  "Bowler": {"type":"Misters","hours":"Sunrise–sunset, Memorial Day–Labor Day"},
  "Comba Park": {"type":"Splash pad","hours":"10 a.m.–8 p.m., Memorial Day–Labor Day"},
  "Fairview Park": {"type":"Misters","hours":"Sunrise–sunset, Memorial Day–Labor Day"},
  "Franklin Park": {"type":"Misters","hours":"Sunrise–sunset, Memorial Day–Labor Day"},
  "Grove Plaza": {"type":"Interactive fountain","hours":"8 a.m.–11 p.m., Memorial Day–Labor Day"},
  "Molenaar Park": {"type":"Splash pad","hours":"10 a.m.–8 p.m., Memorial Day–Labor Day"},
}

# restroom-page name -> GIS Site_Name
NAME_FIX = {
  "Ann Morrison Park": "Ann Morrison Memorial Park",
  "Bowler Park": "Bowler",
  "Cherie Buckner-Webb Park": "Cherie Buckner Webb Park",
}

EXCLUDE = {
  # not parks / not family destinations / not open
  "Morris Hill Cemetery","Pioneer Cemetery","Fort Boise Military Reserve Cemetery",
  "Quail Hollow Golf Course","Warm Springs Golf Course","Idaho IceWorld",
  "O'Farrell Cabin","Spaulding Ranch","Settlers Canal Path","Dewey Park","Robert Noble Park",
  "Hill Road Parkway","Johnston Parcel","Pierce Gulch Farms","Hopffgarten",
  "Natatorium Pool and Hydrotube",  # covered via Ivywild-adjacent pools note
}
# reserves worth including for family hikes/strolls (have restrooms/trails/ponds)
KEEP_RESERVES = {"Hyatt Hidden Lakes Reserve","Military Reserve","Camel's Back Reserve","Hulls Gulch Reserve","Oregon Trail Reserve","Hillside to Hollow Reserve","Polecat Gulch Reserve"}

# GIS Site_Name -> public-facing name used on cityofboise.org
DISPLAY = {
  "Bowler": "Bowler Park",
  "Ann Morrison Memorial Park": "Ann Morrison Park",
  "Cherie Buckner Webb Park": "Cherie Buckner-Webb Park",
}

def slugify(n):
    n = unicodedata.normalize('NFKD', n).encode('ascii','ignore').decode().replace("'",'').replace('’','')
    n = re.sub(r"[^a-z0-9]+","-", n.lower()).strip('-')
    return n

def centroid(geom):
    pts=[]
    def walk(c):
        if isinstance(c[0],(int,float)): pts.append(c)
        else:
            for x in c: walk(x)
    walk(geom['coordinates'])
    lon=sum(p[0] for p in pts)/len(pts); lat=sum(p[1] for p in pts)/len(pts)
    return round(lat,6), round(lon,6)

amen = json.load(open(SCRATCH+'park_amenities.geojson'))['features']
pg   = json.load(open(SCRATCH+'playgrounds.geojson'))['features']
trees= {f['attributes']['Park']:(f['attributes']['tree_count'], f['attributes']['dia_sum'] or 0)
        for f in json.load(open(SCRATCH+'tree_stats.json'))['features']}

# group playground structures per park
pg_by_park = {}
for x in pg:
    p = x['properties']
    if p['Status'] != 'Active' or not p['Park'] or p['Park']=='Zoo Boise': continue
    pg_by_park.setdefault(p['Park'],[]).append(p)

heated = {NAME_FIX.get(n,n) for n in HEATED_YEAR_ROUND}
portables = {NAME_FIX.get(n,n) for n in WINTER_PORTABLES}

parks=[]
for f in amen:
    p=f['properties']; name=p['Site_Name']
    if name in EXCLUDE: continue
    if not (p['Park_Status'] or '').startswith('Open') or p['Park_Status']=='Open_Restricted': continue
    if p['Park_Status']=='Planned': continue
    if p['Park_Type']=='Open Space' and name not in KEEP_RESERVES: continue
    yn=lambda k: p.get(k)=='Yes'
    lat,lon = centroid(f['geometry'])
    acres = round(p.get('Acreage') or 0,1)

    # playgrounds
    structs = pg_by_park.get(name,[])
    toddler = any(s['Classification'] in ('Preschool Age','Combo') for s in structs)
    bigkid  = any(s['Classification'] in ('School Age','Combo') for s in structs)
    features=set()
    for s in structs:
        if s['Slide']=='Yes': features.add('slides')
        if s['Swing_Sets']=='Yes': features.add('swings')
        if s['Track_Ride']=='Yes': features.add('track ride / zipline')
        if s['Merry_Go_Round']=='Yes': features.add('merry-go-round / spinner')
        if s['Net_Climber']=='Yes': features.add('net climber')
    rubber = any((s['Material'] or '').startswith(('Bonded Rubber','Soft Tile','Synthetic')) for s in structs)
    ada    = any(s['ADA_Accessible']=='Yes' for s in structs)
    years  = [s['Installation_Year'] for s in structs if s['Installation_Year']]
    playground = None
    if structs or yn('Playground'):
        playground = {
            "structures": len(structs) or 1,
            "toddler": toddler, "bigKid": bigkid,
            "features": sorted(features),
            "rubberSurface": rubber, "ada": ada,
            "newestYear": max(years) if years else None,
            "surface": "bonded rubber" if rubber else ("wood chips" if structs else None),
        }

    # shade from real tree inventory: diameter-inches per acre
    tc, ds = trees.get(name,(0,0))
    density = (ds/acres) if acres else 0
    shade = "full-sun" if density < 25 else ("some" if density < 90 else "leafy")
    if p['Park_Type']=='Open Space': shade = "full-sun"  # foothills reserves: exposed regardless of tree count

    # restrooms
    if name in heated: restroom = "year-round"
    elif name in portables: restroom = "seasonal+portable"
    elif yn('Restrooms'): restroom = "seasonal"
    else: restroom = "none"

    display = DISPLAY.get(name, name)
    parks.append({
      "slug": slugify(display), "name": display,
      "lat": lat, "lon": lon,
      "address": (p['Address'] or '').title(),
      "zip": (p['City_State_Zip'] or '').split()[-1] if p.get('City_State_Zip') else "",
      "area": p['Park_Planning_Area'],
      "type": p['Park_Type'], "acres": acres,
      "desc": (p['Park_Description'] or '').strip(),
      "img": ((p['Park_Image'] or '').split('<')[0].strip() or None), "cityUrl": p['Card_Link'],
      "playground": playground,
      "restroom": restroom,
      "water": WATER.get(name),
      "pool": yn('Pool'),
      "shade": shade, "trees": tc,
      "shelter": yn('Shelter'), "reservable": yn('Reservations'),
      "greenbelt": yn('Greenbelt_Access'),
      "openPlay": yn('Open_Play_Areas'),
      "dogPark": yn('DOLA'),
      "fishing": yn('Fishing'),
      "accessible": yn('Accessible_Features'),
      "courts": sorted([c for c,k in [("basketball","Basketball"),("tennis","Tennis"),("pickleball","Pickleball"),("volleyball","Volleyball"),("bocce","Bocce"),("horseshoes","Horseshoes")] if yn(k)]),
      "fields": sorted([c for c,k in [("baseball","Baseball"),("softball","Softball"),("little league","Little_League"),("soccer","Soccer"),("cricket","Cricket"),("multi-use fields","Sports_Fields")] if yn(k)]),
      "extras": sorted([c for c,k in [("skate park","Skateboarding"),("bike park","Bike_Park"),("disc golf","Disc_Golf"),("outdoor gym","Outdoor_Gym"),("archery","Archery"),("community garden","Community_Garden"),("pollinator garden","Pollinator_Garden"),("birding","Birding"),("equestrian","Equestrian")] if yn(k)]),
    })

parks.sort(key=lambda x:x['name'])
json.dump(parks, open(SCRATCH+'parks.json','w'), indent=1)
print(len(parks),'parks written')
import collections
print('shade:',collections.Counter(x['shade'] for x in parks))
print('restroom:',collections.Counter(x['restroom'] for x in parks))
print('playgrounds:',sum(1 for x in parks if x['playground']))
print('water:',sum(1 for x in parks if x['water']))
# sanity: famous shady parks should be leafy
for n in ['Julia Davis Park','Ann Morrison Memorial Park',"Camel's Back Park",'Borah Park','Municipal Park' ]:
    m=[x for x in parks if x['name']==n]
    if m: print(n, m[0]['shade'], m[0]['trees'],'trees,',m[0]['acres'],'ac')
