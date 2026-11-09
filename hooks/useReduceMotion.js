import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// One shared copy of the system setting, read at startup so a screen's first render already knows it.
let reduceMotion = false;
const subscribers = new Set();

function update(value) {
  if (value === reduceMotion) return;
  reduceMotion = value;
  subscribers.forEach(notify => notify(value));
}

AccessibilityInfo.isReduceMotionEnabled().then(update);
AccessibilityInfo.addEventListener('reduceMotionChanged', update);

// For animation code outside render, such as a press handler or an effect.
export const getReduceMotion = () => reduceMotion;

export default function useReduceMotion() {
  const [value, setValue] = useState(reduceMotion);
  useEffect(() => {
    subscribers.add(setValue);
    setValue(reduceMotion);
    return () => subscribers.delete(setValue);
  }, []);
  return value;
}
