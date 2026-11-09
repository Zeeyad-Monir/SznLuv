const { test } = require('node:test');
const assert = require('node:assert/strict');
const { registerWithProfile } = require('../services/registrationFlow');
const { firebaseErrorMessage } = require('../services/firebaseErrors');
const { toggleFavourite, removeFavourite, changeCollection } = require('../services/favouritesState');
const { sessionAccess } = require('../services/sessionAccess');
const { openVenue, venueRoutes, SPOT_DETAIL_ROUTE } = require('../services/venueNavigation');
const { buildForecastUrl, processDailyData, fetchForecast, WEATHER_UNAVAILABLE } = require('../services/weather');
const { fallCategoryTitles, legacyFallSpots, detailedFallSpots, fallCategories, fallSpotNames, getSpotByPlaceID } = require('../services/spots');

function registrationFixture(failures = {}) {
  const calls = [];
  const user = { uid: 'new-account', email: 'audit@example.com' };
  const operation = name => async (...args) => {
    calls.push({ name, args });
    if (failures[name]) throw Object.assign(new Error(name + ' failed'), { code: failures[name] });
    return name === 'createAccount' ? user : undefined;
  };
  return { user, calls, operations: Object.fromEntries(['createAccount', 'saveProfile', 'deleteAccount', 'signOut'].map(name => [name, operation(name)])) };
}
const credentials = { username: 'audit_user', email: 'audit@example.com', password: 'TestPass99!' };

test('signup authenticates before provisioning, then signs out', async () => {
  const f = registrationFixture();
  assert.equal(await registerWithProfile(f.operations, credentials), f.user);
  assert.deepEqual(f.calls.map(c => c.name), ['createAccount', 'saveProfile', 'signOut']);
  assert.deepEqual(f.calls[1].args, [f.user, credentials.username]);
});
for (const code of ['permission-denied', 'signup/username-taken', 'unavailable']) {
  test(`failed provisioning (${code}) rolls back only the new auth account`, async () => {
    const f = registrationFixture({ saveProfile: code });
    await assert.rejects(registerWithProfile(f.operations, credentials), e => e.code === code && e.stage === 'profile' && e.cleanupErrors.length === 0);
    assert.deepEqual(f.calls.map(c => c.name), ['createAccount', 'saveProfile', 'deleteAccount', 'signOut']);
    assert.equal(f.calls[2].args[0], f.user);
  });
}
test('failed auth never deletes or signs out an unrelated existing account', async () => {
  const f = registrationFixture({ createAccount: 'auth/email-already-in-use' });
  await assert.rejects(registerWithProfile(f.operations, credentials), { code: 'auth/email-already-in-use' });
  assert.deepEqual(f.calls.map(c => c.name), ['createAccount']);
});
test('failed deletion still attempts logout and exposes incomplete cleanup', async () => {
  const f = registrationFixture({ saveProfile: 'permission-denied', deleteAccount: 'auth/network-request-failed' });
  await assert.rejects(registerWithProfile(f.operations, credentials), error => {
    assert.deepEqual(error.cleanupErrors, [{ stage: 'delete-account', code: 'auth/network-request-failed' }]);
    assert.match(firebaseErrorMessage(error, 'signup'), /account may still exist/);
    return true;
  });
  assert.equal(f.calls.at(-1).name, 'signOut');
});
test('logout failure retains a successfully provisioned account', async () => {
  const f = registrationFixture({ signOut: 'auth/network-request-failed' });
  await assert.rejects(registerWithProfile(f.operations, credentials), error => {
    assert.equal(error.profileSaved, true);
    assert.equal(error.stage, 'signout');
    return true;
  });
  assert.ok(!f.calls.some(c => c.name === 'deleteAccount'));
});
test('current Firebase wrong-password response is actionable without account enumeration', () => {
  assert.equal(firebaseErrorMessage({ code: 'auth/invalid-credential' }), 'The email or password is incorrect.');
  assert.equal(firebaseErrorMessage({ code: 'auth/user-not-found' }), firebaseErrorMessage({ code: 'auth/wrong-password' }));
});

