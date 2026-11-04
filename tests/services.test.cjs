const { test } = require('node:test');
const assert = require('node:assert/strict');
const { registerWithProfile } = require('../services/registrationFlow');
const { firebaseErrorMessage } = require('../services/firebaseErrors');
const { toggleFavourite, removeFavourite, changeCollection } = require('../services/favouritesState');
const { sessionAccess } = require('../services/sessionAccess');
const { openVenue, venueRoutes } = require('../services/venueNavigation');

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
