// Favourites.js
// Detailed comments are added by chatgpt.com to the existing code, this way it makes it easier for each other to know what we coded when the other looks at it. Aswell as helps remember everything going on. 

/* ================================ IMPORTS ================================ */
// Importing necessary modules and components from React, React Native, Firebase, and other libraries.
import React, { useEffect, useState, useContext, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
} from "react-native";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import NavBar from '../components/NavBar';
import { AuthContext } from '../App';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

/* ============================= COMPONENT DEFINITION ============================= */
// Define the Favourites component which manages and displays the user's favourite items.
const Favourites = () => {
  /* ================================ CONTEXT AND STATE ================================ */
  // Accessing the authenticated user from AuthContext.
  const { user } = useContext(AuthContext);

  // State to hold the list of favourite items.
  const [favourites, setFavourites] = useState([]);

  // State to manage the loading state while fetching data.
  const [loading, setLoading] = useState(true);

  // State to hold the message for notifications.
  const [notificationMessage, setNotificationMessage] = useState('');

  /* ================================ NAVIGATION ================================ */
  // Hook to manage navigation between different screens.
  const navigation = useNavigation();

  /* ================================ ANIMATED VALUES ================================ */
  // Initialize animated values for the header's opacity and vertical position.
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;

  // State to hold animated values for each favourite item in the list.
  const [itemAnimations, setItemAnimations] = useState([]);

  // Initialize animated values for the notification's vertical position and opacity.
  const notificationTranslateY = useRef(new Animated.Value(50)).current;
  const notificationOpacity = useRef(new Animated.Value(0)).current;

  /* ================================ DATA FETCHING ================================ */
  // Fetch the user's favourites from Firestore when the component mounts or when the user changes.
  useEffect(() => {
    const fetchFavourites = async () => {
      try {
        if (user) {
          /* ================================ FIRESTORE REFERENCE ================================ */
          // Reference to the user's favourites document in Firestore.
          const favouritesDoc = doc(db, "favourites", user.uid);

          /* ================================ FETCH DOCUMENT ================================ */
          // Fetch the document snapshot.
          const docSnap = await getDoc(favouritesDoc);

          if (docSnap.exists()) {
            /* ================================ PROCESS DATA ================================ */
            // If the document exists, extract the data.
            const data = docSnap.data();

            // Filter and sort the favourites.
            const sortedFavourites = Object.keys(data)
              .filter((key) => data[key])
              .sort((a, b) => a.localeCompare(b));

            // Update the favourites state with the sorted list.
            setFavourites(sortedFavourites);

            /* ================================ INITIALIZE ANIMATIONS ================================ */
            // Create animated values for each item to handle their entrance animations.
            const animations = sortedFavourites.map(() => ({
              translateY: new Animated.Value(20), // Initial vertical position.
              opacity: new Animated.Value(0),      // Initial opacity.
            }));
            setItemAnimations(animations);
          } else {
            // Log if no favourites are found for the user.
            console.log("No favourites found for user.");
          }
        }
      } catch (error) {
        // Log any errors encountered during fetching.
        console.error("Error fetching favourites:", error);
      } finally {
        // Set loading to false after fetching is complete, regardless of success or failure.
        setLoading(false);
      }
    };

    // Invoke the fetchFavourites function.
    fetchFavourites();
  }, [user]); // Dependency array ensures this runs when 'user' changes.

  /* ================================ ANIMATION TRIGGER ================================ */
  // Trigger animations for header and favourite items once loading is complete.
  useEffect(() => {
    if (!loading) {
      /* ================================ ANIMATE THE HEADER TEXT ================================ */
      // Parallel animation for the header's opacity and vertical position.
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1, // Fade in to full opacity.
          duration: 700, // Duration of the animation in milliseconds.
          useNativeDriver: true, // Use native driver for better performance.
        }),
        Animated.timing(headerTranslateY, {
          toValue: 0, // Move to original position.
          duration: 700, // Duration of the animation.
          easing: Easing.out(Easing.ease), // Easing function for smooth animation.
          useNativeDriver: true, // Use native driver.
        }),
      ]).start(); // Start the header animation.

      /* ================================ ANIMATE FAVOURITE ITEMS ================================ */
      // Create an array of animations for each favourite item.
      const animationsArray = itemAnimations.map((anim, index) => {
        return Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1, // Fade in to full opacity.
            duration: 500, // Duration of the animation.
            delay: 400 + index * 150, // Staggered delay for each item.
            useNativeDriver: true, // Use native driver.
          }),
          Animated.timing(anim.translateY, {
            toValue: 0, // Move to original position.
            duration: 400, // Duration of the animation.
            delay: 400 + index * 150, // Staggered delay.
            easing: Easing.out(Easing.ease), // Easing function.
            useNativeDriver: true, // Use native driver.
          }),
        ]);
      });

      // Start the staggered animations with a 100ms gap between each.
      Animated.stagger(100, animationsArray).start();
    }
  }, [loading, itemAnimations]); // Dependencies to trigger when loading or animations change.

  /* ================================ NOTIFICATION ANIMATION ================================ */
  // Animate the notification message when it changes.
  useEffect(() => {
    if (notificationMessage !== '') {
      /* ================================ SLIDE IN NOTIFICATION ================================ */
      // Parallel animation to slide in the notification from the bottom and fade it in.
      Animated.parallel([
        Animated.timing(notificationTranslateY, {
          toValue: 0, // Slide to original position.
          duration: 500, // Duration of the slide-in animation.
          easing: Easing.out(Easing.ease), // Easing function.
          useNativeDriver: true, // Use native driver.
        }),
        Animated.timing(notificationOpacity, {
          toValue: 1, // Fade in to full opacity.
          duration: 500, // Duration of the fade-in animation.
          useNativeDriver: true, // Use native driver.
        }),
      ]).start();

      /* ================================ SLIDE OUT NOTIFICATION ================================ */
      // Set a timeout to slide out and fade out the notification after 3 seconds.
      const timeout = setTimeout(() => {
        Animated.parallel([
          Animated.timing(notificationTranslateY, {
            toValue: 50, // Slide down by 50 units.
            duration: 500, // Duration of the slide-out animation.
            easing: Easing.in(Easing.ease), // Easing function.
            useNativeDriver: true, // Use native driver.
          }),
          Animated.timing(notificationOpacity, {
            toValue: 0, // Fade out to zero opacity.
            duration: 500, // Duration of the fade-out animation.
            useNativeDriver: true, // Use native driver.
          }),
        ]).start(() => {
          // Reset the notification message after animation completes.
          setNotificationMessage('');
        });
      }, 3000); // 3-second delay before sliding out.

      // Cleanup the timeout if the component unmounts or if notificationMessage changes.
      return () => clearTimeout(timeout);
    }
  }, [notificationMessage]); // Dependency to trigger when notificationMessage changes.

  /* ================================ REMOVE FAVOURITE FUNCTION ================================ */
  // Function to remove a favourite item from the user's list.
  const removeFavourite = async (spotName) => {
    if (!user) {
      // Alert the user if they are not logged in.
      Alert.alert('Error', 'You must be logged in to remove favourites.');
      return;
    }

    /* ================================ FIRESTORE REFERENCE ================================ */
    // Reference to the user's favourites document in Firestore.
    const userFavoritesRef = doc(db, 'favourites', user.uid);

    try {
      /* ================================ FETCH CURRENT FAVOURITES ================================ */
      // Fetch the current favourites.
      const docSnap = await getDoc(userFavoritesRef);
      let userFavorites = docSnap.exists() ? docSnap.data() : {};

      if (userFavorites[spotName]) {
        /* ================================ REMOVE FAVOURITE ================================ */
        // Delete the specified favourite.
        delete userFavorites[spotName];

        /* ================================ UPDATE FIRESTORE ================================ */
        // Update the document in Firestore with the new favourites.
        await setDoc(userFavoritesRef, userFavorites);

        /* ================================ UPDATE LOCAL STATE ================================ */
        // Update the local favourites state by removing the spotName and sorting the list.
        setFavourites((prevFavourites) =>
          prevFavourites.filter((fav) => fav !== spotName).sort((a, b) => a.localeCompare(b))
        );

        /* ================================ SET NOTIFICATION ================================ */
        // Set a notification message to inform the user of the removal.
        setNotificationMessage(`"${spotName}" removed from favourites.`);
      } else {
        // Log if the favourite was not found.
        console.log('Favourite not found.');
      }
    } catch (error) {
      // Log any errors and alert the user of the failure.
      console.error('Error removing favourite:', error);
      Alert.alert('Error', 'Failed to remove favourite. Please try again.');
    }
  };

  /* ================================ HANDLE FAVOURITE PRESS ================================ */
  // Function to handle the press event on a favourite item.
  const handleFavouritePress = (name) => {
    // Navigate to different screens based on the name of the favourite.
    if (name === 'Aldor Family Farm') {
      navigation.navigate('AldorFamilyFarmScreen');
    } else if (name === 'Laity Pumpkin Patch') {
      navigation.navigate('LaityPumpkinPatch');
    } else if (name === 'Eagle Acres Dairy') {
      navigation.navigate('EagleAcresDairy');
    } else {
      // Alert the user if the feature is not yet available.
      Alert.alert('Coming Soon', 'Feature coming soon.');
    }
  };

  /* ================================ CONDITIONAL RENDERING ================================ */
  // Show a loading indicator while the favourites are being fetched.
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  /* ================================ MAIN RENDER ================================ */
  // Render the main UI of the Favourites component.
  return (
    <View style={styles.container}>
      {/* ================================ NAVIGATION BAR ================================ */}
      <NavBar />

      {/* ================================ NOTIFICATION MESSAGE ================================ */}
      {notificationMessage !== '' && (
        <Animated.View
          style={[
            styles.notificationContainer,
            {
              opacity: notificationOpacity, // Bind opacity to animated value.
              transform: [{ translateY: notificationTranslateY }], // Bind vertical position to animated value.
            },
          ]}
        >
          <Text style={styles.notificationText}>{notificationMessage}</Text>
        </Animated.View>
      )}

      {/* ================================ HEADER TEXT ================================ */}
      <Animated.View
        style={[
          styles.headerTextContainer,
          {
            opacity: headerOpacity, // Bind opacity to animated value.
            transform: [{ translateY: headerTranslateY }], // Bind vertical position to animated value.
          },
        ]}
      >
        <Text style={styles.title}>Favourites</Text>
        <Text style={styles.subtitle}>Can’t wait to see where these take you!</Text>
      </Animated.View>

      {/* ================================ FAVOURITES LIST ================================ */}
      <ScrollView style={styles.favouritesList}>
        {favourites.length > 0 ? (
          // Map through the favourites and render each as an animated FavouriteItem.
          favourites.map((favourite, index) => (
            <Animated.View
              key={favourite} // Unique key for each item.
              style={{
                opacity: itemAnimations[index]?.opacity || 1, // Bind opacity or default to 1.
                transform: [{ translateY: itemAnimations[index]?.translateY || 0 }], // Bind vertical position or default to 0.
              }}
            >
              {/* ================================ FAVOURITE ITEM COMPONENT ================================ */}
              <FavouriteItem
                name={favourite} // Pass the name of the favourite.
                removeFavourite={removeFavourite} // Pass the remove function.
                onPress={() => handleFavouritePress(favourite)} // Pass the press handler.
              />
            </Animated.View>
          ))
        ) : (
          // Display a message if there are no favourites.
          <Text style={styles.emptyText}>No favourites yet! Add some dates to get started.</Text>
        )}
      </ScrollView>
    </View>
  );
};

