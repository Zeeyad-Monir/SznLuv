// Profiles, Top 4, following people, blocking, people in Explore, the Vancouver teaser and the list map.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, act } = require('./renderHarness.cjs');
const { mount, quiet, flush } = require('./support.cjs');
const { catalogueRef } = require('../services/catalogue');
const { createList, addSpot, toPublicSnapshot } = require('../services/listsState');

const farm = catalogueRef('Aldor Family Farm');
const maan = catalogueRef('Maan Farms');
const rink = catalogueRef('Glacier Rink');
const steps = { k: 'x', id: 'steps1', name: 'Waterfront steps', lat: 49.28651, lng: -123.112 };
const base = { 'users/audit': { username: 'audit' }, 'favourites/audit': { listsMigratedAt: 1 } };
const draft = (title, refs = [], ownerUid = 'audit') => refs.reduce((list, ref) => addSpot(list, ref), createList({ ownerUid, title, now: 1 }));
const publicCopy = (title, refs, ownerUid, ownerUsername, now = 100) => toPublicSnapshot(draft(title, refs, ownerUid), { ownerUsername, now });
const maya = {
  'profiles/maya-uid': { username: 'maya', avatarColor: '#A7C8FF', bio: 'Long evenings.', top4: { vancouver: [farm, steps] } },
  'publicLists/m1': publicCopy('Golden Hour', [farm, maan], 'maya-uid', 'maya', 100),
  'publicLists/m2': publicCopy('Slow Sundays', [maan], 'maya-uid', 'maya', 200),
};
const labels = screen => screen.all('TouchableOpacity').map(node => node.props.accessibilityLabel).filter(Boolean);

// ---------------------------------------------------------------- Publish -> search, end to end

