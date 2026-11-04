const React = require('react');
const TestRenderer = require('react-test-renderer');
const path = require('path');
const fs = require('fs');
const Module = require('module');
const babel = require('@babel/core');
const repo = path.resolve(__dirname, '..');
const { act } = TestRenderer;

function createHarness(options = {}) {
  const cache = new Map(), listeners = new Set();
  const documents = new Map(Object.entries(options.documents || { 'users/audit': { username: 'audit' }, 'favourites/audit': { collections: [{ title: 'Weekend', color: '#A7C8FF', dates: ['Aldor Family Farm'] }] } }));
  const alerts = [], navigations = [], calls = [];
  const navigation = { navigate: (...args) => navigations.push(args), goBack: () => {} };
  const route = { params: { season: 'Fall', collection: { title: 'Weekend', color: '#A7C8FF', dates: [], userId: 'audit' } } };
  const auth = { currentUser: options.user || null, onAuthStateChanged: callback => { listeners.add(callback); callback(auth.currentUser); return () => listeners.delete(callback); } };
  const setUser = user => { auth.currentUser = user; for (const callback of listeners) callback(user); };
  const snapshot = ref => ({ exists: () => documents.has(ref.path), data: () => documents.get(ref.path), docs: [] });
  const firestore = {
    doc: (_, ...segments) => ({ path: segments.join('/') }),
    collection: (_, ...segments) => ({ path: segments.join('/') }),
    getDoc: async ref => { if (options.readError) throw Object.assign(new Error('Read failed'), { code: options.readError }); return snapshot(ref); },
    onSnapshot: (ref, next) => { next(snapshot(ref)); return () => {}; },
    query: ref => ref, where: (...args) => args, orderBy: (...args) => args,
    setDoc: async (ref, data) => documents.set(ref.path, data),
    addDoc: async (ref, data) => documents.set(ref.path + '/audit', data),
    serverTimestamp: () => new Date(0),
    runTransaction: async (_, callback) => {
      const writes = [];
      const result = await callback({ get: async ref => snapshot(ref), set: (ref, data) => writes.push([ref.path, data]), update: (ref, data) => writes.push([ref.path, { ...documents.get(ref.path), ...data }]) });
      if (options.beforeCommit) await options.beforeCommit();
      for (const [key, value] of writes) documents.set(key, value);
      return result;
    },
  };
  const firebase = {
    auth, db: {}, storage: {},
    login: async (email, password) => { calls.push(['login', email, password]); if (options.loginError) throw Object.assign(new Error('Login failed'), { code: options.loginError }); setUser({ uid: 'audit', email }); },
    register: async (email, password) => { calls.push(['register', email, password]); const user = { uid: 'new-audit', email }; setUser(user); return { user }; },
    logout: async () => { calls.push(['logout']); setUser(null); },
  };
  const animation = { start: callback => callback?.({ finished: true }), stop: () => {} };
  class Value { constructor(value) { this.value = value; } setValue(value) { this.value = value; } interpolate() { return this.value; } stopAnimation() {} }
  const Animated = { Value, View: 'AnimatedView', Text: 'AnimatedText', Image: 'AnimatedImage', ScrollView: 'AnimatedScrollView', timing: () => animation, spring: () => animation, parallel: () => animation, sequence: () => animation, stagger: () => animation, delay: () => animation, loop: () => ({ start() {}, stop() {} }), createAnimatedComponent: component => component };
  const rn = new Proxy({
    View: 'View', Text: 'Text', TextInput: 'TextInput', TouchableOpacity: 'TouchableOpacity', ActivityIndicator: 'ActivityIndicator', Switch: 'Switch',
    StyleSheet: { create: styles => styles, flatten: styles => styles, absoluteFillObject: {} },
    Dimensions: { get: () => ({ width: 390, height: 844 }) },
    Animated, Easing: new Proxy({}, { get: () => value => value }),
    Alert: { alert: (...args) => alerts.push(args) }, Platform: { OS: 'ios', select: value => value.ios },
    SectionList: ({ sections = [], renderItem, ...props }) => React.createElement('SectionList', props, sections.flatMap(section => section.data.map((item, index) => React.createElement(React.Fragment, { key: section.title + index }, renderItem({ item, index, section }))))),
    FlatList: ({ data = [], renderItem, ...props }) => React.createElement('FlatList', props, data.map((item, index) => React.createElement(React.Fragment, { key: index }, renderItem({ item, index })))),
  }, { get: (target, name) => name in target ? target[name] : String(name) });
  function Screen() { return null; }
  const nav = { useNavigation: () => navigation, useRoute: () => route, useFocusEffect: callback => React.useEffect(callback, [callback]), NavigationContainer: ({ children }) => React.createElement('NavigationContainer', null, children) };
  const storage = new Map(Object.entries(options.storage || {}));
  const stubs = {
    'react': React, 'react-native': rn, 'firebase/firestore': firestore,
    'firebase/auth': { onAuthStateChanged: (instance, callback) => instance.onAuthStateChanged(callback), deleteUser: async () => setUser(null) },
    '@react-navigation/native': nav,
    '@react-navigation/stack': { createStackNavigator: () => ({ Navigator: ({ children }) => React.createElement('Navigator', null, children), Screen }) },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    'react-native-svg': { __esModule: true, default: 'Svg', Svg: 'Svg', Path: 'Path', G: 'G', Text: 'SvgText', TSpan: 'TSpan' },
    '@react-native-async-storage/async-storage': { __esModule: true, default: { getItem: async key => storage.get(key) ?? null, setItem: async (key, value) => { storage.set(key, value); } } },
    'expo-location': { requestForegroundPermissionsAsync: options.locationPermissions || (async () => ({ status: 'denied' })), getCurrentPositionAsync: async () => { throw new Error('Location denied'); }, watchPositionAsync: async () => { calls.push(['watchLocation']); return { remove() {} }; }, Accuracy: { High: 4 } },
    'expo-linear-gradient': { LinearGradient: 'Gradient' },
    '@react-native-picker/picker': { Picker: Object.assign(({ children }) => React.createElement('Picker', null, children), { Item: 'PickerItem' }) },
    'react-native-maps': { __esModule: true, default: 'MapView', Marker: 'Marker' },
  };
  function load(relative) {
    const filename = path.resolve(repo, relative);
    if (filename.endsWith('firebaseConfig.js')) return firebase;
    if (/\.(png|jpe?g)$/.test(filename)) return filename;
    if (filename.endsWith('.json')) return JSON.parse(fs.readFileSync(filename, 'utf8'));
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = new Module(filename);
    module.filename = filename;
    module.paths = Module._nodeModulePaths(path.dirname(filename));
    const realRequire = Module.createRequire(filename);
    module.require = request => {
      if (stubs[request]) return stubs[request];
      if (/react-native-vector-icons|lottie-react-native|react-native-maps-directions|react-native-collapsible|react-native-confetti/.test(request)) return { __esModule: true, default: 'NativeWidget' };
      if (request.startsWith('.')) {
        const absolute = path.resolve(path.dirname(filename), request);
        return load(path.relative(repo, path.extname(absolute) ? absolute : absolute + '.js'));
      }
      return realRequire(request);
    };
    cache.set(filename, module);
    module._compile(babel.transformFileSync(filename, { configFile: false, babelrc: false, presets: ['babel-preset-expo'], plugins: ['@babel/plugin-transform-modules-commonjs'] }).code, filename);
    return module.exports;
  }
  async function render(relative, { contextUser = options.user || { uid: 'audit', email: 'codex.audit.render@example.com' }, location = false, props = {}, app = false } = {}) {
    const Component = load(relative).default;
    const { AuthContext } = load('contexts/AuthContext.js');
    const { SettingsContext } = load('screens/SettingsContext.js');
    let renderer;
    await act(async () => {
      const element = React.createElement(Component, { navigation, ...props });
      renderer = TestRenderer.create(app ? element : React.createElement(AuthContext.Provider, { value: { user: contextUser, setRegistering: value => calls.push(['setRegistering', value]), setRegistrationError: () => {} } }, React.createElement(SettingsContext.Provider, { value: { isLocationEnabled: location, toggleLocationServices: async () => {} } }, element)));
    });
    return renderer;
  }
  return { render, load, alerts, navigations, calls, documents, storage, auth, setUser, Screen };
}
module.exports = { createHarness, act };
