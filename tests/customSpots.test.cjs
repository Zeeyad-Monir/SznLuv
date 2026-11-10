// Spots people make: the record and its references, the shared editor, Saved, "My spots", and bringing
// old own-spot references over to records.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, act } = require('./renderHarness.cjs');
const { mount, textOf, flush } = require('./support.cjs');
const { catalogueRef } = require('../services/catalogue');
const { createList, addSpot } = require('../services/listsState');
const S = require('../services/customSpotsState');

const farm = catalogueRef('Aldor Family Farm');
const maan = catalogueRef('Maan Farms');
const pin = { latitude: 49.286512345, longitude: -123.112009876 };
const record = (extra = {}) => ({
  ownerUid: 'audit', name: 'Hidden Sunset Viewpoint', lat: 49.2865, lng: -123.112, photos: [], publicListIds: [], createdAt: 1, updatedAt: 1, ...extra,
});
const sunset = { k: 'x', id: 'audit_sunset', owner: 'audit', name: 'Hidden Sunset Viewpoint', lat: 49.2865, lng: -123.112 };
const listDoc = (title, refs = [], extra = {}) => ({
  ...refs.reduce((list, ref) => addSpot(list, ref), createList({ ownerUid: 'audit', title, now: 1 })), ...extra,
});
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 520)); }); // The map mounts after the push
const spotIds = h => [...h.documents.keys()].filter(key => key.startsWith('spots/'));

// ---------------------------------------------------------------- The record (pure)

test('spot form: a name and a place are required; the rest is optional but has limits', () => {
  const base = { name: 'Steps', mode: 'pin', pin };
  assert.equal(S.spotProblem({ ...base, name: ' ' }), 'Give the spot a name.');
  assert.equal(S.spotProblem({ ...base, name: 'x'.repeat(61) }), 'Names can be up to 60 characters.');
  assert.equal(S.spotProblem({ ...base, pin: null }), 'Move the map so the pin sits on your spot.');
  assert.equal(S.spotProblem({ name: 'Steps', mode: 'address', address: '  ' }), 'Type an address, or drop a pin instead.');
  assert.equal(S.spotProblem({ ...base, description: 'x'.repeat(501) }), 'Descriptions can be up to 500 characters.');
  assert.equal(S.spotProblem({ ...base, tips: 'x'.repeat(301) }), 'Tips can be up to 300 characters.');
  assert.equal(S.spotProblem({ ...base, cost: 'x'.repeat(61) }), 'Cost can be up to 60 characters.');
  assert.equal(S.spotProblem({ ...base, hours: 'x'.repeat(121) }), 'Hours can be up to 120 characters.');
  assert.equal(S.spotProblem({ ...base, photos: [1, 2, 3, 4] }), 'A spot can have up to 3 photos.');
  assert.equal(S.spotProblem(base), null);
  assert.equal(S.spotProblem({ name: 'Steps', mode: 'address', address: '12 Main St' }), null);
});

test('spot fields: a rounded pin or an address, trimmed text, and nothing for what was left empty', () => {
  assert.deepEqual(S.spotFields({ name: ' Waterfront steps ', mode: 'pin', pin, description: '  ', category: 'Beaches', seasons: ['summer', 'fall', 'nope'] }),
    { name: 'Waterfront steps', lat: 49.28651, lng: -123.11201, category: 'Beaches', seasons: ['fall', 'summer'] });
  // A looked-up address keeps its full label and gains coordinates for directions and the map.
  assert.deepEqual(S.spotFields({ name: 'Cafe', mode: 'address', address: '12 main', label: '12 Main St, Vancouver', pin, tips: ' Go early ', cost: 'Free', hours: '9-5', category: 'Not a category' }),
    { name: 'Cafe', address: '12 Main St, Vancouver', lat: 49.28651, lng: -123.11201, tips: 'Go early', cost: 'Free', hours: '9-5' });
  assert.ok(S.SPOT_CATEGORIES.includes('Pumpkin Patches & Harvest Farms') && S.SPOT_CATEGORIES.at(-1) === 'Other');
});

