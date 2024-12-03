// ==================================================
// IMPORTS
// ==================================================

// Import React and necessary components from the React library
import React from 'react';

// Import specific components and APIs from React Native
import { 
  View,              // Container component for layout
  TouchableOpacity,  // Wrapper for making views respond properly to touches (buttons)
  Image,             // Component for displaying images
  StyleSheet,        // Utility for creating style sheets in React Native
  Text               // Component for displaying text
} from 'react-native';

// Import the useNavigation hook from React Navigation for navigating between screens
import { useNavigation } from '@react-navigation/native';

// ==================================================
// MAIN COMPONENT: NavBar
// ==================================================

// Define and export the NavBar component as the default export
export default function NavBar() {
  // Initialize the navigation object using the useNavigation hook
  // This object allows us to navigate between different screens in the app
  const navigation = useNavigation();

  // Return the JSX structure of the NavBar component
  return (
    // Main container for the NavBar with styling applied
    <View style={styles.navBarContainer}>
      
      {/* 
        Home Button:
        - TouchableOpacity makes the Text component respond to touch events
        - On press, it navigates the user to the 'Home' screen
      */}
      <TouchableOpacity onPress={() => navigation.navigate('Home')}>
        {/* 
          Title Text:
          - Displays the app name "SznLuv"
          - Styled to appear prominently in the NavBar
        */}
        <Text style={styles.title}>SznLuv</Text>
      </TouchableOpacity>

      {/* 
        Icon Container:
        - Holds all the icon buttons aligned horizontally
        - Provides spacing and alignment for the icons
      */}
      <View style={styles.iconContainer}>
        
        {/* 
          Favorites Screen Link:
          - TouchableOpacity makes the Image respond to touch events
          - On press, it navigates the user to the 'Favourites' screen
        */}
        <TouchableOpacity onPress={() => navigation.navigate('Favourites')}>
          {/* 
            Favorites Icon:
            - Displays the favorites icon image
            - Image is sourced from the local assets folder
            - Styled for consistent sizing and appearance
          */}
          <Image
            source={require('../assets/FAVOURITES.png')} // Path to the favorites icon image
            style={styles.iconImage}                      // Apply styling to the image
          />
        </TouchableOpacity>
        
        {/* 
          Spin The Wheel Link:
          - TouchableOpacity makes the Image respond to touch events
          - On press, it navigates the user to the 'SpinTheWheel' screen
        */}
        <TouchableOpacity onPress={() => navigation.navigate('SpinTheWheel')}>
          {/* 
            Spin The Wheel Icon:
            - Displays the spin the wheel icon image
            - Image is sourced from the local assets folder
            - Styled for consistent sizing and appearance
          */}
          <Image
            source={require('../assets/SPINTHEWHEEL.png')} // Path to the spin the wheel icon image
            style={styles.iconImage}                        // Apply styling to the image
          />
        </TouchableOpacity>
        
        {/* 
          Profile Screen Link:
          - TouchableOpacity makes the Image respond to touch events
          - On press, it navigates the user to the 'ProfileSettings' screen
        */}
        <TouchableOpacity onPress={() => navigation.navigate('ProfileSettings')}>
          {/* 
            Profile Icon:
            - Displays the profile icon image
            - Image is sourced from the local assets folder
            - Styled for consistent sizing and appearance
          */}
          <Image
            source={require('../assets/PROFILE.png')} // Path to the profile icon image
            style={styles.iconImage}                  // Apply styling to the image
          />
        </TouchableOpacity>

      </View>
    </View>
  );
}

// ==================================================
// STYLESHEET
// ==================================================

// Define the styles for the NavBar component using StyleSheet.create
const styles = StyleSheet.create({
  
  // Style for the main NavBar container
  navBarContainer: {
    width: '100%',                     // Ensure the NavBar spans the full width of the device screen
    height: 130,                       // Fixed height for the NavBar to maintain consistency across devices
    backgroundColor: '#333333',        // Dark background color for the NavBar to provide contrast with icons and text
    flexDirection: 'row',              // Arrange child components horizontally in a row
    alignItems: 'center',              // Vertically center-align the child components within the NavBar
    justifyContent: 'space-between',   // Distribute space between child components, placing them at the ends
    paddingHorizontal: 20,              // Horizontal padding to provide space on the left and right edges
    // Reduced padding to avoid excessive indentation, ensuring the content fits well within the NavBar
  },

  // Style for the title text ("SznLuv") in the NavBar
  title: {
    color: '#FFFFFF',        // White text color for visibility against the dark background
    fontSize: 32,            // Large font size to make the title prominent
    fontWeight: 'bold',      // Bold font weight to emphasize the title
    marginTop: 45,           // Top margin to position the title vertically within the NavBar
  },

  // Style for the container that holds all the icon buttons
  iconContainer: {
    flexDirection: 'row',    // Arrange icon buttons horizontally in a row
    alignItems: 'center',    // Vertically center-align the icon buttons within the container
    gap: 15,                  // Horizontal gap between each icon button for spacing
    marginTop: 45,           // Top margin to align the icons vertically with the title
  },

  // Style for each icon image within the icon container
  iconImage: {
    width: 45,               // Fixed width for consistency across all icons
    height: 45,              // Fixed height for consistency across all icons
    resizeMode: 'contain',   // Ensure the entire image fits within the specified width and height without distortion
  },

});