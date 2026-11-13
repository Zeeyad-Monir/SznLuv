// A public list may only hold spots the map can pin: the rule itself, publishing, the Sharing sheet,
// the owner's list page, and editing a spot that is already public.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, act } = require('./renderHarness.cjs');
const { mount, flush } = require('./support.cjs');
const { catalogueRef, validPin } = require('../services/catalogue');
const L = require('../services/listsState');
const S = require('../services/customSpotsState');

const farm = catalogueRef('Aldor Family Farm');
const placeholder = catalogueRef('Glacier Rink'); // One of SznLuv's spots with a made-up address
const pinned = { k: 'x', id: 'audit_steps', owner: 'audit', name: 'Waterfront steps', lat: 49.28651, lng: -123.112 };
const typed = { k: 'x', id: 'audit_typed', owner: 'audit', name: 'Dog walking spot', address: '3836 Carrigan Ct, Burnaby' };
const theirs = { k: 'x', id: 'maya_pier', owner: 'maya', name: 'Old pier' };
const record = (ref, extra = {}) => ({
  ownerUid: 'audit', name: ref.name, ...(ref.address ? { address: ref.address } : {}),
  ...(Number.isFinite(ref.lat) ? { lat: ref.lat, lng: ref.lng } : {}), photos: [], publicListIds: [], createdAt: 1, updatedAt: 1, ...extra,
});
const draft = (title, refs = []) => refs.reduce((list, ref) => L.addSpot(list, ref), L.createList({ ownerUid: 'audit', title, now: 1 }));
// Already public: a copy written before the rule existed, so it can hold anything.
const published = (id, list) => ({
  [`lists/${id}`]: { ...list, public: true, publishedAt: 100 },
  [`publicLists/${id}`]: L.toPublicSnapshot(list, { ownerUsername: 'audit', now: 100 }),
});
const base = {
  'users/audit': { username: 'audit' }, 'favourites/audit': { listsMigratedAt: 1 },
  'spots/audit_steps': record(pinned), 'spots/audit_typed': record(typed),
};
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 520)); });
const OFF_MAP_HINT = 'Fix or remove these spots to make the list public.';

// ---------------------------------------------------------------- The rule (pure)

test('on the map: a real pin counts; nothing, out of range, or 0,0 does not', () => {
  assert.equal(validPin({ lat: 49.28, lng: -123.11 }), true);
  assert.equal(validPin({ address: '12 Main St' }), false);
  assert.equal(validPin({ lat: 0, lng: 0 }), false, 'what a broken lookup leaves behind');
  assert.equal(validPin({ lat: 91, lng: 10 }), false);
  assert.equal(validPin({ lat: 10, lng: -181 }), false);
  assert.equal(validPin({ lat: Number.NaN, lng: 1 }), false);
  assert.equal(validPin(null), false);
});

test('on the map: each kind of spot is found where it lives, and the ones off the map say why', () => {
  const items = [farm, placeholder, pinned, typed, theirs, { k: 'x', id: 'sam_gone', owner: 'sam', name: 'Gone' }, catalogueRef('Not a real spot')]
    .map(spot => ({ spot, note: '' }));
  const placeOf = L.placeFrom({
    mine: { audit_steps: record(pinned), audit_typed: record(typed) },
    shared: { maya_pier: { ownerUid: 'maya', lat: 49.31, lng: -123.2 }, sam_gone: null },
  });
  assert.deepEqual(L.spotsOffTheMap(items, placeOf).map(off => [off.name, off.text]), [
    ['Glacier Rink', 'SznLuv has no map location for it'],
    ['Dog walking spot', 'Address not found on the map'],
    ['Gone', 'No longer shared by its owner'],
    ['Not a real spot', 'SznLuv has no map location for it'],
  ]);
  // My own spot whose record is gone, and an old reference with only its own words.
  const legacy = { k: 'x', id: 'old1', name: 'Old one', address: 'Somewhere' };
  assert.deepEqual(L.spotsOffTheMap([{ spot: pinned }, { spot: legacy }], L.placeFrom({ mine: { audit_steps: null } })).map(off => off.reason), ['gone', 'address']);
});

test('on the map: publishing is refused with the spots named; one bad spot reads differently from several', () => {
  const placeOf = L.placeFrom({ mine: { audit_typed: record(typed) } });
  assert.doesNotThrow(() => L.assertOnTheMap([{ spot: farm }], placeOf));
  assert.throws(() => L.assertOnTheMap([{ spot: farm }, { spot: typed }], placeOf), error => error.code === 'list/unpinned'
    && error.message === 'Dog walking spot needs a place on the map. Fix its location or remove it from the list.'
    && error.spots.length === 1);
  assert.throws(() => L.assertOnTheMap([{ spot: typed }, { spot: placeholder }], placeOf),
    { message: 'Dog walking spot and 1 more spot need a place on the map. Fix their location or remove them from the list.' });
});

