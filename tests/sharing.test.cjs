// Publishing, the visitor's view of a list, following, Explore and reporting.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, act } = require('./renderHarness.cjs');
const { mount, textOf, quiet, flush } = require('./support.cjs');
const { catalogueRef } = require('../services/catalogue');
const { createList, addSpot, setNote, toPublicSnapshot } = require('../services/listsState');

const farm = catalogueRef('Aldor Family Farm');
const maan = catalogueRef('Maan Farms');
const steps = { k: 'x', id: 'audit_steps1', owner: 'audit', name: 'Waterfront steps', lat: 49.28651, lng: -123.112 };
// The same kind of place, made by Maya: visitors get it linked by ID and name, never copied.
const mayaSteps = { k: 'x', id: 'maya-uid_steps1', owner: 'maya-uid', name: 'Waterfront steps', lat: 49.28651, lng: -123.112 };
const draft = (title, refs = [], extra = {}) => ({
  ...refs.reduce((list, ref) => addSpot(list, ref), createList({ ownerUid: 'audit', title, now: 1 })), ...extra,
});
const publicCopy = (list, ownerUsername, now = 100) => toPublicSnapshot(list, { ownerUsername, now });
// A list that is already public: the draft and its matching public copy.
const published = (id, list, ownerUsername = 'audit', now = 100) => ({
  [`lists/${id}`]: { ...list, public: true, publishedAt: now },
  [`publicLists/${id}`]: publicCopy(list, ownerUsername, now),
});
const base = { 'users/audit': { username: 'audit' }, 'favourites/audit': { listsMigratedAt: 1 } };
const someoneElse = (title, refs, ownerUid, ownerUsername, now = 100) => publicCopy(
  refs.reduce((list, ref) => addSpot(list, ref), createList({ ownerUid, title, now: 1 })), ownerUsername, now,
);

// ---------------------------------------------------------------- Sharing sheet

test('sharing: a private list shows exactly what going public reveals, then publishes', async () => {
  let list = draft('My Hottest Summer Spots', [farm, steps]);
  list = setNote(list, 'c:Aldor Family Farm', 'Go around 7 for the soft light.');
  const h = createHarness({ documents: { ...base, 'lists/a': list } });
  const sheet = await mount(h, 'screens/SharingSheet.js', { params: { listId: 'a' } });
  const shown = sheet.texts().join(' | ');
  assert.match(shown, /Only you can see this list\./);
  assert.match(shown, /“My Hottest Summer Spots”, with your username and 2 spots\./);
  assert.match(shown, /Aldor Family Farm: Go around 7 for the soft light\./);
  assert.match(shown, /Waterfront steps: Dropped pin \(49\.2865, -123\.1120\)/);
  assert.equal(h.documents.has('publicLists/a'), false, 'nothing is public until the button is pressed');

  await sheet.press('Make public');
  const copy = h.documents.get('publicLists/a');
  assert.deepEqual([copy.ownerUid, copy.ownerUsername, copy.spotCount, copy.items[0].note], ['audit', 'audit', 2, 'Go around 7 for the soft light.']);
  assert.equal(h.documents.get('lists/a').public, true);
  assert.equal(h.documents.get('profiles/audit').username, 'audit', 'publishing is what makes the owner findable');
  // The sheet reopens for its next step, so it is sized for what it now shows.
  assert.deepEqual(h.navigations.at(-1), ['Sharing', { listId: 'a', justPublished: true }]);
  const after = await mount(h, 'screens/SharingSheet.js', { params: h.navigations.at(-1)[1] });
  assert.match(after.texts().join(' | '), /It’s public\./);

  await after.press('Share link');
  assert.deepEqual(h.calls.at(-1), ['share', { message: '“My Hottest Summer Spots”, a SznLuv list by audit\nsznluv://list/a' }]);
});

