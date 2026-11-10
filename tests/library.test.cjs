// The library, list page, sheets and heart flow, rendered against the in-memory Firestore.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { createHarness, act } = require('./renderHarness.cjs');
const { mount, textOf, quiet, flush } = require('./support.cjs');
const { catalogueRef } = require('../services/catalogue');
const { createList, addSpot, setNote } = require('../services/listsState');
const { directionsUrl } = require('../services/directions');

const farm = catalogueRef('Aldor Family Farm');
const maan = catalogueRef('Maan Farms');
const steps = { k: 'x', id: 'audit_steps1', owner: 'audit', name: 'Waterfront steps', lat: 49.28651, lng: -123.112 };
// The record behind `steps`: what "My spots" and the spot page read.
const stepsRecord = { ownerUid: 'audit', name: 'Waterfront steps', lat: 49.28651, lng: -123.112, photos: [], publicListIds: [], createdAt: 1, updatedAt: 1 };
const listDoc = (title, refs = [], extra = {}) => ({
  ...refs.reduce((list, ref) => addSpot(list, ref), createList({ ownerUid: 'audit', title, now: 1 })), ...extra,
});
// ---------------------------------------------------------------- Directions (pure; own spots are in customSpots.test.cjs)

test('directions open the phone\'s own maps app, by pin when there is one', () => {
  assert.equal(directionsUrl({ latitude: 49.2, longitude: -123.1, address: '12 Main St' }, 'ios'), 'http://maps.apple.com/?daddr=49.2%2C-123.1');
  assert.equal(directionsUrl({ address: '12 Main St, Vancouver' }, 'android'), 'https://www.google.com/maps/dir/?api=1&destination=12%20Main%20St%2C%20Vancouver');
  assert.equal(directionsUrl({}, 'ios'), null);
});

// ---------------------------------------------------------------- Library

test('opening the app reads and writes no lists until the library is opened', async () => {
  const h = createHarness();
  const before = JSON.stringify([...h.documents]);
  await mount(h, 'screens/HomeScreen.js');
  assert.equal(JSON.stringify([...h.documents]), before);
});

test('library: Saved no longer shows season tiles; it lists hearted spots by season and opens them', async () => {
  const h = createHarness({ documents: {
    'users/audit': { username: 'audit' },
    'favourites/audit': {
      collections: [{ title: 'Weekend', color: '#A7C8FF', dates: ['Aldor Family Farm'] }],
      'Maan Farms': { isFavourite: true, season: 'Fall', location: '790 McKenzie Rd, Abbotsford' },
      'Gone Farm': { isFavourite: true, season: 'Fall', location: '' },
    },
  } });
  const screen = await mount(h, 'screens/Favourites.js');
  assert.equal(screen.button('View Fall Favourites'), undefined, 'no seasonal collection is shown unless the user keeps one');
  assert.ok(screen.texts().includes('Fall'));
  assert.ok(screen.texts().includes('Maan Farms'));
  assert.ok(screen.texts().includes('No longer listed'), 'a spot SznLuv dropped stays, so it can be removed');
  await screen.press('View details for Maan Farms');
  assert.deepEqual(h.navigations.at(-1), ['SpotDetailScreen', { placeID: 'maan_farms' }]);

  await screen.press('Remove Gone Farm from favourites');
  assert.equal(h.documents.get('favourites/audit')['Gone Farm'], undefined);
  assert.deepEqual(screen.snackbar(), ['Removed from favourites', 'Undo']);
  assert.ok(h.documents.get('favourites/audit')['Maan Farms'].isFavourite, 'hearts are untouched by bringing old data over');
});

test('library: Saved with nothing hearted invites the user to explore', async () => {
  const h = createHarness({ documents: { 'users/audit': { username: 'audit' } } });
  const screen = await mount(h, 'screens/Favourites.js');
  assert.ok(screen.texts().includes('Nothing saved yet'), screen.texts().join(' | '));
  await screen.press('Explore Vancouver');
  assert.deepEqual(h.navigations.at(-1), ['HomeTab', { screen: 'SeasonsScreen', initial: false }]);
});

