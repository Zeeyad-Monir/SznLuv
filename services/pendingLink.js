// A link can arrive before the signed-in app is on screen (cold start, or tapped while signed out).
// It waits here until the navigator is ready, like the callback parked in collectionPicker.js.
let pending = null;
const listeners = new Set();

function setPendingLink(target) {
  pending = target;
  if (target) listeners.forEach(listener => listener());
}

// Returns the waiting target once and forgets it, so a link is never opened twice.
function takePendingLink() {
  const target = pending;
  pending = null;
  return target;
}

function onPendingLink(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

module.exports = { setPendingLink, takePendingLink, onPendingLink };
