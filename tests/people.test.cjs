// Profiles, Top 4, follows, blocking, people in Explore, the Vancouver page and the list map.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { featuredRotation } = require('../services/collections');
const { createHarness, act } = require('./renderHarness.cjs');
const { mount, quiet, flush } = require('./support.cjs');
const { catalogueRef } = require('../services/catalogue');
const { createList, addSpot, toPublicSnapshot } = require('../services/listsState');

const farm = catalogueRef('Aldor Family Farm');
const maan = catalogueRef('Maan Farms');
const rink = catalogueRef('Glacier Rink');
const steps = { k: 'x', id: 'audit_steps1', owner: 'audit', name: 'Waterfront steps', lat: 49.28651, lng: -123.112 };
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

  assert.deepEqual(await find('rainy'), ['Rainy day plans, 2 spots, by audit'], 'by a word in the title');
  assert.deepEqual(await find('rai'), ['Rainy day plans, 2 spots, by audit'], 'by the start of a word');
  assert.deepEqual(await find('langley'), ['Rainy day plans, 2 spots, by audit'], 'by a spot\'s town');
  assert.deepEqual(await find('audit'), ['audit, profile', 'Rainy day plans, 2 spots, by audit'], 'by creator: the person and their list');

  const confirm = await mount(h, 'screens/SharingSheet.js', { params: { listId: 'a', confirmPrivate: true } });
  await confirm.press('Make private');
  assert.deepEqual(await find('rainy'), [], 'made private again, it is gone from search');
});

// ---------------------------------------------------------------- Own profile and Top 4

test('profile: Top 4 starts as four open slots, fills from the search sheet, and stays private until shown', async () => {
  const h = createHarness({ documents: {
    ...base, 'lists/a': { ...draft('Mine', [farm, steps]), public: true, publishedAt: 5 },
    'publicLists/a': publicCopy('Mine', [farm], 'audit', 'audit', 5),
    'spots/audit_steps1': { ownerUid: 'audit', name: 'Waterfront steps', lat: 49.28651, lng: -123.112, photos: [], publicListIds: [], createdAt: 1 },
  } });
  const screen = await mount(h, 'screens/ProfileScreen.js');
  assert.equal(labels(screen).filter(label => label === 'Add a pick').length, 4);
  assert.ok(screen.texts().includes('Pick up to four favourite spots.'));
  assert.equal(screen.button('Share profile'), undefined, 'an unpublished profile cannot be shared');
  assert.ok(screen.button('Mine, 1 spot, by audit'), 'public lists are shown');

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
  assert.ok(screen.button('Share profile'), 'publishing makes the existing username link shareable immediately');

  // Reorder and remove from the pick's menu; removing the last pick hides Top 4 again.
  await screen.press('Number 2: Waterfront steps, Dropped pin');
  assert.deepEqual(h.menus.at(-1).options, ['Open', 'Move earlier', 'Replace', 'Remove', 'Cancel']);
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

  assert.equal(screen.button('Settings'), undefined);
});

test('profile: sharing sends the public username link and leaves private picks unchanged', async () => {
  const h = createHarness({ documents: { ...base,
    'users/audit': { username: 'audit', top4: { vancouver: { picks: [steps], public: false } } },
    'profiles/audit': { username: 'audit', bio: 'Long evenings.' },
  } });
  const owner = await mount(h, 'screens/ProfileScreen.js');
  const before = [...h.documents.entries()];
  await owner.press('Share profile');
  assert.deepEqual(h.calls.find(([name]) => name === 'share'), ['share', { message: '@audit on SznLuv\nsznluv://u/audit' }]);
  assert.deepEqual([...h.documents.entries()], before);
  const self = await mount(h, 'screens/PersonScreen.js', { params: { username: 'audit' } });
  const visitor = await mount(h, 'screens/PersonScreen.js', { params: { username: 'audit' }, user: { uid: 'viewer' } });
  for (const page of [self, visitor]) {
    assert.ok(page.texts().includes('Long evenings.') && page.texts().includes('Public lists'));
    assert.equal(page.texts().includes('Top 4'), false);
    assert.equal(page.button('Edit profile'), undefined);
    assert.equal(page.button('Share profile'), undefined);
    assert.equal(page.button('Add a pick'), undefined);
    assert.equal(page.all('Switch').length, 0);
  }
  assert.equal(self.button('Follow audit'), undefined);
  assert.ok(visitor.button('Follow audit'));
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
  assert.deepEqual(h.navigations.at(-1), ['EditProfile', { bio: '', avatarColor: null, top4Picks: [], top4Public: false }]);
  const sheet = await mount(h, 'screens/EditProfileSheet.js', { params: h.navigations.at(-1)[1] });
  await act(async () => sheet.all('TextInput')[0].props.onChangeText('  Long evenings. '));
  await sheet.press('Avatar colour 3');
  await sheet.press('Save');
  assert.deepEqual(h.documents.get('profiles/audit'), { username: 'audit', bio: 'Long evenings.', avatarColor: '#A7C8FF' });
});

