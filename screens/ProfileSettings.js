//PROFILESETTINGS.JS
// Detailed comments are added by chatgpt.com to the existing code, this way it makes it easier for each other to know what we coded when the other looks at it. Aswell as helps remember everything going on. 

// =========================
// IMPORTS SECTION
// =========================

// Importing necessary modules and components from React and React Native
import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Dimensions,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';

// Importing Ionicons for icon usage in the UI
import Ionicons from 'react-native-vector-icons/Ionicons';

// Importing context providers for settings and authentication
import { SettingsContext } from './SettingsContext';
import { AuthContext } from '../contexts/AuthContext';

// Importing Firestore functions for database interactions
import { doc, getDoc } from 'firebase/firestore';

// Importing Firebase configuration and logout function
import { db, logout } from '../firebaseConfig';

// Importing navigation hook for navigating between screens
import { useNavigation, useScrollToTop } from '@react-navigation/native';

// =========================
// CONSTANTS SECTION
// =========================

// Destructuring to get screen width and height for responsive design
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// =========================
// COMPONENT DEFINITION
// =========================

const ProfileSettings = () => {
  // =========================
  // CONTEXT USAGE
  // =========================

  // Accessing the authenticated user from AuthContext
  const { user } = useContext(AuthContext);

  // Accessing location settings and toggle function from SettingsContext
  const { isLocationEnabled, toggleLocationServices } = useContext(SettingsContext);

  // =========================
  // STATE VARIABLES
  // =========================

  // State to manage notification toggle
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);

  // State to store the user's name fetched from the database
  const [userName, setUserName] = useState('');

  // State to manage the loading indicator while fetching the username
  const [loadingUsername, setLoadingUsername] = useState(true);

  // =========================
  // NAVIGATION HOOK
  // =========================

  // Hook to navigate between different screens
  const navigation = useNavigation();
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef); // Re-tapping this section scrolls back to the top

  // =========================
  // EVENT HANDLERS
  // =========================

  /**
   * Toggles the notifications switch state.
   * It inverses the current state of isNotificationsEnabled.
   */
  const toggleNotifications = () => setIsNotificationsEnabled(previousState => !previousState);

  /**
   * Handles the toggling of location services.
   * It calls the toggleLocationServices function from context and shows an alert based on the new state.
   */
  const handleToggleLocation = () => toggleLocationServices();

  /**
   * Handles the sign-out process.
   * It prompts the user for confirmation before signing out and handles any errors that occur.
   */
  const handleSignOut = async () => {
    Alert.alert(
      'Confirm Sign Out', // Title of the alert
      'Are you sure you want to sign out?', // Message of the alert
      [
        {
          text: 'Cancel', // Option to cancel the action
          style: 'cancel',
        },
        {
          text: 'Sign Out', // Option to proceed with sign-out
          style: 'destructive',
          onPress: async () => {
            try {
              // Attempting to log out the user
              await logout();

              // Informing the user of successful sign-out
              Alert.alert('Signed Out', 'You have been signed out successfully.');
            } catch (error) {
              // Logging the error for debugging purposes
              console.error('Error signing out:', error);

              // Displaying an error alert to the user
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ],
      { cancelable: true } // Allows the alert to be dismissed by tapping outside
    );
  };

  // =========================
  // EFFECTS SECTION
  // =========================

  /**
   * useEffect hook to fetch the user's name from Firestore when the component mounts or when the user changes.
   */
  useEffect(() => {
    /**
     * Async function to fetch the user's name from the Firestore database.
     */
    const fetchUserName = async () => {
      // If there is no authenticated user, set a default name and stop loading
      if (!user) {
        setUserName('User');
        setLoadingUsername(false);
        return;
      }

      try {
        // Creating a reference to the user's document in Firestore
        const userDocRef = doc(db, 'users', user.uid);

        // Fetching the user's document snapshot
        const userDocSnap = await getDoc(userDocRef);

        // Checking if the document exists
        if (userDocSnap.exists()) {
          // Extracting data from the document
          const data = userDocSnap.data();

          // Setting the user's name, defaulting to 'User' if not available
          setUserName(data.username || 'User');
        } else {
          // Logging if no user data is found
          console.log('No user data found!');

          // Setting a default name
          setUserName('User');
        }
      } catch (error) {
        // Logging any errors that occur during the fetch
        console.error('Error fetching user name:', error);

        // Setting a default name in case of an error
        setUserName('User');
      } finally {
        // Stopping the loading indicator regardless of success or failure
        setLoadingUsername(false);
      }
    };

    // Invoking the fetchUserName function
    fetchUserName();
  }, [user]); // Dependency array includes 'user' to refetch if user changes

  // =========================
  // RENDERING SECTION
  // =========================

  return (
    <View style={styles.mainContainer}>
      {/* Scrollable content container */}
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContainer}>
        {/* PROFILE SECTION */}
        <View style={styles.profileSection}>
          {/* Profile Image Placeholder */}
          <View style={[styles.profileImage, { backgroundColor: '#D24B3A' }]}>
            <Text style={styles.profileImageText}>
              {/* Displaying the first character of the user's name or a loading indicator */}
              {loadingUsername ? '...' : userName.charAt(0)}
            </Text>
          </View>

          {/* Displaying either a loading indicator or the user's name */}
          {loadingUsername ? (
            <ActivityIndicator size="small" color="#0000ff" style={styles.loadingIndicator} />
          ) : (
            <Text style={styles.userName}>{userName}</Text>
          )}

          {/* Edit Profile Button */}
          <TouchableOpacity onPress={() => {
            // Informing the user that the feature is coming soon
            Alert.alert('Info', 'Edit Profile feature coming soon.');
          }}>
            <Text style={styles.editProfileText}>Edit profile</Text>
          </TouchableOpacity>
        </View>

        {/* SETTINGS SECTION */}
        <View style={styles.settingsSection}>
          {/* Change Password Setting */}
          <TouchableOpacity style={styles.settingItem} onPress={() => {
            // Informing the user that the feature is coming soon
            Alert.alert('Info', 'Change Password feature coming soon.');
          }}>
            <Text style={styles.settingText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Account Settings */}
          <TouchableOpacity style={styles.settingItem} onPress={() => {
            // Informing the user that the feature is coming soon
            Alert.alert('Info', 'Account Settings feature coming soon.');
          }}>
            <Text style={styles.settingText}>Account Settings</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Allow Location Services Toggle */}
          <View style={styles.settingItem}>
            <Text style={styles.settingText}>Allow Location Services</Text>
            <Switch
              trackColor={{ false: '#A9A9A9', true: '#D9E5B6' }} // Colors for the switch track
              thumbColor="#FFFFFF" // Color for the switch thumb
              ios_backgroundColor="#A9A9A9" // Background color for iOS
              onValueChange={handleToggleLocation} // Handler when the switch value changes
              value={isLocationEnabled} // Current value of the switch
              style={styles.switch} // Additional styling
            />
          </View>

          {/* Allow Notifications Toggle */}
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

        {/* SIGN OUT BUTTON */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut} // Handler for sign out
          accessibilityLabel="Sign Out" // Accessibility label for screen readers
          accessibilityRole="button" // Accessibility role
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Bottom Spacing to ensure content is not cut off */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

// =========================
// STYLESHEET SECTION
// =========================

const styles = StyleSheet.create({
  // Main container covering the entire screen
  mainContainer: {
    flex: 1, // Takes up the full available space
    backgroundColor: '#FAF3E0', // Background color of the screen
  },
  // Container for scrollable content
  scrollContainer: {
    alignItems: 'center', // Centers items horizontally
    paddingVertical: 20, // Vertical padding
    paddingHorizontal: 10, // Horizontal padding
  },
  // Profile section containing the profile image and user info
  profileSection: {
    alignItems: 'center', // Centers items horizontally
    marginTop: screenHeight * 0.05, // Top margin relative to screen height
    marginBottom: 30, // Bottom margin
  },
  // Styling for the profile image placeholder
  profileImage: {
    width: 120, // Width of the profile image
    height: 120, // Height of the profile image
    borderRadius: 60, // Makes the image circular
    alignItems: 'center', // Centers child content horizontally
    justifyContent: 'center', // Centers child content vertically
  },
  // Text inside the profile image placeholder
  profileImageText: {
    color: '#FFFFFF', // Text color
    fontSize: 40, // Font size
    fontWeight: 'bold', // Font weight
    textAlign: 'center', // Centers text
    lineHeight: 120, // Line height to vertically center the text
  },
  // Styling for the loading indicator below the profile image
  loadingIndicator: {
    marginTop: 10, // Top margin
  },
  // Styling for the user's name text
  userName: {
    fontSize: 22, // Font size
    fontWeight: 'bold', // Font weight
    color: '#000000', // Text color
    marginTop: 12, // Top margin
  },
  // Styling for the "Edit profile" text
  editProfileText: {
    fontSize: 14, // Font size
    color: '#B0A89A', // Text color
    marginTop: 5, // Top margin
  },
  // Container for the settings items
  settingsSection: {
    width: '90%', // Width relative to the parent container
  },
  // Styling for each individual setting item
  settingItem: {
    width: '100%', // Full width of the settings section
    height: 50, // Fixed height
    backgroundColor: '#2C2C2C', // Background color of the setting item
    borderRadius: 8, // Rounded corners
    flexDirection: 'row', // Aligns children horizontally
    alignItems: 'center', // Centers children vertically
    justifyContent: 'space-between', // Spaces children apart
    paddingHorizontal: 15, // Horizontal padding inside the setting item
    marginVertical: 6, // Vertical margin between setting items
  },
  // Styling for the text inside each setting item
  settingText: {
    fontSize: 16, // Font size
    fontWeight: '500', // Font weight
    color: '#FFFFFF', // Text color
  },
  // Styling for the switches inside the setting items
  switch: {
    transform: [{ scaleX: 1 }, { scaleY: 1 }], // Scale transformations (currently set to default)
  },
  // Styling for the Sign Out button
  signOutButton: {
    width: '90%', // Width relative to the parent container
    height: 50, // Fixed height
    backgroundColor: '#D24B3A', // Background color of the button
    borderRadius: 8, // Rounded corners
    alignItems: 'center', // Centers child content horizontally
    justifyContent: 'center', // Centers child content vertically
    marginTop: 30, // Top margin to separate from settings
  },
  // Styling for the text inside the Sign Out button
  signOutButtonText: {
    color: '#FFFFFF', // Text color
    fontSize: 16, // Font size
    fontWeight: 'bold', // Font weight
  },
  // Bottom spacing to ensure content is not cut off at the bottom
  bottomSpacing: {
    height: 30, // Fixed height for spacing
    backgroundColor: '#FAF3E0', // Same as the main background to blend in
  },
});

// =========================
// EXPORT SECTION
// =========================

// Exporting the ProfileSettings component as the default export
export default ProfileSettings;