const base = { collections: [{ title: 'Weekend', color: 'pink', dates: ['Farm'] }], Farm: { isFavourite: true, season: 'Fall' }, Other: { isFavourite: true, season: 'Winter' } };
test('favourite removal preserves collections and other seasons without mutating its snapshot', () => {
  const next = toggleFavourite(base, 'Farm', { isFavourite: true });
  assert.ok(!next.Farm);
  assert.deepEqual(next.collections, base.collections);
  assert.deepEqual(next.Other, base.Other);
  assert.ok(base.Farm);
});
test('separate favourite additions retain both changes when applied to fresh state', () => {
  const entry = { isFavourite: true, season: 'Spring' };
  const next = toggleFavourite(toggleFavourite(base, 'Garden', entry), 'Trail', entry);
  assert.ok(next.Garden && next.Trail && next.Farm);
});
test('explicit removal does not accidentally toggle an absent favourite back on', () => {
  assert.deepEqual(removeFavourite(removeFavourite(base, 'Farm'), 'Farm'), removeFavourite(base, 'Farm'));
});
test('collection edits preserve favourites and existing membership and reject duplicates', () => {
  const next = changeCollection(base, { type: 'add', title: 'Weekend', spot: 'Garden' });
  assert.deepEqual(next.collections[0].dates, ['Farm', 'Garden']);
  assert.deepEqual(base.collections[0].dates, ['Farm']);
  assert.deepEqual(changeCollection(next, { type: 'add', title: 'Weekend', spot: 'Garden' }), next);
  assert.deepEqual(changeCollection(next, { type: 'remove', title: 'Weekend', spot: 'Farm' }).collections[0].dates, ['Garden']);
  assert.equal(next.Other, base.Other);
  assert.throws(() => changeCollection(base, { type: 'create', title: 'weekend', color: 'blue' }), /already exists/);
});
test('deleted collections cannot be recreated by delayed membership updates', () => {
  const next = changeCollection(base, { type: 'delete', title: 'Weekend' });
  assert.ok(next.Farm);
  assert.throws(() => changeCollection(next, { type: 'add', title: 'Weekend', spot: 'Garden' }), /not found/);
});

test('provisioning and incomplete profiles never grant Home access', () => {
  const state = { initializing: false, user: { uid: 'audit' }, registering: false, profile: { status: 'ready' } };
  assert.equal(sessionAccess(state), 'home');
  assert.equal(sessionAccess({ ...state, registering: true }), 'auth');
  assert.equal(sessionAccess({ ...state, profile: { status: 'checking' } }), 'loading');
  for (const status of ['missing', 'error']) assert.equal(sessionAccess({ ...state, profile: { status } }), 'blocked');
  assert.equal(sessionAccess({ ...state, registrationError: 'Logout failed' }), 'blocked');
  assert.equal(sessionAccess({ ...state, user: null }), 'auth');
});
test('venue links navigate only to registered screens and explain unavailable destinations', () => {
  const navigated = [], alerts = [];
  const nav = { navigate: route => navigated.push(route) };
  const alert = (...args) => alerts.push(args);
  for (const name of Object.keys(venueRoutes)) openVenue(nav, alert, name);
  for (const name of ['Glacier Rink', 'Blossom Garden', 'Sunset Beach']) openVenue(nav, alert, name);
  assert.equal(navigated.length, 3);
  assert.equal(alerts.length, 3);
  assert.ok(alerts.every(([title]) => title === 'Details unavailable'));
});

