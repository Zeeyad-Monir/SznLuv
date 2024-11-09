// screens/HomeScreen.js

import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
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
      } catch (error) {
        console.error('Error fetching date counts:', error);
        setFallCount(0);
        setWinterCount(0);
        setSpringCount(0);
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
      {/* Greeting */}
      <Text style={styles.greeting}>Hello, {userName}</Text>

      {/* Fall Button */}
      <TouchableOpacity
        style={[styles.seasonButton, { backgroundColor: '#FFA500' }]}
        onPress={() => navigation.navigate('FallDatesScreen')}
      >
        <Text style={styles.buttonText}>Fall</Text>
        <Text style={styles.activeIdeasText}>{fallCount} Active Ideas</Text>
      </TouchableOpacity>

      {/* Winter Button */}
      <TouchableOpacity
        style={[styles.seasonButton, { backgroundColor: '#ADD8E6' }]}
        onPress={() => navigation.navigate('WinterDatesScreen')}
      >
        <Text style={styles.buttonText}>Winter</Text>
        <Text style={styles.activeIdeasText}>{winterCount} Active Ideas</Text>
      </TouchableOpacity>

      {/* Spring Button */}
      <TouchableOpacity
        style={[styles.seasonButton, { backgroundColor: '#FFB6C1' }]}
        onPress={() => navigation.navigate('SpringDatesScreen')}
      >
        <Text style={styles.buttonText}>Spring</Text>
        <Text style={styles.activeIdeasText}>{springCount} Active Ideas</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F4EF', // Soft beige background
    paddingTop: 40,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000', // Black text
    textAlign: 'center',
    marginBottom: 20,
  },
  seasonButton: {
    height: 60,
    width: '90%',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginVertical: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text
  },
  activeIdeasText: {
    fontSize: 12,
    color: '#FFFFFF', // White text
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
