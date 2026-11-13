const { test } = require('node:test');
const assert = require('node:assert/strict');
const firstPick = require('../services/collections').featuredRotation('vancouver')[0];
const fs = require('fs');
const path = require('path');
const { createHarness, act } = require('./renderHarness.cjs');
const { flush, textOf: screenText } = require('./support.cjs');
const { CommonActions, StackRouter } = require('@react-navigation/routers');
const { detailedFallSpots, legacyFallSpots, fallSpotNames, fallCategories } = require('../services/spots');
const spotProps = name => ({ route: { params: { spot: { k: 'c', name } } } });
const auditedPhotoFiles = {
  'Richmond Country Farms': { file: 'richmond-country-farms.jpg', author: 'GoToVan', license: 'CC BY 2.0' },
  'Westham Island Herb Farm': { file: 'westham-island-herb-farm.jpg', author: 'FernShade' },
  'Hazelmere Pumpkin Patch': { file: 'hazelmere-pumpkin-patch.jpg', author: 'Gabriel Farms' },
  'The Bog Cranberry Farm': { file: 'the-bog-cranberry-farm.jpg', author: 'Riverside Cranberry Farm' },
  'Hopcott Farms Cranberry Tours': { file: 'hopcott-farms-cranberry-tours.jpg', author: 'Ocean Spray' },
  'Maan Farms': { file: 'maan-farms.jpg', author: 'GoToVan', license: 'CC BY 2.0' },
  'Taves Family Farms': { file: 'taves-family-farms.jpg', author: 'GoToVan', license: 'CC BY 2.0' },
  'Krause Berry Farms': { file: 'krause-berry-farms.jpg', author: 'Krause Berry Farms' },
  'Willow View Farms': { file: 'willow-view-farms.jpg', author: 'Willow View Farms' },
  'Fort Langley Cranberry Festival': { file: 'fort-langley-cranberry-festival.jpg', author: 'James.bc', license: 'CC BY-SA 3.0' },
  'UBC Apple Festival': { file: 'ubc-apple-festival.jpg', author: 'UBC Botanical Garden' },
  'VanDusen Harvest Days': { file: 'vandusen-harvest-days.jpg', author: 'Vancouver Is Awesome' },
  'Nitobe Memorial Garden': { file: 'nitobe-memorial-garden.jpg', author: 'Ruth Hartnup', license: 'CC BY 2.0' },
  'Sun Yat-Sen Garden Moon Palace': { file: 'sun-yat-sen-garden-moon-palace.jpg', author: 'Tiqets' },
  'Darts Hill Garden Park': { file: 'darts-hill-garden-park.jpg', author: 'Susan Murray, Darts Hill Garden Conservancy' },
  'VanDusen Mushroom Show': { file: 'vandusen-mushroom-show.jpg', author: 'Rich Sobel, Burke Mountain Naturalists' },
  'Stewart Farm Harvest Fair': { file: 'stewart-farm-harvest-fair.jpg', author: 'Family Fun Vancouver' },
  'Renfrew Ravine Moon Festival': { file: 'renfrew-ravine-moon-festival.jpg', author: 'Rod Raglin', license: 'CC BY-SA 2.0' },
  'Haney House Apple Harvest Fest': { file: 'haney-house-apple-harvest-fest.jpg', author: 'Maple Ridge Museum via Culture Days' },
  'Granville Island Day of the Dead Market': { file: 'granville-island-day-of-the-dead-market.jpg', author: 'MOSAIC engage' },
  'Burnaby Haunted Village': { file: 'burnaby-haunted-village.jpg', author: 'City of Burnaby' },
  'Fright Nights at Playland': { file: 'fright-nights-at-playland.jpg', author: 'La Carmina' },
  'Canyon Frights at Capilano': { file: 'canyon-frights-at-capilano.jpg', author: 'Capilano Suspension Bridge Park' },
  'Lost Souls of Gastown': { file: 'lost-souls-of-gastown.jpg', author: 'Forbidden Vancouver Walking Tours' },
  'Haunted Halloween Trolley': { file: 'haunted-halloween-trolley.jpg', author: 'Gray Line Vancouver' },
  'Bear Creek Halloween Train': { file: 'bear-creek-halloween-train.jpg', author: 'Bear Creek Park Train' },
  'Cougar Creek House of Horrors': { file: 'cougar-creek-house-of-horrors.jpg', author: 'Curiocity' },
  'Grave Tales at Fort Langley': { file: 'grave-tales-fort-langley.jpg', author: 'Parks Canada' },
  'Steveston Scarecrow Crawl': { file: 'steveston-scarecrow-crawl.jpg', author: 'Steveston Heritage' },
  'Central Spark': { file: 'central-spark.jpg', author: 'City of Burnaby' },
  'Tynehead Hatchery': { file: 'tynehead-hatchery.jpg', author: 'Henry’s Take' },
  'Hoy Creek Hatchery': { file: 'hoy-creek-hatchery.jpg', author: 'Hoy-Scott Watershed Society' },
  'Reifel Bird Sanctuary': { file: 'reifel-bird-sanctuary.jpg', author: 'ShayneKayePhoto', license: 'CC BY-SA 4.0' },
  'Kanaka Creek Fish Fence': { file: 'kanaka-creek-fish-fence.jpg', author: 'Paul Cipywnyk' },
  'Wings Over Iona': { file: 'wings-over-iona.jpg', author: 'Paula Gomez Villalba' },
  'Hyde Creek Hatchery': { file: 'hyde-creek-hatchery.jpg', author: 'Nicolas Untz' },
  'Boundary Bay Fall Bird Migration': { file: 'boundary-bay-fall-migration.jpg', author: 'Brian Avent' },
  'Buntzen Lake': { file: 'buntzen-lake.jpg', author: 'Vancouver Trails photo contest' },
  'Queen Elizabeth Park': { file: 'queen-elizabeth-park.jpg', author: 'Analise Zocher', license: 'CC BY 2.0' },
  'Pacific Spirit Park': { file: 'pacific-spirit-park.jpg', author: 'popejon2', license: 'CC BY 2.0' },
  'Stanley Park': { file: 'stanley-park-fall-walk.jpg', author: 'Adam Jones', license: 'CC BY-SA 2.0' },
  'Deer Lake Park': { file: 'deer-lake-park.jpg', author: 'D70' },
  'Campbell Valley Park': { file: 'campbell-valley-park.jpg', author: 'Colin W', license: 'CC BY-SA 3.0' },
  'UBC Main Mall': { file: 'ubc-main-mall.jpg', author: 'Visit UBC' },
  'Trout Lake': { file: 'trout-lake.jpg', author: 'David Zhang', license: 'CC BY-SA 2.0' },
  'Burnaby Mountain Park': { file: 'burnaby-mountain-park.jpg', author: 'Ann Badjura' },
  'Hadden Park': { file: 'hadden-park.jpg', author: 'popejon2', license: 'CC BY 2.0' },
};

