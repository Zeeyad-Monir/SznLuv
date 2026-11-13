// Choosing a city: the saved preference, the picker that guards the app, changing city from Home's header,
// and the city-scoped collections Home is built from.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHarness, act } = require('./renderHarness.cjs');
const { mount, textOf, quiet, flush } = require('./support.cjs');
const { CITIES, findCity, activeCities, isSelectableCity, catalogueSpots } = require('../services/catalogue');
const { selectedCityFrom, unavailableCityFrom, isNewAccount, withTimeout } = require('../services/cityPreference');
const {
  THEMES, collectionsForCity, collectionSpots, collectionSections, citySpotSections, homeCollections, featuredForCity,
} = require('../services/collections');

const vancouver = findCity('vancouver');
const user = { uid: 'audit', email: 'audit@example.com' };
const profile = { username: 'audit', email: 'audit@example.com', top4: { vancouver: { picks: [], public: false } } };

// A second city for one test: SznLuv has opened it, but it has no spots or collections yet.
async function withCity(city, run) {
  CITIES.push(city);
  try { return await run(city); } finally { CITIES.splice(CITIES.indexOf(city), 1); }
}
const toronto = { id: 'toronto', name: 'Toronto', latitude: 43.6532, longitude: -79.3832, active: true };

// ---------------------------------------------------------------- Cities and the saved preference (pure)

test('cities: one source of truth, and only an active city can be chosen', async () => {
  assert.deepEqual(activeCities().map(city => city.id), ['vancouver']);
  assert.equal(isSelectableCity('vancouver'), true);
  for (const value of ['atlantis', '', undefined, null, 7, {}]) assert.equal(isSelectableCity(value), false);
  assert.ok(catalogueSpots.every(spot => findCity(spot.cityId)), 'every spot belongs to a known city');
  await withCity({ ...toronto, active: false }, () => {
    assert.equal(isSelectableCity('toronto'), false, 'a city that is switched off cannot be chosen');
    assert.deepEqual(activeCities().map(city => city.id), ['vancouver']);
  });
});

test('city preference: only a city that can be chosen right now counts as saved', async () => {
  assert.equal(selectedCityFrom({ selectedCityId: 'vancouver' }), 'vancouver');
  for (const data of [undefined, null, {}, { selectedCityId: null }, { selectedCityId: 'atlantis' }, { selectedCityId: 3 }]) {
    assert.equal(selectedCityFrom(data), null);
    assert.equal(unavailableCityFrom(data), null);
  }
  await withCity({ ...toronto, active: false }, city => {
    assert.equal(selectedCityFrom({ selectedCityId: 'toronto' }), null);
    assert.equal(unavailableCityFrom({ selectedCityId: 'toronto' }), city, 'the picker can say which city went away');
  });
});

test('city preference: a new account is one made within the last day', () => {
  const now = Date.parse('2026-11-12T12:00:00Z');
  assert.equal(isNewAccount('Thu, 12 Nov 2026 11:55:00 GMT', now), true);
  assert.equal(isNewAccount('Tue, 10 Nov 2026 11:55:00 GMT', now), false);
  for (const missing of [undefined, null, 'not a date']) assert.equal(isNewAccount(missing, now), false);
});

test('city preference: a save that is never confirmed fails instead of hanging', async () => {
  assert.equal(await withTimeout(Promise.resolve('saved'), 20), 'saved');
  await assert.rejects(withTimeout(new Promise(() => {}), 20), { code: 'unavailable' });
  await assert.rejects(withTimeout(Promise.reject(Object.assign(new Error('no'), { code: 'permission-denied' })), 20), { code: 'permission-denied' });
});

// ---------------------------------------------------------------- City-scoped collections (pure)

test('themes: each gathers real catalogue categories, in its own city only', () => {
  const categories = new Set(catalogueSpots.map(spot => spot.category));
  for (const theme of THEMES) for (const category of theme.categories) assert.ok(categories.has(category), `${theme.key}: ${category}`);
  assert.deepEqual(collectionsForCity('vancouver', 'theme').map(collection => collection.id),
    ['vancouver-unique-food', 'vancouver-night-out', 'vancouver-outdoors']);

  const outdoors = collectionSpots('vancouver-outdoors');
  assert.ok(outdoors.length > 0);
  assert.deepEqual([...new Set(outdoors.map(spot => spot.category))].sort(), ['Fall Colour Walks', 'Salmon & Wildlife']);
  assert.deepEqual(collectionSections('vancouver-outdoors').map(section => section.title), ['Fall Colour Walks', 'Salmon & Wildlife']);
  assert.equal(collectionSections('vancouver-outdoors').flatMap(section => section.spots).length, outdoors.length);
  assert.deepEqual(collectionSpots('vancouver-unique-food'), []);
  assert.deepEqual(collectionSections('gone'), []);
});