test('library: My lists turns old collections into lists once, and offers New list', async () => {
  const h = createHarness();
  const screen = await mount(h, 'screens/Favourites.js');
  await screen.press('My lists');
  assert.ok(screen.button('Weekend, private list, 1 spot'), screen.texts().join(' | '));
  assert.equal(h.documents.get('favourites/audit').collections, undefined);
  assert.ok(h.documents.get('favourites/audit').listsMigratedAt);
  const migrated = h.documents.get('lists/audit_c0');
  assert.deepEqual([migrated.title, migrated.cover, migrated.items, migrated.public],
    ['Weekend', { type: 'colour', value: '#A7C8FF' }, [{ spot: farm, note: '' }], false]);

  await screen.press('Weekend, private list, 1 spot');
  assert.deepEqual(h.navigations.at(-1), ['ListScreen', { listId: 'audit_c0' }]);
  await screen.press('New list');
  assert.deepEqual(h.navigations.at(-1), ['ListDetails']);
  await act(async () => screen.renderer.unmount());

  // Coming back later remembers the side you were on and does not migrate again.
  const again = await mount(h, 'screens/Favourites.js');
  assert.ok(again.button('Weekend, private list, 1 spot'));
  assert.equal([...h.documents.keys()].filter(key => key.startsWith('lists/')).length, 1);
});

test('library: no lists yet shows an invitation, and a load failure can be retried', async () => {
  const h = createHarness({ documents: { 'users/audit': { username: 'audit' } } });
  const screen = await mount(h, 'screens/Favourites.js');
  await screen.press('My lists');
  assert.ok(screen.texts().includes('No lists yet'), screen.texts().join(' | '));
  await screen.press('New list');
  assert.deepEqual(h.navigations.at(-1), ['ListDetails']);

  const failing = createHarness({ writeError: 'unavailable' });
  await quiet(async () => {
    const broken = await mount(failing, 'screens/Favourites.js');
    await broken.press('My lists');
    assert.ok(broken.texts().includes('Couldn’t load your lists'));
    assert.ok(broken.button('Try again'));
  });
});

// ---------------------------------------------------------------- Heart

test('heart: saves with a snackbar instead of an alert, and offers Add to list', async () => {
  const h = createHarness();
  const screen = await mount(h, 'screens/FallDatesScreen.js');
  await screen.press('Favorite Aldor Family Farm');
  assert.equal(h.alerts.length, 0, 'no blocking alert');
  assert.equal(h.documents.get('favourites/audit')['Aldor Family Farm'].season, 'Fall');
  assert.deepEqual(screen.snackbar(), ['Saved to Fall favourites', 'Add to list']);
  await screen.press('Add to list');
  assert.deepEqual(h.navigations.at(-1), ['AddToList', { spot: farm }]);

  await screen.press('Favorite Aldor Family Farm');
  assert.equal(h.documents.get('favourites/audit')['Aldor Family Farm'], undefined);
  assert.deepEqual(screen.snackbar(), ['Removed from favourites', 'Undo']);
  await screen.press('Undo');
  assert.ok(h.documents.get('favourites/audit')['Aldor Family Farm'].isFavourite);
});

test('heart: a failed save puts the heart back and says so', async () => {
  const h = createHarness({ writeError: 'unavailable' });
  const screen = await mount(h, 'screens/WinterDatesScreen.js');
  await quiet(() => screen.press('Favorite Glacier Rink'));
  assert.equal(h.documents.get('favourites/audit')['Glacier Rink'], undefined);
  assert.deepEqual(screen.snackbar(), ['Couldn’t save. Check your connection.']);
  assert.equal(h.alerts.length, 0);
});

