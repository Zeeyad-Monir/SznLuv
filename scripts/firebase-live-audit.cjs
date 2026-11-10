/* Explicit live audit: only codex.audit.* accounts and labelled audit records.
 * node scripts/firebase-live-audit.cjs --live --account-file /private/tmp/sznluv-native-audit-account.json
 * Credentials stay in the supplied private account file, never in this repository.
 */
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const Module = require('module');
const babel = require('@babel/core');
const { initializeApp, deleteApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } = require('firebase/auth');
const { getFirestore, doc, getDoc, setDoc, deleteDoc, runTransaction, getDocs, collection, query, where, orderBy, terminate } = require('firebase/firestore');

const accountPath = process.argv[process.argv.indexOf('--account-file') + 1];
if (!process.argv.includes('--live') || !process.argv.includes('--account-file') || !accountPath) {
  console.error('Requires --live --account-file <private audit account JSON>');
  process.exit(1);
}
const account = JSON.parse(fs.readFileSync(accountPath, 'utf8'));
if (!account.email?.startsWith('codex.audit.')) throw new Error('Refusing to modify a non-audit account');
const repo = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(repo, 'firebaseConfig.js'), 'utf8');
const apiKey = source.match(/apiKey:\s*"([^"]+)"/)[1];
const app = initializeApp({ apiKey, projectId: 'sznluv' }, 'live-audit-' + Date.now());
const auth = getAuth(app), db = getFirestore(app);
const bindings = { auth, db, register: (email, password) => createUserWithEmailAndPassword(auth, email, password), logout: () => signOut(auth) };
const cache = new Map();
function loadService(relative) {
  const filename = path.resolve(repo, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = new Module(filename);
  module.filename = filename;
  module.paths = Module._nodeModulePaths(path.dirname(filename));
  const nativeRequire = Module.createRequire(filename);
  module.require = request => {
    if (request === '../firebaseConfig') return bindings;
    if (request.startsWith('.')) return loadService(path.relative(repo, path.resolve(path.dirname(filename), request + (path.extname(request) ? '' : '.js'))));
    return nativeRequire(request);
  };
  const code = babel.transformFileSync(filename, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  cache.set(filename, module);
  module._compile(code, filename);
  return module.exports;
}
const accounts = loadService('services/accounts.js');
const favourites = loadService('services/favourites.js');
const reviews = loadService('services/reviews.js');
const results = [];
async function check(name, operation) {
  try { const result = await operation(); results.push({ name, passed: true, result }); }
  catch (error) { results.push({ name, passed: false, code: error.code, message: error.message }); process.exitCode = 1; }
  console.log(JSON.stringify(results.at(-1)));
}
async function login() { return signInWithEmailAndPassword(auth, account.email, account.password); }
(async () => {
  await login();
  account.uid = auth.currentUser.uid;
  fs.writeFileSync(accountPath, JSON.stringify(account, null, 2), { mode: 0o600 });
  await check('Signup created its profile and reservation', async () => {
    const profile = await getDoc(doc(db, 'users', account.uid));
    const name = await getDoc(doc(db, 'usernames', account.username));
    assert.equal(profile.data().username, account.username);
    assert.equal(name.data().uid, account.uid);
  });
  await check('Duplicate email preserves the signed-in account', async () => {
    await assert.rejects(accounts.createAccountWithProfile(account), { code: 'auth/email-already-in-use' });
    assert.equal(auth.currentUser.uid, account.uid);
  });
  await check('Duplicate username removes only the new account and signs out', async () => {
    const candidate = { email: 'codex.audit.duplicate.' + Date.now() + '@example.com', password: 'Audit' + crypto.randomBytes(12).toString('hex') + '9!', username: account.username };
    await assert.rejects(accounts.createAccountWithProfile(candidate), error => error.code === 'signup/username-taken' && !error.cleanupErrors.length);
    assert.equal(auth.currentUser, null);
    await assert.rejects(signInWithEmailAndPassword(auth, candidate.email, candidate.password), { code: 'auth/invalid-credential' });
    await login();
    assert.equal((await getDoc(doc(db, 'usernames', account.username))).data().uid, account.uid);
  });
  await check('Concurrent favourite changes retain all data', async () => {
    await Promise.all([
      favourites.toggleSavedSpot(account.uid, 'Codex audit A', { isFavourite: true, season: 'Fall' }),
      favourites.toggleSavedSpot(account.uid, 'Codex audit B', { isFavourite: true, season: 'Winter' }),
    ]);
    const data = (await getDoc(doc(db, 'favourites', account.uid))).data();
    assert.ok(data['Codex audit A'] && data['Codex audit B']);
    await favourites.removeSavedSpot(account.uid, 'Codex audit A');
    const removed = (await getDoc(doc(db, 'favourites', account.uid))).data();
    assert.equal(removed['Codex audit A'], undefined);
    assert.ok(removed['Codex audit B']);
    await favourites.removeSavedSpot(account.uid, 'Codex audit B');
  });
  await check('A repeated review upvote counts once, including concurrent requests', async () => {
    const id = 'codex_audit_' + crypto.randomBytes(8).toString('hex');
    const reviewRef = doc(db, 'reviews', id), voteRef = doc(db, 'users', account.uid, 'votes', id);
    try {
      await setDoc(reviewRef, { username: account.username, profileColor: '#A7C8FF', comment: 'Codex audit test review (temporary)', starRating: 5, timestamp: new Date(), placeID: 'aldor_farm', thumbsUpCount: 0 });
      const settled = await Promise.allSettled([reviews.upvoteReview(account.uid, id), reviews.upvoteReview(account.uid, id)]);
      assert.equal(settled.filter(result => result.status === 'fulfilled').length, 1);
      assert.equal(settled.find(result => result.status === 'rejected').reason.code, 'review/already-voted');
      assert.equal((await getDoc(reviewRef)).data().thumbsUpCount, 1);
    } finally {
      await deleteDoc(voteRef);
      await deleteDoc(reviewRef);
    }
  });
  for (const [field, direction] of [['timestamp', 'desc'], ['thumbsUpCount', 'desc'], ['starRating', 'desc'], ['starRating', 'asc']]) for (const minimum of [0, 3]) {
    await check(`Review query: ${field} ${direction}, minimum ${minimum}`, async () => {
      const filters = [where('placeID', '==', 'aldor_farm')];
      if (minimum) filters.push(where('starRating', '>=', minimum));
      await getDocs(query(collection(db, 'reviews'), ...filters, orderBy(field, direction)));
    });
  }
  await check('Saved data and profile survive logout and login', async () => {
    await signOut(auth);
    assert.equal(auth.currentUser, null);
    await login();
    assert.ok((await getDoc(doc(db, 'users', account.uid))).exists());
    assert.ok((await getDoc(doc(db, 'favourites', account.uid))).exists());
    await signOut(auth);
    assert.equal(auth.currentUser, null);
  });
})().catch(error => { console.error(JSON.stringify({ fatal: error.code || error.message })); process.exitCode = 1; }).finally(async () => {
  fs.writeFileSync(path.join(path.dirname(accountPath), 'sznluv-live-audit-results.json'), JSON.stringify(results, null, 2), { mode: 0o600 });
  await terminate(db);
  await deleteApp(app);
});