for (const screen of ['LoginScreen', 'SignUpScreen', 'HomeScreen', 'CitySpotsScreen', 'SeasonsScreen', 'FallDatesScreen', 'WinterDatesScreen', 'SpringDatesScreen', 'SummerDatesScreen', 'Favourites', 'SeasonalFavourites', 'SpinTheWheel', 'SettingsScreen']) {
  test(`${screen} renders with an authenticated test profile`, async () => {
    const h = createHarness();
    const renderer = await h.render('screens/' + screen + '.js');
    assert.ok(renderer.toJSON());
    await act(async () => renderer.unmount());
  });
}
test('home hierarchy: Home > its collections and all spots; Seasonal > the four season screens', async () => {
  async function pressCards(file) {
    const h = createHarness();
    const renderer = await h.render('screens/' + file + '.js');
    const cards = renderer.root.findAllByType('TouchableOpacity').filter(node => !/collection (to|from) My lists$/.test(node.props.accessibilityLabel));
    const results = {};
    for (const card of cards) {
      h.navigations.length = 0;
      await act(async () => card.props.onPress());
      results[card.props.accessibilityLabel] = h.navigations.at(-1);
    }
    await act(async () => renderer.unmount());
    return results;
  }
  // Unique Food and Night Out have no spots yet: they are on the page, but there is nothing to press.
  assert.deepEqual(await pressCards('HomeScreen'), {
    [`Featured: ${firstPick.title}. ${firstPick.subtitle}`]: ['CollectionSpots', { collectionId: 'vancouver-rain-days' }],
    'Seasonal collection': ['SeasonsScreen'],
    'Outdoors collection': ['CollectionSpots', { collectionId: 'vancouver-outdoors' }],
    'All Vancouver spots': ['CitySpots'],
  });
  assert.deepEqual(await pressCards('SeasonsScreen'), {
    'Fall Season - View Active Date Ideas': ['FallDatesScreen'],
    'Winter Season - View Active Date Ideas': ['WinterDatesScreen'],
    'Spring Season - View Active Date Ideas': ['SpringDatesScreen'],
    'Summer Season - View Active Date Ideas': ['SummerDatesScreen'],
  });
});

test('home hierarchy: the Home and Seasons headings share the same content inset', async () => {
  for (const [file, title] of [['HomeScreen', 'What sounds good?'], ['SeasonsScreen', 'Seasons']]) {
    const h = createHarness();
    const renderer = await h.render(`screens/${file}.js`);
    const scroll = renderer.root.findByType('ScrollView');
    const heading = renderer.root.findAllByType('Text').find(node => node.props.accessibilityRole === 'header');
    assert.equal(heading.props.children, title);
    assert.equal(scroll.props.contentContainerStyle.paddingTop, 20);
    assert.equal(scroll.props.contentContainerStyle.paddingHorizontal, 20);
    for (let node = heading; node !== scroll; node = node.parent) {
      const style = Object.assign({}, ...[node.props.style].flat(Infinity));
      assert.equal(style.marginTop ?? style.marginVertical ?? style.margin ?? 0, 0);
      assert.equal(style.paddingTop ?? style.paddingVertical ?? style.padding ?? 0, 0);
    }
    await act(async () => renderer.unmount());
  }
});

