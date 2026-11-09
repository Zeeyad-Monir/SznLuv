// Title and X shared by the app's bottom sheets. Dragging the sheet down is the other way out.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function SheetHeader({ title, onClose, closeLabel, titleRef }) {
  return (
    <View style={styles.header}>
      <Text ref={titleRef} style={styles.title} accessibilityRole="header">{title}</Text>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={onClose}
        accessibilityLabel={closeLabel}
        accessibilityRole="button"
      >
        <Text style={styles.closeText}>X</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 28, // Clears the system grabber
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#323232',
  },
  closeButton: {
    position: 'absolute',
    top: 18, // Centres the X on the title line
    right: 4,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#888',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
