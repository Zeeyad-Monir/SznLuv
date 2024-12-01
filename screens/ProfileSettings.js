// ProfileSettings.js

import React, { useContext, useState, useEffect } from 'react'; // Import useEffect
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Dimensions,
  ScrollView,
  Alert,
  ActivityIndicator, // Import ActivityIndicator for loading state
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import NavBar from '../components/NavBar'; // Adjust the path as needed
import { SettingsContext } from './SettingsContext'; // Adjust the path as needed
import { AuthContext } from '../App'; // Import AuthContext to get authenticated user
import { doc, getDoc } from 'firebase/firestore'; // Import Firestore functions
import { db, logout } from '../firebaseConfig'; // Import Firestore database instance and logout function
import { useNavigation } from '@react-navigation/native'; // Import useNavigation for navigation

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ProfileSettings = () => {
  const { user } = useContext(AuthContext); // Get the authenticated user from AuthContext
  const { isLocationEnabled, toggleLocationServices } = useContext(SettingsContext);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);
  
  // State to hold the fetched username
  const [userName, setUserName] = useState('');
  // State to manage loading state while fetching username
  const [loadingUsername, setLoadingUsername] = useState(true);

  const navigation = useNavigation(); // Initialize navigation

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

  // useEffect to fetch the username from Firestore when the component mounts
  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) {
        setUserName('User'); // Default name if user is not authenticated
        setLoadingUsername(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', user.uid); // Reference to the user's document
        const userDocSnap = await getDoc(userDocRef); // Fetch the document snapshot

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserName(data.username || 'User'); // Set the username or default to 'User'
        } else {
          console.log('No user data found!');
          setUserName('User'); // Default name if document does not exist
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
        setUserName('User'); // Default name on error
      } finally {
        setLoadingUsername(false); // Stop loading regardless of success or failure
      }
    };

    fetchUserName();
  }, [user]);

  /**
   * handleSignOut
   * 
   * Handles the sign-out process by calling the logout function and navigating the user to the Login screen.
   */
  const handleSignOut = async () => {
    Alert.alert(
      'Confirm Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout(); // Call the logout function from firebaseConfig.js
              Alert.alert('Signed Out', 'You have been signed out successfully.');
              //navigation.navigate('Login'); // Navigate to the Login screen
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
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
            <Text style={styles.profileImageText}>
              {loadingUsername ? '...' : userName.charAt(0)} {/* Show first letter or loading indicator */}
            </Text>
          </View>

          {/* User Name */}
          {loadingUsername ? (
            <ActivityIndicator size="small" color="#0000ff" style={styles.loadingIndicator} />
          ) : (
            <Text style={styles.userName}>{userName}</Text>
          )}

          {/* Edit Profile Text */}
          <TouchableOpacity onPress={() => {
            // Implement navigation to Edit Profile screen
            // For example:
            // navigation.navigate('EditProfile');
            Alert.alert('Info', 'Edit Profile feature coming soon.');
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
            Alert.alert('Info', 'Change Password feature coming soon.');
          }}>
            <Text style={styles.settingText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Account Settings */}
          <TouchableOpacity style={styles.settingItem} onPress={() => {
            // Implement navigation to Account Settings screen
            // navigation.navigate('AccountSettings');
            Alert.alert('Info', 'Account Settings feature coming soon.');
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

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          accessibilityLabel="Sign Out"
          accessibilityRole="button"
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>

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
    textAlign: 'center', // Ensures text is horizontally centered
    lineHeight: 120, // Aligns text vertically
  },
  loadingIndicator: {
    marginTop: 10,
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
  signOutButton: {
    width: '90%',
    height: 50,
    backgroundColor: '#D24B3A', // Matching the profile image background color
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 30,
    backgroundColor: '#FAF3E0',
  },
});

export default ProfileSettings;