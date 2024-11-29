import React, { useEffect, useState, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import NavBar from '../components/NavBar';
import { AuthContext } from '../App';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

const Favourites = () => {
  const { user } = useContext(AuthContext);
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notificationMessage, setNotificationMessage] = useState('');

  const navigation = useNavigation();

  useEffect(() => {
    const fetchFavourites = async () => {
      try {
        if (user) {
          const favouritesDoc = doc(db, "favourites", user.uid);
          const docSnap = await getDoc(favouritesDoc);

          if (docSnap.exists()) {
            const data = docSnap.data();
            const sortedFavourites = Object.keys(data)
              .filter((key) => data[key])
              .sort((a, b) => a.localeCompare(b));
            setFavourites(sortedFavourites);
          } else {
            console.log("No favourites found for user.");
          }
        }
      } catch (error) {
        console.error("Error fetching favourites:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavourites();
  }, [user]);

  const removeFavourite = async (spotName) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to remove favourites.');
      return;
    }

    const userFavoritesRef = doc(db, 'favourites', user.uid);

    try {
      const docSnap = await getDoc(userFavoritesRef);
      let userFavorites = docSnap.exists() ? docSnap.data() : {};

      if (userFavorites[spotName]) {
        delete userFavorites[spotName];

        await setDoc(userFavoritesRef, userFavorites);

        setFavourites((prevFavourites) =>
          prevFavourites.filter((fav) => fav !== spotName).sort((a, b) => a.localeCompare(b))
        );

        setNotificationMessage(`"${spotName}" removed from favourites.`);
        setTimeout(() => {
          setNotificationMessage('');
        }, 3000);
      } else {
        console.log('Favourite not found.');
      }
    } catch (error) {
      console.error('Error removing favourite:', error);
      Alert.alert('Error', 'Failed to remove favourite. Please try again.');
    }
  };

  const handleFavouritePress = (name) => {
    if (name === 'Aldor Family Farm') {
      navigation.navigate('AldorFamilyFarmScreen');
    } else if (name === 'Laity Pumpkin Patch') {
      navigation.navigate('LaityPumpkinPatch');
    } else {
      Alert.alert('Coming Soon', 'Feature coming soon.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavBar />

      {notificationMessage !== '' && (
        <View style={styles.notificationContainer}>
          <Text style={styles.notificationText}>{notificationMessage}</Text>
        </View>
      )}

      <View style={styles.headerTextContainer}>
        <Text style={styles.title}>Favourites</Text>
        <Text style={styles.subtitle}>Can’t wait to see where these take you!</Text>
      </View>
      <ScrollView style={styles.favouritesList}>
        {favourites.length > 0 ? (
          favourites.map((favourite, index) => (
            <FavouriteItem
              key={index}
              name={favourite}
              removeFavourite={removeFavourite}
              onPress={() => handleFavouritePress(favourite)}
            />
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
    <TouchableOpacity onPress={onPress} style={styles.arrowIcon}>
      <Icon name="chevron-right" size={24} color="#323232" />
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.cardHeartIcon}
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
    fontFamily: "Gramatika-Black",
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(50, 50, 50, 0.4)",
    fontFamily: "Gramatika-Black",
    paddingHorizontal: 2,
    marginTop: 13,
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

export default Favourites;