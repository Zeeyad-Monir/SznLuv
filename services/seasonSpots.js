// Winter, spring and summer spots for their season screens, lists and search.
// Plain CommonJS like services/spots.js (which holds Fall) so it can be unit-tested directly.
// `name` is the favourites key, so it must be unique across all seasons.

const winterCategories = [
  {
    title: 'Ice Skating',
    spots: [
      {
        name: 'Glacier Rink',
        address: '123 Ice Lane',
      },
      {
        name: 'Frosty Pond',
        address: '456 Snowy Path',
      },
    ],
  },
  {
    title: 'Christmas Tree Farms',
    spots: [
      {
        name: 'Evergreen Acres',
        address: '789 Pine Road',
      },
      {
        name: 'Snowy Pines',
        address: '321 Winter Blvd',
      },
    ],
  },
];

const springCategories = [
  {
    title: 'Botanical Gardens',
    spots: [
      { name: 'Blossom Garden', address: '123 Flower St' },
      { name: 'Spring Haven', address: '456 Bloom Blvd' },
    ],
  },
  {
    title: 'Bike Rides',
    spots: [
      { name: 'River Trail', address: '789 River Rd' },
      { name: 'Meadow Path', address: '321 Field Ln' },
    ],
  },
];

const summerCategories = [
  {
    title: 'Beaches',
    spots: [
      { name: 'Sunset Beach', address: '123 Ocean Drive' },
      { name: 'Golden Sands', address: '456 Shoreline Ave' },
      { name: 'Coral Cove', address: '789 Seaside Blvd' },
    ],
  },
];

module.exports = { winterCategories, springCategories, summerCategories };