test('edit profile: a full Top 4 can be reordered, swapped and trimmed, and only changes on Save', async () => {
  const cafe = catalogueRef('Krause Berry Farms');
  const h = createHarness({ documents: { ...base,
    'users/audit': { username: 'audit', top4: { vancouver: { picks: [farm, maan, rink, steps], public: true }, brooklyn: { picks: [farm], public: false } } },
    'profiles/audit': { username: 'audit', top4: { vancouver: [farm, maan, rink, steps] } },
  } });
  const screen = await mount(h, 'screens/ProfileScreen.js');
  assert.equal(screen.button('Add a pick'), undefined, 'a full Top 4 has no open slots on the profile');
  await screen.press('Edit profile');
  const params = h.navigations.at(-1)[1];
  assert.deepEqual([params.top4Picks, params.top4Public], [[farm, maan, rink, steps], true]);

  // Closing without saving leaves Top 4 alone.
  const closed = await mount(h, 'screens/EditProfileSheet.js', { params });
  await closed.press('Remove Maan Farms');
  await closed.press('Close Edit profile');
  assert.deepEqual(h.documents.get('users/audit').top4.vancouver.picks, [farm, maan, rink, steps]);

  const sheet = await mount(h, 'screens/EditProfileSheet.js', { params });
  assert.equal(sheet.button('Add a pick'), undefined, 'four picks leave nothing to add');
  assert.equal(sheet.button('Move Aldor Family Farm up'), undefined);
  assert.equal(sheet.button('Move Waterfront steps down'), undefined);
  await sheet.press('Move Glacier Rink up');
  await sheet.press('Replace Aldor Family Farm');
  await flush();
  await sheet.press(`Add ${cafe.name}`);
  await flush();
  await sheet.press('Remove Waterfront steps');
  assert.ok(sheet.button('Add a pick'), 'removing one opens a slot');
  await sheet.press('Save');
  await flush();

  const expected = [cafe, rink, maan];
  assert.deepEqual(h.documents.get('users/audit').top4.vancouver, { picks: expected, public: true });
  assert.deepEqual(h.documents.get('users/audit').top4.brooklyn, { picks: [farm], public: false }, 'another city is untouched');
  assert.deepEqual(h.documents.get('profiles/audit').top4, { vancouver: expected });
  assert.equal(h.alerts.length, 0, 'catalogue spots need no confirm');
});

test('edit profile: adding your own place to a shown Top 4 is confirmed, and removing every pick hides it', async () => {
  const h = createHarness({ documents: { ...base,
    'users/audit': { username: 'audit', top4: { vancouver: { picks: [farm], public: true } } },
    'profiles/audit': { username: 'audit', top4: { vancouver: [farm] } },
    'spots/audit_steps1': { ownerUid: 'audit', name: 'Waterfront steps', lat: 49.28651, lng: -123.112, photos: [], publicListIds: [], createdAt: 1 },
  } });
  const params = { bio: '', avatarColor: null, top4Picks: [farm], top4Public: true };
  const sheet = await mount(h, 'screens/EditProfileSheet.js', { params });
  await sheet.press('Add a pick');
  await flush();
  await sheet.press('Add Waterfront steps');
  await sheet.press('Save');
  const [title, , buttons] = h.alerts.at(-1);
  assert.equal(title, 'Show these places?');
  assert.deepEqual(h.documents.get('profiles/audit').top4, { vancouver: [farm] }, 'nothing changes until confirmed');
  await act(async () => { await buttons.find(option => option.text === 'Show').onPress(); });
  await flush();
  assert.equal(h.documents.get('profiles/audit').top4.vancouver.length, 2);

  const again = await mount(h, 'screens/EditProfileSheet.js', { params });
  await again.press('Remove Aldor Family Farm');
  await again.press('Save');
  await flush();
  assert.deepEqual(h.documents.get('users/audit').top4.vancouver, { picks: [], public: false });
  assert.deepEqual(h.documents.get('profiles/audit').top4, {});
});

