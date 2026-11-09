const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createHarness, act } = require('./renderHarness.cjs');
const { detailedFallSpots, fallSpotNames, fallCategories } = require('../services/spots');

for (const screen of ['LoginScreen', 'SignUpScreen', 'HomeScreen', 'VancouverScreen', 'SeasonsScreen', 'FallDatesScreen', 'WinterDatesScreen', 'SpringDatesScreen', 'SummerDatesScreen', 'Favourites', 'SeasonalFavourites', 'CustomCollectionScreen', 'SpinTheWheel', 'ProfileSettings', 'AldorFamilyFarmScreen', 'LaityPumpkinPatch', 'EagleAcresDairy']) {
  test(`${screen} renders with an authenticated test profile`, async () => {
    const h = createHarness();
    const renderer = await h.render('screens/' + screen + '.js');
    assert.ok(renderer.toJSON());
    await act(async () => renderer.unmount());
  });
}
test('home hierarchy: Home > Vancouver > Seasons > the four season screens', async () => {
  async function pressCards(file) {
    const h = createHarness();
    const renderer = await h.render('screens/' + file + '.js');
    const cards = renderer.root.findAllByType('TouchableOpacity').filter(node => node.props.accessibilityLabel?.includes(' - View '));
    const results = {};
    for (const card of cards) {
      h.navigations.length = 0;
      await act(async () => card.props.onPress());
      results[card.props.accessibilityLabel] = h.navigations.at(-1);
    }
    await act(async () => renderer.unmount());
    return results;
  }
  assert.deepEqual(await pressCards('HomeScreen'), { 'Vancouver - View Vancouver': ['VancouverScreen'] });
  assert.deepEqual(await pressCards('VancouverScreen'), { 'Seasons - View Seasons': ['SeasonsScreen'] });
  assert.deepEqual(await pressCards('SeasonsScreen'), {
    'Fall Season - View Active Date Ideas': ['FallDatesScreen'],
    'Winter Season - View Active Date Ideas': ['WinterDatesScreen'],
    'Spring Season - View Active Date Ideas': ['SpringDatesScreen'],
    'Summer Season - View Active Date Ideas': ['SummerDatesScreen'],
  });
});
for (const screen of ['AldorFamilyFarmScreen', 'LaityPumpkinPatch', 'EagleAcresDairy']) {
  test(`${screen} handles denied location without starting tracking`, async () => {
    const h = createHarness();
    const renderer = await h.render('screens/' + screen + '.js', { location: true });
    assert.ok(!h.calls.some(([name]) => name === 'watchLocation'));
    assert.match(JSON.stringify(renderer.toJSON()), /denied/i);
    await act(async () => renderer.unmount());
  });
}
test('login normalizes email and explains the real invalid-credential error', async () => {
  const h = createHarness({ loginError: 'auth/invalid-credential' });
  const renderer = await h.render('screens/LoginScreen.js');
  const inputs = renderer.root.findAllByType('TextInput');
  await act(async () => { inputs[0].props.onChangeText('  Audit@EXAMPLE.COM '); inputs[1].props.onChangeText('WrongPass99'); });
  const button = renderer.root.findAllByType('TouchableOpacity').find(node => node.props.accessibilityLabel === 'Login');
  await act(async () => button.props.onPress());
  assert.deepEqual(h.calls.find(([name]) => name === 'login'), ['login', 'audit@example.com', 'WrongPass99']);
  assert.ok(h.alerts.some(([title, message]) => title === 'Login Failed' && /email or password is incorrect/.test(message)));
  await act(async () => renderer.unmount());
});
test('signup blocks duplicate submissions and stays pending through profile provisioning', async () => {
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  const h = createHarness({ beforeCommit: () => blocked });
  const renderer = await h.render('screens/SignUpScreen.js');
  const inputs = renderer.root.findAllByType('TextInput');
  await act(async () => { inputs[0].props.onChangeText('Audit_User'); inputs[1].props.onChangeText('Audit@EXAMPLE.COM'); inputs[2].props.onChangeText('StrongPass99!'); });
  let first, second;
  await act(async () => {
    const button = renderer.root.findAllByType('TouchableOpacity').find(node => node.props.accessibilityLabel === 'Sign Up');
    first = button.props.onPress(); second = button.props.onPress();
    await Promise.resolve();
  });
  assert.equal(h.calls.filter(([name]) => name === 'register').length, 1);
  assert.ok(h.calls.some(([name, value]) => name === 'setRegistering' && value));
  assert.equal(h.navigations.length, 0);
  await act(async () => { release(); await Promise.all([first, second]); });
  assert.equal(h.documents.get('users/new-audit').username, 'audit_user');
  assert.equal(h.documents.get('usernames/audit_user').uid, 'new-audit');
  assert.equal(h.auth.currentUser, null);
  assert.deepEqual(h.navigations.at(-1), ['Login']);
  assert.ok(h.calls.some(([name, route]) => name === 'popTo' && route === 'Login'), 'pops the form instead of pushing a Login over it');
  await act(async () => renderer.unmount());
});
test('sign up has a labelled back button and its log-in link pops back', async () => {
  const h = createHarness();
  const renderer = await h.render('screens/SignUpScreen.js');
  const buttons = renderer.root.findAllByType('TouchableOpacity');
  const back = buttons.find(node => node.props.accessibilityLabel === 'Back to Log In');
  assert.equal(back.props.accessibilityRole, 'button');
  await act(async () => back.props.onPress());
  assert.ok(h.calls.some(([name]) => name === 'goBack'));
  await act(async () => buttons.find(node => textOf(node) === 'Already have an account? Log In').props.onPress());
  assert.ok(h.calls.some(([name, route]) => name === 'popTo' && route === 'Login'));
  await act(async () => renderer.unmount());
});
test('signing in stays on Login while the profile loads, then swaps to the app with no spinner', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const h = createHarness({ beforeRead: () => gate });
  const renderer = await h.render('App.js', { app: true });
  const routes = () => renderer.root.findAllByType(h.Screen).map(node => node.props.name);
  assert.ok(routes().includes('Login'));
  await act(async () => h.setUser({ uid: 'audit', email: 'codex.audit.render@example.com' }));
  assert.ok(routes().includes('Login'), 'Login is held during the profile read');
  assert.equal(renderer.root.findAllByType('ActivityIndicator').length, 0, 'no spinner flash');
  await act(async () => { release(); await gate; });
  assert.ok(!routes().includes('Login'), 'signed-in routes replace Login once the profile is ready');
  await act(async () => renderer.unmount());
});
test('a cold start with a saved session shows the cream spinner, not Login', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const h = createHarness({ user: { uid: 'audit', email: 'codex.audit.render@example.com' }, beforeRead: () => gate });
  const renderer = await h.render('App.js', { app: true });
  assert.equal(renderer.root.findAllByType(h.Screen).length, 0);
  assert.equal(renderer.root.findAllByType('ActivityIndicator').length, 1);
  await act(async () => { release(); await gate; });
  await act(async () => renderer.unmount());
});
test('restored auth without a profile exposes account recovery instead of Home', async () => {
  const h = createHarness({ user: { uid: 'incomplete', email: 'codex.audit.render@example.com' }, documents: {} });
  const renderer = await h.render('App.js', { app: true });
  assert.match(JSON.stringify(renderer.toJSON()), /Finish account setup/);
  assert.equal(renderer.root.findAllByType(h.Screen).length, 0);
  await act(async () => renderer.unmount());
});
test('a complete restored profile enables Home and logout restores Login', async () => {
  const h = createHarness({ user: { uid: 'audit', email: 'codex.audit.render@example.com' } });
  const renderer = await h.render('App.js', { app: true });
  assert.ok(renderer.root.findAllByType(h.Screen).some(node => node.props.name === 'Main'));
  await act(async () => h.setUser(null));
  assert.ok(renderer.root.findAllByType(h.Screen).some(node => node.props.name === 'Login'));
  await act(async () => renderer.unmount());
});
test('restoring location settings does not overwrite the saved preference with the default', async () => {
  const h = createHarness({ storage: { isLocationEnabled: 'true' } });
  const Provider = h.load('screens/SettingsContext.js').SettingsProvider;
  const React = require('react'), Renderer = require('react-test-renderer');
  let renderer;
  await act(async () => { renderer = Renderer.create(React.createElement(Provider, null, React.createElement('View'))); });
  assert.equal(h.storage.get('isLocationEnabled'), 'true');
  await act(async () => renderer.unmount());
});

