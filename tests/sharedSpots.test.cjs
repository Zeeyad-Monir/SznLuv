// Spots people make, once shared: a public copy that follows the owner's public lists, one set of reviews
// whichever lists it is in, reporting, the deliberate delete, and putting things right on load.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, act } = require('./renderHarness.cjs');
const { mount, flush, quiet } = require('./support.cjs');
const { catalogueRef } = require('../services/catalogue');
const { createList, addSpot } = require('../services/listsState');

const farm = catalogueRef('Aldor Family Farm');
const sunset = { k: 'x', id: 'audit_sunset', owner: 'audit', name: 'Hidden Sunset Viewpoint', lat: 49.2865, lng: -123.112 };
const mayaSunset = { k: 'x', id: 'maya_sunset', owner: 'maya', name: 'Hidden Sunset Viewpoint' };
const record = (extra = {}) => ({
  ownerUid: 'audit', name: 'Hidden Sunset Viewpoint', lat: 49.2865, lng: -123.112, photos: [], publicListIds: [], createdAt: 1, updatedAt: 1, ...extra,
});
const listDoc = (title, refs = [], extra = {}) => ({
  ...refs.reduce((list, ref) => addSpot(list, ref), createList({ ownerUid: 'audit', title, now: 1 })), ...extra,
});
const base = { 'users/audit': { username: 'audit' }, 'favourites/audit': { listsMigratedAt: 1 } };

// ---------------------------------------------------------------- Public copies follow public lists

test('publishing shares my spots in the list; they stop being shared once no public list has them', async () => {
  const h = createHarness({ documents: {
    ...base,
    'spots/audit_sunset': record({ description: 'Best at 8pm', legacyId: 'old' }),
    'lists/a': listDoc('Golden Hour', [farm, sunset, mayaSunset]),
    'lists/b': listDoc('Weekend', [sunset]),
  } });
  const lists = h.load('services/lists.js');
  await lists.publishList('audit', 'audit', 'a');
  const copy = h.documents.get('publicSpots/audit_sunset');
  assert.deepEqual([copy.ownerUid, copy.ownerUsername, copy.description, 'publicListIds' in copy, 'legacyId' in copy], ['audit', 'audit', 'Best at 8pm', false, false]);
  assert.deepEqual(h.documents.get('spots/audit_sunset').publicListIds, ['a']);
  assert.equal(h.documents.get('publicSpots/maya_sunset'), undefined, 'someone else\'s spot is theirs to share');

  await lists.publishList('audit', 'audit', 'b');
  assert.deepEqual(h.documents.get('spots/audit_sunset').publicListIds, ['a', 'b']);
  await lists.unpublishList('a');
  assert.deepEqual(h.documents.get('spots/audit_sunset').publicListIds, ['b']);
  assert.ok(h.documents.get('publicSpots/audit_sunset'), 'still shared by the other list');

  // Taken out of the last public list (then published), and it is private again.
  await lists.mutateList('b', list => ({ ...list, items: [{ spot: farm, note: '' }] }));
  await lists.publishList('audit', 'audit', 'b');
  assert.deepEqual(h.documents.get('spots/audit_sunset').publicListIds, []);
  assert.equal(h.documents.get('publicSpots/audit_sunset'), undefined);

  await lists.publishList('audit', 'audit', 'a');
  await lists.deleteList('a');
  assert.equal(h.documents.get('publicSpots/audit_sunset'), undefined, 'deleting the list stops sharing it too');
  assert.equal(h.documents.get('lists/a'), undefined);
});

// ---------------------------------------------------------------- The page, shared