// ---------------------------------------------------------------- Someone else's profile

test('person: shows their bio, public picks without empty slots, and public lists newest first', async () => {
  const h = createHarness({ documents: { ...base, ...maya } });
  const screen = await mount(h, 'screens/PersonScreen.js', { params: { uid: 'maya-uid' } });
  assert.deepEqual(screen.texts().slice(0, 3), ['M', 'maya', 'Long evenings.']);
  assert.ok(screen.button('Number 1: Aldor Family Farm, Langley · Fall') && screen.button('Number 2: Waterfront steps, Dropped pin'));
  assert.equal(screen.button('Add a pick'), undefined, 'a visitor never sees open slots');
  assert.deepEqual(labels(screen).filter(label => /spots?, by maya$/.test(label)), ['Slow Sundays, 1 spot, by maya', 'Golden Hour, 2 spots, by maya']);

  await screen.press('Number 2: Waterfront steps, Dropped pin');
  assert.deepEqual(h.navigations.at(-1), ['SpotDetailScreen', { spot: { k: 'x', id: steps.id, owner: steps.owner, name: steps.name } }]);
  await screen.press('Golden Hour, 2 spots, by maya');
  assert.deepEqual(h.navigations.at(-1), ['ListScreen', { listId: 'm1' }]);

  // No public picks: the Top 4 section is simply not there.
  h.documents.set('profiles/maya-uid', { username: 'maya' });
  const bare = await mount(h, 'screens/PersonScreen.js', { params: { username: 'maya' } });
  assert.equal(bare.texts().includes('Top 4'), false);
  assert.ok(bare.texts().includes('Public lists'));
});

const byTestID = (screen, id) => screen.renderer.root.findAll(node => node.props.testID === id && typeof node.type === 'string')[0]
  ?? screen.renderer.root.findAll(node => node.props.testID === id)[0];
const flatStyle = node => Object.assign({}, ...[node.props.style].flat(Infinity).filter(Boolean));
const ancestorWith = (node, test) => { for (let at = node; at; at = at.parent) if (at.props?.style && test(flatStyle(at))) return at; return null; };

test('person: the header shows free stats and a backdrop from their #1 pick, falling back to their colour', async () => {
  const h = createHarness({ documents: { ...base, ...maya, 'publicLists/m1': { ...maya['publicLists/m1'], followerCount: 3 } } });
  const screen = await mount(h, 'screens/PersonScreen.js', { params: { uid: 'maya-uid' } });
  assert.equal(byTestID(screen, 'profile-stats').props.accessibilityLabel, '2 picks, 2 public lists, 3 list follows');
  assert.equal(screen.texts().includes('Top 4'), true);
  const art = byTestID(screen, 'profile-backdrop').findAllByType('Image');
  assert.equal(art.length, 1, 'a Fall #1 pick shows the fall illustration');
  assert.match(String(art[0].props.source), /fall2\.png$/);

  // A #1 pick with no season (a place they added) washes the backdrop in their avatar colour instead.
  h.documents.set('profiles/maya-uid', { ...maya['profiles/maya-uid'], top4: { vancouver: [steps, farm] } });
  const own = await mount(h, 'screens/PersonScreen.js', { params: { uid: 'maya-uid' } });
  const backdrop = byTestID(own, 'profile-backdrop');
  assert.equal(backdrop.findAllByType('Image').length, 0);
  assert.ok(backdrop.findAll(node => flatStyle(node).backgroundColor === '#A7C8FF').length, 'the wash uses their colour');

  // No picks: still the colour wash, and the stats read zero picks.
  h.documents.set('profiles/maya-uid', { username: 'maya', avatarColor: '#A7C8FF' });
  const bare = await mount(h, 'screens/PersonScreen.js', { params: { uid: 'maya-uid' } });
  assert.equal(byTestID(bare, 'profile-backdrop').findAllByType('Image').length, 0);
  assert.match(byTestID(bare, 'profile-stats').props.accessibilityLabel, /^0 picks, /);
});

