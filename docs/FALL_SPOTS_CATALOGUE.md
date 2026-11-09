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