test('spot page, my shared spot: says where it is public and shows reviews I can read but not write', async () => {
  const h = createHarness({ documents: {
    ...base,
    'spots/audit_sunset': record({ publicListIds: ['a'], category: 'Beaches', hours: 'Always open', cost: 'Free', seasons: ['fall', 'summer'], tips: 'Bring a jacket.' }),
    'lists/a': listDoc('Golden Hour', [sunset], { public: true, publishedAt: 5 }),
    'publicLists/a': { ...listDoc('Golden Hour', [sunset]), ownerUsername: 'audit', spotCount: 1, publishedAt: 5, searchTerms: [] },
    'publicSpots/audit_sunset': { ownerUid: 'audit', ownerUsername: 'audit', name: 'Hidden Sunset Viewpoint' },
    'publicSpots/audit_sunset/reviews/r1': { uid: 'maya', username: 'maya', comment: 'Worth the climb', starRating: 4, timestamp: 2, placeID: 'x:audit_sunset', thumbsUpCount: 0 },
  } });
  const screen = await mount(h, 'screens/CustomSpotScreen.js', { params: { spot: sunset } });
  const texts = screen.texts();
  assert.ok(texts.includes('Public in “Golden Hour”. People can see it and review it.'), texts.join(' | '));
  for (const line of ['Beaches', 'Always open', 'Free', 'Fall, Summer', 'Good to know', 'Bring a jacket.', 'Worth the climb', 'User Ratings: 4.0/5 ★']) {
    assert.ok(texts.includes(line), line);
  }
  assert.ok(texts.includes('Reviews from people who find this spot in your public lists appear here.'), 'no review form for the creator');
  assert.equal(screen.all('TextInput').length, 0);

  // The creator can remove a review from their own page.
  await screen.press('More options for maya’s review');
  assert.deepEqual(h.menus.at(-1).options, ['Report review', 'Delete review', 'Cancel']);
  await act(async () => h.menus.at(-1).pick('Delete review'));
  const [, , choices] = h.alerts.at(-1);
  await act(async () => { await choices[1].onPress(); });
  assert.equal(h.documents.get('publicSpots/audit_sunset/reviews/r1'), undefined);
});

test('spot page, someone else\'s shared spot: everything they wrote, and a review of my own', async () => {
  const h = createHarness({ documents: {
    ...base,
    'publicSpots/maya_sunset': {
      ownerUid: 'maya', ownerUsername: 'maya', name: 'Hidden Sunset Viewpoint', address: '1 Cliff Rd, West Vancouver', lat: 49.33, lng: -123.2,
      description: 'A short climb to a wide view.', photos: [{ id: 'p1', path: 'spotPhotos/maya/maya_sunset/p1.jpg' }],
    },
  } });
  const screen = await mount(h, 'screens/CustomSpotScreen.js', { params: { spot: mayaSunset, addedBy: 'maya' } });
  const texts = screen.texts();
  for (const line of ['1 Cliff Rd, West Vancouver', 'Added by maya', 'A short climb to a wide view.', 'Reviews', 'No reviews yet. Be the first.']) {
    assert.ok(texts.includes(line), `${line} in ${texts.join(' | ')}`);
  }
  assert.ok(screen.button('Directions'));
  assert.ok(!texts.some(line => line.startsWith('Only you can see')));

  await screen.press('5 stars');
  await act(async () => screen.all('TextInput')[0].props.onChangeText('Lovely at sunset'));
  await screen.press('Submit');
  const review = h.documents.get('publicSpots/maya_sunset/reviews/audit');
  assert.deepEqual([review.uid, review.username, review.placeID, review.starRating, review.comment, review.thumbsUpCount],
    ['audit', 'audit', 'x:maya_sunset', 5, 'Lovely at sunset', 0]);
  assert.ok(screen.texts().includes('Lovely at sunset'));

  // My own review can be deleted, not reported; someone else's spot can be reported.
  await screen.press('More options for audit’s review');
  assert.deepEqual(h.menus.at(-1).options, ['Delete review', 'Cancel']);
  await screen.press('More options');
  assert.deepEqual(h.menus.at(-1).options, ['Report spot', 'Cancel']);
  await act(async () => h.menus.at(-1).pick('Report spot'));
  assert.deepEqual(h.navigations.at(-1), ['Report', { targetType: 'spot', targetId: 'maya_sunset', ownerUid: 'maya', name: 'Hidden Sunset Viewpoint' }]);

  // The heart keeps it in Saved by reference only.
  await screen.press('Save Hidden Sunset Viewpoint');
  const saved = h.documents.get('favourites/audit')['x:maya_sunset'];
  assert.deepEqual([saved.owner, saved.name, 'address' in saved], ['maya', 'Hidden Sunset Viewpoint', false]);
});

