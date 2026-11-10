// Security rules, checked against the Firestore emulator. Run with: npm run test:rules
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const {
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, getDocs, query, where, orderBy, limit,
  writeBatch, runTransaction, deleteField,
} = require('firebase/firestore');

const cover = { type: 'colour', value: '#A7C8FF' };
const spot = name => ({ spot: { k: 'c', name }, note: '' });
const draft = (ownerUid, extra = {}) => ({
  ownerUid, title: 'Golden Hour', description: '', cityId: 'vancouver', cover,
  items: [spot('Aldor Family Farm')], public: false, publishedAt: null, ...extra,
});
const snapshot = (ownerUid, ownerUsername, extra = {}) => ({
  ownerUid, ownerUsername, title: 'Golden Hour', description: '', cityId: 'vancouver', cover,
  items: [spot('Aldor Family Farm')], spotCount: 1, publishedAt: 1, updatedAt: 1,
  searchTerms: ['golden', 'gol', 'gold', 'hour'], ...extra,
});

let env, maya, alex, guest;

test.before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-sznluv',
    firestore: { rules: fs.readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8') },
  });
  maya = env.authenticatedContext('maya').firestore();
  alex = env.authenticatedContext('alex').firestore();
  guest = env.unauthenticatedContext().firestore();
});

test.beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/maya'), { username: 'maya', email: 'maya@example.com' });
    await setDoc(doc(db, 'users/alex'), { username: 'alex', email: 'alex@example.com' });
    await setDoc(doc(db, 'usernames/maya'), { uid: 'maya', email: 'maya@example.com' });
    await setDoc(doc(db, 'favourites/maya'), { 'Aldor Family Farm': { isFavourite: true, season: 'Fall' } });
    await setDoc(doc(db, 'favourites/alex'), {});
    await setDoc(doc(db, 'lists/mayaList'), draft('maya'));
    await setDoc(doc(db, 'dateCounts/winter'), { count: 4 });
    await setDoc(doc(db, 'reviews/r1'), { username: 'maya', comment: 'Lovely', starRating: 5, placeID: 'p', thumbsUpCount: 0 });
  });
});

test.after(() => env.cleanup());

test('favourites and private user data belong to their owner only', async () => {
  await assertSucceeds(getDoc(doc(maya, 'favourites/maya')));
  await assertSucceeds(updateDoc(doc(maya, 'favourites/maya'), { 'Maan Farms': { isFavourite: true, season: 'Fall' } }));
  await assertFails(getDoc(doc(alex, 'favourites/maya')));
  await assertFails(updateDoc(doc(alex, 'favourites/maya'), { hacked: true }));
  await assertFails(getDoc(doc(guest, 'favourites/maya')));

  await assertSucceeds(getDoc(doc(maya, 'users/maya')));
  await assertFails(getDoc(doc(alex, 'users/maya')));
  await assertFails(updateDoc(doc(alex, 'users/maya'), { username: 'alex' }));

  for (const sub of ['votes/r1', 'followedLists/mayaList', 'followedPeople/alex']) {
    await assertSucceeds(setDoc(doc(maya, `users/maya/${sub}`), { followedAt: 1 }));
    await assertFails(getDoc(doc(alex, `users/maya/${sub}`)));
    await assertFails(setDoc(doc(alex, `users/maya/${sub}`), { followedAt: 1 }));
  }
  await assertFails(getDocs(collection(alex, 'users/maya/followedPeople')));
});

test('usernames can be checked and reserved, but never listed, taken over or deleted', async () => {
  await assertSucceeds(getDoc(doc(alex, 'usernames/maya')));
  await assertFails(getDocs(collection(alex, 'usernames')));
  await assertFails(getDoc(doc(guest, 'usernames/maya')));
  await assertSucceeds(setDoc(doc(alex, 'usernames/alex'), { uid: 'alex' }));
  await assertFails(setDoc(doc(alex, 'usernames/someone'), { uid: 'maya' }));
  await assertFails(setDoc(doc(alex, 'usernames/maya'), { uid: 'alex' }));
  await assertSucceeds(setDoc(doc(maya, 'usernames/maya'), { uid: 'maya' }));
  await assertFails(deleteDoc(doc(maya, 'usernames/maya')));
});

