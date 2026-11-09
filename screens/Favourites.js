import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import { updateCollection } from '../services/favourites';
// Favourites.js

import React, { useRef, useState, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Dimensions,
  Animated,
  Alert,
} from "react-native";
import { useNavigation } from '@react-navigation/native';
import useEntrance, { useItemEntrance } from '../hooks/useEntrance';
import { canNavigate } from '../services/venueNavigation';
import { doc, getDoc } from "firebase/firestore";
import { AuthContext } from '../contexts/AuthContext';
import { db } from "../firebaseConfig";

const { width } = Dimensions.get('window');

const Favourites = () => {
  const navigation = useNavigation();
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef); // Re-tapping this section scrolls back to the top
  const { user } = useContext(AuthContext);

  // ======== COLLECTIONS STATE ========
  const [collections, setCollections] = useState([]);

  // ======== CREATE BUTTON ANIMATION ========
  const createButtonScale = useRef(new Animated.Value(1)).current;

  // Title, subtitle, Create and the four season tiles ease in once. Saved collections animate only as they first appear.
  const entrance = useEntrance(7);
  const collectionEntrance = useItemEntrance(collections.map(collection => collection.title));

  useFocusEffect(React.useCallback(() => {
    if (!user) return;
    let current = true;
    getDoc(doc(db, "favourites", user.uid)).then((snapshot) => {
      if (!current) return;
      const saved = snapshot.exists() ? snapshot.data().collections : null;
      setCollections(Array.isArray(saved) ? saved : []); // Updates in place, so returning here never blanks the list
    }).catch((error) => console.error("Error fetching user-defined collections:", error));
    return () => { current = false; };
  }, [user]));

  const handleSeasonPress = (season) => {
    if (!canNavigate(navigation)) return;
    navigation.navigate('SeasonalFavourites', { season });
  };

  // Updated handleCollectionPress to navigate with collection object and userId
  const handleCollectionPress = (collection) => {
    if (!canNavigate(navigation)) return;
    navigation.navigate('CustomCollectionScreen', { collection: { ...collection, userId: user.uid } });
  };

  const handleDeleteCollection = (collection) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this collection?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: () => deleteCollection(collection),
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  const deleteCollection = (collectionToDelete) => {
    collectionEntrance.exit(collectionToDelete.title, async () => {
      try {
        const next = await updateCollection(user.uid, { type: 'delete', title: collectionToDelete.title });
        setCollections(next.collections);
        Alert.alert('Success', 'Collection deleted successfully.');
      } catch (error) {
        console.error("Error deleting collection:", error);
        setCollections(previous => [...previous]); // The card animates back in
        Alert.alert("Error", "Failed to delete the collection. Please try again.");
      }
    });
  };

  // ======== CREATE BUTTON ANIMATION HANDLERS ========
  const handleCreateButtonPressIn = () => {
    Animated.spring(createButtonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handleCreateButtonPressOut = () => {
    Animated.spring(createButtonScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.contentContainer}>
        {/* Header Container */}
        <Animated.View style={[styles.headerContainer, entrance[0]]}>
          <Text style={styles.title}>Favourites</Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View style={[styles.subtitleContainer, entrance[1]]}>
          <Text style={styles.subtitle}>Can’t wait to see where these take you!</Text>
        </Animated.View>

        {/* Create Button with Entrance and Press Animations */}
        <Animated.View style={[entrance[2], { transform: [...entrance[2].transform, { scale: createButtonScale }] }]}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateCollection')}
            accessibilityLabel="Create a new collection"
            accessibilityRole="button"
            activeOpacity={0.7}
            onPressIn={handleCreateButtonPressIn}
            onPressOut={handleCreateButtonPressOut}
          >
            <Text style={styles.buttonText}>Create</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.gridContainer}>
          {/* Seasons */}
          <Animated.View style={entrance[3]}>
            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => handleSeasonPress('Fall')}
              accessibilityLabel="View Fall Favourites"
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <ImageBackground
                source={require('../assets/fall2.png')}
                style={styles.imageBackground}
                imageStyle={styles.imageStyle}
              >
                <Text style={styles.gridItemText}>Fall</Text>
              </ImageBackground>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={entrance[4]}>
            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => handleSeasonPress('Winter')}
              accessibilityLabel="View Winter Favourites"
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <ImageBackground
                source={require('../assets/winter2.png')}
                style={styles.imageBackground}
                imageStyle={styles.imageStyle}
              >
                <Text style={styles.gridItemText}>Winter</Text>
              </ImageBackground>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={entrance[5]}>
            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => handleSeasonPress('Spring')}
              accessibilityLabel="View Spring Favourites"
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <ImageBackground
                source={require('../assets/spring2.png')}
                style={styles.imageBackground}
                imageStyle={styles.imageStyle}
              >
                <Text style={styles.gridItemText}>Spring</Text>
              </ImageBackground>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={entrance[6]}>
            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => handleSeasonPress('Summer')}
              accessibilityLabel="View Summer Favourites"
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <ImageBackground
                source={require('../assets/summer3.png')}
                style={styles.imageBackground}
                imageStyle={styles.imageStyle}
              >
                <Text style={styles.gridItemText}>Summer</Text>
              </ImageBackground>
            </TouchableOpacity>
          </Animated.View>

          {/* User-Defined Collections with Animations */}
          {collections.map((collection) => {
            return (
              <Animated.View key={collection.title} style={collectionEntrance.styleFor(collection.title)}>
                <TouchableOpacity
                  style={[styles.customCollectionItem, { backgroundColor: collection.color }]}
                  accessibilityActions={[{ name: 'delete', label: `Delete ${collection.title}` }]}
                  onAccessibilityAction={() => handleDeleteCollection(collection)}
                  onPress={() => handleCollectionPress(collection)}  // Pass the entire collection object
                  accessibilityLabel={`View ${collection.title} Collection`}
                  accessibilityRole="button"
                  activeOpacity={0.8}
                >
                  {/* "X" Button for Deletion */}
                  <TouchableOpacity
                    style={styles.deleteButton}
                    hitSlop={14}
                    onPress={(e) => {
                      e.stopPropagation(); // Prevent triggering the parent onPress
                      handleDeleteCollection(collection);
                    }}
                    accessibilityLabel={`Delete ${collection.title} Collection`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.deleteButtonText}>X</Text>
                  </TouchableOpacity>
                  
                  {/* Collection Title */}
                  <Text style={styles.customCollectionText}>{collection.title}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

    </View>
  );
};

const getBoxSize = () => {
  if (width >= 768) {
    return 200;
  } else if (width >= 480) {
    return 160;
  } else if (width >= 400) {
    return 155;
  } else if (width >= 250) {
    return 140;
  } else {
    return 130;
  }
};
const BOX_SIZE = getBoxSize();

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F5E7D8",
    flex: 1,
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    paddingTop: 40, // Add top padding so user can scroll fully to top
    paddingHorizontal: 25,
    width: '90%',
    alignSelf: 'center',
  },
  headerContainer: {
    // No absolute positioning; part of the scrollable content
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: "#4A4A4A",
    textAlign: 'center',
    marginBottom: 16, 
    // Removed negative margin, now scrolling should behave correctly.
  },
  subtitleContainer: {
    width: '100%',
    // Removed flexDirection: 'row' since the button is no longer inline
    alignItems: 'center',
    marginBottom: 20, // Reduced margin to accommodate the button
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: "#707070",
    textAlign: 'center',
    marginBottom: 10, // Space between subtitle and button
  },
  createButton: {
    backgroundColor: '#8DA9F2', // Pastel blue
    paddingVertical: 10, // Top & Bottom Padding
    paddingHorizontal: 0, // Removed horizontal padding as width is set
    width: '35%', // 35% of parent container width
    borderRadius: 12,
    alignSelf: 'center', // Center horizontally
    marginBottom: 40, // Space before the cards
    shadowColor: '#000', // Optional shadow effect
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3, // Shadow for Android
  },
  buttonText: {
    color: '#FFFFFF', // White Text
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 100, // Extra space at bottom for comfortable scrolling
  },
  gridItem: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: 15,
    marginBottom: 30,
    marginRight: 3,
    overflow: 'hidden',
    minWidth: 50,
    minHeight: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imageBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.85,
  },
  imageStyle: {
    resizeMode: 'cover',
  },
  gridItemText: {
    fontSize: 25,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  customCollectionItem: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: 15,
    marginBottom: 30,
    marginRight: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  customCollectionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff', // Changed to white
  },

  // ======== DELETE BUTTON STYLES ========
  deleteButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Semi-transparent background
    borderRadius: 10,
    width: 17,
    height: 17,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1, // Ensure it appears above other elements
  },
  deleteButtonText: {
    color: '#000000', // Red color for visibility
    fontWeight: 'bold',
    fontSize: 14,
  },

});

export default Favourites;
