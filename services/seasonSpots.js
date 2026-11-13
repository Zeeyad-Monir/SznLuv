// Winter, spring and summer spots for their season screens, lists and search.
// Plain CommonJS like services/spots.js (which holds Fall) so it can be unit-tested directly.
// `name` is the favourites key, so it must be unique across all seasons.

const placeholderSpot = (name, address) => ({ name, address, placeholderAddress: true });

// Verified operating details and photo provenance: docs/WINTER_SPOTS_CATALOGUE.md.
const SNOW_AND_ICE = 'Snow & Ice';
const LIGHTS_AND_CELEBRATIONS = 'Lights & Celebrations';
const INDOOR = 'Indoor Escapes';
const WALKS_AND_WILDLIFE = 'Winter Walks & Wildlife';

const winterSpots = [
  {
    placeID: 'robson_square_ice_rink',
    category: SNOW_AND_ICE,
    name: 'Robson Square Ice Rink',
    title: 'Robson Square Ice Rink',
    address: '800 Robson St, Vancouver',
    detailAddress: '800 Robson St, Vancouver, BC',
    latitude: 49.28221,
    longitude: -123.12113,
    tagline: 'Downtown skating under the glass canopy at Robson Square.',
    description: 'Seasonal outdoor ice skating at a covered, open-air rink in downtown Vancouver.',
    about: [
      'Take a few laps under the glass canopy one level below Robson Street. The rink is compact, so it’s an easy stop after dinner or a good place to get back on skates for the first time in years.',
      'Bring your own skates or check the rental counter. Vancouver City Centre Station is a short walk away. The rink is sheltered and open to the air, so dress for the temperature outside.',
      'Good to know: The operator plans to reopen in December 2026. Check its website for the public schedule before heading out.',
    ],
    hours: 'December 2026 reopening planned. Exact public dates and hours pending.',
    cost: 'In 2025–26, skating was free and skate rentals were $5. 2026–27 rates pending.',
    websiteUrl: 'https://www.robsonsquare.com/',
    searchTags: ['ice skating', 'skate rentals', 'covered outdoor rink', 'downtown', 'Vancouver City Centre', 'free skating'],
  },
  {
    placeID: 'mt_seymour_ski_and_snowboard',
    category: SNOW_AND_ICE,
    name: 'Mt Seymour Ski & Snowboard',
    title: 'Mt Seymour Ski & Snowboard',
    address: '1700 Mount Seymour Rd, North Vancouver',
    detailAddress: '1700 Mount Seymour Rd, North Vancouver, BC',
    latitude: 49.36616,
    longitude: -122.94792,
    tagline: 'Learn on the Goldie slope or take a lap on the floodlit runs.',
    description: 'A North Shore ski hill with beginner terrain, rentals, lessons and floodlit runs for night skiing.',
    about: [
      'Start on Goldie Meadows if you’re learning, or come after work for a few laps under the floodlights when night terrain is open. The learning area has its own weekday ticket option outside holiday periods.',
      'Choose car or shuttle when buying a lift ticket. The resort shuttle runs from Parkgate and near Rupert Station during winter operations. Drivers should check current road and winter tire requirements.',
      'Good to know: Check the daily mountain report for lift hours, night terrain and conditions. Accessible parking and a drop-off area are available near rentals and guest services.',
    ],
    hours: 'Dec 11, 2026–Apr 4, 2027 anticipated, subject to snow. Daily lift and night hours pending.',
    cost: 'Paid lift ticket. Check date and arrival time in the resort store for pricing and rental options.',
    websiteUrl: 'https://mtseymour.ca/the-mountain/todays-conditions-hours',
    bookingUrl: 'https://mtseymour.ca/winter/ski-ride',
    searchTags: ['night skiing', 'snowboarding', 'ski lessons', 'beginner ski hill', 'Goldie Meadows', 'winter shuttle', 'North Shore'],
  },
  {
    placeID: 'lights_at_lafarge',
    category: LIGHTS_AND_CELEBRATIONS,
    name: 'Lights at Lafarge',
    title: 'Lights at Lafarge',
    address: '1299 Pinetree Way, Coquitlam',
    detailAddress: 'Town Centre Park, 1299 Pinetree Way, Coquitlam, BC',
    latitude: 49.28575,
    longitude: -122.79097,
    tagline: 'A free lakeside light walk steps from the SkyTrain.',
    description: 'A free winter light display along a flat 1.6 km loop around Lafarge Lake in Coquitlam.',
    about: [
      'Start by Lafarge Lake–Douglas Station and follow the lights around the water. The 1.6 km loop gives you time to stop for the installations and see their reflections from the opposite shore.',
      'The loop is flat and mostly paved, with one stretch of packed gravel. Accessible washrooms are available. Weeknights, before 6 pm or after 8 pm, are usually quieter.',
      'Good to know: The 2026–27 season kicks off on Nov 27 from 5 to 8 pm. Take the Millennium Line to Lafarge Lake–Douglas, where the southwest park entrance is a short walk from the station.',
    ],
    hours: 'Nov 27, 2026 through the end of Feb 2027. Lights on daily 4–11 pm after the opening celebration.',
    cost: 'Free. No reservation required.',
    websiteUrl: 'https://www.coquitlam.ca/784/Lights-at-Lafarge',
    searchTags: ['Christmas lights', 'holiday light walk', 'free date', 'Lafarge Lake', 'Town Centre Park', 'SkyTrain', 'wheelchair accessible'],
  },
  {
    placeID: 'vandusen_festival_of_lights',
    category: LIGHTS_AND_CELEBRATIONS,
    name: 'VanDusen Festival of Lights',
    title: 'VanDusen Festival of Lights',
    address: '5251 Oak St, Vancouver',
    detailAddress: '5251 Oak St, Vancouver, BC',
    latitude: 49.23931,
    longitude: -123.12886,
    tagline: 'Follow illuminated garden paths to a light show over Livingstone Lake.',
    description: 'VanDusen Botanical Garden’s timed winter evening walk with illuminated displays and a lakeside light show.',
    about: [
      'After dark, the garden paths take you past lit trees and garden installations to Livingstone Lake, where the lights move to music. Pause by the water for the reflections before continuing around the garden.',
      'Most paved paths are wheelchair-accessible, though some surfaces are uneven. The 2026 sensory-friendly evening is Dec 1, with quieter sound, lower capacity and flashing lights switched off.',
      'Good to know: Book a timed ticket online. Final entry is 8:30–9 pm. Parking is free and limited, and the #17 Oak bus stops near the garden.',
    ],
    hours: 'Nov 27, 2026–Jan 3, 2027, 4–10 pm. Closed Dec 25.',
    cost: '2026–27 base rates before tax and fees: adults $29, seniors and teens $19, ages 5–12 $12, ages 0–4 free with a ticket.',
    websiteUrl: 'https://vancouver.ca/parks-recreation-culture/festival-of-lights.aspx',
    bookingUrl: 'https://www.showpass.com/vandusen-festival-of-lights-126/',
    searchTags: ['Christmas lights', 'holiday lights', 'botanical garden', 'Livingstone Lake', 'sensory friendly', 'Shaughnessy', 'date night'],
  },
  {
    placeID: 'chinatown_spring_festival_parade',
    category: LIGHTS_AND_CELEBRATIONS,
    name: 'Chinatown Spring Festival Parade',
    title: 'Chinatown Spring Festival Parade',
    address: '26 W Pender St, Vancouver',
    detailAddress: 'Millennium Gate, 26 W Pender St, Vancouver, BC',
    latitude: 49.28073,
    longitude: -123.10557,
    tagline: 'Lion dances, drums and neighbourhood groups fill Chinatown for Lunar New Year.',
    description: 'Vancouver Chinatown’s annual Lunar New Year street parade with lion and dragon dances and community performances.',
    about: [
      'Find a spot along the route to watch lion and dragon dance teams, marching bands and community groups pass through historic Chinatown. Leave time afterward for lunch or a bakery stop in the neighbourhood.',
      'The pin marks Millennium Gate, the previous parade start at Pender and Taylor. Crowds and road closures can make driving difficult. Stadium–Chinatown Station is nearby.',
      'Good to know: The last parade took place on Feb 22, 2026. Check the organizer’s announcement for the 2027 route, road closures and start time before making plans.',
    ],
    hours: '2027 date, start time and route pending.',
    cost: 'The 2026 street parade was free to watch. Check the 2027 announcement.',
    websiteUrl: 'https://cbavancouver.org/',
    searchTags: ['Lunar New Year', 'Chinese New Year', 'lion dance', 'dragon dance', 'Millennium Gate', 'Chinatown', 'street festival'],
  },
  {
    placeID: 'bloedel_conservatory',
    category: INDOOR,
    name: 'Bloedel Conservatory',
    title: 'Bloedel Conservatory',
    address: '4600 Cambie St, Vancouver',
    detailAddress: '4600 Cambie St, Queen Elizabeth Park, Vancouver, BC',
    latitude: 49.24210,
    longitude: -123.11380,
    tagline: 'Tropical greenery and free-flying birds inside a warm glass dome.',
    description: 'A warm indoor tropical garden and aviary in Queen Elizabeth Park, ideal for a short rainy-day visit.',
    about: [
      'Step out of the rain into a warm, humid dome filled with tropical plants. Walk the short loop slowly enough to spot birds above the path and koi below it.',
      'The main path and washrooms are wheelchair-accessible. Sensory kits are available at admission. Use the upper drop-off loop near Seasons in the Park for a shorter approach.',
      'Good to know: Last entry is 15 minutes before closing. Buy tickets online or at the desk. The City lists a $1 discount on advance adult tickets.',
    ],
    hours: 'Nov–Feb, 10 am–4 pm. Closed Dec 25. March hours are 10 am–6 pm.',
    cost: 'Posted rates: adults $9.50, seniors $7.60, ages 13–18 $6.65, ages 5–12 $4.75, ages 0–4 free.',
    websiteUrl: 'https://vancouver.ca/parks-recreation-culture/bloedel-conservatory.aspx',
    bookingUrl: 'https://www.showpass.com/o/bloedel-conservatory/',
    searchTags: ['rainy day date', 'indoor garden', 'tropical greenhouse', 'aviary', 'parrots', 'koi', 'Queen Elizabeth Park'],
  },
  {
    placeID: 'museum_of_anthropology_at_ubc',
    category: INDOOR,
    name: 'Museum of Anthropology at UBC',
    title: 'Museum of Anthropology at UBC',
    address: '6393 NW Marine Dr, Vancouver',
    detailAddress: '6393 NW Marine Dr, UBC, Vancouver, BC',
    latitude: 49.26947,
    longitude: -123.25936,
    tagline: 'Northwest Coast art in the Great Hall and galleries for a rainy afternoon.',
    description: 'An indoor museum on the UBC campus with Northwest Coast works in its Great Hall and rotating exhibitions.',
    about: [
      'Spend a wet afternoon in the Great Hall, where the tall windows bring in winter light around monumental Northwest Coast works. Then take time for the smaller galleries, where you can look more closely at individual objects and their stories.',
      'Thursday evening is a good after-work option. The museum is wheelchair-accessible, and the UBC bus exchange is a walk across campus.',
      'Good to know: Closed Dec 25. Dec 24 and 31 hours are 10 am–2 pm, and Jan 1 hours are 10 am–5 pm. The museum lists additional free and discounted admission categories.',
    ],
    hours: 'Winter hours Tue–Sun 10 am–5 pm, Thu until 9 pm. Closed Mondays. Holiday hours vary.',
    cost: 'Adults $26, seniors and students $23, ages 6–18 $13. Half-price Thursdays after 5 pm.',
    websiteUrl: 'https://moa.ubc.ca/',
    searchTags: ['rainy day museum', 'indoor date', 'Great Hall', 'Northwest Coast art', 'UBC', 'University of British Columbia', 'Thursday evening'],
  },
  {
    placeID: 'gulf_of_georgia_cannery',
    category: INDOOR,
    name: 'Gulf of Georgia Cannery',
    title: 'Gulf of Georgia Cannery National Historic Site',
    address: '12138 Fourth Ave, Richmond',
    detailAddress: '12138 Fourth Ave, Steveston, Richmond, BC',
    latitude: 49.12473,
    longitude: -123.18694,
    tagline: 'Walk the old salmon-canning line inside Steveston’s waterfront museum.',
    description: 'A covered maritime museum inside Steveston’s historic cannery, with original machinery and stories of the workers.',
    about: [
      'Follow the restored salmon-canning line to see the machinery up close and learn how people worked on it. The museum sits over the water, so you can make a harbour day of it even when the forecast is wet.',
      'Wear a warm layer inside the historic building. The museum is wheelchair-accessible, with uneven floorboards in places. Steveston Exchange is nearby.',
      'Good to know: Dec 24 and 31 hours are 10 am–2 pm. Organized groups of 10 or more must book in advance. Check the events page for any seasonal programming.',
    ],
    hours: 'Daily 10 am–5 pm. Closed Dec 25–26 and Jan 1, plus other posted holidays.',
    cost: 'Adults $14.75, seniors $12.50, ages 17 and under free with appropriate adult supervision.',
    websiteUrl: 'https://gulfofgeorgiacannery.org/visit/hours-admissions/',
    searchTags: ['rainy day museum', 'Steveston', 'maritime history', 'salmon cannery', 'historic fishing village', 'waterfront', 'Richmond'],
  },
  {
    placeID: 'maplewood_flats',
    category: WALKS_AND_WILDLIFE,
    name: 'Maplewood Flats',
    title: 'Maplewood Flats Conservation Area',
    address: '2649 Dollarton Hwy, North Vancouver',
    detailAddress: '2649 Dollarton Hwy, North Vancouver, BC',
    latitude: 49.30551,
    longitude: -123.00398,
    tagline: 'Look for overwintering waterfowl along the tidal flats of Burrard Inlet.',
    description: 'Free, mostly flat trails lead to tidal mudflats and winter birdwatching viewpoints on Burrard Inlet.',
    about: [
      'Bring binoculars and pause at the shoreline viewpoints. Winter waterfowl use the inlet and sheltered ponds, and different tides change what you can see from the trail. Give the birds space and stay off the mudflats.',
      'The Wild Bird Trust describes the trail network as wheelchair-accessible. Nature House washrooms depend on volunteer hours. Dogs must be leashed and can only go on the east side, before the bridge.',
      'Good to know: Go in daylight for birding. Buses from Phibbs Exchange stop on Dollarton Highway near the entrance. Use the signed visitor parking if driving.',
    ],
    hours: 'Trails open 24 hours. Nature House and washroom access vary.',
    cost: 'Free entry and visitor parking.',
    websiteUrl: 'https://wildbirdtrust.org/visit-maplewood-flats/maplewood-flats-trail-use-guidelines/',
    searchTags: ['winter birding', 'bird watching', 'waterfowl', 'tidal mudflats', 'Burrard Inlet', 'free nature walk', 'Dollarton'],
  },
  {
    placeID: 'lynn_canyon_park',
    category: WALKS_AND_WILDLIFE,
    name: 'Lynn Canyon Park',
    title: 'Lynn Canyon Park & Suspension Bridge',
    address: '3663 Park Rd, North Vancouver',
    detailAddress: '3663 Park Rd, North Vancouver, BC',
    latitude: 49.34361,
    longitude: -123.01778,
    tagline: 'Cross a rainforest gorge when the winter rains feed the waterfalls.',
    description: 'A free North Vancouver rainforest walk with a suspension bridge and waterfalls that swell in the rainy season.',
    about: [
      'Start beside the Ecology Centre and cross the suspension bridge for a view into the gorge. Winter rain brings the creek and falls up. If the trails are open and you have daylight, continue toward Twin Falls for a second viewpoint.',
      'The bridge approach and trails have stairs and can get slick after rain or frost. They are unsuitable for wheelchairs and strollers. The #227 shuttle stops near the park.',
      'Good to know: Stay on marked trails and behind barriers, and check the park site for closures after storms. The Ecology Centre is an indoor stop by donation when open.',
    ],
    hours: 'Park dawn to dusk. Winter parking gates 7 am–6 pm.',
    cost: 'Free park and bridge. Seasonal pay parking Mar 1–Oct 31.',
    websiteUrl: 'https://ecologycentre.ca/plan-your-visit/',
    searchTags: ['waterfalls', 'Twin Falls', 'rainforest', 'suspension bridge', 'Lynn Valley', 'rainy day hike', 'free nature walk'],
  },
];

const winterCategories = [SNOW_AND_ICE, LIGHTS_AND_CELEBRATIONS, INDOOR, WALKS_AND_WILDLIFE].map(title => ({
  title,
  spots: winterSpots.filter(spot => spot.category === title),
}));

const winterSpotNames = winterSpots.map(spot => spot.name);

const springCategories = [
  {
    title: 'Botanical Gardens',
    spots: [
      placeholderSpot('Blossom Garden', '123 Flower St'),
      placeholderSpot('Spring Haven', '456 Bloom Blvd'),
    ],
  },
  {
    title: 'Bike Rides',
    spots: [
      placeholderSpot('River Trail', '789 River Rd'),
      placeholderSpot('Meadow Path', '321 Field Ln'),
    ],
  },
];

const summerCategories = [
  {
    title: 'Beaches',
    spots: [
      placeholderSpot('Sunset Beach', '123 Ocean Drive'),
      placeholderSpot('Golden Sands', '456 Shoreline Ave'),
      placeholderSpot('Coral Cove', '789 Seaside Blvd'),
    ],
  },
];

module.exports = { winterCategories, winterSpotNames, springCategories, summerCategories };