test('sharing: an empty list cannot go public, and a list with nothing personal says so', async () => {
  const h = createHarness({ documents: { ...base, 'lists/a': draft('Nothing yet'), 'lists/b': draft('Plain', [farm]) } });
  const empty = await mount(h, 'screens/SharingSheet.js', { params: { listId: 'a' } });
  assert.ok(empty.texts().includes('Add a spot first.'));
  assert.equal(empty.button('Make public').props.disabled, true);

  const plain = await mount(h, 'screens/SharingSheet.js', { params: { listId: 'b' } });
  assert.ok(plain.texts().includes('No notes.') && plain.texts().includes('None.'));
  assert.equal(plain.button('Make public').props.disabled, false);
});

test('sharing: an update lists only what is newly revealed, and can be reverted instead', async () => {
  const original = setNote(draft('Golden Hour', [farm]), 'c:Aldor Family Farm', 'Old note.');
  const h = createHarness({ documents: { ...base, ...published('a', original) } });
  // Draft edits since publishing: one more spot, with a note.
  h.documents.set('lists/a', setNote(addSpot(h.documents.get('lists/a'), maan), 'c:Maan Farms', 'Get the corn.'));
  const sheet = await mount(h, 'screens/SharingSheet.js', { params: { listId: 'a' } });
  const shown = sheet.texts().join(' | ');
  assert.match(shown, /Changes not public yet/);
  assert.match(shown, /Maan Farms: Get the corn\./);
  assert.doesNotMatch(shown, /Old note/, 'what is already public is not listed again');
  assert.equal(h.documents.get('publicLists/a').spotCount, 1);

  await sheet.press('Update public list');
  const copy = h.documents.get('publicLists/a');
  assert.deepEqual([copy.spotCount, copy.publishedAt], [2, 100], 'an update keeps the original publish time');
  assert.doesNotMatch(sheet.texts().join(' | '), /Changes not public yet/);

  h.documents.set('lists/a', addSpot(h.documents.get('lists/a'), steps));
  const again = await mount(h, 'screens/SharingSheet.js', { params: { listId: 'a' } });
  await again.press('Revert to public version');
  assert.deepEqual(h.documents.get('lists/a').items.map(item => item.spot.name), ['Aldor Family Farm', 'Maan Farms']);
  assert.doesNotMatch(again.texts().join(' | '), /Changes not public yet/);
});

test('sharing: making a list private asks first, then removes the public copy and keeps the list', async () => {
  const h = createHarness({ documents: { ...base, ...published('a', draft('Golden Hour', [farm])) } });
  const sheet = await mount(h, 'screens/SharingSheet.js', { params: { listId: 'a' } });
  await sheet.press('Make private');
  assert.deepEqual(h.navigations.at(-1), ['Sharing', { listId: 'a', confirmPrivate: true }]);
  const confirm = await mount(h, 'screens/SharingSheet.js', { params: h.navigations.at(-1)[1] });
  assert.match(confirm.texts().join(' | '), /The link stops working and it leaves followers’ libraries\./);
  assert.ok(h.documents.has('publicLists/a'), 'asking is not doing');
  await confirm.press('Keep it public');
  assert.deepEqual(h.navigations.at(-1), ['Sharing', { listId: 'a' }]);

  await confirm.press('Make private');
  assert.equal(h.documents.has('publicLists/a'), false);
  const kept = h.documents.get('lists/a');
  assert.deepEqual([kept.public, kept.publishedAt, kept.items.length], [false, null, 1]);
  assert.ok(h.calls.some(([name]) => name === 'goBack'));
});

test('sharing: a failed publish says so and changes nothing', async () => {
  const h = createHarness({ documents: { ...base, 'lists/a': draft('Golden Hour', [farm]) }, writeError: 'unavailable' });
  // The favourites document is already migrated, so the only write attempted is the publish.
  const sheet = await mount(h, 'screens/SharingSheet.js', { params: { listId: 'a' } });
  await quiet(() => sheet.press('Make public'));
  assert.ok(sheet.texts().includes('Couldn’t save. Check your connection.'));
  assert.equal(h.documents.has('publicLists/a'), false);
});

// ---------------------------------------------------------------- Owner's list page

