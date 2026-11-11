// The Explore functions (functions/handlers.js) run against the Firestore emulator, the way the deployed
// triggers call them. Also holds the cost promises: what a feed request and a follow are allowed to read.
// Run with: npm run test:rules
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { createRequire } = require('module');

// firebase-admin belongs to the functions package, not the app.
const fromFunctions = createRequire(path.join(__dirname, '..', '..', 'functions', 'package.json'));
const { initializeApp, deleteApp } = fromFunctions('firebase-admin/app');
const { getFirestore } = fromFunctions('firebase-admin/firestore');
const { createHandlers, cleanSignals } = require('../../functions/handlers');
const config = require('../../functions/recs/config');
const { shardOf, shardIds } = require('../../functions/recs/indexState');
const { dayNumber } = require('../../functions/recs/score');

const DAY = config.DAY_MS;
const START = Date.UTC(2026, 9, 20, 12);
const c = name => ({ spot: { k: 'c', name }, note: '' });
const publicList = (ownerUid, title, names, extra = {}) => ({
  ownerUid, ownerUsername: ownerUid, title, description: 'Worth the drive.', cityId: 'vancouver',
  cover: { type: 'colour', value: '#A7C8FF' }, items: names.map(c), spotCount: names.length,
  publishedAt: START - DAY, updatedAt: START - DAY, searchTerms: [], followerCount: 0, ...extra,
});
const SALMON = ['Tynehead Hatchery', 'Hoy Creek Hatchery', 'Kanaka Creek Fish Fence'];
const HALLOWEEN = ['Burnaby Haunted Village', 'Fright Nights at Playland', 'Lost Souls of Gastown'];

let app, db, handlers, now;

// Publishes the way the app does (a write to publicLists), then runs the trigger on that write.
async function write(id, after) {
  const ref = db.collection('publicLists').doc(id);
  const before = (await ref.get()).data();
  if (after) await ref.set(after); else await ref.delete();
  return handlers.onListWritten(id, before, after);
}
const entryOf = async id => (await db.collection('exploreIndex').doc(shardOf(id)).get()).data()?.lists?.[id];

test.before(() => {
  app = initializeApp({ projectId: 'demo-sznluv' }, 'explore-tests');
  db = getFirestore(app);
});

test.beforeEach(async () => {
  for (const name of ['publicLists', 'publicSpots', 'exploreIndex', 'exploreMetrics', 'events']) {
    const snapshot = await db.collection(name).get();
    await Promise.all(snapshot.docs.map(doc => doc.ref.delete()));
  }
  now = START;
  handlers = createHandlers(db, { clock: () => now });
});

test.after(() => deleteApp(app));

test('explore: publishing indexes a list, and a feed request reads nothing once the index is warm', async () => {
  assert.equal(await write('wild', publicList('ana', 'By the water', SALMON)), 'indexed');
  assert.equal(await write('spooky', publicList('cy', 'After dark', HALLOWEEN)), 'indexed');
  const entry = await entryOf('wild');
  assert.equal(entry.title, 'By the water');
  assert.ok(entry.features['cat:salmon & wildlife'] > 0);
  assert.equal(entry.season, 'Fall');

  const signals = { savedSpots: [{ key: 'c:Tynehead Hatchery', at: now }] };
  const first = await handlers.exploreFeed('me', { signals });
  assert.equal(first.algo, config.ALGO_VERSION);
  assert.deepEqual(first.lists.map(list => list.id), ['wild', 'spooky']);
  assert.equal(first.lists[0].reason, 'personal');
  assert.equal(first.lists[0].ownerUsername, 'ana');
  assert.equal(handlers.stats.indexReads, config.SHARDS, 'a cold request reads the index documents once');

  const other = await handlers.exploreFeed('them', { signals: { savedSpots: [{ key: 'c:Lost Souls of Gastown', at: now }] } });
  assert.equal(other.lists[0].id, 'spooky');
  await handlers.exploreFeed('me', { signals, nonce: 'again' });
  assert.equal(handlers.stats.indexReads, config.SHARDS, 'warm requests read nothing');

  assert.deepEqual((await handlers.exploreFeed('ana', {})).lists.map(list => list.id), ['spooky'], 'never your own list');
});

test('explore: a follow is one counted write and leaves the entry alone', async () => {
  const list = publicList('ana', 'By the water', SALMON);
  await write('wild', list);
  const before = await entryOf('wild');
  for (let followers = 1; followers <= 4; followers += 1) {
    assert.equal(await write('wild', { ...list, followerCount: followers }), 'counted');
  }
  assert.equal(await write('wild', { ...list, followerCount: 3 }), 'counted'); // One unfollow
  const after = await entryOf('wild');
  assert.deepEqual(after.fb, { [dayNumber(now)]: 3 });
  assert.equal(after.fc, 3);
  assert.deepEqual(after.features, before.features);
  assert.equal(after.title, before.title);
  assert.equal(await write('wild', { ...list, followerCount: 3 }), 'unchanged');

  now += config.INDEX_TTL_MS + 1;
  const feed = await handlers.exploreFeed('me', {});
  assert.equal(feed.lists[0].followerCount, 3);
  assert.equal(feed.lists[0].reason, 'trending');
});

