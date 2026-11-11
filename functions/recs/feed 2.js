// The Explore feed for one person: filter, score, then mix by reason so a page isn't all one thing.
// Given the same inputs it always returns the same order. Pure functions.
const config = require('./config');
const { buildProfile } = require('./profile');
const { scoreEntry, ageDays, dayNumber } = require('./score');

// A steady 0..1 from a string, for tie-breaks and the "something different" picks.
function hash(text) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0) / 4294967296;
}

// An entry written only by a follow count (its list hasn't been indexed yet) can't be shown.
const complete = entry => !!entry && typeof entry.ownerUid === 'string' && typeof entry.title === 'string' && !!entry.features;

function buildFeed({ uid, signals = {}, entries = {}, now = Date.now(), cityId = 'vancouver', nonce = '', size = config.FEED_SIZE }) {
  const profile = buildProfile(signals, entries, now);
  const seed = `${uid}:${dayNumber(now)}:${nonce}`;

  // Never your own lists, anything from someone you blocked, or a list you already follow.
  const scored = Object.entries(entries)
    .filter(([id, entry]) => complete(entry)
      && entry.ownerUid !== uid
      && !profile.blocked.has(entry.ownerUid)
      && !profile.followedListIds.has(id))
    .map(([id, entry]) => {
      const { parts, total } = scoreEntry(entry, profile, { now, cityId });
      const roll = hash(`${seed}:${id}`);
      return { id, entry, parts, roll, total: total + config.JITTER * (roll - 0.5) };
    });

  const byTotal = (a, b) => b.total - a.total || a.roll - b.roll;
  const ranked = [...scored].sort(byTotal);
  const isNew = item => ageDays(item.entry, now) <= config.NEW_DAYS;
  const forYou = item => item.parts.interest >= config.MIN_INTEREST || item.parts.social === 1;

  const pools = {
    personal: ranked.filter(forYou),
    trending: ranked.filter(item => item.parts.momentum > 0).sort((a, b) => b.parts.momentum - a.parts.momentum || byTotal(a, b)),
    // New lists compete with each other for these places, not with lists that have had months to gather followers.
    fresh: ranked.filter(item => isNew(item) && item.entry.spotCount >= config.NEW_MIN_SPOTS),
    quality: ranked.filter(item => !isNew(item)).sort((a, b) => b.parts.quality - a.parts.quality || byTotal(a, b)),
    // Decent lists outside what this person usually goes for, in an order that changes day to day.
    discover: scored.filter(item => !forYou(item) && item.parts.quality >= config.DISCOVER_MIN_QUALITY).sort((a, b) => a.roll - b.roll),
  };

  const used = new Set(), feed = [];
  const take = (pool, creators, capped) => {
    const item = pool.find(candidate => !used.has(candidate.id)
      && (!capped || (creators.get(candidate.entry.ownerUid) ?? 0) < config.MAX_PER_CREATOR));
    if (!item) return null;
    used.add(item.id);
    creators.set(item.entry.ownerUid, (creators.get(item.entry.ownerUid) ?? 0) + 1);
    return item;
  };

  while (feed.length < size && used.size < scored.length) {
    const creators = new Map(), page = [];
    for (const reason of config.PAGE_PATTERN) {
      if (feed.length + page.length >= size) break;
      // A pool with nothing left gives its place to the best list overall, labelled for what it is.
      let picked = take(pools[reason], creators, true), why = reason;
      // In a small community one busy creator may be most of what there is: better them than an empty page.
      if (!picked) {
        picked = take(ranked, creators, true) ?? take(ranked, creators, false);
        if (picked) why = picked.parts.momentum > 0 ? 'trending' : forYou(picked) ? 'personal' : isNew(picked) ? 'fresh' : 'top';
      }
      if (!picked) break;
      page.push({ ...picked, reason: why === 'fresh' ? 'new' : why });
    }
    if (!page.length) break;
    feed.push(...page);
  }

  return feed.map(({ id, entry, parts, reason }) => ({ id, entry, parts, reason }));
}

// What the app draws a card from. Same field names as a public list.
const toCard = ({ id, entry, reason }) => ({
  id,
  title: entry.title,
  cover: entry.cover,
  ownerUid: entry.ownerUid,
  ownerUsername: entry.ownerUsername,
  spotCount: entry.spotCount,
  cityId: entry.cityId,
  publishedAt: entry.publishedAt,
  updatedAt: entry.updatedAt,
  followerCount: entry.fc ?? 0,
  season: entry.season ?? null,
  reason,
});

module.exports = { buildFeed, toCard, hash, complete };