test('references: my spot carries its place; someone else\'s is linked by ID and name only', () => {
  const spot = record({ address: '1 Beach Ave', description: 'Private words' });
  assert.deepEqual(S.toRef('audit_sunset', spot), { k: 'x', id: 'audit_sunset', owner: 'audit', name: 'Hidden Sunset Viewpoint', address: '1 Beach Ave', lat: 49.2865, lng: -123.112 });
  assert.deepEqual(S.linkRef(sunset), { k: 'x', id: 'audit_sunset', owner: 'audit', name: 'Hidden Sunset Viewpoint' });
  assert.deepEqual(S.storedRef(sunset, 'maya'), S.linkRef(sunset), 'someone else adding it links it');
  assert.equal(S.storedRef(sunset, 'audit'), sunset, 'the owner keeps the place');
  assert.equal(S.storedRef(farm, 'maya'), farm);
  const legacy = { k: 'x', id: 'old1', name: 'Old', lat: 1, lng: 2 };
  assert.equal(S.storedRef(legacy, 'maya'), legacy);
  assert.ok(S.isLegacyRef(legacy) && !S.isLegacyRef(sunset) && !S.isLegacyRef(farm));
  assert.ok(S.isMine(sunset, 'audit') && !S.isMine(sunset, 'maya') && !S.isMine(farm, 'audit'));
  assert.equal(S.ownerOfSpotId('audit_sunset'), 'audit');
  assert.equal(S.ownerOfSpotId('nounderscore'), null);
  assert.equal(S.spotIdFor('uid', 'abc'), 'uid_abc');
  assert.equal(S.thinChanged(record(), record({ description: 'New' })), false, 'details alone never touch the lists');
  assert.equal(S.thinChanged(record(), record({ name: 'Renamed' })), true);
  assert.equal(S.thinChanged(record(), record({ lat: 49.3 })), true);
  const shown = S.toPublicSpot(record({ legacyId: 'old', publicListIds: ['l1'] }), 'audit', 5);
  assert.equal('publicListIds' in shown || 'legacyId' in shown, false);
  assert.deepEqual([shown.ownerUsername, shown.updatedAt], ['audit', 5]);
});

test('spot search matches name, place, category, description and seasons', () => {
  const spot = record({ address: '1 Beach Ave, West Vancouver', category: 'Beaches', description: 'Tide pools at low tide', seasons: ['summer'] });
  for (const query of ['', 'sunset', 'west vancouver', 'BEACHES', 'tide pools', 'summer', 'hidden summer']) assert.ok(S.matchesSpot(spot, query), query);
  for (const query of ['winter', 'cafe', 'sunset cafe']) assert.equal(S.matchesSpot(spot, query), false, query);
});

test('reuse: my spot with the same name and place, or SznLuv\'s spot with that name', () => {
  const mine = [{ id: 'audit_a', ...record({ name: 'Waterfront Steps', lat: 49.28651, lng: -123.11201 }) }, { id: 'audit_b', ...record({ name: 'Cafe', address: '12 Main St' }) }];
  assert.equal(S.findSameSpot({ name: 'waterfront steps', lat: 49.28651, lng: -123.11201 }, mine).id, 'audit_a');
  assert.equal(S.findSameSpot({ name: 'waterfront steps', lat: 49.3, lng: -123.1 }, mine), undefined);
  assert.equal(S.findSameSpot({ name: 'cafe', address: '12 main st' }, mine).id, 'audit_b');
  assert.equal(S.findListedSpot('aldor family farm').name, 'Aldor Family Farm');
  assert.equal(S.findListedSpot('My bench'), undefined);
});

test('a reviewed spot can move a little, but not to somewhere else', () => {
  const at = (lat, lng) => ({ lat, lng });
  assert.ok(S.withinReach(at(49.2865, -123.112), at(49.2873, -123.112)), 'about 90 m');
  assert.equal(S.withinReach(at(49.2865, -123.112), at(49.2965, -123.112)), false, 'about 1.1 km');
  assert.ok(S.withinReach({ address: '12 Main St' }, { address: ' 12 main st ' }));
  assert.equal(S.withinReach({ address: '12 Main St' }, { address: '99 Other Rd' }), false);
  assert.ok(S.withinReach({ address: '12 Main St' }, { address: '12 Main St', lat: 1, lng: 2 }), 'adding a pin to the same address');
  assert.equal(S.withinReach({ lat: 1, lng: 2 }, { address: 'Elsewhere' }), false);
});

