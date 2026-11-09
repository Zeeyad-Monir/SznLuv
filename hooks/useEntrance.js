import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { getReduceMotion } from './useReduceMotion';

// Finishes inside the ~350ms push, so a screen is settled by the time it has arrived.
const DURATION = 240;
const STAGGER = 40;
const MAX_DELAY = 160;
const RISE = 12;

function createEntry() {
  const value = new Animated.Value(getReduceMotion() ? 1 : 0);
  const style = {
    opacity: value,
    transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [RISE, 0] }) }],
  };
  return { value, style, started: false };
}

function reveal(entry, order) {
  entry.started = true;
  if (getReduceMotion()) {
    entry.value.setValue(1);
    return;
  }
  Animated.timing(entry.value, {
    toValue: 1,
    duration: DURATION,
    delay: Math.min(order * STAGGER, MAX_DELAY),
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  }).start();
}

/**
 * Staggered entrance for a fixed set of blocks. Returns one style per block.
 * Pass `ready: false` to hold the reveal until the content exists.
 */
export default function useEntrance(count, { ready = true } = {}) {
  const entries = useRef([]);
  while (entries.current.length < count) entries.current.push(createEntry());

  useEffect(() => {
    if (!ready) return;
    entries.current.forEach((entry, index) => { if (!entry.started) reveal(entry, index); });
  }, [ready, count]);

  return entries.current.map(entry => entry.style);
}

/**
 * Entrance for a list that refetches. Each key animates once, when it first appears,
 * so returning to the screen updates the list without blanking it.
 */
export function useItemEntrance(keys, { ready = true } = {}) {
  const entries = useRef(new Map());
  keys.forEach(key => { if (!entries.current.has(key)) entries.current.set(key, createEntry()); });

  // Runs after every render: reveal() is once per entry, and an item restored after a failed delete needs it again.
  useEffect(() => {
    if (!ready) return;
    let order = 0;
    keys.forEach(key => {
      const entry = entries.current.get(key);
      if (!entry.started) reveal(entry, order++);
    });
  });

  return {
    styleFor: key => entries.current.get(key)?.style,
    // Plays the removal, then forgets the key so a later item with the same name animates in afresh.
    exit: (key, done) => {
      const entry = entries.current.get(key);
      const finish = () => { entries.current.delete(key); done(); };
      if (!entry || getReduceMotion()) return finish();
      Animated.timing(entry.value, { toValue: 0, duration: 200, useNativeDriver: true }).start(finish);
    },
  };
}
