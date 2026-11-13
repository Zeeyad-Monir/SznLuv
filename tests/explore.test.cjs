// The app's side of the Explore recommendations: what it sends about its own user, the ranked page with its
// fallback, and the batched events. The ranking itself is tested in recs.test.cjs.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildSignals, rememberOpen, seenCards, OPENS_KEPT } = require('../services/exploreState');
const { toPublicSnapshot, createList, addSpot } = require('../services/listsState');
const { catalogueRef } = require('../services/catalogue');
const { createHarness, act } = require('./renderHarness.cjs');
const { mount, flush, quiet } = require('./support.cjs');

const DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------- What the app sends

test('signals: saved spots, follows, blocks and saved seasons, newest first and nothing else', () => {
  const signals = buildSignals({
    favourites: {
      listsMigratedAt: 1,
      'Stanley Park': { isFavourite: true, season: 'Fall', location: 'Vancouver' },
      'Tynehead Hatchery': { isFavourite: true, season: 'Fall', savedAt: 50 },
      'Old one': { isFavourite: false },
      'x:maya_lake': { isFavourite: true, owner: 'maya', name: 'Secret Lake', savedAt: 90 },
    },
    followed: [{ id: 'a', followedAt: 5 }, { id: 'b', followedAt: 9 }],
    people: [{ uid: 'maya-uid', username: 'maya' }],
    blocked: ['troll-uid'],
    collections: [{ collectionId: 'vancouver-fall', savedAt: 1 }, { collectionId: 'retired-thing', savedAt: 2 }],
    opens: [{ id: 'a', at: 3 }],
  });
  assert.deepEqual(signals.savedSpots, [
    { key: 'x:maya_lake', at: 90 }, { key: 'c:Tynehead Hatchery', at: 50 }, { key: 'c:Stanley Park', at: undefined },
  ]);
  assert.deepEqual(signals.followedLists, [{ id: 'b', at: 9 }, { id: 'a', at: 5 }]);
  assert.deepEqual(signals.followedOwners, ['maya-uid']);
  assert.deepEqual(signals.blocked, ['troll-uid']);
  assert.deepEqual(signals.savedSeasons, ['Fall']);
  assert.deepEqual(signals.opens, [{ id: 'a', at: 3 }]);
  assert.deepEqual(buildSignals().savedSpots, []);
});

test('signals: opened lists are remembered once each, newest first, for thirty days', () => {
  const now = 100 * DAY;
  let opens = rememberOpen([], 'a', now - 2 * DAY);
  opens = rememberOpen(opens, 'b', now - DAY);
  opens = rememberOpen(opens, 'a', now);
  assert.deepEqual(opens, [{ id: 'a', at: now }, { id: 'b', at: now - DAY }]);
  assert.deepEqual(rememberOpen([{ id: 'old', at: now - 40 * DAY }], 'new', now), [{ id: 'new', at: now }]);
  const many = Array.from({ length: 150 }, (_, n) => ({ id: `l${n}`, at: now - n }));
  assert.equal(rememberOpen(many, 'x', now).length, OPENS_KEPT);
});

test('impressions: a card is seen once half of it is on screen', () => {
  const layouts = { top: { y: 0, height: 200 }, middle: { y: 700, height: 200 }, below: { y: 1500, height: 200 } };
  assert.deepEqual(seenCards(layouts, 0, 800), ['top', 'middle']);
  assert.deepEqual(seenCards(layouts, 150, 700), ['middle'], 'more than half of the first card has scrolled away');
  assert.deepEqual(seenCards(layouts, 900, 800), ['below']);
});

// ---------------------------------------------------------------- The page

const farm = catalogueRef('Aldor Family Farm');
const card = (id, title, owner, extra = {}) => ({
  id, title, ownerUid: `${owner}-uid`, ownerUsername: owner, cover: { type: 'colour', value: '#A7C8FF' }, spotCount: 3,
  cityId: 'vancouver', publishedAt: 1, updatedAt: 1, followerCount: 0, season: 'Fall', reason: 'personal', ...extra,
});
const publicList = (title, ownerUid, ownerUsername, now) => toPublicSnapshot(
  addSpot(createList({ ownerUid, title, now }), farm), { ownerUsername, now });
