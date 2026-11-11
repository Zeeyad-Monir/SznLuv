// The app's side of the Explore recommendations, as pure functions: what it tells the server about its own
// user, which cards count as seen, and the short memory of lists opened lately. Plain CommonJS for unit tests.
// The server does the ranking (functions/recs); nothing here scores anything.
const { collectionById } = require('./collections');

const OPENS_KEPT = 100;
const OPENS_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
// Mirrors LIMITS in functions/recs/config.js: the server cuts anything longer.
const LIMITS = { savedSpots: 300, followedLists: 300, followedOwners: 300, blocked: 300 };

const time = value => (Number.isFinite(value) ? value : undefined);
const newestFirst = (a, b) => (b.at ?? 0) - (a.at ?? 0);

// Everything the ranking may know about this person. All of it is already on the device, so the server
// reads nothing per request. A person can only skew their own feed by changing it.
//  favourites:  the favourites/{uid} document ({ [spot name]: {...}, 'x:{id}': {...} })
//  followed:    [{ id, followedAt }] list pointers
//  people:      [{ uid }] people followed
//  collections: [{ collectionId, savedAt }] saved seasonal collections
function buildSignals({ favourites = {}, followed = [], people = [], blocked = [], collections = [], opens = [] } = {}) {
  const savedSpots = Object.entries(favourites)
    .filter(([, entry]) => entry && typeof entry === 'object' && entry.isFavourite)
    .map(([key, entry]) => ({ key: key.startsWith('x:') ? key : `c:${key}`, at: time(entry.savedAt) }))
    .sort(newestFirst)
    .slice(0, LIMITS.savedSpots);
  const savedSeasons = [...new Set(collections.map(saved => collectionById(saved.collectionId)?.season).filter(Boolean))];
  return {
    savedSpots,
    followedLists: followed.map(pointer => ({ id: pointer.id, at: time(pointer.followedAt) })).sort(newestFirst).slice(0, LIMITS.followedLists),
    followedOwners: people.map(person => person.uid).filter(Boolean).slice(0, LIMITS.followedOwners),
    blocked: blocked.slice(0, LIMITS.blocked),
    savedSeasons,
    opens: opens.slice(0, OPENS_KEPT),
  };
}

// The lists opened lately, newest first, one entry per list.
function rememberOpen(opens = [], id, now = Date.now()) {
  const recent = opens.filter(open => open?.id && open.id !== id && now - open.at < OPENS_DAYS * DAY_MS);
  return [{ id, at: now }, ...recent].slice(0, OPENS_KEPT);
}

// A card counts as seen once at least half of it is on screen. `layouts` is { [id]: { y, height } } in the
// same coordinates as the scroll offset.
function seenCards(layouts, offset, viewport) {
  return Object.entries(layouts)
    .filter(([, box]) => {
      const middle = box.y + box.height / 2;
      return middle >= offset && middle <= offset + viewport;
    })
    .map(([id]) => id);
}

module.exports = { buildSignals, rememberOpen, seenCards, OPENS_KEPT };
