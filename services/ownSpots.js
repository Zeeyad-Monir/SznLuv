// Spots people add themselves: a name plus a dropped pin or a typed address. Plain CommonJS for unit tests.
const { catalogueSpots, catalogueRef } = require('./catalogue');
const { LIMITS } = require('./listsState');

const same = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
const newSpotId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// Why the form can't be saved yet, or null when it can.
function ownSpotProblem({ name, mode, address, pin }) {
  const clean = String(name ?? '').trim();
  if (!clean) return 'Give the spot a name.';
  if (clean.length > LIMITS.spotName) return `Names can be up to ${LIMITS.spotName} characters.`;
  if (mode === 'pin' && !pin) return 'Move the map so the pin sits on your spot.';
  if (mode === 'address' && !String(address ?? '').trim()) return 'Type an address, or drop a pin instead.';
  return null;
}

// A spot the app already lists under that exact name is used as it is, so it keeps its page and photos.
// One of the user's own spots with the same name and place is reused rather than duplicated.
function buildOwnSpot({ name, mode, address, pin, label }, existingOwnSpots = [], id = newSpotId()) {
  const clean = name.trim();
  const listed = catalogueSpots.find(spot => same(spot.name, clean));
  if (listed) return { ref: catalogueRef(listed.name), matched: true };

  const where = mode === 'pin'
    ? { lat: Number(pin.latitude.toFixed(5)), lng: Number(pin.longitude.toFixed(5)) }
    : {
      address: (label || address).trim(),
      ...(pin ? { lat: Number(pin.latitude.toFixed(5)), lng: Number(pin.longitude.toFixed(5)) } : {}),
    };
  const mine = existingOwnSpots.find(spot => same(spot.name, clean)
    && (where.address ? same(spot.address, where.address) : spot.lat === where.lat && spot.lng === where.lng));
  if (mine) return { ref: mine, matched: true };
  return { ref: { k: 'x', id, name: clean, ...where }, matched: false };
}

module.exports = { ownSpotProblem, buildOwnSpot, newSpotId };