test('saved spots: removing one offers Undo, which puts it back as it was', async () => {
  const entry = { isFavourite: true, season: 'Fall', location: '24990 84 Ave, Langley' };
  const h = createHarness({ documents: { 'users/audit': { username: 'audit' }, 'favourites/audit': { 'Aldor Family Farm': entry } } });
  const screen = await mount(h, 'screens/SeasonalFavourites.js', { params: { season: 'Fall' } });
  await screen.press('Remove Aldor Family Farm from favourites');
  assert.equal(h.documents.get('favourites/audit')['Aldor Family Farm'], undefined);
  assert.deepEqual(screen.snackbar(), ['Removed Aldor Family Farm', 'Undo']);
  await screen.press('Undo');
  assert.deepEqual(h.documents.get('favourites/audit')['Aldor Family Farm'], entry);
  assert.ok(screen.texts().includes('Aldor Family Farm'));
});

// ---------------------------------------------------------------- Sheets

const withLists = lists => ({
  'users/audit': { username: 'audit' },
  'favourites/audit': { listsMigratedAt: 1 },
  ...Object.fromEntries(Object.entries(lists).map(([id, list]) => [`lists/${id}`, list])),
});

test('add to list: each row toggles that list and the sheet stays open', async () => {
  const h = createHarness({ documents: withLists({ a: listDoc('Weekend', [farm]), b: listDoc('Date night') }) });
  const sheet = await mount(h, 'screens/AddToListSheet.js', { params: { spot: maan } });
  const row = label => sheet.all('TouchableOpacity').find(node => node.props.accessibilityLabel === label);
  assert.equal(row('Weekend, 1 spot').props.accessibilityState.checked, false);

  await sheet.press('Weekend, 1 spot');
  await sheet.press('Date night, 0 spots');
  assert.deepEqual(h.documents.get('lists/a').items.map(item => item.spot.name), ['Aldor Family Farm', 'Maan Farms']);
  assert.deepEqual(h.documents.get('lists/b').items, [{ spot: maan, note: '' }]);
  assert.equal(row('Weekend, 2 spots').props.accessibilityState.checked, true);
  assert.ok(!h.calls.some(([name]) => name === 'goBack'), 'still open');

  await sheet.press('Weekend, 2 spots');
  assert.deepEqual(h.documents.get('lists/a').items.map(item => item.spot.name), ['Aldor Family Farm']);
  await sheet.press('New list');
  assert.deepEqual(h.navigations.at(-1), ['ListDetails', { addSpot: maan }]);
  await sheet.press('Done');
  assert.ok(h.calls.some(([name]) => name === 'goBack'));
});

test('add to list: saving someone else\'s spot copies the place without their note; no lists invites a first one', async () => {
  const h = createHarness({ documents: withLists({ a: listDoc('Weekend') }) });
  const sheet = await mount(h, 'screens/AddToListSheet.js', { params: { spot: steps } });
  await sheet.press('Weekend, 0 spots');
  assert.deepEqual(h.documents.get('lists/a').items, [{ spot: steps, note: '' }]);

  const empty = createHarness({ documents: withLists({}) });
  const none = await mount(empty, 'screens/AddToListSheet.js', { params: { spot: farm } });
  assert.ok(none.texts().includes('You don’t have any lists yet. Start one with this spot.'));
});

