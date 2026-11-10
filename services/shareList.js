// Hands a public list's link to the system share sheet.
import { Share } from 'react-native';
import * as Linking from 'expo-linking';
import { linkPath, shareMessage } from './links';

// sznluv://list/{id} in a build; the equivalent exp:// address in Expo Go.
export const listUrl = listId => Linking.createURL(linkPath({ type: 'list', listId }));

export function shareList(list) {
  return Share.share({ message: shareMessage(list, listUrl(list.id)) });
}
