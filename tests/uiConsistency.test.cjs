const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { createHarness, act } = require('./renderHarness.cjs');
const { mount, textOf } = require('./support.cjs');
const { catalogueRef } = require('../services/catalogue');
const { createList, addSpot, toPublicSnapshot } = require('../services/listsState');

const farm = catalogueRef('Aldor Family Farm');
const cafe = { k: 'x', id: 'maya_cafe', owner: 'maya', name: 'Corner Café', lat: 49.3, lng: -123.1 };
const publicCafe = {
  ownerUid: 'maya', ownerUsername: 'maya', name: cafe.name, lat: 49.2, lng: -123.2,
  description: 'Quiet patio', address: '12 Main St', photos: [{ id: 'p1', path: 'spotPhotos/maya/maya_cafe/p1.jpg' }],
};
const base = { 'users/audit': { username: 'audit' }, 'favourites/audit': { listsMigratedAt: 1 } };
const list = [farm, cafe].reduce((draft, ref) => addSpot(draft, ref), createList({ title: 'Weekend', ownerUid: 'maya', now: 1 }));
const published = toPublicSnapshot(list, { ownerUsername: 'maya', now: 2 });
const openList = h => mount(h, 'screens/ListScreen.js', { params: { listId: 'weekend' } });

test('public map uses verified locations and distinguishes pending, failed and withdrawn copies', async () => {
  const reads = [];
  const h = createHarness({
    documents: { ...base, 'publicLists/weekend': published, 'publicSpots/maya_cafe': publicCafe },
    onListen(listener, snapshot) {
      if (listener.ref.path !== 'publicSpots/maya_cafe') return false;
      reads.push({ ...listener, snapshot });
      listener.next({ ...snapshot, metadata: { ...snapshot.metadata, fromCache: true } });
      return true;
    },
  });
  const screen = await openList(h);
  await screen.press('Map');
  assert.equal(screen.all('Marker').length, 1);
  assert.ok(screen.texts().includes('Checking locations…'));

  await act(async () => reads[0].error({ code: 'unavailable' }));
  assert.equal(screen.all('Marker').length, 1);
  assert.ok(screen.texts().includes('Couldn’t check some locations'));
  await screen.press('Try again');
  await act(async () => reads[1].next(reads[1].snapshot));
  assert.deepEqual(screen.all('Marker')[1].props.coordinate, { latitude: 49.2, longitude: -123.2 });
  assert.equal(screen.texts().includes('Checking locations…'), false);

  await act(async () => reads[1].next({ ...reads[1].snapshot, metadata: { fromCache: true } }));
  assert.equal(screen.all('Marker').length, 1, 'a cache-only reconnect hides previously verified pins');
  await act(async () => reads[1].next({ ...reads[1].snapshot, exists: () => false }));
  assert.equal(screen.all('Marker').length, 1);
  assert.ok(screen.texts().includes('1 of 2 spots on the map'));
  await screen.press('Spots');
  assert.ok(screen.button('View details for Corner Café'));
  assert.equal(screen.all('Image').some(image => image.props.source?.uri?.includes('maya_cafe')), false);
  await act(async () => screen.renderer.unmount());
});

test('public spot lookup rejects a record owned by someone other than the referenced creator', async () => {
  const h = createHarness({ documents: {
    ...base, 'publicLists/weekend': published, 'publicSpots/maya_cafe': { ...publicCafe, ownerUid: 'wrong' },
  } });
  const screen = await openList(h);
  await screen.press('Map');
  assert.equal(screen.all('Marker').length, 1);
  assert.ok(screen.texts().includes('1 of 2 spots on the map'));
  const detail = await mount(h, 'screens/SpotDetailScreen.js', { params: { spot: cafe } });
  assert.ok(detail.texts().includes('This spot isn’t available'));
  assert.equal(detail.button('Directions'), undefined);
  assert.equal(detail.texts().includes(publicCafe.description), false);
  await act(async () => { screen.renderer.unmount(); detail.renderer.unmount(); });
});

test('switching accounts clears previously verified public spot details before the new listener responds', async () => {
  const reads = [];
  const h = createHarness({
    documents: { ...base, 'publicSpots/maya_cafe': publicCafe },
    onListen(listener, snapshot) {
      if (listener.ref.path !== 'publicSpots/maya_cafe') return false;
      reads.push({ ...listener, snapshot });
      return true;
    },
  });
  const Detail = h.load('screens/SpotDetailScreen.js').default;
  const { AuthContext } = h.load('contexts/AuthContext.js');
  const { SettingsContext } = h.load('screens/SettingsContext.js');
  const tree = uid => React.createElement(AuthContext.Provider, { value: { user: { uid } } },
    React.createElement(SettingsContext.Provider, { value: { isLocationEnabled: false } },
      React.createElement(Detail, { navigation: h.navigation, route: { params: { spot: cafe } } })));
  const renderer = await h.renderElement(tree('audit'));
  await act(async () => reads[0].next(reads[0].snapshot));
  assert.ok(textOf(renderer.root).includes(publicCafe.description));
  await act(async () => renderer.update(tree('other')));
  assert.equal(textOf(renderer.root).includes(publicCafe.description), false);
  await act(async () => {
    reads[0].next(reads[0].snapshot);
    reads[1].next({ ...reads[1].snapshot, metadata: { fromCache: true } });
  });
  assert.equal(textOf(renderer.root).includes(publicCafe.description), false);
  await act(async () => reads[1].next({ ...reads[1].snapshot, exists: () => false }));
  assert.ok(textOf(renderer.root).includes('This spot isn’t available'));
  await act(async () => renderer.unmount());
});