test('references are refreshed or removed wherever they are, in lists and both Top 4 shapes', () => {
  const renamed = { ...sunset, name: 'Sunset Lookout' };
  const list = listDoc('Golden Hour', [farm, sunset]);
  assert.deepEqual(S.replaceRefInList(list, renamed).items.map(item => item.spot.name), ['Aldor Family Farm', 'Sunset Lookout']);
  assert.deepEqual(S.removeRefFromList(list, 'x:audit_sunset').items.map(item => item.spot.name), ['Aldor Family Farm']);
  const draftTop4 = { vancouver: { picks: [sunset, farm], public: true } };
  const shownTop4 = { vancouver: [sunset] };
  assert.deepEqual(S.replaceRefInTop4(draftTop4, renamed).vancouver.picks[0].name, 'Sunset Lookout');
  assert.deepEqual(S.replaceRefInTop4(shownTop4, renamed).vancouver[0].name, 'Sunset Lookout');
  assert.deepEqual(S.removeRefFromTop4({ vancouver: { picks: [sunset], public: true } }, 'x:audit_sunset'), { vancouver: { picks: [], public: false } });
  assert.deepEqual(S.removeRefFromTop4(shownTop4, 'x:audit_sunset'), { vancouver: [] });
  assert.ok(S.top4Has(draftTop4, 'x:audit_sunset') && S.top4Has(shownTop4, 'x:audit_sunset') && !S.top4Has(null, 'x:a'));
  assert.deepEqual(S.savedCustomSpots({ 'Aldor Family Farm': { isFavourite: true }, 'x:audit_sunset': { isFavourite: true, name: 'Sunset' }, 'x:gone': {} }),
    [{ id: 'audit_sunset', isFavourite: true, name: 'Sunset' }]);
});

test('old own-spot references become records once, shared by every list that held them', () => {
  const old = { k: 'x', id: 'steps1', name: 'Waterfront steps', lat: 49.28651, lng: -123.112 };
  const cafe = { k: 'x', id: 'cafe1', name: 'Corner cafe', address: '12 Main St' };
  const linked = { k: 'x', id: 'maya_x', owner: 'maya', name: 'Maya\'s place' };
  const lists = [
    { id: 'a', data: listDoc('A', [farm, old]) },
    { id: 'b', data: listDoc('B', [old, linked]) },
    { id: 'c', data: listDoc('C', [farm, sunset]) },
  ];
  const top4 = { vancouver: { picks: [cafe, farm], public: false } };
  const plan = S.migrateLegacy({ uid: 'audit', lists, top4, now: 9 });
  assert.deepEqual(plan.spots.map(spot => spot.id), ['audit_steps1', 'audit_cafe1']);
  assert.deepEqual(plan.spots[0].data, { ownerUid: 'audit', name: 'Waterfront steps', lat: 49.28651, lng: -123.112, photos: [], publicListIds: [], createdAt: 9, updatedAt: 9, legacyId: 'steps1' });
  assert.deepEqual(plan.lists.map(list => list.id), ['a', 'b'], 'a list with nothing old is left alone');
  const moved = { k: 'x', id: 'audit_steps1', owner: 'audit', name: 'Waterfront steps', lat: 49.28651, lng: -123.112 };
  assert.deepEqual(plan.lists[1].data.items.map(item => item.spot), [moved, linked], 'one record for both lists; links are untouched');
  assert.deepEqual(plan.top4.vancouver.picks[0], { k: 'x', id: 'audit_cafe1', owner: 'audit', name: 'Corner cafe', address: '12 Main St' });
  assert.deepEqual(plan.swap(old), moved);
  assert.equal(plan.swap(farm), farm);

  // Running again finds nothing; a record made by an earlier run is not made twice.
  const after = [...plan.lists, lists[2]];
  assert.equal(S.migrateLegacy({ uid: 'audit', lists: after, top4: plan.top4, now: 10 }), null);
  assert.deepEqual(S.migrateLegacy({ uid: 'audit', lists, top4, existing: new Set(['audit_steps1']), now: 10 }).spots.map(spot => spot.id), ['audit_cafe1']);
  assert.equal(S.migrateLegacy({ uid: 'audit', lists: [lists[2]], top4: null, now: 1 }), null);
});