test('profile: who-can-see-Top-4 is one quiet line with a small switch, and Share is a round glass button', async () => {
  const h = createHarness({ documents: {
    ...base, 'users/audit': { username: 'audit', top4: { vancouver: { picks: [farm, rink], public: true } } },
    'profiles/audit': { username: 'audit', top4: { vancouver: [farm, rink] } },
  } });
  const screen = await mount(h, 'screens/ProfileScreen.js');
  assert.ok(screen.texts().includes('Anyone on SznLuv can see these.'));
  const toggle = screen.renderer.root.findByType('Switch');
  assert.equal(toggle.props.accessibilityLabel, 'Show Top 4 on my profile');
  assert.deepEqual(flatStyle(toggle).transform, [{ scale: 0.75 }], 'a smaller switch');
  assert.equal(ancestorWith(toggle.parent, style => style.backgroundColor === '#FFFFFF' || style.backgroundColor === '#2C2C2C'), null,
    'no card or dark bar around it');
  const share = screen.button('Share profile');
  assert.ok(share);
  assert.ok(ancestorWith(share, style => style.width === 48 && style.height === 48), 'round, 48pt');
  assert.ok(screen.button('Edit profile'));

  // A place with a cover photo shows it; one without keeps its season colour.
  const tileImages = label => screen.button(label).findAllByType('Image').map(node => String(node.props.source));
  assert.equal(tileImages('Number 1: Aldor Family Farm, Langley · Fall').length, 1);
  assert.match(tileImages('Number 1: Aldor Family Farm, Langley · Fall')[0], /FamilyFarm\.jpg$/);
  assert.deepEqual(tileImages('Number 2: Glacier Rink, Winter'), []);
  // The photo is sized to the square tile, so "cover" crops it around the centre instead of showing a corner.
  const photo = flatStyle(screen.button('Number 1: Aldor Family Farm, Langley · Fall').findAllByType('Image')[0]);
  assert.equal(typeof photo.width, 'number');
  assert.equal(photo.width, photo.height);
});