test('owner page: the sharing pill opens the sheet; a plain change updates in one tap, a revealing one is reviewed', async () => {
  const h = createHarness({ documents: { ...base, ...published('a', draft('Golden Hour', [farm])) } });
  const screen = await mount(h, 'screens/ListScreen.js', { params: { listId: 'a' } });
  assert.equal(screen.button('Update public list'), undefined, 'nothing pending yet');
  await screen.press('Public list, change sharing');
  assert.deepEqual(h.navigations.at(-1), ['Sharing', { listId: 'a' }]);

  // Add a catalogue spot: nothing personal, so Update publishes straight away.
  await act(async () => { await h.load('services/lists.js').mutateList('a', list => addSpot(list, maan)); });
  await flush();
  assert.ok(screen.texts().includes('Changes not public yet'));
  await screen.press('Update public list');
  assert.equal(h.documents.get('publicLists/a').spotCount, 2);
  assert.deepEqual(screen.snackbar(), ['Public list updated']);
  assert.equal(screen.button('Update public list'), undefined);

  // Add a note: that is new personal text, so the review opens instead.
  await act(async () => { await h.load('services/lists.js').mutateList('a', list => setNote(list, 'c:Maan Farms', 'Get the corn.')); });
  await flush();
  const before = h.navigations.length;
  await screen.press('Update public list');
  assert.deepEqual(h.navigations.at(-1), ['Sharing', { listId: 'a' }]);
  assert.equal(h.navigations.length, before + 1);
  assert.equal(h.documents.get('publicLists/a').items[1].note, '', 'the note is not public until reviewed');

  await screen.press('More options');
  assert.deepEqual(h.menus.at(-1).options, ['Edit spots', 'List details', 'Share link', 'Delete list', 'Cancel']);
});

// ---------------------------------------------------------------- Visitor's list page

const mayaList = () => someoneElse('Golden Hour', [farm, mayaSteps], 'maya-uid', 'maya');
const visit = async (extraDocuments = {}) => {
  const h = createHarness({ documents: { ...base, 'publicLists/m': { ...mayaList(), description: 'Last light.' }, ...extraDocuments } });
  const screen = await mount(h, 'screens/ListScreen.js', { params: { listId: 'm' } });
  return { h, screen };
};

test('visitor page: shows who made it and its spots, with no way to edit', async () => {
  const { h, screen } = await visit();
  assert.deepEqual(screen.texts().slice(0, 5), ['Golden Hour', 'M', 'by maya', 'Vancouver · 2 spots', 'Last light.']);
  for (const label of ['Add a spot', 'Private list, change sharing', 'Public list, change sharing', 'Move Aldor Family Farm up']) {
    assert.equal(screen.button(label), undefined, label);
  }
  await act(async () => screen.button('View details for Aldor Family Farm').props.onLongPress?.());
  assert.equal(screen.button('Done'), undefined, 'a long press does not start editing someone else\'s list');

  await screen.press('View details for Waterfront steps');
  assert.deepEqual(h.navigations.at(-1), ['SpotDetailScreen', { spot: { k: 'x', id: mayaSteps.id, owner: mayaSteps.owner, name: mayaSteps.name }, sourceListId: 'm' }]);
  await screen.press('Share link');
  assert.deepEqual(h.calls.at(-1), ['share', { message: '“Golden Hour”, a SznLuv list by maya\nsznluv://list/m' }]);
});

test('visitor page: follow and unfollow, each naming where the list now lives', async () => {
  const { h, screen } = await visit();
  assert.equal(screen.button('Follow list').props.accessibilityState.selected, false);
  await screen.press('Follow list');
  const pointer = h.documents.get('users/audit/followedLists/m');
  assert.deepEqual([pointer.ownerUid, pointer.ownerUsername, pointer.title, pointer.publishedAt], ['maya-uid', 'maya', 'Golden Hour', 100]);
  assert.deepEqual(screen.snackbar(), ['Following. It’s in Favourites › Following.']);
  assert.ok(h.calls.some(([name]) => name === 'selectionHaptic'));

  await screen.press('Following list. Unfollow');
  assert.equal(h.documents.has('users/audit/followedLists/m'), false);
  assert.deepEqual(screen.snackbar(), ['Unfollowed', 'Undo']);
  await screen.press('Undo');
  assert.ok(h.documents.has('users/audit/followedLists/m'));
});