test('new list: needs a title, saves once on a double tap, then opens the list', async () => {
  const h = createHarness({ documents: withLists({}) });
  const sheet = await mount(h, 'screens/ListDetailsSheet.js');
  const create = () => sheet.button('Create list');
  assert.equal(create().props.disabled, true);

  const [title, description] = sheet.all('TextInput');
  await act(async () => { title.props.onChangeText('  Road Trips '); description.props.onChangeText('Long drives.'); });
  await sheet.press('Fall illustration cover');
  assert.equal(create().props.disabled, false);
  let first, second;
  await act(async () => { first = create().props.onPress(); second = create().props.onPress(); await Promise.all([first, second]); });
  await flush();

  const created = [...h.documents].filter(([key]) => key.startsWith('lists/'));
  assert.equal(created.length, 1);
  const [key, list] = created[0];
  assert.deepEqual([list.title, list.description, list.cover, list.items, list.public, list.ownerUid],
    ['Road Trips', 'Long drives.', { type: 'season', value: 'fall' }, [], false, 'audit']);
  // One move closes the sheet and opens the new list, so the sheet can never be left hanging over it.
  assert.deepEqual(h.calls.filter(([name]) => name === 'popTo'),
    [['popTo', 'Main', { screen: 'FavouritesTab', params: { screen: 'ListScreen', params: { listId: key.split('/')[1] } } }]]);
  assert.ok(!h.calls.some(([name]) => name === 'goBack'));
});

test('new list from a spot starts with that spot and returns to the picker', async () => {
  const h = createHarness({ documents: withLists({}) });
  const sheet = await mount(h, 'screens/ListDetailsSheet.js', { params: { addSpot: maan } });
  await act(async () => sheet.all('TextInput')[0].props.onChangeText('Harvest'));
  await sheet.press('Create list');
  const [, list] = [...h.documents].find(([key]) => key.startsWith('lists/'));
  assert.deepEqual(list.items, [{ spot: maan, note: '' }]);
  assert.equal(h.calls.filter(([name]) => name === 'goBack').length, 1);
  assert.ok(!h.navigations.some(([name]) => name === 'Main'));
});

test('list details: edits the title, description and cover of an existing list, keeping its spots', async () => {
  const h = createHarness({ documents: withLists({ a: listDoc('Weekend', [farm], { description: 'Old words' }) }) });
  const sheet = await mount(h, 'screens/ListDetailsSheet.js', { params: { listId: 'a' } });
  const [title, description] = sheet.all('TextInput');
  assert.deepEqual([title.props.value, description.props.value], ['Weekend', 'Old words']);
  await act(async () => title.props.onChangeText('Slow Sundays'));
  await sheet.press('Pink cover');
  await sheet.press('Save');
  const saved = h.documents.get('lists/a');
  assert.deepEqual([saved.title, saved.description, saved.cover.value, saved.items.length], ['Slow Sundays', 'Old words', '#FFC1E3', 1]);
  assert.ok(h.calls.some(([name]) => name === 'goBack'));
});

test('note: saves a trimmed note on the right spot and can clear it', async () => {
  const h = createHarness({ documents: withLists({ a: listDoc('Weekend', [farm, maan]) }) });
  const sheet = await mount(h, 'screens/NoteSheet.js', { params: { listId: 'a', spotKey: 'c:Maan Farms', name: 'Maan Farms', note: '' } });
  await act(async () => sheet.all('TextInput')[0].props.onChangeText('  Get the corn.  '));
  assert.ok(sheet.texts().includes('14/140') || sheet.texts().join(' ').includes('/140'));
  await sheet.press('Save note');
  assert.deepEqual(h.documents.get('lists/a').items.map(item => item.note), ['', 'Get the corn.']);
  assert.ok(h.calls.some(([name]) => name === 'goBack'));

  const clear = await mount(h, 'screens/NoteSheet.js', { params: { listId: 'a', spotKey: 'c:Maan Farms', name: 'Maan Farms', note: 'Get the corn.' } });
  await act(async () => clear.all('TextInput')[0].props.onChangeText(''));
  await clear.press('Remove note');
  assert.deepEqual(h.documents.get('lists/a').items.map(item => item.note), ['', '']);
});

// ---------------------------------------------------------------- List page

async function openList(list, options = {}) {
  const h = createHarness({ documents: { ...withLists({ a: list, other: listDoc('Elsewhere', [steps]) }), 'spots/audit_steps1': stepsRecord }, ...options });
  const screen = await mount(h, 'screens/ListScreen.js', { params: { listId: 'a' } });
  return { h, screen };
}

