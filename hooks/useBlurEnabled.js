import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

// Live blur only on iOS, and only while Reduce Transparency is off. Starts false so the first frame is opaque, not see-through.
export default function useBlurEnabled() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    let subscribed = true;
    let changed = false;
    const listener = AccessibilityInfo.addEventListener('reduceTransparencyChanged', reduced => {
      changed = true;
      setEnabled(!reduced);
    });
    AccessibilityInfo.isReduceTransparencyEnabled().then(reduced => {
      if (subscribed && !changed) setEnabled(!reduced);
    }).catch(() => {});
    return () => {
      subscribed = false;
      listener.remove();
    };
  }, []);
  return enabled;
}