// ---------------------------------------------------------------- Saved

const savedDocs = (extra = {}) => ({
  'users/audit': { username: 'audit' },
  'favourites/audit': {
    listsMigratedAt: 1,
    'x:audit_sunset': { isFavourite: true, owner: 'audit', name: 'Hidden Sunset Viewpoint', savedAt: 2 },
    'x:maya_lake': { isFavourite: true, owner: 'maya', name: 'Secret Lake Lookout', savedAt: 1 },
    'Maan Farms': { isFavourite: true, season: 'Fall', location: '' },
  },
  'spots/audit_sunset': record({ category: 'Beaches' }),
  'publicSpots/maya_lake': { ownerUid: 'maya', ownerUsername: 'maya', name: 'Secret Lake Lookout', address: 'Lake Rd, North Vancouver', photos: [] },
  ...extra,
});

test('Saved: Add Your Own Spot sits on top; your spots come first and open their page', async () => {
  const h = createHarness({ documents: savedDocs() });
  const screen = await mount(h, 'screens/Favourites.js');
  const texts = screen.texts();
  assert.ok(texts.indexOf('Following') < texts.indexOf('Add Your Own Spot'), texts.join(' | '));
  assert.ok(texts.indexOf('Add Your Own Spot') < texts.indexOf('Your spots') && texts.indexOf('Your spots') < texts.indexOf('Fall'));
  assert.ok(texts.indexOf('Hidden Sunset Viewpoint') < texts.indexOf('Secret Lake Lookout'), 'newest first');
  assert.ok(texts.includes('Beaches') && texts.includes('North Vancouver'), 'someone else\'s spot is described from its public copy');

  await screen.press('Add Your Own Spot');
  assert.deepEqual(h.navigations.at(-1), ['OwnSpotScreen', { from: 'saved' }]);
  await screen.press('View details for Hidden Sunset Viewpoint');
  assert.deepEqual(h.navigations.at(-1), ['CustomSpotScreen', { spot: sunset }]);
  await screen.press('View details for Secret Lake Lookout');
  assert.deepEqual(h.navigations.at(-1), ['CustomSpotScreen', { spot: { k: 'x', id: 'maya_lake', owner: 'maya', name: 'Secret Lake Lookout' } }]);

  // Taking a spot out of Saved never deletes it.
  await screen.press('Remove Hidden Sunset Viewpoint from favourites');
  assert.equal(h.documents.get('favourites/audit')['x:audit_sunset'], undefined);
  assert.ok(h.documents.get('spots/audit_sunset'), 'the spot itself is kept');
  assert.deepEqual(screen.snackbar(), ['Removed from Saved', 'Undo']);
  await screen.press('Undo');
  assert.ok(h.documents.get('favourites/audit')['x:audit_sunset'].isFavourite);
});

test('Saved: with nothing yet, the Add button stays above an invitation', async () => {
  const h = createHarness({ documents: { 'users/audit': { username: 'audit' } } });
  const screen = await mount(h, 'screens/Favourites.js');
  assert.ok(screen.button('Add Your Own Spot'));
  assert.ok(screen.texts().includes('Tap the heart on any spot to keep it here, or add a place of your own.'));
});

// ---------------------------------------------------------------- The editor

