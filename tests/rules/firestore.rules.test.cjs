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

  for (const sub of ['votes/r1', 'followedPeople/alex']) {
    await assertSucceeds(setDoc(doc(maya, `users/maya/${sub}`), { followedAt: 1 }));
    await assertFails(getDoc(doc(alex, `users/maya/${sub}`)));
    await assertFails(setDoc(doc(alex, `users/maya/${sub}`), { followedAt: 1 }));
  }
  await assertFails(getDocs(collection(alex, 'users/maya/followedPeople')));
});

test('kept collections belong to their owner and are keyed by the collection they keep', async () => {
  const kept = { collectionId: 'vancouver-fall', cityId: 'vancouver', savedAt: 1 };
  await assertSucceeds(setDoc(doc(maya, 'users/maya/savedCollections/vancouver-fall'), kept));
  await assertSucceeds(getDocs(collection(maya, 'users/maya/savedCollections')));
  await assertFails(setDoc(doc(maya, 'users/maya/savedCollections/vancouver-winter'), kept), 'the ID must match');
  await assertFails(setDoc(doc(maya, 'users/maya/savedCollections/vancouver-fall'), { ...kept, extra: true }));
  await assertFails(getDocs(collection(alex, 'users/maya/savedCollections')));
  await assertFails(setDoc(doc(alex, 'users/maya/savedCollections/vancouver-fall'), kept));
  await assertFails(deleteDoc(doc(alex, 'users/maya/savedCollections/vancouver-fall')));
  await assertSucceeds(deleteDoc(doc(maya, 'users/maya/savedCollections/vancouver-fall')));
});

test('a spot someone makes is theirs alone: its ID carries their uid, and nobody else can read or touch it', async () => {
  const spot = { ownerUid: 'maya', name: 'Hidden Sunset Viewpoint', lat: 49.3, lng: -123.1, photos: [], publicListIds: [], createdAt: 1, updatedAt: 1 };
  await assertSucceeds(getDoc(doc(maya, 'spots/maya_sunset')), 'checking for one of your own that is not there');
  await assertSucceeds(setDoc(doc(maya, 'spots/maya_sunset'), spot));
  await assertSucceeds(getDoc(doc(maya, 'spots/maya_sunset')));
  await assertSucceeds(getDocs(query(collection(maya, 'spots'), where('ownerUid', '==', 'maya'))));
  await assertSucceeds(updateDoc(doc(maya, 'spots/maya_sunset'), { description: 'Best at 8pm.' }));

  await assertFails(getDoc(doc(alex, 'spots/maya_sunset')));
  await assertFails(getDocs(query(collection(alex, 'spots'), where('ownerUid', '==', 'maya'))));
  await assertFails(getDocs(collection(alex, 'spots')));
  await assertFails(updateDoc(doc(alex, 'spots/maya_sunset'), { name: 'Mine now' }));
  await assertFails(deleteDoc(doc(alex, 'spots/maya_sunset')));
  await assertFails(getDoc(doc(guest, 'spots/maya_sunset')));

  // Nobody can make a spot under someone else's name, or claim one with a different owner.
  await assertFails(setDoc(doc(alex, 'spots/maya_squat'), { ...spot, ownerUid: 'alex' }));
  await assertFails(setDoc(doc(alex, 'spots/alex_x'), spot));
  await assertFails(getDoc(doc(alex, 'spots/maya_other')), 'not even whether it exists');
  // Limits, and only the owner deletes.
  await assertFails(setDoc(doc(maya, 'spots/maya_long'), { ...spot, name: 'x'.repeat(61) }));
  await assertFails(setDoc(doc(maya, 'spots/maya_photos'), { ...spot, photos: [1, 2, 3, 4] }));
  await assertFails(setDoc(doc(maya, 'spots/maya_empty'), { ...spot, name: '' }));
  await assertSucceeds(deleteDoc(doc(maya, 'spots/maya_sunset')));
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
  await assertFails(setDoc(doc(maya, 'lists/a'), draft('maya', { title: 'x'.repeat(26) })));
  await assertSucceeds(setDoc(doc(maya, 'lists/a'), draft('maya', { title: 'x'.repeat(25) })));
  // Titles saved before the cap stay as they are; they can't be renamed to another long one.
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'lists/old'), draft('maya', { title: 'x'.repeat(40) }));
  });
  await assertSucceeds(updateDoc(doc(maya, 'lists/old'), { description: 'Still fine.' }));
  await assertFails(updateDoc(doc(maya, 'lists/old'), { title: 'y'.repeat(40) }));
  await assertSucceeds(updateDoc(doc(maya, 'lists/old'), { title: 'Short now' }));
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
  await assertFails(setDoc(doc(maya, 'publicLists/mayaList'), snapshot('maya', 'maya', { title: 'x'.repeat(26) })));
  await assertFails(setDoc(doc(maya, 'publicLists/mayaList'), snapshot('maya', 'maya', { searchTerms: Array.from({ length: 121 }, (_, i) => 't' + i) })));
  await assertSucceeds(setDoc(doc(maya, 'publicLists/mayaList'), snapshot('maya', 'maya')));
});

