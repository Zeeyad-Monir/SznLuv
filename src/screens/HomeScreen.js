// src/screens/HomeScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>SznLuv</Text>
        <View style={styles.icons}>
          <TouchableOpacity style={styles.icon}>❤️</TouchableOpacity>
          <TouchableOpacity style={styles.icon}>👤</TouchableOpacity>
        </View>
      </View>
      
      <Text style={styles.greeting}>Hello, Vanessa</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>In Season</Text>
        <TouchableOpacity style={[styles.card, styles.fallCard]}>
          <Text style={styles.cardText}>Fall</Text>
          <Text style={styles.cardSubText}>12 Active Ideas</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Seasons</Text>
        <TouchableOpacity style={[styles.card, styles.winterCard]}>
          <Text style={styles.cardText}>Winter</Text>
          <Text style={styles.cardSubText}>2 Active Ideas</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.card, styles.springCard]}>
          <Text style={styles.cardText}>Spring</Text>
          <Text style={styles.cardSubText}>5 Active Ideas</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef7f0',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  icons: {
    flexDirection: 'row',
  },
  icon: {
    fontSize: 24,
    marginHorizontal: 10,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  card: {
    padding: 20,
    borderRadius: 10,
    marginBottom: 10,
  },
  fallCard: {
    backgroundColor: '#ff8a65',
  },
  winterCard: {
    backgroundColor: '#90caf9',
  },
  springCard: {
    backgroundColor: '#f48fb1',
  },
  cardText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardSubText: {
    fontSize: 14,
    color: '#fff',
  },
});
