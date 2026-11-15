// A bundled picture, drawn through expo-image so it is kept in memory and on disk once loaded and can be
// preloaded at launch (services/preloadArt.js). Every illustration and bundled photo in the app goes through here.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

export default function Art({ source, style, ...rest }) {
  return (
    <Image source={source} style={style} contentFit="cover" cachePolicy="memory-disk" transition={0}
      accessible={false} {...rest} />
  );
}

// A picture behind its children, like React Native's ImageBackground.
export function ArtBackground({ source, style, imageStyle, children }) {
  return (
    <View style={style}>
      <Art source={source} style={[StyleSheet.absoluteFill, imageStyle]} />
      {children}
    </View>
  );
}
