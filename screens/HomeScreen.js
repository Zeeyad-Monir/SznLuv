// screens/HomeScreen.js

import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../App';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);

  const [userName, setUserName] = useState('');
  const [fallCount, setFallCount] = useState(0);
  const [winterCount, setWinterCount] = useState(0);
  const [springCount, setSpringCount] = useState(0);
  const [summerCount, setSummerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        // Fetch the username from Firestore based on the user's UID
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUserName(userSnap.data().username);
        } else {
          setUserName('User');
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
        setUserName('User');
      }
    };

    const fetchDateCounts = async () => {
      try {
        // Fetch the number of active date ideas for each season
        const fallDatesRef = doc(db, 'dateCounts', 'fall');
        const fallDatesSnap = await getDoc(fallDatesRef);
        setFallCount(fallDatesSnap.exists() ? fallDatesSnap.data().count : 0);

        const winterDatesRef = doc(db, 'dateCounts', 'winter');
        const winterDatesSnap = await getDoc(winterDatesRef);
        setWinterCount(winterDatesSnap.exists() ? winterDatesSnap.data().count : 0);

        const springDatesRef = doc(db, 'dateCounts', 'spring');
        const springDatesSnap = await getDoc(springDatesRef);
        setSpringCount(springDatesSnap.exists() ? springDatesSnap.data().count : 0);

        const summerDatesRef = doc(db, 'dateCounts', 'summer');
        const summerDatesSnap = await getDoc(summerDatesRef);
        setSummerCount(summerDatesSnap.exists() ? summerDatesSnap.data().count : 0);
      } catch (error) {
        console.error('Error fetching date counts:', error);
        setFallCount(0);
        setWinterCount(0);
        setSpringCount(0);
        setSummerCount(0);
      }
    };

    const fetchData = async () => {
      await fetchUserName();
      await fetchDateCounts();
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    // Show a loading indicator while fetching data
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>SznLuv</Text>
          <View style={styles.logoUnderline} />
        </View>
        {/* Icons */}
        <View style={styles.iconContainer}>
          {/* Heart Icon Placeholder */}
          <TouchableOpacity onPress={() => navigation.navigate('Favorites')}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconPlaceholderText}>♡</Text>
            </View>
          </TouchableOpacity>
          {/* Profile Icon Placeholder */}
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconPlaceholderText}>☺</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Scrollable */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Greeting Section */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>Hello, {userName}</Text>
          <Text style={styles.subtext}>In Season</Text>
        </View>

        {/* Seasonal Blocks */}
        <View style={styles.seasonContainer}>
          {/* Fall Block */}
          <TouchableOpacity
            style={[styles.seasonBlock, { backgroundColor: '#FF7F50' }]}
            onPress={() => navigation.navigate('FallDatesScreen')}
          >
            <Text style={[styles.seasonTitle, { color: '#FFFFFF' }]}>Fall</Text>
            <Text style={[styles.seasonSubtitle, { color: '#FFFFFF' }]}>
              {fallCount} Active Ideas
            </Text>
          </TouchableOpacity>

          {/* Winter Block */}
          <TouchableOpacity
            style={[styles.seasonBlock, { backgroundColor: '#ADD8E6' }]}
            onPress={() => navigation.navigate('WinterDatesScreen')}
          >
            <Text style={[styles.seasonTitle, { color: '#333333' }]}>Winter</Text>
            <Text style={[styles.seasonSubtitle, { color: '#333333' }]}>
              {winterCount} Active Ideas
            </Text>
          </TouchableOpacity>

          {/* Spring Block */}
          <TouchableOpacity
            style={[styles.seasonBlock, { backgroundColor: '#FFB6C1' }]}
            onPress={() => navigation.navigate('SpringDatesScreen')}
          >
            <Text style={[styles.seasonTitle, { color: '#333333' }]}>Spring</Text>
            <Text style={[styles.seasonSubtitle, { color: '#333333' }]}>
              {springCount} Active Ideas
            </Text>
          </TouchableOpacity>

          {/* Summer Block */}
          <TouchableOpacity
            style={[styles.seasonBlock, { backgroundColor: '#FFD700' }]}
            onPress={() => navigation.navigate('SummerDatesScreen')}
          >
            <Text style={[styles.seasonTitle, { color: '#333333' }]}>Summer</Text>
            <Text style={[styles.seasonSubtitle, { color: '#333333' }]}>
              {summerCount} Active Ideas
            </Text>
          </TouchableOpacity>

          {/* Bottom Padding to Avoid Content Being Cut Off */}
          <View style={{ height: 20 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Overall container
  container: {
    flex: 1,
    backgroundColor: '#FFF5E4', // Light cream background
  },
  // Header section
  header: {
    height: 64, // Approximately 4rem
    backgroundColor: '#333333', // Dark charcoal
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, // 1.25rem
  },
  logoContainer: {
    flexDirection: 'column',
  },
  logoText: {
    fontSize: 24, // 1.5rem
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logoUnderline: {
    height: 2, // 0.125rem
    backgroundColor: '#C1A9E5', // Lavender underline
    marginTop: 4, // 0.25rem spacing below text
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 32, // 2rem diameter
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#A9A9A9', // Thin dark grey outline
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10, // 0.625rem spacing between icons
  },
  iconPlaceholderText: {
    fontSize: 20, // 1.25rem diameter
    color: '#333333',
  },
  // Scrollable content container
  scrollContent: {
    paddingBottom: 20, // Bottom padding to prevent content cutoff
  },
  // Greeting section
  greetingContainer: {
    marginTop: 40, // 2.5rem
    paddingHorizontal: 20, // Consistent horizontal padding
  },
  greetingText: {
    fontSize: 32, // 2rem
    fontWeight: 'bold',
    color: '#333333', // Dark grey
  },
  subtext: {
    marginTop: 10, // 0.625rem spacing
    fontSize: 14, // 0.875rem
    color: '#888888', // Light grey
  },
  // Seasonal blocks container
  seasonContainer: {
    paddingHorizontal: 20, // Consistent horizontal padding
    marginTop: 24, // 1.5rem spacing from greeting section
  },
  seasonBlock: {
    width: '100%',
    height: 160, // Approximately 10rem
    borderRadius: 12, // 0.75rem rounded corners
    marginBottom: 24, // 1.5rem vertical spacing between blocks
    paddingHorizontal: 20, // Consistent horizontal padding within block
    paddingTop: 20, // 1.25rem top padding
  },
  seasonTitle: {
    fontSize: 28, // 1.75rem
    fontWeight: 'bold',
  },
  seasonSubtitle: {
    marginTop: 10, // 0.625rem spacing below title
    fontSize: 14, // 0.875rem
  },
  // Loading indicator
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});