for (const { name } of legacyFallSpots) {
  test(`${name} handles denied location without starting tracking`, async () => {
    const h = createHarness({ getLocationPermissions: async () => ({ granted: false }) });
    const renderer = await h.render('screens/SpotDetailScreen.js', { location: true, props: spotProps(name) });
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
// The Map tab sits where Spin the Wheel was; the wheel's own screen is still tested below.
const SECTIONS = ['HomeTab', 'ExploreTab', 'MapTab', 'FavouritesTab', 'ProfileTab'];
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
  const { renderer, log, control } = await renderTopBar(tabState(0, homeStack(['Home', 'SeasonsScreen', 'FallDatesScreen'])));
  const back = control('Back to Seasons');
  assert.ok(back, 'labelled with the page it returns to');
  await act(async () => { back.props.onPress(); back.props.onPress(); });
  assert.deepEqual(log.dispatched, [{ type: 'POP', payload: { count: 1 }, target: 'home-stack' }]);
  await act(async () => renderer.unmount());
});
test('top bar: Home selects its tab and the Settings gear opens a page from a nested screen', async () => {
  const { renderer, log, control } = await renderTopBar(tabState(1, homeStack(['Explore', 'ListScreen'])));
  assert.equal(control('Favorites'), undefined);
  assert.equal(control('Explore'), undefined);
  await act(async () => control('SznLuv Home').props.onPress());
  assert.equal(control('Profile'), undefined);
  assert.equal(control('Settings').props.accessibilityRole, 'button');
  await act(async () => control('Settings').props.onPress());
  assert.deepEqual(log.navigated, ['HomeTab', 'Settings']);
  assert.equal(log.emitted.length, 1, 'Settings is not a tab selection');
  await act(async () => renderer.unmount());
});

test('Settings is a signed-in root page: back preserves the active tab and link routing reuses it', async () => {
  const router = StackRouter({ initialRouteName: 'Main' });
  const config = { routeNames: ['Main', 'Settings'], routeParamList: {}, routeGetIdList: {} };
  const main = router.getInitialState(config);
  main.routes[0].state = tabState(3, homeStack(['Favourites', 'ListScreen']));
  const root = router.getStateForAction(main, CommonActions.navigate('Settings'), config);
  const h = createHarness({ rootState: root, initialUrl: 'sznluv://u/maya', reduceMotion: true });
  const app = await h.render('App.js', { app: true });
  assert.ok(!app.root.findAllByType(h.Screen).some(node => node.props.name === 'Settings'));
  assert.deepEqual(h.dispatches, [], 'the link waits for sign-in');
  await act(async () => h.setUser({ uid: 'audit' }));
  await flush();
  const settings = app.root.findAllByType(h.Screen).find(node => node.props.name === 'Settings');
  assert.equal(settings.props.options.animation, 'none');
  const [profileLink] = h.dispatches;
  assert.equal(profileLink.target, root.key);
  assert.deepEqual(profileLink.payload.params, { screen: 'ExploreTab', params: { screen: 'PersonScreen', params: { username: 'maya' }, initial: false } });
  await act(async () => h.openUrl('sznluv://list/weekend'));
  const listLink = h.dispatches.at(-1);
  assert.deepEqual(listLink.payload.params.params, { screen: 'ListScreen', params: { listId: 'weekend', from: 'link' }, initial: false });
  for (const action of [profileLink, listLink, CommonActions.goBack()]) {
    const popped = router.getStateForAction(root, action, config);
    assert.deepEqual(popped.routes.map(route => route.key), [main.routes[0].key]);
    assert.equal(popped.routes[0].state, main.routes[0].state);
  }
  await act(async () => app.unmount());
});

test('Settings groups the existing preferences and keeps the back and sign-out actions', async () => {
  const React = require('react');
  const h = createHarness({ user: { uid: 'audit' }, locationPermissions: async () => ({ status: 'granted' }),
    window: { width: 320, fontScale: 2 } });
  const { SettingsProvider } = h.load('screens/SettingsContext.js');
  const Settings = h.load('screens/SettingsScreen.js').default;
  const page = await h.renderElement(React.createElement(SettingsProvider, null, React.createElement(Settings, { navigation: h.navigation })));
  const labels = screenText(page.root);
  for (const label of ['Settings', 'Account & Security', 'Privacy', 'Notifications']) assert.ok(labels.includes(label));
  const controls = () => page.root.findAllByType('TouchableOpacity');
  const press = label => act(async () => controls().find(node => node.props.accessibilityLabel === label || screenText(node)[0] === label).props.onPress());
  const toggle = label => page.root.findAllByType('Switch').find(node => node.props.accessibilityLabel === label);
  await press('Back');
  assert.ok(h.calls.some(([name]) => name === 'goBack'));
  await press('Change Password');
  assert.match(h.alerts.at(-1)[1], /coming soon/);
  await press('Account Settings');
  assert.match(h.alerts.at(-1)[1], /coming soon/);
  await act(async () => toggle('Allow Location Services').props.onValueChange(true));
  assert.equal(h.storage.get('isLocationEnabled'), 'true');
  await act(async () => toggle('Allow Notifications').props.onValueChange(true));
  assert.equal(toggle('Allow Notifications').props.value, true);
  await press('Sign Out');
  assert.equal(h.auth.currentUser.uid, 'audit');
  await act(async () => h.alerts.at(-1)[2].find(button => button.text === 'Sign Out').onPress());
  assert.equal(h.auth.currentUser, null);
  await act(async () => page.unmount());
});
test('top bar: has a 117pt minimum height and grows for a taller top inset', async () => {
  const height = async top => {
    const { renderer } = await renderTopBar(tabState(0), top);
    const { style: [bar, layout] } = renderer.root.findAllByType('View')[0].props;
    assert.equal(bar.position, 'absolute');
    assert.equal(bar.backgroundColor, undefined);
    await act(async () => renderer.unmount());
    return layout.minHeight;
  };
  assert.equal(await height(20), 117);
  assert.equal(await height(62), 117);
  assert.equal(await height(80), 135);
});

test('signed-in layout: seasonal background fills the screen while content clears the measured header', async () => {
  const React = require('react');
  const h = createHarness();
  const main = await h.render('navigation/MainTabs.js');
  const { layout } = main.root.findAll(node => typeof node.props.tabBar === 'function')[0].props;
  await act(async () => main.unmount());

  const state = tabState(0, homeStack(['Home', 'FallDatesScreen']));
  const FallDates = h.load('screens/FallDatesScreen.js').default;
  const renderer = await h.renderElement(layout({
    state,
    navigation: h.navigation,
    children: React.createElement(FallDates, { navigation: h.navigation }),
  }));
  const surfaceStyle = () => renderer.root.findAllByType('View')
    .find(node => [node.props.style].flat(Infinity).some(style => style?.backgroundColor === '#F5AD70')).props.style;
  assert.equal(surfaceStyle()[1].paddingTop, 117);
  const bar = renderer.root.findAllByType('View').find(node => node.props.onLayout);
  await act(async () => bar.props.onLayout({ nativeEvent: { layout: { height: 139 } } }));
  assert.equal(surfaceStyle()[1].paddingTop, 139);
  await act(async () => renderer.unmount());
});

async function renderFloatingNav(h, index, { bottom = 34, includeHome = false, nestedHome, nestedProfile } = {}) {
  const React = require('react');
  const main = await h.render('navigation/MainTabs.js');
  const { tabBar } = main.root.findAll(node => typeof node.props.tabBar === 'function')[0].props;
  await act(async () => main.unmount());
  const { FloatingNavigationLayoutProvider } = h.load('navigation/floatingNavigationLayout.js');
  const Home = h.load('screens/HomeScreen.js').default;
  const log = { emitted: [], navigated: [], dispatched: [], blocked: false };
  const navigation = {
    emit: event => { log.emitted.push(event); return { defaultPrevented: log.blocked }; },
    navigate: name => log.navigated.push(name),
    dispatch: action => log.dispatched.push(action),
  };
  const state = tabState(index);
  state.routes[0].state = nestedHome;
  state.routes[4].state = nestedProfile;
  const renderer = await h.renderElement(React.createElement(FloatingNavigationLayoutProvider, null,
    includeHome && React.createElement(Home),
    tabBar({ state, navigation, insets: { left: 0, right: 0, bottom } }),
  ));
  const control = label => renderer.root.findAllByType('TouchableOpacity').find(node => node.props.accessibilityLabel === label);
  return { renderer, log, control };
}

test('floating bar: Home returns to the landing screen from an inactive, nested Home stack', async () => {
  const nestedHome = homeStack(['Home', 'VancouverScreen', 'SeasonsScreen']);
  const { renderer, log, control } = await renderFloatingNav(createHarness(), 1, { nestedHome });
  await act(async () => control('Home').props.onPress());
  assert.equal(log.emitted.at(-1).target, 'HomeTab-key');
  assert.deepEqual(log.dispatched, [{ type: 'POP_TO_TOP', target: 'home-stack' }]);
  assert.deepEqual(log.navigated, ['HomeTab']);
  await act(async () => renderer.unmount());
});

test('floating bar: five named slots fit narrow phones, and Profile comes last', async () => {
  for (const width of [320, 390]) {
    const h = createHarness({ window: { width } });
    const { renderer, control } = await renderFloatingNav(h, 4);
    const tabs = renderer.root.findAllByType('TouchableOpacity').filter(node => node.props.accessibilityRole === 'tab');
    assert.deepEqual(tabs.map(node => node.props.accessibilityLabel), ['Home', 'Explore', 'Map', 'Favorites', 'Profile']);
    assert.deepEqual(control('Profile').props.accessibilityState, { selected: true });
    assert.equal(control('Explore').props.accessibilityHint, 'Search lists from other people');
    assert.equal(control('Map').props.accessibilityHint, 'Shows your saved spots on a map');
    assert.equal(control('Spin the Wheel'), undefined, 'the wheel is parked, not in the bar');
    const widths = tabs.map(tab => Object.assign({}, ...tab.props.style).width);
    assert.ok(widths.every(slot => slot === widths[0] && slot >= 44));
    assert.ok(widths.reduce((sum, slot) => sum + slot, 0) <= width - 46 + Number.EPSILON * width);
    await act(async () => renderer.unmount());
  }
});

test('floating bar: Profile opens its root after leaving the tab on a detail', async () => {
  const nestedProfile = { ...homeStack(['Profile', 'ListScreen']), key: 'profile-stack' };
  const { renderer, log, control } = await renderFloatingNav(createHarness(), 1, { nestedProfile });
  await act(async () => control('Profile').props.onPress());
  assert.deepEqual(log.dispatched, [{ type: 'POP_TO_TOP', target: 'profile-stack' }]);
  assert.deepEqual(log.navigated, ['ProfileTab']);
  await act(async () => renderer.unmount());
});

test('floating bar: Favorites and Map keep their route keys and only a real switch triggers a haptic', async () => {
  const h = createHarness();
  const { renderer, log, control } = await renderFloatingNav(h, 3);
  assert.deepEqual(control('Favorites').props.accessibilityState, { selected: true });
  assert.deepEqual(control('Map').props.accessibilityState, { selected: false });
  await act(async () => control('Favorites').props.onPress());
  assert.deepEqual(log.emitted.at(-1), { type: 'tabPress', target: 'FavouritesTab-key', canPreventDefault: true });
  log.blocked = true;
  await act(async () => control('Map').props.onPress());
  assert.deepEqual(log.navigated, []);
  assert.equal(h.calls.filter(([name]) => name === 'selectionHaptic').length, 0);
  log.blocked = false;
  await act(async () => control('Map').props.onPress());
  assert.deepEqual(log.navigated, ['MapTab']);
  assert.equal(log.emitted.at(-1).target, 'MapTab-key');
  assert.equal(h.calls.filter(([name]) => name === 'selectionHaptic').length, 1);
  await act(async () => renderer.unmount());
});

test('floating bar: clears the safe area, gives scroll content room, and hides for the keyboard', async () => {
  for (const bottom of [0, 34]) {
    const h = createHarness({ insets: { bottom } });
    const { renderer, control, log } = await renderFloatingNav(h, 0, { bottom, includeHome: true });
    const dock = () => renderer.root.findAllByType('View').find(node => node.props.pointerEvents === 'box-none');
    const scrollStyle = () => renderer.root.findByType('ScrollView').props.contentContainerStyle;
    assert.equal(dock().props.style[1].bottom, bottom + 12);
    assert.equal(scrollStyle()[1].paddingBottom, bottom + 102);
    assert.deepEqual(control('Home').props.accessibilityState, { selected: true });
    assert.deepEqual(control('Favorites').props.accessibilityState, { selected: false });
    assert.deepEqual(control('Explore').props.accessibilityState, { selected: false });
    await act(async () => control('Favorites').props.onPress());
    assert.deepEqual(log.navigated, ['FavouritesTab']);

    await act(async () => h.keyboardEvent('keyboardWillShow'));
    assert.equal(dock(), undefined);
    assert.equal(control('Favorites'), undefined);
    assert.equal(scrollStyle().paddingBottom, 20);
    await act(async () => h.keyboardEvent('keyboardDidHide'));
    assert.ok(control('Favorites'));
    await act(async () => renderer.unmount());
  }
});

test('floating bar: respects Reduce Transparency and uses the opaque treatment on Android', async () => {
  const ios = createHarness({ reduceTransparency: true });
  const { renderer } = await renderFloatingNav(ios, 3);
  assert.equal(renderer.root.findAllByType('BlurView').length, 0);
  await act(async () => ios.accessibilityEvent('reduceTransparencyChanged', false));
  assert.equal(renderer.root.findAllByType('BlurView').length, 1);
  await act(async () => renderer.unmount());

  const android = createHarness({ platform: 'android' });
  const androidNav = await renderFloatingNav(android, 2);
  assert.equal(androidNav.renderer.root.findAllByType('BlurView').length, 0);
  assert.deepEqual(androidNav.control('Map').props.accessibilityState, { selected: true });
  await act(async () => androidNav.control('Favorites').props.onPress());
  assert.equal(android.calls.filter(([name]) => name === 'selectionHaptic').length, 0);
  await act(async () => androidNav.renderer.unmount());
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
  assert.deepEqual(card.props.accessibilityActions.map(action => action.name), ['save']);
  await act(async () => card.props.onAccessibilityAction({ nativeEvent: { actionName: 'save' } }));
  assert.ok(h.documents.get('favourites/audit')['Aldor Family Farm'].isFavourite, 'the action saves the favourite');
  await act(async () => renderer.unmount());
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
  const renderer = await h.render('screens/SpotDetailScreen.js', { props: spotProps('Aldor Family Farm') });
  assert.equal(renderer.root.findAllByType('MapView').length, 0);
  await act(async () => renderer.unmount());
});
test('main tabs: five sections with shared navigation; venue and list pages reachable from every section, the Map included', async () => {
  const React = require('react'), Renderer = require('react-test-renderer');
  const h = createHarness();
  const renderer = await h.render('navigation/MainTabs.js');
  const navigator = renderer.root.findAll(node => node.props.tabBar)[0];
  assert.equal(navigator.props.screenOptions.tabBarPosition, 'bottom');
  assert.equal(navigator.props.screenOptions.animation, 'fade');
  assert.equal(typeof navigator.props.layout, 'function');
  assert.equal(navigator.props.backBehavior, 'none', 'VoiceOver back cannot jump between sections');
  const tabs = renderer.root.findAllByType(h.Screen);
  assert.deepEqual(tabs.map(node => node.props.name), SECTIONS);
  for (const [index, root] of [[0, 'Home'], [1, 'Explore'], [2, 'Map'], [3, 'Favourites'], [4, 'Profile']]) {
    let section;
    await act(async () => { section = Renderer.create(React.createElement(tabs[index].props.component)); });
    const names = section.root.findAllByType(h.Screen).map(node => node.props.name);
    assert.equal(names[0], root, 'the section starts on its own root screen');
    assert.equal(names.includes('Settings'), false);
    for (const venue of ['SpotDetailScreen', 'ListScreen', 'OwnSpotScreen']) assert.ok(names.includes(venue), `${root} section opens ${venue}`);
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

for (const { name } of legacyFallSpots) {
  test(`${name} cannot start tracking after unmount while permission is pending`, async () => {
    let grant;
    const permission = new Promise(resolve => { grant = resolve; });
    const h = createHarness({ getLocationPermissions: () => permission });
    const renderer = await h.render('screens/SpotDetailScreen.js', { location: true, props: spotProps(name) });
    await act(async () => renderer.unmount());
    await act(async () => grant({ granted: true }));
    assert.ok(!h.calls.some(([name]) => name === 'watchLocation'));
  });
}

for (const spot of detailedFallSpots) {
  test(`SpotDetailScreen renders ${spot.placeID} with its own title, address, tagline and photo state`, async () => {
    const h = createHarness();
    const renderer = await h.render('screens/SpotDetailScreen.js', { props: spotProps(spot.name) });
    const output = JSON.stringify(renderer.toJSON());
    for (const text of [spot.title, spot.detailAddress, spot.tagline]) assert.ok(output.includes(text), `${spot.placeID} shows ${text}`);
    const photo = auditedPhotoFiles[spot.name];
    if (photo) {
      assert.ok(fs.existsSync(path.join(__dirname, '../assets/Seasonal/fall', photo.file)));
      assert.ok(renderer.root.findAllByType('Image').some(image => String(image.props.source).endsWith(photo.file)));
      const links = renderer.root.findAllByType('Text')
        .filter(node => node.props.accessibilityRole === 'link').map(node => node.props.children);
      assert.deepEqual(links, [photo.author, photo.license].filter(Boolean));
      assert.ok(!output.includes('Photo coming soon'));
    } else {
      assert.ok(output.includes('Photo coming soon'));
    }
    await act(async () => renderer.unmount());
  });
}
test('SpotDetailScreen explains an unknown spot instead of querying reviews for it', async () => {
  const h = createHarness();
  const renderer = await h.render('screens/SpotDetailScreen.js', { props: spotProps('Unknown spot') });
  assert.match(JSON.stringify(renderer.toJSON()), /This spot isn’t available/);
  await act(async () => renderer.unmount());
});

test('Fall spots open directions to the audited venue entrances and meeting points', async () => {
  const destinations = {
    'Krause Berry Farms': '49.11321,-122.53729',
    'Willow View Farms': '49.00717,-122.2935',
    'Fort Langley Cranberry Festival': '49.16912,-122.5799',
    'UBC Apple Festival': '49.25429,-123.2504',
    'VanDusen Harvest Days': '49.23935,-123.12899',
    'Nitobe Memorial Garden': '49.26654,-123.25925',
    'Sun Yat-Sen Garden Moon Palace': '49.27987,-123.10425',
    'Darts Hill Garden Park': '49.03183,-122.75205',
    'VanDusen Mushroom Show': '49.23817,-123.12883',
    'Stewart Farm Harvest Fair': '49.06477,-122.84196',
    'Renfrew Ravine Moon Festival': '49.24455,-123.04703',
    'Haney House Apple Harvest Fest': '49.21307,-122.60225',
    'Granville Island Day of the Dead Market': '49.27002,-123.1351',
    'Burnaby Haunted Village': '49.24068,-122.96779',
    'Fright Nights at Playland': '49.28153,-123.03618',
    'Canyon Frights at Capilano': '49.34222,-123.11396',
    'Lost Souls of Gastown': '49.28452,-123.11044',
    'Haunted Halloween Trolley': '49.28713,-123.11512',
    'Bear Creek Halloween Train': '49.16272,-122.84106',
    'Cougar Creek House of Horrors': '49.1338,-122.87585',
    'Grave Tales at Fort Langley': '49.16867,-122.57279',
    'Steveston Scarecrow Crawl': '49.12531,-123.18014',
    'Central Spark': '49.23182,-123.01285',
    'Tynehead Hatchery': '49.17755,-122.76105',
    'Hoy Creek Hatchery': '49.28698,-122.79711',
    'Reifel Bird Sanctuary': '49.09803,-123.17839',
    'Kanaka Creek Fish Fence': '49.19936,-122.5584',
    'Wings Over Iona': '49.21896,-123.21339',
    'Hyde Creek Hatchery': '49.27853,-122.75974',
    'Boundary Bay Fall Bird Migration': '49.01562,-123.04177',
    'Buntzen Lake': '49.33766,-122.85702',
    'Queen Elizabeth Park': '49.2416,-123.11226',
    'Pacific Spirit Park': '49.27759,-123.22519',
    'Stanley Park': '49.29433,-123.13782',
    'Deer Lake Park': '49.2359,-122.96527',
    'Campbell Valley Park': '49.02974,-122.66083',
    'UBC Main Mall': '49.26768,-123.25492',
    'Trout Lake': '49.25599,-123.0654',
    'Burnaby Mountain Park': '49.28213,-122.93531',
    'Hadden Park': '49.27752,-123.14662',
  };
  for (const platform of ['ios', 'android']) {
    const h = createHarness({ platform });
    for (const [name, destination] of Object.entries(destinations)) {
      const renderer = await h.render('screens/SpotDetailScreen.js', { props: spotProps(name) });
      const button = renderer.root.findAllByType('TouchableOpacity').find(node => screenText(node).includes('Directions'));
      assert.ok(button, name);
      const previousLinks = h.calls.filter(([action]) => action === 'openURL').length;
      await act(async () => button.props.onPress());
      const links = h.calls.filter(([action]) => action === 'openURL');
      assert.equal(links.length, previousLinks + 1, name);
      const url = new URL(links.at(-1)[1]);
      assert.equal(url.hostname, platform === 'ios' ? 'maps.apple.com' : 'www.google.com', name);
      assert.equal(url.searchParams.get(platform === 'ios' ? 'daddr' : 'destination'), destination, name);
      await act(async () => renderer.unmount());
    }
  }
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
  for (const [name, { file }] of Object.entries(auditedPhotoFiles)) {
    assert.ok(detail(name).findAllByType('Image').some(image => String(image.props.source).endsWith(file)), name);
  }
  for (const spot of detailedFallSpots) assert.ok(auditedPhotoFiles[spot.name], spot.name);
  await act(async () => detail('Aldor Family Farm').props.onPress());
  await act(async () => detail('Reifel Bird Sanctuary').props.onPress());
  assert.deepEqual(h.navigations, ['Aldor Family Farm', 'Reifel Bird Sanctuary'].map(name => ['SpotDetailScreen', { spot: { k: 'c', name } }]));
  await act(async () => renderer.unmount());
});
test('catalogue spots without a bundled photo show the placeholder on the card and detail', async () => {
  const h = createHarness();
  const name = 'Blossom Garden';
  const list = await h.render('screens/SpringDatesScreen.js');
  const card = list.root.findAllByType('TouchableOpacity').find(node => node.props.accessibilityLabel === `View details for ${name}`);
  assert.ok(card);
  assert.equal(card.findAllByType('Image').length, 0);
  await act(async () => list.unmount());
  const detail = await h.render('screens/SpotDetailScreen.js', { props: spotProps(name) });
  assert.ok(JSON.stringify(detail.toJSON()).includes('Photo coming soon'));
  await act(async () => detail.unmount());
});

test('Seasons screen shows the same Fall count as the Fall list', async () => {
  const h = createHarness();
  const renderer = await h.render('screens/SeasonsScreen.js');
  assert.ok(JSON.stringify(renderer.toJSON()).includes(`"${fallSpotNames.length}"," Active Ideas"`));
  await act(async () => renderer.unmount());
});

for (const season of ['Fall', 'Winter', 'Spring', 'Summer']) {
  test(`${season} uses shared spot cards and accessible Spots and Map tabs`, async () => {
    const h = createHarness();
    const renderer = await h.render(`screens/${season}DatesScreen.js`);
    const cards = renderer.root.findAllByType(h.load('components/SpotCard.js').default);
    assert.ok(cards.length > 0, 'cards render');
    for (const card of cards) {
      const title = card.findAllByType('Text').find(node => node.props.children === card.props.spot.name);
      assert.equal(title.props.numberOfLines, 1, 'long titles stay on one line');
      assert.equal(title.props.adjustsFontSizeToFit, true, 'long titles shrink to fit');
      assert.ok(!card.props.spot.meta.includes(season), `the ${season} screen doesn't repeat the season on its cards`);
      const heart = card.findAllByType('TouchableOpacity').find(node => node.props.accessibilityLabel === `Save ${card.props.spot.name}`);
      assert.ok(heart, 'each card has its own save control');
    }
    const tabs = renderer.root.findAll(node => node.type === 'TouchableOpacity' && node.props.accessibilityRole === 'tab');
    assert.deepEqual(tabs.map(node => [node.props.accessibilityLabel, node.props.accessibilityState.selected]), [['Spots', true], ['Map', false]]);
    await act(async () => renderer.unmount());
  });
}

test('the city and Seasonal cards use the cover images from the assets folder', async () => {
  const h = createHarness();
  const picker = await h.render('screens/CitySelectionScreen.js', { props: { route: { name: 'ChooseCity' } } });
  const [cover, ...others] = picker.root.findAllByType('ImageBackground');
  assert.equal(others.length, 0, 'one card per city');
  assert.ok(String(cover.props.source).endsWith('assets/cities/VancouverCoverIMG.png'));
  assert.equal(cover.props.imageStyle.opacity, 0.9, 'the city image opacity is 10% lower');
  const washes = picker.root.findAll(node => node.type === 'View' && node.props.pointerEvents === 'none' && node.props.style && node.props.style.backgroundColor === 'rgba(255, 255, 255, 0.2)');
  assert.equal(washes.length, 1, 'the city card has a thin white layer over the image');
  await act(async () => picker.unmount());

  const home = await h.render('screens/HomeScreen.js');
  const featured = home.root.findAllByType('AnimatedImage').map(node => String(node.props.source));
  const tiles = home.root.findAllByType('ImageBackground').map(node => String(node.props.source));
  assert.equal(featured.length, 3, 'one picture per featured pick');
  assert.equal(tiles.length, 4, 'the four collections');
  assert.ok(tiles[0].endsWith('assets/VancouverSeasonalCollectionCover.png'), 'Seasonal keeps its own illustration');
  const sources = [...featured, ...tiles];
  assert.equal(new Set(sources).size, sources.length, 'no two cards share an illustration');
  await act(async () => home.unmount());
});

// Keep the original farm forecast coordinates as well as the catalogue venues.
const spotPages = [...legacyFallSpots, ...detailedFallSpots].map(spot => ({
  label: spot.placeID ?? spot.name, title: spot.title ?? spot.name, props: spotProps(spot.name),
  latitude: spot.latitude, longitude: spot.longitude,
}));
test('every Fall spot has a spot info page under test', () => assert.equal(spotPages.length, fallSpotNames.length));
for (const page of spotPages) {
  test(`${page.label}: shared title and a forecast for the spot without a GPS fix`, async () => {
    const h = createHarness();
    const renderer = await h.render('screens/SpotDetailScreen.js', { props: page.props });
    const title = renderer.root.findAllByType('Text').find(node => node.props.accessibilityRole === 'header' && node.props.children === page.title);
    assert.ok(title, 'one shared spot title');
    assert.equal(title.props.numberOfLines, 1, 'titles stay on one line');
    assert.equal(title.props.adjustsFontSizeToFit, true, 'long titles shrink to fit');
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
      const renderer = await h.render('screens/SpotDetailScreen.js', { props: page.props });
      assert.match(JSON.stringify(renderer.toJSON()), /Weather is unavailable right now/);
      assert.equal(renderer.root.findAllByType('ActivityIndicator').length, 0);
      await act(async () => renderer.unmount());
    } finally { console.error = realError; }
  });
}
test('a denied location permission is explained under the map on the shared page too, and tracking never starts', async () => {
  const h = createHarness({ getLocationPermissions: async () => ({ granted: false }) });
  const renderer = await h.render('screens/SpotDetailScreen.js', { location: true, props: spotProps('Richmond Country Farms') });
  assert.ok(!h.calls.some(([name]) => name === 'watchLocation'));
  assert.match(JSON.stringify(renderer.toJSON()), /Permission to access location was denied/);
  await act(async () => renderer.unmount());
});