test('a list’s followerCount moves by one, only together with the follower’s own pointer', async () => {
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'publicLists/mayaList'), snapshot('maya', 'maya', { followerCount: 3 }));
  });
  const list = doc(alex, 'publicLists/mayaList'), pointer = doc(alex, 'users/alex/followedLists/mayaList');
  const follow = (count, data = { publishedAt: 1, followedAt: 1 }) => {
    const batch = writeBatch(alex);
    batch.set(pointer, data);
    batch.update(list, { followerCount: count });
    return batch.commit();
  };

  // Neither half alone, no jumps, no forged pointer.
  await assertFails(setDoc(pointer, { publishedAt: 1, followedAt: 1 }));
  await assertFails(updateDoc(list, { followerCount: 4 }));
  await assertFails(follow(10));
  await assertFails(follow(4, { publishedAt: 0, followedAt: 1 }));
  await assertFails(setDoc(doc(alex, 'users/alex/followedLists/nothing'), { publishedAt: 1 }));
  await assertSucceeds(follow(4));
  await assertSucceeds(updateDoc(pointer, { lastOpenedAt: 2 }));
  await assertFails(updateDoc(pointer, { publishedAt: 0 }));
  await assertFails(follow(5)); // Already following: the pointer exists
  await assertFails(deleteDoc(pointer)); // Unfollowing has to give the follow back

  const unfollow = count => {
    const batch = writeBatch(alex);
    batch.delete(pointer);
    batch.update(list, { followerCount: count });
    return batch.commit();
  };
  await assertFails(unfollow(2));
  await assertSucceeds(unfollow(3));
  assert.equal((await getDoc(list)).data().followerCount, 3);

  // The owner republishing can't touch the count.
  await assertFails(updateDoc(doc(maya, 'publicLists/mayaList'), { followerCount: 50 }));
  await assertFails(setDoc(doc(maya, 'publicLists/mayaList'), snapshot('maya', 'maya', { followerCount: 50 })));
  await assertSucceeds(setDoc(doc(maya, 'publicLists/mayaList'), snapshot('maya', 'maya', { followerCount: 3 })));

  // A stale pointer (list republished since) can be dropped without touching the count.
  await assertSucceeds(follow(4));
  await env.withSecurityRulesDisabled(async context => {
    await updateDoc(doc(context.firestore(), 'publicLists/mayaList'), { publishedAt: 9 });
  });
  await assertSucceeds(deleteDoc(pointer));
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

test('a shared spot\'s public copy is written only by its owner, under their own username', async () => {
  const shown = { ownerUid: 'maya', ownerUsername: 'maya', name: 'Hidden Sunset Viewpoint', lat: 49.3, lng: -123.1, photos: [], updatedAt: 1 };
  await assertSucceeds(setDoc(doc(maya, 'publicSpots/maya_sunset'), shown));
  await assertSucceeds(getDoc(doc(alex, 'publicSpots/maya_sunset')));
  await assertFails(getDoc(doc(guest, 'publicSpots/maya_sunset')));
  await assertFails(setDoc(doc(alex, 'publicSpots/maya_sunset'), { ...shown, name: 'Mine now' }));
  await assertFails(setDoc(doc(alex, 'publicSpots/maya_other'), { ...shown, ownerUid: 'alex', ownerUsername: 'alex' }), 'not under someone else\'s ID');
  await assertFails(setDoc(doc(alex, 'publicSpots/alex_fake'), shown), 'not claiming to be someone else');
  await assertFails(setDoc(doc(maya, 'publicSpots/maya_sunset'), { ...shown, ownerUsername: 'alex' }));
  await assertFails(setDoc(doc(maya, 'publicSpots/maya_sunset'), { ...shown, publicListIds: ['l1'] }), 'which lists stays private');
  await assertFails(deleteDoc(doc(alex, 'publicSpots/maya_sunset')));
  await assertSucceeds(deleteDoc(doc(maya, 'publicSpots/maya_sunset')));
  await assertSucceeds(deleteDoc(doc(maya, 'publicSpots/maya_gone')), 'clearing one that is already gone');
});