const documents = (more = {}) => ({
  'users/audit': { username: 'audit', blocked: ['troll-uid'] },
  'favourites/audit': { listsMigratedAt: 1, 'Tynehead Hatchery': { isFavourite: true, season: 'Fall', savedAt: 5 } },
  'users/audit/followedLists/f1': { title: 'Followed', followedAt: 7, publishedAt: 1 },
  'users/audit/followedPeople/maya-uid': { username: 'maya', followedAt: 3 },
  'users/audit/savedCollections/vancouver-fall': { collectionId: 'vancouver-fall', cityId: 'vancouver', savedAt: 2 },
  ...more,
});
const labels = screen => screen.all('TouchableOpacity').map(node => node.props.accessibilityLabel).filter(label => / by /.test(label ?? ''));
const feedCalls = h => h.calls.filter(([name, fn]) => name === 'callFunction' && fn === 'getExploreFeed').map(call => call[2]);

test('explore: For you is the ranked feed, asked for once with what the app knows about its user', async () => {
  const lists = [card('a', 'By the water', 'ana'), card('b', 'After dark', 'cy', { reason: 'trending' }), card('c', 'Skate night', 'dee', { season: 'Winter', reason: 'new' })];
  // No public lists are stored at all: every card on the page comes from the function's answer.
  const h = createHarness({ documents: documents(), exploreFeed: async () => ({ algo: 'recs-1', lists }) });
  const screen = await mount(h, 'screens/ExploreScreen.js');
  assert.ok(screen.texts().includes('Picked for you'));
  assert.deepEqual(labels(screen), ['Featured: By the water, 3 spots, by ana', 'After dark, 3 spots, by cy', 'Skate night, 3 spots, by dee']);

  const [request] = feedCalls(h);
  assert.equal(feedCalls(h).length, 1);
  assert.deepEqual(request.signals.savedSpots, [{ key: 'c:Tynehead Hatchery', at: 5 }]);
  assert.deepEqual(request.signals.followedLists, [{ id: 'f1', at: 7 }]);
  assert.deepEqual(request.signals.followedOwners, ['maya-uid']);
  assert.deepEqual(request.signals.blocked, ['troll-uid']);
  assert.deepEqual(request.signals.savedSeasons, ['Fall']);
  assert.equal(request.cityId, 'vancouver');
  assert.equal(request.nonce, '');

  await screen.press('Winter');
  assert.deepEqual(labels(screen), ['Skate night, 3 spots, by dee'], 'season chips use the season the server worked out');
  await screen.press('For you');
  await screen.press('Featured: By the water, 3 spots, by ana');
  assert.deepEqual(h.navigations.at(-1), ['ListScreen', { listId: 'a' }]);
  assert.equal(feedCalls(h).length, 1, 'changing chips asks for nothing new');
});

test('explore: the ranked feed pages on the device, and a pull asks for a new ranking', async () => {
  const lists = Array.from({ length: 45 }, (_, n) => card(`l${n}`, `List ${n}`, `owner${n}`));
  let asked = 0;
  const h = createHarness({
    documents: documents(),
    exploreFeed: async () => { asked += 1; return { algo: 'recs-1', lists: asked === 1 ? lists : [...lists].reverse() }; },
  });
  const screen = await mount(h, 'screens/ExploreScreen.js');
  assert.equal(labels(screen).length, 20);
  await screen.press('Load more');
  assert.equal(labels(screen).length, 40);
  await screen.press('Load more');
  assert.equal(labels(screen).length, 45);
  assert.equal(screen.button('Load more'), undefined);
  assert.equal(asked, 1, 'more pages cost no calls');
  assert.equal(new Set(labels(screen)).size, 45, 'and nothing is shown twice');

  const refresh = screen.all('ScrollView')[0].props.refreshControl;
  await act(async () => { await refresh.props.onRefresh(); });
  await flush();
  assert.equal(asked, 2);
  assert.notEqual(feedCalls(h)[1].nonce, '');
  assert.equal(labels(screen)[0], 'Featured: List 44, 3 spots, by owner44');
  assert.equal(labels(screen).length, 20, 'back to the first page');
});