test('explore: an edit replaces what the list is about and keeps its follow history', async () => {
  const list = publicList('ana', 'By the water', SALMON);
  await write('wild', list);
  await write('wild', { ...list, followerCount: 1 });
  assert.equal(await write('wild', { ...list, followerCount: 1, title: 'After dark now', items: HALLOWEEN.map(c), updatedAt: now }), 'indexed');
  const entry = await entryOf('wild');
  assert.equal(entry.title, 'After dark now');
  assert.equal(entry.features['cat:salmon & wildlife'], undefined, 'old features are gone, not merged');
  assert.ok(entry.features['cat:halloween & after dark'] > 0);
  assert.deepEqual(entry.fb, { [dayNumber(now)]: 1 });
});

test('explore: spots the owner made bring their category and season from the public copy', async () => {
  await db.collection('publicSpots').doc('ana_1').set({ ownerUid: 'ana', name: 'Tree lot', category: 'Christmas Tree Farms', seasons: ['winter'], address: '1 Fir Rd, Langley' });
  const item = { spot: { k: 'x', id: 'ana_1', owner: 'ana', name: 'Tree lot', address: '1 Fir Rd, Langley' }, note: '' };
  await write('trees', publicList('ana', 'Tree hunting', [], { items: [item], spotCount: 1 }));
  const entry = await entryOf('trees');
  assert.equal(entry.season, 'Winter');
  assert.ok(entry.features['cat:christmas tree farms'] > 0 && entry.features['loc:langley'] > 0);
});

test('explore: a withdrawn list leaves the index at once and the feed within ten minutes', async () => {
  await write('wild', publicList('ana', 'By the water', SALMON));
  await write('spooky', publicList('cy', 'After dark', HALLOWEEN));
  assert.equal((await handlers.exploreFeed('me', {})).lists.length, 2);
  assert.equal(await write('wild', undefined), 'removed');
  assert.equal(await entryOf('wild'), undefined);
  assert.ok(await entryOf('spooky') || shardOf('spooky') !== shardOf('wild'));
  now += config.INDEX_TTL_MS + 1;
  assert.deepEqual((await handlers.exploreFeed('me', {})).lists.map(list => list.id), ['spooky']);
});

test('explore: the daily pass counts events once, deletes them, and repairs the index', async () => {
  await write('wild', publicList('ana', 'By the water', SALMON));
  // Published before the functions existed (no trigger ran), and an entry whose list is gone.
  await db.collection('publicLists').doc('old').set(publicList('cy', 'After dark', HALLOWEEN, { followerCount: 7 }));
  await db.collection('exploreIndex').doc(shardOf('ghost')).set({ lists: { ghost: { ownerUid: 'x', title: 'Gone', features: {} } } }, { merge: true });

  const at = new Date(now);
  await db.collection('events').add({ uid: 'a', at, session: 's', algo: 'recs-1', items: [{ t: 'imp', l: 'wild', ms: now, r: 'personal' }, { t: 'imp', l: 'wild', ms: now }, { t: 'open', l: 'wild', ms: now, r: 'personal' }] });
  await db.collection('events').add({ uid: 'b', at, session: 't', algo: 'recs-1', items: [{ t: 'imp', l: 'wild', ms: now }] });

  const result = await handlers.dailyMaintenance();
  assert.equal(result.totals.impressions, 2);
  assert.deepEqual(result.reconciled, { lists: 2, repaired: 1, removed: 1 });
  assert.equal((await db.collection('events').get()).size, 0, 'raw events are not kept');

  const wild = await entryOf('wild');
  assert.deepEqual(wild.im, { [dayNumber(now)]: 2 });
  assert.deepEqual(wild.op, { [dayNumber(now)]: 1 });
  assert.equal((await entryOf('old')).fc, 7);
  assert.equal(await entryOf('ghost'), undefined);

  const metrics = (await db.collection('exploreMetrics').doc('2026-10-20').get()).data();
  assert.equal(metrics.impressions, 2);
  assert.equal(metrics.opens, 1);
  assert.equal(metrics.people, 2);
  assert.deepEqual(metrics.byReason.personal, { impressions: 1, opens: 1, follows: 0 });

  // The next day there is nothing to count and the weekly check is not due.
  now += DAY;
  assert.equal((await handlers.dailyMaintenance()).reconciled, null);
  assert.deepEqual((await handlers.exploreFeed('me', {})).lists.map(list => list.id).sort(), ['old', 'wild']);
  assert.deepEqual(shardIds().length, config.SHARDS);
});

test('explore: whatever a request sends is cut down to size, never trusted or thrown', () => {
  const cleaned = cleanSignals({
    savedSpots: [{ key: 'c:Stanley Park', at: 5 }, { key: 7 }, null, { key: 'x'.repeat(500) }, { key: 'c:Undated', at: 'yesterday' }],
    followedLists: Array.from({ length: 1000 }, (_, n) => ({ id: `l${n}`, at: n + 1 })),
    blocked: ['a', 3, { uid: 'b' }],
    opens: 'nope',
    surprise: true,
  });
  assert.deepEqual(cleaned.savedSpots, [{ key: 'c:Stanley Park', at: 5 }, { key: 'c:Undated', at: undefined }]);
  assert.equal(cleaned.followedLists.length, config.LIMITS.followedLists);
  assert.deepEqual(cleaned.blocked, ['a']);
  assert.deepEqual(cleaned.opens, []);
  assert.equal('surprise' in cleaned, false);
  assert.deepEqual(cleanSignals(null).followedOwners, []);
});
