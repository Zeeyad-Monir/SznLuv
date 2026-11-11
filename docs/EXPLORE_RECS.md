# Explore recommendations

"For you" on Explore is ranked for each person by a Cloud Function. This covers Phases 1–2 of the brief: data foundations and a working personalised feed. It is built to cost as close to nothing as possible.

**Status: built and tested locally, not deployed.** Until the functions are deployed the app falls back to the old page (newest lists, most followed one featured), so shipping the app first is safe.

## How it works

```
publicLists/{id} ──trigger──▶ exploreIndex/{s0..s3}   one compact entry per public list
app ──getExploreFeed(signals)──▶ index in memory → filter → score → mix → up to 60 cards
app ──one events doc per session──▶ events/{id} ──daily job──▶ counts on the index, exploreMetrics/{day}
```

- **The index** (`exploreIndex`) holds, per list, what its card needs plus what the ranking needs: features derived from its spots, a quality score, its season, and net follows per day. The feed function keeps it in memory for 10 minutes.
- **Signals** are sent by the app about its own user: saved spots, followed lists and people, blocked people, saved seasonal collections, lists opened lately. Nothing about a person is stored server-side. Someone can only skew their own feed by tampering.
- **The feed** comes back whole (up to 60 cards) and is kept on the device for 15 minutes. "Load more" pages locally. Pull to refresh asks again and lets the order change.
- **Events** (seen, opened, followed) are buffered and written as one document when Explore is left or the app goes to the background. The daily job counts each person once per list per day, then deletes the raw events.

## Ranking

All numbers live in `functions/recs/config.js` and can change with a functions deploy, no app release.

| Part | Weight | What it is |
|---|---|---|
| Interest | 35% | Overlap between the person's profile and the list's features (categories, rarer tags, towns, season) |
| Quality | 20% | Description, number of spots, notes, findable spots; lifetime followers add a small, capped amount |
| Momentum | 15% | Net new followers over 1, 7 and 30 days; needs at least 3 in a week |
| Geography | 10% | Same city, more so around the towns the person saves in. Never a hard filter |
| Season | 10% | In season 1, all-year 0.6, out of season 0.2 |
| Freshness | 5% | Halves every 21 days |
| Social | 5% | By someone the person follows |

A page of 20 is then mixed by reason: 7 personal, 4 trending, 4 new (published in the last 14 days, competing only with each other), 3 established quality, 2 "something different". A pool that runs short gives its places to the best of the rest. One creator gets at most two places per page. With no history, interest is dropped and the other parts share its weight.

The profile blends long-term interest (everything saved or followed, 60%) with the last 30 days (40%, halving every two weeks). Opening a list counts for a sixth of following it. Saving a seasonal collection is a light nudge, not a save of every spot in it.

## What it costs

No fixed fee; Blaze bills only above the free allowances.

| Action | Cost |
|---|---|
| Feed request, index warm | 1 function call, 0 reads |
| Feed request, index cold | 1 call, 4 reads |
| Follow or unfollow | 1 trigger call, 1 write |
| Publish or edit a list | 1 trigger call, 1 write, plus one read per spot the owner made |
| A session's events | 1 write, then 1 read and 1 delete in the daily job |
| Daily job | 4 reads and 4 writes, plus the events |
| Weekly check of the index | 1 read per public list |

Explore itself now reads less than before: the newest and most-followed queries (about 100 documents per visit) only run when those sorts are chosen or the function is unreachable, and the Following chip's queries only when it is opened.

Limits: every function is capped at 3 instances (the scheduled one at 1), 256 MB, none kept warm. Set a budget alert on the project as well; Blaze alerts but does not cap.

## Deploying (not done; needs you)

1. Upgrade the `sznluv` project to the Blaze plan and add a budget alert.
2. Check the Firestore location in the console. `REGION` in `functions/index.js` and `FUNCTIONS_REGION` in `firebaseConfig.js` are both `us-central1`, which is right for a `nam5` database. Change both together if yours differs.
3. `cd functions && npm install`
4. `firebase deploy --only functions --project sznluv` (copies the catalogue into `functions/shared/` first).
5. Deploy `firestore.rules` for the `events` collection. The warning at the top of that file still applies: compare with the live rules first.
6. The index fills itself the first time the daily job runs (04:00 Vancouver time). To fill it sooner, run the job once from the Cloud Scheduler page in the Google Cloud console.

A new catalogue of spots needs a functions deploy as well as an app release, since the server ranks with its own copy.

## Testing

- `npm test` — `tests/recs.test.cjs` (the ranking, against the brief's acceptance criteria) and `tests/explore.test.cjs` (the app side).
- `npm run test:rules` — `tests/rules/explore.test.cjs` runs the function handlers on the Firestore emulator, including the cost promises above. Needs `functions/node_modules`.
- `npm run emulators` now starts the functions emulator too, so the emulator build of the app gets the ranked feed.

## Not built yet (Phase 3 onward)

- Using impressions: giving new lists a measured audience and widening it when people respond. The counts are already collected (`im`, `op` on each index entry).
- "Not interested", "Hide creator", "Why am I seeing this".
- Near-duplicate lists side by side; not repeating what was shown on the last visit.
- Verified creators and spot ratings as quality signals. Neither exists in the app; a verified flag must be server-written, since `users/{uid}` is writable by its owner.
- Device location. Geography is the city plus the towns a person saves in.
- A reader for `exploreMetrics/{day}`; for now the daily totals are read in the Firebase console.
- Self-follows are not excluded from momentum. Three accounts could make a list trend.