test('visitor page: opening a followed list clears its Updated mark; a failed follow is put back', async () => {
  const pointer = { ownerUid: 'maya-uid', ownerUsername: 'maya', title: 'Golden Hour', publishedAt: 100, followedAt: 5, lastOpenedAt: 5 };
  const { h, screen } = await visit({ 'users/audit/followedLists/m': pointer });
  assert.ok(screen.button('Following list. Unfollow'));
  assert.ok(h.documents.get('users/audit/followedLists/m').lastOpenedAt > 5);

  const failing = createHarness({ documents: { ...base, 'publicLists/m': mayaList() }, writeError: 'unavailable' });
  const broken = await mount(failing, 'screens/ListScreen.js', { params: { listId: 'm' } });
  await quiet(() => broken.press('Follow list'));
  assert.ok(broken.button('Follow list'), 'the button goes back');
  assert.deepEqual(broken.snackbar(), ['Couldn’t save. Check your connection.']);
});

test('visitor page: the heart saves to the visitor\'s own Saved, linking someone else\'s spot; the menu reports', async () => {
  const { h, screen } = await visit();
  await screen.press('Save Aldor Family Farm');
  assert.equal(h.documents.get('favourites/audit')['Aldor Family Farm'].season, 'Fall');
  await screen.press('Save Waterfront steps');
  const saved = h.documents.get('favourites/audit')['x:maya-uid_steps1'];
  assert.deepEqual([saved.isFavourite, saved.owner, saved.name, 'lat' in saved], [true, 'maya-uid', 'Waterfront steps', false],
    'only the name and owner are kept: where it is stays Maya\'s to share');
  await screen.press('Add to list');
  assert.deepEqual(h.navigations.at(-1), ['AddToList', { spot: { k: 'x', id: mayaSteps.id, owner: mayaSteps.owner, name: mayaSteps.name }, sourceListId: 'm' }]);

  await screen.press('More options');
  assert.deepEqual(h.menus.at(-1).options, ['Report list', 'Block maya', 'Cancel']);
  await act(async () => h.menus.at(-1).pick('Report list'));
  assert.deepEqual(h.navigations.at(-1), ['Report', { targetType: 'list', targetId: 'm', ownerUid: 'maya-uid', name: 'Golden Hour' }]);
});

test('visitor page: a private or missing list shows one neutral page with a way back to Explore', async () => {
  const h = createHarness({ documents: { ...base, 'lists/secret': { ...draft('Secret plans', [farm]), ownerUid: 'maya-uid' } } });
  for (const listId of ['secret', 'never-existed']) {
    const screen = await mount(h, 'screens/ListScreen.js', { params: { listId } });
    assert.deepEqual(screen.texts(), ['This list isn’t available', 'It may have been made private or removed.', 'Back to Explore']);
    await screen.press('Back to Explore');
    assert.deepEqual(h.navigations.at(-1), ['ExploreTab', { screen: 'Explore' }]);
  }
});

// ---------------------------------------------------------------- Report

test('report: needs a reason, sends once, and thanks', async () => {
  const h = createHarness({ documents: base });
  const sheet = await mount(h, 'screens/ReportSheet.js', { params: { targetType: 'list', targetId: 'm', ownerUid: 'maya-uid', name: 'Golden Hour' } });
  assert.ok(sheet.texts().includes('What’s wrong with “Golden Hour”?'));
  assert.equal(sheet.button('Send report').props.disabled, true);
  await sheet.press('Private information');
  await sheet.press('Send report');
  const report = h.documents.get('reports/audit');
  assert.deepEqual([report.reporterUid, report.targetType, report.targetId, report.ownerUid, report.reason],
    ['audit', 'list', 'm', 'maya-uid', 'Private information']);
  assert.ok(sheet.texts().includes('Thanks. We’ll take a look.'));
  await sheet.press('Done');
  assert.ok(h.calls.some(([name]) => name === 'goBack'));
});

