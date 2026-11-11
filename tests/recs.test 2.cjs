// The Explore ranking (functions/recs), tested as plain functions: no Firestore, no clock, no randomness.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const config = require('../functions/recs/config');
const { indexEntry, listFeatures, listSeason, listQuality, spotFeatures } = require('../functions/recs/features');
const { buildProfile } = require('../functions/recs/profile');
const { momentum, scoreEntry, dayNumber, currentSeason } = require('../functions/recs/score');
const { buildFeed, toCard } = require('../functions/recs/feed');
const state = require('../functions/recs/indexState');

const DAY = config.DAY_MS;
const NOW = Date.UTC(2026, 9, 20, 12); // 20 October: Fall
const TODAY = dayNumber(NOW);
const c = name => ({ spot: { k: 'c', name }, note: '' });

const SALMON = ['Tynehead Hatchery', 'Hoy Creek Hatchery', 'Kanaka Creek Fish Fence', 'Reifel Bird Sanctuary'];
const HALLOWEEN = ['Burnaby Haunted Village', 'Fright Nights at Playland', 'Lost Souls of Gastown', 'Haunted Halloween Trolley'];
const PUMPKINS = ['Aldor Family Farm', 'Richmond Country Farms', 'Westham Island Herb Farm', 'Hazelmere Pumpkin Patch'];
const WALKS = ['Queen Elizabeth Park', 'Stanley Park', 'Deer Lake Park', 'Pacific Spirit Park'];
const BEACHES = ['Sunset Beach', 'Golden Sands', 'Coral Cove'];

// An index entry, as the trigger would write it. `days` ago published; `fb` is follows by days-ago.
function entry(owner, title, names, { days = 60, followers = 0, fb = {}, description = 'A few favourites, worth the drive.', extra = {} } = {}) {
  const list = {
    ownerUid: owner, ownerUsername: owner, title, description, cityId: 'vancouver', cover: { type: 'colour', value: '#A7C8FF' },
    items: names.map(c), spotCount: names.length, publishedAt: NOW - days * DAY, updatedAt: NOW - days * DAY, followerCount: followers,
  };
  return {
    ...indexEntry(list),
    fb: Object.fromEntries(Object.entries(fb).map(([ago, amount]) => [TODAY - Number(ago), amount])),
    ...extra,
  };
}

const community = () => ({
  wild: entry('ana', 'Quiet mornings by the water', SALMON),
  wild2: entry('ben', 'Creeks and birds', SALMON.slice(1)),
  spooky: entry('cy', 'After dark', HALLOWEEN),
  spooky2: entry('dee', 'Scare me', HALLOWEEN.slice(0, 3)),
  patch: entry('eli', 'Pick your own', PUMPKINS),
  walks: entry('fay', 'Golden hour walks', WALKS),
  beach: entry('gus', 'Sand between toes', BEACHES),
});
const saved = names => names.map(name => ({ key: `c:${name}`, at: NOW - 3 * DAY }));
const feedFor = (signals, entries = community(), more = {}) => buildFeed({ uid: 'me', signals, entries, now: NOW, ...more });
const ids = feed => feed.map(item => item.id);

// ---------------------------------------------------------------- Features

test('recs: a list is about what its spots are about, whatever the title says', () => {
  const features = listFeatures({ items: SALMON.map(c) });
  assert.ok(features['cat:salmon & wildlife'] > 0.5);
  assert.ok(!Object.keys(features).some(key => key === 'tag:vancouver'), 'place names are towns, not tags');
  assert.ok(Object.keys(features).length <= config.MAX_FEATURES);
  assert.deepEqual(spotFeatures({ k: 'c', name: 'Nowhere' }), {});
});

