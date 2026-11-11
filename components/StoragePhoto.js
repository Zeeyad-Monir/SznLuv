// A photo kept in Storage, loaded with the viewer's sign-in so storage.rules decide, every time, who may
// see it. Shows a local file instead while it is still uploading, and a quiet placeholder when there is
// no photo or it can't be shown.
import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { auth, photoUrl } from '../firebaseConfig';
import { colors } from './theme';

const signInToken = force => auth.currentUser?.getIdToken?.(force) ?? Promise.resolve(null);

export function PhotoPlaceholder({ style, icon = 'photo', size = 28 }) {
  return (
    <View style={[styles.placeholder, style]} accessible={false} importantForAccessibility="no-hide-descendants">
      <Icon name={icon} size={size} color={colors.label} />
    </View>
  );
}

export default function StoragePhoto({ path, localUri, style, placeholderIcon, accessibilityLabel, fallback }) {
  const [token, setToken] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retried = useRef(false);

  useEffect(() => {
    if (!path || localUri) return undefined;
    let live = true;
    signInToken(false).then(value => { if (live) setToken(value); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [path, localUri]);

  if (localUri) return failed ? fallback : <Image source={{ uri: localUri }} style={style}
    accessibilityLabel={accessibilityLabel} onError={fallback ? () => setFailed(true) : undefined} />;
  if (!path || failed) return fallback ?? <PhotoPlaceholder style={style} icon={placeholderIcon} />;
  if (!token) return fallback ?? <View style={[styles.placeholder, style]} />;
  return (
    <Image
      key={attempt}
      source={{ uri: photoUrl(path), headers: { Authorization: `Firebase ${token}` } }}
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessibilityIgnoresInvertColors
      // A token that just expired gets one fresh try; anything else (no longer shared, gone) shows the placeholder.
      onError={() => {
        if (retried.current) { setFailed(true); return; }
        retried.current = true;
        signInToken(true).then(value => { setToken(value); setAttempt(1); }).catch(() => setFailed(true));
      }}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFE6D8' },
});
