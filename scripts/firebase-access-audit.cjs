// Tests only two explicitly supplied codex.audit.* accounts. Requires --live.
// Expected result after the backend fix: own access succeeds, cross-account access is denied.
const fs = require('fs');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { initializeApp, deleteApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, signOut } = require('firebase/auth');
const { getFirestore, doc, getDoc, updateDoc, deleteField, terminate } = require('firebase/firestore');
function argument(flag) { const index = process.argv.indexOf(flag); return index === -1 ? undefined : process.argv[index + 1]; }
if (!process.argv.includes('--live') || !argument('--actor') || !argument('--other')) {
  console.error('Usage: node scripts/firebase-access-audit.cjs --live --actor <audit-account.json> --other <other-audit-account.json>');
  process.exit(1);
}
const actor = JSON.parse(fs.readFileSync(argument('--actor'), 'utf8'));
const other = JSON.parse(fs.readFileSync(argument('--other'), 'utf8'));
for (const account of [actor, other]) assert.ok(account.email.startsWith('codex.audit.'), 'Refusing non-audit credentials');
const source = fs.readFileSync(require('path').join(__dirname, '..', 'firebaseConfig.js'), 'utf8');
const config = { apiKey: source.match(/apiKey:\s*"([^"]+)"/)[1], projectId: 'sznluv' };
const actorApp = initializeApp(config, 'ownership-actor-' + Date.now());
const otherApp = initializeApp(config, 'ownership-other-' + Date.now());
const actorAuth = getAuth(actorApp), otherAuth = getAuth(otherApp), db = getFirestore(actorApp);
const results = [];
(async () => {
  const [actorSession, otherSession] = await Promise.all([
    signInWithEmailAndPassword(actorAuth, actor.email, actor.password),
    signInWithEmailAndPassword(otherAuth, other.email, other.password),
  ]);
  const actorUid = actorSession.user.uid, otherUid = otherSession.user.uid;
  assert.notEqual(actorUid, otherUid);
  for (const collection of ['users', 'favourites']) {
    const own = await getDoc(doc(db, collection, actorUid));
    assert.ok(own.exists(), 'Audit actor must have a profile and favourites document');
    let denied = false;
    try { await getDoc(doc(db, collection, otherUid)); }
    catch (error) { if (error.code !== 'permission-denied') throw error; denied = true; }
    results.push({ check: 'Other audit account ' + collection + ' read', passed: denied });
  }
  const ref = doc(db, 'favourites', otherUid);
  const marker = 'codexAuditOwnership_' + crypto.randomBytes(8).toString('hex');
  let writeAllowed = false;
  try { await updateDoc(ref, { [marker]: true }); writeAllowed = true; }
  catch (error) { if (error.code !== 'permission-denied') throw error; }
  finally { if (writeAllowed) await updateDoc(ref, { [marker]: deleteField() }); }
  results.push({ check: 'Other audit account favourites write', passed: !writeAllowed });
  for (const result of results) console.log(JSON.stringify(result));
  if (results.some(result => !result.passed)) process.exitCode = 1;
  if (argument('--output')) fs.writeFileSync(argument('--output'), JSON.stringify(results, null, 2), { mode: 0o600 });
})().catch(error => { console.error(JSON.stringify({ error: error.code || error.message })); process.exitCode = 1; }).finally(async () => {
  await Promise.all([signOut(actorAuth), signOut(otherAuth)]);
  await terminate(db);
  await Promise.all([deleteApp(actorApp), deleteApp(otherApp)]);
});
