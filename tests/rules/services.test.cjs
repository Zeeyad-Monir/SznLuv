// The app's own list, follow, profile and moderation services, run against the Firestore emulator
// with the real security rules. Proves the services and firestore.rules agree. Run with: npm run test:rules
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const realFirestore = require('firebase/firestore');
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const { createHarness } = require('../renderHarness.cjs');
const { addSpot, setNote, editDetails, hasUnpublishedChanges } = require('../../services/listsState');
const { catalogueRef } = require('../../services/catalogue');
const { rankLists } = require('../../services/listSearch');
const top4 = require('../../services/top4State');

const { doc, getDoc, setDoc } = realFirestore;
const farm = catalogueRef('Aldor Family Farm');
const maan = catalogueRef('Maan Farms');
const steps = { k: 'x', id: 'steps1', name: 'Waterfront steps', lat: 49.28651, lng: -123.112 };

let env;
const people = {};

// Each person gets the app's service modules bound to their own signed-in database handle.
function signIn(uid) {
  const db = env.authenticatedContext(uid).firestore();
  // The harness swaps in a canned `fetch` for weather tests; the emulator reset needs the real one.
  const realFetch = global.fetch;
  const h = createHarness({ db, stubs: { 'firebase/firestore': realFirestore } });
  global.fetch = realFetch;
  return {
    uid, db,
    lists: h.load('services/lists.js'),
    follows: h.load('services/follows.js'),
    profiles: h.load('services/profiles.js'),
    moderation: h.load('services/moderation.js'),
    spots: h.load('services/customSpots.js'),
    reviews: h.load('services/reviews.js'),
  };
}

const denied = promise => assert.rejects(promise, error => error.code === 'permission-denied');
// A listener may first replay what this device already had cached, then the server's copy.
// The value it has settled on after a moment is what the screen ends up showing.
const firstSnapshot = subscribe => new Promise((resolve, reject) => {
  let latest;
  const stop = subscribe(value => { latest = value; }, reject);
  setTimeout(() => { stop(); resolve(latest); }, 250);
});

test.before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-sznluv-services', // Its own database, so the rules test file can't clear it mid-run
    firestore: { rules: fs.readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8') },
  });
});

test.beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    for (const uid of ['maya', 'alex', 'sam']) await setDoc(doc(db, 'users', uid), { username: uid });
  });
  // Fresh sign-ins each time: a long-lived handle would still remember documents the reset just wiped.
  for (const uid of ['maya', 'alex', 'sam']) people[uid] = signIn(uid);
});

test.after(() => env.cleanup());

async function mayaPublishes(title = 'Golden Hour') {
  const { maya } = people;
  const list = await maya.lists.createNewList('maya', { title });
  await maya.lists.mutateList(list.id, current => addSpot(current, farm));
  await maya.lists.publishList('maya', 'maya', list.id);
  return list.id;
}

test('a new list is private: its owner edits it live, nobody else can read it', async () => {
  const { maya, alex } = people;
  const created = await maya.lists.createNewList('maya', { title: '  My Hottest Summer Spots ', cover: { type: 'season', value: 'summer' } });
  assert.equal(created.title, 'My Hottest Summer Spots');

  await maya.lists.mutateList(created.id, current => addSpot(current, farm));
  await maya.lists.mutateList(created.id, current => addSpot(current, steps));
  const noted = await maya.lists.mutateList(created.id, current => setNote(current, 'x:steps1', 'Go around 7 for the soft light.'));
  assert.deepEqual(noted.items.map(item => item.spot.name), ['Aldor Family Farm', 'Waterfront steps']);

  const mine = await firstSnapshot((next, fail) => maya.lists.subscribeMyLists('maya', next, fail));
  assert.deepEqual(mine.map(list => [list.title, list.items.length, list.public]), [['My Hottest Summer Spots', 2, false]]);
  const live = await firstSnapshot((next, fail) => maya.lists.subscribeList(created.id, next, fail));
  assert.equal(live.items[1].note, 'Go around 7 for the soft light.');

  assert.equal(await alex.lists.getPublicList(created.id), null);
  await denied(getDoc(doc(alex.db, 'lists', created.id)));
  await denied(alex.lists.mutateList(created.id, current => addSpot(current, maan)));
  await assert.rejects(maya.lists.mutateList('missing', current => current), { code: 'list/missing' });
});

