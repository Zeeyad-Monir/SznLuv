const { catalogueRef } = require('./catalogue');
const { linkRef } = require('./customSpotsState');

const SPOT_DETAIL_ROUTE = 'SpotDetailScreen';

// Once a tap starts navigating this screen loses focus, so a second quick tap on another card is ignored.
const canNavigate = navigation => navigation.isFocused?.() !== false;

function openSpot(navigation, ref, sourceListId) {
  if (!canNavigate(navigation)) return undefined;
  const spot = ref.k === 'x' ? linkRef(ref) : catalogueRef(ref.name);
  return navigation.navigate(SPOT_DETAIL_ROUTE, { spot, ...(sourceListId ? { sourceListId } : {}) });
}

module.exports = { openSpot, canNavigate, SPOT_DETAIL_ROUTE };