test('spot page, someone else\'s spot that isn\'t shared: its name only, and no reviews', async () => {
  const h = createHarness({ documents: { ...base, 'publicSpots/maya_sunset/reviews/r1': { uid: 'x', username: 'x', comment: 'Hidden', starRating: 1 } } });
  const screen = await mount(h, 'screens/CustomSpotScreen.js', { params: { spot: mayaSunset } });
  await flush();
  const texts = screen.texts();
  assert.ok(texts.includes('Only the name is shown: its creator isn’t sharing this spot right now.'), texts.join(' | '));
  assert.ok(!texts.includes('Reviews') && !texts.includes('Hidden'));
  assert.equal(screen.button('Directions'), undefined);
  assert.ok(screen.button('Add to list'));
});

test('reviews from someone the reader blocked are hidden', async () => {
  const h = createHarness({ documents: {
    'users/audit': { username: 'audit', blocked: ['troll'] }, 'favourites/audit': { listsMigratedAt: 1 },
    'publicSpots/maya_sunset': { ownerUid: 'maya', ownerUsername: 'maya', name: 'Hidden Sunset Viewpoint' },
    'publicSpots/maya_sunset/reviews/r1': { uid: 'troll', username: 'troll', comment: 'Rude words', starRating: 1, timestamp: 1 },
    'publicSpots/maya_sunset/reviews/r2': { uid: 'sam', username: 'sam', comment: 'Kind words', starRating: 5, timestamp: 2 },
  } });
  const screen = await mount(h, 'screens/CustomSpotScreen.js', { params: { spot: mayaSunset } });
  await flush();
  assert.ok(screen.texts().includes('Kind words'));
  assert.ok(!screen.texts().includes('Rude words'));
  assert.ok(screen.texts().includes('User Ratings: 5.0/5 ★'));
});

// ---------------------------------------------------------------- Deleting, deliberately