// ---------------------------------------------------------------- Explore

const exploreDocuments = () => ({
  ...base,
  'users/audit': { username: 'audit', blocked: ['troll-uid'] },
  'publicLists/old': someoneElse('Farm days', [maan], 'alex-uid', 'alex', 10),
  'publicLists/new': someoneElse('Golden Hour', [farm], 'maya-uid', 'maya', 30),
  'publicLists/mine': publicCopy(draft('My own golden list', [farm]), 'audit', 40),
  'publicLists/spam': someoneElse('Golden spam', [farm], 'troll-uid', 'troll', 50),
});
const cards = screen => screen.all('TouchableOpacity').map(node => node.props.accessibilityLabel).filter(label => / by /.test(label ?? ''));

test('explore: shows the newest lists from other people, never your own or a blocked person\'s', async () => {
  const h = createHarness({ documents: exploreDocuments() });
  const screen = await mount(h, 'screens/ExploreScreen.js');
  assert.deepEqual(screen.texts().slice(0, 3), ['Explore', 'For you', 'Following']);
  assert.ok(screen.texts().includes('New in Vancouver'));
  // With no follows yet, the featured list is simply the newest; it isn't repeated in the grid.
  assert.deepEqual(cards(screen), ['Featured: Golden Hour, 1 spot, by maya', 'Farm days, 1 spot, by alex']);
  await screen.press('Featured: Golden Hour, 1 spot, by maya');
  assert.deepEqual(h.navigations.at(-1), ['ListScreen', { listId: 'new' }]);
});

test('explore: search waits for a pause, matches title, creator, spot and town, and can come up empty', async t => {
  const h = createHarness({ documents: exploreDocuments() });
  const screen = await mount(h, 'screens/ExploreScreen.js');
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const type = async text => {
    await act(async () => screen.all('TextInput')[0].props.onChangeText(text));
    await act(async () => { t.mock.timers.tick(300); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  };

  await act(async () => screen.all('TextInput')[0].props.onChangeText('gold'));
  assert.deepEqual(cards(screen), ['Featured: Golden Hour, 1 spot, by maya', 'Farm days, 1 spot, by alex'], 'nothing changes mid-typing');
  await act(async () => { t.mock.timers.tick(300); });
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  assert.deepEqual(cards(screen), ['Golden Hour, 1 spot, by maya']);
  assert.ok(screen.texts().includes('1 list'));

  await type('alex');
  assert.deepEqual(cards(screen), ['Farm days, 1 spot, by alex']);
  await type('langley');
  assert.deepEqual(cards(screen), ['Golden Hour, 1 spot, by maya', 'Farm days, 1 spot, by alex'].filter(label => label.startsWith('Golden')));
  await type('zebra');
  assert.ok(screen.texts().includes('Nothing for “zebra”'));
  await act(async () => screen.button('Clear search').props.onPress());
  assert.equal(screen.all('TextInput')[0].props.value, '');
  assert.equal(cards(screen).length, 2, 'back to the newest lists');
});

test('explore: with no public lists it invites the first one; a failed load can be retried', async () => {
  const h = createHarness({ documents: base });
  const screen = await mount(h, 'screens/ExploreScreen.js');
  assert.ok(screen.texts().includes('No lists yet') && screen.texts().includes('Yours could be the first.'));
  await screen.press('Make a list');
  assert.deepEqual(h.navigations.at(-1), ['FavouritesTab', { screen: 'Favourites', params: { segment: 'lists' } }]);

  const failing = createHarness({ documents: base, readError: 'unavailable' });
  await quiet(async () => {
    const broken = await mount(failing, 'screens/ExploreScreen.js');
    assert.ok(broken.texts().includes('Couldn’t load lists'));
    assert.ok(broken.button('Try again'));
  });
});

test('explore: loads twenty at a time', async () => {
  const many = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [
    `publicLists/l${i}`, someoneElse(`List ${String(i).padStart(2, '0')}`, [farm], 'maya-uid', 'maya', 100 + i),
  ]));
  const h = createHarness({ documents: { ...base, ...many } });
  const screen = await mount(h, 'screens/ExploreScreen.js');
  assert.equal(cards(screen).length, 20);
  assert.deepEqual(cards(screen).slice(0, 2), ['Featured: List 24, 1 spot, by maya', 'List 23, 1 spot, by maya']);
  await screen.press('Load more');
  assert.equal(cards(screen).length, 25);
  assert.equal(screen.button('Load more'), undefined);
});