test('explore: Recommended is one of three sorts; Newest reads the newest lists only when chosen', async () => {
  const h = createHarness({
    documents: documents({ 'publicLists/n1': publicList('Just published', 'alex-uid', 'alex', 500), 'publicLists/n0': publicList('Older', 'maya-uid', 'maya', 400) }),
    exploreFeed: async () => ({ algo: 'recs-1', lists: [card('a', 'By the water', 'ana'), card('b', 'After dark', 'cy')] }),
  });
  const screen = await mount(h, 'screens/ExploreScreen.js');
  assert.equal(screen.button('Sort lists, changed'), undefined, 'Recommended is the default');
  await screen.press('Sort lists');
  assert.deepEqual(screen.button('Recommended').props.accessibilityState, { selected: true });
  await screen.press('Newest');
  await screen.press('Apply');
  assert.ok(screen.texts().includes('New in Vancouver'));
  assert.deepEqual(labels(screen), ['Featured: Just published, 1 spot, by alex', 'Older, 1 spot, by maya']);
  assert.ok(screen.button('Sort lists, changed'));
});

test('explore: someone blocked after the feed was fetched is hidden from it', async () => {
  const h = createHarness({
    documents: documents(),
    exploreFeed: async () => ({ algo: 'recs-1', lists: [card('t', 'Spam', 'troll'), card('a', 'By the water', 'ana')] }),
  });
  const screen = await mount(h, 'screens/ExploreScreen.js');
  assert.deepEqual(labels(screen), ['Featured: By the water, 3 spots, by ana']);
});

test('explore: without the function the page is the newest lists, and Recommended is not offered', async () => {
  const h = createHarness({ documents: documents({ 'publicLists/n1': publicList('Just published', 'alex-uid', 'alex', 500), 'publicLists/n0': publicList('Older', 'maya-uid', 'maya', 400) }) });
  const screen = await mount(h, 'screens/ExploreScreen.js');
  assert.ok(screen.texts().includes('New in Vancouver'));
  assert.deepEqual(labels(screen), ['Featured: Just published, 1 spot, by alex', 'Older, 1 spot, by maya']);
  assert.equal(feedCalls(h).length, 1);
  await screen.press('Sort lists');
  assert.equal(screen.button('Recommended'), undefined);
  assert.deepEqual(screen.button('Newest').props.accessibilityState, { selected: true });
});

test('explore: an answer that is not a feed is treated as no answer', async () => {
  const h = createHarness({
    documents: documents({ 'publicLists/n1': publicList('Just published', 'alex-uid', 'alex', 500) }),
    exploreFeed: async () => ({ error: 'nope' }),
  });
  const screen = await quiet(() => mount(h, 'screens/ExploreScreen.js'));
  assert.deepEqual(labels(screen), ['Featured: Just published, 1 spot, by alex']);
});

// ---------------------------------------------------------------- Opening without a wait

