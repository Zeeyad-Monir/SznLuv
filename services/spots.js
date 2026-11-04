// Fall spot data for the season list, venue pages, favourites and the wheel.
// Plain CommonJS (no React, no assets) so it can be unit-tested directly.
//
// Source of truth: docs/FALL_SPOTS_CATALOGUE.md (researched 2026-11-03).
// Dates and prices in "Good to know" paragraphs are labelled "In 2026" because they change every year.
//
// Two kinds of spots:
//  - legacy spots: the three original farms. They keep their own hand-built screens (see venueNavigation.js),
//    so only list-card data lives here.
//  - detailed spots: rendered by screens/SpotDetailScreen.js from the fields below.
//
// `name` is the list-card name AND the favourites key AND the wheel label, so it must be unique across all
// seasons and must not contain "." or "/" or equal "collections".

const PATCHES = 'Pumpkin Patches & Harvest Farms';
const FESTIVALS = 'Festivals & Gardens';
const HALLOWEEN = 'Halloween & After Dark';
const WILDLIFE = 'Salmon & Wildlife';
const COLOUR = 'Fall Colour Walks';

// Order of sections on the Fall screen.
const fallCategoryTitles = [PATCHES, FESTIVALS, HALLOWEEN, WILDLIFE, COLOUR];

// Original hand-built venue pages (routes live in venueNavigation.js).
const legacyFallSpots = [
  { category: PATCHES, name: 'Aldor Family Farm', address: '24990 84 Ave, Langley' },
  { category: PATCHES, name: 'Eagle Acres Dairy', address: '8796 240 St, Langley' },
  { category: PATCHES, name: 'Laity Pumpkin Patch', address: '12725 Laity St, Maple Ridge' },
];

