const { findSpotByName } = require('./spots');

// Original hand-built venue screens, keyed by the spot's list-card name.
const venueRoutes = {
  'Aldor Family Farm': 'AldorFamilyFarmScreen',
  'Laity Pumpkin Patch': 'LaityPumpkinPatch',
  'Eagle Acres Dairy': 'EagleAcresDairy',
};

// Route shared by every spot defined in services/spots.js.
const SPOT_DETAIL_ROUTE = 'SpotDetailScreen';

function openVenue(navigation, alert, name) {
  const route = venueRoutes[name];
  if (route) return navigation.navigate(route);
  const spot = findSpotByName(name);
  if (spot) return navigation.navigate(SPOT_DETAIL_ROUTE, { placeID: spot.placeID });
  return alert('Details unavailable', `Details for ${name} are not available yet.`);
}
module.exports = { openVenue, venueRoutes, SPOT_DETAIL_ROUTE };