test('all spots: every spot in the city once, a section per season; none for a city without spots', () => {
  const sections = citySpotSections('vancouver');
  assert.deepEqual(sections.map(section => section.title), ['Fall', 'Winter', 'Spring', 'Summer']);
  assert.equal(sections.flatMap(section => section.spots).length, catalogueSpots.length);
  assert.deepEqual(citySpotSections('toronto'), []);
});

test('home collections: cards that open come first, and an empty collection never claims to be available', () => {
  const cards = homeCollections('vancouver');
  assert.deepEqual(cards.map(card => [card.key, card.available]),
    [['seasonal', true], ['outdoors', true], ['unique-food', false], ['night-out', false]]);
  assert.deepEqual(cards[0].target, { screen: 'SeasonsScreen' });
  assert.deepEqual(cards[1].target, { screen: 'CollectionSpots', params: { collectionId: 'vancouver-outdoors' } });
  for (const card of cards) {
    if (card.key === 'seasonal') continue;
    assert.equal(card.available, collectionSpots(card.target.params.collectionId).length > 0, card.key);
  }
});

test('featured: a collection with spots, and nothing at all for a city that has none', async () => {
  assert.deepEqual(featuredForCity('vancouver'), {
    key: 'outdoors', art: 'morning-outdoors', title: 'A morning outdoors', subtitle: 'Explore the Outdoors collection',
    target: { screen: 'CollectionSpots', params: { collectionId: 'vancouver-outdoors' } },
  });
  await withCity(toronto, () => {
    assert.equal(featuredForCity('toronto'), null);
    assert.ok(homeCollections('toronto').every(card => !card.available));
  });
});

// ---------------------------------------------------------------- The gate (App.js)

// The app with its city picker drawn, so a test can use it the way a person would.
const routes = (h, app) => app.root.findAllByType(h.Screen).map(node => node.props.name);
const appButton = (app, label) => app.root.findAllByType('TouchableOpacity')
  .find(node => node.props.accessibilityLabel === label || textOf(node).join(' ') === label);
const tap = async (app, label) => {
  await act(async () => { await appButton(app, label).props.onPress(); });
  await flush();
};
const gated = options => createHarness({ user, renderScreens: ['ChooseCity'], ...options });

test('gate: a profile without a city gets the picker and nothing else, until the choice is saved', async () => {
  const main = { key: 'root', routes: [{ key: 'main', name: 'Main' }] };
  const h = gated({ documents: { 'users/audit': profile }, rootState: main, initialUrl: 'sznluv://u/maya' });
  const app = await h.render('App.js', { app: true });
  await flush();
  assert.deepEqual(routes(h, app), ['ChooseCity'], 'no tab, Settings or sheet is registered to navigate to');
  assert.deepEqual(h.dispatches, [], 'a link waits for the city too');
  assert.equal(appButton(app, 'Vancouver').props.accessibilityState.selected, false, 'the city is theirs to pick');

  await tap(app, 'Vancouver');
  assert.deepEqual(h.documents.get('users/audit'), profile, 'selecting a card saves nothing');
  await tap(app, 'Explore Vancouver');
  assert.deepEqual(h.documents.get('users/audit'), { ...profile, selectedCityId: 'vancouver' }, 'saved beside everything already there');
  assert.ok(routes(h, app).includes('Main') && !routes(h, app).includes('ChooseCity'));
  assert.equal(h.dispatches.length, 1, 'the waiting link opens once the app does');
  await act(async () => app.unmount());
});