test('list page: shows the title, place, count, description and each spot with its note', async () => {
  const list = setNote(listDoc('Golden Hour', [farm, steps], { description: 'Last light.' }), 'x:audit_steps1', 'Sit on the left.');
  const { h, screen } = await openList(list);
  assert.deepEqual(screen.texts().slice(0, 3), ['Golden Hour', 'Vancouver · 2 spots', 'Last light.']);
  assert.ok(screen.texts().includes('Langley · Fall') && screen.texts().includes('Dropped pin') && screen.texts().includes('Sit on the left.'));
  assert.ok(screen.button('Private list, change sharing'));
  const coloured = screen.all('View').some(view => [view.props.style].flat(3).some(style => style?.backgroundColor === '#A7C8FF'));
  assert.ok(coloured, 'the page takes the list\'s cover colour');

  await screen.press('View details for Aldor Family Farm');
  assert.deepEqual(h.navigations.at(-1), ['AldorFamilyFarmScreen']);
  await screen.press('View details for Waterfront steps');
  assert.deepEqual(h.navigations.at(-1), ['CustomSpotScreen', { spot: steps, addedBy: null }]);
});

test('list page: the heart saves an app spot to its season and a spot of your own to Saved', async () => {
  const { h, screen } = await openList(listDoc('Golden Hour', [farm, steps]));
  await screen.press('Save Aldor Family Farm');
  assert.equal(h.documents.get('favourites/audit')['Aldor Family Farm'].season, 'Fall');
  assert.deepEqual(screen.snackbar(), ['Saved to Fall favourites', 'Add to list']);
  assert.ok(screen.button('Remove Aldor Family Farm from favourites'));
  await screen.press('Save Waterfront steps');
  const saved = h.documents.get('favourites/audit')['x:audit_steps1'];
  assert.deepEqual([saved.isFavourite, saved.owner, saved.name], [true, 'audit', 'Waterfront steps']);
  assert.deepEqual(screen.snackbar(), ['Saved Waterfront steps', 'Add to list']);
  await screen.press('Add to list');
  assert.deepEqual(h.navigations.at(-1), ['AddToList', { spot: steps }]);
  await screen.press('Remove Waterfront steps from favourites');
  assert.equal(h.documents.get('favourites/audit')['x:audit_steps1'], undefined);
  assert.deepEqual(screen.snackbar(), ['Removed from Saved', 'Undo']);
  assert.deepEqual(h.documents.get('lists/a').items.map(item => item.spot.name), ['Aldor Family Farm', 'Waterfront steps'], 'unsaving never removes the spot');
});

test('list page: edit mode reorders and removes, and removal can be undone into place', async () => {
  const { h, screen } = await openList(listDoc('Golden Hour', [farm, maan, steps]));
  const order = () => h.documents.get('lists/a').items.map(item => item.spot.name);
  await screen.press('More options');
  assert.deepEqual(h.menus.at(-1).options, ['Edit spots', 'List details', 'Delete list', 'Cancel']);
  await act(async () => h.menus.at(-1).pick('Edit spots'));
  assert.ok(screen.button('Done') && !screen.button('Add a spot'));
  assert.equal(screen.button('Move Aldor Family Farm up').props.disabled, true);
  assert.equal(screen.button('Move Waterfront steps down').props.disabled, true);

  await screen.press('Move Maan Farms up');
  assert.deepEqual(order(), ['Maan Farms', 'Aldor Family Farm', 'Waterfront steps']);
  await screen.press('Remove Aldor Family Farm');
  assert.deepEqual(order(), ['Maan Farms', 'Waterfront steps']);
  assert.deepEqual(screen.snackbar(), ['Removed Aldor Family Farm', 'Undo']);
  await screen.press('Undo');
  assert.deepEqual(order(), ['Maan Farms', 'Aldor Family Farm', 'Waterfront steps']);

  await screen.press('Add a note for Maan Farms');
  assert.deepEqual(h.navigations.at(-1), ['Note', { listId: 'a', spotKey: 'c:Maan Farms', name: 'Maan Farms', note: '' }]);
  await screen.press('Done');
  assert.ok(screen.button('Add a spot'));
});

