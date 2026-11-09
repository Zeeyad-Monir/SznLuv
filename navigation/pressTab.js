import { StackActions } from '@react-navigation/native';

// A re-tap still reaches the nested stack and useScrollToTop through tabPress.
export default function pressTab(state, navigation, routeName, { returnToRoot = false } = {}) {
  const route = state.routes.find(candidate => candidate.name === routeName);
  if (!route) return false;

  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
  if (event.defaultPrevented || state.routes[state.index].key === route.key) return false;

  // An inactive stack doesn't reset itself on tabPress. Pop it before switching to it.
  if (returnToRoot && route.state?.key && route.state.index > 0) {
    navigation.dispatch({ ...StackActions.popToTop(), target: route.state.key });
  }
  navigation.navigate(route.name);
  return true;
}