test('explore: the most followed list is featured; season chips filter the rest; the sort sheet orders by followers', async () => {
  const rink = catalogueRef('Glacier Rink');
  const h = createHarness({
    documents: {
      ...base,
      'publicLists/fall1': { ...someoneElse('Pumpkin picks', [farm, maan], 'alex-uid', 'alex', 10), followerCount: 9 },
      'publicLists/fall2': { ...someoneElse('Orchard day', [maan], 'maya-uid', 'maya', 20), followerCount: 1 },
      'publicLists/winter': { ...someoneElse('Skate night', [rink], 'maya-uid', 'maya', 30), followerCount: 4 },
    },
  });
  const screen = await mount(h, 'screens/ExploreScreen.js');
  assert.deepEqual(cards(screen), ['Featured: Pumpkin picks, 2 spots, by alex', 'Skate night, 1 spot, by maya', 'Orchard day, 1 spot, by maya']);

  await screen.press('Winter');
  assert.deepEqual(screen.button('Winter').props.accessibilityState, { selected: true });
  assert.deepEqual(cards(screen), ['Skate night, 1 spot, by maya'], 'no featured card outside For you');
  await screen.press('Spring');
  assert.ok(screen.texts().includes('No spring lists yet'));
  await screen.press('Fall');
  assert.deepEqual(cards(screen), ['Orchard day, 1 spot, by maya', 'Pumpkin picks, 2 spots, by alex']);

  await screen.press('For you');
  await screen.press('Sort lists');
  await screen.press('Most followed');
  await screen.press('Apply');
  assert.ok(screen.texts().includes('Most followed'));
  assert.deepEqual(cards(screen), ['Featured: Pumpkin picks, 2 spots, by alex', 'Skate night, 1 spot, by maya', 'Orchard day, 1 spot, by maya']);
  assert.equal(screen.button('Load more'), undefined);
});

test('explore: the heart on a card follows and unfollows the list, and puts itself back if saving fails', async () => {
  const h = createHarness({ documents: exploreDocuments() });
  const screen = await mount(h, 'screens/ExploreScreen.js');
  await screen.press('Follow Farm days');
  assert.equal(h.documents.get('users/audit/followedLists/old').title, 'Farm days');
  assert.equal(h.documents.get('publicLists/old').followerCount, 1);
  assert.deepEqual(screen.button('Unfollow Farm days').props.accessibilityState, { selected: true });
  assert.deepEqual(screen.snackbar(), ['Following. It’s in Favourites › Following.']);

  await screen.press('Unfollow Farm days');
  assert.equal(h.documents.has('users/audit/followedLists/old'), false);
  assert.equal(h.documents.get('publicLists/old').followerCount, 0);
  assert.ok(screen.button('Follow Farm days'));

  const options = { documents: exploreDocuments() };
  const failing = createHarness(options);
  const broken = await mount(failing, 'screens/ExploreScreen.js');
  options.writeError = 'unavailable';
  await quiet(() => broken.press('Follow Golden Hour'));
  assert.ok(broken.button('Follow Golden Hour'), 'the heart goes back to empty');
  assert.equal(failing.documents.has('users/audit/followedLists/new'), false);
  assert.deepEqual(broken.snackbar(), ['Couldn’t save. Check your connection.']);
});