test('publishing shows the list to everyone, makes the owner findable, and holds later edits back', async () => {
  const { maya, alex } = people;
  assert.equal(await alex.profiles.findProfileByUsername('maya'), null, 'not discoverable before making anything public');
  const id = await mayaPublishes();

  const seen = await alex.lists.getPublicList(id);
  assert.deepEqual([seen.title, seen.ownerUsername, seen.spotCount], ['Golden Hour', 'maya', 1]);
  assert.deepEqual((await alex.lists.getNewestPublicLists()).map(list => list.id), [id]);
  assert.deepEqual((await alex.lists.getPublicListsBy('maya')).map(list => list.id), [id]);
  assert.equal((await alex.profiles.findProfileByUsername('MAYA')).uid, 'maya');
  assert.deepEqual((await alex.profiles.searchProfiles('@ma')).map(person => person.username), ['maya']);
  assert.deepEqual(await alex.profiles.searchProfiles('zz'), []);

  // Half a word, a word form, the creator and a spot's town all find it.
  for (const text of ['gold', 'hours', 'maya', 'langley', 'golden farm']) {
    const found = rankLists(await alex.lists.searchPublicLists(text), text, { viewerUid: 'alex' });
    assert.deepEqual(found.map(list => list.id), [id], text);
  }
  assert.deepEqual(rankLists(await alex.lists.searchPublicLists('zebra'), 'zebra', { viewerUid: 'alex' }), []);

  // A draft edit stays private until the owner updates the public list.
  const draft = await maya.lists.mutateList(id, current => setNote(addSpot(current, maan), 'c:Maan Farms', 'Get the corn.'));
  const stillOld = await alex.lists.getPublicList(id);
  assert.equal(stillOld.spotCount, 1);
  assert.equal(hasUnpublishedChanges(draft, stillOld), true);
  await maya.lists.publishList('maya', 'maya', id);
  const updated = await alex.lists.getPublicList(id);
  assert.deepEqual([updated.spotCount, updated.items[1].note], [2, 'Get the corn.']);
  assert.equal(updated.publishedAt, seen.publishedAt, 'an update keeps the original publish time');
  assert.ok(updated.updatedAt >= seen.updatedAt);

  await denied(alex.lists.publishList('alex', 'alex', id));
  await denied(maya.lists.publishList('maya', 'someone-else', id));
});

test('reverting discards draft edits; an empty list cannot be published', async () => {
  const { maya } = people;
  const id = await mayaPublishes();
  await maya.lists.mutateList(id, current => editDetails(addSpot(current, maan), { title: 'Changed my mind' }));
  await maya.lists.revertListToPublic(id);
  const draft = await firstSnapshot((next, fail) => maya.lists.subscribeList(id, next, fail));
  assert.deepEqual([draft.title, draft.items.length, draft.public], ['Golden Hour', 1, true]);
  assert.equal(hasUnpublishedChanges(draft, await maya.lists.getPublicList(id)), false);

  const empty = await maya.lists.createNewList('maya', { title: 'Nothing yet' });
  await assert.rejects(maya.lists.publishList('maya', 'maya', empty.id), { code: 'list/empty' });
});

