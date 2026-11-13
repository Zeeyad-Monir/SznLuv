// Home's large card: it takes turns through its picks, holds still while touched or when motion is off,
// and a tap always opens the pick that was showing when the finger went down.
const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { createHarness, act } = require('./renderHarness.cjs');
const { featuredRotation } = require('../services/collections');

const slides = featuredRotation('vancouver');

async function setup(options = {}) {
  const h = createHarness(options);
  const { default: FeaturedCarousel, ROTATE_MS } = h.load('components/FeaturedCarousel.js');
  const opened = [];
  const renderer = await h.renderElement(React.createElement(FeaturedCarousel, { slides, height: 180, onOpen: slide => opened.push(slide.key) }));
  const card = () => renderer.root.findAllByType('TouchableOpacity')[0];
  const showing = () => card().props.accessibilityLabel;
  return { h, renderer, card, showing, opened, ROTATE_MS };
}

const labelOf = slide => `Featured: ${slide.title}. ${slide.subtitle}`;

test('featured carousel: moves to the next pick after its time, and back to the first after the last', async t => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  t.after(() => mock.timers.reset());
  const { renderer, showing, ROTATE_MS } = await setup();
  assert.equal(showing(), labelOf(slides[0]));
  act(() => mock.timers.tick(ROTATE_MS - 1));
  assert.equal(showing(), labelOf(slides[0]), 'not before its time is up');
  act(() => mock.timers.tick(1));
  assert.equal(showing(), labelOf(slides[1]));
  act(() => mock.timers.tick(ROTATE_MS));
  act(() => mock.timers.tick(ROTATE_MS));
  assert.equal(showing(), labelOf(slides[0]));
  act(() => renderer.unmount());
});

test('featured carousel: holds still under a finger, and opens the pick it was showing when the finger went down', async t => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  t.after(() => mock.timers.reset());
  const { renderer, card, showing, opened, ROTATE_MS } = await setup();
  act(() => mock.timers.tick(ROTATE_MS - 100));
  act(() => card().props.onPressIn());
  act(() => mock.timers.tick(ROTATE_MS * 3));
  assert.equal(showing(), labelOf(slides[0]), 'paused while touched');
  act(() => card().props.onPressOut());
  act(() => card().props.onPress());
  assert.deepEqual(opened, [slides[0].key]);
  // Released, it only has the time that was left.
  act(() => mock.timers.tick(100));
  assert.equal(showing(), labelOf(slides[1]));
  act(() => renderer.unmount());
});

test('featured carousel: never moves by itself with Reduce Motion on, but VoiceOver-style steps still change pick', async t => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  t.after(() => mock.timers.reset());
  const { renderer, card, showing, opened, ROTATE_MS } = await setup({ reduceMotion: true });
  act(() => mock.timers.tick(ROTATE_MS * 3));
  assert.equal(showing(), labelOf(slides[0]));
  assert.equal(card().props.accessibilityRole, 'adjustable');
  act(() => card().props.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } }));
  assert.equal(showing(), labelOf(slides[2]));
  assert.deepEqual(card().props.accessibilityValue, { text: '3 of 3' });
  act(() => card().props.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } }));
  assert.deepEqual(opened, [slides[2].key]);
  act(() => renderer.unmount());
});

test('featured carousel: holds still while Home is out of sight', async t => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  t.after(() => mock.timers.reset());
  const { renderer, showing, ROTATE_MS } = await setup({ focused: false });
  act(() => mock.timers.tick(ROTATE_MS * 2));
  assert.equal(showing(), labelOf(slides[0]));
  act(() => renderer.unmount());
});