test('recs: spots people made count through their public copy; season falls back to the cover', () => {
  const mine = { spot: { k: 'x', id: 'u_1', owner: 'u', name: 'Tree lot', address: '1 Fir Rd, Langley' }, note: '' };
  const shared = { u_1: { category: 'Christmas Tree Farms', seasons: ['winter'], address: '1 Fir Rd, Langley' } };
  const list = { ownerUid: 'u', items: [mine], cover: { type: 'season', value: 'summer' } };
  assert.ok(listFeatures(list, shared)['cat:christmas tree farms'] > 0);
  assert.ok(listFeatures(list)['loc:langley'] > 0);
  assert.equal(listSeason(list, shared), 'Winter');
  assert.equal(listSeason(list), 'Summer');
  assert.equal(listSeason({ items: [mine], cover: { type: 'colour', value: '#fff' } }), null);
  assert.equal(listSeason({ items: [mine] }, { u_1: { seasons: ['fall', 'winter', 'spring', 'summer'] } }), null);
});

test('recs: quality is about the list itself and needs no followers or reviews', () => {
  const thin = listQuality({ items: [c('Stanley Park')], description: '' });
  const full = listQuality({ items: WALKS.concat(PUMPKINS).map(name => ({ ...c(name), note: 'Go early' })), description: 'Eight places for a slow October weekend, in order.' });
  assert.ok(full > 0.9 && thin < 0.4 && thin > 0);
  assert.equal(listQuality({ items: [] }), 0);
});

// ---------------------------------------------------------------- Profile

test('recs: saving a collection is a light nudge, not a save of every spot in it', () => {
  const collection = buildProfile({ savedSeasons: ['Fall'] }, {}, NOW);
  assert.deepEqual(Object.keys(collection.vector), ['season:fall']);
  const both = buildProfile({ savedSeasons: ['Summer'], savedSpots: saved(SALMON) }, {}, NOW);
  assert.ok(both.vector['cat:salmon & wildlife'] > both.vector['season:summer'] * 3);
  assert.equal(buildProfile({}, {}, NOW).empty, true);
});

test('recs: recent activity moves the profile quickly without erasing what came before', () => {
  const longAgo = HALLOWEEN.concat(HALLOWEEN).map(name => ({ key: `c:${name}` })); // Undated: long-term only
  const before = buildProfile({ savedSpots: longAgo }, {}, NOW);
  const after = buildProfile({ savedSpots: [...longAgo, { key: `c:${SALMON[0]}`, at: NOW - DAY }] }, {}, NOW);
  assert.equal(before.vector['cat:salmon & wildlife'], undefined);
  assert.ok(after.vector['cat:salmon & wildlife'] > 0.15, 'one fresh save shows up');
  assert.ok(after.vector['cat:halloween & after dark'] > after.vector['cat:salmon & wildlife'], 'but does not take over');
  const stale = buildProfile({ savedSpots: [...longAgo, { key: `c:${SALMON[0]}`, at: NOW - 200 * DAY }] }, {}, NOW);
  assert.ok(stale.vector['cat:salmon & wildlife'] < after.vector['cat:salmon & wildlife']);
});

test('recs: opening a list counts far less than following it', () => {
  const entries = community();
  const opened = buildProfile({ savedSpots: saved(HALLOWEEN), opens: [{ id: 'wild', at: NOW }] }, entries, NOW);
  const followed = buildProfile({ savedSpots: saved(HALLOWEEN), followedLists: [{ id: 'wild', at: NOW }] }, entries, NOW);
  assert.ok(opened.vector['cat:salmon & wildlife'] > 0);
  assert.ok(followed.vector['cat:salmon & wildlife'] > opened.vector['cat:salmon & wildlife'] * 2);
});

// ---------------------------------------------------------------- Scoring

test('recs: momentum is recent growth, and one or two taps are not a trend', () => {
  assert.equal(momentum({ fb: { [TODAY]: 2 } }, NOW), 0);
  const surge = momentum({ fb: { [TODAY]: 15, [TODAY - 1]: 15 }, fc: 30 }, NOW);
  const slow = momentum({ fb: { [TODAY - 3]: 3, [TODAY - 20]: 40 }, fc: 5000 }, NOW);
  assert.ok(surge > 0.8 && surge > slow * 2);
  assert.equal(momentum({ fb: { [TODAY - 10]: 50 } }, NOW), 0, 'last week only');
  assert.equal(momentum({ fb: { [TODAY]: 5, [TODAY - 1]: -4 } }, NOW), 0, 'follow then unfollow nets out');
});

