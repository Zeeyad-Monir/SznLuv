// Photos of spots people make: picking, shrinking, uploading with progress, order, failures, clean-up.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, act } = require('./renderHarness.cjs');
const { mount, flush, quiet } = require('./support.cjs');

const big = name => ({ uri: `file:///${name}.jpg`, width: 4000, height: 3000 });
const tall = name => ({ uri: `file:///${name}.jpg`, width: 1000, height: 3000 });
const picked = (...assets) => async () => ({ canceled: false, assets });
const base = { 'users/audit': { username: 'audit' }, 'favourites/audit': { listsMigratedAt: 1 } };
const record = (extra = {}) => ({
  ownerUid: 'audit', name: 'Hidden Sunset Viewpoint', lat: 49.2865, lng: -123.112, photos: [], publicListIds: [], createdAt: 1, updatedAt: 1, ...extra,
});
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 520)); });
const uploads = h => h.calls.filter(([name]) => name === 'upload').map(([, path]) => path);
const nameAndPin = async screen => {
  await act(async () => screen.all('TextInput')[0].props.onChangeText('Hidden Sunset Viewpoint'));
  await act(async () => screen.renderer.root.findByType('MapView').props.onRegionChangeComplete({ latitude: 49.2865, longitude: -123.112 }, { isGesture: true }));
};
const actionOn = async (screen, label, action) => {
  const node = screen.button(label);
  assert.ok(node, label);
  await act(async () => node.props.onAccessibilityAction({ nativeEvent: { actionName: action } }));
};

test('photos: up to three, shrunk to 1600px and uploaded under the spot as soon as they are picked', async () => {
  const h = createHarness({ documents: base, pickPhotos: picked(big('a'), tall('b')) });
  const screen = await mount(h, 'screens/OwnSpotScreen.js', { params: { from: 'saved' } });
  await settle();
  await screen.press('Add photos');
  await flush();
  const [, config] = h.calls.find(([name]) => name === 'pickPhotos');
  assert.deepEqual([config.selectionLimit, config.allowsMultipleSelection, config.mediaTypes], [3, true, ['images']]);
  const shrinks = h.calls.filter(([name]) => name === 'shrink');
  assert.deepEqual(shrinks.map(([, , actions]) => actions), [[{ resize: { width: 1600 } }], [{ resize: { height: 1600 } }]]);
  assert.deepEqual(shrinks[0][3], { compress: 0.8, format: 'jpeg' });
  const paths = uploads(h);
  assert.equal(paths.length, 2);
  assert.ok(paths.every(path => /^spotPhotos\/audit\/audit_[^/]+\/[^/]+\.jpg$/.test(path)), paths.join(' '));
  assert.ok(screen.button('Photo 1 of 2, cover') && screen.button('Photo 2 of 2'));
  assert.ok(screen.button('Add another photo'), 'room for one more');

  // The second becomes the cover; the order is what the spot keeps.
  await actionOn(screen, 'Photo 2 of 2', 'cover');
  await nameAndPin(screen);
  await screen.press('Save spot');
  const [key] = [...h.documents.keys()].filter(path => path.startsWith('spots/'));
  const spotId = key.slice('spots/'.length);
  assert.ok(paths.every(path => path.includes(`/${spotId}/`)), 'photos upload under the spot\'s own ID');
  assert.deepEqual(h.documents.get(key).photos.map(photo => photo.path), [paths[1], paths[0]]);
});

test('photos: a full set offers no more; removing one frees a slot and its file goes once saved', async () => {
  const h = createHarness({ documents: base, pickPhotos: picked(big('a'), big('b'), big('c')) });
  const screen = await mount(h, 'screens/OwnSpotScreen.js', { params: { from: 'saved' } });
  await settle();
  await screen.press('Add photos');
  await flush();
  assert.equal(screen.button('Add another photo'), undefined);
  const removed = uploads(h)[1];
  await screen.press('Remove photo 2');
  assert.ok(screen.button('Add another photo'));
  await nameAndPin(screen);
  await screen.press('Save spot');
  await flush();
  const [key] = [...h.documents.keys()].filter(path => path.startsWith('spots/'));
  assert.equal(h.documents.get(key).photos.length, 2);
  assert.ok(h.calls.some(([name, path]) => name === 'deletePhoto' && path === removed), 'the removed upload is cleaned up');
  assert.equal(h.files.has(removed), false);
});