test('editor from Saved: name and pin are enough; details are kept; the spot lands in Saved', async () => {
  const h = createHarness({ documents: { 'users/audit': { username: 'audit' }, 'favourites/audit': { listsMigratedAt: 1 } } });
  const screen = await mount(h, 'screens/OwnSpotScreen.js', { params: { from: 'saved' } });
  await settle();
  assert.ok(screen.texts().includes('For a place SznLuv doesn’t list yet. Only you can see it unless you add it to a public list.'));
  await screen.press('Save spot');
  assert.ok(screen.texts().includes('Give the spot a name.'));
  assert.deepEqual(spotIds(h), []);

  const inputs = () => screen.all('TextInput');
  await act(async () => inputs()[0].props.onChangeText('Hidden Sunset Viewpoint'));
  await act(async () => screen.renderer.root.findByType('MapView').props.onRegionChangeComplete({ latitude: 49.2865, longitude: -123.112 }, { isGesture: true }));
  await screen.press('Beaches');
  await act(async () => inputs()[1].props.onChangeText('Best right before sunset.'));
  await screen.press('More details');
  await act(async () => { inputs()[2].props.onChangeText('Bring a jacket.'); inputs()[3].props.onChangeText('Free'); inputs()[4].props.onChangeText('Always open'); });
  await screen.press('Summer');
  await screen.press('Fall');
  await screen.press('Save spot');

  const [key] = spotIds(h);
  assert.match(key, /^spots\/audit_.+/, 'the ID starts with the owner');
  const spot = h.documents.get(key);
  assert.deepEqual({ ...spot, createdAt: 0, updatedAt: 0 }, {
    ownerUid: 'audit', name: 'Hidden Sunset Viewpoint', lat: 49.2865, lng: -123.112, category: 'Beaches',
    description: 'Best right before sunset.', tips: 'Bring a jacket.', cost: 'Free', hours: 'Always open', seasons: ['fall', 'summer'],
    photos: [], publicListIds: [], createdAt: 0, updatedAt: 0,
  });
  const id = key.slice('spots/'.length);
  assert.deepEqual(h.documents.get('favourites/audit')[`x:${id}`].name, 'Hidden Sunset Viewpoint');
  assert.ok(h.calls.some(([name]) => name === 'goBack'));
  assert.deepEqual(screen.snackbar(), ['Saved Hidden Sunset Viewpoint']);
});

test('editor from a list: the new spot goes into that list by reference, and into Saved', async () => {
  const h = createHarness({ documents: { 'users/audit': { username: 'audit' }, 'favourites/audit': { listsMigratedAt: 1 }, 'lists/a': listDoc('Summer Adventures') } });
  const screen = await mount(h, 'screens/OwnSpotScreen.js', { params: { listId: 'a', name: 'Secret Lake Lookout' } });
  await settle();
  await screen.press('Type an address');
  await act(async () => screen.all('TextInput')[1].props.onChangeText('Lake Rd'));
  await screen.press('Add to list');
  const [item] = h.documents.get('lists/a').items;
  const id = spotIds(h)[0].slice('spots/'.length);
  assert.deepEqual(item, { spot: { k: 'x', id, owner: 'audit', name: 'Secret Lake Lookout', address: 'Lake Rd' }, note: '' });
  assert.ok(h.documents.get('favourites/audit')[`x:${id}`]);
  assert.deepEqual(screen.snackbar(), ['Added Secret Lake Lookout']);

  // The same name and place again reuses it, rather than making a second one.
  const again = await mount(h, 'screens/OwnSpotScreen.js', { params: { from: 'saved', name: 'secret lake lookout' } });
  await again.press('Type an address');
  await act(async () => again.all('TextInput')[1].props.onChangeText('lake rd'));
  await again.press('Save spot');
  assert.equal(spotIds(h).length, 1);
  assert.deepEqual(again.snackbar(), ['Matched an existing spot: Secret Lake Lookout']);
});

test('editor: editing refreshes the spot wherever it is, and a cleared detail goes away', async () => {
  const h = createHarness({ documents: {
    'users/audit': { username: 'audit', top4: { vancouver: { picks: [sunset, farm], public: false } } },
    'favourites/audit': { listsMigratedAt: 1, 'x:audit_sunset': { isFavourite: true, owner: 'audit', name: 'Hidden Sunset Viewpoint', savedAt: 1 } },
    'spots/audit_sunset': record({ description: 'Old words', tips: 'Bring a jacket.' }),
    'lists/a': listDoc('Golden Hour', [farm, sunset]),
    'lists/b': listDoc('Weekend', [sunset]),
    'lists/c': listDoc('Untouched', [maan]),
  } });
  const screen = await mount(h, 'screens/OwnSpotScreen.js', { params: { spotId: 'audit_sunset' } });
  await settle();
  assert.equal(screen.all('TextInput')[0].props.value, 'Hidden Sunset Viewpoint');
  assert.ok(screen.texts().includes('Edit spot') && screen.texts().includes('Tips'), 'details that were filled in start open');
  const before = JSON.stringify(h.documents.get('lists/c'));
  await act(async () => { screen.all('TextInput')[0].props.onChangeText('Sunset Lookout'); screen.all('TextInput')[1].props.onChangeText(''); });
  await screen.press('Save changes');

  const spot = h.documents.get('spots/audit_sunset');
  assert.deepEqual([spot.name, 'description' in spot, spot.tips, spot.createdAt], ['Sunset Lookout', false, 'Bring a jacket.', 1]);
  for (const listId of ['a', 'b']) {
    assert.ok(h.documents.get(`lists/${listId}`).items.some(item => item.spot.id === 'audit_sunset' && item.spot.name === 'Sunset Lookout'), listId);
  }
  assert.equal(JSON.stringify(h.documents.get('lists/c')), before);
  assert.equal(h.documents.get('favourites/audit')['x:audit_sunset'].name, 'Sunset Lookout');
  assert.equal(h.documents.get('users/audit').top4.vancouver.picks[0].name, 'Sunset Lookout');
  assert.deepEqual(screen.snackbar(), ['Changes saved']);
});

