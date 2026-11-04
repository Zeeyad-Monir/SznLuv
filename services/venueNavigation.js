const venueRoutes = {
  'Aldor Family Farm': 'AldorFamilyFarmScreen',
  'Laity Pumpkin Patch': 'LaityPumpkinPatch',
  'Eagle Acres Dairy': 'EagleAcresDairy',
};
function openVenue(navigation, alert, name) {
  const route = venueRoutes[name];
  if (route) navigation.navigate(route);
  else alert('Details unavailable', `Details for ${name} are not available yet.`);
}
module.exports = { openVenue, venueRoutes };