test('gate: a saved city opens the app directly, and an unknown one asks again', async () => {
  const returning = gated({ documents: { 'users/audit': { ...profile, selectedCityId: 'vancouver' } } });
  let app = await returning.render('App.js', { app: true });
  assert.ok(routes(returning, app).includes('Main'));
  assert.ok(routes(returning, app).includes('CitySelection'), 'the city can be changed from inside the app');
  await act(async () => app.unmount());

  const stale = gated({ documents: { 'users/audit': { ...profile, selectedCityId: 'atlantis' } } });
  app = await stale.render('App.js', { app: true });
  assert.deepEqual(routes(stale, app), ['ChooseCity']);
  assert.equal(stale.documents.get('users/audit').selectedCityId, 'atlantis', 'nothing is rewritten until they choose');
  await act(async () => app.unmount());
});

test('gate: a failed save is not a chosen city', async () => {
  const h = gated({ documents: { 'users/audit': profile }, writeError: 'unavailable' });
  const app = await h.render('App.js', { app: true });
  await tap(app, 'Vancouver');
  await quiet(() => tap(app, 'Explore Vancouver'));
  assert.deepEqual(routes(h, app), ['ChooseCity']);
  assert.deepEqual(h.documents.get('users/audit'), profile);
  const alert = app.root.findAllByType('Text').find(node => node.props.accessibilityRole === 'alert');
  assert.deepEqual(textOf(alert), ["Couldn't save your city. Check your connection and try again."]);
  await act(async () => app.unmount());
});

test('gate: the next person on the same phone never inherits the last one\'s city', async () => {
  const h = gated({ documents: {
    'users/audit': { ...profile, selectedCityId: 'vancouver' }, 'users/second': { username: 'second' },
  } });
  const app = await h.render('App.js', { app: true });
  assert.ok(routes(h, app).includes('Main'));
  await act(async () => h.setUser(null));
  assert.ok(routes(h, app).includes('Login'));
  await act(async () => h.setUser({ uid: 'second', email: 'second@example.com' }));
  await flush();
  assert.deepEqual(routes(h, app), ['ChooseCity']);
  assert.equal(appButton(app, 'Vancouver').props.accessibilityState.selected, false);
  assert.equal(h.documents.get('users/second').selectedCityId, undefined);
  await tap(app, 'Sign out');
  assert.ok(routes(h, app).includes('Login'), 'and they are not stuck on the picker');
  await act(async () => app.unmount());
});

// ---------------------------------------------------------------- The picker

const picker = (h, name = 'ChooseCity') => mount(h, 'screens/CitySelectionScreen.js', { props: { route: { name } } });
const radios = screen => screen.all('TouchableOpacity').filter(node => node.props.accessibilityRole === 'radio');
const confirmButton = screen => screen.all('TouchableOpacity').find(node => node.props.accessibilityState?.busy !== undefined);
const changes = h => h.calls.filter(([name]) => name === 'changeCity').map(([, cityId]) => cityId);

test('picker, required: nothing is chosen for you, and the button saves the city you tapped', async () => {
  const h = createHarness({ city: null, cityChosen: false });
  const screen = await picker(h);
  assert.deepEqual(screen.texts().slice(0, 2), ['Choose your city', "Select where you'd like to start exploring SznLuv."]);
  assert.equal(screen.button('Back'), undefined, 'there is nowhere to go back to');
  assert.deepEqual(radios(screen).map(node => [node.props.accessibilityLabel, node.props.accessibilityState.selected]), [['Vancouver', false]]);
  assert.equal(confirmButton(screen).props.disabled, true);
  assert.equal(confirmButton(screen).props.accessibilityLabel, 'Choose a city');

  await screen.press('Vancouver');
  assert.equal(radios(screen)[0].props.accessibilityState.selected, true);
  assert.deepEqual(changes(h), [], 'tapping a card only selects it');
  await screen.press('Explore Vancouver');
  assert.deepEqual(changes(h), ['vancouver']);
  assert.deepEqual(h.dispatches, [], 'saving is what opens the app: the picker navigates nowhere itself');
  assert.equal(h.calls.some(([name]) => name === 'goBack'), false);
  await act(async () => screen.renderer.unmount());
});

