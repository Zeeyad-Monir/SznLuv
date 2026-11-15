// A spot's name, wherever it is shown. It is drawn at its normal size when it fits, shrinks to fit when it
// doesn't, but never below SPOT_NAME_MIN_SIZE: a name too long even at that size stays there and ends in "…"
// (or, with `wrap`, runs onto more lines; the spot's own page uses that so its name is always whole).
//
// React Native can't be told that floor on its own: the New Architecture ignores `minimumFontScale`, the
// `minimumFontSize` it does read never reaches native, and the line metrics it reports after shrinking don't
// match what it drew. So a hidden copy of the name, laid out at the floor size in the same width, says whether
// it fits there in `numberOfLines`. If it does, the system's own shrinking never needs to go below the floor;
// if it doesn't, the name is drawn at the floor and cut off.
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SPOT_NAME_MIN_SIZE } from './theme';

// Marks the hidden copy, which no one sees or hears (the tests skip it too).
export const PROBE_ID = 'spot-name-probe';

export default function SpotName({ style, boxStyle, numberOfLines = 1, wrap = false, children, ...rest }) {
  // null until the hidden copy has been laid out; the name stays invisible till then, so it never flashes
  // at the wrong size.
  const [tooLong, setTooLong] = useState(null);
  const size = StyleSheet.flatten(style)?.fontSize ?? SPOT_NAME_MIN_SIZE;
  const floor = Math.min(size, SPOT_NAME_MIN_SIZE);

  return (
    <View style={boxStyle}>
      <Text testID={PROBE_ID} style={[style, styles.probe, { fontSize: floor }]} accessible={false}
        importantForAccessibility="no-hide-descendants"
        onTextLayout={({ nativeEvent }) => setTooLong(nativeEvent.lines.length > numberOfLines)}>
        {children}
      </Text>
      {tooLong
        ? (
          <Text style={[style, { fontSize: floor }]} numberOfLines={wrap ? 0 : numberOfLines} ellipsizeMode="tail" {...rest}>
            {children}
          </Text>
        ) : (
          <Text style={[style, tooLong === null && styles.hidden]} numberOfLines={numberOfLines} ellipsizeMode="tail"
            adjustsFontSizeToFit minimumFontScale={floor / size} {...rest}>
            {children}
          </Text>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  probe: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0 },
  hidden: { opacity: 0 },
});