test('profile: with no picks there is only the prompt, no switch', async () => {
  const h = createHarness({ documents: base });
  const screen = await mount(h, 'screens/ProfileScreen.js');
  assert.ok(screen.texts().includes('Pick up to four favourite spots.'));
  assert.equal(screen.all('Switch').length, 0);
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
  assert.deepEqual(headings(), ['New in Vancouver']);
  await screen.press('Following');
  assert.deepEqual(headings(), ['From people you follow']);
  assert.deepEqual(labels(screen).filter(label => / by /.test(label)), ['Slow Sundays, 1 spot, by maya', 'Golden Hour, 2 spots, by maya']);
  // Lists are tiles two to a row, as wide as the Favourites grid and a little shorter than they are wide.
  const tile = screen.renderer.root.findAll(node => node.props.list?.id === 'm1' && node.props.width)[0];
  assert.deepEqual([tile.props.width, tile.props.height], [167, 134]);

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

test('Home: shows the city\'s collections without a community section even when public lists exist', async () => {
  const h = createHarness({ documents: { ...base, ...maya } });
  const screen = await mount(h, 'screens/HomeScreen.js');
  assert.deepEqual(screen.texts(), [
    'What sounds good?',
    ...featuredRotation('vancouver').flatMap(slide => [slide.title, slide.subtitle]),
    'Browse collections',
    'Seasonal', 'Outdoors', 'Unique Food', 'Coming soon', 'Night Out', 'Coming soon', 'All Vancouver spots',
  ]);
  assert.deepEqual(labels(screen), [
    `Featured: ${featuredRotation('vancouver')[0].title}. ${featuredRotation('vancouver')[0].subtitle}`, 'Seasonal collection', 'Outdoors collection', 'All Vancouver spots',
  ]);
  await act(async () => screen.renderer.unmount());
});

test('list follows: public follower count changes once per follower', async () => {
  const list = { id: 'm1', ...maya['publicLists/m1'] };
  const h = createHarness({ documents: { ...base, ...maya } });
  const follows = h.load('services/follows.js');
  await follows.followList('sam-uid', list);
  await follows.followList('alex-uid', list);
  await follows.followList('alex-uid', list);
  assert.equal(h.documents.get('publicLists/m1').followerCount, 2);

  await follows.unfollowList('sam-uid', list.id);
  assert.equal(h.documents.get('publicLists/m1').followerCount, 1);
});

test('explore: Following shows every list from people you follow, hearts mark the ones you follow, and the sort sheet can hide them', async () => {
  const h = createHarness({
    documents: {
      ...base, ...maya,
      'users/audit/followedPeople/maya-uid': { username: 'maya', followedAt: 1 },
      'users/audit/followedLists/m2': { ownerUid: 'maya-uid', title: 'Slow Sundays', publishedAt: 200, followedAt: 1 },
    },
  });
  const screen = await mount(h, 'screens/ExploreScreen.js');
  await screen.press('Following');
  assert.deepEqual(labels(screen).filter(label => / by /.test(label)), ['Slow Sundays, 1 spot, by maya', 'Golden Hour, 2 spots, by maya']);
  assert.deepEqual(screen.button('Unfollow Slow Sundays').props.accessibilityState, { selected: true });
  assert.deepEqual(screen.button('Follow Golden Hour').props.accessibilityState, { selected: false });

  await screen.press('Sort lists');
  await act(async () => screen.all('Switch')[0].props.onValueChange(true));
  await screen.press('Apply');
  assert.deepEqual(labels(screen).filter(label => / by /.test(label)), ['Golden Hour, 2 spots, by maya']);
  assert.ok(screen.button('Sort lists, changed'), 'the sort button shows a change is applied');

  // Following everything they've made leaves a way to show them again.
  const all = createHarness({
    documents: {
      ...base, ...maya,
      'users/audit/followedPeople/maya-uid': { username: 'maya', followedAt: 1 },
      'users/audit/followedLists/m1': { ownerUid: 'maya-uid', title: 'Golden Hour', publishedAt: 100, followedAt: 1 },
      'users/audit/followedLists/m2': { ownerUid: 'maya-uid', title: 'Slow Sundays', publishedAt: 200, followedAt: 1 },
    },
  });
  const everything = await mount(all, 'screens/ExploreScreen.js');
  await everything.press('Following');
  await everything.press('Sort lists');
  await act(async () => everything.all('Switch')[0].props.onValueChange(true));
  await everything.press('Apply');
  assert.ok(everything.texts().includes('You follow every list here'));
  await everything.press('Show them');
  assert.equal(labels(everything).filter(label => / by /.test(label)).length, 2);
});

test('explore: Following with nobody followed points to search', async () => {
  const h = createHarness({ documents: { ...base, ...maya } });
  const screen = await mount(h, 'screens/ExploreScreen.js');
  await screen.press('Following');
  assert.ok(screen.texts().includes('Not following anyone yet'));
  assert.ok(screen.button('Find people'));
});

// ---------------------------------------------------------------- Map

test('list page: Spots and Map handle zero, one and multiple pins in spot order', async () => {
  const h = createHarness({ documents: {
    ...base, ...maya,
    'publicLists/one': publicCopy('One pin', [rink, farm], 'maya-uid', 'maya'),
    'publicLists/zero': publicCopy('No pins', [rink], 'maya-uid', 'maya'),
  } });
  const open = listId => mount(h, 'screens/ListScreen.js', { params: { listId } });
  const screen = await open('m1');
  assert.equal(screen.button('Spots').props.accessibilityState.selected, true);
  assert.equal(screen.all('MapView').length, 0);
  await screen.press('Map');
  assert.equal(screen.button('Map').props.accessibilityState.selected, true);
  const map = screen.all('MapView')[0];
  await act(async () => { map.props.onLayout(); map.props.onMapReady(); });
  assert.equal(h.calls.find(([name]) => name === 'fitToCoordinates')[1].length, 2);
  assert.deepEqual(screen.all('Marker').map(marker => marker.props.title), [farm.name, maan.name]);
  await act(async () => screen.all('Marker')[1].props.onPress());
  const opened = h.navigations.at(-1);
  assert.deepEqual(opened, ['SpotDetailScreen', { spot: maan, sourceListId: 'm1' }]);
  await screen.press('Map spot 2, Maan Farms');
  assert.deepEqual(h.navigations.at(-1), opened);
  await screen.press('Spots');
  await screen.press('View details for Maan Farms');
  assert.deepEqual(h.navigations.at(-1), opened);
  await act(async () => screen.renderer.unmount());

  const single = await open('one');
  await single.press('Map');
  assert.ok(single.texts().includes('1 of 2 spots on the map'));
  assert.ok(single.button('Map spot 2, Aldor Family Farm'), 'number matches the card position');
  assert.equal(single.all('MapView')[0].props.initialRegion.latitude, single.all('Marker')[0].props.coordinate.latitude);
  await act(async () => single.renderer.unmount());

  const zero = await open('zero');
  await zero.press('Map');
  assert.equal(zero.all('MapView').length, 0);
  assert.ok(zero.texts().includes('No locations to map'));
  await zero.press('Back to Spots');
  assert.ok(zero.button('View details for Glacier Rink'));
  await act(async () => zero.renderer.unmount());
});

test('owner Map survives edit mode and uses live private coordinates', async () => {
  const h = createHarness({ documents: {
    ...base, 'lists/a': draft('Mine', [steps]),
    'spots/audit_steps1': { ownerUid: 'audit', name: steps.name, lat: 49.4, lng: -123.4, publicListIds: [] },
  } });
  const screen = await mount(h, 'screens/ListScreen.js', { params: { listId: 'a' } });
  await screen.press('Map');
  assert.deepEqual(screen.all('Marker')[0].props.coordinate, { latitude: 49.4, longitude: -123.4 });
  await screen.press('More options');
  await act(async () => h.menus.at(-1).pick('Edit spots'));
  assert.equal(screen.button('Map'), undefined);
  assert.ok(screen.button('Remove Waterfront steps'));
  await screen.press('Done');
  assert.equal(screen.button('Map').props.accessibilityState.selected, true);
  await act(async () => screen.renderer.unmount());
});

test('a visitor’s open map follows publication and withdrawal without using the draft', async () => {
  const h = createHarness({ documents: {
    ...base, 'users/viewer': { username: 'viewer' },
    'lists/a': draft('Weekend', [farm]),
    'spots/audit_steps1': { ownerUid: 'audit', name: steps.name, lat: steps.lat, lng: steps.lng, publicListIds: [], photos: [] },
  } });
  const lists = h.load('services/lists.js');
  await lists.publishList('audit', 'audit', 'a');
  const owner = await mount(h, 'screens/ListScreen.js', { params: { listId: 'a' } });
  const visitor = await mount(h, 'screens/ListScreen.js', {
    user: { uid: 'viewer' }, username: 'viewer', params: { listId: 'a', from: 'link' },
  });
  await owner.press('Map');
  await visitor.press('Map');
  await act(async () => lists.mutateList('a', list => addSpot(list, steps)));
  assert.equal(owner.all('Marker').length, 2);
  assert.equal(visitor.all('Marker').length, 1);
  await act(async () => lists.publishList('audit', 'audit', 'a'));
  assert.equal(visitor.all('Marker').length, 2);
  await act(async () => lists.unpublishList('a'));
  assert.equal(visitor.all('Marker').length, 0);
  assert.ok(visitor.texts().includes('This list isn’t available'));
  assert.equal(owner.all('Marker').length, 2, 'the owner still has their draft');
  await act(async () => { owner.renderer.unmount(); visitor.renderer.unmount(); });
});