test('list page: a failed change is put back and explained', async () => {
  const failing = createHarness({ documents: withLists({ a: listDoc('Golden Hour', [farm, maan]) }), writeError: 'unavailable' });
  const broken = await mount(failing, 'screens/ListScreen.js', { params: { listId: 'a' } });
  await act(async () => broken.button('View details for Maan Farms').props.onLongPress());
  await quiet(() => broken.press('Move Maan Farms up'));
  assert.deepEqual(broken.all('Text').map(node => node.props.children).filter(name => ['Aldor Family Farm', 'Maan Farms'].includes(name)),
    ['Aldor Family Farm', 'Maan Farms']);
  assert.deepEqual(broken.snackbar(), ['Couldn’t save. Check your connection.']);
});

test('list page: add a spot searches every season, adds in place, and hands off to "add your own"', async () => {
  const { h, screen } = await openList(listDoc('Golden Hour', [farm]));
  await screen.press('Add a spot');
  await flush();
  assert.ok(screen.button('Aldor Family Farm added'));
  assert.ok(screen.button('Add Waterfront steps'), 'own spots from other lists are offered');
  assert.ok(screen.button('Add Glacier Rink') && screen.button('Add Sunset Beach'), 'all seasons are searched');

  await act(async () => screen.all('TextInput')[0].props.onChangeText('maan'));
  await screen.press('Add Maan Farms');
  assert.deepEqual(h.documents.get('lists/a').items.map(item => item.spot.name), ['Aldor Family Farm', 'Maan Farms']);
  assert.ok(screen.button('Maan Farms added'));

  await act(async () => screen.all('TextInput')[0].props.onChangeText('Secret bench'));
  assert.ok(screen.texts().some(line => line.includes('No spots match “Secret bench”')));
  const own = screen.all('TouchableOpacity').find(node => textOf(node).join('').includes('Add your own spot'));
  await act(async () => own.props.onPress());
  assert.deepEqual(h.navigations.at(-1), ['OwnSpotScreen', { listId: 'a', name: 'Secret bench' }]);
});

test('list page: an empty list invites the first spot; delete asks first, then leaves', async () => {
  const { h, screen } = await openList(listDoc('Golden Hour'));
  assert.ok(screen.texts().includes('Add your first spot'));
  await screen.press('More options');
  assert.deepEqual(h.menus.at(-1).options, ['List details', 'Delete list', 'Cancel']);
  assert.equal(h.menus.at(-1).destructiveButtonIndex, 1);
  await act(async () => h.menus.at(-1).pick('List details'));
  assert.deepEqual(h.navigations.at(-1), ['ListDetails', { listId: 'a' }]);

  await act(async () => h.menus.at(-1).pick('Delete list'));
  const [title, message, buttons] = h.alerts.at(-1);
  assert.deepEqual([title, message], ['Delete “Golden Hour”?', 'This can’t be undone.']);
  await act(async () => { await buttons.find(option => option.text === 'Delete list').onPress(); });
  await flush();
  assert.equal(h.documents.has('lists/a'), false);
  assert.ok(h.calls.some(([name]) => name === 'goBack'));
  assert.ok(screen.texts().includes('Golden Hour'), 'the page stays as it was while it leaves');
});

test('list page: someone else\'s private list, or one that is gone, shows the same neutral page', async () => {
  for (const documents of [withLists({ a: listDoc('Secret plans', [farm], { ownerUid: 'someone-else' }) }), withLists({})]) {
    const h = createHarness({ documents });
    const screen = await mount(h, 'screens/ListScreen.js', { params: { listId: 'a' } });
    assert.deepEqual(screen.texts(), ['This list isn’t available', 'It may have been made private or removed.', 'Back to Explore']);
  }
});