test('following: pointers are private, show updates, and are dropped once the list is withdrawn', async () => {
  const { maya, alex, sam } = people;
  const id = await mayaPublishes();
  const readPublic = alex.lists.getPublicList;

  assert.equal(await alex.follows.isFollowingList('alex', id), false);
  await alex.follows.followList('alex', await alex.lists.getPublicList(id));
  assert.equal(await alex.follows.isFollowingList('alex', id), true);
  let following = await alex.follows.loadFollowedLists('alex', readPublic);
  assert.deepEqual(following.lists.map(entry => [entry.list.title, entry.updated]), [['Golden Hour', false]]);
  assert.deepEqual(following.removed, []);
  await denied(realFirestore.getDocs(realFirestore.collection(sam.db, 'users', 'alex', 'followedLists')));

  // The owner updates the public list: the follower sees it marked until they open it.
  await new Promise(resolve => setTimeout(resolve, 5));
  await maya.lists.mutateList(id, current => addSpot(current, maan));
  await maya.lists.publishList('maya', 'maya', id);
  following = await alex.follows.loadFollowedLists('alex', readPublic);
  assert.deepEqual(following.lists.map(entry => [entry.list.spotCount, entry.updated]), [[2, true]]);
  await new Promise(resolve => setTimeout(resolve, 5));
  await alex.follows.markListOpened('alex', id);
  assert.equal((await alex.follows.loadFollowedLists('alex', readPublic)).lists[0].updated, false);
  await alex.follows.markListOpened('alex', 'not-following'); // not an error

  // A failed read is not proof the list is gone, so the follow is kept.
  const offline = await alex.follows.loadFollowedLists('alex', async () => { throw new Error('offline'); });
  assert.deepEqual([offline.lists.length, offline.removed.length], [1, 0]);
  assert.equal(await alex.follows.isFollowingList('alex', id), true);

  // Made private, then public again: the old link works, but the follow does not come back by itself.
  await maya.lists.unpublishList(id);
  assert.equal(await alex.lists.getPublicList(id), null);
  await new Promise(resolve => setTimeout(resolve, 5));
  await maya.lists.publishList('maya', 'maya', id);
  assert.ok(await alex.lists.getPublicList(id));
  following = await alex.follows.loadFollowedLists('alex', readPublic);
  assert.deepEqual([following.lists.length, following.removed], [0, ['Golden Hour']]);
  assert.equal(await alex.follows.isFollowingList('alex', id), false);

  await alex.follows.followList('alex', await alex.lists.getPublicList(id));
  await alex.follows.unfollowList('alex', id);
  assert.equal(await alex.follows.isFollowingList('alex', id), false);
});

test('a withdrawn list disappears for followers; deleting works for private and public lists', async () => {
  const { maya, alex } = people;
  const id = await mayaPublishes();
  await alex.follows.followList('alex', await alex.lists.getPublicList(id));
  await maya.lists.unpublishList(id);
  const following = await alex.follows.loadFollowedLists('alex', alex.lists.getPublicList);
  assert.deepEqual([following.lists.length, following.removed], [0, ['Golden Hour']]);
  const draft = await firstSnapshot((next, fail) => maya.lists.subscribeList(id, next, fail));
  assert.deepEqual([draft.public, draft.publishedAt, draft.items.length], [false, null, 1]);

  await maya.lists.deleteList(id); // never public any more
  assert.equal(await firstSnapshot((next, fail) => maya.lists.subscribeList(id, next, fail)), null);

  const second = await mayaPublishes('Slow Sundays');
  await denied(alex.lists.deleteList(second));
  await maya.lists.deleteList(second);
  assert.equal(await alex.lists.getPublicList(second), null);
  assert.deepEqual(await firstSnapshot((next, fail) => maya.lists.subscribeMyLists('maya', next, fail)), []);
});

test('following a person is separate from following their lists', async () => {
  const { alex } = people;
  await mayaPublishes();
  const maya = await alex.profiles.findProfileByUsername('maya');
  await alex.follows.followPerson('alex', maya);
  assert.equal(await alex.follows.isFollowingPerson('alex', 'maya'), true);
  assert.deepEqual((await alex.follows.loadFollowedPeople('alex')).map(person => [person.uid, person.username]), [['maya', 'maya']]);
  assert.deepEqual((await alex.follows.loadFollowedLists('alex', alex.lists.getPublicList)).lists, []);
  await assert.rejects(alex.follows.followPerson('alex', { uid: 'alex', username: 'alex' }), /follow yourself/);
  await alex.follows.unfollowPerson('alex', 'maya');
  assert.equal(await alex.follows.isFollowingPerson('alex', 'maya'), false);
});