test('a list made public by one person is found by another in Explore search, and stops being found once private', async t => {
  // One shared database, two signed-in people.
  const h = createHarness({ documents: { ...base, 'users/viewer': { username: 'viewer' }, 'lists/a': draft('Rainy day plans', [farm, maan]) } });
  const viewer = { user: { uid: 'viewer', email: 'viewer@example.com' }, username: 'viewer' };
  const find = async text => {
    const explore = await mount(h, 'screens/ExploreScreen.js', viewer);
    t.mock.timers.enable({ apis: ['setTimeout'] });
    await act(async () => explore.all('TextInput')[0].props.onChangeText(text));
    await act(async () => { t.mock.timers.tick(300); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    t.mock.timers.reset();
    const found = labels(explore).filter(label => / by |, profile/.test(label));
    await act(async () => explore.renderer.unmount());
    return found;
  };

  assert.deepEqual(await find('rainy'), [], 'a private list is not searchable');
  const sheet = await mount(h, 'screens/SharingSheet.js', { params: { listId: 'a' } });
  await sheet.press('Make public');
  assert.ok(h.documents.get('publicLists/a').searchTerms.includes('rainy'));

  assert.deepEqual(await find('rainy'), ['Rainy day plans, by audit · 2 spots'], 'by a word in the title');
  assert.deepEqual(await find('rai'), ['Rainy day plans, by audit · 2 spots'], 'by the start of a word');
  assert.deepEqual(await find('langley'), ['Rainy day plans, by audit · 2 spots'], 'by a spot\'s town');
  assert.deepEqual(await find('audit'), ['audit, profile', 'Rainy day plans, by audit · 2 spots'], 'by creator: the person and their list');

  const confirm = await mount(h, 'screens/SharingSheet.js', { params: { listId: 'a', confirmPrivate: true } });
  await confirm.press('Make private');
  assert.deepEqual(await find('rainy'), [], 'made private again, it is gone from search');
});

// ---------------------------------------------------------------- Own profile and Top 4

test('profile: Top 4 starts as four open slots, fills from the search sheet, and stays private until shown', async () => {
  const h = createHarness({ documents: { ...base, 'lists/a': { ...draft('Mine', [steps]), public: true, publishedAt: 5 } } });
  const screen = await mount(h, 'screens/ProfileScreen.js');
  assert.equal(labels(screen).filter(label => label === 'Add a pick').length, 4);
  assert.ok(screen.texts().includes('Pick up to four favourite spots.'));
  assert.ok(screen.button('Mine, public list, 1 spot'), 'public lists are shown');

  await screen.press('Add a pick');
  await flush();
  assert.equal(screen.all('TouchableOpacity').some(node => (node.props.accessibilityLabel ?? '').includes('Add your own spot')), false);
  await screen.press('Add Aldor Family Farm');
  await screen.press('Add Glacier Rink');
  await screen.press('Add Waterfront steps');
  assert.deepEqual(h.documents.get('users/audit').top4.vancouver.picks, [farm, rink, steps]);
  assert.equal(h.documents.get('users/audit').username, 'audit', 'the rest of the user document is kept');
  assert.equal(h.documents.has('profiles/audit'), false, 'private picks do not create a public profile');
  assert.ok(screen.button('Number 2: Glacier Rink, Winter'));
  assert.equal(labels(screen).filter(label => label === 'Add a pick').length, 1);
});

test('profile: showing Top 4 confirms any place you added yourself, then mirrors only public picks', async () => {
  const h = createHarness({ documents: { ...base, 'users/audit': { username: 'audit', top4: { vancouver: { picks: [farm, steps], public: false } } } } });
  const screen = await mount(h, 'screens/ProfileScreen.js');
  const toggle = () => screen.renderer.root.findByType('Switch');
  assert.equal(toggle().props.value, false);

  await act(async () => { await toggle().props.onValueChange(true); });
  const [title, message, buttons] = h.alerts.at(-1);
  assert.equal(title, 'Show these places?');
  assert.match(message, /Waterfront steps: Dropped pin \(49\.2865, -123\.1120\)/);
  assert.equal(h.documents.has('profiles/audit'), false, 'nothing is public until confirmed');
  await act(async () => { await buttons.find(option => option.text === 'Show').onPress(); });
  await flush();
  assert.deepEqual(h.documents.get('profiles/audit'), { username: 'audit', top4: { vancouver: [farm, steps] } });
  assert.ok(screen.texts().includes('Anyone on SznLuv can see these.'));

  // Reorder and remove from the pick's menu; removing the last pick hides Top 4 again.
  await screen.press('Number 2: Waterfront steps, Dropped pin');
  assert.deepEqual(h.menus.at(-1).options, ['Open', 'Move earlier', 'Remove', 'Cancel']);
  await act(async () => { await h.menus.at(-1).pick('Move earlier'); });
  await flush();
  assert.deepEqual(h.documents.get('profiles/audit').top4.vancouver, [steps, farm]);
  for (const label of ['Number 1: Waterfront steps, Dropped pin', 'Number 1: Aldor Family Farm, Langley · Fall']) {
    await screen.press(label);
    await act(async () => { await h.menus.at(-1).pick('Remove'); });
    await flush();
  }
  assert.deepEqual(h.documents.get('users/audit').top4.vancouver, { picks: [], public: false });
  assert.deepEqual(h.documents.get('profiles/audit').top4, {});

  await screen.press('Settings');
  assert.deepEqual(h.navigations.at(-1), ['Settings']);
});

test('profile: a failed Top 4 change is put back; edit profile saves colour and bio', async () => {
  const failing = createHarness({ documents: { ...base, 'users/audit': { username: 'audit', top4: { vancouver: { picks: [farm], public: false } } } }, writeError: 'unavailable' });
  const broken = await mount(failing, 'screens/ProfileScreen.js');
  await broken.press('Number 1: Aldor Family Farm, Langley · Fall');
  await quiet(async () => { await act(async () => { await failing.menus.at(-1).pick('Remove'); }); await flush(); });
  assert.ok(broken.button('Number 1: Aldor Family Farm, Langley · Fall'));
  assert.deepEqual(broken.snackbar(), ['Couldn’t save. Check your connection.']);

  const h = createHarness({ documents: base });
  const screen = await mount(h, 'screens/ProfileScreen.js');
  await screen.press('Edit profile');
  assert.deepEqual(h.navigations.at(-1), ['EditProfile', { bio: '', avatarColor: null }]);
  const sheet = await mount(h, 'screens/EditProfileSheet.js', { params: h.navigations.at(-1)[1] });
  await act(async () => sheet.all('TextInput')[0].props.onChangeText('  Long evenings. '));
  await sheet.press('Avatar colour 3');
  await sheet.press('Save');
  assert.deepEqual(h.documents.get('profiles/audit'), { username: 'audit', bio: 'Long evenings.', avatarColor: '#A7C8FF' });
});

// ---------------------------------------------------------------- Someone else's profile

test('person: shows their bio, public picks without empty slots, and public lists newest first', async () => {
  const h = createHarness({ documents: { ...base, ...maya } });
  const screen = await mount(h, 'screens/PersonScreen.js', { params: { uid: 'maya-uid' } });
  assert.deepEqual(screen.texts().slice(0, 3), ['M', 'maya', 'Long evenings.']);
  assert.ok(screen.button('Number 1: Aldor Family Farm, Langley · Fall') && screen.button('Number 2: Waterfront steps, Dropped pin'));
  assert.equal(screen.button('Add a pick'), undefined, 'a visitor never sees open slots');
  assert.deepEqual(labels(screen).filter(label => /spots?$/.test(label)), ['Slow Sundays, 1 spot', 'Golden Hour, 2 spots']);

  await screen.press('Number 2: Waterfront steps, Dropped pin');
  assert.deepEqual(h.navigations.at(-1), ['CustomSpotScreen', { spot: steps, addedBy: 'maya' }]);
  await screen.press('Golden Hour, 2 spots');
  assert.deepEqual(h.navigations.at(-1), ['ListScreen', { listId: 'm1' }]);

  // No public picks: the Top 4 section is simply not there.
  h.documents.set('profiles/maya-uid', { username: 'maya' });
  const bare = await mount(h, 'screens/PersonScreen.js', { params: { username: 'maya' } });
  assert.equal(bare.texts().includes('Top 4'), false);
  assert.ok(bare.texts().includes('Lists'));
});

test('person: following is separate from following their lists, and names where to find them', async () => {
  const h = createHarness({ documents: { ...base, ...maya } });
  const screen = await mount(h, 'screens/PersonScreen.js', { params: { uid: 'maya-uid' } });
  await screen.press('Follow maya');
  const pointer = h.documents.get('users/audit/followedPeople/maya-uid');
  assert.deepEqual([pointer.username, pointer.avatarColor], ['maya', '#A7C8FF']);
  assert.deepEqual(screen.snackbar(), ['Following maya. They’re in Favourites › Following.']);
  assert.equal([...h.documents.keys()].some(key => key.startsWith('users/audit/followedLists/')), false);

  await screen.press('Following maya. Unfollow');
  assert.equal(h.documents.has('users/audit/followedPeople/maya-uid'), false);
  await screen.press('Undo');
  assert.ok(h.documents.has('users/audit/followedPeople/maya-uid'));
});

test('person: blocking asks first, unfollows them and their lists, and hides their profile', async () => {
  const h = createHarness({
    documents: {
      ...base, ...maya,
      'users/audit/followedPeople/maya-uid': { username: 'maya', followedAt: 1 },
      'users/audit/followedLists/m1': { ownerUid: 'maya-uid', title: 'Golden Hour', publishedAt: 100, followedAt: 1 },
    },
  });
  const screen = await mount(h, 'screens/PersonScreen.js', { params: { uid: 'maya-uid' } });
  await screen.press('More options');
  assert.deepEqual(h.menus.at(-1).options, ['Report maya', 'Block maya', 'Cancel']);
  await act(async () => h.menus.at(-1).pick('Report maya'));
  assert.deepEqual(h.navigations.at(-1), ['Report', { targetType: 'person', targetId: 'maya-uid', ownerUid: 'maya-uid', name: 'maya' }]);

  await act(async () => h.menus.at(-1).pick('Block maya'));
  const [title, , buttons] = h.alerts.at(-1);
  assert.equal(title, 'Block maya?');
  assert.equal(h.documents.get('users/audit').blocked, undefined, 'asking is not doing');
  await act(async () => { await buttons.find(option => option.text === 'Block').onPress(); });
  await flush();
  assert.deepEqual(h.documents.get('users/audit').blocked, ['maya-uid']);
  assert.equal(h.documents.has('users/audit/followedPeople/maya-uid'), false);
  assert.equal(h.documents.has('users/audit/followedLists/m1'), false);
  assert.ok(h.calls.some(([name]) => name === 'goBack'));

  for (const params of [{ uid: 'maya-uid' }, { username: 'nobody' }]) {
    const gone = await mount(h, 'screens/PersonScreen.js', { params });
    assert.deepEqual(gone.texts(), ['This profile isn’t available', 'Back to Explore']);
  }
});

test('list page: the creator\'s name opens their profile', async () => {
  const h = createHarness({ documents: { ...base, ...maya } });
  const screen = await mount(h, 'screens/ListScreen.js', { params: { listId: 'm1' } });
  await screen.press('By maya. Open profile');
  assert.deepEqual(h.navigations.at(-1), ['PersonScreen', { uid: 'maya-uid' }]);
});

// ---------------------------------------------------------------- Explore and library

test('explore: search finds people by the start of their username; followed people\'s lists lead the page', async t => {
  const h = createHarness({
    documents: {
      ...base, ...maya,
      'profiles/audit': { username: 'audit' },
      'profiles/mason-uid': { username: 'mason' },
      'users/audit/followedPeople/maya-uid': { username: 'maya', followedAt: 1 },
      'publicLists/other': publicCopy('Farm days', [maan], 'alex-uid', 'alex', 300),
    },
  });
  const screen = await mount(h, 'screens/ExploreScreen.js');
  const headings = () => screen.texts().filter(line => ['From people you follow', 'New in Vancouver', 'People'].includes(line));
  assert.deepEqual(headings(), ['From people you follow', 'New in Vancouver']);
  assert.deepEqual(labels(screen).filter(label => / by /.test(label)).slice(0, 2), ['Slow Sundays, by maya · 1 spot', 'Golden Hour, by maya · 2 spots']);

  t.mock.timers.enable({ apis: ['setTimeout'] });
  await act(async () => screen.all('TextInput')[0].props.onChangeText('ma'));
  await act(async () => { t.mock.timers.tick(300); });
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
  assert.deepEqual(labels(screen).filter(label => /, profile$/.test(label)).sort(), ['mason, profile', 'maya, profile']);
  await act(async () => screen.button('maya, profile').props.onPress());
  assert.deepEqual(h.navigations.at(-1), ['PersonScreen', { uid: 'maya-uid' }]);

  await act(async () => screen.all('TextInput')[0].props.onChangeText('aud'));
  await act(async () => { t.mock.timers.tick(300); });
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
  assert.deepEqual(labels(screen).filter(label => /, profile$/.test(label)), [], 'you are not in your own results');
});

test('following: people you follow are listed under the lists and open their profile', async () => {
  const h = createHarness({ documents: { ...base, ...maya, 'users/audit/followedPeople/maya-uid': { username: 'maya', avatarColor: '#A7C8FF', followedAt: 1 } } });
  const screen = await mount(h, 'screens/Favourites.js', { params: { segment: 'following' } });
  assert.deepEqual(screen.texts().filter(line => ['Lists', 'People'].includes(line)), ['Lists', 'People']);
  await screen.press('maya, profile');
  assert.deepEqual(h.navigations.at(-1), ['PersonScreen', { uid: 'maya-uid' }]);

  const empty = await mount(createHarness({ documents: base }), 'screens/Favourites.js', { params: { segment: 'following' } });
  assert.ok(empty.texts().includes('Not following anyone yet'));
  assert.ok(empty.button('Find people'));
});

test('Vancouver page: shows up to three community lists and a way into Explore, or nothing at all', async () => {
  const many = Object.fromEntries([1, 2, 3, 4].map(n => [`publicLists/l${n}`, publicCopy(`List ${n}`, [farm], 'maya-uid', 'maya', 100 + n)]));
  const h = createHarness({ documents: { ...base, ...many, 'publicLists/mine': publicCopy('My own', [farm], 'audit', 'audit', 900) } });
  const screen = await mount(h, 'screens/VancouverScreen.js');
  assert.ok(screen.texts().includes('From the community'));
  assert.deepEqual(labels(screen).filter(label => / by /.test(label)), ['List 4, by maya · 1 spot', 'List 3, by maya · 1 spot', 'List 2, by maya · 1 spot']);
  await screen.press('See all in Explore');
  assert.deepEqual(h.navigations.at(-1), ['ExploreTab', { screen: 'Explore' }]);

  const none = await mount(createHarness({ documents: base }), 'screens/VancouverScreen.js');
  assert.equal(none.texts().includes('From the community'), false);
});

test('Vancouver page: community lists are the three most followed, and a list that gains followers moves in', async () => {
  const counts = { l1: 5, l2: 0, l3: 2, l4: 1 };
  const lists = Object.fromEntries(Object.entries(counts).map(([id, followerCount], n) =>
    [`publicLists/${id}`, { ...publicCopy(`List ${id.slice(1)}`, [farm], 'maya-uid', 'maya', 100 + n), followerCount }]));
  const legacy = publicCopy('No count yet', [farm], 'maya-uid', 'maya', 50); // Published before counts existed
  const elsewhere = { ...publicCopy('Somewhere else', [farm], 'maya-uid', 'maya', 60), cityId: 'toronto', followerCount: 99 };
  const h = createHarness({ documents: { ...base, ...lists, 'publicLists/legacy': legacy, 'publicLists/far': elsewhere } });
  const screen = await mount(h, 'screens/VancouverScreen.js');
  const shown = () => labels(screen).filter(label => / by /.test(label)).map(label => label.split(',')[0]);
  assert.deepEqual(shown(), ['List 1', 'List 3', 'List 4']);

  // Two people follow List 2: it overtakes List 3 and List 4 without leaving the page.
  const follows = h.load('services/follows.js');
  await act(async () => { await follows.followList('sam-uid', { id: 'l2', ...h.documents.get('publicLists/l2') }); });
  await act(async () => { await follows.followList('alex-uid', { id: 'l2', ...h.documents.get('publicLists/l2') }); });
  await act(async () => { await follows.followList('alex-uid', { id: 'l2', ...h.documents.get('publicLists/l2') }); }); // Already following: no change
  assert.equal(h.documents.get('publicLists/l2').followerCount, 2);
  assert.deepEqual(shown(), ['List 1', 'List 3', 'List 2']); // Ties go to the newest

  await act(async () => { await follows.unfollowList('sam-uid', 'l2'); });
  assert.equal(h.documents.get('publicLists/l2').followerCount, 1);
  assert.deepEqual(shown(), ['List 1', 'List 3', 'List 4']);
});

// ---------------------------------------------------------------- Map

test('list page: Spots and Map switch appears only when two or more spots can be mapped', async () => {
  const h = createHarness({ documents: { ...base, ...maya, 'publicLists/one': publicCopy('One place', [farm, rink], 'maya-uid', 'maya') } });
  const screen = await mount(h, 'screens/ListScreen.js', { params: { listId: 'm1' } });
  assert.ok(screen.button('Spots') && screen.button('Map'));
  assert.equal(screen.all('MapView').length, 0);
  await screen.press('Map');
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
  const markers = screen.all('Marker').map(marker => marker.props.title);
  assert.deepEqual(markers, ['1. Aldor Family Farm', '2. Maan Farms']);
  assert.equal(screen.button('View details for Aldor Family Farm'), undefined, 'the cards give way to the map');
  await act(async () => screen.all('Marker')[1].props.onCalloutPress());
  assert.equal(h.navigations.at(-1)[0], 'SpotDetailScreen');
  await screen.press('Spots');
  assert.ok(screen.button('View details for Aldor Family Farm'));

  // Glacier Rink has no coordinates, so only one spot could be drawn: no switch.
  const single = await mount(h, 'screens/ListScreen.js', { params: { listId: 'one' } });
  assert.equal(single.button('Map'), undefined);
});
