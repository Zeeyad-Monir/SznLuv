# SznLuv — Fall Spots Catalogue (Vancouver / Greater Vancouver)

Researched 2026-11-03. Research only, no code changes. Twenty new fall spots, each with every field the app uses for a spot plus the practical details the app does not store yet (hours, cost, booking, dogs, and so on).

## How to read this

- **Confidence** reflects how well each spot was verified.
  - **High**: an official page was read directly.
  - **Medium**: details come from two or more recent local guides, and the official site was unreachable (rate-limited, 403, or no match).
  - **Low**: a key fact is a guess or comes from an older year.
- **"2026 observed"** is what ran this year. Most fall events are date-limited and have now ended, so "typical annual pattern" is what to plan the app around. Always re-check each year, because dates and prices move.
- **Coordinates** come from the OpenStreetMap geocoder (Nominatim), checked against street addresses. They are fine for a map pin, but eyeball each one on a map before shipping. Pins marked ≈ are venue or park centroids, not entrances.
- **About (draft)** is original wording, written only from the verified facts below it. Edit freely.
- **Photo**: the app needs one image per venue page (`require('../assets/...')`). I didn't download any. Use your own photos or get permission from the venue. Don't scrape.


## Implementation status (2026-11-04)

These 20 spots are now in the app. Twenty more were added on 2026-11-09; see sections 9 and 10.

- **Data:** `services/spots.js` holds all 23 Fall spots (the original three farms plus these 20). The Fall list, the venue pages, the wheel pool and the Fall count on the Seasons screen all read from it. The list-card name and address below match what the app shows.
- **Venue pages:** every new spot opens `screens/SpotDetailScreen.js`, a data-driven copy of the Aldor page layout (weather, title, address, activity box, photo, expandable About, map with directions, reviews). The three original farms keep their own screens.
- **Photos:** none yet. Each new page shows a "Photo coming soon" placeholder in the photo slot until an image is registered in `screens/spotImages.js`.
- **About text:** the third paragraph of each spot is the "Good to know" paragraph (dates, cost, booking). It is labelled "In 2026" and needs a yearly refresh.
- **Fixed on the original three farms:** Aldor's map pin (was about 6 km west), Laity's address ("2725" to "12725") and map pin, Eagle Acres's list-card address, Laity's and Eagle's taglines, and Eagle's stale "2024" text.
- **Removed:** the four fictional Fall placeholders (Sunset Summit, Leaf Trail, Maple Park, Riverfront Meadows).
- **Still open:** Reifel and Pacific Spirit pins are park-level, not entrances. Eagle Acres's pin comes from an OpenStreetMap address point. Prices and several dates still need checking against venue sites.

---

## 1. What the app stores for a spot (from the code)

Based on `FallDatesScreen.js`, `AldorFamilyFarmScreen.js`, `LaityPumpkinPatch.js`, `EagleAcresDairy.js`, `SpinTheWheel.js` and `services/venueNavigation.js`.

| Field | Where it shows | Example (existing app) | Notes for new spots |
|---|---|---|---|
| **Category** | Season list section heading | "Pumpkin Patches" | Fall screen uses 3 categories; I propose 6 below. |
| **List-card name** | Season list card; heart (favourite) key; `venueRoutes` key | "Aldor Family Farm" | Must match the favourite key and the route key exactly. |
| **List-card address** | Season list card subtitle | "24990 84 Ave, Langley" | Short form: street, city. |
| **Detail title** | Venue page `<Text style=title>` and map marker title | "Aldor Acres Family Farm" | Can differ from the list name, but existing screens use inconsistent names. |
| **Detail address** | Venue page `address` | "24990 84 Ave, Langley, BC" | Adds ", BC". |
| **Activity tagline** | Venue page "activity box" | "Petting zoo, pumpkins, and more!" | One short line. |
| **About text** | Venue page, expandable | 1–3 paragraphs | Aldor has "Read more"; Laity and Eagle have one paragraph. |
| **Photo** | Venue page image | `assets/FamilyFarm.jpg` | One per venue. |
| **Coordinates** | Map pin, directions destination, and the OpenWeather forecast lookup | `49.1706, -122.6076` | Weather is fetched for the venue's own lat/lng (updated 2026-11-04); the same lat/lng drives the map and directions. |
| **placeID** | Reviews collection filter and review submit | `aldor_farm` | snake_case slug, unique per venue. |
| **Wheel label** | `SpinTheWheel.js` pool for Fall | "Aldor Acres Family Farm" | A string list; names differ from the season list today. |
| **Season-count** | Home "N Active Ideas" | `dateCounts/fall.count`, fallback 7 | Should be updated when spots are added. The Firestore doc needs project access; the hard-coded fallback is in `SeasonsScreen.js`. |

**Not stored by the app today, but captured per spot below:** season dates, hours, price, booking, parking and transit, dogs, accessibility, phone, website, indoor/outdoor, and a "date angle". The app has no date fields, so event-style spots expire. See section 7.

---

## 2. Proposed fall categories

| Category | Spots |
|---|---|
| **Pumpkin Patches & Harvest Farms** | 1–6 |
| **Festivals & Gardens** | 7–11 |
| **Halloween & After Dark** | 12–14 |
| **Salmon & Wildlife** | 15–17 |
| **Fall Colour Walks** | 18–20 |

The existing three farms (Aldor, Eagle Acres, Laity) are not in the 20. They stay in "Pumpkin Patches" and need data fixes (section 6).

---

## 3. The 20 at a glance

Status is as of 2026-11-03.

| # | Spot | City | Category | Typical window | Cost (2026) | Live now? | Confidence |
|---|---|---|---|---|---|---|---|
| 1 | Richmond Country Farms | Richmond | Pumpkin & Harvest | ~Sep 26–Oct 31 | $15–$20 + tax | No | Medium |
| 2 | Westham Island Herb Farm | Delta | Pumpkin & Harvest | October | Free entry | No | Medium |
| 3 | Hazelmere Pumpkin Patch | Surrey | Pumpkin & Harvest | October | $10–$12.50 | No | Medium |
| 4 | The Bog – Riverside Cranberry Farm | Langley | Pumpkin & Harvest | Mid-Sep to Thanksgiving | ~$7.50–$15 (2025) | No | Medium-Low |
| 5 | Hopcott Farms Cranberry Tours | Pitt Meadows | Pumpkin & Harvest | Mid–late Oct | Not stated | No | Medium |
| 6 | Maan Farms (Fall + Fright Festival) | Abbotsford ⚠ | Pumpkin & Harvest | Late Sep–Nov 1 | $17–$31 day; $69–$99 night | No | Medium-High |
| 7 | Fort Langley Cranberry Festival | Fort Langley | Festivals & Gardens | Saturday before Thanksgiving | Free | No | Medium-High |
| 8 | UBC Botanical Garden: Apple Festival | Vancouver | Festivals & Gardens | Mid-Oct weekend | From $15 | No | Medium-High |
| 9 | VanDusen: Harvest Days | Vancouver | Festivals & Gardens | Late Sep–mid Oct weekends | Garden admission | No (garden open) | High |
| 10 | Nitobe Memorial Garden | Vancouver | Festivals & Gardens | Sep–Oct 31 (seasonal) | Not stated | No (closed Nov 1) | Medium |
| 11 | Dr. Sun Yat-Sen Garden: Moon Palace | Vancouver | Festivals & Gardens | Late Sep weekend | Not found | No (garden open) | Medium |
| 12 | Burnaby Village Museum: Haunted Village | Burnaby | Halloween & After Dark | Late Oct, 5 nights | $12–$15 adult | No | High |
| 13 | Fright Nights at Playland | Vancouver | Halloween & After Dark | Oct 7–31 (19 nights) | $39–$69 | No | High |
| 14 | Canyon Frights, Capilano Bridge | North Vancouver | Halloween & After Dark | ~Oct 9–Nov 1 | Park admission ~$80 | No | Medium |
| 15 | Tynehead Hatchery & Salmon Loop | Surrey | Salmon & Wildlife | Oct–Dec | Free | **Yes** | Medium-High |
| 16 | Hoy Creek Hatchery | Coquitlam | Salmon & Wildlife | Mid-Oct–Jan | Free | **Yes** | Medium-High |
| 17 | Reifel Bird Sanctuary (snow geese) | Delta | Salmon & Wildlife | Oct–early Dec | $10 adult | **Yes** | High |
| 18 | Buntzen Lake | Anmore | Fall Colour Walks | Oct–early Nov | Not stated | **Yes** (trail closure) | Medium |
| 19 | Queen Elizabeth Park (Quarry Garden) | Vancouver | Fall Colour Walks | Late Oct peak | Park free | **Yes** | Medium |
| 20 | Pacific Spirit Park (Admiralty Trail) | Vancouver | Fall Colour Walks | Oct–Nov | Free | **Yes** (trail closed) | Medium |

⚠ Maan Farms is in Abbotsford (Fraser Valley), about an hour from downtown and outside Metro Vancouver. It is included because its haunted corn maze and fall fair are among the best fall experiences in the region. Drop it if you want strictly Metro Vancouver.

---

## 4. Detailed entries

### Category: Pumpkin Patches & Harvest Farms

#### 1. Richmond Country Farms
- **placeID:** `richmond_country_farms`
- **List card:** "Richmond Country Farms", "12900 Steveston Hwy, Richmond"
- **Detail title / address:** Richmond Country Farms, 12900 Steveston Hwy, Richmond, BC
- **Wheel label:** Richmond Country Farms (same as the list-card name)
- **Coordinates:** **49.13301, -123.08376** (OSM address point)
- **Tagline:** Pumpkin patch, wagon rides, and a farm market in the heart of Richmond!
- **About (draft):** Richmond Country Farms turns its fields into a pumpkin patch every fall, with wagon rides, live music and food trucks on busy days. Grab a bag, pick your pumpkins, and finish at the farm market. It's an easy, close-in fall outing without leaving the city.
- **2026 observed:** Sep 30–Oct 31 (one guide checked Oct 11; another says Sep 26–Oct 31, so the start date conflicts).
- **Typical annual pattern:** Late Sep through Oct 31.
- **Hours:** Weekdays 9–4; weekends and holidays 10–4:30 (last-entry times); market open until 7 pm.
- **Cost:** $15 + tax weekdays; $20 + tax weekends and holidays; age 2 and under free. Tickets at the hut only, no online sales (per guide checked Oct 11). Pumpkins not covered by admission; allowance not specified.
- **Booking:** None. Walk up. Weekends get busy.
- **Parking / transit:** Not stated.
- **Dogs / accessibility:** Not stated.
- **Date angle:** Easy weeknight or weekend afternoon; pair with Steveston Village.
- **Website / phone:** richmondcountryfarms.com (rate-limited when I tried); phone not found.
- **Photo needed:** Pumpkin field or farm market.
- **Sources:** FanVancouver pumpkin-patch guide (rechecked Oct 11, 2026); Daily Hive 2026 pumpkin patch roundup.
- **Confidence:** Medium. Verify the price, since the Daily Hive roundup copies some 2025 dates elsewhere in the same list.