test('deleting a spot clears it from everywhere, says so first, and makes a list left empty private', async () => {
  const photo = 'spotPhotos/audit/audit_sunset/p1.jpg';
  const h = createHarness({
    documents: {
      'users/audit': { username: 'audit', top4: { vancouver: { picks: [farm, sunset], public: true } } },
      'profiles/audit': { username: 'audit', top4: { vancouver: [farm, sunset] } },
      'favourites/audit': { listsMigratedAt: 1, 'x:audit_sunset': { isFavourite: true, owner: 'audit', name: 'Hidden Sunset Viewpoint', savedAt: 1 } },
      'spots/audit_sunset': record({ publicListIds: ['a', 'b'], photos: [{ id: 'p1', path: photo }] }),
      'lists/a': listDoc('Golden Hour', [farm, sunset], { public: true, publishedAt: 5 }),
      'publicLists/a': { ...listDoc('Golden Hour', [farm, sunset]), ownerUsername: 'audit', spotCount: 2, publishedAt: 5, followerCount: 4, searchTerms: [] },
      'lists/b': listDoc('Only this', [sunset], { public: true, publishedAt: 6 }),
      'publicLists/b': { ...listDoc('Only this', [sunset]), ownerUsername: 'audit', spotCount: 1, publishedAt: 6, searchTerms: [] },
      'lists/c': listDoc('Private one', [sunset]),
      'publicSpots/audit_sunset': { ownerUid: 'audit', ownerUsername: 'audit', name: 'Hidden Sunset Viewpoint' },
      'publicSpots/audit_sunset/reviews/r1': { uid: 'maya', username: 'maya', comment: 'Nice', starRating: 4 },
    },
    files: { [photo]: { size: 1 } },
  });
  const screen = await mount(h, 'screens/CustomSpotScreen.js', { params: { spot: sunset } });
  await screen.press('More options');
  await act(async () => h.menus.at(-1).pick('Delete spot'));
  const [title, message, choices] = h.alerts.at(-1);
  assert.equal(title, 'Delete Hidden Sunset Viewpoint?');
  assert.match(message, /removed from “Golden Hour”, “Only this”, “Private one”, and from Saved/);
  assert.match(message, /“Only this” would be left empty, so it will be made private/);
  assert.match(message, /photos and reviews will be deleted\. This can’t be undone\./);
  await act(async () => { await choices[1].onPress(); });
  await flush();

  assert.equal(h.documents.get('spots/audit_sunset'), undefined);
  assert.equal(h.documents.get('publicSpots/audit_sunset'), undefined);
  assert.equal(h.documents.get('publicSpots/audit_sunset/reviews/r1'), undefined);
  for (const listId of ['a', 'b', 'c']) assert.ok(!h.documents.get(`lists/${listId}`).items.some(item => item.spot.id === 'audit_sunset'), listId);
  assert.deepEqual(h.documents.get('publicLists/a').items.map(item => item.spot.name), ['Aldor Family Farm']);
  assert.deepEqual([h.documents.get('publicLists/a').spotCount, h.documents.get('publicLists/a').followerCount, h.documents.get('publicLists/a').publishedAt], [1, 4, 5]);
  assert.equal(h.documents.get('publicLists/b'), undefined, 'a public list left empty is withdrawn');
  assert.deepEqual([h.documents.get('lists/b').public, h.documents.get('lists/b').publishedAt], [false, null]);
  assert.equal(h.documents.get('favourites/audit')['x:audit_sunset'], undefined);
  assert.deepEqual(h.documents.get('users/audit').top4.vancouver.picks, [farm]);
  assert.deepEqual(h.documents.get('profiles/audit').top4.vancouver, [farm]);
  assert.equal(h.files.has(photo), false);
  assert.ok(h.calls.some(([name]) => name === 'goBack'));
  assert.deepEqual(screen.snackbar(), ['Deleted Hidden Sunset Viewpoint']);
});

test('removing a spot from a list, or from Saved, never deletes it', async () => {
  const h = createHarness({ documents: { ...base, 'spots/audit_sunset': record(), 'lists/a': listDoc('A', [sunset]), 'lists/b': listDoc('B', [sunset]) } });
  const lists = h.load('services/lists.js');
  const { removeSpot } = h.load('services/listsState.js');
  await lists.mutateList('a', list => removeSpot(list, 'x:audit_sunset'));
  assert.ok(h.documents.get('spots/audit_sunset'));
  assert.equal(h.documents.get('lists/b').items.length, 1, 'other lists keep it');
});

// ---------------------------------------------------------------- Editing a reviewed spot

test('a spot with reviews can be nudged, but not moved somewhere else', async () => {
  const h = createHarness({ documents: {
    ...base,
    'spots/audit_sunset': record(),
    'publicSpots/audit_sunset/reviews/r1': { uid: 'maya', username: 'maya', comment: 'Nice', starRating: 4 },
  } });
  const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 520)); });
  const moveTo = async (screen, latitude) => {
    await act(async () => screen.renderer.root.findByType('MapView').props.onRegionChangeComplete({ latitude, longitude: -123.112 }, { isGesture: true }));
  };
  await quiet(async () => {
    const far = await mount(h, 'screens/OwnSpotScreen.js', { params: { spotId: 'audit_sunset' } });
    await settle();
    await moveTo(far, 49.30);
    await far.press('Save changes');
    assert.deepEqual(far.snackbar(), ['This spot has reviews, so it can’t move somewhere else. Add a new spot for the new place instead.']);
    assert.equal(h.documents.get('spots/audit_sunset').lat, 49.2865);
  });
  const near = await mount(h, 'screens/OwnSpotScreen.js', { params: { spotId: 'audit_sunset' } });
  await settle();
  await moveTo(near, 49.2869);
  await near.press('Save changes');
  assert.equal(h.documents.get('spots/audit_sunset').lat, 49.2869);
});

