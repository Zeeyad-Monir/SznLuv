// One place for the events the launch metrics need (docs/SOCIAL_LISTS_PLAN.md, "Metrics").
// Nothing is sent anywhere yet: connect an analytics provider here and no screen has to change.
const EVENTS = {
  listStarted: 'list_started',            // { entry: 'library' | 'save' }
  firstSpotAdded: 'list_first_spot',      // { entry }
  listFollowed: 'list_followed',          // { listId }
  spotSavedFromList: 'spot_saved_from_list', // { listId }
  followedListReopened: 'followed_list_reopened', // { listId, from: 'library' | 'link' }
};

let sink = null;
const setMetricsSink = next => { sink = next; };

function track(event, properties = {}) {
  if (sink) sink(event, properties);
  else if (typeof __DEV__ !== 'undefined' && __DEV__) console.debug('[metrics]', event, properties);
}

module.exports = { EVENTS, track, setMetricsSink };