// ---------------------------------------------------------------- Own spot screens

test('add your own spot: explains what is missing, then adds a pinned spot to the list', async () => {
  const h = createHarness({ documents: withLists({ a: listDoc('Golden Hour') }) });
  const screen = await mount(h, 'screens/OwnSpotScreen.js', { params: { listId: 'a', name: 'Waterfront steps' } });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 520)); });
  assert.equal(screen.all('TextInput')[0].props.value, 'Waterfront steps');
  await screen.press('Add to list');
  assert.ok(screen.texts().includes('Move the map so the pin sits on your spot.'));
  assert.deepEqual(h.documents.get('lists/a').items, []);

  const map = screen.renderer.root.findByType('MapView');
  await act(async () => map.props.onRegionChangeComplete({ latitude: 49.1, longitude: -123.2 }, { isGesture: false }));
  await screen.press('Add to list');
  assert.deepEqual(h.documents.get('lists/a').items, [], 'the map settling is not a chosen pin');
  await act(async () => map.props.onRegionChangeComplete({ latitude: 49.286512, longitude: -123.112004 }, { isGesture: true }));
  assert.ok(screen.texts().includes('Pin at 49.2865, -123.1120'));
  await screen.press('Add to list');
  const [added] = h.documents.get('lists/a').items;
  assert.deepEqual([added.spot.k, added.spot.name, added.spot.lat, added.spot.lng, added.note], ['x', 'Waterfront steps', 49.28651, -123.112, '']);
  assert.ok(h.calls.some(([name]) => name === 'goBack'));
});

test('add your own spot: a typed address is kept as written; a name the app lists is matched instead', async () => {
  const h = createHarness({ documents: withLists({ a: listDoc('Golden Hour') }) });
  const screen = await mount(h, 'screens/OwnSpotScreen.js', { params: { listId: 'a' } });
  await act(async () => screen.all('TextInput')[0].props.onChangeText('Corner cafe'));
  await screen.press('Type an address');
  await screen.press('Add to list');
  assert.ok(screen.texts().includes('Type an address, or drop a pin instead.'));
  await act(async () => screen.all('TextInput')[1].props.onChangeText('12 Main St'));
  await screen.press('Add to list');
  const spot = h.documents.get('lists/a').items[0].spot;
  assert.deepEqual([spot.name, spot.address, 'lat' in spot], ['Corner cafe', '12 Main St', false]);

  const second = await mount(h, 'screens/OwnSpotScreen.js', { params: { listId: 'a', name: 'maan farms' } });
  await second.press('Type an address');
  await act(async () => second.all('TextInput')[1].props.onChangeText('somewhere'));
  await second.press('Add to list');
  const [title, , choices] = h.alerts.at(-1);
  assert.equal(title, 'SznLuv already lists Maan Farms');
  assert.deepEqual(choices.map(choice => choice.text), ['Cancel', 'Make my own', 'Use SznLuv’s page']);
  await act(async () => { await choices[2].onPress(); });
  await flush();
  assert.deepEqual(h.documents.get('lists/a').items[1].spot, maan);
});

test('own spot page: shows where it is, opens directions, and offers Add to list', async () => {
  const h = createHarness();
  const screen = await mount(h, 'screens/CustomSpotScreen.js', { params: { spot: steps } });
  assert.deepEqual(screen.texts().slice(0, 3), ['Add up to 3 photos', 'Waterfront steps', 'Dropped pin (49.2865, -123.1120)']);
  await screen.press('Directions');
  assert.deepEqual(h.calls.at(-1), ['openURL', 'http://maps.apple.com/?daddr=49.28651%2C-123.112']);
  await screen.press('Add to list');
  assert.deepEqual(h.navigations.at(-1), ['AddToList', { spot: steps }]);
});