test('legacy collections become private lists exactly once, and hearts are untouched', async () => {
  const { maya, sam } = people;
  await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'favourites/maya'), {
    'Aldor Family Farm': { isFavourite: true, season: 'Fall', location: '24990 84 Ave, Langley' },
    collections: [
      { title: 'Weekend', color: '#A7C8FF', dates: ['Aldor Family Farm', 'Maan Farms'] },
      { title: 'Date night', color: '#FFC1E3', dates: [] },
    ],
  }));
  assert.equal(await maya.lists.migrateLegacyCollections('maya'), 2);
  assert.equal(await maya.lists.migrateLegacyCollections('maya'), 0);

  const mine = await firstSnapshot((next, fail) => maya.lists.subscribeMyLists('maya', next, fail));
  assert.deepEqual(mine.map(list => [list.title, list.cover.value, list.items.length, list.public]),
    [['Weekend', '#A7C8FF', 2, false], ['Date night', '#FFC1E3', 0, false]]);
  const favourites = (await getDoc(doc(maya.db, 'favourites/maya'))).data();
  assert.equal(favourites.collections, undefined);
  assert.equal(favourites['Aldor Family Farm'].isFavourite, true);
  assert.ok(favourites.listsMigratedAt > 0);

  // Someone who never saved anything: nothing to move, and it is only checked once.
  assert.equal(await sam.lists.migrateLegacyCollections('sam'), 0);
  assert.ok((await getDoc(doc(sam.db, 'favourites/sam'))).data().listsMigratedAt > 0);
});

test('Top 4 stays on the private user document until shown, then mirrors only public picks', async () => {
  const { sam, alex } = people;
  await sam.profiles.mutateTop4('sam', 'sam', current => top4.addPick(top4.addPick(current, 'vancouver', farm), 'vancouver', steps));
  assert.equal(await alex.profiles.getProfile('sam'), null, 'private picks create no public profile');
  assert.equal((await sam.profiles.getMyTop4('sam')).vancouver.picks.length, 2);
  assert.equal((await getDoc(doc(sam.db, 'users/sam'))).data().username, 'sam', 'the rest of the user document is kept');

  await sam.profiles.mutateTop4('sam', 'sam', current => top4.setPublic(current, 'vancouver', true));
  assert.deepEqual((await alex.profiles.getProfile('sam')).top4, { vancouver: [farm, steps] });

  await sam.profiles.saveProfileDetails('sam', 'sam', { bio: '  Long evenings. ', avatarColor: '#A7C8FF' });
  await sam.profiles.mutateTop4('sam', 'sam', current => top4.removePick(top4.removePick(current, 'vancouver', 'c:Aldor Family Farm'), 'vancouver', 'x:steps1'));
  const profile = await alex.profiles.getProfile('sam');
  assert.deepEqual([profile.top4, profile.bio, profile.avatarColor, profile.username], [{}, 'Long evenings.', '#A7C8FF', 'sam']);
  assert.equal((await sam.profiles.getMyTop4('sam')).vancouver.public, false);

  await assert.rejects(sam.profiles.saveProfileDetails('sam', 'sam', { bio: 'x'.repeat(81) }), /80 characters/);
  await denied(alex.profiles.saveProfileDetails('sam', 'sam', { bio: 'Defaced' }));
  await denied(alex.profiles.mutateTop4('sam', 'sam', current => current));
});

