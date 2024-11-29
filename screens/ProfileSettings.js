// ProfileSettings.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import * as Location from 'expo-location'; // Import location services
import NavBar from '../components/NavBar'; // Adjust the path as needed

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ProfileSettings = () => {
  // State for toggle switches
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);

  // Handlers for toggle switches
  const toggleLocation = async () => {
    if (!isLocationEnabled) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          console.log('User Location:', location);
          setIsLocationEnabled(true);
          Alert.alert('Location Enabled', 'Location services have been enabled.');
        } else {
          Alert.alert('Permission Denied', 'Location permission was not granted.');
        }
      } catch (error) {
        console.error('Error enabling location:', error);
        Alert.alert('Error', 'An error occurred while enabling location services.');
      }
    } else {
      setIsLocationEnabled(false);
      Alert.alert('Location Disabled', 'Location services have been disabled.');
    }
  };

  const toggleNotifications = () => setIsNotificationsEnabled(previousState => !previousState);

  return (
    <View style={styles.mainContainer}>
      {/* Use the NavBar Component */}
      <NavBar />

      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          {/* Profile Image with Gradient Background */}
          <View style={[styles.profileImage, { backgroundColor: '#D24B3A' }]}>
            <Text style={styles.profileImageText}>Z</Text>
          </View>

          {/* User Name */}
          <Text style={styles.userName}>Zeeyad Monir</Text>

          {/* Edit Profile Text */}
          <TouchableOpacity>
            <Text style={styles.editProfileText}>Edit profile</Text>
          </TouchableOpacity>
        </View>

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          {/* Change Password */}
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>Change Password</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* Account Settings */}
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>Account Settings</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* Allow Location Services */}
          <View style={styles.settingItem}>
            <Text style={styles.settingText}>Allow Location Services</Text>
            <Switch
              trackColor={{ false: '#A9A9A9', true: '#D9E5B6' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#A9A9A9"
              onValueChange={toggleLocation}
              value={isLocationEnabled}
              style={styles.switch}
            />
          </View>

          {/* Allow Notifications */}
          <View style={styles.settingItem}>
            <Text style={styles.settingText}>Allow Notifications</Text>
            <Switch
              trackColor={{ false: '#A9A9A9', true: '#D9E5B6' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#A9A9A9"
              onValueChange={toggleNotifications}
              value={isNotificationsEnabled}
              style={styles.switch}
            />
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FAF3E0',
  },
  scrollContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: screenHeight * 0.05,
    marginBottom: 30,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 12,
  },
  editProfileText: {
    fontSize: 14,
    color: '#B0A89A',
    marginTop: 5,
  },
  settingsSection: {
    width: '90%',
  },
  settingItem: {
    width: '100%',
    height: 50,
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginVertical: 6,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  chevron: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  switch: {
    transform: [{ scaleX: 1 }, { scaleY: 1 }],
  },
  bottomSpacing: {
    height: 30,
    backgroundColor: '#FAF3E0',
  },
});

export default ProfileSettings;