// Spots rendered by the shared SpotDetailScreen.
//  title/detailAddress: venue page heading and address line
//  tagline:             one-line "activity box"
//  about:               paragraphs for the expandable About text; the last one is the practical "Good to know"
const detailedFallSpots = [
  // ---------------------------------------------------------------- Pumpkin Patches & Harvest Farms
  {
    placeID: 'richmond_country_farms',
    category: PATCHES,
    name: 'Richmond Country Farms',
    address: '12900 Steveston Hwy, Richmond',
    title: 'Richmond Country Farms',
    detailAddress: '12900 Steveston Hwy, Richmond, BC',
    latitude: 49.13301,
    longitude: -123.08376,
    tagline: 'Pumpkin patch, wagon rides, and a farm market!',
    about: [
      'Richmond Country Farms turns its fields into a pumpkin patch every fall, with wagon rides, live music, and food trucks on busy days. Grab a bag, pick your pumpkins, and visit the animal viewing area.',
      'Finish at the farm market, which stays open later than the patch. It is an easy fall outing without leaving the city.',
      'Good to know: In 2026 the patch ran from late September to October 31. Admission was $15 on weekdays and $20 on weekends and holidays (plus tax), and kids 2 and under were free. Tickets were sold at the farm only, not online. Dates and prices change each year, so check before you go.',
    ],
  },
  {
    placeID: 'westham_island_herb_farm',
    category: PATCHES,
    name: 'Westham Island Herb Farm',
    address: '4690 Kirkland Rd, Delta',
    title: 'Westham Island Herb Farm',
    detailAddress: '4690 Kirkland Rd, Westham Island, Delta, BC',
    latitude: 49.08735,
    longitude: -123.14133,
    tagline: 'Free pumpkin patch, scarecrows, and sunflower lanes!',
    about: [
      'Cross the single-lane wooden bridge from Ladner and you are on Westham Island, where the herb farm sets up a free fall display: Pumpkintown, Sunflower Lane, and a crowd of scarecrows.',
      'You only pay for the pumpkins and produce you take home. The Reifel Bird Sanctuary is nearby, so the two make a natural pairing for a day on the island.',
      'Good to know: In 2026 the farm was open daily through October 31, from 10 am to 5 pm, with free entry. Cash, credit, and debit were accepted. Dates change each year, so check before you go.',
    ],
  },
  {
    placeID: 'hazelmere_pumpkin_patch',
    category: PATCHES,
    name: 'Hazelmere Pumpkin Patch',
    address: '18507 20 Ave, Surrey',
    title: 'Hazelmere Pumpkin Patch',
    detailAddress: '18507 20 Ave, South Surrey, BC',
    latitude: 49.03861,
    longitude: -122.71005,
    tagline: 'Wagon rides, a mini corn maze, and a vintage firetruck!',
    about: [
      'A ten-acre South Surrey field with more than 20 pumpkin varieties, farm animals to visit, a wagon ride, a mini corn maze, and a play area. A vintage 1971 firetruck is a favourite photo stop.',
      'Pumpkins are priced by type and size and are not included in admission.',
      'Good to know: In 2026 the patch was open weekends through October 31 (10 am to 5 pm) and weekday afternoons from October 1 to 30 (2 to 5 pm). Admission was $12.50 on weekends and $10 on weekday afternoons, and kids 2 and under were free. Dates and prices change each year.',
    ],
  },
  {
    placeID: 'bog_riverside_cranberry',
    category: PATCHES,
    name: 'The Bog Cranberry Farm',
    address: '26885 88 Ave, Langley',
    title: 'The Bog - Riverside Cranberry Farm',
    detailAddress: '26885 88 Ave, Langley, BC',
    latitude: 49.16282,
    longitude: -122.48278,
    tagline: 'Wade into a sea of floating cranberries!',
    about: [
      'At harvest time the cranberry fields are flooded so the berries float to the surface in red sheets. Walk the self-guided audio tour, and add the optional Cranberry Plunge to wade right in. Tours run rain or shine.',
      'The harvest stage changes with the crop, so no two visits look the same. Tours are booked online in timed slots.',
      "Good to know: In 2026 tours were listed for October 9, 10, and 12 (Thanksgiving Monday). 2026 prices were not confirmed; in 2025 the Cranberry Plunge was $15 and the self-guided tour was $7.50 to $12.50, plus fees and tax. Check the farm's booking page for this year's dates and prices.",
    ],
  },
  {
    placeID: 'hopcott_farms',
    category: PATCHES,
    name: 'Hopcott Farms Cranberry Tours',
    address: '18385 Old Dewdney Trunk Rd, Pitt Meadows',
    title: 'Hopcott Farms Cranberry Tours',
    detailAddress: '18385 Old Dewdney Trunk Rd, Pitt Meadows, BC',
    latitude: 49.24477,
    longitude: -122.71239,
    tagline: 'Cranberry harvest tours, waders and all!',
    about: [
      'Hopcott is a family farm in Pitt Meadows that has harvested cranberries every fall since 1932. In mid to late October it opens its bogs to visitors, with waders available for the in-the-bog photo.',
      'Take the plunge, or just come out for the cranberry facts. The farm also has a bistro on site.',
      "Good to know: In 2026 tours ran from October 16 to 25 and were booked online through the farm's website. Times and prices were not listed, and an earlier listing noted that some tours were for guests 19 and older, so check age limits and pricing before you book.",
    ],
  },
  {
    placeID: 'maan_farms',
    category: PATCHES,
    name: 'Maan Farms',
    address: '790 McKenzie Rd, Abbotsford',
    title: 'Maan Farms',
    detailAddress: '790 McKenzie Rd, Abbotsford, BC',
    latitude: 49.01627,
    longitude: -122.28187,
    tagline: 'Pumpkin forest, corn mazes, and a haunted fright festival!',
    about: [
      'Maan Farms packs a lot into one fall visit: a five-acre forest pumpkin patch, two corn mazes, and a fall fair with live entertainment and a zip line. It is in Abbotsford, roughly an hour from Vancouver.',
      'After dark in October the farm becomes the Halloween Fright Festival, with four haunted attractions, a midway, and an illuminated pumpkin forest. It is for ages 14 and up, and a waiver is required.',
      'Good to know: In 2026 the daytime Fall at the Farm ran daily through November 1 (9 am to 6 pm), with advance tickets from $17 on Tuesdays to $31 on holiday weekends. The Fright Festival ran on evenings from October 2 to 31 on a separate ticket, roughly $69 to $99. Dates and prices change each year.',
    ],
  },

  // ---------------------------------------------------------------- Festivals & Gardens
  {
    placeID: 'fort_langley_cranberry_festival',
    category: FESTIVALS,
    name: 'Fort Langley Cranberry Festival',
    address: '9167 Glover Rd, Fort Langley',
    title: 'Fort Langley Cranberry Festival',
    detailAddress: 'Community Hall, 9167 Glover Rd, Fort Langley, BC',
    latitude: 49.16912,
    longitude: -122.5799,
    tagline: '100+ vendors, a pancake breakfast, and everything cranberry!',
    about: [
      'For one Saturday every Thanksgiving weekend, Fort Langley becomes a street festival: more than 100 vendors, live performances on the stage in front of the Community Hall, crafts, face painting, and a pancake breakfast. Cranberries show up in everything from preserves to baking.',
      'Fort Langley National Historic Site joins in with its own programming, which has included a scarecrow competition and cranberry stomping. The festival started in 1995 and has drawn roughly 35,000 people.',
      'Good to know: The festival is held on the Saturday before Thanksgiving (October 10 in 2026) and has been listed as a free event. Expect big crowds, and check the festival website for this year\'s date and schedule.',
    ],
  },
  {
    placeID: 'ubc_botanical_garden',
    category: FESTIVALS,
    name: 'UBC Apple Festival',
    address: '6804 SW Marine Dr, Vancouver',
    title: 'UBC Botanical Garden Apple Festival',
    detailAddress: '6804 SW Marine Dr, Vancouver, BC',
    latitude: 49.25388,
    longitude: -123.25111,
    tagline: 'Taste 50+ apple varieties and walk the treetops!',
    about: [
      "Every October, UBC Botanical Garden hosts a big apple festival: tastings of more than 50 apple varieties, apple vendors, warm cider, and live entertainment. Proceeds support the garden's education, research, and conservation work.",
      "In September and October the garden's GreenHeart TreeWalk, a 310 m canopy walkway of suspended walkways and tree platforms, adds a walk high above the forest floor to the visit.",
      'Good to know: In 2026 the festival ran October 17 and 18 from 11 am to 4 pm, with general admission from $15 (early bird $12). It typically sells out and runs rain or shine, so buy tickets ahead. The garden and TreeWalk were open Tuesday to Sunday, 10 am to 4:30 pm, through October 31.',
    ],
  },
  {
    placeID: 'vandusen_harvest_days',
    category: FESTIVALS,
    name: 'VanDusen Harvest Days',
    address: '5251 Oak St, Vancouver',
    title: 'VanDusen Harvest Days',
    detailAddress: '5251 Oak St, Vancouver, BC',
    latitude: 49.23931,
    longitude: -123.1288,
    tagline: 'Hay bales, a corn maze, and live bluegrass!',
    about: [
      'Harvest Days turns VanDusen Botanical Garden into a small fall fair: hay bales, cornstalks, and pumpkins, a corn maze, lawn games, face painting, live bluegrass and folk music, food trucks, and a Sculpture Stroll of biodegradable pieces.',
      "The garden's own fall colour is the backdrop, with sugar maples, ginkgo trees, and golden larches. Everything is included with regular garden admission.",
      'Good to know: In 2026 Harvest Days ran on weekends from September 26 to October 18, plus Thanksgiving Monday, from 10:30 am to 4:30 pm. Adult admission was about $13 to $16 depending on whether you bought online or at the gate. Pets are not permitted except service animals. Parking is free in the lot off West 37th Avenue, but spaces are limited.',
    ],
  },
  {
    placeID: 'nitobe_memorial_garden',
    category: FESTIVALS,
    name: 'Nitobe Memorial Garden',
    address: '1895 Lower Mall, Vancouver',
    title: 'Nitobe Memorial Garden',
    detailAddress: '1895 Lower Mall, UBC, Vancouver, BC',
    latitude: 49.26621,
    longitude: -123.25956,
    tagline: 'Crimson Japanese maples around a tea house and still ponds!',
    about: [
      'Nitobe is a traditional Japanese stroll garden at UBC with a tea house and reflecting ponds, designed around the changing seasons. In autumn the Japanese maples turn crimson against the green moss.',
      'Autumn is described as one of the best times to visit. UBC Botanical Garden is nearby, so the two pair well for a day at UBC.',
      "Good to know: In 2026 the garden was open Tuesday to Sunday, 10 am to 4:30 pm, from September 8 to October 31, and closed for the season after that. Check the UBC Botanical Garden website for this year's dates and admission.",
    ],
  },
  {
    placeID: 'sun_yat_sen_garden',
    category: FESTIVALS,
    name: 'Sun Yat-Sen Garden Moon Palace',
    address: '578 Carrall St, Vancouver',
    title: 'Dr. Sun Yat-Sen Garden Moon Palace',
    detailAddress: '578 Carrall St, Chinatown, Vancouver, BC',
    latitude: 49.27956,
    longitude: -123.10394,
    tagline: 'Lanterns, lion dances, and mooncakes in a classical garden!',
    about: [
      'The Dr. Sun Yat-Sen Classical Chinese Garden celebrates the Mid-Autumn Festival with its Moon Palace weekend: traditional music, dance, lion performances, lantern riddles, crafts, and Suzhou-style mooncakes, plus the chance to write a wish for a floating lantern on the Jade Pond.',
      'Outside the festival the garden is a calm retreat in the middle of Chinatown, and the park next to it is free to enter.',
      "Good to know: The 40th annual Mid-Autumn Festival was held on September 26 and 27, 2026, from 2 pm to 9 pm, with tickets sold online. Regular garden admission was about $16 for adults in 2026. Check the garden's website for this year's festival dates and prices.",
    ],
  },

  // ---------------------------------------------------------------- Halloween & After Dark
  {
    placeID: 'burnaby_haunted_village',
    category: HALLOWEEN,
    name: 'Burnaby Haunted Village',
    address: '6501 Deer Lake Ave, Burnaby',
    title: 'Burnaby Village Museum Haunted Village',
    detailAddress: '6501 Deer Lake Ave, Burnaby, BC',
    latitude: 49.23992,
    longitude: -122.96688,
    tagline: 'A spooky-not-scary heritage village after dark!',
    about: [
      'For a handful of October evenings, the museum\'s 10-acre open-air village becomes a Haunted Village: dramatic lighting, a haunted graveyard, a spooky circus, and bewitching stores. There is Halloween food and warm drinks at Mai\'s Cafe, DJ Drac and his dancers, and a shadow puppet show. Costumes are encouraged.',
      'It is described as spooky, not scary, with no blood, gore, or strobe lighting. Trick-or-treating runs on October 31 only. Pets are not permitted, and nearly all facilities are wheelchair and stroller accessible on a paved path.',
      'Good to know: In 2026 the Haunted Village ran on five evenings (October 23, 24, 25, 30, and 31) from 4 to 9 pm, rain or shine. Advance tickets were $12 for adults and $7 for children 2 to 12; day-of tickets were $15 and $10. Parking is limited, so transit or a ride share is recommended.',
    ],
  },
  {
    placeID: 'playland_fright_nights',
    category: HALLOWEEN,
    name: 'Fright Nights at Playland',
    address: '2901 E Hastings St, Vancouver',
    title: 'Fright Nights at Playland',
    detailAddress: '2901 E Hastings St, Vancouver, BC',
    latitude: 49.28275,
    longitude: -123.0364,
    tagline: 'Seven haunted houses and 19 rides, after dark!',
    about: [
      'Playland becomes a scream park for most of October: seven haunted houses (The Void, The Bloodshed, Carn-Evil, Darkness, Haunted Mansion, Keepers Doll Factory, and Materia Medica), 19 rides included, and roaming scare actors. It is recommended for ages 13 and up.',
      'Lines grow through the night and Wednesdays are the calmest. A Rapid Pass add-on gives express entry to all seven houses and five rides on the night printed on it, and peak nights can sell out, so buy ahead.',
      'Good to know: In 2026 Fright Nights ran October 7 to 31, Wednesday to Sunday, with gates opening at 6 pm. Advance tickets were $39, $49, or $59 depending on the night. The park is cashless, bags must be no larger than 8.5 x 11 inches, and there is no re-entry. Parking in the PNE lots was $20.',
    ],
  },
  {
    placeID: 'capilano_canyon_frights',
    category: HALLOWEEN,
    name: 'Canyon Frights at Capilano',
    address: '3735 Capilano Rd, North Vancouver',
    title: 'Canyon Frights at Capilano Suspension Bridge Park',
    detailAddress: '3735 Capilano Rd, North Vancouver, BC',
    latitude: 49.3427,
    longitude: -123.11605,
    tagline: 'A glowing orange bridge and a Frightful Forest scavenger hunt!',
    about: [
      'At Halloween the suspension bridge, river, and surrounding forest light up in orange for Canyon Frights. Follow the Frightful Forest scavenger hunt along the trails, spot skeletal scenes, owls at Treetops Adventure, glowing mushrooms, and giant spiders, and catch live music at Loggers\' Grill Plaza.',
      'It is family-friendly and included with park admission. Costumes must be child-friendly, masks are not permitted, and anything that looks like a weapon or has sharp points is not allowed.',
      'Good to know: In 2026 Canyon Frights ran from about October 9 to November 1 (sources differ slightly), with park hours of 10 am to 8 pm and later on the last two weekends. Adult park admission was about $80, and annual-pass holders needed to reserve a time slot. Parking is limited; the park runs a free shuttle from downtown Vancouver.',
    ],
  },

  // ---------------------------------------------------------------- Salmon & Wildlife
  {
    placeID: 'tynehead_hatchery',
    category: WILDLIFE,
    name: 'Tynehead Hatchery',
    address: '16585 96 Ave, Surrey',
    title: 'Tynehead Hatchery & Salmon Habitat Loop',
    detailAddress: '16585 96 Ave, Surrey, BC',
    latitude: 49.17790,
    longitude: -122.76266,
    tagline: 'Watch coho, chum, and chinook return upriver!',
    about: [
      "In Tynehead Regional Park, a volunteer-run hatchery raises and releases Pacific salmon to help restore the Serpentine River's run. In fall, spawning coho, chum, and chinook can be spotted along the easy, flat Salmon Habitat Loop, which crosses the river on bridges.",
      'The hatchery was built in 1988 and is run by the Serpentine Enhancement Society. The park is free, and the Hatchery Trail, the Salmon Habitat Loop, and the washrooms by the hatchery parking lot are wheelchair accessible.',
      "Good to know: Salmon are usually seen from October into December. The hatchery's own opening hours are informal, so the trail is the dependable way to see fish. Bus 337 serves the park.",
    ],
  },
  {
    placeID: 'hoy_creek_hatchery',
    category: WILDLIFE,
    name: 'Hoy Creek Hatchery',
    address: '2985 Princess Cres, Coquitlam',
    title: 'Hoy Creek Hatchery',
    detailAddress: '2985 Princess Cres, Coquitlam, BC',
    latitude: 49.28672,
    longitude: -122.79594,
    tagline: 'Spawning chum and coho in a creekside city park!',
    about: [
      'A volunteer-run hatchery on Hoy Creek in Coquitlam. Chum return from mid-October and coho in November, and the Hoy Trail in Hoy Creek Linear Park runs along the creek, open day or night.',
      'The hatchery is not reachable by road. It is an 8 to 10 minute walk from Lafarge Lake-Douglas SkyTrain Station, with free parking at Coquitlam City Hall, Pinetree Community Centre, and Douglas College. Please keep feet and dogs out of the stream.',
      'Good to know: Chum return from mid-October (tapering in December) and coho in November (tapering into January). The hatchery holds a public open house on the first Saturday of most months, 9:30 to 11:30 am (not July or August), and the annual Salmon Come Home celebration is usually on a Sunday in late October.',
    ],
  },
  {
    placeID: 'reifel_bird_sanctuary',
    category: WILDLIFE,
    name: 'Reifel Bird Sanctuary',
    address: '5191 Robertson Rd, Delta',
    title: 'George C. Reifel Migratory Bird Sanctuary',
    detailAddress: '5191 Robertson Rd, Delta, BC',
    latitude: 49.1029,
    longitude: -123.18981,
    tagline: 'Fall waterfowl flocks and an ocean-marsh lookout tower!',
    about: [
      'Reifel has several kilometres of trails through coastal habitats and a tower overlooking the ocean marshes, with views toward Vancouver and Vancouver Island. It is known as the winter home of the snow geese, and bird diversity and numbers are usually highest from fall to spring.',
      'Allow about an hour to an hour and a half. Dogs, bikes, and drones are not allowed, and bird seed must be bought on site.',
      'Good to know: Reservations are required for all visitors and open three days ahead. In 2026 the sanctuary was open 9 am to 4 pm and closed Mondays (except some statutory holidays), with admission of $10 for adults, $8 for seniors 65+, and $7 for children 2 to 14.',
    ],
  },

  // ---------------------------------------------------------------- Fall Colour Walks
  {
    placeID: 'buntzen_lake',
    category: COLOUR,
    name: 'Buntzen Lake',
    address: 'South Beach, Anmore',
    title: 'Buntzen Lake',
    detailAddress: 'South Beach, Buntzen Lake, Anmore, BC',
    latitude: 49.34033,
    longitude: -122.85703,
    tagline: 'Shoreline maples glowing against the evergreens!',
    about: [
      'Buntzen Lake is a BC Hydro recreation area north of Port Moody with picnic tables, a shelter, viewpoints, and a beach. In fall, patches of maples along the shoreline stand out against the evergreens. The classic lake loop is about 10 km and takes around three and a half hours.',
      'There is no parking in Anmore. The parking lots are about 2 km past the entrance gate and fill early on weekends. Dogs must be on a leash except in the two off-leash areas.',
      "Good to know: Gates open at 8 am, and closing time moves earlier through fall, from 6 pm in mid-October to 4:30 pm from early November. A rockslide closure affects Powerhouse Road between North Beach and Buntzen Dam, so check BC Hydro's trail updates before planning the full loop.",
    ],
  },
  {
    placeID: 'queen_elizabeth_park',
    category: COLOUR,
    name: 'Queen Elizabeth Park',
    address: '4600 Cambie St, Vancouver',
    title: 'Queen Elizabeth Park',
    detailAddress: '4600 Cambie St, Vancouver, BC',
    latitude: 49.24103,
    longitude: -123.11196,
    tagline: "Red Quarry Garden colour and Vancouver's highest viewpoint!",
    about: [
      "Queen Elizabeth Park is Vancouver's highest point, with a view over the city as it turns gold. Walk the Quarry Garden first, which fills with red in fall, then continue to the viewpoint near Seasons in the Park for city and North Shore mountain views.",
      'The Bloedel Conservatory dome in the park is a warm, dry backup for a rainy day.',
      'Good to know: The park is free to enter. In 2026 Bloedel Conservatory was open 10 am to 5 pm through October 27 and 10 am to 4 pm in November and December, with a separate admission fee. Urban parks and gardens in Vancouver typically peak for fall colour in late October.',
    ],
  },
  {
    placeID: 'pacific_spirit_park',
    category: COLOUR,
    name: 'Pacific Spirit Park',
    address: 'Park Centre, W 16th Ave, Vancouver',
    title: 'Pacific Spirit Regional Park',
    detailAddress: 'Park Centre, W 16th Ave, Vancouver, BC',
    latitude: 49.25806,
    longitude: -123.18844,
    tagline: 'Golden bigleaf maples on a forest walk to the beach!',
    about: [
      'Pacific Spirit is mostly evergreen forest, but the bigleaf maples along the Admiralty Trail near Spanish Banks turn golden each fall. The park has more than 55 km of trails, which makes it one of the area\'s best autumn foliage walks.',
      'The park is free to enter. Dogs are allowed on some trails and must be leashed on others, so check the trail signs.',
      'Good to know: The park is open 7 am to 7 pm until early November, then 7 am to 6 pm, with beaches closing at sunset. In late 2026 the Admiralty Trail between Salish Trail and West Canyon Trail was closed for about four weeks from November 2, so use an alternate trail to reach Spanish Banks until it reopens.',
    ],
  },
];

// Fall screen sections: legacy farms first, then the detailed spots, grouped in category order.
const fallCategories = fallCategoryTitles.map(title => ({
  title,
  spots: [...legacyFallSpots, ...detailedFallSpots]
    .filter(spot => spot.category === title)
    .map(({ name, address }) => ({ name, address })),
}));

const fallSpotNames = fallCategories.flatMap(category => category.spots.map(spot => spot.name));

function getSpotByPlaceID(placeID) {
  return detailedFallSpots.find(spot => spot.placeID === placeID);
}

function findSpotByName(name) {
  return detailedFallSpots.find(spot => spot.name === name);
}

module.exports = {
  fallCategoryTitles,
  legacyFallSpots,
  detailedFallSpots,
  fallCategories,
  fallSpotNames,
  getSpotByPlaceID,
  findSpotByName,
};