test('reviews on a spot someone made: readable and writable by others only while it is shared', async () => {
  const shown = { ownerUid: 'maya', ownerUsername: 'maya', name: 'Hidden Sunset Viewpoint', photos: [], updatedAt: 1 };
  const review = { uid: 'alex', username: 'alex', profileColor: '#FF0000', comment: 'Worth the climb', starRating: 5, timestamp: new Date(), placeID: 'x:maya_sunset', thumbsUpCount: 0 };
  const reviews = context => collection(context, 'publicSpots/maya_sunset/reviews');
  await assertFails(addDoc(reviews(alex), review), 'not before it is shared');

  await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'publicSpots/maya_sunset'), shown));
  const posted = await assertSucceeds(addDoc(reviews(alex), review));
  await assertSucceeds(getDocs(reviews(alex)));
  await assertFails(getDocs(reviews(guest)));
  await assertFails(addDoc(reviews(alex), { ...review, uid: 'maya' }), 'as someone else');
  await assertFails(addDoc(reviews(alex), { ...review, username: 'maya' }), 'under someone else\'s name');
  await assertFails(addDoc(reviews(alex), { ...review, placeID: 'x:other' }));
  await assertFails(addDoc(reviews(alex), { ...review, starRating: 6 }));
  await assertFails(addDoc(reviews(maya), { ...review, uid: 'maya', username: 'maya' }), 'not on your own spot');
  await assertSucceeds(updateDoc(doc(maya, posted.path), { thumbsUpCount: 1 }));
  await assertFails(updateDoc(doc(maya, posted.path), { thumbsUpCount: 5 }));
  await assertFails(updateDoc(doc(maya, posted.path), { comment: 'Edited by someone else' }));

  // Made private: kept, but only the owner can still read them.
  await env.withSecurityRulesDisabled(context => deleteDoc(doc(context.firestore(), 'publicSpots/maya_sunset')));
  await assertFails(getDocs(reviews(alex)));
  await assertFails(getDoc(doc(alex, posted.path)));
  await assertSucceeds(getDocs(reviews(maya)));
  await assertFails(addDoc(reviews(alex), review));
  await assertFails(updateDoc(doc(alex, posted.path), { thumbsUpCount: 2 }));

  // The author, or the spot's owner, can delete one.
  await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'publicSpots/maya_sunset/reviews/another'), review));
  await assertFails(deleteDoc(doc(guest, 'publicSpots/maya_sunset/reviews/another')));
  await assertSucceeds(deleteDoc(doc(alex, posted.path)));
  await assertSucceeds(deleteDoc(doc(maya, 'publicSpots/maya_sunset/reviews/another')));
});

test('reports are write-once and unreadable from the app', async () => {
  const report = { reporterUid: 'alex', targetType: 'list', targetId: 'mayaList', ownerUid: 'maya', reason: 'Spam', createdAt: 1 };
  const created = await assertSucceeds(addDoc(collection(alex, 'reports'), report));
  await assertFails(getDoc(created));
  await assertFails(getDocs(collection(alex, 'reports')));
  await assertFails(updateDoc(created, { reason: 'Other' }));
  await assertFails(addDoc(collection(alex, 'reports'), { ...report, reporterUid: 'maya' }));
  // Spots people share, and reviews on them, can be reported too; nothing else.
  await assertSucceeds(addDoc(collection(alex, 'reports'), { ...report, targetType: 'spot', targetId: 'maya_sunset' }));
  await assertSucceeds(addDoc(collection(alex, 'reports'), { ...report, targetType: 'review', targetId: 'publicSpots/maya_sunset/reviews/r1' }));
  await assertFails(addDoc(collection(alex, 'reports'), { ...report, targetType: 'everything' }));
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