test('on the map: a screen judges only what it has loaded', () => {
  const entry = (ref, spot, status = 'ready', mine = false) => ({ ref, spot: { key: `x:${ref.id ?? ref.name}`, ...spot }, status, mine });
  const placeOf = L.placeFromEntries([
    { ref: farm, spot: { key: 'c:Aldor Family Farm', latitude: 49.1, longitude: -122.6 }, status: 'ready' },
    entry(typed, { latitude: undefined, longitude: undefined }),
    entry(theirs, {}, 'loading'),
    entry({ id: 'sam_gone' }, {}, 'unavailable'),
    entry({ id: 'audit_deleted' }, {}, 'unavailable', true),
  ]);
  const items = [farm, typed, theirs, { k: 'x', id: 'sam_gone', name: 'Gone' }, { k: 'x', id: 'audit_deleted', name: 'Deleted' }].map(spot => ({ spot }));
  assert.deepEqual(L.spotsOffTheMap(items, placeOf).map(off => [off.name, off.reason]),
    [['Dog walking spot', 'address'], ['Gone', 'unshared'], ['Deleted', 'gone']], 'a spot still loading is not judged');
});

// ---------------------------------------------------------------- Publishing

test('publishing: a list with a spot off the map stays private and nothing is written; fixing it lets it go', async () => {
  const h = createHarness({ documents: { ...base, 'lists/a': draft('Dog days', [farm, typed]) } });
  const lists = h.load('services/lists.js');
  await assert.rejects(lists.publishList('audit', 'audit', 'a'), { code: 'list/unpinned' });
  assert.equal(h.documents.has('publicLists/a'), false);
  assert.equal(h.documents.has('publicSpots/audit_typed'), false, 'the spot is not shared either');
  assert.equal(h.documents.get('lists/a').public, false);

  // A dropped pin (still private, so the edit is allowed) puts it on the map.
  await h.load('services/customSpots.js').updateSpot('audit', 'audit_typed', { name: typed.name, lat: 49.25, lng: -122.95 });
  await lists.publishList('audit', 'audit', 'a');
  assert.equal(h.documents.get('publicLists/a').spotCount, 2);
});

test('publishing: someone else\'s spot needs its shared copy to have a pin; SznLuv\'s placeholders are refused', async () => {
  const h = createHarness({ documents: {
    ...base,
    'publicSpots/maya_pier': { ownerUid: 'maya', ownerUsername: 'maya', name: 'Old pier', lat: 49.31, lng: -123.2, photos: [] },
    'lists/a': draft('Shared', [pinned, theirs]),
    'lists/b': draft('Not shared any more', [{ ...theirs, id: 'maya_gone' }]),
    'lists/c': draft('Placeholder', [placeholder]),
  } });
  const lists = h.load('services/lists.js');
  await lists.publishList('audit', 'audit', 'a');
  assert.equal(h.documents.get('publicLists/a').spotCount, 2);
  await assert.rejects(lists.publishList('audit', 'audit', 'b'), { code: 'list/unpinned', message: /Old pier needs a place on the map/ });
  await assert.rejects(lists.publishList('audit', 'audit', 'c'), { code: 'list/unpinned', message: /Glacier Rink/ });
});

test('publishing: a public list that gains a spot off the map keeps its public copy until it is fixed', async () => {
  const h = createHarness({ documents: { ...base, ...published('a', draft('Golden Hour', [farm])) } });
  const lists = h.load('services/lists.js');
  await lists.mutateList('a', list => L.addSpot(list, typed));
  const before = JSON.stringify(h.documents.get('publicLists/a'));
  await assert.rejects(lists.publishList('audit', 'audit', 'a'), { code: 'list/unpinned' });
  assert.equal(JSON.stringify(h.documents.get('publicLists/a')), before);
});

// ---------------------------------------------------------------- The Sharing sheet

test('sharing: a private list names the spots off the map, and Make public waits for them', async () => {
  const h = createHarness({ documents: { ...base, 'lists/a': draft('Dog days', [farm, pinned, typed, placeholder]) } });
  const sheet = await mount(h, 'screens/SharingSheet.js', { params: { listId: 'a' } });
  const shown = sheet.texts().join(' | ');
  assert.match(shown, /Needs a place on the map/);
  assert.match(shown, /Dog walking spot: Address not found on the map/);
  assert.match(shown, /Glacier Rink: SznLuv has no map location for it/);
  const section = shown.slice(shown.indexOf('Needs a place on the map'));
  assert.doesNotMatch(section, /Waterfront steps|Aldor Family Farm/, 'spots on the map are not listed');
  assert.ok(sheet.texts().includes(OFF_MAP_HINT));
  assert.equal(sheet.button('Make public').props.disabled, true);

  const fine = await mount(h, 'screens/SharingSheet.js', { params: { listId: 'b' } });
  assert.ok(fine.texts().includes('This list isn’t available.'), 'sanity: a missing list');
  h.documents.set('lists/c', draft('Fine', [farm, pinned]));
  const ok = await mount(h, 'screens/SharingSheet.js', { params: { listId: 'c' } });
  assert.equal(ok.texts().includes('Needs a place on the map'), false);
  assert.equal(ok.button('Make public').props.disabled, false);
});

