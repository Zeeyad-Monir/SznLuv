// What the three Cloud Functions do, written against a Firestore handle so tests can run them on the
// emulator (tests/rules/explore.test.cjs). index.js only wires these to their triggers.
//
// Cost is the design constraint here (docs/EXPLORE_RECS.md): a feed request reads nothing while the index
// is in memory, a follow is one write, and everything else happens once a day.
const { FieldPath, FieldValue } = require('firebase-admin/firestore');
const config = require('./recs/config');
const { indexEntry } = require('./recs/features');
const { buildFeed, toCard, complete } = require('./recs/feed');
const { dayNumber } = require('./recs/score');
const { shardOf, shardIds, contentChanged, followerDelta, ownSpotIds, foldEvents, maintainShard } = require('./recs/indexState');

const INDEX = 'exploreIndex';
const META = 'meta';

// ---------------------------------------------------------------- What a request may send

const text = (value, max = 200) => (typeof value === 'string' && value.length > 0 && value.length <= max ? value : null);
const time = value => (Number.isFinite(value) && value > 0 ? value : undefined);
const texts = (values, max) => (Array.isArray(values) ? values.slice(0, max).map(value => text(value)).filter(Boolean) : []);
const dated = (values, max, field) => (Array.isArray(values) ? values.slice(0, max) : [])
  .map(value => ({ [field]: text(value?.[field]), at: time(value?.at) }))
  .filter(value => value[field]);

// The app describes its own user. Anything malformed is dropped rather than refused: a worse feed beats no feed.
function cleanSignals(signals) {
  const limits = config.LIMITS, given = signals && typeof signals === 'object' ? signals : {};
  return {
    savedSpots: dated(given.savedSpots, limits.savedSpots, 'key'),
    followedLists: dated(given.followedLists, limits.followedLists, 'id'),
    opens: dated(given.opens, limits.opens, 'id'),
    followedOwners: texts(given.followedOwners, limits.followedOwners),
    blocked: texts(given.blocked, limits.blocked),
    savedSeasons: texts(given.savedSeasons, limits.savedSeasons),
  };
}

