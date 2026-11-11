// Storage rules for spot photos, checked against the Storage and Firestore emulators together: a photo is
// readable by others only while its spot has a public copy. Run with: npm run test:rules
const test = require('node:test');
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, setDoc, deleteDoc } = require('firebase/firestore');
const { ref, uploadBytes, getMetadata, deleteObject, listAll } = require('firebase/storage');

const root = path.join(__dirname, '..', '..');
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9]);
const asJpeg = { contentType: 'image/jpeg' };
const photo = 'spotPhotos/maya/maya_sunset/p1.jpg';

let env, maya, alex, guest;

test.before(async () => {
  env = await initializeTestEnvironment({
    // The emulator's own project: Storage asks that project's Firestore whether a spot is shared.
    // (npm run test:rules runs the rules files one at a time, so the Firestore rules file can't clear this mid-test.)
    projectId: 'demo-sznluv',
    firestore: { rules: fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8') },
    storage: { rules: fs.readFileSync(path.join(root, 'storage.rules'), 'utf8') },
  });
  maya = env.authenticatedContext('maya').storage();
  alex = env.authenticatedContext('alex').storage();
  guest = env.unauthenticatedContext().storage();
});

test.beforeEach(async () => {
  await env.clearStorage();
  await env.clearFirestore();
});

test.after(() => env.cleanup());

const step = async (label, promise) => {
  try { return await promise; } catch (error) { error.message = `${label}: ${error.message}`; throw error; }
};

const share = shared => env.withSecurityRulesDisabled(async context => {
  const target = doc(context.firestore(), 'publicSpots/maya_sunset');
  if (shared) await setDoc(target, { ownerUid: 'maya', ownerUsername: 'maya', name: 'Hidden Sunset Viewpoint' });
  else await deleteDoc(target);
});

test('only the owner uploads, only images under 5 MB, and only into a spot of their own', async () => {
  await assertSucceeds(uploadBytes(ref(maya, photo), jpeg, asJpeg));
  await assertFails(uploadBytes(ref(alex, photo), jpeg, asJpeg));
  await assertFails(uploadBytes(ref(alex, 'spotPhotos/maya/maya_sunset/p2.jpg'), jpeg, asJpeg));
  await assertFails(uploadBytes(ref(maya, 'spotPhotos/maya/alex_spot/p1.jpg'), jpeg, asJpeg), 'a spot ID must be the uploader\'s');
  await assertFails(uploadBytes(ref(maya, 'spotPhotos/maya/maya_sunset/notes.txt'), jpeg, { contentType: 'text/plain' }));
  await assertFails(uploadBytes(ref(maya, 'spotPhotos/maya/maya_sunset/huge.jpg'), new Uint8Array(5 * 1024 * 1024 + 1), asJpeg));
  await assertFails(uploadBytes(ref(guest, photo), jpeg, asJpeg));
  await assertFails(uploadBytes(ref(maya, 'elsewhere/p1.jpg'), jpeg, asJpeg), 'nothing outside spot photos');
});

test('a photo is private until its spot is shared, and private again once it is not', async () => {
  await assertSucceeds(uploadBytes(ref(maya, photo), jpeg, asJpeg));
  await step('owner reads', assertSucceeds(getMetadata(ref(maya, photo))));
  await step('owner lists', assertSucceeds(listAll(ref(maya, 'spotPhotos/maya/maya_sunset'))));
  await assertFails(getMetadata(ref(alex, photo)));
  await assertFails(getMetadata(ref(guest, photo)));

  await share(true);
  await step('shared', assertSucceeds(getMetadata(ref(alex, photo))));
  await assertFails(getMetadata(ref(guest, photo)), 'signed in only');

  await share(false);
  await assertFails(getMetadata(ref(alex, photo)));
  await assertSucceeds(getMetadata(ref(maya, photo)));
});

test('only the owner deletes a photo, shared or not', async () => {
  await assertSucceeds(uploadBytes(ref(maya, photo), jpeg, asJpeg));
  await share(true);
  await assertFails(deleteObject(ref(alex, photo)));
  await assertSucceeds(deleteObject(ref(maya, photo)));
});

const firstId = 'a'.repeat(20), secondId = 'b'.repeat(20);
const avatar = id => `profilePhotos/maya/${id}.jpg`;
const selectAvatar = id => env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'profiles/maya'), {
  username: 'maya', ...(id ? { avatarPhotoId: id } : {}),
}));

test('profile photos are immutable owner uploads, JPEG only, capped at 1 MiB', async () => {
  const path = avatar(firstId);
  await assertFails(uploadBytes(ref(alex, path), jpeg, asJpeg));
  await assertFails(uploadBytes(ref(guest, path), jpeg, asJpeg));
  await assertFails(uploadBytes(ref(maya, avatar('too-short')), jpeg, asJpeg));
  await assertFails(uploadBytes(ref(maya, path), jpeg, { contentType: 'image/png' }));
  await assertFails(uploadBytes(ref(maya, path), new Uint8Array(1024 * 1024 + 1), asJpeg));
  await assertSucceeds(uploadBytes(ref(maya, path), new Uint8Array(1024 * 1024), asJpeg));
  await assertFails(uploadBytes(ref(maya, path), jpeg, asJpeg));
  await assertFails(deleteObject(ref(alex, path)));
  await assertSucceeds(deleteObject(ref(maya, path)));
});

test('profile photos: signed-in visitors may fetch only the currently referenced photo', async () => {
  const a = avatar(firstId), b = avatar(secondId);
  for (const path of [a, b]) await assertSucceeds(uploadBytes(ref(maya, path), jpeg, asJpeg));
  await assertSucceeds(getMetadata(ref(maya, a)));
  await assertFails(getMetadata(ref(alex, a)), 'no public profile yet');
  await selectAvatar(firstId);
  await assertSucceeds(getMetadata(ref(alex, a)));
  await assertFails(getMetadata(ref(guest, a)));
  await assertFails(getMetadata(ref(alex, b)), 'replacement still staged');
  await assertFails(listAll(ref(alex, 'profilePhotos/maya')));
  await selectAvatar(secondId);
  await assertFails(getMetadata(ref(alex, a)), 'old object still exists but is no longer referenced');
  await assertSucceeds(getMetadata(ref(alex, b)));
  await selectAvatar(null);
  await assertFails(getMetadata(ref(alex, b)), 'removed photo is private even before cleanup');
});