test('season Map uses the same filtered ordering and search results as Spots', async () => {
  const h = createHarness();
  const screen = await mount(h, 'screens/FallDatesScreen.js');
  await act(async () => screen.all('TextInput')[0].props.onChangeText('pumpkin'));
  const cards = screen.all(h.load('components/SpotCard.js').default).map(card => card.props.spot.name);
  assert.ok(cards.length > 1);
  await screen.press('Map');
  assert.deepEqual(screen.all('Marker').map(marker => marker.props.title), cards);
  await act(async () => screen.all('TextInput')[0].props.onChangeText('Reifel'));
  assert.deepEqual(screen.all('Marker').map(marker => marker.props.title), ['Reifel Bird Sanctuary']);
  await screen.press('Map spot 1, Reifel Bird Sanctuary');
  assert.deepEqual(h.navigations.at(-1), ['SpotDetailScreen', { spot: catalogueRef('Reifel Bird Sanctuary') }]);
  assert.equal(screen.button('Map').props.accessibilityState.selected, true);
  await screen.press('Spots');
  assert.equal(screen.all('TextInput')[0].props.value, 'Reifel');
  assert.ok(screen.button('View details for Reifel Bird Sanctuary'));
  await act(async () => screen.renderer.unmount());
});

test('the shared detail layout orders venue and personal content and offers address-only directions', async () => {
  const privateRef = { ...cafe, id: 'audit_cafe', owner: 'audit' };
  const h = createHarness({ documents: {
    ...base,
    'spots/audit_cafe': {
      ...publicCafe, ownerUid: 'audit', photos: [{ id: 'p1', path: 'spotPhotos/audit/audit_cafe/p1.jpg' }],
      lat: undefined, lng: undefined, hours: '8 to 5', tips: 'Sit on the patio', publicListIds: [],
    },
  } });
  const open = spot => mount(h, 'screens/SpotDetailScreen.js', { params: { spot } });
  const venue = await open(catalogueRef('Richmond Country Farms'));
  const personal = await open(privateRef);
  for (const [screen, name, photoCount] of [[venue, 'Richmond Country Farms', 0], [personal, cafe.name, 1]]) {
    const words = screen.texts();
    const sequence = [name, 'Directions', 'Add to list', 'About', 'Good to know', 'Location'];
    const positions = sequence.map(label => words.indexOf(label));
    assert.ok(positions.every((position, index) => position >= 0 && (!index || position > positions[index - 1])));
    assert.equal(screen.all(h.load('components/spot/PhotoGallery.js').default)[0].props.photos?.length ?? 0, photoCount);
  }
  assert.ok(venue.texts().indexOf('Weather') > venue.texts().indexOf('Location'));
  assert.ok(venue.texts().indexOf('Reviews') > venue.texts().indexOf('Weather'));
  assert.equal(personal.all('MapView').length, 0);
  await personal.press('Directions');
  assert.deepEqual(h.calls.at(-1), ['openURL', 'http://maps.apple.com/?daddr=12%20Main%20St']);
  await personal.press('Add photos');
  assert.deepEqual(h.navigations.at(-1), ['OwnSpotScreen', { spotId: 'audit_cafe' }]);
  const sparse = await open(catalogueRef('Glacier Rink'));
  assert.ok(sparse.texts().includes('Glacier Rink'));
  assert.equal(sparse.button('Directions'), undefined);
  await act(async () => { venue.renderer.unmount(); personal.renderer.unmount(); sparse.renderer.unmount(); });
});

test('legacy venues keep their photos and only Aldor uses the legacy review history', async () => {
  const h = createHarness({ documents: {
    ...base, 'reviews/old-aldor': { placeID: 'aldor_farm', username: 'sam', comment: 'Great hayride', starRating: 5, timestamp: 1 },
  } });
  for (const [name, photo] of [[farm.name, 'FamilyFarm.jpg'], ['Laity Pumpkin Patch', 'Laity.png'], ['Eagle Acres Dairy', 'EagleAcres.png']]) {
    const screen = await mount(h, 'screens/SpotDetailScreen.js', { params: { spot: catalogueRef(name) } });
    assert.ok(screen.all('Image').some(image => String(image.props.source).endsWith(photo)));
    assert.equal(screen.texts().includes('Reviews'), name === farm.name);
    assert.equal(screen.texts().includes('Great hayride'), name === farm.name);
    await act(async () => screen.renderer.unmount());
  }
});

test('spot pages copy the address beside the map, and pinned custom spots get the same weather section', async () => {
  const pinned = { ...cafe, id: 'audit_pinned', owner: 'audit', lat: 49.3, lng: -123.1 };
  const h = createHarness({ documents: {
    ...base,
    'spots/audit_pinned': { ...publicCafe, ownerUid: 'audit', lat: 49.3, lng: -123.1, photos: [], publicListIds: [] },
  } });
  const open = spot => mount(h, 'screens/SpotDetailScreen.js', { params: { spot } });
  const venue = await open(farm);
  await venue.press('Copy address');
  assert.deepEqual(h.calls.filter(([name]) => name === 'setClipboard').at(-1), ['setClipboard', '24990 84 Ave, Langley, BC']);
  const personal = await open(pinned);
  const words = personal.texts();
  assert.ok(words.indexOf('Weather') > words.indexOf('Location') && words.indexOf('Location') >= 0);
  await personal.press('Copy address');
  assert.deepEqual(h.calls.filter(([name]) => name === 'setClipboard').at(-1), ['setClipboard', '12 Main St']);
  await act(async () => { venue.renderer.unmount(); personal.renderer.unmount(); });
});