test('explore: pulling down reloads the page, keeps what it showed if that fails, and re-runs a search', async t => {
  const options = { documents: exploreDocuments() };
  const h = createHarness(options);
  const screen = await mount(h, 'screens/ExploreScreen.js');
  // The page's ScrollView carries it as a prop, the way pull to refresh is attached in React Native.
  const refresh = () => screen.all('ScrollView')[0].props.refreshControl;
  const pull = async () => { await act(async () => { await refresh().props.onRefresh(); }); await flush(); };
  assert.equal(refresh().props.refreshing, false);

  h.documents.set('publicLists/fresh', someoneElse('Fresh picks', [farm], 'alex-uid', 'alex', 60));
  await pull();
  assert.deepEqual(cards(screen), ['Featured: Fresh picks, 1 spot, by alex', 'Golden Hour, 1 spot, by maya', 'Farm days, 1 spot, by alex']);
  assert.equal(refresh().props.refreshing, false);

  options.readError = 'unavailable';
  await quiet(pull);
  assert.equal(cards(screen).length, 3, 'the lists already shown stay');
  assert.deepEqual(screen.snackbar(), ['Couldn’t refresh. Check your connection.']);
  delete options.readError;

  t.mock.timers.enable({ apis: ['setTimeout'] });
  await act(async () => screen.all('TextInput')[0].props.onChangeText('fresh'));
  await act(async () => { t.mock.timers.tick(300); });
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  t.mock.timers.reset();
  assert.deepEqual(cards(screen), ['Fresh picks, 1 spot, by alex']);
  h.documents.set('publicLists/fresher', someoneElse('Fresh air', [farm], 'maya-uid', 'maya', 70));
  await pull();
  assert.deepEqual(cards(screen).sort(), ['Fresh air, 1 spot, by maya', 'Fresh picks, 1 spot, by alex']);
});

// ---------------------------------------------------------------- Library: Following

test('following: shows followed lists, marks updated ones, and drops ones no longer shared', async () => {
  const pointer = (title, extra = {}) => ({ ownerUid: 'maya-uid', ownerUsername: 'maya', title, publishedAt: 100, followedAt: 5, lastOpenedAt: 200, ...extra });
  const h = createHarness({
    documents: {
      ...base,
      'publicLists/seen': someoneElse('Golden Hour', [farm], 'maya-uid', 'maya', 100),
      'publicLists/changed': { ...someoneElse('Slow Sundays', [farm, maan], 'maya-uid', 'maya', 100), updatedAt: 900 },
      'publicLists/republished': someoneElse('Came back', [farm], 'maya-uid', 'maya', 500),
      'users/audit/followedLists/seen': pointer('Golden Hour', { followedAt: 9 }),
      'users/audit/followedLists/changed': pointer('Slow Sundays', { followedAt: 8 }),
      'users/audit/followedLists/gone': pointer('Withdrawn list'),
      'users/audit/followedLists/republished': pointer('Came back'),
    },
  });
  const screen = await mount(h, 'screens/Favourites.js', { params: { segment: 'following' } });
  const tiles = screen.all('TouchableOpacity').map(node => node.props.accessibilityLabel).filter(label => /by maya/.test(label ?? ''));
  assert.deepEqual(tiles, ['Golden Hour, 1 spot, by maya', 'Slow Sundays, 2 spots, by maya, Updated']);
  const notices = screen.texts().filter(line => line.includes('no longer shared'));
  assert.deepEqual(notices.sort(), ['“Came back” is no longer shared.', '“Withdrawn list” is no longer shared.']);
  assert.equal(h.documents.has('users/audit/followedLists/gone'), false);
  assert.equal(h.documents.has('users/audit/followedLists/republished'), false, 'a list made private and public again has to be followed again');
  assert.ok(h.documents.has('users/audit/followedLists/seen'));

  await screen.press('Slow Sundays, 2 spots, by maya, Updated');
  assert.deepEqual(h.navigations.at(-1), ['ListScreen', { listId: 'changed' }]);
});

test('following: nothing followed yet points to Explore', async () => {
  const h = createHarness({ documents: base });
  const screen = await mount(h, 'screens/Favourites.js', { params: { segment: 'following' } });
  assert.ok(screen.texts().includes('Not following any lists yet'));
  await screen.press('Explore lists');
  assert.deepEqual(h.navigations.at(-1), ['ExploreTab', { screen: 'Explore' }]);
});
