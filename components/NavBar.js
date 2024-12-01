// components/NavBar.js
import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function NavBar() {
  const navigation = useNavigation();

  return (
    <View style={styles.navBarContainer}>
      {/* Home Button */}
      <TouchableOpacity onPress={() => navigation.navigate('Home')}>
        <Text style={styles.title}>SznLuv</Text>
      </TouchableOpacity>

      {/* Icon Container */}
      <View style={styles.iconContainer}>
        {/* Favorites Screen Link */}
        <TouchableOpacity onPress={() => navigation.navigate('Favourites')}>
          <Image
            source={require('../assets/FAVOURITES.png')}
            style={styles.iconImage}
          />
        </TouchableOpacity>
        {/* Spin The Wheel Link */}
          <TouchableOpacity onPress={() => navigation.navigate('SpinTheWheel')}>
          <Image
            source={require('../assets/SPINTHEWHEEL.png')}
            style={styles.iconImage}
          />
          
        </TouchableOpacity>
        {/* Profile Screen Link */}
        <TouchableOpacity onPress={() => navigation.navigate('ProfileSettings')}>
          <Image
            source={require('../assets/PROFILE.png')}
            style={styles.iconImage}
          />
        </TouchableOpacity>

        
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navBarContainer: {
    width: '100%', // Ensures it spans the full width of the screen
    height: 130,
    backgroundColor: '#333333', // Dark background for contrast
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
   
    paddingHorizontal: 20, 
    // Reduced padding to avoid excessive indentation
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32, // Increased size by 10% from 24 to 26
    fontWeight: 'bold',
    marginTop: 45,
    
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginTop: 45,
   
  },
  iconImage: {
    width: 45, 
    height: 45,
    resizeMode: 'contain',
  },
});