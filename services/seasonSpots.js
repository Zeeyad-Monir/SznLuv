// Winter, spring and summer spots for their season screens, lists and search.
// Plain CommonJS like services/spots.js (which holds Fall) so it can be unit-tested directly.
// `name` is the favourites key, so it must be unique across all seasons.

const placeholderSpot = (name, address) => ({ name, address, placeholderAddress: true });

const winterCategories = [
  {
    title: 'Ice Skating',
    spots: [
      placeholderSpot('Glacier Rink', '123 Ice Lane'),
      placeholderSpot('Frosty Pond', '456 Snowy Path'),
    ],
  },
  {
    title: 'Christmas Tree Farms',
    spots: [
      placeholderSpot('Evergreen Acres', '789 Pine Road'),
      placeholderSpot('Snowy Pines', '321 Winter Blvd'),
    ],
  },
];

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

module.exports = { winterCategories, springCategories, summerCategories };
