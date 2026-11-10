// Top 4: up to four favourite spots per city, private until the owner shows them. Pure functions.
// Shape, stored on users/{uid}: { [cityId]: { picks: [spotRef], public: boolean } }
const { spotKey, isOwnSpot, describeWhere } = require('./catalogue');

const MAX_PICKS = 4;
const EMPTY = { picks: [], public: false };

const cityTop4 = (top4, cityId) => ({ ...EMPTY, ...(top4?.[cityId] ?? {}) });
const withCity = (top4, cityId, city) => ({ ...(top4 ?? {}), [cityId]: city });
const indexOfPick = (picks, key) => picks.findIndex(pick => spotKey(pick) === key);

function addPick(top4, cityId, ref) {
  const city = cityTop4(top4, cityId);
  if (city.picks.length >= MAX_PICKS || indexOfPick(city.picks, spotKey(ref)) !== -1) return top4 ?? {};
  return withCity(top4, cityId, { ...city, picks: [...city.picks, ref] });
}

// With nothing left to show, the city goes back to private.
function removePick(top4, cityId, key) {
  const city = cityTop4(top4, cityId);
  const picks = city.picks.filter(pick => spotKey(pick) !== key);
  return withCity(top4, cityId, { picks, public: city.public && picks.length > 0 });
}

function movePick(top4, cityId, key, delta) {
  const city = cityTop4(top4, cityId);
  const from = indexOfPick(city.picks, key);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= city.picks.length) return top4 ?? {};
  const picks = [...city.picks];
  [picks[from], picks[to]] = [picks[to], picks[from]];
  return withCity(top4, cityId, { ...city, picks });
}

// Swaps one pick for another spot in the same slot.
function replacePick(top4, cityId, key, ref) {
  const city = cityTop4(top4, cityId);
  const index = indexOfPick(city.picks, key);
  if (index === -1 || indexOfPick(city.picks, spotKey(ref)) !== -1) return top4 ?? {};
  const picks = [...city.picks];
  picks[index] = ref;
  return withCity(top4, cityId, { ...city, picks });
}

function setPublic(top4, cityId, isPublic) {
  const city = cityTop4(top4, cityId);
  return withCity(top4, cityId, { ...city, public: isPublic && city.picks.length > 0 });
}

// What goes on the public profile: only cities the owner chose to show, and only real picks.
function publicTop4(top4) {
  return Object.fromEntries(Object.entries(top4 ?? {})
    .filter(([, city]) => city?.public && city.picks?.length)
    .map(([cityId, city]) => [cityId, city.picks.slice(0, MAX_PICKS)]));
}

// Own spots whose address or pin would become visible, for the confirm before showing them.
const exposedLocations = picks => picks.filter(pick => isOwnSpot(pick) && describeWhere(pick)).map(pick => ({ key: spotKey(pick), name: pick.name, text: describeWhere(pick) }));

module.exports = { MAX_PICKS, cityTop4, addPick, removePick, movePick, replacePick, setPublic, publicTop4, exposedLocations };
