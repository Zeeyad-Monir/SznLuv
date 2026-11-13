// Follows the phone's position for as long as it is needed.
// On iOS, expo-location ends a watch for good on any Core Location error, even the passing "location unknown"
// that iOS reports while it looks for a fix (indoors, or right after a big jump), and it never tells the app.
// So a watch that has gone quiet is started again: a fresh watch reports where the phone is straight away.
import * as Location from 'expo-location';

export const QUIET_MS = 30000;

// Returns { remove() }, like a watch. `onFix` receives each position as expo-location gives it.
export function followPosition(options, onFix, { quietMs = QUIET_MS } = {}) {
  let stopped = false;
  let watch = null;
  let timer = null;

  const arm = () => {
    clearTimeout(timer);
    if (stopped) return;
    timer = setTimeout(restart, quietMs);
    timer?.unref?.(); // Under Node (the tests), a screen left open doesn't keep the process alive; a no-op in the app
  };
  async function restart() {
    if (stopped) return;
    watch?.remove();
    watch = null;
    try {
      const subscription = await Location.watchPositionAsync(options, position => {
        if (stopped) return;
        arm();
        onFix(position);
      });
      if (stopped) subscription.remove();
      else watch = subscription;
    } catch {
      // Tried again when the quiet time is up.
    }
    arm();
  }

  restart();
  return {
    remove() {
      stopped = true;
      clearTimeout(timer);
      watch?.remove();
      watch = null;
    },
  };
}
