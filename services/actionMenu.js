// A short menu of actions: the native action sheet on iOS, a plain dialog elsewhere.
import { ActionSheetIOS, Alert, Platform } from 'react-native';

// options: [{ label, onPress, destructive }]
export function showMenu({ title, options }) {
  if (Platform.OS === 'ios') {
    const labels = [...options.map(option => option.label), 'Cancel'];
    ActionSheetIOS.showActionSheetWithOptions({
      title,
      options: labels,
      cancelButtonIndex: labels.length - 1,
      destructiveButtonIndex: options.findIndex(option => option.destructive),
    }, index => options[index]?.onPress());
    return;
  }
  Alert.alert(title ?? '', undefined, [
    ...options.map(option => ({ text: option.label, onPress: option.onPress, style: option.destructive ? 'destructive' : 'default' })),
    { text: 'Cancel', style: 'cancel' },
  ], { cancelable: true });
}
