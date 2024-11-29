// screens/Favourites.js

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import NavBar from '../components/NavBar'; // Import NavBar

const Favourites = () => {
  return (
    <View style={styles.container}>
      {/* Integrate NavBar */}
      <NavBar />

      {/* Header Text */}
      <View style={styles.header}>
        <Text style={styles.title}>Favourites</Text>
        <Text style={styles.subtitle}>Can’t wait to see where these take you!</Text>
      </View>

      {/* Favourites List */}
      <View style={styles.favouritesList}>
        <FavouriteItem
          name="Aldor Acres Family Farm"
          address="24990 84 Ave, Langley, BC"
        />
        <FavouriteItem
          name="Eagle Acres Dairy & Pumpkin Patch"
          address="8796 240 St, Langley, BC"
        />
        <FavouriteItem
          name="Laity Pumpkin Patch"
          address="2725 Laity St, Maple Ridge, BC"
        />
      </View>
    </View>
  );
};

// Component for each favourite item
const FavouriteItem = ({ name, address }) => (
  <View style={styles.itemContainer}>
    <Image
      style={styles.heartIcon}
      source={{ uri: 'https://via.placeholder.com/20/FF0000/FFFFFF?text=♥' }}
    />
    <View>
      <Text style={styles.itemTitle}>{name}</Text>
      <Text style={styles.itemAddress}>{address}</Text>
    </View>
    <Image
      style={styles.arrowIcon}
      source={{ uri: 'https://via.placeholder.com/10/000000/FFFFFF?text=→' }}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#dbd3bd',
    flex: 1,
    //paddingHorizontal: 20,
    //paddingTop: 130, // Add padding to accommodate NavBar height
  },
  header: {
    marginTop: 20,
  },
  title: {
    fontSize: 55,
    marginBottom: -15,
    color: '#323232',
    fontFamily: 'Gramatika-Black',
		paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(50, 50, 50, 0.4)',
    fontFamily: 'Gramatika-Black',
		marginTop: 10,
		paddingHorizontal: 20,
  },
  favouritesList: {
    marginTop: 20,
		paddingHorizontal: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0eadd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  heartIcon: {
    width: 20,
    height: 20,
    marginRight: 15,
  },
  itemTitle: {
    fontSize: 15,
    color: '#323232',
    fontFamily: 'Gramatika-Black',
  },
  itemAddress: {
    fontSize: 9,
    color: '#c2b697',
  },
  arrowIcon: {
    marginLeft: 'auto',
    width: 10,
    height: 10,
  },
});

export default Favourites;