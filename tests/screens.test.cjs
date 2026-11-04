const { test } = require('node:test');
const assert = require('node:assert/strict');
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
  assert.ok(renderer.root.findAllByType(h.Screen).some(node => node.props.name === 'Home'));
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
    const cards = renderer.root.findAll(node => node.type === 'AnimatedView' && [].concat(node.props.style).some(style => style && style.borderRadius === 14));
    assert.ok(cards.length > 0, 'cards render');
    const heights = new Set(cards.map(card => [].concat(card.props.style).find(style => style && style.borderRadius === 14).height));
    assert.deepEqual([...heights], [64], 'every card has the same fixed height');
    const gaps = new Set(cards.map(card => [].concat(card.props.style).find(style => style && style.borderRadius === 14).marginBottom));
    assert.deepEqual([...gaps], [21], 'space between cards is 15% more than the original 18');
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