test('a list draft is readable and writable by its owner alone', async () => {
  await assertSucceeds(getDoc(doc(maya, 'lists/mayaList')));
  await assertSucceeds(getDocs(query(collection(maya, 'lists'), where('ownerUid', '==', 'maya'))));
  await assertSucceeds(updateDoc(doc(maya, 'lists/mayaList'), { title: 'Slow Sundays' }));
  await assertSucceeds(setDoc(doc(maya, 'lists/new'), draft('maya', { items: [] })));
  await assertSucceeds(getDoc(doc(maya, 'lists/doesNotExist')));

  await assertFails(getDoc(doc(alex, 'lists/mayaList')));
  await assertFails(getDocs(query(collection(alex, 'lists'), where('ownerUid', '==', 'maya'))));
  await assertFails(getDocs(collection(alex, 'lists')));
  await assertFails(updateDoc(doc(alex, 'lists/mayaList'), { title: 'Mine now' }));
  await assertFails(deleteDoc(doc(alex, 'lists/mayaList')));
  await assertFails(setDoc(doc(alex, 'lists/forged'), draft('maya')));
  await assertFails(updateDoc(doc(maya, 'lists/mayaList'), { ownerUid: 'alex' }));
  await assertSucceeds(deleteDoc(doc(maya, 'lists/mayaList')));
});

test('list drafts enforce the title, description and 50-spot limits', async () => {
  await assertFails(setDoc(doc(maya, 'lists/a'), draft('maya', { title: '' })));
  await assertFails(setDoc(doc(maya, 'lists/a'), draft('maya', { title: 'x'.repeat(41) })));
  await assertFails(setDoc(doc(maya, 'lists/a'), draft('maya', { description: 'x'.repeat(121) })));
  await assertFails(setDoc(doc(maya, 'lists/a'), draft('maya', { items: Array.from({ length: 51 }, (_, i) => spot('s' + i)) })));
  await assertSucceeds(setDoc(doc(maya, 'lists/a'), draft('maya', { items: Array.from({ length: 50 }, (_, i) => spot('s' + i)) })));
});

test('publishing writes the public copy, the draft and the profile in one batch', async () => {
  const batch = writeBatch(maya);
  batch.set(doc(maya, 'publicLists/mayaList'), snapshot('maya', 'maya'));
  batch.update(doc(maya, 'lists/mayaList'), { public: true, publishedAt: 1 });
  batch.set(doc(maya, 'profiles/maya'), { username: 'maya', avatarColor: '#D24B3A' }, { merge: true });
  await assertSucceeds(batch.commit());

  await assertSucceeds(getDoc(doc(alex, 'publicLists/mayaList')));
  await assertSucceeds(getDocs(query(collection(alex, 'publicLists'), orderBy('publishedAt', 'desc'), limit(20))));
  await assertSucceeds(getDocs(query(collection(alex, 'publicLists'), where('ownerUid', '==', 'maya'))));
  await assertSucceeds(getDocs(query(collection(alex, 'publicLists'), where('searchTerms', 'array-contains', 'gold'), limit(30))));
  await assertFails(getDoc(doc(guest, 'publicLists/mayaList')));
  await assertFails(getDoc(doc(alex, 'lists/mayaList')));

  await assertSucceeds(updateDoc(doc(maya, 'publicLists/mayaList'), { title: 'Golden Hours', updatedAt: 2 }));
  await assertFails(updateDoc(doc(alex, 'publicLists/mayaList'), { title: 'Defaced' }));
  await assertFails(deleteDoc(doc(alex, 'publicLists/mayaList')));

  const unpublish = writeBatch(maya);
  unpublish.delete(doc(maya, 'publicLists/mayaList'));
  unpublish.update(doc(maya, 'lists/mayaList'), { public: false, publishedAt: null });
  await assertSucceeds(unpublish.commit());
  assert.equal((await getDoc(doc(alex, 'publicLists/mayaList'))).exists(), false);
});

test('a public list needs an owned draft, the real username, a spot and bounded search terms', async () => {
  await assertFails(setDoc(doc(alex, 'publicLists/mayaList'), snapshot('alex', 'alex')));
  await assertFails(setDoc(doc(alex, 'publicLists/noDraft'), snapshot('alex', 'alex')));
  await assertFails(setDoc(doc(maya, 'publicLists/mayaList'), snapshot('alex', 'maya')));
  await assertFails(setDoc(doc(maya, 'publicLists/mayaList'), snapshot('maya', 'alex')));
  await assertFails(setDoc(doc(maya, 'publicLists/mayaList'), snapshot('maya', 'maya', { items: [] })));
  await assertFails(setDoc(doc(maya, 'publicLists/mayaList'), snapshot('maya', 'maya', { title: 'x'.repeat(41) })));
  await assertFails(setDoc(doc(maya, 'publicLists/mayaList'), snapshot('maya', 'maya', { searchTerms: Array.from({ length: 121 }, (_, i) => 't' + i) })));
  await assertSucceeds(setDoc(doc(maya, 'publicLists/mayaList'), snapshot('maya', 'maya')));
});

