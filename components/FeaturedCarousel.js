// Home's large card, which rotates through a few picks (services/collections.js featuredRotation).
//
// Each pick shows for ROTATE_MS while its bar at the top fills, then crossfades to the next. The picture
// drifts in slowly while it shows, and its words rise in just after the fade. A swipe left or right changes
// pick by hand. The card holds still while a finger is on it, while Home is out of sight, and while the app
// is in the background, and a tap always opens the pick that was showing when the finger went down.
// With Reduce Motion or a screen reader on it never moves by itself; a swipe (or VoiceOver's swipe up and
// down) still changes pick, without animation. With one pick it is a plain card: no bars, no timer.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, PanResponder, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from '@react-navigation/native';
import { collectionArt } from './covers';
import PressableScale from './PressableScale';
import useReduceMotion from '../hooks/useReduceMotion';
import { CARD_RADIUS, artFade, cardShadow, colors, onArt } from './theme';

export const ROTATE_MS = 8000;
const FADE_MS = 700;
const WORDS_MS = 520;
const WORDS_OUT_MS = 200;
const WORDS_DELAY = 260;
const WORDS_RISE = 8;
const DRIFT_SCALE = 1.06;
const SWIPE_DISTANCE = 40;
const PLAIN = '#B98A5E';

// The screen reader setting, kept current. Not every platform build reports it, so a missing API reads as off.
function useScreenReader() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isScreenReaderEnabled?.().then(value => { if (live) setOn(!!value); });
    const subscription = AccessibilityInfo.addEventListener?.('screenReaderChanged', value => setOn(!!value));
    return () => { live = false; subscription?.remove?.(); };
  }, []);
  return on;
}

function useAppActive() {
  const [active, setActive] = useState(true);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);
  return active;
}

export default function FeaturedCarousel({ slides, height, onOpen }) {
  const count = slides.length;
  const slidesKey = slides.map(slide => slide.key).join('|');
  const [index, setIndex] = useState(0);
  const current = count > 0 ? index % count : 0;
  const [held, setHeld] = useState(false);
  const focused = useIsFocused();
  const appActive = useAppActive();
  const reduceMotion = useReduceMotion();
  const screenReader = useScreenReader();
  const still = reduceMotion || screenReader;
  const running = count > 1 && !still && !held && focused && appActive;

  // One set of animated values per pick. The first pick starts fully shown, so the page's own entrance is
  // the only motion on arrival.
  const values = useMemo(() => slides.map((_, i) => ({
    fade: new Animated.Value(i === 0 ? 1 : 0),
    words: new Animated.Value(i === 0 ? 1 : 0),
    drift: new Animated.Value(1),
  })), [slidesKey]);
  const progress = useRef(new Animated.Value(0)).current;
  const remaining = useRef(ROTATE_MS);
  const pressedIndex = useRef(null);
  const first = useRef(true);

  // A different city brings different picks: start again from the first.
  useEffect(() => { setIndex(0); first.current = true; }, [slidesKey]);

  // A new pick gets its full time. (React runs the timer's cleanup below before this, so this wins.)
  useEffect(() => { remaining.current = ROTATE_MS; progress.setValue(0); }, [current, slidesKey]);

  // The timer: fills the current bar and moves on when it is full. Pausing keeps the time that was left.
  useEffect(() => {
    if (!running) return undefined;
    const startedAt = Date.now();
    const left = remaining.current;
    progress.setValue(1 - left / ROTATE_MS);
    const fill = Animated.timing(progress, { toValue: 1, duration: left, easing: Easing.linear, useNativeDriver: true });
    fill.start();
    const timer = setTimeout(() => setIndex(i => (i + 1) % count), left);
    // Under Node (the tests) a timer is an object that would keep the process alive for a Home left mounted;
    // in the app it is a number and this does nothing.
    timer?.unref?.();
    return () => {
      clearTimeout(timer);
      fill.stop();
      remaining.current = Math.max(0, left - (Date.now() - startedAt));
    };
  }, [running, current, count, slidesKey]);

  // The change itself: crossfade the pictures, drift the new one in, then raise its words.
  useEffect(() => {
    const shown = values[current];
    if (!shown) return;
    if (first.current || still) {
      first.current = false;
      values.forEach((value, i) => {
        value.fade.setValue(i === current ? 1 : 0);
        value.words.setValue(i === current ? 1 : 0);
      });
      if (!still) Animated.timing(shown.drift, { toValue: DRIFT_SCALE, duration: ROTATE_MS + FADE_MS, easing: Easing.linear, useNativeDriver: true }).start();
      else shown.drift.setValue(1);
      return;
    }
    shown.words.setValue(0);
    shown.drift.setValue(1);
    Animated.parallel([
      ...values.map((value, i) => Animated.timing(value.fade, {
        toValue: i === current ? 1 : 0, duration: FADE_MS, easing: Easing.inOut(Easing.ease), useNativeDriver: true,
      })),
      // The old words leave quickly, before the new ones rise, so two titles never show on top of each other.
      ...values.filter((_, i) => i !== current).map(value => Animated.timing(value.words, {
        toValue: 0, duration: WORDS_OUT_MS, easing: Easing.out(Easing.quad), useNativeDriver: true,
      })),
      Animated.timing(shown.words, {
        toValue: 1, duration: WORDS_MS, delay: WORDS_DELAY, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(shown.drift, { toValue: DRIFT_SCALE, duration: ROTATE_MS + FADE_MS, easing: Easing.linear, useNativeDriver: true }),
    ]).start();
  }, [current, values, still]);

  const step = by => setIndex(i => (((i % count) + by) % count + count) % count);
  const stepRef = useRef(step);
  stepRef.current = step;

  // A sideways swipe changes pick; an up-and-down one is left to the page's scroll.
  const swipe = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderGrant: () => setHeld(true),
    onPanResponderRelease: (_, g) => {
      setHeld(false);
      if (g.dx <= -SWIPE_DISTANCE) stepRef.current(1);
      else if (g.dx >= SWIPE_DISTANCE) stepRef.current(-1);
    },
    onPanResponderTerminate: () => setHeld(false),
    onPanResponderTerminationRequest: () => false,
  }), []);

  if (count === 0) return null;
  const slide = slides[current];
  const several = count > 1;

  const open = () => {
    const picked = slides[pressedIndex.current ?? current] ?? slide;
    pressedIndex.current = null;
    onOpen(picked);
  };
  const onAccessibilityAction = ({ nativeEvent }) => {
    if (nativeEvent.actionName === 'increment') step(1);
    else if (nativeEvent.actionName === 'decrement') step(-1);
    else if (nativeEvent.actionName === 'activate') open();
  };

  return (
    <View {...(several ? swipe.panHandlers : null)}>
      <PressableScale style={[styles.card, { height }]} contentStyle={styles.surface}
        onPressIn={() => { pressedIndex.current = current; setHeld(true); }}
        onPressOut={() => setHeld(false)}
        onPress={open}
        accessibilityLabel={`Featured: ${slide.title}. ${slide.subtitle ?? ''}`.trim()}
        {...(several ? {
          accessibilityRole: 'adjustable',
          accessibilityValue: { text: `${current + 1} of ${count}` },
          accessibilityHint: 'Swipe up or down for other picks. Double-tap to open.',
          accessibilityActions: [{ name: 'increment' }, { name: 'decrement' }, { name: 'activate' }],
          onAccessibilityAction,
        } : null)}>
        {slides.map((item, i) => (
          <Slide key={item.key} slide={item} value={values[i]} shown={i === current} />
        ))}
        {several && (
          <View style={styles.bars} pointerEvents="none">
            {slides.map((item, i) => (
              // Only the current bar is animated. A finished or upcoming bar is a plain view, given a new key
              // when it changes role, so a native-driven fill never leaves a bar stuck part-way.
              <View key={item.key} style={styles.track}>
                {i === current && !still
                  ? <Animated.View key="filling" style={[styles.fill, { transform: [{ scaleX: progress }] }]} />
                  : i <= current && <View key="full" style={styles.fill} />}
              </View>
            ))}
          </View>
        )}
        <View style={styles.arrow} pointerEvents="none">
          <Ionicons name="arrow-forward" size={22} color={colors.white} />
        </View>
      </PressableScale>
    </View>
  );
}