test('editor: leaving with unsaved changes asks first; leaving untouched does not', async () => {
  const h = createHarness({ documents: { 'users/audit': { username: 'audit' }, 'favourites/audit': { listsMigratedAt: 1 } } });
  const screen = await mount(h, 'screens/OwnSpotScreen.js', { params: { from: 'saved' } });
  h.leave();
  assert.equal(h.alerts.length, 0);
  assert.equal(h.dispatches.length, 1);

  await act(async () => screen.all('TextInput')[0].props.onChangeText('Half typed'));
  h.leave();
  const [title, , choices] = h.alerts.at(-1);
  assert.equal(title, 'Discard changes?');
  assert.deepEqual(choices.map(choice => choice.text), ['Keep editing', 'Discard']);
  assert.equal(h.dispatches.length, 1, 'still here');
  choices[1].onPress();
  assert.deepEqual(h.dispatches.at(-1), { type: 'GO_BACK' });
});

// ---------------------------------------------------------------- "My spots" when adding to a list

test('add a spot: "My spots" shows only the user\'s own, searchable by what they wrote', async () => {
  const h = createHarness({ documents: {
    'users/audit': { username: 'audit' }, 'favourites/audit': { listsMigratedAt: 1 },
    'lists/a': listDoc('Summer Adventures', [sunset]),
    'spots/audit_sunset': record(),
    'spots/audit_lake': record({ name: 'Secret Lake Lookout', description: 'A quiet swimming spot', createdAt: 2 }),
  } });
  const screen = await mount(h, 'screens/ListScreen.js', { params: { listId: 'a' } });
  await screen.press('Add a spot');
  await flush();
  await screen.press('My spots');
  assert.ok(screen.button('Hidden Sunset Viewpoint added'), 'one already in the list shows as added');
  assert.ok(screen.button('Add Secret Lake Lookout'));
  assert.equal(screen.button('Add Maan Farms'), undefined, 'the app\'s spots are hidden');

  await act(async () => screen.all('TextInput')[0].props.onChangeText('swimming'));
  assert.ok(screen.button('Add Secret Lake Lookout') && !screen.button('Hidden Sunset Viewpoint added'));
  await screen.press('Add Secret Lake Lookout');
  const added = h.documents.get('lists/a').items.at(-1).spot;
  assert.deepEqual(added, { k: 'x', id: 'audit_lake', owner: 'audit', name: 'Secret Lake Lookout', lat: 49.2865, lng: -123.112 }, 'by reference, not a copy');
  assert.equal(spotIds(h).length, 2, 'nothing duplicated');

  await act(async () => screen.all('TextInput')[0].props.onChangeText('zebra'));
  assert.ok(screen.texts().includes('None of your spots match “zebra”.'));
  await screen.press('All');
  assert.ok(screen.texts().some(line => line.includes('No spots match “zebra”')));
});

test('add a spot: "My spots" with none yet points to making one', async () => {
  const h = createHarness({ documents: { 'users/audit': { username: 'audit' }, 'favourites/audit': { listsMigratedAt: 1 }, 'lists/a': listDoc('Empty') } });
  const screen = await mount(h, 'screens/ListScreen.js', { params: { listId: 'a' } });
  await screen.press('Add a spot');
  await flush();
  await screen.press('My spots');
  assert.ok(screen.texts().includes('You haven’t made any spots yet. Add one of your own below.'), screen.texts().join(' | '));
});

