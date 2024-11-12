// screens/HomeScreen.js

import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
} 

from 'react-native';
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

  // Fetch username and seasonal date counts when the screen loads
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        // Get the current user's name from Firestore
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUserName(userSnap.data().username);
        } else {
          setUserName('User'); // Fallback if no username is found
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
        setUserName('User'); // Fallback on error
      }
    };

    const fetchDateCounts = async () => {
      try {
        // Fetch active date ideas count for each season
        const fallDatesRef = doc(db, 'dateCounts', 'fall');
        const fallDatesSnap = await getDoc(fallDatesRef);
        setFallCount(fallDatesSnap.exists() ? fallDatesSnap.data().count : 12);

        const winterDatesRef = doc(db, 'dateCounts', 'winter');
        const winterDatesSnap = await getDoc(winterDatesRef);
        setWinterCount(winterDatesSnap.exists() ? winterDatesSnap.data().count : 4);

        const springDatesRef = doc(db, 'dateCounts', 'spring');
        const springDatesSnap = await getDoc(springDatesRef);
        setSpringCount(springDatesSnap.exists() ? springDatesSnap.data().count : 2);

        const summerDatesRef = doc(db, 'dateCounts', 'summer');
        const summerDatesSnap = await getDoc(summerDatesRef);
        setSummerCount(summerDatesSnap.exists() ? summerDatesSnap.data().count : 2);
      } catch (error) {
        console.error('Error fetching date counts:', error);
        // Reset counts to 0 if error occurs
        setFallCount(0);
        setWinterCount(0);
        setSpringCount(0);
        setSummerCount(0);
      }
    };

    // Combined function to load both username and seasonal data
    const fetchData = async () => {
      await fetchUserName();
      await fetchDateCounts();
      setLoading(false); // Stop loading once data is fetched
    };

    fetchData();
  }, []);

  if (loading) {
    // Loading indicator while data is being fetched
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Header with logo and icons */}
      <View style={styles.header}>
        {/* App logo */}
        <Text style={styles.logoText}>SznLuv</Text>
        <View style={styles.iconContainer}>
          {/* Favorites screen link */}
          <TouchableOpacity onPress={() => navigation.navigate('Favorites')}>
            <View style={styles.iconCircle}>
              <Image
                source={require('../assets/FAVOURITES.png')}  // Adjusted path for Favorites image
                style={styles.iconImage} // Make sure to style the image
              />
            </View>
          </TouchableOpacity>

          {/* Profile screen link */}
          <TouchableOpacity onPress={() => navigation.navigate('ProfileScreen')}>
            <View style={styles.iconCircle}>
              <Image
                source={require('../assets/PROFILE.png')}  // Adjusted path for Profile image
                style={styles.iconImage} // Make sure to style the image
              />
            </View>
          </TouchableOpacity>

          {/* Custom icon link */}
          <TouchableOpacity onPress={() => navigation.navigate('SpinTheWheel')}>
            <View style={styles.iconCircle}>
              <Image
                source={require('../assets/SPINTHEWHEEL.png')}  // Adjusted path for SpinTheWheel image
                style={styles.iconImage} // Make sure to style the image
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main scrollable content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Welcome message for the user */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>Hello, {userName}!</Text>
          <Text style={styles.subtext}>In Season</Text>
        </View>

        {/* Seasonal blocks with active date counts */}
        <View style={styles.seasonContainer}>
          {/* Fall block with navigation to fall dates */}
          <TouchableOpacity
            style={[styles.seasonBlock, { backgroundColor: '#FF8657' }]}
            onPress={() => navigation.navigate('FallDatesScreen')}
          >
            <Text style={[styles.seasonTitle, { color: '#FFFFFF' }]}>Fall</Text>
            <Text style={[styles.seasonSubtitle, { color: '#FFFFFF' }]}>
              {fallCount} Active Ideas
            </Text>
          </TouchableOpacity>

          <Text style={styles.subtext}>Upcoming Seasons</Text>

          {/* Winter block with navigation to winter dates */}
          <TouchableOpacity
            style={[styles.seasonBlock, { backgroundColor: '#B9CCEC', marginTop: 28 }]}
            onPress={() => navigation.navigate('WinterDatesScreen')}
          >
            <Text style={[styles.seasonTitle, { color: '#333333' }]}>Winter</Text>
            <Text style={[styles.seasonSubtitle, { color: '#333333' }]}>
              {winterCount} Active Ideas
            </Text>
          </TouchableOpacity>

          {/* Spring block with navigation to spring dates */}
          <TouchableOpacity
            style={[styles.seasonBlock, { backgroundColor: '#FF9FD2' }]}
            onPress={() => navigation.navigate('SpringDatesScreen')}
          >
            <Text style={[styles.seasonTitle, { color: '#333333' }]}>Spring</Text>
            <Text style={[styles.seasonSubtitle, { color: '#333333' }]}>
              {springCount} Active Ideas
            </Text>
          </TouchableOpacity>

          {/* Summer block with navigation to summer dates */}
          <TouchableOpacity
            style={[styles.seasonBlock, { backgroundColor: '#F8DD74' }]}
            onPress={() => navigation.navigate('SummerDatesScreen')}
          >
            <Text style={[styles.seasonTitle, { color: '#333333' }]}>Summer</Text>
            <Text style={[styles.seasonSubtitle, { color: '#333333' }]}>
              {summerCount} Active Ideas
            </Text>
          </TouchableOpacity>

          {/* Bottom padding for scroll view */}
          <View style={{ height: 20 }} />
        </View>
      </ScrollView>
    </View>
  );
}

// Style definitions for HomeScreen components
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E4', // Light cream background color
  },
  
  header: {
    height: 130, // Adjust the height of the header to fit all elements
    backgroundColor: '#333333', // Dark background for contrast
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, // Spacing inside header
  },

  logoContainer: {
    marginTop: 45,
    flexDirection: 'column',
  },

  logoText: {
    marginTop: 45,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF', // White logo text
  },

  logoUnderline: {
    height: 2, // Thin underline under logo
    backgroundColor: '#C1A9E5', // Lavender color underline
    marginTop: 4, // Space between text and underline
  },


  iconContainer: {
    marginTop: 45,
    flexDirection: 'row', // Align the icons horizontally
    alignItems: 'center',
  },
  
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF', // Icon background
    borderWidth: 1,
    borderColor: '#A9A9A9', // Dark border
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10, // Space between icons
  },
  
  iconPlaceholderText: {
    fontSize: 20,
    color: '#333333', // Icon text color
  },
  scrollContent: {
    paddingBottom: 20, // Prevent content cutoff
  },
  greetingContainer: {
    marginTop: 40, // Vertical space for greeting
    paddingHorizontal: 20, // Horizontal padding for greeting
  },
  greetingText: {
    fontSize: 55,
    fontWeight: 'bold',
    color: '#333333', // Greeting text color
  },
  subtext: {
    marginTop: 20, // Space below greeting
    fontSize: 18,
    marginBottom: -12,
    color: '#C2B697', // Subtext color
    fontWeight: 'bold',
  },
  seasonContainer: {
    paddingHorizontal: 20, // Padding for season blocks
    marginTop: 24, // Space above season blocks
  },
  seasonBlock: {
    width: '100%',
    height: 160,
    borderRadius: 12, // Rounded corners for blocks
    marginBottom: 24, // Space between blocks
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  seasonTitle: {
    marginTop: 55,
    fontSize: 35,
    fontWeight: 'bold',
  },
  seasonSubtitle: {
    marginTop: 2, // Space below season title
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  iconImage: {
    width: 43,
    height: 43,
    resizeMode: 'contain',
  },
  
});