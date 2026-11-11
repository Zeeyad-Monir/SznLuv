// One place for the events the launch metrics need (docs/SOCIAL_LISTS_PLAN.md, "Metrics").
// App.js connects services/events.js as the sink, which keeps the Explore events and ignores the rest.
const EVENTS = {
  listStarted: 'list_started',            // { entry: 'library' | 'save' }
  firstSpotAdded: 'list_first_spot',      // { entry }
  listFollowed: 'list_followed',          // { listId }
  spotSavedFromList: 'spot_saved_from_list', // { listId }
  followedListReopened: 'followed_list_reopened', // { listId, from: 'library' | 'link' }
  // For the Explore recommendations (services/events.js writes these; the rest are still only logged in dev).
  impression: 'list_impression',          // { listId, position, reason, source }: at least half the card was on screen
  listOpened: 'list_opened',              // { listId, position?, reason?, source: 'explore' | 'link' | 'other' }
  spotOpened: 'spot_opened',              // { listId }: a spot opened from inside a public list
};

let sink = null;
const setMetricsSink = next => { sink = next; };

function track(event, properties = {}) {
  if (sink) sink(event, properties);
  else if (typeof __DEV__ !== 'undefined' && __DEV__) console.debug('[metrics]', event, properties);
}

module.exports = { EVENTS, track, setMetricsSink };
