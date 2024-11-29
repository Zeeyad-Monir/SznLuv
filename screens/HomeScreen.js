// screens/HomeScreen.js

import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../App';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import NavBar from '../components/NavBar';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);

  const [userName, setUserName] = useState('');
  const [fallCount, setFallCount] = useState(0);
  const [winterCount, setWinterCount] = useState(0);
  const [springCount, setSpringCount] = useState(0);
  const [summerCount, setSummerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Animated values for greeting text
  const greetingOpacity = useRef(new Animated.Value(0)).current;
  const greetingTranslateY = useRef(new Animated.Value(-20)).current;

  // Animated values for season blocks
  const seasonAnimations = [
    {
      translateY: useRef(new Animated.Value(30)).current,
      opacity: useRef(new Animated.Value(0)).current,
      scale: useRef(new Animated.Value(0.9)).current,
    },
    {
      translateY: useRef(new Animated.Value(30)).current,
      opacity: useRef(new Animated.Value(0)).current,
      scale: useRef(new Animated.Value(0.9)).current,
    },
    {
      translateY: useRef(new Animated.Value(30)).current,
      opacity: useRef(new Animated.Value(0)).current,
      scale: useRef(new Animated.Value(0.9)).current,
    },
    {
      translateY: useRef(new Animated.Value(30)).current,
      opacity: useRef(new Animated.Value(0)).current,
      scale: useRef(new Animated.Value(0.9)).current,
    },
  ];

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

  // Trigger animations after loading is complete
  useEffect(() => {
    if (!loading) {
      // Animate the greeting text
      Animated.parallel([
        Animated.timing(greetingOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(greetingTranslateY, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      // Animate the season blocks
      seasonAnimations.forEach((anim, index) => {
        const delay = 500 + index * 300;
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 600,
            delay: delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateY, {
            toValue: 0,
            duration: 600,
            delay: delay,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.spring(anim.scale, {
            toValue: 1,
            friction: 5,
            tension: 40,
            delay: delay,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [loading]);

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
      {/* Add the NavBar component */}
      <NavBar />

      {/* Main scrollable content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Welcome message for the user */}
        <Animated.View
          style={[
            styles.greetingContainer,
            {
              opacity: greetingOpacity,
              transform: [{ translateY: greetingTranslateY }],
            },
          ]}
        >
          <Text style={styles.greetingText}>Hello, {userName}!</Text>
          <Text style={styles.subtext}>In Season</Text>
        </Animated.View>

        {/* Seasonal blocks with active date counts */}
        <View style={styles.seasonContainer}>
          {/* Fall block with navigation to fall dates */}
          <Animated.View
            style={[
              {
                opacity: seasonAnimations[0].opacity,
                transform: [
                  { translateY: seasonAnimations[0].translateY },
                  { scale: seasonAnimations[0].scale },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.seasonBlock, { backgroundColor: '#FF8657' }]}
              onPress={() => navigation.navigate('FallDatesScreen')}
            >
              <Text style={[styles.seasonTitle, { color: '#FFFFFF' }]}>Fall</Text>
              <Text style={[styles.seasonSubtitle, { color: '#FFFFFF' }]}>
                {fallCount} Active Ideas
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.Text
            style={[
              styles.subtext,
              {
                opacity: seasonAnimations[1].opacity,
                transform: [{ translateY: seasonAnimations[1].translateY }],
              },
            ]}
          >
            Upcoming Seasons
          </Animated.Text>

          {/* Winter block with navigation to winter dates */}
          <Animated.View
            style={[
              {
                opacity: seasonAnimations[1].opacity,
                transform: [
                  { translateY: seasonAnimations[1].translateY },
                  { scale: seasonAnimations[1].scale },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.seasonBlock, { backgroundColor: '#B9CCEC', marginTop: 28 }]}
              onPress={() => navigation.navigate('WinterDatesScreen')}
            >
              <Text style={[styles.seasonTitle, { color: '#333333' }]}>Winter</Text>
              <Text style={[styles.seasonSubtitle, { color: '#333333' }]}>
                {winterCount} Active Ideas
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Spring block with navigation to spring dates */}
          <Animated.View
            style={[
              {
                opacity: seasonAnimations[2].opacity,
                transform: [
                  { translateY: seasonAnimations[2].translateY },
                  { scale: seasonAnimations[2].scale },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.seasonBlock, { backgroundColor: '#FF9FD2' }]}
              onPress={() => navigation.navigate('SpringDatesScreen')}
            >
              <Text style={[styles.seasonTitle, { color: '#333333' }]}>Spring</Text>
              <Text style={[styles.seasonSubtitle, { color: '#333333' }]}>
                {springCount} Active Ideas
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Summer block with navigation to summer dates */}
          <Animated.View
            style={[
              {
                opacity: seasonAnimations[3].opacity,
                transform: [
                  { translateY: seasonAnimations[3].translateY },
                  { scale: seasonAnimations[3].scale },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.seasonBlock, { backgroundColor: '#F8DD74' }]}
              onPress={() => navigation.navigate('SummerDatesScreen')}
            >
              <Text style={[styles.seasonTitle, { color: '#333333' }]}>Summer</Text>
              <Text style={[styles.seasonSubtitle, { color: '#333333' }]}>
                {summerCount} Active Ideas
              </Text>
            </TouchableOpacity>
          </Animated.View>

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
});