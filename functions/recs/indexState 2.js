// The index of public lists that the feed ranks from, and the daily upkeep on it. Each index document is
// { lists: { [listId]: entry } }; a list's document is chosen from its id. Pure functions over plain objects.
const config = require('./config');
const { hash } = require('./feed');
const { dayNumber } = require('./score');

const shardOf = listId => `s${Math.floor(hash(String(listId)) * config.SHARDS)}`;
const shardIds = () => Array.from({ length: config.SHARDS }, (_, index) => `s${index}`);

// What a list is about only changes when one of these does; a follow changes none of them.
const CONTENT = ['title', 'description', 'cover', 'cityId', 'items', 'ownerUid', 'ownerUsername', 'spotCount', 'publishedAt'];
const contentChanged = (before, after) => CONTENT.some(field => JSON.stringify(before?.[field] ?? null) !== JSON.stringify(after?.[field] ?? null));
const followerDelta = (before, after) => (Math.max(0, Number(after?.followerCount) || 0) - Math.max(0, Number(before?.followerCount) || 0));

// Spots the owner made that the list shows: their category and seasons live on the public copy, by id.
const ownSpotIds = list => [...new Set((list.items ?? [])
  .filter(item => item.spot?.k === 'x' && item.spot.id && item.spot.owner === list.ownerUid)
  .map(item => item.spot.id))];

// Drops day counts older than the windows the scoring looks at.
function trimDays(days = {}, now, keep = config.FOLLOW_DAYS) {
  const today = dayNumber(now);
  return Object.fromEntries(Object.entries(days).filter(([day, amount]) => today - Number(day) < keep && amount));
}

// ---------------------------------------------------------------- Events

// One batch is what one app session saw and did: { uid, items: [{ t, l, ... }] }.
// Counts each person once per list per day, however many times they scrolled past or refreshed.
function foldEvents(batches, now) {
  const seen = new Set(), perList = {}, totals = { sessions: 0, impressions: 0, opens: 0, spotOpens: 0, follows: 0, byReason: {} };
  const people = new Set();
  for (const batch of batches) {
    if (!batch?.uid || !Array.isArray(batch.items)) continue;
    totals.sessions += 1;
    people.add(batch.uid);
    for (const item of batch.items) {
      const kind = { imp: 'im', open: 'op', spot: 'sp', follow: 'fo' }[item?.t];
      if (!kind || typeof item.l !== 'string') continue;
      const day = dayNumber(Number.isFinite(item.ms) ? item.ms : now);
      const once = `${batch.uid}|${item.l}|${kind}|${day}`;
      if (seen.has(once)) continue;
      seen.add(once);
      if (kind === 'im' || kind === 'op') {
        const list = perList[item.l] ??= { im: {}, op: {} };
        list[kind][day] = (list[kind][day] ?? 0) + 1;
      }
      const total = { im: 'impressions', op: 'opens', sp: 'spotOpens', fo: 'follows' }[kind];
      totals[total] += 1;
      if (typeof item.r === 'string' && item.r.length <= 12) {
        const reason = totals.byReason[item.r] ??= { impressions: 0, opens: 0, follows: 0 };
        if (total in reason) reason[total] += 1;
      }
    }
  }
  return { perList, totals: { ...totals, people: people.size } };
}

// One index document after the daily pass: old day counts dropped, new views and opens added.
function maintainShard(lists = {}, perList = {}, now = Date.now()) {
  const next = {};
  for (const [id, entry] of Object.entries(lists)) {
    const added = perList[id] ?? { im: {}, op: {} };
    const merge = (days = {}, more = {}) => {
      const sum = { ...days };
      Object.entries(more).forEach(([day, amount]) => { sum[day] = (sum[day] ?? 0) + amount; });
      return trimDays(sum, now);
    };
    next[id] = { ...entry, fb: trimDays(entry.fb, now), im: merge(entry.im, added.im), op: merge(entry.op, added.op) };
  }
  return next;
}

module.exports = { shardOf, shardIds, contentChanged, followerDelta, ownSpotIds, trimDays, foldEvents, maintainShard };