test('recs: in season beats out of season, and evergreen lists stay in between', () => {
  assert.equal(currentSeason(NOW), 'Fall');
  const profile = buildProfile({}, {}, NOW);
  const score = item => scoreEntry(item, profile, { now: NOW, cityId: 'vancouver' }).parts.season;
  const all = community();
  assert.ok(score(all.walks) > score({ ...all.walks, season: null }));
  assert.ok(score({ ...all.walks, season: null }) > score(all.beach));
});

test('recs: with nothing known about a person the other parts share the weight', () => {
  const { parts, total } = scoreEntry(community().walks, buildProfile({}, {}, NOW), { now: NOW, cityId: 'vancouver' });
  assert.equal(parts.interest, 0);
  assert.ok(total > 0.4 && total <= 1);
  Object.values(parts).forEach(part => assert.ok(part >= 0 && part <= 1));
});

// ---------------------------------------------------------------- The feed (the brief's acceptance criteria)

test('recs 1: two people with different histories get different feeds', () => {
  const nature = feedFor({ savedSpots: saved(SALMON.slice(0, 2)) });
  const fright = feedFor({ savedSpots: saved(HALLOWEEN.slice(0, 2)) });
  assert.ok(['wild', 'wild2'].includes(nature[0].id));
  assert.ok(['spooky', 'spooky2'].includes(fright[0].id));
  assert.equal(nature[0].reason, 'personal');
  assert.notDeepEqual(ids(nature), ids(fright));
});

test('recs 2: a new account still gets a full, mixed feed', () => {
  const feed = feedFor({});
  assert.equal(feed.length, 7);
  assert.equal(feed.at(-1).id, 'beach', 'the out-of-season list is last, but still there');
  assert.ok(feed.every(item => item.reason !== 'personal'));
});

test('recs 3: a list published today with no followers gets a place', () => {
  const entries = community();
  for (let n = 0; n < 30; n += 1) entries[`big${n}`] = entry(`owner${n}`, `Established ${n}`, WALKS, { followers: 400 + n, days: 200 });
  entries.fresh = entry('newbie', 'My first list', PUMPKINS.slice(0, 3), { days: 0, followers: 0 });
  const feed = feedFor({ savedSpots: saved(HALLOWEEN) }, entries);
  const place = ids(feed).indexOf('fresh');
  assert.ok(place >= 0 && place < config.PAGE, `in the first page, got ${place}`);
  assert.equal(feed[place].reason, 'new');
});

test('recs 4: a huge old list does not outrank a relevant one', () => {
  const entries = community();
  entries.giant = entry('famous', 'Everyone follows this', BEACHES, { followers: 5000, days: 400 });
  const feed = feedFor({ savedSpots: saved(SALMON) }, entries);
  assert.ok(ids(feed).indexOf('wild') < ids(feed).indexOf('giant'));
  assert.ok(ids(feed).includes('giant'), 'but it is still there');
});

test('recs 5: thirty new followers in two days trends over a big list that gained two', () => {
  const entries = community();
  entries.rising = entry('rise', 'Suddenly everywhere', WALKS, { followers: 30, fb: { 0: 15, 1: 15 }, days: 40 });
  entries.giant = entry('famous', 'Old favourite', WALKS, { followers: 5000, fb: { 0: 1, 1: 1 }, days: 400 });
  const feed = feedFor({}, entries);
  const rising = feed.find(item => item.id === 'rising');
  assert.equal(rising.reason, 'trending');
  assert.ok(ids(feed).indexOf('rising') < ids(feed).indexOf('giant'));
  assert.notEqual(feed.find(item => item.id === 'giant').reason, 'trending');
});