test('sharing: a public list keeps going; an update with a spot off the map waits, and revert still works', async () => {
  // Published before the rule, with a spot off the map: visitors keep it, the owner is told.
  const h = createHarness({ documents: { ...base, ...published('a', draft('Before the rule', [farm, typed])), ...published('b', draft('Golden Hour', [farm])) } });
  const old = await mount(h, 'screens/SharingSheet.js', { params: { listId: 'a' } });
  await flush();
  assert.ok(old.texts().includes('Visitors still see the list as it is. Your next update will need these spots fixed or removed.'));
  assert.ok(old.button('Share link'));

  await act(async () => { await h.load('services/lists.js').mutateList('b', list => L.addSpot(list, typed)); });
  const sheet = await mount(h, 'screens/SharingSheet.js', { params: { listId: 'b' } });
  await flush();
  assert.ok(sheet.texts().includes('Changes not public yet'));
  assert.ok(sheet.texts().includes('Fix or remove these spots to update the public list.'));
  assert.equal(sheet.button('Update public list').props.disabled, true);
  await sheet.press('Revert to public version');
  assert.equal(h.documents.get('lists/b').items.length, 1);
});

test('owner page: Update with a spot off the map opens Sharing instead of publishing', async () => {
  const h = createHarness({ documents: { ...base, ...published('a', draft('Golden Hour', [farm])) } });
  const screen = await mount(h, 'screens/ListScreen.js', { params: { listId: 'a' } });
  await act(async () => { await h.load('services/lists.js').mutateList('a', list => L.addSpot(list, typed)); });
  await flush();
  await screen.press('Update public list');
  assert.deepEqual(h.navigations.at(-1), ['Sharing', { listId: 'a' }]);
  assert.equal(h.documents.get('publicLists/a').spotCount, 1, 'nothing was published');
});

// ---------------------------------------------------------------- Editing a spot that is already public

test('spot form: a spot in a public list needs a pin; a typed address alone is not enough', () => {
  const form = { name: 'Steps', mode: 'address', address: '12 Main St' };
  assert.equal(S.spotProblem(form), null, 'a private spot can still be saved as typed');
  assert.equal(S.spotProblem({ ...form, needsPin: true }), 'This spot is in a public list, so it needs a place on the map. Drop a pin on it instead.');
  assert.equal(S.spotProblem({ ...form, needsPin: true, lookup: true }),
    'This spot is in a public list, so it needs a place on the map. Drop a pin, or find the address and pick a match.');
  assert.equal(S.spotProblem({ ...form, needsPin: true, pin: { latitude: 49.2, longitude: -123.1 } }), null, 'a matched address has a pin');
  assert.equal(S.spotProblem({ name: 'Steps', mode: 'pin', pin: { latitude: 49.2, longitude: -123.1 }, needsPin: true }), null);
});

test('editing a public spot: the editor and the service both refuse to take it off the map', async () => {
  const h = createHarness({ documents: {
    ...base,
    'spots/audit_steps': record(pinned, { publicListIds: ['a'] }),
    ...published('a', draft('Golden Hour', [pinned])),
  } });
  await assert.rejects(h.load('services/customSpots.js').updateSpot('audit', 'audit_steps', { name: pinned.name, address: 'Somewhere' }),
    { code: 'spot/unpinned' });
  assert.equal(h.documents.get('spots/audit_steps').lat, pinned.lat);

  const screen = await mount(h, 'screens/OwnSpotScreen.js', { params: { spotId: 'audit_steps' } });
  await settle();
  await screen.press('Type an address');
  await act(async () => screen.all('TextInput')[1].props.onChangeText('Somewhere'));
  assert.ok(screen.texts().includes('A typed address won’t show on the map, so the spot can’t go in a public list. Drop a pin to share it.'));
  await screen.press('Save changes');
  assert.ok(screen.texts().includes('This spot is in a public list, so it needs a place on the map. Drop a pin on it instead.'));
  assert.equal(h.documents.get('spots/audit_steps').lat, pinned.lat, 'nothing was saved');
  const copy = h.documents.get('publicSpots/audit_steps');
  assert.deepEqual([copy?.lat, copy?.address], [pinned.lat, undefined], 'visitors still see the pin');
});
