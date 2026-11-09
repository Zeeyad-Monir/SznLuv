import { useFocusEffect } from '@react-navigation/native';
import { removeSavedSpot } from '../services/favourites';
import { openVenue } from '../services/venueNavigation';
// SeasonalFavourites.js
// This screen displays only the favourites for a specific season.
// It allows removal of favourites just like the old favourites screen did, but filtered by season.

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
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRoute, useNavigation } from '@react-navigation/native';
import useEntrance, { useItemEntrance } from '../hooks/useEntrance';
import { getReduceMotion } from '../hooks/useReduceMotion';

const SeasonalFavourites = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const season = route.params?.season || "Fall"; // Default to Fall if none provided

  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notificationMessage, setNotificationMessage] = useState('');

  // The header eases in once; each saved spot animates only when it first appears, so returning never blanks the list.
  const entrance = useEntrance(1, { ready: !loading });
  const itemEntrance = useItemEntrance(favourites, { ready: !loading });
  const notificationTranslateY = useRef(new Animated.Value(50)).current;
  const notificationOpacity = useRef(new Animated.Value(0)).current;

  const seasonTitle = `${season.charAt(0).toUpperCase() + season.slice(1)} Spots`;

  const getSeasonStyle = (season) => {
    // Return background color based on the season
    switch (season.toLowerCase()) {
      case 'fall':
        return { backgroundColor: '#FFA571' };
      case 'winter':
        return { backgroundColor: '#A7C8FF' };
      case 'spring':
        return { backgroundColor: '#FFC1E3' };
      case 'summer':
        return { backgroundColor: '#FFF9C4' };
      default:
        return { backgroundColor: '#FFA571' }; // Default to fall color if none provided
    }
  };

  // Fetch seasonal favourites
  useFocusEffect(React.useCallback(() => {
    let current = true;
    const fetchFavourites = async () => {
      try {
        if (user) {
          const docSnap = await getDoc(doc(db, "favourites", user.uid));
          if (!current) return;
          const data = docSnap.exists() ? docSnap.data() : {};

          // Filter favourites by season. Replaces the list in place, so nothing flashes on return.
          setFavourites(Object.keys(data)
            .filter((key) => data[key]?.isFavourite && data[key]?.season === season)
            .sort((a, b) => a.localeCompare(b)));
        }
      } catch (error) {
        console.error("Error fetching favourites:", error);
      } finally {
        if (current) setLoading(false);
      }
    };

    fetchFavourites();
    return () => { current = false; };
  }, [user, season]));

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
      await removeSavedSpot(user.uid, spotName);
      setFavourites(previous => previous.filter(name => name !== spotName));
      setNotificationMessage(`"${spotName}" removed from favourites.`);
    } catch (error) {
      console.error('Error removing favourite:', error);
      Alert.alert('Error', 'Failed to remove favourite. Please try again.');
    }
  };

  const handleFavouritePress = (name) => openVenue(navigation, Alert.alert, name);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: "#dbd3bd" }]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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

      <Animated.View style={[styles.headerTextContainer, entrance[0]]}>
        <Text style={styles.title}>Favourites</Text>
        <Text style={styles.subtitle}>Can’t wait to see where these take you!</Text>
        
        {/* Seasonal Subtitle Container */}
        <View style={[styles.subtitleContainer, getSeasonStyle(season)]}>
          <Text style={styles.subtitleText}>{seasonTitle}</Text>
        </View>
      </Animated.View>

      <ScrollView style={styles.favouritesList}>
        {favourites.length > 0 ? (
          favourites.map((favourite) => (
            <Animated.View key={favourite} style={itemEntrance.styleFor(favourite)}>
              <FavouriteItem
                name={favourite}
                removeFavourite={removeFavourite}
                onPress={() => handleFavouritePress(favourite)}
              />
            </Animated.View>
          ))
        ) : (
          <Text style={styles.emptyText}>No favourites yet! Add some dates to get started.</Text>
        )}
      </ScrollView>
    </View>
  );
};

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

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#dbd3bd",
    flex: 1,
  },
  headerTextContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 55,
    marginBottom: -15,
    color: "#323232",
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(50, 50, 50, 0.4)",
    paddingHorizontal: 2,
    marginTop: 13,
  },
  // New subtitle container styling
  subtitleContainer: {
    alignSelf: 'center',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 50,
    marginTop: 32,  // 32px below the main titles
    marginBottom: 20, // 24px above the list
  },
  subtitleText: {
    fontSize: 25,
    fontWeight: '700',
    color: '#000000',
    // fontFamily: 'Poppins', // If a custom font is desired, ensure it's loaded
    textAlign: 'center',
  },
  favouritesList: {
    marginTop: 20,
    paddingHorizontal: 20,
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
    fontFamily: "Gramatika-Black",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginTop: 20,
    fontFamily: "Gramatika-Black",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationContainer: {
    position: 'absolute',
    bottom: 50,
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
    fontFamily: "Gramatika-Black",
  },
});

export default SeasonalFavourites;