const HOUR = 60 * 60 * 1000;
const savedFeed = (lists, more = {}) => ({
  'explore.feed.audit': JSON.stringify({ cityId: 'vancouver', at: Date.now() - HOUR, feed: { algo: 'recs-1', lists }, off: false, ...more }),
});
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test('explore: a ranking asked for when the app opened is on the page without another request', async () => {
  const h = createHarness({ documents: documents(), exploreFeed: async () => ({ algo: 'recs-1', lists: [card('a', 'By the water', 'ana')] }) });
  const explore = h.load('services/explore.js');
  const [first, second] = await Promise.all([explore.warmExploreFeed('audit', 'vancouver'), explore.warmExploreFeed('audit', 'vancouver')]);
  assert.equal(first, second);
  assert.equal(feedCalls(h).length, 1, 'two askers share one request');
  assert.deepEqual(feedCalls(h)[0].signals.followedLists, [{ id: 'f1', at: 7 }]);
  assert.deepEqual(feedCalls(h)[0].signals.blocked, ['troll-uid']);
  assert.equal(explore.peekExploreFeed('audit', 'vancouver'), first);
  assert.equal(explore.peekExploreFeed('audit', 'toronto'), null);

  const screen = await mount(h, 'screens/ExploreScreen.js');
  assert.deepEqual(labels(screen), ['Featured: By the water, 3 spots, by ana']);
  assert.equal(feedCalls(h).length, 1);
});

test('explore: after a restart the saved ranking is shown at once, and a new one is fetched for the next visit', async () => {
  const answer = deferred();
  const h = createHarness({
    documents: documents(),
    storage: savedFeed([card('s', 'Saved earlier', 'sam')]),
    exploreFeed: () => answer.promise,
  });
  const screen = await mount(h, 'screens/ExploreScreen.js');
  assert.deepEqual(labels(screen), ['Featured: Saved earlier, 3 spots, by sam'], 'shown while the function has not answered');
  assert.equal(feedCalls(h).length, 1);

  await act(async () => { answer.resolve({ algo: 'recs-1', lists: [card('n', 'Brand new', 'nia')] }); });
  await flush();
  assert.deepEqual(labels(screen), ['Featured: Saved earlier, 3 spots, by sam'], 'the cards do not move under the reader');
  const explore = h.load('services/explore.js');
  assert.deepEqual(explore.peekExploreFeed('audit', 'vancouver').lists.map(list => list.id), ['n']);
  assert.deepEqual(JSON.parse(h.storage.get('explore.feed.audit')).feed.lists.map(list => list.id), ['n']);
});

test('explore: a saved ranking that is a day old, or for another city, is not shown', async () => {
  const lists = [card('a', 'By the water', 'ana')];
  for (const more of [{ at: Date.now() - 25 * HOUR }, { cityId: 'toronto' }]) {
    const h = createHarness({
      documents: documents(),
      storage: savedFeed([card('s', 'Saved earlier', 'sam')], more),
      exploreFeed: async () => ({ algo: 'recs-1', lists }),
    });
    const screen = await mount(h, 'screens/ExploreScreen.js');
    assert.deepEqual(labels(screen), ['Featured: By the water, 3 spots, by ana']);
  }
});

test('explore: a pull to refresh asks again even when a ranking is saved', async () => {
  const h = createHarness({
    documents: documents(),
    storage: savedFeed([card('s', 'Saved earlier', 'sam')]),
    exploreFeed: async () => ({ algo: 'recs-1', lists: [card('n', 'Brand new', 'nia')] }),
  });
  const screen = await mount(h, 'screens/ExploreScreen.js');
  assert.deepEqual(labels(screen), ['Featured: Saved earlier, 3 spots, by sam']);
  const refresh = screen.all('ScrollView')[0].props.refreshControl;
  await act(async () => { await refresh.props.onRefresh(); });
  await flush();
  assert.deepEqual(labels(screen), ['Featured: Brand new, 3 spots, by nia']);
  assert.notEqual(feedCalls(h).at(-1).nonce, '');
});

test('explore: when the function was unreachable last time, the newest lists do not wait for it', async () => {
  const answer = deferred();
  const h = createHarness({
    documents: documents({ 'publicLists/n1': publicList('Just published', 'alex-uid', 'alex', 500) }),
    storage: { 'explore.feed.audit': JSON.stringify({ off: true }) },
    exploreFeed: () => answer.promise,
  });
  const screen = await mount(h, 'screens/ExploreScreen.js');
  assert.deepEqual(labels(screen), ['Featured: Just published, 1 spot, by alex'], 'shown while the function has not answered');

  await act(async () => { answer.resolve({ algo: 'recs-1', lists: [card('a', 'By the water', 'ana')] }); });
  await flush();
  assert.deepEqual(labels(screen), ['Featured: Just published, 1 spot, by alex'], 'the page does not change under the reader');
  assert.equal(JSON.parse(h.storage.get('explore.feed.audit')).off, false, 'and the ranking is there next time');
});