test('public profiles are readable when signed in and writable only by their owner', async () => {
  await assertSucceeds(setDoc(doc(maya, 'profiles/maya'), { username: 'maya', bio: 'Long evenings.', top4: { vancouver: [] } }));
  await assertSucceeds(getDoc(doc(alex, 'profiles/maya')));
  await assertSucceeds(getDocs(query(collection(alex, 'profiles'), where('username', '>=', 'ma'), where('username', '<=', 'ma'), limit(10))));
  await assertFails(getDoc(doc(guest, 'profiles/maya')));
  await assertFails(setDoc(doc(alex, 'profiles/maya'), { username: 'maya' }));
  await assertFails(setDoc(doc(alex, 'profiles/alex'), { username: 'maya' }));
  await assertFails(setDoc(doc(maya, 'profiles/maya'), { username: 'maya', bio: 'x'.repeat(81) }));
  await assertFails(updateDoc(doc(alex, 'profiles/maya'), { bio: 'Defaced' }));
  await assertSucceeds(deleteDoc(doc(maya, 'profiles/maya')));
});

test('reports are write-once and unreadable from the app', async () => {
  const report = { reporterUid: 'alex', targetType: 'list', targetId: 'mayaList', ownerUid: 'maya', reason: 'Spam', createdAt: 1 };
  const created = await assertSucceeds(addDoc(collection(alex, 'reports'), report));
  await assertFails(getDoc(created));
  await assertFails(getDocs(collection(alex, 'reports')));
  await assertFails(updateDoc(created, { reason: 'Other' }));
  await assertFails(addDoc(collection(alex, 'reports'), { ...report, reporterUid: 'maya' }));
  await assertFails(addDoc(collection(alex, 'reports'), { ...report, targetType: 'review' }));
  await assertFails(addDoc(collection(guest, 'reports'), report));
});

test('reviews: anyone signed in can post and upvote by one; only the author can delete', async () => {
  const review = { username: 'alex', profileColor: '#FF0000', comment: 'Great', starRating: 4, timestamp: new Date(), placeID: 'p', thumbsUpCount: 0 };
  await assertSucceeds(addDoc(collection(alex, 'reviews'), review));
  await assertFails(addDoc(collection(alex, 'reviews'), { ...review, thumbsUpCount: 99 }));
  await assertFails(addDoc(collection(alex, 'reviews'), { ...review, starRating: 6 }));
  await assertFails(addDoc(collection(guest, 'reviews'), review));
  await assertSucceeds(getDocs(query(collection(alex, 'reviews'), where('placeID', '==', 'p'))));

  // The app's upvote: the count and the voter's own vote record, in one transaction.
  await assertSucceeds(runTransaction(alex, async transaction => {
    const current = await transaction.get(doc(alex, 'reviews/r1'));
    await transaction.get(doc(alex, 'users/alex/votes/r1'));
    transaction.update(doc(alex, 'reviews/r1'), { thumbsUpCount: current.data().thumbsUpCount + 1 });
    transaction.set(doc(alex, 'users/alex/votes/r1'), { reviewId: 'r1' });
  }));
  await assertFails(updateDoc(doc(alex, 'reviews/r1'), { thumbsUpCount: 50 }));
  await assertFails(updateDoc(doc(alex, 'reviews/r1'), { comment: 'Edited by someone else' }));
  await assertFails(deleteDoc(doc(alex, 'reviews/r1')));
  await assertSucceeds(deleteDoc(doc(maya, 'reviews/r1')));
});

test('date counts are read-only', async () => {
  await assertSucceeds(getDoc(doc(maya, 'dateCounts/winter')));
  await assertFails(setDoc(doc(maya, 'dateCounts/winter'), { count: 999 }));
});

test('signup and the collections migration still work as transactions', async () => {
  // services/accounts.js saveProfile, for a brand-new account.
  const sam = env.authenticatedContext('sam').firestore();
  await assertSucceeds(runTransaction(sam, async transaction => {
    await transaction.get(doc(sam, 'usernames/sam'));
    await transaction.get(doc(sam, 'users/sam'));
    transaction.set(doc(sam, 'usernames/sam'), { uid: 'sam' });
    transaction.set(doc(sam, 'users/sam'), { username: 'sam', email: 'sam@example.com' }, { merge: true });
  }));

  // Legacy collections become private lists, and the old field goes away, atomically.
  await env.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(), 'favourites/maya'), {
    collections: [{ title: 'Weekend', color: '#A7C8FF', dates: ['Aldor Family Farm'] }],
  }));
  await assertSucceeds(runTransaction(maya, async transaction => {
    const favourites = await transaction.get(doc(maya, 'favourites/maya'));
    favourites.data().collections.forEach((old, index) => {
      transaction.set(doc(maya, `lists/maya_c${index}`), draft('maya', {
        title: old.title, cover: { type: 'colour', value: old.color }, items: old.dates.map(spot),
      }));
    });
    transaction.update(doc(maya, 'favourites/maya'), { collections: deleteField(), listsMigratedAt: 1 });
  }));
  const migrated = await getDoc(doc(maya, 'lists/maya_c0'));
  assert.equal(migrated.data().title, 'Weekend');
  assert.equal((await getDoc(doc(maya, 'favourites/maya'))).data().collections, undefined);
});