test('recs 6: saved spots and followed lists both steer the feed', () => {
  const bySpots = feedFor({ savedSpots: saved(['Tynehead Hatchery']) });
  assert.equal(bySpots[0].entry.title, 'Quiet mornings by the water', 'no "salmon" in the title, found through its spots');
  const byList = feedFor({ followedLists: [{ id: 'spooky', at: NOW - DAY }] });
  assert.equal(byList[0].id, 'spooky2');
  assert.ok(!ids(byList).includes('spooky'), 'a list you already follow is not recommended again');
});

test('recs 7: where you save spots nudges nearby lists up', () => {
  const entries = {
    surrey: entry('a', 'South of the river', ['Hazelmere Pumpkin Patch', 'Darts Hill Garden Park', 'Bear Creek Halloween Train']),
    city: entry('b', 'In town', ['UBC Apple Festival', 'Lost Souls of Gastown', 'Stanley Park']),
    away: entry('c', 'Somewhere else', ['UBC Apple Festival', 'Lost Souls of Gastown', 'Stanley Park'], { extra: { cityId: 'toronto' } }),
  };
  const profile = buildProfile({ savedSpots: saved(['Tynehead Hatchery']) }, entries, NOW);
  const geo = item => scoreEntry(item, profile, { now: NOW, cityId: 'vancouver' }).parts.geo;
  assert.ok(geo(entries.surrey) > geo(entries.city));
  assert.ok(geo(entries.city) > geo(entries.away) && geo(entries.away) > 0, 'distance lowers a list, never removes it');
  assert.ok(ids(feedFor({}, entries)).includes('away'));
});

test('recs 8: one creator takes at most two places in a page', () => {
  const entries = community();
  for (let n = 0; n < 12; n += 1) entries[`busy${n}`] = entry('busy', `Hatchery run ${n}`, SALMON, { days: n });
  for (let n = 0; n < 30; n += 1) entries[`other${n}`] = entry(`other${n}`, `Other ${n}`, n % 2 ? WALKS : PUMPKINS, { days: 20 + n });
  const feed = feedFor({ savedSpots: saved(SALMON) }, entries);
  const firstPage = feed.slice(0, config.PAGE);
  assert.equal(firstPage.filter(item => item.entry.ownerUid === 'busy').length, 2);
  assert.equal(new Set(ids(feed)).size, feed.length, 'and nothing appears twice');
  assert.equal(feed.length, Object.keys(entries).length, 'the rest of their lists follow on later pages');
});

test('recs 8b: a tiny community still fills the page rather than hiding a busy creator', () => {
  const entries = {};
  for (let n = 0; n < 5; n += 1) entries[`only${n}`] = entry('solo', `List ${n}`, WALKS, { days: n });
  assert.equal(feedFor({}, entries).length, 5);
  assert.deepEqual(feedFor({}, {}), []);
});

test('recs 9: your own lists, blocked people and half-written entries never appear', () => {
  const entries = community();
  entries.mine = entry('me', 'My own', SALMON);
  entries.partial = { fb: { [TODAY]: 4 }, fc: 4 }; // A follow arrived before the list was indexed
  const feed = feedFor({ savedSpots: saved(SALMON), blocked: ['ana'] }, entries);
  assert.ok(!ids(feed).includes('mine') && !ids(feed).includes('wild') && !ids(feed).includes('partial'));
  assert.ok(ids(feed).includes('wild2'));
});

test('recs 11: the same request gives the same order; a refresh may reshuffle but keeps the same lists', () => {
  const signals = { savedSpots: saved(SALMON) };
  const entries = community();
  for (let n = 0; n < 40; n += 1) entries[`more${n}`] = entry(`o${n}`, `More ${n}`, n % 2 ? WALKS : PUMPKINS, { days: n * 3 });
  const first = ids(feedFor(signals, entries)), again = ids(feedFor(signals, entries));
  assert.deepEqual(first, again);
  const refreshed = ids(feedFor(signals, entries, { nonce: 'pull-1' }));
  assert.notDeepEqual(first, refreshed);
  assert.deepEqual([...first].sort(), [...refreshed].sort());
  assert.equal(first.length, Object.keys(entries).length);
  assert.equal(ids(feedFor(signals, entries, { size: 20 })).length, 20);
});

