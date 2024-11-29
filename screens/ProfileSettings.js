// ProfileSettings.js

import React, { useContext, useState } from 'react'; // Import useContext and useState
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
import Ionicons from 'react-native-vector-icons/Ionicons';
import NavBar from '../components/NavBar'; // Adjust the path as needed
import { SettingsContext } from './SettingsContext'; // Adjust the path as needed

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ProfileSettings = () => {
  const { isLocationEnabled, toggleLocationServices } = useContext(SettingsContext);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);

  const toggleNotifications = () => setIsNotificationsEnabled(previousState => !previousState);

  const handleToggleLocation = async () => {
    try {
      await toggleLocationServices();
      const message = isLocationEnabled
        ? 'Location services have been disabled.'
        : 'Location services have been enabled.';
      Alert.alert('Location Services', message);
    } catch (error) {
      console.error('Error toggling location services:', error);
      Alert.alert('Error', 'Failed to toggle location services.');
    }
  };

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
          <TouchableOpacity onPress={() => {
            // Implement navigation to Edit Profile screen
            // For example:
            // navigation.navigate('EditProfile');
          }}>
            <Text style={styles.editProfileText}>Edit profile</Text>
          </TouchableOpacity>
        </View>

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          {/* Change Password */}
          <TouchableOpacity style={styles.settingItem} onPress={() => {
            // Implement navigation to Change Password screen
            // navigation.navigate('ChangePassword');
          }}>
            <Text style={styles.settingText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Account Settings */}
          <TouchableOpacity style={styles.settingItem} onPress={() => {
            // Implement navigation to Account Settings screen
            // navigation.navigate('AccountSettings');
          }}>
            <Text style={styles.settingText}>Account Settings</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Allow Location Services */}
          <View style={styles.settingItem}>
            <Text style={styles.settingText}>Allow Location Services</Text>
            <Switch
              trackColor={{ false: '#A9A9A9', true: '#D9E5B6' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#A9A9A9"
              onValueChange={handleToggleLocation}
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
  switch: {
    transform: [{ scaleX: 1 }, { scaleY: 1 }],
  },
  bottomSpacing: {
    height: 30,
    backgroundColor: '#FAF3E0',
  },
});

export default ProfileSettings;