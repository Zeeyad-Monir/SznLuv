const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, act } = require('./renderHarness.cjs');

for (const screen of ['LoginScreen', 'SignUpScreen', 'HomeScreen', 'FallDatesScreen', 'WinterDatesScreen', 'SpringDatesScreen', 'SummerDatesScreen', 'Favourites', 'SeasonalFavourites', 'CustomCollectionScreen', 'SpinTheWheel', 'ProfileSettings', 'AldorFamilyFarmScreen', 'LaityPumpkinPatch', 'EagleAcresDairy']) {
  test(`${screen} renders with an authenticated test profile`, async () => {
    const h = createHarness();
    const renderer = await h.render('screens/' + screen + '.js');
    assert.ok(renderer.toJSON());
    await act(async () => renderer.unmount());
  });
}
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