// ---------------------------------------------------------------- Old references -> records

test('opening Saved brings old own spots over to records once, keeping every list, Top 4 and public copy', async () => {
  const old = { k: 'x', id: 'steps1', name: 'Waterfront steps', lat: 49.28651, lng: -123.112 };
  const moved = { k: 'x', id: 'audit_steps1', owner: 'audit', name: 'Waterfront steps', lat: 49.28651, lng: -123.112 };
  const publicCopy = { ...listDoc('Shared', [old]), ownerUid: 'audit', ownerUsername: 'audit', spotCount: 1, publishedAt: 5, followerCount: 3, searchTerms: ['shared'] };
  const h = createHarness({ documents: {
    'users/audit': { username: 'audit', top4: { vancouver: { picks: [old], public: true } } },
    'favourites/audit': { listsMigratedAt: 1, 'Maan Farms': { isFavourite: true, season: 'Fall' } },
    'profiles/audit': { username: 'audit', top4: { vancouver: [old] } },
    'lists/a': listDoc('Mine', [farm, old]),
    'lists/b': { ...listDoc('Shared', [old]), public: true, publishedAt: 5 },
    'publicLists/b': publicCopy,
  } });
  const screen = await mount(h, 'screens/Favourites.js');
  await flush();
  assert.deepEqual(spotIds(h), ['spots/audit_steps1']);
  assert.equal(h.documents.get('spots/audit_steps1').legacyId, 'steps1');
  assert.deepEqual(h.documents.get('lists/a').items.map(item => item.spot), [farm, moved]);
  assert.deepEqual(h.documents.get('lists/b').items[0].spot, moved);
  assert.deepEqual(h.documents.get('publicLists/b').items[0].spot, moved);
  assert.deepEqual([h.documents.get('publicLists/b').publishedAt, h.documents.get('publicLists/b').followerCount], [5, 3], 'followers are kept');
  assert.deepEqual(h.documents.get('users/audit').top4.vancouver.picks, [moved]);
  assert.deepEqual(h.documents.get('profiles/audit').top4.vancouver, [moved]);
  assert.ok(h.documents.get('favourites/audit')['x:audit_steps1'].isFavourite, 'a spot they made appears in Saved');
  assert.ok(h.documents.get('favourites/audit')['Maan Farms'].isFavourite);
  assert.ok(screen.texts().includes('Waterfront steps'));

  // Again, after they took it out of Saved: nothing is made twice or put back.
  await screen.press('Remove Waterfront steps from favourites');
  const again = await mount(h, 'screens/Favourites.js');
  await flush();
  assert.deepEqual(spotIds(h), ['spots/audit_steps1']);
  assert.equal(h.documents.get('favourites/audit')['x:audit_steps1'], undefined);
  assert.ok(!again.texts().includes('Your spots'));
});

// ---------------------------------------------------------------- The spot page

test('spot page: the owner sees their latest edit and can edit or delete it; a visitor can only report it', async () => {
  const h = createHarness({ documents: { 'users/audit': { username: 'audit' }, 'favourites/audit': { listsMigratedAt: 1 }, 'spots/audit_sunset': record({ name: 'Sunset Lookout', description: 'Fresh words' }) } });
  const screen = await mount(h, 'screens/CustomSpotScreen.js', { params: { spot: sunset } });
  assert.ok(screen.texts().includes('Sunset Lookout') && screen.texts().includes('Fresh words'));
  assert.ok(screen.texts().includes('Only you can see this spot. Add it to a public list to share it.'));
  await screen.press('More options');
  assert.deepEqual(h.menus.at(-1).options, ['Edit spot', 'Delete spot', 'Cancel']);
  await act(async () => h.menus.at(-1).pick('Edit spot'));
  assert.deepEqual(h.navigations.at(-1), ['OwnSpotScreen', { spotId: 'audit_sunset' }]);

  const visitor = await mount(h, 'screens/CustomSpotScreen.js', { params: { spot: { k: 'x', id: 'maya_lake', owner: 'maya', name: 'Lake' }, addedBy: 'maya' } });
  await visitor.press('More options');
  assert.deepEqual(h.menus.at(-1).options, ['Report spot', 'Cancel']);
  assert.ok(!textOf(visitor.renderer.root).includes('Fresh words'));
});