test('the editor deletes too, leaving both the editor and the spot\'s page', async () => {
  const h = createHarness({ documents: { ...base, 'spots/audit_sunset': record() } });
  const screen = await mount(h, 'screens/OwnSpotScreen.js', { params: { spotId: 'audit_sunset' } });
  await screen.press('Delete spot');
  const [, , choices] = h.alerts.at(-1);
  await act(async () => { await choices[1].onPress(); });
  await flush();
  assert.equal(h.documents.get('spots/audit_sunset'), undefined);
  assert.deepEqual(h.calls.find(([name]) => name === 'pop'), ['pop', 2]);
});

// ---------------------------------------------------------------- Putting things right on load

test('on load, sharing is put back in line with the public lists as they are', async () => {
  const lake = { k: 'x', id: 'audit_lake', owner: 'audit', name: 'Lake' };
  const h = createHarness({ documents: {
    ...base,
    // In a public list but never shared (published by an older version of the app).
    'spots/audit_sunset': record(),
    'lists/a': listDoc('Golden Hour', [sunset], { public: true, publishedAt: 5 }),
    'publicLists/a': { ...listDoc('Golden Hour', [sunset]), ownerUsername: 'audit', spotCount: 1, publishedAt: 5, searchTerms: [] },
    // Still marked shared by a list that was made private elsewhere.
    'spots/audit_lake': record({ name: 'Lake', publicListIds: ['gone'] }),
    'publicSpots/audit_lake': { ownerUid: 'audit', ownerUsername: 'audit', name: 'Lake' },
    // A public copy whose spot no longer exists.
    'publicSpots/audit_ghost': { ownerUid: 'audit', ownerUsername: 'audit', name: 'Ghost' },
    'lists/b': listDoc('Private', [lake]),
  } });
  await mount(h, 'screens/Favourites.js');
  await flush();
  await flush();
  assert.deepEqual(h.documents.get('spots/audit_sunset').publicListIds, ['a']);
  assert.equal(h.documents.get('publicSpots/audit_sunset').ownerUsername, 'audit');
  assert.deepEqual(h.documents.get('spots/audit_lake').publicListIds, []);
  assert.equal(h.documents.get('publicSpots/audit_lake'), undefined);
  assert.equal(h.documents.get('publicSpots/audit_ghost'), undefined);
});

// ---------------------------------------------------------------- What going public reveals

test('the sharing sheet says the spots I made are shared too, and can be reviewed', async () => {
  const h = createHarness({ documents: { ...base, 'spots/audit_sunset': record(), 'lists/a': listDoc('Golden Hour', [farm, sunset]) } });
  const sheet = await mount(h, 'screens/SharingSheet.js', { params: { listId: 'a' } });
  assert.ok(sheet.texts().includes('The spot you made is shared too, with photos and details, and people can review it.'), sheet.texts().join(' | '));
});

// ---------------------------------------------------------------- SznLuv's own spots use the same reviews

test('a SznLuv spot page takes reviews through the same section, now with the reviewer\'s uid', async () => {
  const h = createHarness({ documents: base });
  const screen = await mount(h, 'screens/SpotDetailScreen.js', { params: { placeID: 'maan_farms' } });
  await screen.press('4 stars');
  await act(async () => screen.all('TextInput').at(-1).props.onChangeText('Great corn maze'));
  await screen.press('Submit');
  const review = h.documents.get('reviews/audit');
  assert.deepEqual([review.placeID, review.uid, review.username, review.starRating, review.comment], ['maan_farms', 'audit', 'audit', 4, 'Great corn maze']);
  assert.ok(screen.texts().includes('Great corn maze'));
  assert.ok(screen.texts().includes('User Ratings: 4.0/5 ★'));
});