const otherSeasonSpotNames = ['Glacier Rink', 'Frosty Pond', 'Evergreen Acres', 'Snowy Pines', 'Science World', 'Blossom Garden', 'VanDusen Botanical Garden', 'Spring Haven', 'River Trail', 'Meadow Path', 'Sunset Beach', 'English Bay', 'Golden Sands', 'Grouse Grind', 'Coral Cove'];
test('fall spots: every detailed spot has the complete, consistently formatted record the venue page needs', () => {
  assert.equal(detailedFallSpots.length, 30);
  const placeIDs = new Set(), names = new Set();
  for (const spot of detailedFallSpots) {
    for (const field of ['placeID', 'category', 'name', 'address', 'title', 'detailAddress', 'tagline']) {
      assert.ok(typeof spot[field] === 'string' && spot[field].trim() === spot[field] && spot[field].length > 0, `${spot.placeID}: ${field}`);
    }
    assert.match(spot.placeID, /^[a-z]+(_[a-z]+)*$/, spot.placeID);
    assert.ok(fallCategoryTitles.includes(spot.category), `${spot.placeID}: category`);
    assert.ok(!/[./]/.test(spot.name) && spot.name !== 'collections', `${spot.placeID}: name is a safe favourites key`);
    assert.ok(!spot.address.includes(', BC') && spot.detailAddress.endsWith(', BC'), `${spot.placeID}: address formats`);
    assert.ok(spot.tagline.endsWith('!'), `${spot.placeID}: tagline`);
    assert.ok(Number.isFinite(spot.latitude) && spot.latitude > 48.9 && spot.latitude < 49.4, `${spot.placeID}: latitude near Greater Vancouver`);
    assert.ok(Number.isFinite(spot.longitude) && spot.longitude > -123.3 && spot.longitude < -122.2, `${spot.placeID}: longitude near Greater Vancouver`);
    assert.equal(spot.about.length, 3, `${spot.placeID}: about paragraphs`);
    assert.ok(spot.about.every(text => text.trim().length > 40), `${spot.placeID}: about text`);
    assert.ok(spot.about[2].startsWith('Good to know:'), `${spot.placeID}: practical paragraph`);
    assert.ok(!placeIDs.has(spot.placeID) && !names.has(spot.name), `${spot.placeID}: unique`);
    placeIDs.add(spot.placeID); names.add(spot.name);
    assert.equal(getSpotByPlaceID(spot.placeID), spot);
  }
  assert.equal(getSpotByPlaceID('does_not_exist'), undefined);
});
test('fall spots: names are unique across seasons and the list matches the original three venue screens', () => {
  assert.equal(new Set(fallSpotNames).size, fallSpotNames.length);
  assert.equal(fallSpotNames.length, 33);
  assert.ok(fallSpotNames.every(name => !otherSeasonSpotNames.includes(name)));
  assert.deepEqual(legacyFallSpots.map(spot => spot.name).sort(), Object.keys(venueRoutes).sort());
  assert.deepEqual(fallCategories.map(category => category.spots.length), [12, 6, 5, 4, 6]);
  assert.ok(fallCategories.every(category => category.spots.every(spot => spot.name && spot.address)));
});
test('venue links open the shared detail page for every new fall spot', () => {
  for (const spot of detailedFallSpots) {
    const navigated = [], alerts = [];
    openVenue({ navigate: (...args) => navigated.push(args) }, (...args) => alerts.push(args), spot.name);
    assert.deepEqual(navigated, [[SPOT_DETAIL_ROUTE, { placeID: spot.placeID }]], spot.name);
    assert.equal(alerts.length, 0);
  }
  for (const [name, route] of Object.entries(venueRoutes)) {
    const navigated = [];
    openVenue({ navigate: (...args) => navigated.push(args) }, () => assert.fail('legacy spot should navigate'), name);
    assert.deepEqual(navigated, [[route]]);
  }
});

test('spot titles are short enough to fit one line on the venue page', () => {
  for (const spot of detailedFallSpots) assert.ok(spot.title.length <= 41, `${spot.placeID}: "${spot.title}" is ${spot.title.length} characters`);
});
test('weather: the forecast URL uses the coordinates it is given', () => {
  assert.equal(buildForecastUrl(49.1, -122.5, 'KEY'), 'https://api.openweathermap.org/data/2.5/forecast?lat=49.1&lon=-122.5&appid=KEY&units=metric');
});
test('weather: one entry per day, preferring the one at noon', () => {
  const at = (day, hour) => ({ dt: new Date(2026, 10, day, hour).getTime() / 1000, hour });
  const daily = processDailyData([at(5, 3), at(5, 12), at(5, 18), at(6, 0), at(6, 3), at(6, 9)]);
  assert.equal(daily.length, 2);
  assert.equal(daily[0].hour, 12);
  assert.equal(daily[1].hour, 3); // no noon entry: falls back to the middle one
});
test('weather: fetchForecast returns the data, and turns every failure into one friendly message', async () => {
  const list = [{ dt: new Date(2026, 10, 5, 12).getTime() / 1000 }];
  const ok = await fetchForecast(49, -123, { key: 'K', fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ city: { name: 'X' }, list }) }) });
  assert.equal(ok.weatherData.city.name, 'X');
  assert.equal(ok.dailyData.length, 1);
  const failures = {
    'HTTP error': async () => ({ ok: false, status: 401, json: async () => ({ message: 'Invalid API key' }) }),
    'network error': async () => { throw new Error('Network request failed'); },
    'malformed body': async () => ({ ok: true, status: 200, json: async () => ({}) }),
  };
  for (const [label, fetchImpl] of Object.entries(failures)) {
    await assert.rejects(() => fetchForecast(49, -123, { key: 'K', fetchImpl }), error => error.message === WEATHER_UNAVAILABLE && typeof error.detail === 'string', label);
  }
});