test('explore: a failure is remembered on the device, and signing out removes what was saved', async () => {
  const h = createHarness({ documents: documents() });
  const explore = h.load('services/explore.js');
  assert.equal(await explore.exploreLikelyOff('audit', 'vancouver'), false);
  assert.equal(await explore.getExploreFeed('audit', { cityId: 'vancouver' }), null);
  assert.equal(await explore.exploreLikelyOff('audit', 'vancouver'), true);
  assert.equal(await explore.getExploreFeed('audit', { cityId: 'vancouver' }), null);
  assert.equal(feedCalls(h).length, 1, 'not asked again straight after failing');

  explore.forgetExploreFeed({ signedOut: 'audit' });
  await flush();
  assert.equal(h.storage.has('explore.feed.audit'), false);
});

// ---------------------------------------------------------------- Events

test('events: opens and follows from Explore are written as one document when the page is left', async () => {
  const lists = [card('a', 'By the water', 'ana'), card('b', 'After dark', 'cy', { reason: 'trending' })];
  const h = createHarness({
    documents: documents({ 'publicLists/b': { ...publicList('After dark', 'cy-uid', 'cy', 1), followerCount: 0 } }),
    exploreFeed: async () => ({ algo: 'recs-1', lists }),
  });
  const events = h.load('services/events.js');
  const metrics = h.load('services/metrics.js');
  metrics.setMetricsSink(events.recordEvent);
  events.setEventsUser('audit');
  const screen = await mount(h, 'screens/ExploreScreen.js');

  await screen.press('Featured: By the water, 3 spots, by ana');
  await screen.press('Follow After dark');
  metrics.track(metrics.EVENTS.impression, { listId: 'a', position: 0, reason: 'personal', source: 'recs' });
  metrics.track(metrics.EVENTS.impression, { listId: 'a', position: 0, reason: 'personal', source: 'recs' });
  metrics.track(metrics.EVENTS.listStarted, { entry: 'library' }); // Not one of ours
  assert.equal([...h.documents.keys()].some(key => key.startsWith('events/')), false, 'nothing is written while browsing');

  await events.flushEvents();
  const written = [...h.documents.entries()].filter(([key]) => key.startsWith('events/'));
  assert.equal(written.length, 1);
  const [, batch] = written[0];
  assert.deepEqual(Object.keys(batch).sort(), ['algo', 'at', 'items', 'session', 'uid']);
  assert.equal(batch.uid, 'audit');
  assert.equal(batch.algo, 'recs-1');
  assert.deepEqual(batch.items.map(({ ms, ...item }) => item), [
    { t: 'open', l: 'a', p: 0, r: 'personal', s: 'recs' },
    { t: 'follow', l: 'b', r: 'trending', s: 'recs' },
    { t: 'imp', l: 'a', p: 0, r: 'personal', s: 'recs' },
  ]);
  assert.deepEqual((await events.recentOpens('audit')).map(open => open.id), ['a'], 'the open is remembered for the next request');

  h.documents.delete(written[0][0]);
  await events.flushEvents();
  assert.equal([...h.documents.keys()].some(key => key.startsWith('events/')), false, 'an empty batch is never written');
});

test('events: nothing is recorded while signed out', async () => {
  const h = createHarness({ documents: documents() });
  const events = h.load('services/events.js');
  const { EVENTS } = h.load('services/metrics.js');
  events.recordEvent(EVENTS.listOpened, { listId: 'a' });
  await events.flushEvents();
  events.setEventsUser('audit');
  await events.flushEvents();
  assert.equal([...h.documents.keys()].some(key => key.startsWith('events/')), false);
});