test('reporting is write-only; blocking unfollows the person and their lists', async () => {
  const { alex } = people;
  const id = await mayaPublishes();
  await alex.follows.followList('alex', await alex.lists.getPublicList(id));
  await alex.follows.followPerson('alex', await alex.profiles.findProfileByUsername('maya'));

  await alex.moderation.report('alex', { targetType: 'list', targetId: id, ownerUid: 'maya', reason: 'Spam' });
  await assert.rejects(alex.moderation.report('alex', { targetType: 'list', targetId: id, ownerUid: 'maya', reason: 'Because' }), /Choose a reason/);
  await denied(realFirestore.getDocs(realFirestore.collection(alex.db, 'reports')));

  assert.deepEqual(await alex.moderation.getBlocked('alex'), []);
  await alex.moderation.blockUser('alex', 'maya');
  assert.deepEqual(await alex.moderation.getBlocked('alex'), ['maya']);
  assert.equal(await alex.follows.isFollowingPerson('alex', 'maya'), false);
  assert.equal(await alex.follows.isFollowingList('alex', id), false);
  assert.equal((await getDoc(doc(alex.db, 'users/alex'))).data().username, 'alex');
  await alex.moderation.unblockUser('alex', 'maya');
  assert.deepEqual(await alex.moderation.getBlocked('alex'), []);
});

// ---------------------------------------------------------------- Spots people make, shared through lists

const { toRef } = require('../../services/customSpotsState');
const { removeSpot } = require('../../services/listsState');

async function mayaMakes(count) {
  const { maya } = people;
  const made = [];
  for (let index = 0; index < count; index += 1) {
    const { id, spot } = await maya.spots.createSpot('maya', { name: `Spot ${index}`, lat: 49.2 + index / 1000, lng: -123.1 }, { save: index === 0 });
    made.push(toRef(id, spot));
  }
  return made;
}

test('a list of 25 spots I made publishes in one go, sharing each, within the rules\' read limits', async () => {
  const { maya, alex } = people;
  const made = await mayaMakes(25);
  assert.ok(made.every(ref => ref.id.startsWith('maya_')));
  await denied(getDoc(doc(alex.db, 'spots', made[0].id)));

  const list = await maya.lists.createNewList('maya', { title: 'Twenty five', items: made.map(spot => ({ spot, note: '' })) });
  await maya.lists.publishList('maya', 'maya', list.id);
  const shared = await alex.spots.getPublicSpot(made[24].id, { fresh: true });
  assert.deepEqual([shared.name, shared.ownerUsername, 'publicListIds' in shared], ['Spot 24', 'maya', false]);

  await maya.lists.unpublishList(list.id);
  assert.equal(await alex.spots.getPublicSpot(made[24].id, { fresh: true }), null);
  await maya.lists.deleteList(list.id);
});

test('reviews of a shared spot: one set across lists, gone from view once no public list has it', async () => {
  const { maya, alex } = people;
  const [spot] = await mayaMakes(1);
  const first = await maya.lists.createNewList('maya', { title: 'Best Sunset Spots', items: [{ spot, note: '' }] });
  const second = await maya.lists.createNewList('maya', { title: 'Evenings', items: [{ spot, note: '' }] });
  const source = alex.reviews.reviewSource({ spotId: spot.id });
  const review = { uid: 'alex', username: 'alex', profileColor: '#FF0000', comment: 'Worth it', starRating: 5 };

  await denied(alex.reviews.submitReview(source, review));
  await maya.lists.publishList('maya', 'maya', first.id);
  await alex.reviews.submitReview(source, review);
  await denied(alex.reviews.submitReview(source, { ...review, username: 'maya' }));
  await maya.lists.publishList('maya', 'maya', second.id);

  const read = () => firstSnapshot((next, fail) => alex.reviews.subscribeReviews(source, next, fail));
  assert.deepEqual((await read()).map(entry => entry.comment), ['Worth it']);

  await maya.lists.unpublishList(first.id);
  assert.deepEqual((await read()).map(entry => entry.comment), ['Worth it'], 'still shared through the second list');
  await maya.lists.unpublishList(second.id);
  await denied(realFirestore.getDocs(realFirestore.collection(alex.db, 'publicSpots', spot.id, 'reviews')));
  assert.equal(await maya.reviews.spotHasReviews(spot.id), true, 'kept, and its owner can still tell');
});