function textOf(node) {
  return typeof node === 'string' ? node : node.children.map(textOf).join('');
}

// ---- top bar and sections
const SECTIONS = ['HomeTab', 'FavouritesTab', 'SpinTab', 'ProfileTab'];
const tabState = (index, nested) => ({ index, routes: SECTIONS.map((name, i) => ({ key: `${name}-key`, name, state: i === index ? nested : undefined })) });
const homeStack = names => ({ key: 'home-stack', index: names.length - 1, routes: names.map(name => ({ key: name, name })) });
async function renderTopBar(state, top = 62) {
  const h = createHarness();
  const log = { emitted: [], navigated: [], dispatched: [] };
  const navigation = {
    emit: event => { log.emitted.push(event); return { defaultPrevented: false }; },
    navigate: name => log.navigated.push(name),
    dispatch: action => log.dispatched.push(action),
  };
  const renderer = await h.render('components/NavBar.js', { props: { state, navigation, insets: { top, bottom: 34, left: 0, right: 0 } } });
  const control = label => renderer.root.findAllByType('TouchableOpacity').find(node => node.props.accessibilityLabel === label);
  return { renderer, log, control };
}
test('top bar: section starts have no back button, deeper pages do', async () => {
  for (const nested of [undefined, homeStack(['Home'])]) {
    const { renderer, log, control } = await renderTopBar(tabState(0, nested));
    const holder = renderer.root.findAll(node => node.type === 'AnimatedView' && node.props.pointerEvents);
    assert.equal(holder[0].props.pointerEvents, 'none');
    assert.equal(holder[0].props.accessibilityElementsHidden, true, 'hidden from VoiceOver too');
    await act(async () => control('Back').props.onPress());
    assert.equal(log.dispatched.length, 0);
    await act(async () => renderer.unmount());
  }
});
test('top bar: back names the previous page, pops the current section only, and ignores a double tap', async () => {
  const { renderer, log, control } = await renderTopBar(tabState(0, homeStack(['Home', 'VancouverScreen', 'SeasonsScreen', 'FallDatesScreen'])));
  const back = control('Back to Seasons');
  assert.ok(back, 'labelled with the page it returns to');
  await act(async () => { back.props.onPress(); back.props.onPress(); });
  assert.deepEqual(log.dispatched, [{ type: 'POP', payload: { count: 1 }, target: 'home-stack' }]);
  await act(async () => renderer.unmount());
});
test('top bar: switching section navigates; re-tapping the current one only signals tabPress', async () => {
  const { renderer, log, control } = await renderTopBar(tabState(1));
  await act(async () => control('Spin the Wheel').props.onPress());
  assert.deepEqual(log.navigated, ['SpinTab']);
  assert.deepEqual(log.emitted.at(-1), { type: 'tabPress', target: 'SpinTab-key', canPreventDefault: true });
  log.navigated.length = 0;
  await act(async () => control('Favourites').props.onPress());
  assert.deepEqual(log.navigated, [], 'no navigation for the section already open');
  assert.equal(log.emitted.at(-1).target, 'FavouritesTab-key');
  await act(async () => control('SznLuv Home').props.onPress());
  assert.deepEqual(log.navigated, ['HomeTab'], 'the logo goes through the same path');
  assert.deepEqual(control('Favourites').props.accessibilityState, { selected: true });
  assert.deepEqual(control('Profile').props.accessibilityState, { selected: false });
  await act(async () => renderer.unmount());
});
test('top bar: keeps its 130pt height on current iPhones and grows only if the notch demands it', async () => {
  const height = async top => {
    const { renderer } = await renderTopBar(tabState(0), top);
    const value = [].concat(renderer.root.findAll(node => node.type === 'View')[0].props.style).find(style => style && style.height).height;
    await act(async () => renderer.unmount());
    return value;
  };
  assert.equal(await height(20), 130);
  assert.equal(await height(59), 130);
  assert.equal(await height(62), 130);
  assert.equal(await height(80), 148);
});
test('a second quick tap after navigation has started is ignored', async () => {
  const h = createHarness({ focused: false });
  const fall = await h.render('screens/FallDatesScreen.js');
  const card = fall.root.findAllByType('TouchableOpacity').find(node => node.props.accessibilityLabel === 'View details for Aldor Family Farm');
  await act(async () => card.props.onPress());
  await act(async () => fall.unmount());
  const seasons = await h.render('screens/SeasonsScreen.js');
  await act(async () => seasons.root.findAllByType('TouchableOpacity').find(node => node.props.accessibilityLabel?.startsWith('Winter')).props.onPress());
  await act(async () => seasons.unmount());
  assert.deepEqual(h.navigations, []);
});
test('a spot card offers its heart to VoiceOver as a custom action', async () => {
  const h = createHarness();
  const renderer = await h.render('screens/FallDatesScreen.js');
  const card = renderer.root.findAllByType('TouchableOpacity').find(node => node.props.accessibilityLabel === 'View details for Aldor Family Farm');
  assert.deepEqual(card.props.accessibilityActions.map(action => action.name), ['favorite']);
  await act(async () => card.props.onAccessibilityAction());
  assert.ok(h.documents.get('favourites/audit')['Aldor Family Farm'].isFavourite, 'the action saves the favourite');
  await act(async () => renderer.unmount());
});
test('choose-collection sheet closes first, then hands the pick back to the season screen', async () => {
  const h = createHarness();
  const picked = [], order = [];
  h.navigation.goBack = () => order.push('closed');
  const { openCollectionPicker } = h.load('services/collectionPicker.js');
  openCollectionPicker(h.navigation, [{ title: 'Weekend', color: '#A7C8FF' }], title => { order.push('delivered'); picked.push(title); });
  assert.deepEqual(h.navigations.at(-1), ['ChooseCollection', { collections: [{ title: 'Weekend', color: '#A7C8FF' }] }]);
  const renderer = await h.render('screens/ChooseCollectionSheet.js', { props: { route: { params: h.navigations.at(-1)[1] } } });
  await act(async () => renderer.root.findAllByType('TouchableOpacity').find(node => node.props.accessibilityLabel === 'Add to Weekend Collection').props.onPress());
  assert.deepEqual(order, ['closed', 'delivered']);
  assert.deepEqual(picked, ['Weekend']);
  await act(async () => renderer.unmount());
});
test('choose-collection sheet explains an empty list and can be closed with its X', async () => {
  const h = createHarness();
  const renderer = await h.render('screens/ChooseCollectionSheet.js', { props: { route: { params: { collections: [] } } } });
  assert.match(JSON.stringify(renderer.toJSON()), /No Collections Available/);
  await act(async () => renderer.root.findAllByType('TouchableOpacity').find(node => node.props.accessibilityLabel === 'Close Collections').props.onPress());
  assert.ok(h.calls.some(([name]) => name === 'goBack'));
  await act(async () => renderer.unmount());
});
async function fillCreateSheet(h, title) {
  const renderer = await h.render('screens/CreateCollectionSheet.js');
  await act(async () => renderer.root.findByType('TextInput').props.onChangeText(title));
  await act(async () => renderer.root.findAllByType('TouchableOpacity').find(node => node.props.accessibilityLabel === 'Blue colour').props.onPress());
  return { renderer, create: () => renderer.root.findAllByType('TouchableOpacity').find(node => node.props.accessibilityLabel === 'Create new collection') };
}
test('create-collection sheet saves once, then closes', async () => {
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  const h = createHarness({ beforeCommit: () => blocked });
  const { renderer, create } = await fillCreateSheet(h, ' Road Trips ');
  let first, second;
  await act(async () => { first = create().props.onPress(); second = create().props.onPress(); await Promise.resolve(); });
  assert.ok(!h.calls.some(([name]) => name === 'goBack'), 'stays open until saved');
  await act(async () => { release(); await Promise.all([first, second]); });
  assert.equal(h.calls.filter(([name]) => name === 'goBack').length, 1);
  assert.deepEqual(h.documents.get('favourites/audit').collections.map(col => col.title), ['Weekend', 'Road Trips']);
  await act(async () => renderer.unmount());
});
test('create-collection sheet stays open and explains a duplicate title', async () => {
  const h = createHarness();
  const realError = console.error;
  console.error = () => {};
  try {
    const { renderer, create } = await fillCreateSheet(h, 'weekend');
    await act(async () => create().props.onPress());
    assert.deepEqual(h.alerts.at(-1), ['Error', 'Title already exists.']);
    assert.ok(!h.calls.some(([name]) => name === 'goBack'));
    await act(async () => renderer.unmount());
  } finally { console.error = realError; }
});
async function loadEntrance(options) {
  const h = createHarness(options);
  const hooks = h.load('hooks/useEntrance.js');
  await Promise.resolve();
  return { h, hooks };
}
function probe(useHook, initialProps) {
  const React = require('react'), Renderer = require('react-test-renderer');
  const result = {};
  const Probe = props => { result.current = useHook(props); return null; };
  return { result, create: async () => { await act(async () => { result.renderer = Renderer.create(React.createElement(Probe, initialProps)); }); }, update: async props => { await act(async () => result.renderer.update(React.createElement(Probe, props))); } };
}
test('entrances start hidden normally, and fully visible under Reduce Motion', async () => {
  for (const [reduceMotion, expected] of [[false, 0], [true, 1]]) {
    const { hooks } = await loadEntrance({ reduceMotion });
    const p = probe(() => hooks.default(2), {});
    await p.create();
    assert.equal(p.result.current[0].opacity.value, expected);
    await act(async () => p.result.renderer.unmount());
  }
});
test('a refetched list keeps each item\'s animation and only animates what is new', async () => {
  const { hooks } = await loadEntrance();
  const p = probe(({ keys }) => hooks.useItemEntrance(keys), { keys: ['a'] });
  await p.create();
  const original = p.result.current.styleFor('a');
  await p.update({ keys: ['a', 'b'] });
  assert.equal(p.result.current.styleFor('a'), original, 'same animated style, so it cannot blank');
  assert.ok(p.result.current.styleFor('b'));
  let finished = false;
  await act(async () => p.result.current.exit('a', () => { finished = true; }));
  assert.ok(finished, 'the removal completes');
  await p.update({ keys: ['a', 'b'] });
  assert.notEqual(p.result.current.styleFor('a'), original, 'a recreated item animates afresh');
  await act(async () => p.result.renderer.unmount());
});
test('background animations hold still only under Reduce Motion, through props alone', async () => {
  for (const [reduceMotion, autoPlay, speed] of [[false, true, 0.6], [true, false, 0]]) {
    const h = createHarness({ reduceMotion });
    const renderer = await h.render('components/BackgroundLottie.js', { props: { source: 1, speed: 0.6 } });
    assert.equal(renderer.toJSON().props.autoPlay, autoPlay);
    assert.equal(renderer.toJSON().props.speed, speed);
    assert.equal(renderer.toJSON().props.loop, true);
    await act(async () => renderer.unmount());
  }
});
test('a covered page keeps its background animation playing state', async () => {
  // Native Lottie views are reused between screens, so pausing on blur froze the next page that got one.
  const h = createHarness({ focused: false });
  const renderer = await h.render('components/BackgroundLottie.js', { props: { source: 1, speed: 0.6 } });
  assert.equal(renderer.toJSON().props.autoPlay, true);
  assert.equal(renderer.toJSON().props.speed, 0.6);
  const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'BackgroundLottie.js'), 'utf8');
  assert.doesNotMatch(source, /\.pause\b|\.resume\b/, 'no imperative pause or resume');
  await act(async () => renderer.unmount());
});
test('the wheel spins for several seconds normally and resolves instantly under Reduce Motion', async () => {
  for (const [reduceMotion, expected] of [[false, duration => duration >= 4000], [true, duration => duration === 0]]) {
    const h = createHarness({ reduceMotion });
    const renderer = await h.render('screens/SpinTheWheel.js');
    const button = label => renderer.root.findAllByType('TouchableOpacity').find(node => textOf(node) === label);
    await act(async () => button('Seasons').props.onPress());
    await act(async () => button('Fall').props.onPress());
    await act(async () => button('SPIN THE WHEEL').props.onPress());
    const spin = h.timings.find(config => config.toValue >= 1800);
    assert.ok(expected(spin.duration), `Reduce Motion ${reduceMotion}: spin lasted ${spin.duration}ms`);
    assert.ok(h.storage.get('currentDateIdea'), 'a date is still picked');
    await act(async () => renderer.unmount());
  }
});
test('venue pages hold the map back until the push has finished', async () => {
  const h = createHarness();
  const renderer = await h.render('screens/AldorFamilyFarmScreen.js');
  assert.equal(renderer.root.findAllByType('MapView').length, 0);
  await act(async () => renderer.unmount());
});
test('main tabs: four sections in a top bar, venue pages reachable from Home and Favourites', async () => {
  const React = require('react'), Renderer = require('react-test-renderer');
  const h = createHarness();
  const renderer = await h.render('navigation/MainTabs.js');
  const navigator = renderer.root.findAll(node => node.props.tabBar)[0];
  assert.equal(navigator.props.screenOptions.tabBarPosition, 'top');
  assert.equal(navigator.props.backBehavior, 'none', 'VoiceOver back cannot jump between sections');
  const tabs = renderer.root.findAllByType(h.Screen);
  assert.deepEqual(tabs.map(node => node.props.name), SECTIONS);
  for (const [index, root] of [[0, 'Home'], [1, 'Favourites']]) {
    let section;
    await act(async () => { section = Renderer.create(React.createElement(tabs[index].props.component)); });
    const names = section.root.findAllByType(h.Screen).map(node => node.props.name);
    assert.equal(names[0], root, 'the section starts on its own root screen');
    for (const venue of ['AldorFamilyFarmScreen', 'LaityPumpkinPatch', 'EagleAcresDairy', 'SpotDetailScreen']) assert.ok(names.includes(venue), `${root} section opens ${venue}`);
    await act(async () => section.unmount());
  }
  await act(async () => renderer.unmount());
});
test('wheel requires a season, produces a date and restores it after remount', async () => {
  const h = createHarness();
  let renderer = await h.render('screens/SpinTheWheel.js');
  const button = label => renderer.root.findAllByType('TouchableOpacity').find(node => textOf(node) === label);
  assert.equal(button('SPIN THE WHEEL').props.disabled, true);
  await act(async () => button('Seasons').props.onPress());
  await act(async () => button('Fall').props.onPress());
  assert.equal(button('SPIN THE WHEEL').props.disabled, false);
  await act(async () => button('SPIN THE WHEEL').props.onPress());
  const saved = h.storage.get('currentDateIdea');
  assert.ok(saved);
  assert.match(JSON.stringify(renderer.toJSON()), new RegExp(saved.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  await act(async () => renderer.unmount());
  renderer = await h.render('screens/SpinTheWheel.js');
  assert.ok(JSON.stringify(renderer.toJSON()).includes(saved));
  await act(async () => renderer.unmount());
});
test('account recovery saves a missing profile and returns to Login', async () => {
  const h = createHarness({ user: { uid: 'audit', email: 'codex.audit.render@example.com' }, documents: {} });
  const renderer = await h.render('App.js', { app: true });
  await act(async () => renderer.root.findByType('TextInput').props.onChangeText('Recovered_User'));
  const finish = renderer.root.findAllByType('TouchableOpacity').find(node => textOf(node) === 'Finish setup and return to Login');
  await act(async () => finish.props.onPress());
  assert.equal(h.documents.get('users/audit').username, 'recovered_user');
  assert.equal(h.documents.get('usernames/recovered_user').uid, 'audit');
  assert.ok(renderer.root.findAllByType(h.Screen).some(node => node.props.name === 'Login'));
  await act(async () => renderer.unmount());
});
test('denied profile access shows retry/signout instead of Home or an endless spinner', async () => {
  const h = createHarness({ user: { uid: 'audit', email: 'codex.audit.render@example.com' }, readError: 'permission-denied' });
  const renderer = await h.render('App.js', { app: true });
  assert.match(JSON.stringify(renderer.toJSON()), /Firebase denied access/);
  assert.ok(renderer.root.findAllByType('TouchableOpacity').some(node => textOf(node) === 'Retry'));
  assert.equal(renderer.root.findAllByType(h.Screen).length, 0);
  await act(async () => renderer.unmount());
});

for (const screen of ['AldorFamilyFarmScreen', 'LaityPumpkinPatch', 'EagleAcresDairy']) {
  test(`${screen} cannot start tracking after unmount while permission is pending`, async () => {
    let grant;
    const permission = new Promise(resolve => { grant = resolve; });
    const h = createHarness({ locationPermissions: () => permission });
    const renderer = await h.render('screens/' + screen + '.js', { location: true });
    await act(async () => renderer.unmount());
    await act(async () => grant({ status: 'granted' }));
    assert.ok(!h.calls.some(([name]) => name === 'watchLocation'));
  });
}

for (const spot of detailedFallSpots) {
  test(`SpotDetailScreen renders ${spot.placeID} with its own title, address, tagline and photo placeholder`, async () => {
    const h = createHarness();
    const renderer = await h.render('screens/SpotDetailScreen.js', { props: { route: { params: { placeID: spot.placeID } } } });
    const output = JSON.stringify(renderer.toJSON());
    for (const text of [spot.title, spot.detailAddress, spot.tagline, 'Photo coming soon']) assert.ok(output.includes(text), `${spot.placeID} shows ${text}`);
    await act(async () => renderer.unmount());
  });
}
test('SpotDetailScreen explains an unknown spot instead of querying reviews for it', async () => {
  const h = createHarness();
  const renderer = await h.render('screens/SpotDetailScreen.js', { props: { route: { params: { placeID: 'nope' } } } });
  assert.match(JSON.stringify(renderer.toJSON()), /Details unavailable for this spot/);
  await act(async () => renderer.unmount());
});
test('Fall screen lists every spot in category order and opens the right venue page', async () => {
  const h = createHarness();
  const renderer = await h.render('screens/FallDatesScreen.js');
  const output = JSON.stringify(renderer.toJSON());
  for (const category of fallCategories) assert.ok(output.includes(category.title), category.title);
  for (const name of fallSpotNames) assert.ok(output.includes(name), name);
  assert.ok(!output.includes('Sunset Summit') && !output.includes('Riverfront Meadows'));
  for (const category of fallCategories) for (const spot of category.spots) assert.ok(!output.includes(spot.address), `${spot.name} card does not show its address`);
  const detail = name => renderer.root.findAllByType('TouchableOpacity').find(node => node.props.accessibilityLabel === `View details for ${name}`);
  await act(async () => detail('Aldor Family Farm').props.onPress());
  await act(async () => detail('Reifel Bird Sanctuary').props.onPress());
  assert.deepEqual(h.navigations, [['AldorFamilyFarmScreen'], ['SpotDetailScreen', { placeID: 'reifel_bird_sanctuary' }]]);
  await act(async () => renderer.unmount());
});
test('Seasons screen shows the same Fall count as the Fall list', async () => {
  const h = createHarness();
  const renderer = await h.render('screens/SeasonsScreen.js');
  assert.ok(JSON.stringify(renderer.toJSON()).includes(`"${fallSpotNames.length}"," Active Ideas"`));
  await act(async () => renderer.unmount());
});

for (const season of ['Fall', 'Winter', 'Spring', 'Summer']) {
  test(`${season} spot cards are one size, show only a one-line shrink-to-fit name, and no address`, async () => {
    const h = createHarness();
    const renderer = await h.render(`screens/${season}DatesScreen.js`);
    const cards = renderer.root.findAll(node => node.type === 'View' && [].concat(node.props.style).some(style => style && style.borderRadius === 14));
    assert.ok(cards.length > 0, 'cards render');
    const heights = new Set(cards.map(card => [].concat(card.props.style).find(style => style && style.borderRadius === 14).height));
    assert.deepEqual([...heights], [74], 'every card has the same fixed height (15% taller than the earlier 64)');
    const gaps = new Set(cards.map(card => [].concat(card.props.style).find(style => style && style.borderRadius === 14).marginBottom));
    assert.deepEqual([...gaps], [24.15], 'space between cards is 15% more than the earlier 21');
    const hearts = renderer.root.findAll(node => ['favorite', 'favorite-border'].includes(node.props.name));
    assert.equal(hearts.length, cards.length, 'one heart per card');
    assert.ok(hearts.every(node => node.props.size === 23), 'hearts are 15% larger than the original 20');
    const names = renderer.root.findAll(node => node.type === 'Text' && node.props.numberOfLines === 1 && node.props.adjustsFontSizeToFit);
    assert.equal(names.length, cards.length, 'one shrink-to-fit single-line name per card');
    assert.ok(names.every(node => node.props.minimumFontScale > 0 && node.props.minimumFontScale < 1));
    const addressLines = renderer.root.findAll(node => node.type === 'Text' && [].concat(node.props.style).some(style => style && style.color === '#696969'));
    assert.equal(addressLines.length, 0, 'no address line on the card front');
    await act(async () => renderer.unmount());
  });
}

test('the Vancouver and Seasons cards use the cover images from the assets folder', async () => {
  for (const [file, image] of [['HomeScreen', 'cities/VancouverCoverIMG.png'], ['VancouverScreen', 'Seasonal/SeasonalCoverIMG.png']]) {
    const h = createHarness();
    const renderer = await h.render(`screens/${file}.js`);
    const backgrounds = renderer.root.findAllByType('ImageBackground');
    assert.equal(backgrounds.length, 1, `${file} has one image card`);
    assert.ok(String(backgrounds[0].props.source).endsWith(`assets/${image}`), `${file} uses ${image}`);
    assert.equal(backgrounds[0].props.imageStyle.opacity, 0.9, `${file} image opacity is 10% lower`);
    const washes = renderer.root.findAll(node => node.type === 'View' && node.props.pointerEvents === 'none' && node.props.style && node.props.style.backgroundColor === 'rgba(255, 255, 255, 0.2)');
    assert.equal(washes.length, 1, `${file} has a thin white layer over the image`);
    await act(async () => renderer.unmount());
  }
});

// ---- all 23 spot info pages: the 3 original farm screens + the 20 shared-page spots
const legacySpotPages = ['AldorFamilyFarmScreen', 'LaityPumpkinPatch', 'EagleAcresDairy'].map(file => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'screens', file + '.js'), 'utf8');
  return { label: file, file, props: {}, latitude: Number(source.match(/const farmLatitude = ([-\d.]+);/)[1]), longitude: Number(source.match(/const farmLongitude = ([-\d.]+);/)[1]) };
});
const sharedSpotPages = detailedFallSpots.map(spot => ({ label: spot.placeID, file: 'SpotDetailScreen', props: { route: { params: { placeID: spot.placeID } } }, latitude: spot.latitude, longitude: spot.longitude }));
const spotPages = [...legacySpotPages, ...sharedSpotPages];
const titleNodes = renderer => renderer.root.findAll(node => node.type === 'Text' && node.props.style && node.props.style.fontSize === 24 && node.props.style.textTransform === 'uppercase');
test('there are 43 spot info pages under test', () => assert.equal(spotPages.length, 43));
for (const page of spotPages) {
  test(`${page.label}: one-line title, forecast for the spot without a GPS fix, no blank location bar`, async () => {
    const h = createHarness();
    const renderer = await h.render(`screens/${page.file}.js`, { props: page.props });
    const titles = titleNodes(renderer);
    assert.equal(titles.length, 1, 'one title');
    assert.equal(titles[0].props.numberOfLines, 1);
    assert.ok(titles[0].props.adjustsFontSizeToFit && titles[0].props.minimumFontScale > 0 && titles[0].props.minimumFontScale < 1);
    const requests = h.calls.filter(([name]) => name === 'fetch');
    assert.equal(requests.length, 1, 'one forecast request');
    assert.ok(requests[0][1].includes(`lat=${page.latitude}&lon=${page.longitude}`), `forecast is for the spot (${requests[0][1]})`);
    const output = JSON.stringify(renderer.toJSON());
    assert.ok(output.includes('Testville'), 'forecast strip is shown even though location is off');
    assert.equal(renderer.root.findAllByType('ActivityIndicator').length, 0, 'no endless spinner');
    assert.ok(!output.includes('Your Current Location') && !output.includes('Latitude'), 'no current-location bar');
    await act(async () => renderer.unmount());
  });
  test(`${page.label}: a failed forecast request shows a short message instead of a spinner`, async () => {
    const h = createHarness({ fetch: async () => ({ ok: false, status: 401, json: async () => ({ message: 'Invalid API key' }) }) });
    const realError = console.error;
    console.error = () => {};
    try {
      const renderer = await h.render(`screens/${page.file}.js`, { props: page.props });
      assert.match(JSON.stringify(renderer.toJSON()), /Weather is unavailable right now/);
      assert.equal(renderer.root.findAllByType('ActivityIndicator').length, 0);
      await act(async () => renderer.unmount());
    } finally { console.error = realError; }
  });
}
test('a denied location permission is explained under the map on the shared page too, and tracking never starts', async () => {
  const h = createHarness();
  const renderer = await h.render('screens/SpotDetailScreen.js', { location: true, props: sharedSpotPages[0].props });
  assert.ok(!h.calls.some(([name]) => name === 'watchLocation'));
  assert.match(JSON.stringify(renderer.toJSON()), /Permission to access location was denied/);
  await act(async () => renderer.unmount());
});
