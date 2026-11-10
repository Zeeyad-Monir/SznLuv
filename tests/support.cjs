// Shared by the screen tests: renders a screen the way the app wraps it and gives short ways to poke at it.
const assert = require('node:assert/strict');
const React = require('react');
const { act } = require('./renderHarness.cjs');

const flush = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

// Screens are rendered the way the app wraps them: lists provider outside, snackbar inside.
async function mount(h, relative, { params, props, user = { uid: 'audit', email: 'audit@example.com' }, username = 'audit' } = {}) {
  const { SnackbarProvider } = h.load('components/Snackbar.js');
  const { MyListsProvider } = h.load('hooks/useMyLists.js');
  const Component = h.load(relative).default;
  const { AuthContext } = h.load('contexts/AuthContext.js');
  const renderer = await h.renderElement(React.createElement(AuthContext.Provider, { value: { user, username } },
    React.createElement(MyListsProvider, null,
      React.createElement(SnackbarProvider, null,
        React.createElement(Component, { navigation: h.navigation, route: { params: params ?? {} }, ...props })))));
  await flush();
  const all = type => renderer.root.findAllByType(type);
  const button = label => all('TouchableOpacity').find(node => node.props.accessibilityLabel === label)
    ?? all('TouchableOpacity').find(node => JSON.stringify(textOf(node)) === JSON.stringify([label]));
  const texts = () => textOf(renderer.root);
  const press = async label => {
    const node = button(label);
    assert.ok(node, `no button "${label}" among: ${all('TouchableOpacity').map(n => n.props.accessibilityLabel ?? textOf(n).join(' ')).join(' | ')}`);
    await act(async () => { await node.props.onPress(); });
    await flush();
  };
  const snackbar = () => {
    const bar = renderer.root.findAll(node => node.props.testID === 'snackbar')[0];
    return bar ? textOf(bar) : null;
  };
  return { renderer, all, button, texts, press, snackbar };
}
// Every piece of text under `node`, one entry per outermost Text, with nested Text joined in.
function textOf(node) {
  const flatten = instance => instance.children.map(child => (typeof child === 'string' ? child : flatten(child))).join('');
  const insideText = instance => {
    for (let parent = instance.parent; parent && parent !== node.parent; parent = parent.parent) if (parent.type === 'Text') return true;
    return false;
  };
  return node.findAll(instance => instance.type === 'Text' && !insideText(instance)).map(flatten).filter(Boolean);
}
const quiet = async run => {
  const real = console.error;
  console.error = () => {};
  try { return await run(); } finally { console.error = real; }
};


module.exports = { mount, textOf, quiet, flush };