test('recs: a card carries what the Explore tile draws, and why it is there', () => {
  const [item] = feedFor({ savedSpots: saved(SALMON) });
  const card = toCard(item);
  assert.deepEqual(Object.keys(card).sort(), ['cityId', 'cover', 'followerCount', 'id', 'ownerUid', 'ownerUsername', 'publishedAt', 'reason', 'season', 'spotCount', 'title', 'updatedAt']);
  assert.equal(card.reason, 'personal');
});

// ---------------------------------------------------------------- Index upkeep

test('index: a list always lands in the same document, and a follow is not a content change', () => {
  assert.equal(state.shardOf('abc'), state.shardOf('abc'));
  assert.ok(state.shardIds().includes(state.shardOf('abc')));
  const list = { title: 'A', items: [c('Stanley Park')], followerCount: 1, updatedAt: 5 };
  assert.equal(state.contentChanged(list, { ...list, followerCount: 2 }), false);
  assert.equal(state.followerDelta(list, { ...list, followerCount: 2 }), 1);
  assert.equal(state.followerDelta(undefined, list), 1);
  assert.equal(state.contentChanged(list, { ...list, title: 'B' }), true);
  assert.equal(state.contentChanged(undefined, list), true);
  const mine = { ownerUid: 'u', items: [{ spot: { k: 'x', id: 'u_1', owner: 'u' } }, { spot: { k: 'x', id: 'v_1', owner: 'v' } }, c('Stanley Park')] };
  assert.deepEqual(state.ownSpotIds(mine), ['u_1']);
});

test('index: events count each person once per list per day, however often they refresh', () => {
  const ms = NOW;
  const batches = [
    { uid: 'a', items: [{ t: 'imp', l: 'wild', ms, r: 'personal' }, { t: 'imp', l: 'wild', ms, r: 'personal' }, { t: 'open', l: 'wild', ms, r: 'personal' }] },
    { uid: 'a', items: [{ t: 'imp', l: 'wild', ms }, { t: 'imp', l: 'wild', ms: ms - DAY }] },
    { uid: 'b', items: [{ t: 'imp', l: 'wild', ms }, { t: 'follow', l: 'wild', ms, r: 'new' }, { t: 'nonsense', l: 'wild' }, { t: 'imp' }] },
    { items: [{ t: 'imp', l: 'wild' }] },
  ];
  const { perList, totals } = state.foldEvents(batches, NOW);
  assert.deepEqual(perList.wild.im, { [TODAY]: 2, [TODAY - 1]: 1 });
  assert.deepEqual(perList.wild.op, { [TODAY]: 1 });
  assert.equal(totals.impressions, 3);
  assert.equal(totals.follows, 1);
  assert.equal(totals.people, 2);
  assert.deepEqual(totals.byReason.personal, { impressions: 1, opens: 1, follows: 0 });
});

test('index: the daily pass adds views and drops counts older than thirty days', () => {
  const lists = { wild: { title: 'W', fb: { [TODAY]: 2, [TODAY - 40]: 9, [TODAY - 2]: 0 }, im: { [TODAY - 1]: 4 } } };
  const next = state.maintainShard(lists, { wild: { im: { [TODAY - 1]: 1, [TODAY]: 3 }, op: { [TODAY]: 1 } } }, NOW);
  assert.deepEqual(next.wild.fb, { [TODAY]: 2 });
  assert.deepEqual(next.wild.im, { [TODAY - 1]: 5, [TODAY]: 3 });
  assert.deepEqual(next.wild.op, { [TODAY]: 1 });
  assert.equal(next.wild.title, 'W');
});
