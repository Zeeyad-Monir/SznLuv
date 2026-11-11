const React = require('react');
const TestRenderer = require('react-test-renderer');
const path = require('path');
const fs = require('fs');
const Module = require('module');
const babel = require('@babel/core');
const repo = path.resolve(__dirname, '..');
const { act } = TestRenderer;

global.requestAnimationFrame ??= callback => setTimeout(callback, 0);
global.cancelAnimationFrame ??= clearTimeout;

function createHarness(options = {}) {
  const cache = new Map(), listeners = new Set();
  const documents = new Map(Object.entries(options.documents || { 'users/audit': { username: 'audit' }, 'favourites/audit': { collections: [{ title: 'Weekend', color: '#A7C8FF', dates: ['Aldor Family Farm'] }] } }));
  const alerts = [], navigations = [], calls = [], dispatches = [], timings = [], menus = [];
  const navigation = {
    navigate: (...args) => navigations.push(args),
    popTo: (...args) => { calls.push(['popTo', ...args]); navigations.push(args); },
    goBack: () => calls.push(['goBack']),
    pop: count => calls.push(['pop', count]),
    replace: (...args) => { calls.push(['replace', ...args]); navigations.push(args); },
    dispatch: action => dispatches.push(action),
    isFocused: () => options.focused !== false,
    addListener: () => () => {},
  };
  const route = { params: { season: 'Fall', collection: { title: 'Weekend', color: '#A7C8FF', dates: [], userId: 'audit' } } };
  const auth = { currentUser: options.user || null, onAuthStateChanged: callback => { listeners.add(callback); callback(auth.currentUser); return () => listeners.delete(callback); } };
  const setUser = user => { auth.currentUser = user; for (const callback of listeners) callback(user); };
  // A small in-memory Firestore: documents by path, equality/range/array queries, merges, and live listeners
  // that hear about every write, so screens under test update the way they do against the real thing.
  const REMOVE = Symbol('deleteField');
  const liveListeners = new Set();
  let autoId = 0;
  const makeRef = (parent, segments, type) => {
    // Like Firestore, "a/b" as one argument is two segments.
    const parts = [...(parent?.path ? parent.path.split('/') : []), ...segments.flatMap(segment => String(segment).split('/'))];
    if (type === 'doc' && parts.length % 2) parts.push('auto' + String(++autoId).padStart(16, '0'));
    const refPath = parts.join('/');
    return { path: refPath, id: parts.at(-1), type };
  };
  const docSnapshot = ref => ({
    id: ref.id, ref, exists: () => documents.has(ref.path), data: () => documents.get(ref.path),
    metadata: { fromCache: false, hasPendingWrites: false },
  });
  const satisfies = (data, { field, op, value }) => {
    const actual = data?.[field];
    if (op === '==') return actual === value;
    if (op === '>=') return actual >= value;
    if (op === '<=') return actual <= value;
    if (op === 'array-contains') return Array.isArray(actual) && actual.includes(value);
    if (op === 'array-contains-any') return Array.isArray(actual) && value.some(item => actual.includes(item));
    return true;
  };
  const querySnapshot = ref => {
    const prefix = ref.path + '/';
    const wheres = (ref.constraints || []).filter(constraint => constraint?.type === 'where');
    const docs = [...documents.keys()]
      .filter(key => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'))
      .map(key => docSnapshot({ path: key, id: key.split('/').pop(), type: 'doc' }))
      .filter(candidate => wheres.every(constraint => satisfies(candidate.data(), constraint)));
    const constraint = type => (ref.constraints || []).find(candidate => candidate?.type === type);
    const order = constraint('orderBy');
    let ordered = docs;
    if (order) {
      const [field, direction] = order.args;
      ordered = [...docs].sort((a, b) => (direction === 'desc' ? -1 : 1) * ((a.data()[field] ?? 0) - (b.data()[field] ?? 0)));
      const after = constraint('startAfter');
      if (after) ordered = ordered.filter(candidate => (direction === 'desc' ? candidate.data()[field] < after.value : candidate.data()[field] > after.value));
    }
    const cap = constraint('limit');
    if (cap) ordered = ordered.slice(0, cap.count);
    return { docs: ordered, empty: !ordered.length, size: ordered.length, exists: () => false, data: () => undefined };
  };
  const snapshot = ref => (ref.type === 'collection' ? querySnapshot(ref) : { ...docSnapshot(ref), docs: [] });
  const resolveFields = (current, data) => {
    const next = { ...current };
    for (const [key, value] of Object.entries(data)) {
      if (value === REMOVE) delete next[key];
      else if (value?.arrayUnion) next[key] = [...new Set([...(next[key] || []), ...value.arrayUnion])];
      else if (value?.arrayRemove) next[key] = (next[key] || []).filter(item => !value.arrayRemove.includes(item));
      else next[key] = value;
    }
    return next;
  };
  const write = (ref, data, { merge = false } = {}) => documents.set(ref.path, resolveFields(merge ? documents.get(ref.path) : {}, data));
  const notifyListeners = () => [...liveListeners].forEach(({ ref, next }) => next(snapshot(ref)));
  const failWrite = () => { if (options.writeError) throw Object.assign(new Error('Write failed'), { code: options.writeError }); };
  const firestore = {
    doc: (parent, ...segments) => makeRef(parent, segments, 'doc'),
    collection: (parent, ...segments) => makeRef(parent, segments, 'collection'),
    getDoc: async ref => { if (options.beforeRead) await options.beforeRead(ref); if (options.readError) throw Object.assign(new Error('Read failed'), { code: options.readError }); return snapshot(ref); },
    getDocFromServer: async ref => firestore.getDoc(ref),
    getDocs: async ref => { if (options.readError) throw Object.assign(new Error('Read failed'), { code: options.readError }); return querySnapshot(ref); },
    onSnapshot: (ref, settingsOrNext, nextOrError, onError) => {
      const next = typeof settingsOrNext === 'function' ? settingsOrNext : nextOrError;
      const error = typeof settingsOrNext === 'function' ? nextOrError : onError;
      const listener = { ref, next, error };
      liveListeners.add(listener);
      if (!options.onListen?.(listener, snapshot(ref))) next(snapshot(ref));
      return () => liveListeners.delete(listener);
    },
    query: (ref, ...constraints) => ({ ...ref, constraints: [...(ref.constraints || []), ...constraints] }),
    where: (field, op, value) => ({ type: 'where', field, op, value }),
    orderBy: (...args) => ({ type: 'orderBy', args }), limit: count => ({ type: 'limit', count }), startAfter: value => ({ type: 'startAfter', value }),
    deleteField: () => REMOVE, arrayUnion: (...items) => ({ arrayUnion: items }), arrayRemove: (...items) => ({ arrayRemove: items }),
    setDoc: async (ref, data, settings) => { failWrite(); write(ref, data, settings); notifyListeners(); },
    updateDoc: async (ref, data) => { failWrite(); write(ref, data, { merge: true }); notifyListeners(); },
    deleteDoc: async ref => { failWrite(); documents.delete(ref.path); notifyListeners(); },
    addDoc: async (ref, data) => { documents.set(ref.path + '/audit', data); notifyListeners(); },
    serverTimestamp: () => new Date(0),
    writeBatch: () => {
      const steps = [];
      return {
        set: (ref, data, settings) => steps.push(() => write(ref, data, settings)),
        update: (ref, data) => steps.push(() => write(ref, data, { merge: true })),
        delete: ref => steps.push(() => documents.delete(ref.path)),
        commit: async () => { failWrite(); steps.forEach(step => step()); notifyListeners(); },
      };
    },
    runTransaction: async (_, callback) => {
      const steps = [];
      const result = await callback({
        get: async ref => snapshot(ref),
        set: (ref, data, settings) => steps.push(() => write(ref, data, settings)),
        update: (ref, data) => steps.push(() => write(ref, data, { merge: true })),
        delete: ref => steps.push(() => documents.delete(ref.path)),
      });
      if (options.beforeCommit) await options.beforeCommit();
      if (steps.length) failWrite(); // A transaction that only read has nothing to fail on
      steps.forEach(step => step());
      notifyListeners();
      return result;
    },
  };
  // Storage: files by path. With `holdUploads`, uploads wait for finishUploads(), to see them in progress.
  const files = new Map(Object.entries(options.files || {}));
  const heldUploads = [];
  const finishUploads = () => heldUploads.splice(0).forEach(run => run());
  const storageStub = {
    getStorage: () => ({}), connectStorageEmulator() {},
    ref: (_, fullPath) => ({ fullPath }),
    uploadBytesResumable: (ref, blob, metadata) => ({
      cancel() {},
      on: (_event, next, fail, complete) => {
        const run = () => {
          if (options.uploadError) { fail(Object.assign(new Error('Upload failed'), { code: options.uploadError })); return; }
          next({ bytesTransferred: 1, totalBytes: 2 });
          files.set(ref.fullPath, { size: blob.size, contentType: metadata?.contentType });
          calls.push(['upload', ref.fullPath]);
          complete();
        };
        if (options.holdUploads) heldUploads.push(run);
        else setTimeout(run, 0);
      },
    }),
    deleteObject: async ref => { files.delete(ref.fullPath); calls.push(['deletePhoto', ref.fullPath]); },
    listAll: async ref => ({ items: [...files.keys()].filter(key => key.startsWith(ref.fullPath + '/')).map(fullPath => ({ fullPath })) }),
  };
  global.XMLHttpRequest = class {
    open(method, url) { this.url = url; }
    send() { setTimeout(() => { this.response = { size: options.photoBytes ?? 300000, close() {} }; this.onload(); }, 0); }
  };
  const firebase = {
    auth, db: options.db || {}, storage: {},
    photoUrl: path => 'https://storage.test/' + encodeURIComponent(path),
    login: async (email, password) => { calls.push(['login', email, password]); if (options.loginError) throw Object.assign(new Error('Login failed'), { code: options.loginError }); setUser({ uid: 'audit', email }); },
    register: async (email, password) => { calls.push(['register', email, password]); const user = { uid: 'new-audit', email }; setUser(user); return { user }; },
    logout: async () => { calls.push(['logout']); setUser(null); },
  };
  const animation = { start: callback => callback?.({ finished: true }), stop: () => {} };
  class Value { constructor(value) { this.value = value; } setValue(value) { this.value = value; } interpolate() { return this.value; } stopAnimation() {} }
  const Animated = { Value, View: 'AnimatedView', Text: 'AnimatedText', Image: 'AnimatedImage', ScrollView: 'AnimatedScrollView', timing: (value, config) => { timings.push(config); return animation; }, spring: () => animation, parallel: () => animation, sequence: () => animation, stagger: () => animation, delay: () => animation, loop: () => ({ start() {}, stop() {} }), createAnimatedComponent: component => component, add: (a, b) => a + b.value };
  const urlListeners = new Set();
  const openUrl = url => [...urlListeners].forEach(listener => listener({ url }));
  const appStateListeners = new Set();
  const appState = state => appStateListeners.forEach(listener => listener(state));
  const keyboardListeners = new Map(), accessibilityListeners = new Map();
  const listen = (listeners, event, callback) => {
    listeners.set(event, callback);
    return { remove: () => listeners.delete(event) };
  };
  // Several components listen for the keyboard at once (the tab pill, the snackbar).
  const listenKeyboard = (event, callback) => {
    if (!keyboardListeners.has(event)) keyboardListeners.set(event, new Set());
    keyboardListeners.get(event).add(callback);
    return { remove: () => keyboardListeners.get(event)?.delete(callback) };
  };
  const keyboardEvent = (event, payload) => [...(keyboardListeners.get(event) ?? [])].forEach(callback => callback(payload));
  const accessibilityEvent = (event, value) => accessibilityListeners.get(event)?.(value);
  const platform = options.platform ?? 'ios';
  const rn = new Proxy({
    View: 'View', Text: 'Text', TextInput: 'TextInput', TouchableOpacity: 'TouchableOpacity', ActivityIndicator: 'ActivityIndicator', Switch: 'Switch',
    StyleSheet: { create: styles => styles, flatten: styles => styles, absoluteFillObject: {}, hairlineWidth: 1 },
    Dimensions: { get: () => ({ width: 390, height: 844 }) },
    useWindowDimensions: () => ({ width: 390, height: 844, ...options.window }),
    Keyboard: {
      dismiss() {},
      isVisible: () => false,
      addListener: listenKeyboard,
    },
    AppState: { addEventListener: (_, listener) => { appStateListeners.add(listener); return { remove: () => appStateListeners.delete(listener) }; } },
    ActionSheetIOS: { showActionSheetWithOptions: (config, onPick) => menus.push({ ...config, pick: label => onPick(config.options.indexOf(label)) }) },
    LayoutAnimation: { configureNext: () => calls.push(['layoutAnimation']), Presets: { easeInEaseOut: {} } },
    Share: { share: async content => { calls.push(['share', content]); return { action: 'sharedAction' }; } },
    Linking: { openSettings: async () => calls.push(['openSettings']), openURL: async url => calls.push(['openURL', url]) },
    Modal: ({ visible, onShow, onDismiss, ...props }) => {
      React.useEffect(() => { if (visible) onShow(); else onDismiss(); }, [visible]);
      return visible ? React.createElement('Modal', props) : null;
    },
    PanResponder: { create: handlers => ({ panHandlers: handlers }) },
    findNodeHandle: element => element?.tag ?? null,
    Animated, Easing: new Proxy({}, { get: () => value => value }),
    Alert: { alert: (...args) => alerts.push(args) }, Platform: { OS: platform, select: value => value[platform] ?? value.default },
    AccessibilityInfo: {
      isReduceMotionEnabled: async () => !!options.reduceMotion,
      isReduceTransparencyEnabled: async () => !!options.reduceTransparency,
      addEventListener: (event, callback) => listen(accessibilityListeners, event, callback),
      setAccessibilityFocus: tag => calls.push(['focusAccessibility', tag]),
    },
    SectionList: ({ sections = [], renderItem, ...props }) => React.createElement('SectionList', props, sections.flatMap(section => section.data.map((item, index) => React.createElement(React.Fragment, { key: section.title + index }, renderItem({ item, index, section }))))),
    FlatList: ({ data = [], renderItem, ...props }) => React.createElement('FlatList', props, data.map((item, index) => React.createElement(React.Fragment, { key: index }, renderItem({ item, index })))),
  }, { get: (target, name) => name in target ? target[name] : String(name) });
  function Screen() { return null; }
  // usePreventRemove: the latest screen to ask holds the guard; leave() tries to go back past it.
  const preventRemove = { prevent: false, callback: null };
  const leave = () => {
    const action = { type: 'GO_BACK' };
    if (preventRemove.prevent) preventRemove.callback({ data: { action } });
    else dispatches.push(action);
  };
  const nav = {
    useNavigation: () => navigation, useRoute: () => route, useFocusEffect: callback => React.useEffect(callback, [callback]),
    usePreventRemove: (prevent, callback) => { preventRemove.prevent = prevent; preventRemove.callback = callback; },
    useIsFocused: () => options.focused !== false, useScrollToTop: () => {},
    NavigationContainer: React.forwardRef(({ children }, ref) => React.createElement('NavigationContainer', null, children)),
    createNavigationContainerRef: () => ({ current: null, isReady: () => !!options.rootState, getRootState: () => options.rootState,
      dispatch: navigation.dispatch, canGoBack: () => false, goBack: () => {} }),
    DefaultTheme: { dark: false, colors: {} },
    StackActions: { pop: count => ({ type: 'POP', payload: { count } }), popToTop: () => ({ type: 'POP_TO_TOP' }),
      popTo: (name, params) => ({ type: 'POP_TO', payload: { name, params } }) },
    CommonActions: { navigate: (...args) => ({ type: 'NAVIGATE', payload: args }) },
  };
  const navigator = () => ({ Navigator: ({ children }) => React.createElement('Navigator', null, children), Screen });
  const storage = new Map(Object.entries(options.storage || {}));
  const stubs = {
    'react': React, 'react-native': rn, 'firebase/firestore': firestore,
    'firebase/auth': { onAuthStateChanged: (instance, callback) => instance.onAuthStateChanged(callback), deleteUser: async () => setUser(null) },
    '@react-navigation/native': nav,
    '@react-navigation/native-stack': { createNativeStackNavigator: navigator },
    '@react-navigation/bottom-tabs': { createBottomTabNavigator: navigator },
    'react-native-safe-area-context': { SafeAreaProvider: ({ children }) => React.createElement('SafeAreaProvider', null, children), useSafeAreaInsets: () => ({ top: 62, bottom: 34, left: 0, right: 0, ...options.insets }) },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    'react-native-svg': { __esModule: true, default: 'Svg', Svg: 'Svg', Path: 'Path', G: 'G', Text: 'SvgText', TSpan: 'TSpan' },
    '@react-native-async-storage/async-storage': { __esModule: true, default: { getItem: async key => storage.get(key) ?? null, setItem: async (key, value) => { storage.set(key, value); } } },
    'expo-location': {
      requestForegroundPermissionsAsync: options.locationPermissions || (async () => ({ status: 'denied' })),
      getForegroundPermissionsAsync: options.getLocationPermissions || (async () => ({ granted: true })),
      hasServicesEnabledAsync: options.locationServices || (async () => true),
      getCurrentPositionAsync: options.getPosition || (async () => { throw new Error('Location denied'); }),
      watchPositionAsync: async () => { calls.push(['watchLocation']); return { remove() {} }; },
      Accuracy: { Balanced: 3, High: 4 },
    },
    'expo-linear-gradient': { LinearGradient: 'Gradient' },
    'expo-blur': { BlurView: 'BlurView' },
    'expo-linking': {
      createURL: linkPath => 'sznluv://' + linkPath,
      getInitialURL: async () => options.initialUrl ?? null,
      addEventListener: (_, listener) => { urlListeners.add(listener); return { remove: () => urlListeners.delete(listener) }; },
    },
    'expo-clipboard': { setStringAsync: async value => { calls.push(['setClipboard', value]); return true; } },
    'expo-haptics': { selectionAsync: async () => { calls.push(['selectionHaptic']); } },
    '@react-native-picker/picker': { Picker: Object.assign(({ children }) => React.createElement('Picker', null, children), { Item: 'PickerItem' }) },
    'react-native-maps': { __esModule: true, default: 'MapView', Marker: 'Marker' },
    'firebase/storage': storageStub,
    // The Explore recommendations. Without `exploreFeed` the function is unreachable, as it is before it is deployed.
    'firebase/functions': {
      getFunctions: () => ({}), connectFunctionsEmulator: () => {},
      httpsCallable: (_, name) => async data => {
        calls.push(['callFunction', name, data]);
        if (!options.exploreFeed) throw Object.assign(new Error('Function unavailable'), { code: 'functions/unavailable' });
        return { data: await options.exploreFeed(data) };
      },
    },
    'expo-image-picker': {
      launchImageLibraryAsync: async config => { calls.push(['pickPhotos', config]); return options.pickPhotos ? options.pickPhotos(config) : { canceled: true }; },
    },
    'expo-image-manipulator': {
      SaveFormat: { JPEG: 'jpeg' },
      manipulateAsync: async (uri, actions, saveOptions) => { calls.push(['shrink', uri, actions, saveOptions]); return { uri: `${uri}#small` }; },
    },
  };
  // Lets a test swap a stub for the real module, e.g. real Firestore against the emulator.
  Object.assign(stubs, options.stubs);
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
  async function renderElement(element, { contextUser = options.user || { uid: 'audit', email: 'codex.audit.render@example.com' }, location = false, app = false } = {}) {
    await Promise.resolve(); // Lets the Reduce Motion setting, read at import, arrive before the first render
    const { AuthContext } = load('contexts/AuthContext.js');
    const { SettingsContext } = load('screens/SettingsContext.js');
    const { SpotDiscoveryProvider } = load('hooks/useSpotDiscovery.js');
    function LocationSettings({ children }) {
      const [isLocationEnabled, setIsLocationEnabled] = React.useState(location);
      return React.createElement(SettingsContext.Provider, {
        value: { isLocationEnabled, setIsLocationEnabled, toggleLocationServices: async () => {} },
      }, React.createElement(SpotDiscoveryProvider, null, children));
    }
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(app ? element : React.createElement(AuthContext.Provider, {
        value: { user: contextUser, setRegistering: value => calls.push(['setRegistering', value]), setRegistrationError: () => {} },
      }, React.createElement(LocationSettings, null, element)), {
        createNodeMock: node => {
          if (node.type === 'ScrollView') return { scrollTo() {} };
          if (node.type === 'MapView') return {
            fitToCoordinates: (...args) => calls.push(['fitToCoordinates', ...args]),
            animateToRegion: (...args) => calls.push(['animateToRegion', ...args]),
          };
          if (node.type === 'Text' || node.type === 'TouchableOpacity') {
            return { tag: node.props.accessibilityLabel ?? node.props.children };
          }
          return null;
        },
      });
    });
    return renderer;
  }
  function render(relative, { props, ...options } = {}) {
    const Component = load(relative).default;
    return renderElement(React.createElement(Component, { navigation, ...props }), options);
  }
  // Stub the network: weather requests are recorded in `calls` and answered with a small canned forecast.
  const noon = 1793880000; // a fixed epoch second; five consecutive days
  const forecast = {
    cod: '200',
    city: { name: 'Testville', country: 'CA' },
    list: [0, 1, 2, 3, 4].map(day => ({ dt: noon + day * 86400, main: { temp: 10 + day, humidity: 60 }, weather: [{ icon: '01d', description: 'clear sky' }], wind: { speed: 3 } })),
  };
  global.fetch = options.fetch || (async url => { calls.push(['fetch', String(url)]); return { ok: true, status: 200, json: async () => forecast }; });
  return { render, renderElement, load, menus, openUrl, alerts, leave, files, finishUploads, navigations, calls, dispatches, timings, navigation, documents, storage, auth, setUser, appState, keyboardEvent, accessibilityEvent, Screen };
}
module.exports = { createHarness, act };
