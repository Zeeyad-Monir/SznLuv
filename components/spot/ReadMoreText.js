// Long text cut to a few lines, with Read more / Read less, like the About section of SznLuv's spot pages.
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, honey, text } from '../theme';

export default function ReadMoreText({ children, lines = 5, style }) {
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(String(children ?? '').length > 280);
  return (
    <>
      <Text style={[text.body, style]} numberOfLines={open ? undefined : lines}
        onTextLayout={({ nativeEvent }) => { if (nativeEvent.lines.length > lines) setLong(true); }}>
        {children}
      </Text>
      {long && (
        <TouchableOpacity style={styles.toggle} onPress={() => setOpen(value => !value)}
          accessibilityRole="button" accessibilityState={{ expanded: open }}>
          <Text style={styles.toggleText}>{open ? 'Read less' : 'Read more'}</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  toggle: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  toggleText: { fontSize: 15, fontWeight: '700', color: honey.accent, textDecorationLine: 'underline' },
});