test('picker, required: a new account is welcomed, and a city that went away is explained', async () => {
  const fresh = createHarness({ city: null, cityChosen: false });
  let screen = await mount(fresh, 'screens/CitySelectionScreen.js', {
    props: { route: { name: 'ChooseCity' } }, user: { ...user, metadata: { creationTime: new Date().toUTCString() } },
  });
  assert.deepEqual(screen.texts().slice(0, 2),
    ['Where should we explore?', 'Choose a city to discover spots, collections, and experiences near you.']);
  await act(async () => screen.renderer.unmount());

  const moved = createHarness({ city: null, cityChosen: false, unavailableCity: { ...toronto, active: false } });
  screen = await picker(moved);
  assert.equal(screen.texts()[0], 'Choose your city');
  assert.match(screen.texts()[1], /^Toronto isn't available right now\./);
  await act(async () => screen.renderer.unmount());
});

test('picker: a save that fails says so, keeps the choice and can be retried', async () => {
  const h = createHarness({ city: null, cityChosen: false, changeCityError: 'unavailable' });
  const screen = await picker(h);
  await screen.press('Vancouver');
  await quiet(() => screen.press('Explore Vancouver'));
  const alert = screen.all('Text').find(node => node.props.accessibilityRole === 'alert');
  assert.deepEqual(textOf(alert), ["Couldn't save your city. Check your connection and try again."]);
  assert.equal(radios(screen)[0].props.accessibilityState.selected, true);
  assert.equal(confirmButton(screen).props.disabled, false);
  await quiet(() => screen.press('Explore Vancouver'));
  assert.deepEqual(changes(h), ['vancouver', 'vancouver']);
  await act(async () => screen.renderer.unmount());
});

test('picker, required: signing out is always possible', async () => {
  const h = createHarness({ city: null, cityChosen: false });
  const screen = await picker(h);
  await screen.press('Sign out');
  assert.ok(h.calls.some(([name]) => name === 'logout'));
  await act(async () => screen.renderer.unmount());
});

test('picker, changing: the current city is marked, and keeping it just goes back', async () => {
  const h = createHarness();
  const screen = await picker(h, 'CitySelection');
  assert.equal(screen.texts()[0], 'Explore another city');
  assert.ok(screen.texts().includes('Current city'));
  assert.equal(screen.button('Sign out'), undefined);
  assert.deepEqual(radios(screen).map(node => [node.props.accessibilityLabel, node.props.accessibilityState.selected]),
    [['Vancouver, your current city', true]]);
  await screen.press('Keep Vancouver');
  assert.deepEqual(changes(h), [], 'nothing is saved or refreshed');
  assert.deepEqual(h.dispatches, []);
  assert.ok(h.calls.some(([name]) => name === 'goBack'));
  await act(async () => screen.renderer.unmount());
});

test('picker, changing: another city is saved, then the app starts again from Home', async () => {
  await withCity(toronto, async () => {
    const h = createHarness();
    h.load('services/catalogue.js').CITIES.push(toronto); // The app's own copy of the city list
    const screen = await picker(h, 'CitySelection');
    assert.deepEqual(radios(screen).map(node => node.props.accessibilityLabel), ['Vancouver, your current city', 'Toronto']);
    await screen.press('Toronto');
    await screen.press('Explore Toronto');
    assert.deepEqual(changes(h), ['toronto']);
    assert.deepEqual(h.dispatches, [{ type: 'RESET', payload: { index: 0, routes: [{ name: 'Main' }] } }],
      'no tab is left on a page from the old city');
    await act(async () => screen.renderer.unmount());
  });
});

// ---------------------------------------------------------------- The header and Home

async function topBar(h, index, nested) {
  const names = ['HomeTab', 'ExploreTab', 'MapTab', 'FavouritesTab', 'ProfileTab'];
  const state = { index, routes: names.map((name, i) => ({ key: `${name}-key`, name, state: i === index ? nested : undefined })) };
  const navigated = [];
  const renderer = await h.render('components/NavBar.js', {
    props: { state, navigation: { navigate: name => navigated.push(name), dispatch() {}, emit: () => ({}) }, insets: { top: 62, bottom: 34, left: 0, right: 0 } },
  });
  const control = label => renderer.root.findAllByType('TouchableOpacity').find(node => node.props.accessibilityLabel === label);
  return { renderer, control, navigated };
}
const stack = names => ({ key: 'stack', index: names.length - 1, routes: names.map(name => ({ key: name, name })) });

test('header: the city sits beside Settings on Home, opens the picker, and steps aside elsewhere', async () => {
  const h = createHarness();
  const home = await topBar(h, 0);
  assert.equal(home.control('City: Vancouver').props.accessibilityRole, 'button');
  assert.ok(home.control('Settings'), 'Settings stays where it was');
  await act(async () => home.control('City: Vancouver').props.onPress());
  assert.deepEqual(home.navigated, ['CitySelection']);
  await act(async () => home.renderer.unmount());

  const nested = await topBar(h, 0, stack(['Home', 'SeasonsScreen']));
  assert.equal(nested.control('City: Vancouver').props.disabled, true, 'a page under Home shows its back button instead');
  await act(async () => nested.renderer.unmount());

  const explore = await topBar(h, 1);
  assert.equal(explore.control('City: Vancouver'), undefined);
  assert.ok(explore.control('Settings'));
  await act(async () => explore.renderer.unmount());
});

test('Home: a collection with nothing in it is labelled, not pressable', async () => {
  const h = createHarness();
  const screen = await mount(h, 'screens/HomeScreen.js');
  const soon = screen.all('View').filter(node => /coming soon$/.test(node.props.accessibilityLabel ?? ''));
  assert.deepEqual(soon.map(node => node.props.accessibilityLabel), ['Unique Food, coming soon', 'Night Out, coming soon']);
  for (const card of soon) assert.equal(card.findAllByType('TouchableOpacity').length, 0);
  assert.equal(screen.button('Unique Food collection'), undefined);
  await act(async () => screen.renderer.unmount());
});

test('Home: a city with no spots says so and offers another city, with no cards that lead nowhere', async () => {
  await withCity(toronto, async city => {
    const h = createHarness({ city });
    const screen = await mount(h, 'screens/HomeScreen.js');
    assert.deepEqual(screen.texts(), [
      'What sounds good?', 'Nothing in Toronto yet',
      "We're still adding spots here. You can explore another city in the meantime.", 'Choose another city',
    ]);
    await screen.press('Choose another city');
    assert.deepEqual(h.navigations, [['CitySelection']]);
    await act(async () => screen.renderer.unmount());
  });
});

test('collection and all-spots pages list real spots, and an empty or unknown collection opens no blank page', async () => {
  const h = createHarness();
  let screen = await mount(h, 'screens/CollectionSpotsScreen.js', { params: { collectionId: 'vancouver-outdoors' } });
  let texts = screen.texts();
  assert.equal(texts[0], 'Outdoors');
  for (const expected of ['Fall Colour Walks', 'Salmon & Wildlife', collectionSpots('vancouver-outdoors')[0].name]) assert.ok(texts.includes(expected), expected);
  assert.ok(screen.all('TextInput').some(node => node.props.accessibilityLabel === 'Search spots'), 'the same search as a season page');
  await act(async () => screen.renderer.unmount());

  for (const collectionId of ['vancouver-unique-food', 'gone', undefined]) {
    screen = await mount(h, 'screens/CollectionSpotsScreen.js', { params: { collectionId } });
    assert.equal(screen.texts()[0], 'Nothing here yet');
    await screen.press('Back');
    await act(async () => screen.renderer.unmount());
  }
  assert.equal(h.calls.filter(([name]) => name === 'goBack').length, 3);

  screen = await mount(h, 'screens/CitySpotsScreen.js');
  texts = screen.texts();
  assert.equal(texts[0], 'Vancouver spots');
  for (const season of ['Fall', 'Winter', 'Spring', 'Summer']) assert.ok(texts.includes(season), season);
  await act(async () => screen.renderer.unmount());
});

// ---------------------------------------------------------------- No screen names a city itself

test('screens and components read the chosen city, never a hardcoded one', () => {
  const root = path.join(__dirname, '..');
  const files = ['App.js', ...['screens', 'components', 'navigation', 'hooks', 'contexts']
    .flatMap(folder => fs.readdirSync(path.join(root, folder)).filter(name => name.endsWith('.js')).map(name => path.join(folder, name)))];
  for (const file of files) {
    // Comments may name the city; code may not.
    const source = fs.readFileSync(path.join(root, file), 'utf8').split('\n').filter(line => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line)).join('\n');
    assert.equal(/DEFAULT_CITY/.test(source), false, `${file} uses DEFAULT_CITY`);
    assert.equal(/['"`>]\s*(Explore |All )?Vancouver\b/.test(source), false, `${file} spells out Vancouver`);
  }
});