function createHandlers(db, { clock = () => Date.now() } = {}) {
  const shard = id => db.collection(INDEX).doc(id);
  const stats = { indexReads: 0 };
  let cached = null; // { at, entries } kept between requests while this instance stays warm

  async function loadIndex({ fresh = false } = {}) {
    const now = clock();
    if (!fresh && cached && now - cached.at < config.INDEX_TTL_MS) return cached.entries;
    const snapshots = await db.getAll(...shardIds().map(shard));
    stats.indexReads += snapshots.length;
    const entries = {};
    snapshots.forEach(snapshot => Object.assign(entries, snapshot.data()?.lists ?? {}));
    cached = { at: now, entries };
    return entries;
  }

  // ---------------------------------------------------------------- The feed

  async function exploreFeed(uid, data = {}) {
    const now = clock();
    const entries = await loadIndex();
    const feed = buildFeed({
      uid, entries, now,
      signals: cleanSignals(data.signals),
      cityId: text(data.cityId, 40) ?? 'vancouver',
      nonce: text(data.nonce, 40) ?? '',
    });
    return { algo: config.ALGO_VERSION, lists: feed.map(toCard) };
  }

  // ---------------------------------------------------------------- Keeping the index in step with public lists

  async function sharedSpots(list) {
    const ids = ownSpotIds(list);
    if (!ids.length) return {};
    const snapshots = await db.getAll(...ids.map(id => db.collection('publicSpots').doc(id)));
    return Object.fromEntries(snapshots.filter(snapshot => snapshot.exists).map(snapshot => [snapshot.id, snapshot.data()]));
  }

  // Replaces just the named fields of one list's entry, so the day counts beside them are left alone.
  function writeEntry(listId, fields) {
    const paths = Object.keys(fields).map(field => new FieldPath('lists', listId, ...field.split('/')));
    const nested = {};
    for (const [field, value] of Object.entries(fields)) {
      const keys = field.split('/');
      let target = nested;
      keys.slice(0, -1).forEach(key => { target = target[key] ??= {}; });
      target[keys.at(-1)] = value;
    }
    return shard(shardOf(listId)).set({ lists: { [listId]: nested } }, { mergeFields: paths });
  }

  // Runs on every write to publicLists/{listId}. A follow costs one write and no reads.
  async function onListWritten(listId, before, after) {
    if (!after) {
      await shard(shardOf(listId)).set({ lists: { [listId]: FieldValue.delete() } }, { merge: true });
      return 'removed';
    }
    const fields = {};
    const changed = contentChanged(before, after);
    if (changed) Object.assign(fields, indexEntry(after, await sharedSpots(after)));
    // The security rules only let the count move by one, together with the follower's own pointer, so the
    // change in the count is a follow or an unfollow by one real account. A newly published list starts at 0.
    const delta = before ? followerDelta(before, after) : 0;
    if (delta) {
      fields[`fb/${dayNumber(clock())}`] = FieldValue.increment(delta);
      fields.fc = Math.max(0, Number(after.followerCount) || 0);
    }
    if (!Object.keys(fields).length) return 'unchanged';
    await writeEntry(listId, fields);
    return changed ? 'indexed' : 'counted';
  }

  // ---------------------------------------------------------------- Once a day

  async function drainEvents() {
    const batches = [];
    for (let round = 0; round < 20; round += 1) {
      const snapshot = await db.collection('events').orderBy('at').limit(500).get();
      if (snapshot.empty) break;
      snapshot.docs.forEach(doc => batches.push(doc.data()));
      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      if (snapshot.size < 500) break;
    }
    return batches;
  }

  // Every public list has an entry and every entry has a public list. Reads each public list once, so it
  // runs weekly: the trigger keeps the index right in between, and this repairs anything it missed.
  async function reconcile() {
    const entries = await loadIndex({ fresh: true });
    const live = new Set();
    let last = null, repaired = 0;
    for (;;) {
      let query = db.collection('publicLists').orderBy(FieldPath.documentId()).limit(300);
      if (last) query = query.startAfter(last);
      const snapshot = await query.get();
      for (const doc of snapshot.docs) {
        const list = doc.data(), entry = entries[doc.id];
        live.add(doc.id);
        const current = complete(entry) && entry.updatedAt === (list.updatedAt ?? 0) && entry.publishedAt === (list.publishedAt ?? 0);
        const followers = Math.max(0, Number(list.followerCount) || 0);
        if (!current) await writeEntry(doc.id, indexEntry(list, await sharedSpots(list)));
        else if (entry.fc !== followers) await writeEntry(doc.id, { fc: followers });
        else continue;
        repaired += 1;
      }
      if (snapshot.size < 300) break;
      last = snapshot.docs.at(-1);
    }
    const gone = Object.keys(entries).filter(id => !live.has(id));
    for (const id of gone) await shard(shardOf(id)).set({ lists: { [id]: FieldValue.delete() } }, { merge: true });
    return { lists: live.size, repaired, removed: gone.length };
  }

  async function dailyMaintenance() {
    const now = clock();
    const { perList, totals } = foldEvents(await drainEvents(), now);

    for (const id of shardIds()) {
      await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(shard(id));
        if (!snapshot.exists) return;
        transaction.set(shard(id), { ...snapshot.data(), lists: maintainShard(snapshot.data().lists, perList, now) });
      });
    }

    // Daily totals are what the launch metrics are read from; the raw events are gone once counted.
    const { byReason, people, ...counts } = totals;
    const increments = Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, FieldValue.increment(value)]));
    const reasons = Object.fromEntries(Object.entries(byReason).map(([reason, values]) => (
      [reason, Object.fromEntries(Object.entries(values).map(([key, value]) => [key, FieldValue.increment(value)]))]
    )));
    const day = new Date(now).toISOString().slice(0, 10);
    await db.collection('exploreMetrics').doc(day).set({ ...increments, people, byReason: reasons, algo: config.ALGO_VERSION }, { merge: true });

    const meta = (await shard(META).get()).data() ?? {};
    let reconciled = null;
    if (!meta.reconciledAt || now - meta.reconciledAt >= config.RECONCILE_EVERY_DAYS * config.DAY_MS) {
      reconciled = await reconcile();
      await shard(META).set({ reconciledAt: now }, { merge: true });
    }
    cached = null;
    return { totals, reconciled };
  }

  return { exploreFeed, onListWritten, dailyMaintenance, reconcile, loadIndex, stats };
}

module.exports = { createHandlers, cleanSignals };