/* ================================ FAVOURITE ITEM COMPONENT ================================ */
// Define a component to represent each favourite item in the list.
const FavouriteItem = ({ name, removeFavourite, onPress }) => (
  <View style={styles.itemContainer}>
    {/* ================================ ITEM CONTENT ================================ */}
    <TouchableOpacity
      style={styles.itemContent}
      onPress={onPress} // Handle press to navigate or perform action.
      accessibilityLabel={`View details for ${name}`} // Accessibility label for screen readers.
      accessibilityRole="button" // Define the role for accessibility.
    >
      <Text style={styles.itemTitle}>{name}</Text>
    </TouchableOpacity>

    {/* ================================ RIGHT ARROW ICON ================================ */}
    <TouchableOpacity onPress={onPress} style={styles.arrowIcon}>
      <Icon name="chevron-right" size={24} color="#323232" />
    </TouchableOpacity>

    {/* ================================ HEART ICON TO REMOVE FAVOURITE ================================ */}
    <TouchableOpacity
      style={styles.cardHeartIcon}
      onPress={() => removeFavourite(name)} // Handle press to remove the favourite.
      accessibilityLabel={`Remove ${name} from favourites`} // Accessibility label.
      accessibilityRole="button" // Define the role for accessibility.
    >
      <Icon name="favorite" size={24} color="#FF0000" />
    </TouchableOpacity>
  </View>
);

