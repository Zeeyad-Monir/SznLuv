// A place you added yourself shows its address or pin to everyone once it is in a public Top 4,
// so that is confirmed first. Calls onConfirm straight away when nothing would be revealed.
import { Alert } from 'react-native';
import { exposedLocations } from '../services/top4State';

export default function confirmExposure(picks, onConfirm) {
  const revealed = exposedLocations(picks);
  if (!revealed.length) return onConfirm();
  return Alert.alert(
    'Show these places?',
    `Anyone on SznLuv will see where they are:\n\n${revealed.map(entry => `${entry.name}: ${entry.text}`).join('\n')}`,
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Show', onPress: onConfirm }],
    { cancelable: true },
  );
}
