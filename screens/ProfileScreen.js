
//NOT DONE

import * as React from "react";
import { Text, StyleSheet, Image, View, Switch, TouchableOpacity } from "react-native";
import { useState } from "react";

const Profile = () => {
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);

  const toggleLocationSwitch = () => setIsLocationEnabled((previousState) => !previousState);
  const toggleNotificationsSwitch = () => setIsNotificationsEnabled((previousState) => !previousState);

  return (
    <View style={styles.profile}>
      {/* Top Navigation Bar */}
      <View style={styles.topNav}>
        <Text style={styles.sznluv}>SznLuv</Text>
        <View style={styles.iconsContainer}>
          <Image style={styles.icon} source={{ uri: "path/to/icon1.png" }} />
          <Image style={styles.icon} source={{ uri: "path/to/icon2.png" }} />
          <Image style={styles.icon} source={{ uri: "path/to/icon3.png" }} />
        </View>
      </View>

      {/* Profile Picture and Name */}
      <Image style={styles.profileImage} resizeMode="cover" source={{ uri: "path/to/profile-image.png" }} />
      <Text style={styles.userName}>Zeeyad Monir</Text>
      <Text style={styles.editProfile}>Edit profile</Text>

      {/* Options */}
      <View style={styles.optionContainer}>
        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionText}>Change password</Text>
          <Image style={styles.arrowIcon} source={{ uri: "path/to/arrow-icon.png" }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionText}>Account settings</Text>
          <Image style={styles.arrowIcon} source={{ uri: "path/to/arrow-icon.png" }} />
        </TouchableOpacity>
        <View style={styles.option}>
          <Text style={styles.optionText}>Allow location services</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#b4ca44" }}
            thumbColor={isLocationEnabled ? "#f5dd4b" : "#f4f3f4"}
            onValueChange={toggleLocationSwitch}
            value={isLocationEnabled}
          />
        </View>
        <View style={styles.option}>
          <Text style={styles.optionText}>Allow notifications</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#b4ca44" }}
            thumbColor={isNotificationsEnabled ? "#f5dd4b" : "#f4f3f4"}
            onValueChange={toggleNotificationsSwitch}
            value={isNotificationsEnabled}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  
  profile: {
    backgroundColor: "#faf4e4",
    flex: 1,
    alignItems: "center",
  },

  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    height: 80,
    backgroundColor: "#323232",
    paddingHorizontal: 20,
  },

  sznluv: {
    fontFamily: "Gramatika-Black",
    fontSize: 24,
    color: "#faf4e4",
  },

  iconsContainer: {
    flexDirection: "row",
  },

  icon: {
    width: 24,
    height: 24,
    marginLeft: 15,
  },

  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginTop: 20,
    backgroundColor: "#FFDDC1",
  },

  userName: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: "#000",
    marginTop: 10,
    marginBottom: 10,
  },

  editProfile: {
    fontSize: 12,
    color: "#a59f90",
    textAlign: "center",
    marginBottom: 20,
  },

  optionContainer: {
    width: "90%",
    marginTop: 20,
  },

  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#323232",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },

  optionText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Neue Haas Grotesk Display Pro",
  },

  arrowIcon: {
    width: 12,
    height: 12,
    tintColor: "#fff",
  },

  iconImage: {
    width: 43,
    height: 43,
    resizeMode: 'contain',
  },
});

export default Profile;

