import { useFocusEffect } from '@react-navigation/native';
import { updateCollection } from '../services/favourites';
import { openVenue } from '../services/venueNavigation';
// CustomCollectionScreen.js

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
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { AuthContext } from '../contexts/AuthContext';
import Icon from "react-native-vector-icons/MaterialIcons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { getReduceMotion } from "../hooks/useReduceMotion";

const CustomCollectionScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);

  // The entire collection object is passed from Favourites.js, including userId
  const { collection } = route.params;  
  // Example: { title: 'Adventure', color: '#A8E6CF', dates: [], userId: '...' }

  const [favoritedSpots, setFavoritedSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notificationMessage, setNotificationMessage] = useState('');

  // Animated values
  const notificationTranslateY = useRef(new Animated.Value(50)).current;
  const notificationOpacity = useRef(new Animated.Value(0)).current;

  useFocusEffect(React.useCallback(() => {
    if (!user) return;
    // Fetch the updated 'collections' array from Firestore to ensure we have the latest data
    const fetchFavoritedSpots = async () => {
      try {
        const docRef = doc(db, "favourites", user.uid);
        const docSnap = await getDoc(docRef);

        setFavoritedSpots([]);
        if (docSnap.exists()) {
          const data = docSnap.data();

          // Find the matching collection by title
          const matchingCollection = data?.collections?.find(
            (col) => col.title === collection.title
          );

          if (matchingCollection) {
            // This is where you'll get the specific spots/dates
            setFavoritedSpots(matchingCollection.dates || []);
          }
        } else {
          console.log("No favourites found for user.");
        }
      } catch (error) {
        console.error("Error fetching favorited spots:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavoritedSpots();
  }, [collection, user]));

  useEffect(() => {
    if (notificationMessage !== '') {
      Animated.parallel([
        Animated.timing(notificationTranslateY, {
          toValue: 0,
          duration: getReduceMotion() ? 0 : 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(notificationOpacity, {
          toValue: 1,
          duration: getReduceMotion() ? 0 : 500,
          useNativeDriver: true,
        }),
      ]).start();

      const timeout = setTimeout(() => {
        Animated.parallel([
          Animated.timing(notificationTranslateY, {
            toValue: 50,
            duration: getReduceMotion() ? 0 : 500,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(notificationOpacity, {
            toValue: 0,
            duration: getReduceMotion() ? 0 : 500,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setNotificationMessage('');
        });
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [notificationMessage]);

  const removeFavourite = async (spotName) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to remove favourites.');
      return;
    }

    try {
      const next = await updateCollection(user.uid, { type: 'remove', title: collection.title, spot: spotName });
      const updatedCollection = next.collections.find(col => col.title === collection.title);
      setFavoritedSpots(updatedCollection?.dates || []);
      setNotificationMessage(`"${spotName}" removed from "${collection.title}" collection.`);
    } catch (error) {
      console.error('Error removing favourite:', error);
      Alert.alert('Error', 'Failed to remove favourite. Please try again.');
    }
  };

  const handleSpotPress = (spotName) => openVenue(navigation, Alert.alert, spotName);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: collection.color }]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: collection.color }]}>
      {notificationMessage !== '' && (
        <Animated.View
          style={[
            styles.notificationContainer,
            {
              opacity: notificationOpacity,
              transform: [{ translateY: notificationTranslateY }],
            },
          ]}
        >
          <Text style={styles.notificationText}>{notificationMessage}</Text>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>{collection.title}</Text>
        <Text style={styles.subtitle}>Your favorited spots:</Text>

        {favoritedSpots.length > 0 ? (
          favoritedSpots.map((spot, index) => (
            <FavouriteItem
              key={index}
              name={spot}
              removeFavourite={removeFavourite}
              onPress={() => handleSpotPress(spot)}
            />
          ))
        ) : (
          <Text style={styles.emptyText}>
            No favorited spots yet! Add some to this collection.
          </Text>
        )}
      </ScrollView>
    </View>
  );
};

// FavouriteItem Component with Heart Icon
const FavouriteItem = ({ name, removeFavourite, onPress }) => (
  <View style={styles.itemContainer}>
    <TouchableOpacity
      style={styles.itemContent}
      onPress={onPress}
      accessibilityLabel={`View details for ${name}`}
      accessibilityRole="button"
    >
      <Text style={styles.itemTitle}>{name}</Text>
    </TouchableOpacity>

    <TouchableOpacity onPress={onPress} style={styles.arrowIcon} hitSlop={10} accessibilityLabel={`Open ${name}`} accessibilityRole="button">
      <Icon name="chevron-right" size={24} color="#323232" />
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.cardHeartIcon}
      hitSlop={10}
      onPress={() => removeFavourite(name)}
      accessibilityLabel={`Remove ${name} from favourites`}
      accessibilityRole="button"
    >
      <Icon name="favorite" size={24} color="#FF0000" />
    </TouchableOpacity>
  </View>
);

export default CustomCollectionScreen;

// ======== STYLES ========
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // The background color is set dynamically from collection.color
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40, // To ensure content is not hidden behind notification
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff", // white text if the collection color is darker
    textAlign: "center",
    marginBottom: 10,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0eadd",
    borderRadius: 14,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemContent: {
    flex: 1,
  },
  arrowIcon: {
    marginHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeartIcon: {
    marginLeft: 16,
  },
  itemTitle: {
    fontSize: 22,
    color: "#323232",
    // fontFamily: "Gramatika-Black", // Uncomment if using custom font
  },
  emptyText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginTop: 20,
    // fontFamily: "Gramatika-Black", // Uncomment if using custom font
  },
  notificationContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#323232',
    padding: 10,
    borderRadius: 8,
    zIndex: 1,
    alignItems: 'center',
  },
  notificationText: {
    color: '#fff',
    fontSize: 16,
    // fontFamily: "Gramatika-Black", // Uncomment if using custom font
  },
});
