const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, act } = require('./renderHarness.cjs');
const { mount, flush, quiet } = require('./support.cjs');
const { catalogueRef } = require('../services/catalogue');

const user = { uid: 'audit', getIdToken: async () => 'viewer-token' };
const firstId = 'p'.repeat(20);
const avatar = id => `profilePhotos/audit/${id}.jpg`;
const details = { username: 'audit', bio: 'Long evenings.', avatarColor: '#A7C8FF', top4: { vancouver: [catalogueRef('Aldor Family Farm')] } };
const documents = { 'users/audit': { username: 'audit' }, 'profiles/audit': details, 'favourites/audit': { listsMigratedAt: 1 } };
const chosen = { uri: 'file:///new-avatar.jpg', width: 1400, height: 1400 };
const pick = async () => ({ canceled: false, assets: [chosen] });
const edit = (h, avatarPhotoId) => mount(h, 'screens/EditProfileSheet.js', { params: { ...details, avatarPhotoId } });

test('a chosen photo stays local until Save, then appears on both profiles using the viewer token', async () => {
  const h = createHarness({ documents, pickPhotos: pick, holdUploads: true, user });
  const sheet = await edit(h);
  await sheet.press('Choose photo');
  assert.deepEqual(sheet.all('Image')[0].props.source, { uri: chosen.uri });
  assert.equal(h.files.size, 0);
  const [, picker] = h.calls.find(([name]) => name === 'pickPhotos');
  assert.deepEqual([picker.mediaTypes, picker.allowsEditing, picker.aspect], [['images'], true, [1, 1]]);

  let save;
  await act(async () => { save = sheet.button('Save').props.onPress(); });
  await flush();
  assert.equal(h.documents.get('profiles/audit').avatarPhotoId, undefined, 'the reference waits for the upload');
  assert.equal(sheet.button('Saving…').props.disabled, true);
  h.leave();
  assert.deepEqual(h.dispatches, []);
  await act(async () => { h.finishUploads(); await save; });

  const { avatarPhotoId } = h.documents.get('profiles/audit');
  assert.match(avatarPhotoId, /^[a-zA-Z0-9]{20}$/);
  assert.deepEqual(h.documents.get('profiles/audit'), { ...details, avatarPhotoId });
  assert.equal(h.files.get(avatar(avatarPhotoId)).contentType, 'image/jpeg');
  assert.deepEqual(h.calls.find(([name]) => name === 'shrink')[2], [{ resize: { width: 512 } }]);
  assert.ok(h.calls.some(([name]) => name === 'goBack'));

  const owner = await mount(h, 'screens/ProfileScreen.js');
  const visitor = await mount(h, 'screens/PersonScreen.js', { params: { uid: 'audit' }, user: { uid: 'viewer' } });
  for (const page of [owner, visitor]) {
    const image = page.all('Image').find(node => node.props.accessibilityLabel === 'audit’s profile photo');
    assert.deepEqual(image.props.source, { uri: 'https://storage.test/' + encodeURIComponent(avatar(avatarPhotoId)), headers: { Authorization: 'Firebase viewer-token' } });
  }
  const image = () => visitor.all('Image').find(node => node.props.accessibilityLabel === 'audit’s profile photo');
  await act(async () => image().props.onError());
  await act(async () => image().props.onError());
  assert.ok(visitor.texts().includes('A'), 'an unavailable photo falls back to the initial');
});

test('a photo replacement and removal preserve identity and Top 4 and clean up old files', async () => {
  const h = createHarness({ user, pickPhotos: pick, files: { [avatar(firstId)]: {} },
    documents: { ...documents, 'profiles/audit': { ...details, avatarPhotoId: firstId } } });
  const sheet = await edit(h, firstId);
  await sheet.press('Change photo');
  await sheet.press('Save');
  const nextId = h.documents.get('profiles/audit').avatarPhotoId;
  assert.notEqual(nextId, firstId);
  assert.equal(h.files.has(avatar(firstId)), false);
  assert.equal(h.files.has(avatar(nextId)), true);

  const removal = await edit(h, nextId);
  await removal.press('Remove photo');
  assert.ok(removal.texts().includes('A'));
  assert.equal(h.documents.get('profiles/audit').avatarPhotoId, nextId, 'removal is still a draft');
  await removal.press('Save');
  assert.deepEqual(h.documents.get('profiles/audit'), details);
  assert.equal(h.files.size, 0);
});

test('cancelling the picker or sheet does not upload or change the saved photo', async () => {
  const h = createHarness({ user, files: { [avatar(firstId)]: {} },
    documents: { ...documents, 'profiles/audit': { ...details, avatarPhotoId: firstId } }, pickPhotos: (() => {
      let picked = false;
      return () => picked ? pick() : (picked = true, { canceled: true });
    })() });
  const sheet = await edit(h, firstId);
  await sheet.press('Change photo');
  assert.ok(sheet.all('Image')[0].props.source.uri.includes(firstId));
  await sheet.press('Change photo');
  await sheet.press('Close Edit profile');
  assert.ok(h.calls.some(([name]) => name === 'goBack'));
  assert.ok(!h.calls.some(([name]) => name === 'upload' || name === 'deletePhoto'));
  assert.equal(h.documents.get('profiles/audit').avatarPhotoId, firstId);
});

test('a failed upload or profile write keeps the previous photo and allows retry', async () => {
  for (const error of [{ uploadError: 'storage/unauthorized' }, { writeError: 'permission-denied' }]) {
    const h = createHarness({ user, pickPhotos: pick, ...error, files: { [avatar(firstId)]: {} },
      documents: { ...documents, 'profiles/audit': { ...details, avatarPhotoId: firstId } } });
    const sheet = await edit(h, firstId);
    await sheet.press('Change photo');
    await quiet(() => sheet.press('Save'));
    assert.ok(sheet.texts().includes('Couldn’t save. Check your connection and try again.'));
    assert.equal(sheet.button('Save').props.disabled, false);
    assert.ok(!h.calls.some(([name]) => name === 'goBack'));
    assert.deepEqual(h.documents.get('profiles/audit'), { ...details, avatarPhotoId: firstId });
    assert.deepEqual([...h.files.keys()], [avatar(firstId)]);
  }
});