function Slide({ slide, value, shown }) {
  const art = collectionArt(slide.art);
  const rise = value.words.interpolate({ inputRange: [0, 1], outputRange: [WORDS_RISE, 0] });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.slide, { opacity: value.fade }]} pointerEvents="none"
      importantForAccessibility={shown ? 'auto' : 'no-hide-descendants'}>
      {art && (
        <Animated.Image source={art} resizeMode="cover" style={[StyleSheet.absoluteFill, styles.image, { transform: [{ scale: value.drift }] }]} />
      )}
      <LinearGradient pointerEvents="none" style={StyleSheet.absoluteFill} colors={artFade.colors} locations={artFade.locations} />
      <Animated.View style={[styles.words, { opacity: value.words, transform: [{ translateY: rise }] }]}>
        <Text style={styles.title} numberOfLines={2}>{slide.title}</Text>
        {!!slide.subtitle && <Text style={styles.subtitle} numberOfLines={1}>{slide.subtitle}</Text>}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: CARD_RADIUS, ...cardShadow },
  // The plain colour shows only if an illustration is missing.
  surface: { borderRadius: CARD_RADIUS, overflow: 'hidden', backgroundColor: PLAIN },
  slide: { justifyContent: 'flex-end', overflow: 'hidden', borderRadius: CARD_RADIUS },
  image: { width: '100%', height: '100%' },
  // Room on the right for the arrow, which stays put while the words change.
  words: { padding: 18, paddingRight: 18 + 44 + 12 },
  title: { fontSize: 26.46, lineHeight: 31.19, fontWeight: '700', letterSpacing: -0.28, ...onArt },
  subtitle: { marginTop: 4, fontSize: 14.25, lineHeight: 19, fontWeight: '600', ...onArt },
  bars: { position: 'absolute', top: 14, left: 18, right: 18, flexDirection: 'row', gap: 6, opacity: 0.72 },
  track: { flex: 1, height: 3, borderRadius: 1.5, overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.35)' },
  fill: { flex: 1, borderRadius: 1.5, backgroundColor: 'rgba(255, 255, 255, 0.95)', transformOrigin: 'left' },
  arrow: {
    position: 'absolute', right: 18, bottom: 18,
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.28)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255, 255, 255, 0.6)',
  },
});