test('photos: Save waits for uploads, and a failed upload can be retried or removed', async () => {
  const h = createHarness({ documents: base, pickPhotos: picked(big('a')), holdUploads: true });
  const screen = await mount(h, 'screens/OwnSpotScreen.js', { params: { from: 'saved' } });
  await settle();
  await nameAndPin(screen);
  await screen.press('Add photos');
  await flush();
  assert.ok(screen.button('Photo 1 of 1, cover, uploading'));
  assert.ok(screen.texts().includes('0%'));
  const saveButton = screen.all('TouchableOpacity').find(node => node.props.accessibilityState?.disabled === true);
  assert.ok(saveButton, 'Save is disabled while a photo uploads');
  assert.ok(screen.texts().includes('Uploading photos…'));
  await act(async () => h.finishUploads());
  await flush();
  assert.ok(screen.button('Photo 1 of 1, cover'));
  assert.ok(screen.texts().includes('Save spot'));

  const failing = createHarness({ documents: base, pickPhotos: picked(big('a')), uploadError: 'storage/unauthorized' });
  await quiet(async () => {
    const broken = await mount(failing, 'screens/OwnSpotScreen.js', { params: { from: 'saved' } });
    await settle();
    await nameAndPin(broken);
    await broken.press('Add photos');
    await flush();
    assert.ok(broken.button('Photo 1 of 1, cover, upload failed'));
    assert.ok(broken.texts().some(line => line.includes('Upload failed.')));
    await broken.press('Save spot');
    assert.ok(broken.texts().includes('A photo didn’t upload. Retry it, or remove it.'));
    assert.equal([...failing.documents.keys()].some(path => path.startsWith('spots/')), false, 'nothing saved with a broken photo');
    await broken.press('Retry photo 1');
    await flush();
    assert.ok(broken.button('Photo 1 of 1, cover, upload failed'), 'still failing');
    await broken.press('Remove photo 1');
    await broken.press('Save spot');
    assert.equal([...failing.documents.keys()].filter(path => path.startsWith('spots/')).length, 1);
  });
});

test('photos: a photo too large even after shrinking is refused with a reason', async () => {
  const h = createHarness({ documents: base, pickPhotos: picked(big('a')), photoBytes: 6 * 1024 * 1024 });
  await quiet(async () => {
    const screen = await mount(h, 'screens/OwnSpotScreen.js', { params: { from: 'saved' } });
    await settle();
    await screen.press('Add photos');
    await flush();
    assert.ok(screen.texts().some(line => line.includes('That photo is too large, even after shrinking it.')));
    assert.deepEqual(uploads(h), []);
  });
});

test('photos: discarding a new spot deletes what was uploaded for it', async () => {
  const h = createHarness({ documents: base, pickPhotos: picked(big('a')) });
  const screen = await mount(h, 'screens/OwnSpotScreen.js', { params: { from: 'saved' } });
  await settle();
  await screen.press('Add photos');
  await flush();
  const [path] = uploads(h);
  h.leave();
  const [, , choices] = h.alerts.at(-1);
  await act(async () => { choices[1].onPress(); });
  await flush();
  assert.equal(h.files.has(path), false);
});

test('photos: editing keeps the saved ones in order, and a replaced photo is cleaned up after saving', async () => {
  const saved = [{ id: 'p1', path: 'spotPhotos/audit/audit_sunset/p1.jpg' }, { id: 'p2', path: 'spotPhotos/audit/audit_sunset/p2.jpg' }];
  const h = createHarness({
    documents: { ...base, 'spots/audit_sunset': record({ photos: saved }) },
    files: Object.fromEntries(saved.map(photo => [photo.path, { size: 1 }])),
    pickPhotos: picked(big('new')),
  });
  const screen = await mount(h, 'screens/OwnSpotScreen.js', { params: { spotId: 'audit_sunset' } });
  await settle();
  assert.ok(screen.button('Photo 1 of 2, cover') && screen.button('Photo 2 of 2'));
  await actionOn(screen, 'Photo 1 of 2, cover', 'replace');
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  await screen.press('Save changes');
  await flush();
  const photos = h.documents.get('spots/audit_sunset').photos;
  assert.equal(photos.length, 2);
  assert.notEqual(photos[0].path, saved[0].path);
  assert.equal(photos[1].path, saved[1].path);
  assert.equal(h.files.has(saved[0].path), false, 'the replaced photo is gone');
  assert.ok(h.files.has(saved[1].path));
});