test('editing a shared spot refreshes it in the public list and its public copy', async () => {
  const { maya, alex } = people;
  const [spot] = await mayaMakes(1);
  const list = await maya.lists.createNewList('maya', { title: 'Golden Hour', items: [{ spot: farm, note: '' }, { spot, note: '' }] });
  await maya.lists.publishList('maya', 'maya', list.id);
  await maya.spots.updateSpot('maya', spot.id, { name: 'Sunset Lookout', lat: spot.lat, lng: spot.lng, description: 'New words' });
  const shown = await alex.lists.getPublicList(list.id);
  assert.equal(shown.items[1].spot.name, 'Sunset Lookout');
  assert.ok(shown.searchTerms.includes('sunset'));
  assert.equal(shown.followerCount ?? 0, 0);
  const copy = await alex.spots.getPublicSpot(spot.id, { fresh: true });
  assert.deepEqual([copy.name, copy.description], ['Sunset Lookout', 'New words']);
  const draft = await getDoc(doc(maya.db, 'lists', list.id));
  assert.equal(hasUnpublishedChanges(draft.data(), shown), false, 'the draft and the public copy still agree');
});

test('deleting a shared spot leaves no trace of it in lists, Saved or public copies', async () => {
  const { maya, alex } = people;
  const [spot, other] = await mayaMakes(2);
  const kept = await maya.lists.createNewList('maya', { title: 'Golden Hour', items: [{ spot: farm, note: '' }, { spot, note: '' }] });
  const alone = await maya.lists.createNewList('maya', { title: 'Only this', items: [{ spot, note: '' }] });
  const unrelated = await maya.lists.createNewList('maya', { title: 'Other', items: [{ spot: other, note: '' }] });
  await maya.lists.publishList('maya', 'maya', kept.id);
  await maya.lists.publishList('maya', 'maya', alone.id);
  await maya.lists.publishList('maya', 'maya', unrelated.id);
  await alex.reviews.submitReview(alex.reviews.reviewSource({ spotId: spot.id }), { uid: 'alex', username: 'alex', comment: 'Nice', starRating: 4 });

  await maya.spots.deleteSpot('maya', spot.id);
  assert.equal((await getDoc(doc(maya.db, 'spots', spot.id))).exists(), false);
  assert.equal(await alex.spots.getPublicSpot(spot.id, { fresh: true }), null);
  assert.deepEqual((await alex.lists.getPublicList(kept.id)).items.map(item => item.spot.name), ['Aldor Family Farm']);
  assert.equal(await alex.lists.getPublicList(alone.id), null, 'left empty, so made private');
  assert.ok(await alex.spots.getPublicSpot(other.id, { fresh: true }), 'other spots are untouched');
  const favourites = (await getDoc(doc(maya.db, 'favourites', 'maya'))).data();
  assert.equal(favourites[`x:${spot.id}`], undefined);
});

test('old own-spot references become records once, and running it again changes nothing', async () => {
  const { maya } = people;
  const old = { k: 'x', id: 'steps1', name: 'Waterfront steps', lat: 49.28651, lng: -123.112 };
  const list = await maya.lists.createNewList('maya', { title: 'Old one', items: [{ spot: old, note: 'Left side' }] });
  const lists = async () => (await firstSnapshot((next, fail) => maya.lists.subscribeMyLists('maya', next, fail)));
  assert.equal(await maya.spots.migrateLegacySpots('maya', await lists()), 1);
  const moved = (await getDoc(doc(maya.db, 'lists', list.id))).data().items[0];
  assert.deepEqual([moved.spot.id, moved.spot.owner, moved.note], ['maya_steps1', 'maya', 'Left side']);
  assert.equal((await getDoc(doc(maya.db, 'spots', 'maya_steps1'))).data().legacyId, 'steps1');
  assert.equal(await maya.spots.migrateLegacySpots('maya', await lists()), 0);
});