/* ================================ STYLESHEET ================================ */
// Define the styles for the Favourites component and its subcomponents.
const styles = StyleSheet.create({
  /* ================================ CONTAINER ================================ */
  container: {
    backgroundColor: "#dbd3bd", // Background color of the main container.
    flex: 1, // Flex to occupy the full screen.
  },
  
  /* ================================ HEADER TEXT CONTAINER ================================ */
  headerTextContainer: {
    marginTop: 20, // Top margin.
    paddingHorizontal: 20, // Horizontal padding.
  },
  
  /* ================================ TITLE TEXT ================================ */
  title: {
    fontSize: 55, // Large font size for the title.
    marginBottom: -15, // Negative margin to adjust spacing.
    color: "#323232", // Text color.
    fontWeight: 'bold', // Bold font weight.
  },
  
  /* ================================ SUBTITLE TEXT ================================ */
  subtitle: {
    fontSize: 14, // Smaller font size for the subtitle.
    color: "rgba(50, 50, 50, 0.4)", // Semi-transparent text color.
    paddingHorizontal: 2, // Horizontal padding.
    marginTop: 13, // Top margin.
  },
  
  /* ================================ FAVOURITES LIST ================================ */
  favouritesList: {
    marginTop: 20, // Top margin.
    paddingHorizontal: 20, // Horizontal padding.
  },
  
  /* ================================ ITEM CONTAINER ================================ */
  itemContainer: {
    flexDirection: "row", // Arrange children in a row.
    alignItems: "center", // Center items vertically.
    backgroundColor: "#f0eadd", // Background color of the item.
    borderRadius: 14, // Rounded corners.
    padding: 15, // Padding inside the item.
    marginBottom: 15, // Bottom margin between items.
    shadowColor: '#000', // Shadow color.
    shadowOffset: { width: 0, height: 1 }, // Shadow offset.
    shadowOpacity: 0.1, // Shadow opacity.
    shadowRadius: 2, // Shadow radius.
    elevation: 2, // Elevation for Android shadow.
  },
  
  /* ================================ ITEM CONTENT ================================ */
  itemContent: {
    flex: 1, // Flex to occupy available space.
  },
  
  /* ================================ RIGHT ARROW ICON ================================ */
  arrowIcon: {
    marginHorizontal: 8, // Horizontal margin.
    justifyContent: 'center', // Center vertically.
    alignItems: 'center', // Center horizontally.
  },
  
  /* ================================ HEART ICON TO REMOVE FAVOURITE ================================ */
  cardHeartIcon: {
    marginLeft: 16, // Left margin.
  },
  
  /* ================================ ITEM TITLE TEXT ================================ */
  itemTitle: {
    fontSize: 22, // Font size for the item title.
    color: "#323232", // Text color.
    fontFamily: "Gramatika-Black", // Custom font family.
  },
  
  /* ================================ EMPTY LIST TEXT ================================ */
  emptyText: {
    fontSize: 16, // Font size for the empty state message.
    color: "#999", // Text color.
    textAlign: "center", // Center the text horizontally.
    marginTop: 20, // Top margin.
    fontFamily: "Gramatika-Black", // Custom font family.
  },
  
  /* ================================ LOADING CONTAINER ================================ */
  loadingContainer: {
    flex: 1, // Flex to occupy the full screen.
    justifyContent: "center", // Center vertically.
    alignItems: "center", // Center horizontally.
  },
  
  /* ================================ NOTIFICATION CONTAINER ================================ */
  notificationContainer: {
    position: 'absolute', // Absolute positioning.
    bottom: 50, // Position from the bottom.
    left: 20, // Position from the left.
    right: 20, // Position from the right.
    backgroundColor: '#323232', // Background color of the notification.
    padding: 10, // Padding inside the notification.
    borderRadius: 8, // Rounded corners.
    zIndex: 1, // Ensure it appears above other elements.
    alignItems: 'center', // Center content horizontally.
  },
  
  /* ================================ NOTIFICATION TEXT ================================ */
  notificationText: {
    color: '#fff', // Text color.
    fontSize: 16, // Font size.
    fontFamily: "Gramatika-Black", // Custom font family.
  },
});

/* ================================ EXPORT ================================ */
// Export the Favourites component as the default export.
export default Favourites;