#### 2. Westham Island Herb Farm
- **placeID:** `westham_island_herb_farm`
- **List card:** "Westham Island Herb Farm", "4690 Kirkland Rd, Delta"
- **Detail address:** 4690 Kirkland Rd, Westham Island, Delta, BC
- **Wheel label:** Westham Island Herb Farm (same as the list-card name)
- **Coordinates:** **49.08735, -123.14133**
- **Tagline:** Free pumpkin patch, scarecrows, and sunflower lanes on a country island!
- **About (draft):** Cross the single-lane wooden bridge from Ladner and you're on Westham Island, where the herb farm sets up a free fall display: Pumpkintown, Sunflower Lane and a crowd of scarecrows. You only pay for the pumpkins and produce you take home. It sits near the Reifel Bird Sanctuary, so the two make a natural pair.
- **2026 observed:** Daily until Oct 31, 10–5 (a 2025 listing said 9–5).
- **Typical annual pattern:** October.
- **Cost:** Free entry; pay for pumpkins and produce (cash, credit, debit).
- **Booking:** None.
- **Parking / transit:** Not stated (drive; single-lane wooden bridge).
- **Dogs / accessibility:** Not stated.
- **Date angle:** Pair with Reifel (#17) for a full "island day".
- **Website / phone:** The domain I tried (westhamislandherbfarm.com) did not resolve. Find the current official site or Facebook page.
- **Photo needed:** Scarecrow display or pumpkin field.
- **Sources:** Daily Hive 2026 roundup; FanVancouver guide.
- **Confidence:** Medium. No official page was read.

#### 3. Hazelmere Pumpkin Patch
- **placeID:** `hazelmere_pumpkin_patch`
- **List card:** "Hazelmere Pumpkin Patch", "18507 20 Ave, Surrey"
- **Detail address:** 18507 20 Ave, South Surrey, BC
- **Wheel label:** Hazelmere Pumpkin Patch (same as the list-card name)
- **Coordinates:** **49.03861, -122.71005**
- **Tagline:** Wagon rides, a mini corn maze, and a 1971 vintage firetruck!
- **About (draft):** A ten-acre South Surrey field with around 30 pumpkin varieties, farm animals to visit, a wagon ride, a mini corn maze and a play area. A vintage 1971 firetruck is a favourite photo stop. Pumpkins are priced separately from admission.
- **2026 observed:** Weekends through Oct 31, 10–5 (enter by 4); weekday afternoons Oct 1–30, 2–5.
- **Cost:** $12.50 weekends, $10 weekday afternoons; age 2 and under free (Daily Hive).
- **Booking:** Not stated.
- **Parking / transit / dogs / accessibility:** Not stated.
- **Date angle:** The $10 weekday-afternoon ticket is the cheapest paid patch entry in the guides.
- **Website / phone:** hazelmerepumpkinpatch.ca (unverified).
- **Note:** The Daily Hive roundup links it to "Gabriel Farms"; the other guide doesn't, so I use "Hazelmere Pumpkin Patch".
- **Photo needed:** Field + firetruck.
- **Sources:** Daily Hive 2026; FanVancouver; 604 Now.
- **Confidence:** Medium. Variety count differs by source ("20+" vs "about 30").

#### 4. The Bog – Riverside Cranberry Farm
- **placeID:** `bog_riverside_cranberry`
- **List card:** "The Bog Cranberry Farm", "26885 88 Ave, Langley"
- **Detail address:** 26885 88 Ave, Langley (Glen Valley), BC. Older listings show 26805, so confirm.
- **Wheel label:** The Bog Cranberry Farm (same as the list-card name)
- **Coordinates:** **49.16282, -122.48278**
- **Tagline:** Wade into a floating sea of cranberries at harvest time!
- **About (draft):** Each fall, Riverside floods its cranberry fields so the berries float to the surface in red sheets. Walk the self-guided audio tour, and add the optional Cranberry Plunge to wade in. Tours run rain or shine, and the harvest stage changes with the crop, so no two visits look identical.
- **2026 observed:** Tours listed Fri Oct 9 (1–3 pm), Sat Oct 10 (10–12), Mon Oct 12 (10–12). Plunge combos limited.
- **Typical annual pattern:** Mid/late September to Thanksgiving (older guide); dates move with the crop.
- **Cost:** 2026 price not found. 2025: Plunge $15, tour $7.50–$12.50, plus fees and tax.
- **Booking:** Required (TicketTailor, "thebogriversidecranberryfarm").
- **What to bring:** Not published. Reasonable guess: change of clothes, towel, waterproof footwear. The farm has been reported to supply boots or waders for the photo op.
- **Dogs / accessibility / parking:** Not stated.
- **Phone:** 604-614-7625.
- **Date angle:** Truly unusual and photogenic, and very fall-specific.
- **Photo needed:** Flooded red bog (the farm's own press images; ask permission).
- **Sources:** TicketTailor listings; Miss604; Daily Hive; Curiocity; Edible Vancouver.
- **Confidence:** Medium-Low. 2026 prices unconfirmed and the address varies between listings.

#### 5. Hopcott Farms Cranberry Tours
- **placeID:** `hopcott_farms`
- **List card:** "Hopcott Farms Cranberry Tours", "18385 Old Dewdney Trunk Rd, Pitt Meadows"
- **Wheel label:** Hopcott Farms Cranberry Tours (same as the list-card name)
- **Coordinates:** **49.24477, -122.71239**
- **Tagline:** Farm-gate cranberry harvest tours, waders and all!
- **About (draft):** Hopcott is a long-running Pitt Meadows family farm that has been harvesting cranberries since the 1930s. In mid to late October it opens its bogs to visitors, with waders on hand for the in-the-bog photo, and a farm market and bistro on site.
- **2026 observed:** Tours **Fri Oct 16–Sun Oct 25** (official site). Times and prices not stated.
- **Cost:** Not stated for 2026.
- **Booking:** Online (hopcottfarms.ca → Events → Cran Tours). A 2025 listing said some tours were for guests 19+, so check age limits.
- **Hours (farm):** The site shows "7 Days/Week 9–6" and bistro 9–4 (lunch 10:30–4). These may be market and bistro hours.
- **Phone:** (604) 465-7799 (official). An older listing shows another number.
- **Date angle:** Pair with a Pitt Meadows or Maple Ridge fall day (Laity patch is nearby).
- **Photo needed:** Cranberry bog with waders.
- **Sources:** hopcottfarms.ca (read directly); Wonderweek 2025 tour listings.
- **Confidence:** Medium. Official dates, but few other details.

#### 6. Maan Farms (Fall at the Farm + Halloween Fright Festival)
- **placeID:** `maan_farms`
- **List card:** "Maan Farms", "790 McKenzie Rd, Abbotsford"
- **Wheel label:** Maan Farms (same as the list-card name)
- **Coordinates:** **49.01627, -122.28187** (Fraser Valley, ~1 hr drive)
- **Tagline:** Pumpkin forest, corn mazes, zip line, and a haunted fright festival!
- **About (draft):** Maan Farms packs a lot into one fall visit: a five-acre forest pumpkin patch, two corn mazes, a fall fair with live entertainment and a zip line. After dark in October the farm becomes a Halloween Fright Festival with four haunted attractions, a midway and an illuminated pumpkin forest, for ages 14 and up.
- **2026 observed:** Fall at the Farm daily through **Nov 1**, 9–6 (Twilight Tuesdays 9–8). Fright Festival Oct 2–31, evenings (roughly 7–11).
- **Cost:** Daytime advance (age 3+): $17 Tue, $20 other weekdays, $27 weekends, $31 holiday weekends; same-day adds $6–$7. Fright Festival (separate ticket): about $69–$99 GA; waiver required; 14+; ticket insurance allows one reschedule; free parking for the festival.
- **Booking:** Advance tickets recommended; same-day sales available at a surcharge.
- **Dogs / accessibility / parking (day):** Not stated.
- **Date angle:** Best two-in-one: afternoon patch then night haunt. Strongest daytime-plus-spooky pairing in the region.
- **Website:** maanfarms.com (rate-limited for me).
- **Photo needed:** Pumpkin forest or lit-up fright maze.
- **Sources:** FanVancouver guide (rechecked Oct 11, 2026); Curiocity 2026 Fright Festival; Daily Hive 2026 roundup.
- **Confidence:** Medium-High.

---

### Category: Festivals & Gardens

#### 7. Fort Langley Cranberry Festival
- **placeID:** `fort_langley_cranberry_festival`
- **List card:** "Fort Langley Cranberry Festival", "9167 Glover Rd, Fort Langley"
- **Detail address:** Fort Langley village (Pop Up Park and Community Hall, 9167 Glover Rd); Fort Langley National Historic Site, 23433 Mavis Ave
- **Wheel label:** Fort Langley Cranberry Festival (same as the list-card name)
- **Coordinates:** Village centre **49.16912, -122.57990**; National Historic Site 49.16763, -122.57232
- **Tagline:** 100+ vendors, a pancake breakfast, and everything cranberry!
- **About (draft):** For one Saturday every Thanksgiving weekend, Fort Langley becomes a street festival: more than 100 vendors, live stage performances, crafts, face painting and a pancake breakfast, with cranberries in everything from preserves to baking. The National Historic Site joins in with its own programming, which has included a scarecrow contest and cranberry stomping.
- **2026 observed:** Sat Oct 10 (the 31st annual). Fort Langley Canoe Club "Cranberry Races" the same day.
- **Typical annual pattern:** The Saturday before Thanksgiving. Started in 1995; roughly 35,000 attendees.
- **Cost:** Free. The National Historic Site offered free admission on festival day (one source; another says regular fees, so verify).
- **Hours / parking:** Not stated (full-day event; expect heavy traffic).
- **Date angle:** Wander, snack and stay for dinner in the village; good for a daytime date.
- **Photo needed:** Festival crowd or cranberry stall.
- **Sources:** thefraservalley.ca festival page; Fort Langley Canoe Club; Daily Hive and Parks Canada calendar.
- **Confidence:** Medium-High.

#### 8. UBC Botanical Garden — Apple Festival (+ GreenHeart TreeWalk)
- **placeID:** `ubc_botanical_garden`
- **List card:** "UBC Apple Festival", "6804 SW Marine Dr, Vancouver"
- **Wheel label:** UBC Apple Festival (same as the list-card name)
- **Coordinates:** **49.25388, -123.25111** (≈, at the entrance building)
- **Tagline:** Taste 50+ apple varieties and walk the treetops!
- **About (draft):** Every October, UBC Botanical Garden hosts a big apple festival: tastings of more than 50 varieties, apple vendors, warm cider and live entertainment. In September and October the garden's GreenHeart TreeWalk, a 310 m canopy walkway, adds a high-above-the-forest walk to the visit.
- **2026 observed:** Apple Festival Sat–Sun **Oct 17–18**, 11–4 (35th annual). Garden and TreeWalk Sep 8–Oct 31, Tue–Sun 10–4:30 (TreeWalk last entry 3:30); closed Nov 1–Mar 31.
- **Typical annual pattern:** One mid-October weekend; usually sells out.
- **Cost:** General admission from $15; early bird $12 (to Sep 30). Official price page not read, so verify.
- **Booking:** Buy ahead (applefestival.ca); rain or shine.
- **Parking / dogs:** Not stated.
- **Phone:** 604-822-4208.
- **Date angle:** Pair the festival with a quiet wander through Nitobe (#10) next door.
- **Photo needed:** Apple tasting table or canopy walkway.
- **Sources:** botanicalgarden.ubc.ca (hours); Daily Hive 2026 festival article; Vancouver's Best Places.
- **Confidence:** Medium-High.

#### 9. VanDusen Botanical Garden — Harvest Days
- **placeID:** `vandusen_harvest_days`
- **List card:** "VanDusen Harvest Days", "5251 Oak St, Vancouver"
- **Detail address:** 5251 Oak St, Vancouver, BC. One VanDusen page I read said "5151", but OpenStreetMap and Curiocity both say 5251. Confirm on the venue's site.
- **Wheel label:** VanDusen Harvest Days (same as the list-card name)
- **Coordinates:** **49.23931, -123.12880**
- **Tagline:** Hay bales, a corn maze, live bluegrass, and autumn ginkgo gold!
- **About (draft):** Harvest Days turns VanDusen into a small fall fair: hay bales, cornstalks and pumpkins, a corn maze, lawn games, live bluegrass and folk music, food trucks and a biodegradable Sculpture Stroll. The garden's ginkgos, sugar maples and golden larches are the backdrop, and everything is included with regular garden admission.
- **2026 observed:** Weekends **Sep 26–Oct 18** plus Thanksgiving Monday Oct 12, 10:30–4:30 (garden open to 5). Rain or shine.
- **Typical annual pattern:** Late September through mid-October weekends.
- **Cost:** Included with garden admission. Adult $13.27–$15.81, senior $10.61–$12.65, youth $9.28–$11.05, child $6.63–$7.90 (online vs gate); members free.
- **Parking / transit:** Free lot off W 37th Ave (limited) and free street parking nearby; #17 Oak bus; about 15 min from Oakridge–41st Canada Line.
- **Dogs:** Not permitted during Harvest Days except service animals.
- **Accessibility:** Main paths and portable toilets accessible; accessible drop-off on C-Drive off Oak St.
- **Date angle:** Easy afternoon; fall colours plus entertainment.
- **Photo needed:** Hay bales and ginkgo colour.
- **Sources:** Curiocity Harvest Days 2026; City of Vancouver Sept 2026 announcement.
- **Confidence:** High.

#### 10. Nitobe Memorial Garden
- **placeID:** `nitobe_memorial_garden`
- **List card:** "Nitobe Memorial Garden", "1895 Lower Mall, Vancouver"
- **Wheel label:** Nitobe Memorial Garden (same as the list-card name)
- **Coordinates:** **49.26621, -123.25956**
- **Tagline:** Crimson Japanese maples around a tea house and still ponds!
- **About (draft):** Nitobe is a traditional Japanese stroll garden at UBC with a tea house and reflecting ponds, designed around the seasons. In autumn the Japanese maples turn crimson against the green moss, one of the best times to visit.
- **2026 observed:** Sep 8–Oct 31, Tue–Sun 10–4:30; closed Nov 1 for a private event.
- **Typical annual pattern:** Seasonal, closing after October, so late October is the fall-colour window.
- **Cost:** Not stated on the official page. Older sources: about $7 adult. Verify.
- **Booking:** Ticket shop (shop.botanicalgarden.ubc.ca).
- **Dogs / accessibility / photography rules:** Linked pages not read.
- **Phone:** 604-822-4208.
- **Date angle:** Quiet and romantic; pair with the Apple Festival or UBC red oaks.
- **Photo needed:** Maples over the pond.
- **Sources:** botanicalgarden.ubc.ca; Destination Vancouver fall colours guide.
- **Confidence:** Medium. Price unconfirmed. The garden closes for the season after Oct 31.

#### 11. Dr. Sun Yat-Sen Classical Chinese Garden — Mid-Autumn "Moon Palace"
- **placeID:** `sun_yat_sen_garden`
- **List card:** "Sun Yat-Sen Garden Moon Palace", "578 Carrall St, Vancouver"
- **Wheel label:** Sun Yat-Sen Garden Moon Palace (same as the list-card name)
- **Coordinates:** **49.27956, -123.10394**
- **Tagline:** Lanterns, lion dances, and mooncakes in a Ming-style garden!
- **About (draft):** The garden's Mid-Autumn Festival celebration brings traditional music, dance, lion performances, lantern riddles, crafts and Suzhou-style mooncakes, plus the chance to write a wish for a floating lantern on the Jade Pond. Outside the festival the garden is a calm Chinatown escape year-round.
- **2026 observed:** 40th annual, Sep 26–27, 2–9 pm; ticketed via Eventbrite (2026 price not found; 2023 advance was $7–$10).
- **Typical annual pattern:** One late-September weekend, so it opens fall rather than peaking it.
- **Garden admission (regular):** About $16 adult, $32 family, under 6 free (2026 guide); conflicting older figures. Hours reported Wed–Sun about 9:30–4. Free Sun Yat-Sen Park next door.
- **Phone / website:** vancouverchinesegarden.com (403 for me).
- **Date angle:** Evening lanterns plus Chinatown dinner.
- **Photo needed:** Jade Pond with lanterns.
- **Sources:** Destination Vancouver event listing; Ma.to and Newshub event notices; 2026 visitor guide.
- **Confidence:** Medium. Price and hours inconsistent across sources.

---

### Category: Halloween & After Dark

#### 12. Burnaby Village Museum — Haunted Village
- **placeID:** `burnaby_haunted_village`
- **List card:** "Burnaby Haunted Village", "6501 Deer Lake Ave, Burnaby"
- **Wheel label:** Burnaby Haunted Village (same as the list-card name)
- **Coordinates:** **49.23992, -122.96688**
- **Tagline:** A spooky-not-scary heritage village after dark!
- **About (draft):** For a handful of October evenings, the museum's 10-acre open-air village turns into a Haunted Village: dramatic lighting, a haunted graveyard, a spooky circus and bewitching stores. There's Halloween food and warm drinks at Mai's Café, DJ Drac and his dancers, and a shadow-puppet show. Trick-or-treating runs on Oct 31 only. Costumes encouraged.
- **2026 observed:** Fri Oct 23, Sat 24, Sun 25, Fri 30, Sat 31, 4–9 pm (café closes 8:30). Rain or shine.
- **Cost:** Advance adult $12, child (2–12) $7; day-of adult $15, child $10; under 2 free. Date or time changes cost $2 per ticket.
- **Booking:** Online; a limited number sold at the gate (card, or exact change in cash).
- **Parking / transit:** Parking limited: museum lot, City Hall lot or Deer Lake Beach. Transit or ride share recommended.
- **Dogs:** Not permitted (service animals only).
- **Accessibility:** Nearly all facilities wheelchair and stroller accessible on a paved path; not every exhibit fits strollers.
- **Phone:** 604-297-4565 (box office 604-205-3000).
- **Date angle:** Gentle spooky date that isn't scary; pair with a Deer Lake loop beforehand.
- **Photo needed:** Lit village street or graveyard.
- **Sources:** burnaby.ca Haunted Village page (read directly); Tourism Burnaby.
- **Confidence:** High.

#### 13. Fright Nights at Playland (PNE)
- **placeID:** `playland_fright_nights`
- **List card:** "Fright Nights at Playland", "2901 E Hastings St, Vancouver"
- **Wheel label:** Fright Nights at Playland (same as the list-card name)
- **Coordinates:** **49.28275, -123.03640** (OSM, Playland)
- **Tagline:** Seven haunted houses and every ride, after dark!
- **About (draft):** Playland becomes a scream park for most of October: seven haunted houses (The Void, The Bloodshed, Carn-Evil, Darkness, Haunted Mansion, Keepers Doll Factory and Materia Medica), 19 rides included, and roaming scare actors. Recommended for ages 13 and up.
- **2026 observed:** **Oct 7–31**, Wed–Sun (19 nights); gates 6 pm; close 11 pm (Wed, Thu, Sun) or midnight (Fri, Sat, and Thu Oct 22).
- **Cost:** Advance $39 / $49 / $59 depending on the night; day-of $45 / $59 / $69. Rapid Pass add-on $56 advance, $58 day-of (valid only the printed night).
- **Booking:** Date- and time-specific tickets; peak nights Oct 23–25 and 28–31 can sell out. Wednesdays are the calmest.
- **Rules / tips:** Cashless park; bags no larger than 8.5 × 11 in; no re-entry; costume and mask rules apply.
- **Parking / transit:** PNE lots at the $20 Playland event rate; R5 RapidBus or the 14 along Hastings; Renfrew Station is about 2 km away.
- **Date angle:** The big scare-date for couples (not for young kids).
- **Photo needed:** Needs permission; use your own night shots.
- **Sources:** FanVancouver Fright Nights 2026 guide (detailed, read directly).
- **Confidence:** High.

#### 14. Canyon Frights at Capilano Suspension Bridge Park
- **placeID:** `capilano_canyon_frights`
- **List card:** "Canyon Frights at Capilano", "3735 Capilano Rd, North Vancouver"
- **Wheel label:** Canyon Frights at Capilano (same as the list-card name)
- **Coordinates:** **49.34270, -123.11605**
- **Tagline:** A glowing orange bridge and a Frightful Forest after dark!
- **About (draft):** At Halloween the suspension bridge, river and surrounding forest light up in orange for Canyon Frights. Join the Frightful Forest scavenger hunt along the trails, spot skeletal scenes, owls at Treetops Adventure, glowing mushrooms and giant spiders, and catch live music at Loggers' Grill Plaza. Family-friendly, and included with park admission.
- **2026 observed:** About Oct 9–Nov 1 (two sources; one says Oct 11–31). Park hours 10–8; extended to 9 pm Oct 23–25 and Oct 30–Nov 1.
- **Cost:** Included with admission. Adult about $79.95 (Vancouver Tourism) or $81.90 (another guide), so conflicting. Annual-pass holders must reserve a time slot.
- **Rules:** Costumes must be child-friendly; no masks; no weapon-like or sharp items.
- **Parking / transit:** Parking limited; the park runs a free shuttle from downtown.
- **Phone:** 604-985-7474.
- **Date angle:** Pricey but atmospheric and not too scary, and it doubles as a fall-colour walk through the canyon.
- **Photo needed:** Glowing bridge (needs the park's permission).
- **Sources:** capbridge.com Canyon Frights page; Vancouver's Best Places; Vancouver Tourism.
- **Confidence:** Medium. The official page's year label was ambiguous and the price conflicts.

---

### Category: Salmon & Wildlife

#### 15. Tynehead Hatchery & Salmon Habitat Loop (Tynehead Regional Park)
- **placeID:** `tynehead_hatchery`
- **List card:** "Tynehead Hatchery", "16585 96 Ave, Surrey"
- **Wheel label:** Tynehead Hatchery (same as the list-card name)
- **Coordinates:** **49.17790, -122.76266**
- **Tagline:** Watch coho, chum, and chinook return up the Serpentine River!
- **About (draft):** In Tynehead Regional Park, a volunteer-run hatchery raises and releases Pacific salmon to restore the Serpentine River's run. In fall, spawning coho, chum and chinook can be spotted along the easy, flat Salmon Habitat Loop, which crosses the river on bridges.
- **Season:** Oct into Dec.
- **Hours:** Informal. The volunteer-run hatchery welcomes visitors when its gates are open, and the trail is the dependable option.
- **Cost:** Free (park and trail); donations welcome.
- **Parking / transit:** Parking at the hatchery lot; bus 337.
- **Accessibility:** Hatchery Trail, Birch Grove Trail, Salmon Habitat Loop and toilets at the hatchery lot are wheelchair accessible.
- **Dogs:** Not stated on the hatchery site.
- **Website:** tyneheadhatchery.ca. Operated by the Serpentine Enhancement Society; built 1988.
- **Date angle:** Free, easy and very fall-specific. Pair with a Surrey coffee stop.
- **Photo needed:** Own photos of the river.
- **Sources:** FanVancouver salmon guide; Destination Vancouver; tyneheadhatchery.ca.
- **Confidence:** Medium-High. Exact hatchery hours not published.

#### 16. Hoy Creek Hatchery (Hoy Creek Linear Park)
- **placeID:** `hoy_creek_hatchery`
- **List card:** "Hoy Creek Hatchery", "2985 Princess Cres, Coquitlam"
- **Wheel label:** Hoy Creek Hatchery (same as the list-card name)
- **Coordinates:** **49.28672, -122.79594**
- **Tagline:** Spawning chum and coho in a creekside city park!
- **About (draft):** A volunteer-run hatchery on Hoy Creek in Coquitlam. Chum return from mid-October and coho in November, and the Hoy Trail runs along the creek day or night. The hatchery holds a public open house on the first Saturday of most months, and a "Salmon Come Home" celebration usually lands on a Sunday in late October.
- **Season:** Chum mid-Oct to Dec; coho Nov to Jan.
- **Hours:** Open house first Saturday of the month (not Jul/Aug), 9:30–11:30 am; otherwise during work sessions. **Next open house: Sat Nov 7, 2026.**
- **Cost:** Free.
- **Getting there:** Not accessible by road. About 8–10 min walk from Lafarge Lake–Douglas SkyTrain. Free parking at Coquitlam City Hall, Pinetree Community Centre and Douglas College; paid at the station.
- **Rules:** Keep feet (dog or human) out of the stream.
- **Contact:** hoyscottwatershed@gmail.com.
- **Date angle:** Free, short, and on the SkyTrain.
- **Photo needed:** Own photos.
- **Sources:** hoyscottcreeks.org (read directly); City of Coquitlam listing; 604 Now.
- **Confidence:** Medium-High. The 2026 "Salmon Come Home" date was not found.

#### 17. George C. Reifel Migratory Bird Sanctuary
- **placeID:** `reifel_bird_sanctuary`
- **List card:** "Reifel Bird Sanctuary", "5191 Robertson Rd, Delta"
- **Wheel label:** Reifel Bird Sanctuary (same as the list-card name)
- **Coordinates:** ≈ **49.10290, -123.18981** (sanctuary centroid; the entrance is on Robertson Rd)
- **Tagline:** Fall waterfowl flocks and an ocean-marsh lookout tower!
- **About (draft):** Reifel sits on the Fraser delta with several kilometres of trails, an ocean-marsh tower with views toward Vancouver and Vancouver Island, and a gift shop selling bird seed ($2). Fall brings large flocks of waterfowl, including snow geese through early December. Allow 1–1.5 hours.
- **Season:** Fall to spring; the sanctuary says large waterfowl flocks run from Oct to early Dec.
- **Hours:** 9–4 daily, closed Mondays (except stat holidays); last drop-in entry 2:30, reservation last entry 3; everyone out by 4.
- **Cost:** Adult $10, senior (65+) $8, child (2–14) $7. Annual pass: family $140, individual $70. Older web listings quote $8/$6/$6, which is out of date.
- **Booking:** **Reservations required for all visitors**, opening three days ahead and closing 8 am on the day, unless full.
- **Rules:** No dogs, bikes or drones (strollers and wheelchairs OK); bird seed bought on site only; picnic only at the entrance.
- **Phone:** (604) 946-6980.
- **Date angle:** Pair with Westham Island Herb Farm (#2) for an island day.
- **Photo needed:** Own photos.
- **Sources:** reifelbirdsanctuary.com planning page (read directly); Vancouver Mom.
- **Confidence:** High.

---

### Category: Fall Colour Walks

#### 18. Buntzen Lake
- **placeID:** `buntzen_lake`
- **List card:** "Buntzen Lake", "South Beach, Anmore"
- **Wheel label:** Buntzen Lake (same as the list-card name)
- **Coordinates:** **49.34033, -122.85703** (South Beach)
- **Tagline:** Shoreline maples glowing against the evergreens!
- **About (draft):** Buntzen Lake is a BC Hydro recreation area north of Port Moody, with picnic tables, a shelter, viewpoints and dog-off-leash areas. In fall, patches of maples along the shore stand out against the evergreens. The classic 10 km loop takes about 3.5 hours.
- **Season:** Oct to early Nov for colour.
- **Hours (fall):** Gates open 8 am; closing 6 pm (Oct 12–25), 5:30 pm (Oct 26–Nov 1), 4:30 pm from Nov 2 or 3.
- **Cost / parking:** Fee not stated. Parking lots are about 2 km past the gate; **no parking in Anmore**. Summer parking reservations ran May 14–Sep 7, 2026. Bus 182 from Port Moody Centre plus about a 30-minute walk. Lots fill early on weekends.
- **Dogs:** On leash, except two off-leash areas.
- **Heads-up (important):** A rockslide closure affects Powerhouse Road between North Beach and Buntzen Dam (no pedestrian access), which impacts Diez Vistas and likely the full lake loop. Verify before featuring the loop.
- **Date angle:** Picnic by the water plus an easy shoreline stroll.
- **Photo needed:** Maples on the shoreline.
- **Sources:** BC Hydro Buntzen page; Destination Vancouver "7 more hikes for fall colours".
- **Confidence:** Medium.

#### 19. Queen Elizabeth Park (Quarry Garden)
- **placeID:** `queen_elizabeth_park`
- **List card:** "Queen Elizabeth Park", "4600 Cambie St, Vancouver"
- **Wheel label:** Queen Elizabeth Park (same as the list-card name)
- **Coordinates:** **49.24103, -123.11196** (park); Bloedel Conservatory 49.24206, -123.11377
- **Tagline:** Red Quarry Garden colour and Vancouver's highest viewpoint!
- **About (draft):** Vancouver's highest point gives a view over the city turning gold. Walk the Quarry Garden first (filled with red in fall), then climb to the viewpoint near Seasons in the Park. The Bloedel Conservatory dome is a warm, dry backup for rainy days.
- **Season:** Late Oct peak (urban parks and gardens typically peak late October).
- **Cost:** Park free. Bloedel Conservatory: fall hours Sep 8–Oct 27, 10–5; Nov–Dec 10–4; last entry 15 min before closing; admission is roughly $8–$11 but unconfirmed.
- **Parking / dogs / accessibility:** Not verified.
- **Date angle:** Easy, classic, rain-proof, with a restaurant at the top.
- **Photo needed:** Quarry Garden.
- **Sources:** Destination Vancouver "Best places to see fall colours"; Daily Hive fall leaves guide; VanDusen/Bloedel hours page.
- **Confidence:** Medium. Park details came from guides because the city page returned 403.

#### 20. Pacific Spirit Regional Park (Admiralty Trail to Spanish Banks)
- **placeID:** `pacific_spirit_park`
- **List card:** "Pacific Spirit Park", "Park Centre, W 16th Ave, Vancouver"
- **Wheel label:** Pacific Spirit Park (same as the list-card name)
- **Coordinates:** Park Centre ≈ **49.25806, -123.18844**; Spanish Banks 49.27759, -123.22092
- **Tagline:** Golden bigleaf maples on a forest walk to the beach!
- **About (draft):** Pacific Spirit is mostly evergreen, but the bigleaf maples along the Admiralty Trail near Spanish Banks turn golden each fall. It has more than 55 km of trails and is one of the area's best autumn foliage hikes, finishing at the beach.
- **Hours:** Oct 6–Nov 2, 7 am–7 pm; Nov 3–Dec 31, 7 am–6 pm; beaches close at sunset.
- **Cost:** Free.
- **Heads-up:** **Admiralty Trail closed from Nov 2 for about four weeks** (between Salish Trail and West Canyon Trail) for construction. Alternate trails exist.
- **Dogs:** Leash-required, leash-optional and no-dog trails; check signs.
- **Accessibility:** Park Centre washrooms and parking accessible; several wide trails detailed on the Metro Vancouver page.
- **Date angle:** Free, long walk, ends at the sea.
- **Photo needed:** Maples on the Admiralty Trail.
- **Sources:** Destination Vancouver fall colours guide; Metro Vancouver park page (read directly).
- **Confidence:** Medium.

---

## 5. Considered and excluded

| Spot | Why not |
|---|---|
| **Capilano River Hatchery** | Closed to visitors until further notice for a $49M rebuild (DFO, checked Oct 28, 2026). |
| **Stanley Park Ghost Train** | Not running for a fourth straight year; the Park Board is seeking a new operator. |
| **Township 7 Grape Stomp (Langley)** | Last confirmed in 2024 ($350 per team of 6–8). No 2025 or 2026 date found. A good add if it returns. |
| **Steveston sea lions** | Present fall to about May, but more winter-weighted, and the harbour authority warns they're wild and unpredictable. Not clearly fall. |
| **Lynn Canyon Park** | Great free bridge, but it didn't appear in fall-colour guides, and the bridge had construction closures in 2025–26. Year-round rather than fall-specific. |
| **Minnekhada Regional Park (High Knoll)** | Good viewpoint hike, but no fall-colour source found, and Quarry Road work reduced parking in Sep–Oct 2026. |
| **Taves Family Farms, Petey's Pumpkin Patch, Chilliwack Corn Maze** | Fraser Valley and farther. Strong, but Maan covers that slot. |
| **Port Kells, Rondriso, Harris pumpkin patches** | Decent runners-up for Surrey and Maple Ridge; less distinctive than the 6 chosen. |
| **Trout Lake, Deer Lake Park, Burnaby Mountain, Green Timbers** | Named in fall-colour guides; solid runners-up for "Fall Colour Walks". Deer Lake pairs well with the Haunted Village. |
| **Richmond Night Market, Vancouver Aquarium "Fin-tastic Fall", Granville Island fall events** | Generic or not fall-specific. |
| **Greendale Acres Pumpkin Fest** | Chilliwack, and not confirmed for 2026. |

---

## 6. Existing fall spots: data issues to fix when coding

Checked against the code and the sources above.

| Spot | Issue |
|---|---|
| **Aldor Acres** | Map pin in the app (`49.1706, -122.6076`) is about **6 km west** of where geocoding places the farm (`49.1548, -122.5301` for 24990 84 Ave). Names differ: list "Aldor Family Farm", detail "Aldor Acres Family Farm", wheel "Aldor Acres Family Farm"; the farm calls itself "Aldor Acres". |
| **Laity Pumpkin Patch** | Address in the app, "2725 Laity St", looks like a typo for **12725 Laity St**. There are **two locations** (North: 21145 128 Ave; South: 12725 Laity St) with different attractions (North is for younger kids; South for older), and one ticket covers one location only. The tagline "Wineries, pumpkins, and more!" doesn't match what the patch offers (no winery listed). Pet-free. |
| **Eagle Acres Dairy** | List-card address is a placeholder ("789 Fall Blvd"); the real address, **8796 240 St, Langley**, is on the detail page. The detail title is "Eagle Acres Dairy & Pumpkin Patch". The about text refers to "pumpkin fields of 2024". The tagline "Wineries, pumpkins, and more!" is copied from Laity. The farm has a three-acre corn maze, a covered hayride and 200+ animals (per guide). Pet-free. |
| **Pins for Eagle Acres and Laity** | The geocoder returned only street-level results, so I could not confirm them. Check both on a map. |
| **Placeholders** | Sunset Summit, Leaf Trail, Maple Park, Riverfront Meadows (and "Mystery Spot" wheel labels) are fictional. The catalogue's Fall Colour Walks category is a ready replacement for "Hikes with a View" and "Park and a Picnic". |
| **Wheel pool** | Fall wheel has 5 names (3 farms + Sunset Summit + Leaf Trail). Should be rebuilt from the real spot list. |

---

## 7. Notes for the build step

1. **Date-limited spots.** Roughly 14 of the 20 are events or seasonal openings that have already ended this year. The app has no date or season-window field. Decide whether to show typical dates as text, add a "season window" field, or hide spots out of season. This catalogue captures both "2026 observed" and "typical annual pattern" so any of those works.
2. **Home count.** Home reads `dateCounts/fall.count`, falling back to 7. The fallback is hard-coded in `SeasonsScreen.js`. The Firestore doc cannot be edited without project access, so the count will need a code fallback update.
3. **Weather block.** Each venue page now shows the forecast for the spot's own coordinates (it used to use the user's location). It no longer depends on location permission.
4. **Venue-page template.** Every spot above has the data for the current template (title, address, tagline, about, photo, coordinates, placeID). Spots 1–5, 7, 8, 10 and 12 are small enough that a lighter shared template would work better than a copy of the 1,000-line farm screens.
5. **Maan Farms** is the only spot outside Metro Vancouver. Remove if you want strictly Greater Vancouver.
6. **Confirm before shipping:** all prices (several guides contradict each other), the Reifel reservation rule, Buntzen's rockslide closure, the Pacific Spirit Admiralty Trail closure, and the Bog/Hopcott/Hazelmere official sites.

---

## 8. Source list

Local guides and listings: FanVancouver (pumpkin patches, salmon run, Fright Nights); Daily Hive (2026 pumpkin patches, UBC Apple Festival, fall leaves); Curiocity (Harvest Days 2026, Maan Fright Festival); Destination Vancouver (fall colours, 7 more hikes, salmon run); Vancouver's Best Places; Vancity Kids fall events 2026; 604 Now; Miss604; Wonderweek; Vancouver Mom; Vancouver Tourism.

Official or near-official pages read directly: burnaby.ca Haunted Village; reifelbirdsanctuary.com planning page; hopcottfarms.ca; botanicalgarden.ubc.ca (garden and Nitobe pages); hoyscottcreeks.org; tyneheadhatchery.ca; metrovancouver.org (Pacific Spirit); bchydro.com (Buntzen); capbridge.com (Canyon Frights); thefraservalley.ca (Cranberry Festival); Destination Vancouver and City of Vancouver event notices.

Geocoding: OpenStreetMap Nominatim.

---

## 9. Second batch: ten more spots (researched 2026-11-09)

All ten are in `services/spots.js`, bringing Fall to 33 spots. Each has the full record the app needs: list name and address, venue title and address, coordinates, tagline, and three About paragraphs ending in "Good to know". Photos are still "coming soon" placeholders. All 2026 seasons below have ended, so re-check dates and prices each year.

| Spot | City | Category | Why it's fall | Coordinates | Confidence |
|---|---|---|---|---|---|
| Taves Family Farms | Abbotsford ⚠ | Pumpkin & Harvest | Magic of Fall: pumpkin garden, three corn mazes, u-pick apples, fall ciders | 49.00867, -122.31852 | High |
| Krause Berry Farms | Langley | Pumpkin & Harvest | Pumpkin patch, barley maze, tractor rides, fall pies | 49.11302, -122.54028 | Medium |
| Willow View Farms | Abbotsford ⚠ | Pumpkin & Harvest | U-pick apples, 50+ pumpkin varieties, fresh-pressed cider | 49.00739, -122.29286 | Medium-High |
| Darts Hill Garden Park | Surrey | Festivals & Gardens | September Scarecrow Stroll and fall open house | 49.03185, -122.75431 (≈) | Medium |
| Lost Souls of Gastown | Vancouver | Halloween & After Dark | Lamplit theatre walk, nightly through Halloween | 49.28452, -123.11044 | High |
| Haunted Halloween Trolley | Vancouver | Halloween & After Dark | Halloween-season night tour with a storyteller | 49.28790, -123.11305 | Medium-High |
| Kanaka Creek Fish Fence | Maple Ridge | Salmon & Wildlife | Chum and coho return, roughly mid-Oct to mid-Nov | 49.21080, -122.50690 | Medium-High |
| Stanley Park | Vancouver | Fall Colour Walks | Lost Lagoon to the Rowing Club, mid to late Oct peak | 49.29560, -123.14074 (≈) | Medium-High |
| Deer Lake Park | Burnaby | Fall Colour Walks | 5 km lake loop with reflections, mid to late Oct peak | 49.24054, -122.96880 | High |
| Campbell Valley Park | Langley | Fall Colour Walks | Named by Tourism Langley as a must-visit for foliage | 49.02094, -122.65805 (≈) | Medium-High |

⚠ Abbotsford is in the Fraser Valley, about an hour from downtown, like Maan Farms. Pins marked ≈ are park or lagoon centroids, not entrances.

**Open items**
- **Krause:** pumpkin patch dates and any activity fees weren't published. The farm's own homepage doesn't list its fall activities; they come from Tourism Langley (Sept 2026).
- **Lost Souls:** the operator's two pages give different prices ($33 and $35 adult), so the app gives a range.
- **Haunted Trolley:** no 2026 price was found; the app quotes 2025 and says so.
- **Darts Hill:** the official pages couldn't be opened directly, so dates come from search listings of the City of Surrey pages. Its season ends in late September, the earliest of any spot.
- **Campbell Valley:** the address uses the South Valley Entrance, but the pin is the park centroid. Eyeball it on a map.
- **Deer Lake:** the boat launch boardwalk is being replaced until winter 2027.

**Considered and excluded in this round**

| Spot | Why not |
|---|---|
| Capilano River Hatchery | Still closed to visitors until further notice (DFO page, modified 2026-10-01). |
| Stanley Park Ghost Train | Still not running in 2026. |
| Minnekhada Regional Park | A hiking guide says it isn't full of vivid autumn colour. |
| Fraser Valley Cider Company | Year-round cidery; no fall event or pressing day could be verified. |
| Annie's Orchard (Langley) | Named in one roundup, but no current listing could be found. |
| Port Kells Nurseries, Rondriso Farms | Listed dates don't match the 2026 calendar, so they look carried over from an earlier year. |
| Richmond Farm Fest | Mid-September agriculture event, not framed as fall or harvest. |
| Barnside Harvest Festival | A music and craft beer festival, despite the name. |
| Chilliwack farms (Greendale, Petey's) | Outside Greater Vancouver. |
| Dovercourt Crypt | A haunted house at a private home. |

**Sources:** tavesfamilyfarms.com; krauseberryfarms.com; Tourism Langley (fall guide and Krause listing, 2026); willowviewfarms.com; Daily Hive and Valley Family Adventures (2026 farm guides); City of Surrey event listings and Family Fun Canada (Darts Hill); forbiddenvancouver.ca; greatcanadiantrolley.com; Destination Vancouver (Halloween and fall colour guides, 2026); Miss604 (2025 trolley prices); Metro Vancouver park pages and brochure (Kanaka Creek, Campbell Valley); keeps.org; Watershed Watch; burnaby.ca; FanVancouver (fall colours, 2026). Geocoding: OpenStreetMap Nominatim.

---

## 10. Third batch: ten more spots (researched 2026-11-09)

Selection rule for this batch: public access confirmed, and fall has to be the actual reason to go. No more pumpkin patches were added, since Fall already had 12 and the remaining ones weren't different enough. All ten are in `services/spots.js`, bringing Fall to 43 spots. Photos are still placeholders. All 2026 dates below have passed.

| Spot | City | Category | Why it's fall | Coordinates | Confidence |
|---|---|---|---|---|---|
| VanDusen Mushroom Show | Vancouver | Festivals & Gardens | Vancouver Mycological Society's annual fall show | 49.23907, -123.13460 | High |
| Stewart Farm Harvest Fair | Surrey | Festivals & Gardens | Free harvest fair at a heritage farm | 49.06507, -122.84202 | Medium-High |
| Renfrew Ravine Moon Festival | Vancouver | Festivals & Gardens | Harvest moon festival with a lantern procession | 49.24378, -123.04752 | High |
| Bear Creek Halloween Train | Surrey | Halloween & After Dark | Pumpkin Train by day, Scream Train by night | 49.16235, -122.84205 | Medium-High |
| Cougar Creek House of Horrors | Surrey | Halloween & After Dark | Five haunted houses, October only | 49.13400, -122.87560 (≈) | High |
| Grave Tales at Fort Langley | Fort Langley | Halloween & After Dark | After-dark Halloween tours of the national historic site | 49.16763, -122.57232 | High |
| Wings Over Iona | Richmond | Salmon & Wildlife | Free celebration of the fall bird migration | 49.21416, -123.18733 (≈) | High |
| UBC Main Mall | Vancouver | Fall Colour Walks | Avenue of red oaks, late October peak | 49.26761, -123.25511 | Medium-High |
| Trout Lake | Vancouver | Fall Colour Walks | Lakeside deciduous trees, late October peak | 49.25572, -123.06252 | Medium-High |
| Burnaby Mountain Park | Burnaby | Fall Colour Walks | Earliest colour of the list, early to mid October | 49.28287, -122.93466 | Medium-High |

Pins marked ≈: Cougar Creek's is estimated along 72 Ave because geocoders don't know the house number; Iona's is the park centroid. Eyeball both on a map.

**Open items**
- **Bear Creek:** the operator's site now shows only its Christmas train, so Halloween details come from two 2026 listings.
- **Grave Tales:** sources give slightly different tour schedules, so the app gives only the overall dates and a price range.
- **Mushroom Show:** 2026 price is "by donation" per VanDusen; the $5 figure is from 2024.
- **Iona:** listings give both 900 and 5980 Ferguson Rd, so the app uses the road name without a number.
- **Burnaby Mountain:** its November 9 to 13, 2026 road closure should be removed from the About text at the next yearly refresh.

**Considered and excluded in this round**

| Spot | Why not |
|---|---|
| Harvest Haus | Sources conflict on dates, times and venue. Essentially an Oktoberfest. |
| Haunted Cellar Tea at Notch8 | A hotel restaurant's seasonal promotion. |
| Harris Pumpkin Patch, Loft Country Farms | No confirmed 2026 details; patches are already well covered. |
| Serpentine Fen, Blackie Spit | Good birding, but year-round rather than fall-specific. |
| Little Campbell River, Noons Creek, Still Creek | No current public-access source found. |
| Campbell Valley Country Celebration | No 2026 date found. |
| Vancouver Alpen Club Oktoberfest | Club under redevelopment; no 2026 event found. |
| Reapers (Chilliwack) | Outside Greater Vancouver. |
| Coquitlam, Lansdowne and Henderson moon festivals | Sun Yat-Sen and Renfrew Ravine already cover this, with more character. |
| Richmond Farm Fest | Agriculture event, not framed as fall or harvest. |
| Ghosts of New Westminster, Vancouver Horror Show Film Festival | Very short runs or thin details; Halloween is well covered. |

**Sources:** vandusengarden.org; vanmyco.org; Cloverdale Reporter (Sept 3, 2026); stillmoonarts.ca; Miss604 (Renfrew Ravine, 2026); Family Fun Canada and Daily Hive (Bear Creek and Cougar Creek, 2026); cougarcreekhouseofhorrors.com; bctrains.com; Parks Canada Fort Langley calendar; Metro Vancouver (Iona, events calendar); Eventbrite and Visit Richmond (Wings Over Iona 2026); Destination Vancouver and FanVancouver (fall colours, 2026); Curiocity; burnaby.ca. Geocoding: OpenStreetMap Nominatim and Photon.

---

## 11. Fourth batch (researched 2026-11-12)

Seven additions bring the Fall catalogue to 50 spots. Each uses the shared detail screen and its photo placeholder. Dates and prices for events refer to their 2026 editions.

| Spot | Seasonal draw and visit details | Map pin |
|---|---|---|
| Haney House Apple Harvest Fest | Annual celebration of Maple Ridge’s apple harvest at a historic farmhouse and orchard. In 2026 the event ran September 20, 11 am to 2 pm, by donation. [Maple Ridge Museum event](https://mapleridgemuseum.org/apple-harvest-fest/), [City of Maple Ridge venue](https://www.mapleridge.ca/explore-maple-ridge/about-maple-ridge/explore-our-heritage/haney-house-museum), [2026 cider and apple samples](https://www.familyfuncanada.com/vancouver/apple-harvest-festival/) | [Haney House Museum](https://mapcarta.com/W629546183) |
| Granville Island Day of the Dead Market | Día de los Muertos market with music, artisans, food and workshops on remembrance traditions. The 2026 market ran October 31 and November 1, with admission by donation and workshops at $5–$20. [Latincouver event and venue](https://latincouver.ca/lahm/events/day-of-the-dead-celebration-granville-island/), [2026 admission and workshop location](https://myvancity.ca/2026/10/23/latin-american-heritage-month-day-of-the-dead-festivities/) | [Approximate Old Bridge Street pin](https://www.findlatitudeandlongitude.com/l/Granville%2BIsland%2C%2BOld%2BBridge%2BStreet%2C%2BGranville%2BIsland%2C%2BFairview%2C%2BVancouver%2C%2BMetro%2BVancouver%2BRegional%2BDistrict%2C%2BBritish%2BColumbia%2C/9973956/) |
| Steveston Scarecrow Crawl | Free, self-guided walk past handmade displays at participating businesses. The 2026 edition ran October 1–31. [Steveston Merchants Association](https://stevestonmerchants.com/events/), [Tourism Richmond’s 2026 guide](https://www.visitrichmondbc.com/blogs/activities-attractions/october-in-richmond-bc/) | [Steveston Tram as a suggested starting point](https://mapcarta.com/W226922618) |
| Central Spark | Burnaby’s free Halloween night at Central Park, with pumpkin carving, costumes and fireworks. The 2026 edition ran October 30, 6–8 pm. [City of Burnaby event](https://www.burnaby.ca/recreation-and-arts/events/central-spark) | [Kingsway at Patterson Avenue](https://www.findlatitudeandlongitude.com/l/Kingsway%2B%28EB%29%2Bat%2BPatterson%2BAvenue%2C%2BKingsway%2C%2BBurnaby%2C%2BMetro%2BVancouver%2BRegional%2BDistrict%2C%2BBritish%2BColumbia%2C%2BV5H%2B4H6%2C%2BCanada/7687358/gps-coordinates-converter/) |
| Hyde Creek Hatchery | Fall chum and coho return and free volunteer-led hatchery tours. The 2026 tours were scheduled for November 21, 9 am to 2 pm. [Hyde Creek Watershed Society](https://www.hydecreek.org/facility), [Burke Mountain Naturalists event listing](https://www.burkemountainnaturalists.ca/events-calendar/hyde-creek-hatcherys-free-annual-salmon-return-tours/) | [Fisheries and Oceans Canada’s Hyde Creek project coordinates](https://www.dfo-mpo.gc.ca/aquaculture/bc-cb/maps-cartes-eng.html?wbdisable=true) |
| Boundary Bay Fall Bird Migration | Free dyke walk from Centennial Beach with a chance to see flocks of dunlin in October and November. [Metro Vancouver trail brochure](https://metrovancouver.org/services/regional-parks/Documents/boundary-bay-regional-park-brochure.pdf), [Fraser River Delta bird populations](https://bcbirds.bcfo.ca/wp-content/uploads/2021/04/bc-birds-volume-32-fraser-complete-web.pdf) | [Centennial Beach parking lot](https://raceroster.com/events/2025/107895/boundary-bay-race-shuttle-service) |
| Hadden Park | Fall colour along the Kits Point seawall, with an easy extension to Kitsilano Beach. [Destination Vancouver fall foliage guide](https://www.destinationvancouver.com/inspirations/outdoors/fall-foliage-strolls-in-vancouver), [Vancouver Park Board](https://covapp.vancouver.ca/ParkFinder/parkdetail.aspx?inparkid=110) | [Hadden Park at 1905 Ogden Ave](https://www.mypacer.com/parks/350329/hadden-park-vancouver) |

---

## 12. Verification and photo audit · Batch 1 of 5

Audited November 12, 2026. This table covers Fall positions 1–10 and supersedes earlier research for those spots. The next batch starts at **Krause Berry Farms**. Dates, prices and booking terms below are for the 2026 season. An open item stays in this log until a source confirms it.

The pins below are latitude and longitude. Civic addresses were checked against venue pages and the [BC Address Geocoder](https://digital.gov.bc.ca/bcgov-common-components/bc-address-geocoder/). Use the provincial street access point where it provides a better driving destination. Hazelmere’s existing pin already matches the access point. Hopcott’s pin marks the public market at the event address. It is a reference point for directions while the exact tour check-in remains unconfirmed.

| # | Spot and pin | Verified details and changes | Open details | Photo status |
|---|---|---|---|---|
| 1 | **Aldor Family Farm** · 24990 84 Ave, Langley · 49.15467, -122.53112 | September 19–October 31, daily 9 am–6 pm, last entry 5 pm. Single ticket listed at $21 for ages 3+, pumpkins extra. Gate tickets subject to capacity, with advance booking recommended on weekends. Confirmed hayrides, barn animals, goat parade and Farmacy. Main area mostly stroller and wheelchair friendly, with bumpy surfaces. Pet dogs stay home. [Season schedule](https://aldoracresfamilyfarm.ca/?bookings_did=wndimbhryiaxeccreqhy&bookings_sid=xavmispqrpfuqvthtnsh), [ticket](https://aldoracresfamilyfarm.ca/product/single-day-pass-oct-18/), [FAQ](https://aldoracresfamilyfarm.ca/faq/) | Generic FAQ gives September 20 as the start, while the 2026 schedule says September 19. Kept the dated season schedule. The public ticket page does not specify checkout tax. | Existing cover retained. |
| 2 | **Eagle Acres Dairy** · 8796 240 St, Langley · 49.15879, -122.55840 | September 26–October 31 weekends and October 12 and 23, 10 am–5 pm. September 30, 11 am–5 pm. Last entry 4 pm. Online or gate, $15 adults, $13 ages 2–18 and 65+, plus GST. Under two free. Pumpkins extra. Covered hayride, R2D2 milking robot, main and overflow parking. Pets stay home. [Public pumpkin patch](https://www.eagleacres.ca/pumpkin-patch), [ticketing](https://eagleacres.tickit.ca/), [farm map](https://www.eagleacres.ca/copy-of-calendar) | Wheelchair access onto the wagon was not published. | Existing cover retained. |
| 3 | **Laity Pumpkin Patch** · South, 12725 Laity St, Maple Ridge · 49.23275, -122.63195 | September 26–October 31. Usual weekday hours noon–5 pm and weekends/holidays 10 am–6 pm. September 29 closed, October 23 9:30 am–5:30 pm, Halloween 10 am–5 pm. Gate tickets for ages 3+ were $13 weekdays or $16 weekends and holidays, tax included. Activities included, pumpkins extra. North is separately ticketed at 21145 128 Ave. South uses the signed Laity Street entrance. Accessible parking at both. Pets stay home. Service animals stay clear of animal enclosures. [South and its calendar](https://laitypumpkinpatch.com/south/), [venue addresses and access](https://laitypumpkinpatch.com/contact/), [FAQ](https://laitypumpkinpatch.com/frequently-asked-questions/) | Last admission was not listed separately from closing time. | Existing cover retained. |
| 4 | **Richmond Country Farms** · 12900 Steveston Hwy, Richmond · 49.13343, -123.08205 | Early opening September 26–27 and daily September 30–October 31. Ticket-hut hours 9 am–4 pm weekdays and 10 am–4:30 pm weekends and holidays. $15/$20 plus tax, ages two and under free. Paid entry included one pumpkin and one Spartan apple. Free parking. Uneven ground in some areas. [Venue FAQ](https://richmondcountryfarms.com/pages/faq), [Tourism Richmond’s 2026 listing](https://www.visitrichmondbc.com/blogs/seasonal/haunting-halloween-happenings-in-richmond/), [2026 ticket-hut schedule](https://littlevancouver.ca/outings/richmond-country-farms-pumpkin-2026) | The general farm FAQ gives generic advance-ticket advice. The dated patch listing says gate-only for 2026. Check event-specific pet rules when the next season is announced. | Added GoToVan’s pumpkin display at the farm market. [Original](https://www.flickr.com/photos/gotovan/30144361371), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) |
| 5 | **Westham Island Herb Farm** · 4690 Kirkland Rd, Delta · 49.08853, -123.14039 | October 1–31, daily 10 am–5 pm. Free entry and pumpkins sold separately. Verified the pumpkin field, farm shop and scarecrow display. The 2026 fall season has ended. [Operator patch](https://westhamislandherb.ca/pumpkins/), [operator directions](https://westhamislandherb.ca/about-us/contact-us/), [2026 dates](https://www.familyfuncanada.com/vancouver/westham-island-herb-farm-pumpkin-patch/), [2026 admission](https://fanvancouver.com/vancouver/pumpkin-patches/) | Separate last entry, pet and step-free access policies were not confirmed. | Temporary cover in the local app. [FernShade’s straw guardian chicken with its pumpkin](https://www.flickr.com/photos/spring-song072/21992123250). Reuse rights unverified. |
| 6 | **Hazelmere Pumpkin Patch** · 18507 20 Ave, Surrey · 49.03861, -122.71005 | September 19–October 31 weekends and Thanksgiving Monday, 10 am–5 pm with last entry 4 pm. $12.50 from age two on those dates. October 1–30 weekday afternoons 2–5 pm, $10 per person. Gate tickets only. Wagon ride, mini corn maze, farm animals and play area included. Pumpkins extra and friendly leashed dogs welcome. [Gabriel Farms’ 2026 schedule](https://www.hazelmerepumpkinpatch.ca/), [farm history and firetruck](https://www.hazelmerepumpkinpatch.ca/the-clinic) | A weekday last-entry cutoff, the weekday toddler rate and wheelchair access were not separately stated. | Temporary cover in the local app. Vintage firetruck and slide from [Gabriel Farms’ photo gallery](https://www.hazelmerepumpkinpatch.ca/copy-of-home). Reuse rights unverified. |
| 7 | **The Bog Cranberry Farm** · 26885 88 Ave, Langley · 49.16205, -122.48323 | Self-guided harvest tours October 9, 1–3 pm, and October 10 and 12, 10 am–noon and 1–3 pm. Separately booked plunge sessions September 30–October 12, excluding October 4 and 11. Dated prices $7.50–$12.50 for tours and $15 plus fees for the plunge. Advance booking or gate if space permits. Plunge for children over five and adults, with adult accompaniment for ages 12 and under. No pets. [Operator tours](https://www.riversidecranberries.ca/tours), [2026 timed tour](https://www.tickettailor.com/events/thebogriversidecranberryfarm/2378862), [2026 plunge booking](https://www.tickettailor.com/events/thebogriversidecranberryfarm/2370112), [dated price and session listing](https://www.todocanada.ca/city/vancouver/event/the-bog-self-guided-tour-at-riverside-cranberries/) | Closed booking pages do not show the original checkout price. Accessibility and separate parking instructions were not confirmed. | Temporary cover in the local app. Flooded harvest bog from [Riverside Cranberry Farm’s gallery](https://www.riversidecranberries.ca/gallery). Reuse rights unverified. |
| 8 | **Hopcott Farms Cranberry Tours** · 18385 Old Dewdney Trunk Rd, Pitt Meadows · 49.24477, -122.71239 | Select dates October 16–25. Published time slots included 10 am, 11:30 am, 1 pm, 2:30 pm and 4 pm depending on the date. About one hour. Tour $19, with plunge $33 for ages 10–64. Seniors $17/$31. GST extra. Ages nine and under free on an adult’s lap on the wagon. Plunge is ages 10+ and subject to wader fit. Leashed dogs welcome. Tours required for field access. The farm started growing cranberries in 1996. [Official event dates](https://hopcottfarms.ca/events/), [2026 public ticket terms](https://hopcottfarms.ca/shop/events/cranberry-tours/cranberry-tour-saturday-oct-17-230pm/), [farm history](https://hopcottfarms.ca/farm/about-us/), [public event address](https://globalnews.ca/event/12093049/hopcott-farms-cranberry-bog-tours/) | Confirm check-in and parking against the next ticket. The public address and market pin are verified, but the 2026 ticket does not identify a specific check-in entrance or wheelchair access. | Temporary cover in the local app. A grower in the flooded bog from [Ocean Spray’s Hopcott family profile](https://www.oceanspray.com/our-farmers/hopcott-family). Reuse rights unverified. |
| 9 | **Maan Farms** · 790 McKenzie Rd, Abbotsford · 49.01630, -122.28221 | Daytime September 12–November 1, generally 9 am–6 pm. Dated advance prices $17 Tuesday, $20 other weekdays, $27 weekends and $31 holiday weekends, before tax and fees. Ages two and under free. Forest Pumpkin Patch, two corn mazes and barnyard. Designated Dog Days. Separate evening festival on select nights October 2–31, listed from $69, with waiver and 14+ recommendation for the haunts. [Daytime operator](https://maanfarms.com/pages/fall-at-the-farm), [dated daytime pricing](https://littlevancouver.ca/outings/maan-fall-at-farm-2026?date=2026-10-28), [evening operator FAQ](https://www.halloweenfrightfestival.com/blank-6), [dated evening listing](https://www.todocanada.ca/city/vancouver/event/haunted-cornmaze-2/) | Daytime last entry, the full archived evening price schedule and accessible field routes were not confirmed. | Added GoToVan’s daytime pumpkin-field photo at Maan Farms. It predates the Forest Pumpkin Patch. [Original](https://www.flickr.com/photos/gotovan/50468762542), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) |
| 10 | **Taves Family Farms** · 333 Gladwin Rd, Abbotsford · 49.00872, -122.31586 | September 12–October 31, 10 am–5:30 pm weekdays and 9:30 am–6 pm weekends/holidays. Sample weekday Fun Pass $24.70 and SuperFUN $30.70 including listed ticket fees. Picking had free entry on weekdays. From September 26, peak weekend/holiday picking at the main farm required a $12.95 Picking Pass for ages 3+ or an activity pass. Activity pass parking was listed at $8.50 per car in the September 27 checkout. The late slot advises arriving by 4:30 pm for time to do all activities. Apples priced by the bag, hayride with SuperFUN, and leashed pets allowed in designated areas. [Operator fall guide](https://www.tavesfamilyfarms.com/magic-of-fall-experience/), [picking pass and entrance](https://www.tavesfamilyfarms.com/apple-u-pick/), [venue FAQ](https://www.tavesfamilyfarms.com/frequently-asked-questions/), [weekday checkout](https://tavesfamilyfarms.ticketspice.com/ab-magic-of-fall-2026?tickets.date=9%2F24%2F2026), [weekend checkout](https://tavesfamilyfarms.ticketspice.com/ab-magic-of-fall-2026?tickets.date=9%2F27%2F2026) | Last admission was not stated separately. | Added GoToVan’s Applebarn pumpkin field and carriage. [Original](https://www.flickr.com/photos/gotovan/51518353333), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) |

---

## 13. Verification and photo audit · Batch 2 of 5

Audited November 13, 2026. This covers Fall positions 11–20 and supersedes the earlier research for these spots. Dates and prices refer to the 2026 season. **Batch 3 starts at Renfrew Ravine Moon Festival.**

The pins below are latitude and longitude. Civic addresses were checked against venue maps and the [BC Address Geocoder](https://digital.gov.bc.ca/bcgov-common-components/bc-address-geocoder/). Pins use mapped public gates, driveways or parking approaches where available. The UBC Apple Festival pin marks the Botanical Garden approach. The festival directs most drivers to the separate shuttle at Thunderbird Parkade. The Fort Langley pin marks the Community Hall cranberry sale, a pedestrian landmark during road closures. The VanDusen events use separate destinations for the Visitor Centre and the West 37th Avenue lot by Floral Hall.

| # | Spot and pin | Verified details and changes | Open details | Photo status |
|---|---|---|---|---|
| 11 | **Krause Berry Farms** · 6179 248 St, Langley · 49.11321, -122.53729 | The farm announced its pumpkin patch and barley maze were open September 27. Farm and patch admission were free, with pumpkins sold separately. Fall farm hours were Wednesday–Sunday, 9:30 am–5 pm. Waffle Bar closed at 3:30 pm and winery last call was 4:30 pm. Confirmed seasonal pumpkin waffles, fall market and on-site parking. No pets or outside food. Removed the tractor ride claim. [Operator hours and policies](https://www.krauseberryfarms.com/pages/hours-contact), [September operator announcement](https://www.findglocal.com/CA/Langley/162377393788088/Krause-Berry-Farms-&-Estate-Winery), [dated tourism guide](https://www.tourism-langley.ca/the-ultimate-guide-to-langley-in-the-fall/) | Patch and maze closing date, last entry, maze-specific terms and accessible field routes were not published in the sources checked. | Temporary local cover of giant pumpkins displayed at Krause from the [farm’s site](https://www.krauseberryfarms.com/). Reuse rights unverified. |
| 12 | **Willow View Farms** · 288 McCallum Rd, Abbotsford · 49.00717, -122.29350 | Tuesday–Sunday and October 12, 10 am–5:30 pm in September and October. Free entry and parking, with no ticket required. The September apple U-pick schedule posted $1.89/lb. The field pumpkin patch and hayrides have ended. Harvested pumpkins and squash are sold at the market. The FAQ lists the petting barn after Labour Day through Halloween. No pets. The current closure notice lists August 2027 for reopening. [Hours](https://www.willowviewfarms.com/home), [activities and closure](https://www.willowviewfarms.com/activities), [archived September U-pick details](https://murray-siemens.squarespace.com/u-pick), [farm FAQ](https://www.willowviewfarms.com/faq) | A separate orchard last-entry cutoff and accessible orchard routes were not published. The FAQ’s November store hours describe typical seasons, while the current notice says the farm is closed. | Temporary local cover of apples on the branch from the [farm’s own orchard page](https://www.willowviewfarms.com/u-pick). Reuse rights unverified. |
| 13 | **Fort Langley Cranberry Festival** · Community Hall, 9167 Glover Rd, Fort Langley · 49.16912, -122.57990 | October 10, 10 am–4 pm, free walk-in street festival. Lions pancake breakfast from 8 am. Tourism Langley listed 125+ vendors and 15+ food trucks. Fresh cranberry sales by the Community Hall. The fort’s stomp and harvest program ran separately under regular historic site admission. Glover Road closed to traffic. [Tourism Langley’s 2026 guide](https://www.tourism-langley.ca/the-ultimate-guide-to-langley-in-the-fall/), [2026 festival and road closures](https://heylangley.ca/posts/cranberry-festival-worth-the-parking/), [Parks Canada schedule](https://www.parcs.canada.ca/lhn-nhs/bc/langley/activ/calendrier-calendar/323293c4-105d-485d-8604-de26ee59c63d), [Community Hall operator and address](https://business.langleychamber.com/list/member/fort-langley-community-improvement-society-16216) | Festival-wide accessibility and pet policies were not confirmed. The civic geocoder matched a different locality for this address, so the app retains the mapped Fort Langley Community Hall landmark. | Added James.bc’s photo of the festival crowd and vendor tents. [Original](https://commons.wikimedia.org/wiki/File:Fort_Langley,_BC_-_Cranberry_Festival_1.jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| 14 | **UBC Apple Festival** · 6804 SW Marine Dr, Vancouver · 49.25429, -123.25040 | October 17–18, 11 am–4 pm. Ages 8–64 paid $12 early bird, $15 advance or $18 onsite. Seniors paid $11/$14/$17. A separate timed Tasting Tent ticket cost $12 for ages 8+ and required festival admission. Ages seven and under needed free tickets for festival admission and for the tasting if attending. Children under 13 needed a guardian over 18. Last bookable festival slot was 2 pm, with later arrival allowed. Last tasting slot was 3:30 pm. No exchanges or refunds except cancellation. Thunderbird Parkade and a free shuttle served the festival. Limited accessible spaces were available near the entrance. Service animals welcome. [Festival and prices](https://botanicalgarden.ubc.ca/apple-festival/), [ticket terms](https://tickets.ubc.ca/Online/default.asp?BOparam%3A%3AWScontent%3A%3AloadArticle%3A%3Aarticle_id=BC9A0934-520D-4F05-AA74-6F052D276632u0026doWork%3A%3AWScontent%3A%3AloadArticle%3DLoadu0026syclid%3Ddalf3beci8ps73dfkjjg), [2026 event map](https://botanicalgarden.ubc.ca/wp-content/uploads/2026/10/2026-3.pdf), [2026 recap](https://botanicalgarden.ubc.ca/news-events/apple-festival-2026-recap/) | Festival terms did not confirm TreeWalk availability or inclusion, so it was removed from the listing. | Temporary local cover of labeled apples in the [UBC Tasting Tent](https://botanicalgarden.ubc.ca/news-events/heritage-and-heart/). Reuse rights unverified. |
| 15 | **VanDusen Harvest Days** · 5251 Oak St, Vancouver · 49.23935, -123.12899 | September 26–October 18 weekends plus October 12, 10:30 am–4:30 pm. The garden closed at 5 pm, with last entry 30 minutes before closing. Regular admission or membership included programming around the Learning Garden and hedge maze. Food sold separately. Online/gate rates were $13.27/$15.81 adult, $10.61/$12.65 senior, $9.28/$11.05 youth and $6.63/$7.90 child before applicable tax and fees. Ages four and under needed a free ticket. Members scanned their pass. Tickets non-refundable. Free accessible parking off West 37th Avenue. Service dogs welcome. [2026 event and Showpass link](https://vancouver.ca/parks-recreation-culture/harvest-days.aspx), [hours and parking](https://vancouver.ca/parks-recreation-culture/vandusen-location-and-hours.aspx), [accessibility](https://vandusengarden.org/plan-your-visit/accessibility/), [mapped Visitor Centre entrance](https://www.openstreetmap.org/node/3218335906) | Final online checkout fees varied from the listed base rate. | Temporary local cover of pumpkins and plaid scarecrows at Harvest Days from [Vancouver Is Awesome’s event feature](https://www.vancouverisawesome.com/events-and-entertainment/vandusen-botanical-garden-fall-event-harvest-days-vancouver-2024-9567968). Reuse rights unverified. |
| 16 | **Nitobe Memorial Garden** · 1895 Lower Mall, UBC · 49.26654, -123.25925 | September 8–October 31, Tuesday–Sunday, 10 am–4:30 pm. Operator’s main page posts winter hours 10 am–3 pm from November 1 to March 31, with holiday and private-event exceptions. Fall $10 adult/$8 concession/$25 family, winter $7 before tax. Tickets sold online or at the garden. Children under 13 require an adult guardian. Paid parking at Fraser River Parkade. Stone paths can be uneven and washrooms are outside the garden. Service animals welcome. [Garden hours](https://botanicalgarden.ubc.ca/nitobe-memorial-garden/), [prices and parking](https://botanicalgarden.ubc.ca/visit/), [2026 seasonal ticket](https://shop.botanicalgarden.ubc.ca/products/nitobe-memorial-garden-admission-3), [accessibility](https://botanicalgarden.ubc.ca/visit/accessibility/) | Archived fall ticket pages also show a generic 2 pm winter close. The app attributes the 3 pm close to the main visitor page. Nitobe-specific last entry and a step-free route were not confirmed. | Added Ruth Hartnup’s pond and autumn foliage photo. [Original](https://www.flickr.com/photos/ruthanddave/1532989052), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) |
| 17 | **Sun Yat-Sen Garden Moon Palace** · 578 Carrall St, Vancouver · 49.27987, -123.10425 | September 26–27, 2–9 pm. Adult $16, senior $13, student/youth $12, family $40 before tax and fees. Youth ages 4–17 and family two adults plus up to three children. Online tickets. Annual passholders could request a discount. Confirmed lanterns on the Jade Pond, performances and mooncake demonstrations. Entry is via Keefer and Carrall to the paid garden. Nearby paid parking and transit, with no visitor lot listed. Garden asks visitors to leave pets home. [Organizer event and prices](https://vancouverchinesegarden.com/events/?type=upcoming), [2026 Eventbrite listing](https://www.eventbrite.ca/e/40th-annual-mid-autumn-festival-moon-palace-tickets-1999046228081), [visitor entrance](https://vancouverchinesegarden.com/visit/), [accessibility](https://vancouverchinesegarden.com/visit/accessibility/) | Festival-specific last entry, under-four pricing and final checkout fees were not confirmed. | Temporary local cover of the actual pavilion and a red lantern among fall foliage from [Tiqets’ garden listing](https://www.tiqets.com/en/vancouver-attractions-c62496/tickets-for-dr-sun-yat-sen-chinese-garden-entry-guided-tour-option-p979755/). This is a venue photo. Reuse rights unverified. |
| 18 | **Darts Hill Garden Park** · 1633 170 St, Surrey · 49.03183, -122.75205 | Regular hours Friday–Sunday, 10 am–4 pm, through September 27. Scarecrow Stroll on open days September 4–27. Free Get Gathering open house September 19, 10 am–4 pm. General admission by donation, $5 suggested, cash or card. Children under 12 with an adult and members enter free. Visitor lot from 16 Avenue via 170 Street. Gravel inclines can limit wheelchair access. Service animals only. [City park page](https://www.surrey.ca/parks-recreation/parks/park-features-amenities/display-feature-gardens/darts-hill-garden-park), [2026 City guide](https://flipbook-surrey-ca.cld.bz/City-of-Surrey-Fall-2026-Recreation-Guide/125/), [conservancy visitor rules](https://dartshill.ca/visit-the-garden/), [parking approach](https://dartshill.ca/wp-content/uploads/2022/04/Info-for-Book-a-Tour.pdf), [September operator posts](https://www.findglocal.com/CA/Surrey/1401405693422216/Darts-Hill-Garden-Park) | One community calendar ended the stroll on September 26. The operator’s September posts explicitly say voting ran through September 27. No separate last entry published. | Temporary local cover of the 2025 Scarecrow Stroll photographed by Susan Murray, from the [conservancy newsletter](https://dartshill.ca/wp-content/uploads/2025/11/The-Oracle-November-2025-V2.pdf#page=10). Reuse rights unverified. |
| 19 | **VanDusen Mushroom Show** · Floral Hall, 5251 Oak St, Vancouver · 49.23817, -123.12883 | October 25, 10 am–5 pm in Floral Hall and the Cedar Room. VanDusen listed entry by donation and the 2026 event notice said $5 with under-12s free. Garden admission separate. Confirmed specimen displays, talks and vendors. Corrected the address to the garden’s public address and routed directions to the free parking lot by the wheelchair-accessible hall. [Society event](https://vanmyco.org/event/vms-fall-mushroom-show-2/), [venue calendar](https://vandusengarden.org/explore/events/2026/03/2026-horticulture-shows-events/), [dated event notice](https://stayhappening.com/e/45th-annual-fall-mushroom-show-E2ISYYUKQEN), [official venue map](https://vancouver.ca/files/cov/vandusen-botanical-gardens-visitor-map.pdf), [mapped hall](https://www.openstreetmap.org/way/229955806) | The $5 notice and venue donation listing differ. No separate advance-booking, last-entry or show-specific animal terms were published. | Temporary local cover of specimen tables at the 2019 show by Rich Sobel, from the [Burke Mountain Naturalists newsletter](https://www.burkemountainnaturalists.ca/wp-content/uploads/2024/07/BMN_NL-2019-11-309.pdf#page=4). Reuse rights unverified. |
| 20 | **Stewart Farm Harvest Fair** · 13723 Crescent Rd, Surrey · 49.06477, -122.84196 | Free September 19, noon–4 pm. Co-hosted by Historic Stewart Farm and Totest Aleng: Indigenous Learning House. Confirmed music, storytelling, artisan market, seasonal food and heritage demonstrations. On-site lot with accessible spaces and overflow a three-minute walk away. Farm trails are packed gravel and the buildings have first-floor access. [City’s 2026 event](https://www.surrey.ca/news-events/events/harvest-fair), [farm visitor information](https://www.surrey.ca/arts-culture/historic-stewart-farm/plan-your-visit), [City accessibility guide](https://www.surrey.ca/about-surrey/accessibility-services) | Vendor count, specific food trucks and event-specific pet or last-entry policies were not confirmed. | Temporary local cover of the fair’s hay and farm buildings from [Family Fun Vancouver](https://www.familyfuncanada.com/vancouver/historic-stewart-farm/). Reuse rights unverified. |

All ten covers were previewed with the app’s centered 52 × 52 thumbnail crop and a 360 × 240 detail gallery crop. The render tests cover the bundled photos, gallery credits, an unaudited placeholder and the audited directions URLs on iOS and Android.

---

## 14. Verification and photo audit · Batch 3 of 5

Audited November 13, 2026. This covers Fall positions 21–30. Dates and prices refer to 2026. **Batch 4 starts at Grave Tales at Fort Langley.**

Directions use the starting venue or the public approach. Civic locations were checked against the [BC Address Geocoder](https://digital.gov.bc.ca/bcgov-common-components/bc-address-geocoder/) and event maps. The train pin marks the 88 Avenue park entrance, with a walk to the station. The trolley pin marks the booking partner’s curbside pickup.

| # | Spot and pin | Verified details and changes | Open details | Photo status |
|---|---|---|---|---|
| 21 | **Renfrew Ravine Moon Festival** · Slocan Park, 2750 E 29th Ave, Vancouver · 49.24455, -123.04703 | September 7–26. September 26 main day was free with optional RSVP. Harvest Fair 4–7 pm, procession 7–7:15 pm and Streamside Lanterns 7:15–9:15 pm. The lantern installation was at Renfrew Community Park, 2929 E 22nd Ave. Paid and separately registered workshops included $10 lantern sessions. Confirmed artisan booths, veggie contest and performances. The pin leads to the park approach near 29th Avenue Station. [Organizer schedule](https://stillmoonarts.ca/2026-renfrew-ravine-moon-festival/), [main-day RSVP](https://www.eventbrite.ca/e/renfrew-ravine-moon-festival-main-day-events-tickets-1997122275487) | Event-specific parking, pet rules and a continuous step-free route were not confirmed. | Rod Raglin’s 2024 Streamside Lanterns photograph. [Original](https://www.flickr.com/photos/78791029@N04/54018135679/), [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) |
| 22 | **Haney House Apple Harvest Fest** · 11612 224 St, Maple Ridge · 49.21307, -122.60225 | September 20, 11 am–2 pm, by donation with no registration required. House tours, lawn games and apple crafts. A dated listing also reported orchard apple samples and cider. The municipal Heritage Walk passes the orchard and the house. [Museum event](https://mapleridgemuseum.org/apple-harvest-fest/), [2026 city guide](https://user-nov9gru.cld.bz/Fall-2026-Program-Guide1/41), [2026 apple and cider listing](https://www.familyfuncanada.com/vancouver/apple-harvest-festival/), [heritage walk](https://www.mapleridge.ca/media/file/port-haney-heritage-walk-brochure) | The family listing used the separate Maple Ridge Museum address. The operator and city guide both locate the event at Haney House. Parking, house accessibility, pets and last tour entry were not published in the event notice. | Temporary cover of apples from the [museum’s 2023 Culture Days listing](https://culturedays.ca/en/events/fd25b7f7-69d2-4882-a74c-6aceb12ffb17). Reuse rights unverified. |
| 23 | **Granville Island Day of the Dead Market** · 1500 Old Bridge St, Vancouver · 49.27002, -123.13510 | October 31, 11 am–11 pm with Catrina Party from 7 pm. November 1, 11 am–8 pm. Market by donation. Workshops $5–$20 with limited places and separate booking. The market, food and party were on Old Bridge Street. The altar and workshops were at Ocean Artworks Pavilion, 1531 Johnston St. Confirmed artisan stalls and scheduled mariachi. Granville Island publishes parking and transit directions. [Organizer schedule and workshop tickets](https://latincouver.ca/lahm/events/day-of-the-dead-celebration-granville-island/), [dated admission and venue details](https://myvancity.ca/2026/10/23/latin-american-heritage-month-day-of-the-dead-festivities/), [island access](https://granvilleisland.com/directions-and-parking) | No separate last-entry time or event-specific pet and accessibility policy was confirmed. | Temporary cover of a market stall with papel picado from [MOSAIC engage](https://engage.mosaicbc.org/blog/events-in-vancouver-day-of-the-dead-market). Reuse rights unverified. |
| 24 | **Burnaby Haunted Village** · Carousel Gate, 6501 Deer Lake Ave, Burnaby · 49.24068, -122.96779 | October 23–25 and 30–31, 4–9 pm. Timed entry through 8 pm in dated listing. Advance $12 adult/$7 ages 2–12, gate $15/$10 if available, under two free. $2 exchange fee per ticket. Halloween-only trick-or-treating, carousel closed, café to 8:30 pm. Paved paths and most facilities accessible. Service animals only. Limited parking. The other public gate is off Canada Way and Sperling. [City event, tickets and FAQs](https://www.burnaby.ca/recreation-and-arts/events/haunted-village), [2026 entry windows](https://kidsfun.ca/haunted-village-burnaby-village-museum-2026-family-guide/), [mapped Carousel Gate](https://www.openstreetmap.org/node/7363459292) | Archived checkout does not establish any additional fees or how late a timed ticket could be redeemed. | Temporary cover of the museum’s ghost display from the [City of Burnaby gallery](https://www.burnaby.ca/recreation-and-arts/events/haunted-village). Reuse rights unverified. |
| 25 | **Fright Nights at Playland** · East Hastings at Windermere, Vancouver · 49.28153, -123.03618 | Select nights October 7–31 from 6 pm. TicketLeader listed closing by date. Advance $39/$49/$59, day-of $45/$59/$69. Seven houses and operating rides included. Rapid Pass $56 advance/$58 day-of for one express visit per house and five select rides. Ages 13+ recommended. No re-entry. Bags limited to 8.5 × 11 inches, with paid bag check. Paid parking and accessible washrooms, with service animals subject to venue rules. [Official admission](https://frightnights.ca/admission/), [TicketLeader](https://ticketleader.evenue.net/events/fright-nights), [guest services and accessibility](https://frightnights.ca/guest-services/), [mapped Playland gate](https://www.openstreetmap.org/node/14160432106) | Sources give differing ride counts and some conflicting closing times. The app uses the date-specific ticket schedule and omits a fixed ride count. Individual queue cutoffs can vary. | Temporary cover of the illuminated Carn-Evil entrance from [La Carmina’s event coverage](https://lacarmina.com/blog/2019/10/vancouver-halloween-attractions-gothic-pne-fright-nights-gardens-pumpkins/). Reuse rights unverified. |
| 26 | **Canyon Frights at Capilano** · Ticket plaza, 3735 Capilano Rd, North Vancouver · 49.34222, -123.11396 | October 9–November 1, entry 10 am–8 pm and until 9 pm October 23–25 and October 30–November 1. Guests could remain another hour. Event included in park admission, with $79.95 adult window pricing before tax and ages five and under free. Under 15 needs an adult 18+. Passholders reserve. Confirmed the orange bridge, scavenger hunt and Halloween displays. Dogs must be leashed. Bridge, Cliffwalk and Treetops Adventure are not wheelchair accessible. Paid lot and free downtown shuttle. [Operator media and dated announcement](https://www.capbridge.com/media/), [event](https://www.capbridge.com/events/canyon-frights/), [ticket policies](https://www.capbridge.com/tickets-and-hours/), [shuttle schedule](https://www.capbridge.com/shuttle-schedule/), [park FAQ](https://www.capbridge.com/faq/), [mapped ticket plaza](https://www.openstreetmap.org/node/11372473018) | The operator’s event page now points to 2027 but still shows the earlier hours. The dated press and shuttle pages corroborate the 2026 run. Historic online checkout tiers were not confirmed. | Temporary cover of the actual bridge illuminated orange from the [operator’s Canyon Frights gallery](https://www.capbridge.com/events/canyon-frights/). Reuse rights unverified. |
| 27 | **Lost Souls of Gastown** · Monaco Café, 356 Water St, Vancouver · 49.28452, -123.11044 | The 2026 Halloween schedule ran nightly at 7 pm with extra times. $35 adult and $32 youth or senior. Youth pricing covers ages 18 and under or full-time students with ID. All minors need an adult and the operator recommends 12+. Meet outside Monaco Café and end at Maple Tree Square. The 1.5 km route has cobbles and a short hill and accommodates powered wheelchairs. Service dogs allowed. Nearby paid lots and Waterfront Station. The operator offers a refund until 24 hours before start and credit after that. [Tour, prices and FAQ](https://forbiddenvancouver.ca/lost-souls-of-gastown-vancouver-tour/), [dated Halloween schedule](https://forbiddenvancouver.ca/halloween-vancouver-2026/), [mapped meeting point](https://www.openstreetmap.org/node/3949417577) | The full archive of extra Halloween departures and late arrival terms was not confirmed. | Temporary cover of a costumed tour storyteller from [Forbidden Vancouver](https://forbiddenvancouver.ca/lost-souls-of-gastown-vancouver-tour/). Reuse rights unverified. |
| 28 | **Haunted Halloween Trolley** · North side of 900 W Cordova St, Vancouver · 49.28713, -123.11512 | Select dates October 8–November 1. The 6 pm booking was listed at CA$74 adult through a partner, with pickup between 5:45 and 6 pm. Tour takes 2–2.5 hours, runs rain or shine, uses occasional flashing lights and is designed for 13+. Confirmed the north side of the 900 block as the ticket pickup. [Operator’s tour](https://greatcanadiantrolley.com/guided-day-tours/haunted-halloween-trolley-tour/), [dated booking with curb instructions](https://www.expedia.ca/things-to-do/vancouver-haunted-halloween-trolley-tour.a53856626.activity-details), [2026 dates](https://www.destinationvancouver.com/inspirations/events/vancouver-s-scariest-haunted-attractions-and-halloween-experiences) | The general operator page says 999 Canada Place. The booking instructions give the more specific West Cordova curb. Full departure times, direct checkout prices, boarding accessibility and pet rules were not confirmed. | Temporary cover of a real trolley from [the operator’s Gray Line gallery](https://www.grayline.com/tours/vancouver-city-tour/). The photo shows the vehicle in daylight. Reuse rights unverified. |
| 29 | **Bear Creek Halloween Train** · 13750 88 Ave, Surrey · 49.16272, -122.84106 | Pumpkin Express October 1–31, 10 am–5 pm, $12 plus tax, station sales only. Decorated ride with a pumpkin and treat. Scream Train October 16–November 1, evening slots varied by date. Sample online ticket $18 plus $0.90 tax. Online tickets use an hourly window and get priority over walk-ins. Night rides recommended for 12+. Both use the same station. Directions mark the park driveway off 88 Avenue because the event’s civic geocoder resolves to the Arts Centre. [Operator night checkout](https://www.bctrains.com/event-details/halloween-scream-train-2026-2026-10-28-20-00), [operator FAQ](https://www.bctrains.com/frequently-asked-questions), [dated daytime prices](https://surreyinsider.com/event/halloween-pumpkin-day-train-bear-creek-park/), [day and night dates](https://www.familyfuncanada.com/vancouver/halloween-train-at-bear-creek/), [mapped park access](https://www.openstreetmap.org/way/1431886620) | The exact station door pin, train boarding accessibility, pet rules, final ride cutoffs and how the under-two policy applies across both trains were not confirmed. | Temporary cover of the actual engine among Halloween decorations from [Bear Creek Park Train](https://www.bctrains.com/mini-golf). Reuse rights unverified. |
| 30 | **Cougar Creek House of Horrors** · 12530 72 Ave, Surrey · 49.13380, -122.87585 | Select evenings October 2–November 1, generally 7–10 pm. Five houses and stage show. Standard $39.99–$49.99, Speed Pass $59.99–$69.99, and Horrors Jr. from $19.99 before fees. Separate lights-on junior sessions on October 10–11, 17–18, 24–25 and 31, 4–6 pm. Whisper Night November 1. Main show recommended 14+, and ages 13 and under need an adult. Free on-site parking and R6 stop out front. [Operator and attractions](https://www.cougarcreekhouseofhorrors.com/), [2026 checkout](https://cougarcreekhoh2026.fearticket.com/book/calendar), [dated ticket tiers and schedule](https://www.todocanada.ca/city/vancouver/event/potters-house-horrors/) | Closed checkout does not show final fees. Last admission, accessibility of individual houses, and pet rules were not confirmed. | Temporary cover of costumed performers at Cougar Creek from [Curiocity’s coverage](https://curiocity.com/cougar-creeks-house-of-horrors/). Reuse rights unverified. |

Previewed all ten covers at 52 × 52 and at a representative 360 × 240 gallery size. Render coverage checks the cards, gallery credits and placeholder behaviour, plus directions URLs on iOS and Android.

## 15. Verification and photo audit · Batch 4 of 5

Audited November 13, 2026. This covers Fall positions 31–40. Dated event and admission details refer to 2026. **Batch 5 starts at Buntzen Lake.**

| # | Spot and directions pin | Verified or corrected | Unresolved | Photo |
|---|---|---|---|---|
| 31 | **Grave Tales at Fort Langley** · Visitor Centre, 23433 Mavis Ave, Fort Langley · 49.16867, -122.57279 | Four advance-booked Parks Canada tours. Youth Grave Tales ran October 17 and 24, 6–7:30 pm, $24.58 for each visitor, ages 8+ with a paying adult. Ages 18+ for the other tours. Spirit of the Place ran October 16, 18, 23, 25 and 30, 7–8:30 pm, $24.58. Graves of the Tradesmen ran October 16–18, 23–25 and 30, 8–10 pm, $31.58, about 4 km. Descent into Darkness ran October 16, 17, 24, 25 and 30, 9 pm–midnight, $44.97. Parks Canada contacted guests to arrange payment. Full refunds were available at least 48 hours ahead. Main visitor lot is free. General site rules restrict pets inside the fort. [Dated Parks Canada schedule and booking](https://www.parcs.canada.ca/lhn-nhs/bc/langley/activ/calendrier-calendar/edc25019-d7a3-45b2-bfd3-2b3b053a52bf), [Visitor Centre GPS](https://parks.canada.ca/lhn-nhs/bc/langley/info/contact), [site visitor rules](https://parks.canada.ca/lhn-nhs/bc/langley/visit) | Event header ends October 31. The detailed calendar ends October 30. Tour-specific step-free routes, late arrival and after-hours lot access were not confirmed. | Temporary Parks Canada photo of a lantern-lit tour group from its [earlier Grave Tales listing](https://parks.canada.ca/lhn-nhs/bc/langley/activ/calendrier-calendar/6b566c1d-f6b6-4385-be7b-ff4cb56a7383). Reuse rights unverified. |
| 32 | **Steveston Scarecrow Crawl** · Steveston Tram, 4011 Moncton St, Richmond · 49.12531, -123.18014 | Free, self-guided crawl October 1–31. Outside displays can be seen independently, with indoor displays subject to host hours. The Tram is a suggested starting point. It was open Tuesday–Sunday 10 am–5 pm through October 5 and 10 am–4 pm from October 6, with statutory holidays excluded. Free three-hour street and community centre parking. The museum has an accessible entrance and walkway beside the car. Steps lead into the tram car. [Merchants’ calendar](https://stevestonmerchants.com/events/), [dated Tourism Richmond listing](https://www.visitrichmondbc.com/blogs/activities-attractions/october-in-richmond-bc/), [Tram address and access](https://stevestonheritage.ca/visit/steveston-tram/plan-your-visit/), [BC civic access point](https://geocoder.api.gov.bc.ca/addresses.json?addressString=4011%20Moncton%20St%20Richmond&maxResults=1&locationDescriptor=accessPoint&setBack=8) | Individual merchants’ display hours, pet policies and access vary. | Temporary cover of the Miss Agatha scarecrow outside the Tram from [Steveston Heritage’s 2024 crawl coverage](https://stevestonheritage.ca/2024/10/01/steveston-scarecrow-crawl-2024/). Reuse rights unverified. |
| 33 | **Central Spark** · Central Park’s Patterson pedestrian entrance, Burnaby · 49.23182, -123.01285 | Free all-ages drop-in event October 30, 6–8 pm. DJ, roaming performers, pumpkin carving and food trucks. Weather-dependent drone show scheduled for 7:15 pm and fireworks for 7:30 pm. The event area was level and unpaved. The city asked visitors to leave pets at home and welcomed service animals. Patterson closed to vehicle traffic 3–11 pm. Pick-up and drop-off on Olive Avenue, and accessible parking at Swangard Stadium off eastbound Kingsway. [City event and access](https://www.burnaby.ca/recreation-and-arts/events/central-spark), [mapped Patterson gate](https://www.openstreetmap.org/node/8099389587) | The drone show’s actual operation was not confirmed. | Temporary aerial photo of Central Spark fireworks from the [City of Burnaby’s event announcement](https://www.burnaby.ca/our-city/news/2025-09-18/spooktacular-halloween-events-burnaby-all-ages). Reuse rights unverified. |
| 34 | **Tynehead Hatchery** · Hatchery lot, 16585 96 Ave, Surrey · 49.17755, -122.76105 | Free salmon viewing from Serpentine River bridges, with mid-October through November a typical viewing window for coho, chum and Chinook. The Hatchery Trail and Salmon Habitat Loop are listed as accessible, with accessible washrooms at Serpentine Fields. Leash dogs on these trails. The park opens at 7 am, with posted seasonal closing as early as 5 pm. [Hatchery operator](https://tyneheadhatchery.ca/tynehead-hatchery-history/), [volunteer hours](https://tyneheadhatchery.ca/volunteer/), [City of Surrey park page](https://www.surrey.ca/parks-recreation/parks/tynehead-regional-park), [Metro Vancouver park map](https://metrovancouver.org/services/regional-parks/Documents/tynehead-regional-park-brochure.pdf), [mapped 96 Avenue lot](https://www.openstreetmap.org/way/86788772) | Regular hatchery admission hours and hatchery interior accessibility were not confirmed. Salmon activity varies with the run. | Temporary cover of spawning salmon in Tynehead from [Henry’s Take](https://henrystake.com/tynehead-regional-park/). Reuse rights unverified. |
| 35 | **Hoy Creek Hatchery** · Hoy Creek Trail near Guildford Way, Coquitlam · 49.28698, -122.79711 | The pin marks the hatchery on the walking trail. Free Salmon Come Home event October 25, 11 am–3 pm, rain or shine. Walk from Guildford Way or Lafarge Lake–Douglas Station. Event parking was available at Town Centre Park and in the aboveground City Hall staff lot off Burlington Drive, free on Sundays. Regular open houses on the first Saturday, 9:30–11:30 am, except July and August. Keep people and dogs out of the creek. [Hatchery access and regular hours](https://www.hoyscottcreeks.org/visit), [organizer event](https://www.hoyscottcreeks.org/calendar/salmon-come-home), [City of Coquitlam’s 2026 event notice](https://coquitlam.ca/m/newsflash/Home/Detail/2053), [mapped hatchery building](https://www.openstreetmap.org/way/166130517) | The hatchery interior’s step-free access and a separate last entry time were not confirmed. | Temporary cover of a volunteer displaying a chum at [Salmon Come Home](https://www.hoyscottcreeks.org/calendar/salmon-come-home). Source credited to Hoy-Scott Watershed Society. Reuse rights unverified. |
| 36 | **Reifel Bird Sanctuary** · Visitor lot and gift shop, 5191 Robertson Rd, Delta · 49.09803, -123.17839 | Follow the signed turnoff to the visitor lot. Open 9 am–4 pm and closed Mondays with select statutory holiday exceptions. Reserve a free visit slot from three days ahead until 8 am on the visit day. One reservation covers the vehicle and its passengers. Last entry 3 pm for reservations or 2:30 pm for drop-ins if there is room. Admission at the gift shop is $10 adult, $8 ages 65+ and $7 ages 2–14. Wheelchairs and strollers are allowed. The operator lists accessible facilities except the observation tower. The operator excludes pets, bikes and drones. Snow geese and other migrating waterfowl return in fall. [Operator’s October 2026 visitor terms](https://www.reifelbirdsanctuary.com/planning.html), [booking](https://reifelsanctuary.calendarspots.com/main.php?c=369045158745&language=english), [facility access](https://reifelbirdsanctuary.com/wtosee.html), [federal sanctuary species information](https://www.canada.ca/en/environment-climate-change/services/migratory-bird-sanctuaries/locations/george-c-reifel.html), [mapped lot](https://www.openstreetmap.org/way/123281119) | Route-level wheelchair suitability and future holiday openings vary. The operator’s group-program page lists conflicting concession prices, so the app uses the dated public admission page. | Snow geese in flight at Reifel by ShayneKayePhoto. Resized and credited under [CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Reifel_Bird_Sanctuary_Snow_Geese.jpg). |
| 37 | **Kanaka Creek Fish Fence** · Fish Fence lot, 23960 Kanaka Creek Rd, Maple Ridge · 49.19936, -122.55840 | Moved directions from Bell-Irving Hatchery to the fish fence by the 240th Street bridge. Free self-guided chum and coho viewing, usually mid-October to mid-November. The 2026 Return of the Salmon ran October 18, 11 am–3 pm, with free hourly registrations. Bell-Irving Hatchery and Cliff Falls use the separate 256th Street entrance. [KEEPS address and salmon notes](https://keeps.org/october/), [dated organizer recap](https://keeps.org/return-of-the-salmon-2026/), [dated event terms](https://littlevancouver.ca/outings/kanaka-return-salmon-oct18-2026), [Metro Vancouver meeting points](https://metrovancouver.org/services/regional-parks/Documents/kanaka-creek-regional-park-meeting-locations.pdf), [mapped Fish Fence lot](https://www.openstreetmap.org/way/550192359) | The archived event listing uses 23900. KEEPS lists 23960 for the fish fence, and the pin marks the mapped lot. The operator posts daylight gate hours on-site, with closing as early as 5 pm. Step-free access to the viewing area was not confirmed. [Park brochure](https://metrovancouver.org/services/regional-parks/Documents/kanaka-creek-regional-park-brochure.pdf) | Temporary cover showing visitors on the fish fence walkway in October from [Paul Cipywnyk](https://cipywnyk.com/blog/2018/10/21/kanaka-creek-return-of-the-salmon/). Reuse rights unverified. |
| 38 | **Wings Over Iona** · Iona Beach Regional Park main lot, Ferguson Rd, Richmond · 49.21896, -123.21339 | Free all-ages drop-in festival September 12, 11 am–2 pm. Banding demonstrations, live raptors and hands-on activities at an accessible site by the washroom building. The separate 8:30–10:30 am bird walk required advance registration, ages 10+. Published program prices were $15 adult, $11.25 senior and $7.50 youth. Minors needed an adult, and every attendee needed to register. Parking limited. Free event shuttle from Templeton every 30–45 minutes, first outbound 7:45 am and last return 2:15 pm. The organizer asked guests to leave pets at home. [City of Richmond event](https://www.richmond.ca/culture/calendar/search/Event.aspx?EventID=19110), [Metro Vancouver program guide](https://metrovancouver.org/services/regional-parks/Documents/summer-nature-program-guide.pdf), [bird walk registration](https://ca.apm.activecommunities.com/mvregionalparks/Activity_Search/3466), [archived ticket terms](https://www.yovancouver.com/en/event/event-auto-f637eb29e0caec34d8bb5ce921da8b16), [park map](https://metrovancouver.org/services/regional-parks/Documents/iona-beach-regional-park-map.pdf), [mapped main lot](https://www.openstreetmap.org/way/99979021) | The expired walk registration no longer shows checkout totals. Program guide pricing is recorded. | Temporary cover of a Common Yellowthroat at Iona Island Bird Observatory by [Paula Gomez Villalba for WildResearch](https://wildresearch.ca/stories-in-flight/). Reuse rights unverified. |
| 39 | **Hyde Creek Hatchery** · 3636 Coast Meridian Rd, Port Coquitlam · 49.27853, -122.75974 | Fall chum and coho viewing from the trail. The Annual Salmon Return is scheduled for November 21, 9 am–2 pm, with free, family-friendly volunteer-led tours lasting about 20 minutes. Limited parking at the hatchery. The event lists Hyde Creek Recreation Centre, 1379 Laurier Ave, for overflow parking and creek trail access. [Operator and access](https://www.hydecreek.org/facility), [dated tour announcement](https://www.burkemountainnaturalists.ca/events-calendar/hyde-creek-hatcherys-free-annual-salmon-return-tours/), [Pacific Salmon Foundation viewing guide](https://psf.ca/blog/salmon-spotting-tricities/), [DFO hatchery map](https://www.dfo-mpo.gc.ca/aquaculture/bc-cb/maps-cartes-eng.html?wbdisable=true) | Exact last tour, registration requirements, pet rules and the step-free tour route were not published in the event material reviewed. | Temporary photo of salmon spawning in Hyde Creek in November by [Nicolas Untz](https://medium.com/%40nuntz/spawning-salmon-at-hyde-creek-56e3e36574df). Reuse rights unverified. |
| 40 | **Boundary Bay Fall Bird Migration** · Centennial Beach lot, 300 Boundary Bay Rd, Delta · 49.01562, -123.04177 | Free self-guided birding from the Centennial Beach lot north along the 12 Avenue Dyke Trail. Mostly firm gravel, accessible washrooms at Centennial Beach, gates open at 7 am with seasonal closing as early as 5 pm, and signed wildlife areas where dogs are excluded. Leash dogs where permitted. Bird activity varies with tide and migration. Removed the fixed 4 km return distance. [City of Delta park page](https://www.delta.ca/parks-recreation/parks-trails/park-and-amenity-search/boundary-bay-regional-park), [Metro Vancouver brochure](https://metrovancouver.org/services/regional-parks/Documents/boundary-bay-regional-park-brochure.pdf), [park map](https://metrovancouver.org/services/regional-parks/Documents/boundary-bay-regional-park-map.pdf), [mapped lot](https://www.openstreetmap.org/way/24594442) | Species sightings and accessible trail conditions vary. Visitors can choose their turnaround point. | Temporary cover of a Northern Pintail photographed at Centennial Beach in November by Brian Avent, from the [Delta Naturalists’ field outing](https://deltanaturalists.org/2025/11/12/delta-naturalists-outing-to-centennial-beach-november-12-2025/). Reuse rights unverified. |

Previewed all ten covers at 52 × 52 and at a representative 360 × 240 gallery size. Render coverage checks the photos and source credits, the remaining placeholder at Buntzen Lake, and the iOS and Android directions URL for each audited destination.

## 16. Verification and photo audit · Batch 5 of 5

Audited November 13, 2026. This covers Fall positions 41–50 and completes the Fall catalogue audit. Dated closures, ticket prices, and seasonal schedules refer to 2026.

| # | Spot and directions pin | Verified or corrected | Unresolved | Photo |
|---|---|---|---|---|
| 41 | **Buntzen Lake** · South Beach parking, Sunnyside Rd, Anmore · 49.33766, -122.85702 | BC Hydro lists the loop as 8 km and 4–5 hours with a suspension bridge and a floating bridge. The 1 km Energy Trail is a shorter option. Free entry and parking. Free vehicle reservations applied May 14–September 7 in 2026, with first-come parking afterward. Gates opened at 8 am and closed at 6 pm October 12–25, 5:30 pm October 26–November 1, and 4:30 pm from November 2. The rockslide closure on Powerhouse Road is between North Beach and Buntzen Dam. Leash dogs outside the designated areas and dog trail. [BC Hydro visitor information](https://www.bchydro.com/community/recreation_areas/buntzen_lake.html), [trail descriptions and alerts](https://www.bchydro.com/community/recreation_areas/buntzen_lake_trails.html), [2026 reservations](https://www.bchydro.com/news/press_centre/news_releases/2026/buntzen-lake-summer-parking-reservations.html), [mapped South Beach lot](https://www.openstreetmap.org/way/215865460) | Rockslide reopening date and a step-free route around the lake were not published. | Temporary October photo of yellow trees reflected in the lake from the [Vancouver Trails photo contest](https://www.vancouvertrails.com/contest/gallery/2014/photo/buntzen-lake-fall-colours/). Photographer name and reuse rights unverified. |
| 42 | **Queen Elizabeth Park** · Summit drop-off near Seasons in the Park, 4600 Cambie St, Vancouver · 49.24160, -123.11226 | Free outdoor gardens and summit plaza, with paid parking. The separate conservatory was open 10 am–5 pm September 8–October 31 and 10 am–4 pm in November and December, except December 25. Last entry 15 minutes before closing. Before tax, 2026 admission was $9.50 adults, $7.60 seniors 65+, $6.65 ages 13–18, $4.75 ages 5–12, and free through age four. Adult online advance ticket saves $1. The indoor path is accessible and service dogs are welcome. Children under 13 need supervision. The lower-lot path and stairs are scheduled to close November 16–20, with the City directing visitors to the upper lot. [City park page](https://vancouver.ca/parks-recreation-culture/queen-elizabeth-park.aspx), [official park map](https://vancouver.ca/files/cov/queen-elizabeth-park-map%281%29.pdf), [admission and terms](https://vancouver.ca/parks-recreation-culture/Prices-and-memberships.aspx), [Showpass](https://www.showpass.com/o/bloedel-conservatory/), [hours and access](https://vancouver.ca/parks-recreation-culture/bloedel-conservatory.aspx), [mapped summit approach](https://www.openstreetmap.org/way/37393608) | Posted parking rates and step-free routes through every outdoor garden section were not confirmed. | Autumn waterfall at Queen Elizabeth Park by [Analise Zocher](https://commons.wikimedia.org/wiki/File:Queen_Elizabeth_Park_in_autumn_2017.jpg), resized, CC BY 2.0. |
| 43 | **Pacific Spirit Park** · Spanish Banks West lot, NW Marine Dr, Vancouver · 49.27759, -123.22519 | Moved directions from the W 16th Ave Park Centre to the lot opposite the Admiralty approach. The free walk connects Admiralty, Salish and West Canyon trails. Starting October 1, 2026, the beach lots offered two free hours per day through March, then $3 per additional hour. The City lists a $0.45 transaction fee for third-party payment apps and no transaction fee at a meter. Trail surfaces and dog access vary by segment, with leash-required, leash-optional and dog-free areas identified on the official map. [Metro Vancouver park](https://metrovancouver.org/services/regional-parks/park/pacific-spirit-regional-park), [official trail map](https://metrovancouver.org/services/regional-parks/Documents/pacific-spirit-regional-park-map.pdf), [City parking notice](https://vancouver.ca/parks-recreation-culture/spanish-bank-beach.aspx), [mapped Admiralty Trail](https://www.openstreetmap.org/way/39939915), [mapped parking lot](https://www.openstreetmap.org/way/116785523) | Could not corroborate the previous listing’s November 2 closure schedule or its exact reopening date for the Admiralty segment. The app points to posted hours and current alerts. | November forest light and leaves in Pacific Spirit by [popejon2](https://commons.wikimedia.org/wiki/File:Pacific_Spirit_Park_(5157019015).jpg), resized, CC BY 2.0. |
| 44 | **Stanley Park** · Lost Lagoon viewing plaza at Alberni and Chilco, Vancouver · 49.29433, -123.13782 | Pin marks the southeast walking approach rather than the lagoon interior. Free walk via Lost Lagoon, the Rowing Club and optionally Brockton Point. Pay parking year-round. Follow posted pedestrian detours around the Chilco Street water tunnel work. Free Nature House is open weekends 10 am–4 pm September–June. Its approach includes a short unpaved section, and flood barriers affect wheelchair access November–February. Seawall work beyond the featured walk closed Lumberman’s Arch to Third Beach through November 14, with intermittent closures possible through November 20. [City lagoon page](https://vancouver.ca/parks-recreation-culture/lost-lagoon.aspx), [Nature House operator](https://stanleyparkecology.ca/education/nature-house/), [Chilco Street tunnel work](https://metrovancouver.org/services/water/ConstructionDocuments/fact-sheet-stanley-park-water-supply-tunnel-chilco-street-shaft-site.pdf), [paid parking](https://vancouver.ca/parks-recreation-culture/stanley-park-parking.aspx), [dated seawall project](https://vancouver.ca/parks-recreation-culture/stanley-park-seawall-safety-and-accessibility-upgrades.aspx), [mapped walking plaza](https://www.openstreetmap.org/way/363832218) | Parking tariffs vary by location and time. Fall colour depends on conditions. | Late-October reflections at Lost Lagoon by [Adam Jones](https://commons.wikimedia.org/wiki/File:At_Lost_Lagoon_-_Stanley_Park_-_Vancouver_-_BC_-_Canada_-_02_(37943485202)_(2).jpg), resized, CC BY-SA 2.0. |
| 45 | **Deer Lake Park** · Deer Lake Beach lot off Sperling Ave, Burnaby · 49.23590, -122.96527 | Directions now use the beach lot and lake path. Free entry, dawn to dusk, with lots closing at 10 pm. East beach access has seven designated accessible stalls and a nearby accessible washroom. Trails use gravel, packed dirt and boardwalk, with some grades and exposed roots. Dogs leashed and excluded from beach and picnic area. The City’s September 21 boardwalk closure at the boat launch has a signed detour via Sperling and Deer Lake Drive, adding about five minutes. Confirmed Japanese maples at Eagles Estate. [City park and dated alert](https://www.burnaby.ca/explore-outdoors/parks/deer-lake-park), [City parking map](https://www.burnabyvillagemuseum.ca/assets/Visitor~Info/Parking%20Options.pdf), [beach trailhead coordinates](https://www.vancouvertrails.com/trails/deer-lake/) | The operator gives a winter 2027 target for the boardwalk, with no exact reopening day. Distance depends on which connecting paths and detours are used. | Temporary photo of Deer Lake on a misty autumn morning by [D70](https://www.flickr.com/photos/d70w7/53233792504). Reuse permission unverified. |
| 46 | **Campbell Valley Park** · North Valley lot, 20290 16 Ave, Langley · 49.02974, -122.66083 | Moved directions from the South Valley side to the start of the flat, 2.3 km Little River Loop. Free entry and parking. The operator lists the loop and North Valley washrooms as accessible. Shaggy Mane is 11 km and shared with horses. Leash dogs outside the signed 4 Avenue off-leash area. Dated 2026 hours were 7 am–7 pm October 6–November 2 and 7 am–6 pm November 3–December 31. [Metro Vancouver park](https://metrovancouver.org/services/regional-parks/park/campbell-valley-regional-park), [brochure and accessibility](https://metrovancouver.org/services/regional-parks/Documents/campbell-valley-regional-park-brochure.pdf), [2026 hours and McLean Pond notice](https://www.trendstoday.ca/things-to-do/campbell-valley-regional-park-day-trip-guide-2026), [mapped North Valley lot](https://www.openstreetmap.org/way/91897508) | The dated notice lists eastern McLean Pond trail and lot work without a reopening date. | Little River Loop boardwalk in spring by [Colin W](https://commons.wikimedia.org/wiki/File:Campbell_Valley_Regional_Park_-_panoramio.jpg), resized, CC BY-SA 3.0. The photo shows the route in the listing. |
| 47 | **UBC Main Mall** · Memorial Rd at Koerner Library, UBC Vancouver campus · 49.26768, -123.25492 | Free, paved pedestrian promenade with red oaks. The pin is at the Memorial Road crossing, with Fraser River and Rose Garden parkades for paid vehicle parking. Nitobe is a separate ticketed visit. [UBC fall foliage](https://visit.ubc.ca/2019/09/4-places-to-enjoy-fall-foliage-at-ubc/), [Main Mall venue map](https://planning.ubc.ca/about-us/film-outdoor-events-outdoor-signage/location-library/main-mall), [September 2026 campus map](https://planning.ubc.ca/sites/default/files/2026-09/V_CampusMapPortrait_Sep2026.pdf), [UBC Parking](https://parking.ubc.ca/map), [mapped crossing](https://www.openstreetmap.org/node/9793689899) | Campus parking rates and temporary pedestrian detours can change. There is no fixed fall colour peak. | Temporary autumn photo looking along Main Mall from [Visit UBC](https://visit.ubc.ca/2019/09/4-places-to-enjoy-fall-foliage-at-ubc/). Individual photographer and reuse rights unverified. |
| 48 | **Trout Lake** · John Hendry Park north lot, E 13th Ave near Lakewood Dr, Vancouver · 49.25599, -123.06540 | Free park and lake loop, with standard City park hours of 6 am–10 pm unless posted otherwise. Moved pin to the north lot used by the market. The 2026 market ran April 4–October 31, Saturdays 9 am–2 pm, with no general market parking and four accessible spaces near Templeton Drive. Dogs can go off leash in the designated north area and must be leashed elsewhere. [City park finder](https://covapp.vancouver.ca/parkfinder/parkdetail.aspx?inparkid=85), [dog rules](https://vancouver.ca/parks-recreation-culture/dog-off-leash-areas.aspx), [2026 market operator](https://eatlocal.org/markets/trout-lake/), [mapped north lot](https://www.openstreetmap.org/way/284769323) | Whole-loop wheelchair suitability in wet weather was not confirmed. | November foliage, mountain backdrop and reflections by [David Zhang](https://commons.wikimedia.org/wiki/File:Autumn_at_Trout_Lake,_Vancouver_(54210905867).jpg), resized, CC BY-SA 2.0. |
| 49 | **Burnaby Mountain Park** · Upper lot, 100 Centennial Way, Burnaby · 49.28213, -122.93531 | Free park, dawn to dusk. Main lot closes at 10 pm. The City lists amenities by the Mintara lot as wheelchair accessible and requires leashes. View Kamui Mintara from outside the protective fence. The Velodrome stairs are closed indefinitely between Mountain Air and upper Pandora. [City park page and access](https://www.burnaby.ca/explore-outdoors/parks/burnaby-mountain-conservation-area), [mapped upper lot](https://www.openstreetmap.org/way/40703744) | A dated guide reported the November 9–13 Centennial Way and lot closure. The park page did not show that notice at audit time, and exact reopening was not independently confirmed. [Dated closure report](https://burrardbulletin.ca/9-places-to-see-the-northern-lights-near-vancouver-when-they-show-up/) | Temporary autumn photo of a bench and maple colour by [Ann Badjura](https://www.flickr.com/photos/23980543@N04/10443665114). Reuse permission unverified. |
| 50 | **Hadden Park** · Maritime Museum lot, 1905 Ogden Ave, Vancouver · 49.27752, -123.14662 | Free waterfront walk to Kitsilano Beach. Pay parking and accessible stalls at the Maritime Museum lot. The City’s unfenced sand-and-grass off-leash area is open 6 am–10 pm October–April and 6–10 am plus 5–10 pm May–September. Leash dogs beyond the signed boundary. The paved waterfront route is firmer than the beach. [City park finder](https://covapp.vancouver.ca/ParkFinder/parkdetail.aspx?inparkid=110), [City off-leash schedule](https://vancouver.ca/parks-recreation-culture/dog-off-leash-areas.aspx), [museum parking and access](https://vanmaritime.com/visit/accessibility/), [mapped museum lot](https://www.openstreetmap.org/way/23797627), [Destination Vancouver’s fall maple walk](https://www.destinationvancouver.com/inspirations/outdoors/best-places-to-see-fall-colours-in-vancouver) | Parking rates and step-free access to the sand itself were not confirmed. | English Bay sunset photographed from Hadden Park by [popejon2](https://commons.wikimedia.org/wiki/File:Sunset_from_Hadden_Park_(5846564739).jpg), cropped and resized, CC BY 2.0. It shows the waterfront view. |

Previewed each cover at 52 × 52 and at a representative 360 × 240 gallery size. Render tests check all Fall covers and their gallery credits, the shared placeholder on an existing Winter listing, and both platforms’ directions URLs for the audited destinations.
