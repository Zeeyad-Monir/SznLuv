// screens/Favourites.js

// IN PROGRESS- not much changed

import * as React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

const Favourites = () => {
  	return (
			<View style={styles.container}>
		
			  {/* Header with logo and icons */}
			  <View style={styles.header}>
				{/* App logo */}
				<Text style={styles.logoText}>SznLuv</Text>
				<View style={styles.iconContainer}>
				  {/* Favorites screen link */}
				  <TouchableOpacity onPress={() => navigation.navigate('Favorites')}>
					<View style={styles.iconCircle}>
					  <Image
						source={require('../assets/FAVOURITES.png')}  // Adjusted path for Favorites image
						style={styles.iconImage} // Make sure to style the image
					  />
					</View>
				  </TouchableOpacity>
		
				  {/* Profile screen link */}
				  <TouchableOpacity onPress={() => navigation.navigate('ProfileScreen')}>
					<View style={styles.iconCircle}>
					  <Image
						source={require('../assets/PROFILE.png')}  // Adjusted path for Profile image
						style={styles.iconImage} // Make sure to style the image
					  />
					</View>
				  </TouchableOpacity>
		
				  {/* Custom icon link */}
				  <TouchableOpacity onPress={() => navigation.navigate('SpinTheWheel')}>
					<View style={styles.iconCircle}>
					  <Image
						source={require('../assets/SPINTHEWHEEL.png')}  // Adjusted path for SpinTheWheel image
						style={styles.iconImage} // Make sure to style the image
					  />
					</View>
				  </TouchableOpacity>
				</View>
			  </View>

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
    		<Image style={styles.heartIcon} source={{ uri: "heart_icon_url_here" }} />
    		<View>
      			<Text style={styles.itemTitle}>{name}</Text>
      			<Text style={styles.itemAddress}>{address}</Text>
    		</View>
    		<Image style={styles.arrowIcon} source={{ uri: "arrow_icon_url_here" }} />
  	</View>
);

const styles = StyleSheet.create({
  	container: {
    		backgroundColor: "#dbd3bd",
    		flex: 1,
    		paddingHorizontal: 20,
  	},
  	topNav: {
    		flexDirection: "row",
    		alignItems: "center",
    		justifyContent: "space-between",
    		paddingVertical: 15,
  	},
  	appTitle: {
    		fontSize: 25,
    		color: "#faf4e4",
    		fontFamily: "Gramatika-Black",
  	},
  	iconContainer: {
    		flexDirection: "row",
  	},
  	icon: {
    		width: 24,
    		height: 24,
    		marginLeft: 10,
  	},
  	header: {
    		marginTop: 20,
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
  	},
  	favouritesList: {
    		marginTop: 20,
  	},
  	itemContainer: {
    		flexDirection: "row",
    		alignItems: "center",
    		backgroundColor: "#f0eadd",
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
    		color: "#323232",
    		fontFamily: "Gramatika-Black",
  	},
  	itemAddress: {
    		fontSize: 9,
    		color: "#c2b697",
  	},
  	arrowIcon: {
    		marginLeft: "auto",
    		width: 10,
    		height: 10,
  	},

	  iconImage: {
		width: 43,
		height: 43,
		resizeMode: 'contain',
	  },
});

export default Favourites;

