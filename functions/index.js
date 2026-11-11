// SznLuv's Cloud Functions: the Explore recommendations (docs/EXPLORE_RECS.md). The work is in handlers.js
// and recs/; this file only says when each piece runs.
//
// Not deployed automatically. Deploying needs the Blaze plan: `firebase deploy --only functions`.
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions } = require('firebase-functions/v2');
const { createHandlers } = require('./handlers');

// Must be the region the Firestore database is in (us-central1 for a nam5 database), and the same as
// FUNCTIONS_REGION in firebaseConfig.js.
const REGION = 'us-central1';

// The instance cap is the spending limit: nothing here can scale past three small instances, and none
// are kept running while nobody is using the app.
setGlobalOptions({ region: REGION, memory: '256MiB', maxInstances: 3, minInstances: 0, timeoutSeconds: 30 });

initializeApp();
const handlers = createHandlers(getFirestore());

// The ranked feed for the signed-in user, built from signals the app sends about that same user.
exports.getExploreFeed = onCall(async request => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to see Explore.');
  return handlers.exploreFeed(request.auth.uid, request.data ?? {});
});

// Keeps the index in step with what is public: published, edited, followed, unfollowed, withdrawn.
exports.onPublicListWritten = onDocumentWritten('publicLists/{listId}', event => (
  handlers.onListWritten(event.params.listId, event.data?.before?.data(), event.data?.after?.data())
));

// Counts yesterday's views and opens, drops old day counts, and once a week checks the index against the lists.
exports.dailyExploreMaintenance = onSchedule(
  { schedule: 'every day 04:00', timeZone: 'America/Vancouver', maxInstances: 1, timeoutSeconds: 300 },
  async () => { await handlers.dailyMaintenance(); },
);
