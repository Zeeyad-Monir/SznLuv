// Favourites.js

import React, { useEffect, useRef, useState, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Dimensions,
  Animated,
  Easing,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import NavBar from '../components/NavBar';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { AuthContext } from '../App';
import { db } from "../firebaseConfig";

const { width } = Dimensions.get('window');

const Favourites = () => {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);

  // ======== ANIMATION REFS ========
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(-20)).current;

  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(-20)).current;

  const seasonsAnimations = [
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

  // ======== COLLECTIONS STATE ========
  const [collections, setCollections] = useState([]);

  // ======== COLLECTIONS ANIMATIONS ========
  const [collectionAnimations, setCollectionAnimations] = useState([]);

  // ======== MODAL STATE & INPUTS ========
  const [modalVisible, setModalVisible] = useState(false);
  const [newCollectionTitle, setNewCollectionTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const colorPalette = ['#FFC1E3', '#A7C8FF', '#A8E6CF', '#FFF9C4', '#FF8B94', '#D3BFFF', '#FF8657'];

  // ======== CREATE BUTTON ANIMATION ========
  const createButtonScale = useRef(new Animated.Value(1)).current;
  const createButtonOpacity = useRef(new Animated.Value(0)).current;
  const createButtonTranslateY = useRef(new Animated.Value(-20)).current;

  // ======== DELETING COLLECTION STATE ========
  const [deletingCollection, setDeletingCollection] = useState(null);

  useEffect(() => {
    if (!user) return;
    const fetchCollections = async () => {
      try {
        const favouritesDoc = doc(db, "favourites", user.uid);
        const docSnap = await getDoc(favouritesDoc);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.collections && Array.isArray(data.collections)) {
            setCollections(data.collections);
            // Initialize animations for each collection
            const animations = data.collections.map(() => ({
              opacity: new Animated.Value(0),
              translateY: new Animated.Value(20),
            }));
            setCollectionAnimations(animations);
          }
        }
      } catch (error) {
        console.error("Error fetching user-defined collections:", error);
      }
    };
    fetchCollections();
  }, [user]);

  const handleCreateCollection = async () => {
    if (!newCollectionTitle.trim()) {
      Alert.alert("Error", "Title cannot be empty.");
      return;
    }
    if (!selectedColor) {
      Alert.alert("Error", "Please select a color.");
      return;
    }

    // Check for duplicate titles
    const duplicate = collections.some(
      (col) => col.title.toLowerCase() === newCollectionTitle.trim().toLowerCase()
    );
    if (duplicate) {
      Alert.alert("Error", "Title already exists.");
      return;
    }

    const newCollection = {
      title: newCollectionTitle.trim(),
      color: selectedColor,
      dates: [],
    };

    if (user) {
      try {
        const favouritesDoc = doc(db, "favourites", user.uid);
        const docSnap = await getDoc(favouritesDoc);

        let data = docSnap.exists() ? docSnap.data() : {};
        if (!data.collections) {
          data.collections = [];
        }

        data.collections.push(newCollection);

        await setDoc(favouritesDoc, data, { merge: true });
        setCollections(data.collections);

        // Initialize animation for the new collection
        const newAnim = {
          opacity: new Animated.Value(0),
          translateY: new Animated.Value(20),
        };
        setCollectionAnimations(prev => [...prev, newAnim]);

        // Trigger animation for the new collection
        Animated.parallel([
          Animated.timing(newAnim.opacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(newAnim.translateY, {
            toValue: 0,
            duration: 500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start();

        // Reset modal state
        setNewCollectionTitle('');
        setSelectedColor('');
        setModalVisible(false);

      } catch (error) {
        console.error("Error creating collection:", error);
        Alert.alert("Error", "Failed to create collection. Please try again.");
      }
    }
  };

  const handleSeasonPress = (season) => {
    navigation.navigate('SeasonalFavourites', { season });
  };

  // Updated handleCollectionPress to navigate with collection object and userId
  const handleCollectionPress = (collection) => {
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

  const deleteCollection = async (collectionToDelete) => {
    try {
      // Set the collection being deleted
      setDeletingCollection(collectionToDelete.title);

      // Find the index of the collection to delete
      const animIndex = collections.findIndex(col => col.title === collectionToDelete.title);
      if (animIndex === -1 || !collectionAnimations[animIndex]) {
        // Collection not found, proceed with deletion without animation
        await performDeletion(collectionToDelete, animIndex);
        return;
      }

      // Animate the opacity and translateY
      Animated.parallel([
        Animated.timing(collectionAnimations[animIndex].opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(collectionAnimations[animIndex].translateY, {
          toValue: -20,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(async () => {
        // After animation completes, proceed with deletion
        await performDeletion(collectionToDelete, animIndex);
      });
    } catch (error) {
      console.error("Error deleting collection:", error);
      Alert.alert("Error", "Failed to delete the collection. Please try again.");
      setDeletingCollection(null);
    }
  };

  const performDeletion = async (collectionToDelete, animIndex) => {
    try {
      const favouritesDocRef = doc(db, "favourites", user.uid);
      const docSnap = await getDoc(favouritesDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.collections && Array.isArray(data.collections)) {
          const updatedCollections = data.collections.filter(
            (col) => col.title !== collectionToDelete.title
          );

          await setDoc(favouritesDocRef, { collections: updatedCollections }, { merge: true });
          setCollections(updatedCollections);

          // Remove the associated animation
          if (animIndex !== -1) {
            setCollectionAnimations((prevAnimations) => {
              const newAnimations = [...prevAnimations];
              newAnimations.splice(animIndex, 1);
              return newAnimations;
            });
          }

          Alert.alert("Success", "Collection deleted successfully.");
        }
      }

      // Reset the deletingCollection state
      setDeletingCollection(null);
    } catch (error) {
      console.error("Error deleting collection:", error);
      Alert.alert("Error", "Failed to delete the collection. Please try again.");
      setDeletingCollection(null);
    }
  };

  useEffect(() => {
    // Animate title
    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    // Animate subtitle after title
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }, 400);

    // Animate seasons
    seasonsAnimations.forEach((anim, index) => {
      const delay = 800 + index * 300;
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateY, {
            toValue: 0,
            duration: 500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.spring(anim.scale, {
            toValue: 1,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start();
      }, delay);
    });

    // Animate user-defined collections
    if (collectionAnimations.length > 0) {
      collectionAnimations.forEach((anim, index) => {
        const delay = 1200 + index * 200;
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(anim.translateY, {
              toValue: 0,
              duration: 500,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]).start();
        }, delay);
      });
    }

    // Animate "Create" button entrance
    Animated.parallel([
      Animated.timing(createButtonOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(createButtonTranslateY, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

  }, [collectionAnimations]);

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
      <NavBar />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Header Container */}
        <Animated.View
          style={[
            styles.headerContainer,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          <Text style={styles.title}>Favourites</Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View
          style={[
            styles.subtitleContainer,
            {
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleTranslateY }],
            },
          ]}
        >
          <Text style={styles.subtitle}>Can’t wait to see where these take you!</Text>
        </Animated.View>

        {/* Create Button with Entrance and Press Animations */}
        <Animated.View
          style={{
            opacity: createButtonOpacity,
            transform: [
              { translateY: createButtonTranslateY },
              { scale: createButtonScale },
            ],
          }}
        >
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setModalVisible(true)}
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
          <Animated.View
            style={{
              opacity: seasonsAnimations[0].opacity,
              transform: [
                { translateY: seasonsAnimations[0].translateY },
                { scale: seasonsAnimations[0].scale },
              ],
            }}
          >
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

          <Animated.View
            style={{
              opacity: seasonsAnimations[1].opacity,
              transform: [
                { translateY: seasonsAnimations[1].translateY },
                { scale: seasonsAnimations[1].scale },
              ],
            }}
          >
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

          <Animated.View
            style={{
              opacity: seasonsAnimations[2].opacity,
              transform: [
                { translateY: seasonsAnimations[2].translateY },
                { scale: seasonsAnimations[2].scale },
              ],
            }}
          >
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

          <Animated.View
            style={{
              opacity: seasonsAnimations[3].opacity,
              transform: [
                { translateY: seasonsAnimations[3].translateY },
                { scale: seasonsAnimations[3].scale },
              ],
            }}
          >
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
          {collections.map((collection, index) => {
            const anim = collectionAnimations[index];
            if (!anim) return null; // Ensure animation exists

            const isDeleting = deletingCollection === collection.title;

            return (
              <Animated.View
                key={collection.title + index}
                style={{
                  opacity: anim.opacity,
                  transform: [{ translateY: anim.translateY }],
                }}
              >
                <TouchableOpacity
                  style={[styles.customCollectionItem, { backgroundColor: collection.color }]}
                  onPress={() => handleCollectionPress(collection)}  // Pass the entire collection object
                  accessibilityLabel={`View ${collection.title} Collection`}
                  accessibilityRole="button"
                  activeOpacity={0.8}
                >
                  {/* "X" Button for Deletion */}
                  <TouchableOpacity
                    style={styles.deleteButton}
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

      {/* Create Collection Modal */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            {/* "X" Button to Close Modal */}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
              accessibilityLabel="Close Create Collection Modal"
              accessibilityRole="button"
            >
              <Text style={styles.modalCloseButtonText}>X</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Create a Collection</Text>

            <TextInput
              style={styles.titleInput}
              placeholder="Create title"
              placeholderTextColor="#999"
              value={newCollectionTitle}
              onChangeText={setNewCollectionTitle}
            />

            <View style={styles.colorPaletteContainer}>
              {colorPalette.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: color },
                    color === selectedColor && styles.selectedColorCircle
                  ]}
                  onPress={() => setSelectedColor(color)}
                  accessibilityLabel={`Choose color ${color}`}
                  accessibilityRole="button"
                />
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.createButtonModal,
                (!newCollectionTitle.trim() || !selectedColor) && { backgroundColor: '#ccc' },
              ]}
              onPress={handleCreateCollection}
              disabled={!newCollectionTitle.trim() || !selectedColor}
              accessibilityLabel="Create new collection"
              accessibilityRole="button"
            >
              <Text style={styles.createButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    color: '#FF0000', // Red color for visibility
    fontWeight: 'bold',
    fontSize: 14,
  },

  // ======== "X" Button for Modal ========
  modalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'transparent', // Transparent background to blend with modal
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#888', // Grey color for the "X"
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Modal Styles
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    color: '#323232',
  },
  titleInput: {
    width: '90%',
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    color: '#000',
  },
  colorPaletteContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 8,
  },
  selectedColorCircle: {
    borderWidth: 2,
    borderColor: '#000',
  },
  createButtonModal: {
    width: '60%',
    height: 40,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default Favourites;
