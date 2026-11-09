// SpinTheWheel.js
// Detailed comments are added by chatgpt.com to the existing code, this way it makes it easier for each other to know what we coded when the other looks at it. Aswell as helps remember everything going on. 

/* ================================ IMPORTS ================================ */
// Importing necessary modules and components from React and React Native.
import React, { useState, useRef, useEffect, useContext } from "react";
import { useScrollToTop } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Alert,
  Dimensions,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { fallSpotNames } from "../services/spots";

/* ================================ ASYNC STORAGE ================================ */
// Importing AsyncStorage for persistent storage.
import AsyncStorage from "@react-native-async-storage/async-storage";

/* ================================ SVG IMPORTS ================================ */
// Importing SVG components for rendering vector graphics.
import Svg, { Path, G, Text as SvgText, TSpan } from "react-native-svg";

/* ================================ LOTTIE IMPORTS ================================ */
// Importing LottieView for animations.
import LottieView from "lottie-react-native"; // Import LottieView
import BackgroundLottie from "../components/BackgroundLottie";
import { useFloatingScrollStyle } from '../navigation/floatingNavigationLayout';
import { SignedInScreen } from '../navigation/topNavigationLayout';
import { getReduceMotion } from "../hooks/useReduceMotion";

// Importing Lottie animations statically.
import fallingLeavesAnimation from "../assets/fallingLeaves.json";
import snowFallingAnimation from "../assets/snowFalling.json";
import flowersFallingAnimation from "../assets/flowersFalling.json"; 
import summerFallingAnimation from "../assets/summerFalling.json";
import wheelFallingAnimation from "../assets/wheelFalling.json"; 

/* ================================ ICON IMPORTS ================================ */
// Importing Ionicons for arrow indicators.
import { Ionicons } from "@expo/vector-icons"; 
/* ================================ FIRESTORE IMPORTS ================================ */
// Importing Firestore functions and database instance.
import { doc, getDoc } from "firebase/firestore"; 
import { db } from "../firebaseConfig"; // Import Firestore database instance

/* ================================ AUTH CONTEXT IMPORTS ================================ */
// Importing AuthContext to get authenticated user.
import { AuthContext } from "../contexts/AuthContext"; // Import AuthContext to get authenticated user

/* ================================ DEVICE DIMENSIONS ================================ */
// Getting the width and height of the device screen for positioning elements.
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

/* ================================ DATA ================================ */
// Season-specific date ideas categorized by season.
const seasonDateOptions = {
  Fall: fallSpotNames, // every spot on the Fall screen (services/spots.js)
  Winter: [
    "Glacier Rink",
    "Frosty Pond",
    "Evergreen Acres",
    "Snowy Pines",
    "Science World",
  ],
  Spring: [
    "Blossom Garden",
    "VanDusen Botanical Garden",
    "Spring Haven",
    "River Trail",
    "Meadow Path",
  ],
  Summer: [
    "Sunset Beach",
    "English Bay",
    "Golden Sands",
    "Grouse Grind",
    "Coral Cove",
  ],
};

/* ================================ COLORS ================================ */
// Array of colors used for different sections of the wheel.
const sectionColors = [
  "#FF9FD2",
  "#FF8657",
  "#F8DD74",
  "#B9CCEC",
  "#FF9FD2",
  "#FF8657",
  "#F8DD74",
  "#B9CCEC",
  "#FF8657",
];

/* ================================ COMPONENT DEFINITION ================================ */
/* ================================ SPIN THE WHEEL COMPONENT ================================ */
// Define the SpinTheWheel component which manages the spinning wheel functionality.
// One timing for this screen's entrances: quick, and instant under Reduce Motion.
const settle = (value, toValue, delay = 0) => Animated.timing(value, {
  toValue,
  duration: getReduceMotion() ? 0 : 240,
  delay: getReduceMotion() ? 0 : delay,
  easing: Easing.out(Easing.quad),
  useNativeDriver: true,
});

const SpinTheWheel = () => {
  const floatingScrollStyle = useFloatingScrollStyle(styles.scrollContainer);
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef); // Re-tapping this section scrolls back to the top

  /* ================================ CONTEXT AND STATE ================================ */
  // Accessing the authenticated user from AuthContext.
  const { user } = useContext(AuthContext); // Access AuthContext

  // State to manage the spinning status of the wheel.
  const [isSpinning, setIsSpinning] = useState(false);

  // State to hold the selected date idea after spinning.
  const [selectedDate, setSelectedDate] = useState(null);

  // State to hold the currently selected season.
  const [selectedSeason, setSelectedSeason] = useState(""); // New state for selected season

  // State to hold date options based on the selected season.
  const [dateOptions, setDateOptions] = useState([]); // Date options based on selected season

  // State to manage the visibility of the season selection dropdown.
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // State for dropdown visibility

  // State for background animation source and its corresponding style.
  const [backgroundAnimation, setBackgroundAnimation] = useState(null);
  const [backgroundAnimationStyle, setBackgroundAnimationStyle] = useState(null);

  // State for controlling the speed of background animations.
  const [backgroundAnimationSpeed, setBackgroundAnimationSpeed] = useState(1.0); // Default speed

  /* ================================ BACKGROUND ANIMATION SPEED CONFIGURATION ================================ */
  // Configuration object mapping each season to its corresponding background animation speed.
  const backgroundAnimationSpeeds = {
    Fall: 0.55, // Speed for Fall
    Winter: 0.2, // Speed for Winter
    Spring: 0.5, // Speed for Spring
    Summer: 0.7, // Speed for Summer
  };

  /* ================================ REFS ================================ */
  // Reference for managing the rotation animation of the wheel.
  const rotation = useRef(new Animated.Value(0)).current;

  // Animated values for controlling the greeting text's opacity and vertical position.
  const greetingOpacity = useRef(new Animated.Value(0)).current;
  const greetingTranslateY = useRef(new Animated.Value(-20)).current;

  // Animated values for controlling the wheel's opacity, vertical position, and scale.
  const wheelOpacity = useRef(new Animated.Value(0)).current;
  const wheelTranslateY = useRef(new Animated.Value(30)).current;

  // Animated values for controlling the spin button's opacity, vertical position, and scale.
  const spinButtonOpacity = useRef(new Animated.Value(0)).current;
  const spinButtonTranslateY = useRef(new Animated.Value(30)).current;

  // Animated values for controlling the result box's opacity, vertical position, and scale.
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const resultTranslateY = useRef(new Animated.Value(30)).current;

  // Animated values for controlling the "Enjoy your date!" text's opacity and vertical position.
  const enjoyTextOpacity = useRef(new Animated.Value(0)).current;
  const enjoyTextTranslateY = useRef(new Animated.Value(20)).current;

  // Reference for the Lottie animation (wheel falling).
  const lottieRef = useRef(null);

  /* ================================ USERNAME STATE ================================ */
  // State to store the username fetched from Firestore.
  const [userName, setUserName] = useState(""); // Added state for username

  // State to manage the loading status while fetching the username.
  const [loadingUsername, setLoadingUsername] = useState(true); // Added state for loading

  /* ================================ EFFECTS ================================ */

  /* ---------------------------- LOAD DATE IDEA FROM ASYNC STORAGE ---------------------------- */
  // Load the current date idea from AsyncStorage when the component mounts.
  useEffect(() => {
    const loadDateIdea = async () => {
      try {
        const storedDate = await AsyncStorage.getItem("currentDateIdea");
        if (storedDate) {
          console.log("Date idea retrieved from AsyncStorage:", storedDate);
          setSelectedDate(storedDate);
        }
      } catch (error) {
        console.error("Error loading date idea from AsyncStorage:", error);
      }
    };

    loadDateIdea();
  }, []);

  /* ---------------------------- FETCH USERNAME FROM FIRESTORE ---------------------------- */
  // Fetch the username from Firestore when the component mounts or when the user changes.
  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) {
        setUserName("User"); // Default name if user is not authenticated
        setLoadingUsername(false);
        return;
      }

      try {
        // Reference to the user's document in Firestore.
        const userDocRef = doc(db, "users", user.uid); // Reference to the user's document

        // Fetch the document snapshot.
        const userDocSnap = await getDoc(userDocRef); // Fetch the document snapshot

        if (userDocSnap.exists()) {
          // If the document exists, extract the username.
          const data = userDocSnap.data();
          setUserName(data.username || "User"); // Set the username or default to 'User'
        } else {
          console.log("No user data found!");
          setUserName("User"); // Default name if document does not exist
        }
      } catch (error) {
        console.error("Error fetching user name:", error);
        setUserName("User"); // Default name on error
      } finally {
        setLoadingUsername(false); // Stop loading regardless of success or failure
      }
    };

    fetchUserName();
  }, [user]);

  /* ---------------------------- UPDATE DATE OPTIONS AND BACKGROUND ANIMATION ---------------------------- */
  // Update date options and background animation when the selected season changes.
  useEffect(() => {
    if (selectedSeason && seasonDateOptions[selectedSeason]) {
      setDateOptions(seasonDateOptions[selectedSeason]);
    } else {
      setDateOptions([]);
    }

    // Update background animation, its style, and speed based on selected season.
    switch (selectedSeason) {
      case "Fall":
        setBackgroundAnimation(fallingLeavesAnimation);
        setBackgroundAnimationStyle(styles.fallingLeavesAnimation);
        setBackgroundAnimationSpeed(backgroundAnimationSpeeds.Fall);
        break;
      case "Winter":
        setBackgroundAnimation(snowFallingAnimation);
        setBackgroundAnimationStyle(styles.snowFallingAnimation);
        setBackgroundAnimationSpeed(backgroundAnimationSpeeds.Winter);
        break;
      case "Spring":
        setBackgroundAnimation(flowersFallingAnimation); // Corrected variable name
        setBackgroundAnimationStyle(styles.flowersFallingAnimation);
        setBackgroundAnimationSpeed(backgroundAnimationSpeeds.Spring);
        break;
      case "Summer":
        setBackgroundAnimation(summerFallingAnimation);
        setBackgroundAnimationStyle(styles.summerFallingAnimation);
        setBackgroundAnimationSpeed(backgroundAnimationSpeeds.Summer);
        break;
      default:
        setBackgroundAnimation(null);
        setBackgroundAnimationStyle(null);
        setBackgroundAnimationSpeed(1.0); // Default speed
        break;
    }
  }, [selectedSeason]);

  /* ---------------------------- TRIGGER ANIMATIONS BASED ON SELECTED DATE ---------------------------- */
  // Trigger animations when the component loads or when selectedDate changes.
  useEffect(() => {
    if (!selectedDate) {
      // The greeting and spin button settle in as the page arrives. The wheel has its own effect below.
      greetingOpacity.setValue(0);
      greetingTranslateY.setValue(-20);
      spinButtonOpacity.setValue(0);
      spinButtonTranslateY.setValue(30);
      Animated.parallel([
        settle(greetingOpacity, 1),
        settle(greetingTranslateY, 0),
        settle(spinButtonOpacity, 1, 40),
        settle(spinButtonTranslateY, 0, 40),
      ]).start();
    } else {
      resultOpacity.setValue(0);
      resultTranslateY.setValue(30);
      enjoyTextOpacity.setValue(0);
      enjoyTextTranslateY.setValue(20);
      Animated.parallel([
        settle(resultOpacity, 1),
        settle(resultTranslateY, 0),
        settle(enjoyTextOpacity, 1, 120),
        settle(enjoyTextTranslateY, 0, 120),
      ]).start();

      // Play the celebration when a date is selected; it's decoration, so Reduce Motion skips it.
      if (lottieRef.current && !getReduceMotion()) {
        lottieRef.current.play();
      }
    }
  }, [selectedDate]);

  /* ---------------------------- ANIMATE WHEEL BASED ON SEASON SELECTION ---------------------------- */
  // The wheel appears once a season is chosen, and hides again if the season is cleared.
  useEffect(() => {
    if (selectedSeason) {
      wheelOpacity.setValue(0);
      wheelTranslateY.setValue(30);
      Animated.parallel([settle(wheelOpacity, 1), settle(wheelTranslateY, 0)]).start();
    } else {
      Animated.parallel([settle(wheelOpacity, 0), settle(wheelTranslateY, 30)]).start();
    }
  }, [selectedSeason]);

  /* ================================ FUNCTIONS ================================ */

  /* ---------------------------- SAVE DATE IDEA TO ASYNC STORAGE ---------------------------- */
  // Function to save the selected date idea to AsyncStorage.
  const saveDateIdea = async (idea) => {
    try {
      await AsyncStorage.setItem("currentDateIdea", idea);
      console.log("Date idea saved in AsyncStorage:", idea);
    } catch (error) {
      console.error("Error saving date idea to AsyncStorage:", error);
    }
  };

  /* ---------------------------- RETRIEVE SAVED DATE IDEA FROM ASYNC STORAGE ---------------------------- */
  // Function to retrieve the saved date idea from AsyncStorage.
  const retrieveSavedDateIdea = async () => {
    try {
      const storedDate = await AsyncStorage.getItem("currentDateIdea");
      if (storedDate) {
        Alert.alert("Saved Date Idea", `Your saved date idea is: ${storedDate}`);
      } else {
        Alert.alert("No Date Idea", "No saved date idea was found.");
      }
    } catch (error) {
      console.error("Error retrieving date idea from AsyncStorage:", error);
      Alert.alert("Error", "Could not retrieve the saved date idea.");
    }
  };

  /* ---------------------------- START SPIN FUNCTION ---------------------------- */
  // Function to handle the spin action when the spin button is pressed.
  const startSpin = () => {
    // Handle case where no season is selected.
    if (!selectedSeason) {
      Alert.alert(
        "No Season Selected",
        "Please select a season before spinning the wheel."
      );
      return;
    }

    // Handle case where no date options are available for the selected season.
    if (dateOptions.length === 0) {
      Alert.alert(
        "No Date Ideas",
        "No date ideas are available for the selected season."
      );
      return;
    }

    // Set spinning state to true and reset the selected date.
    setIsSpinning(true);
    setSelectedDate(null);

    // Determine spin duration and the number of rotations.
    const spinDuration = 4000 + Math.random() * 2000; // Duration between 4s to 6s.
    const rotations = 5 + Math.random() * 2; // Between 5 to 7 rotations.
    const randomRotation = rotations * 360; // Total degrees to rotate.

    // Start the rotation animation.
    Animated.timing(rotation, {
      toValue: randomRotation,
      duration: getReduceMotion() ? 0 : spinDuration, // Reduce Motion reveals the result without the spin
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      // Calculate the normalized rotation to determine the selected segment.
      const normalizedRotation = randomRotation % 360;
      const degreesPerSegment = 360 / dateOptions.length;
      const index =
        dateOptions.length -
        1 -
        (Math.floor(normalizedRotation / degreesPerSegment) %
          dateOptions.length);
      const newDate = dateOptions[index];
      setSelectedDate(newDate);
      saveDateIdea(newDate);
      setIsSpinning(false);
      rotation.setValue(0); // Reset rotation value.
    });
  };

  /* ---------------------------- WHEEL ROTATION INTERPOLATION ---------------------------- */
  // Interpolate the rotation value for the wheel's rotation animation.
  const wheelRotation = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  /* ---------------------------- RENDER WHEEL SECTIONS ---------------------------- */
  // Function to render each section of the wheel based on dateOptions.
  const renderWheelSections = () => {
    const numSections = dateOptions.length;
    const angle = 360 / numSections;
    const radius = 150;
    // Every label reads "Mystery Spot", so on a dense wheel (e.g. Fall's long list) the text would only overlap; hide it.
    const showLabels = numSections <= 12;

    return dateOptions.map((option, index) => {
      const startAngle = index * angle;
      const endAngle = startAngle + angle;
      const largeArcFlag = angle > 180 ? 1 : 0;

      // Calculate coordinates for the SVG Path.
      const x1 = radius + radius * Math.cos((Math.PI * startAngle) / 180);
      const y1 = radius + radius * Math.sin((Math.PI * startAngle) / 180);

      const x2 = radius + radius * Math.cos((Math.PI * endAngle) / 180);
      const y2 = radius + radius * Math.sin((Math.PI * endAngle) / 180);

      // Calculate position for the text within the section.
      const textAngle = startAngle + angle / 2;
      const textRadius = radius * 0.7;
      const textX = radius + textRadius * Math.cos((Math.PI * textAngle) / 180);
      const textY = radius + textRadius * Math.sin((Math.PI * textAngle) / 180);

      // Use "Mystery Spot" as the display text for each section.
      const displayText = "Mystery Spot";
      const words = displayText.split(" ");
      const lines = [];
      let line = "";

      // Split the display text into multiple lines if necessary.
      words.forEach((word) => {
        const testLine = line + word + " ";
        if (testLine.length > 12) {
          lines.push(line.trim());
          line = word + " ";
        } else {
          line = testLine;
        }
      });
      lines.push(line.trim());

      return (
        <G key={`section-${index}`}>
          {/* SVG Path for the wheel section */}
          <Path
            d={`M${radius},${radius} L${x1},${y1} A${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z`}
            fill={sectionColors[index % sectionColors.length]}
            stroke="#fff"
            strokeWidth="2"
          />
          {/* SVG Text for the section */}
          {showLabels && (
          <SvgText
            x={textX}
            y={textY - (lines.length - 1) * 6}
            fill="#000"
            fontSize="12"
            fontWeight="bold"
            textAnchor="middle"
            alignmentBaseline="middle"
            transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
          >
            {lines.map((lineText, idx) => (
              <TSpan x={textX} dy={idx === 0 ? 0 : 14} key={`line-${idx}`}>
                {lineText}
              </TSpan>
            ))}
          </SvgText>
          )}
        </G>
      );
    });
  };

  /* ================================ RENDERING ================================ */
  // Render the main UI of the SpinTheWheel component.
  return (
    <SignedInScreen style={styles.mainContainer}>
      {/* ================================ BACKGROUND COLOR VIEW ================================ */}
      {/* Background Color View */}
      <View style={styles.backgroundColorView} />

      {/* ================================ BACKGROUND LOTTIE ANIMATION ================================ */}
      {/* Background Lottie Animation */}
      {/* Conditionally render the background animation only when no date is selected. */}
      {!selectedDate && backgroundAnimation && (
        <BackgroundLottie
          source={backgroundAnimation}
          style={backgroundAnimationStyle}
          speed={backgroundAnimationSpeed} // Applied speed configuration.
        />
      )}
      {/* ================================ SCROLLABLE CONTENT ================================ */}
      {/* Scrollable Content Container */}
      <ScrollView ref={scrollRef} contentContainerStyle={floatingScrollStyle}>
        {/* ================================ GREETING TEXT ================================ */}
        {/* Animated Greeting Text */}
        <Animated.View
          style={[
            {
              opacity: greetingOpacity,
              transform: [{ translateY: greetingTranslateY }],
            },
          ]}
        >
          <Text style={styles.helloText}>
            {loadingUsername ? "Hello, ..." : `Hello, ${userName}!`}
          </Text>
        </Animated.View>

        {/* ================================ CONDITIONAL RENDERING ================================ */}
        {/* Conditional Rendering Based on Whether a Date is Selected */}
        {!selectedDate ? (
          <>
            {/* ================================ SEASON SELECTION DROPDOWN ================================ */}
            {/* Season Selection Dropdown */}
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdownHeader}
                onPress={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <Text style={styles.dropdownHeaderText}>
                  {selectedSeason ? selectedSeason : "Seasons"}
                </Text>
                <Ionicons
                  name={isDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#555"
                />
              </TouchableOpacity>
              {isDropdownOpen && (
                <View style={styles.dropdownOptions}>
                  {Object.keys(seasonDateOptions).map((season) => (
                    <TouchableOpacity
                      key={season}
                      style={styles.dropdownOption}
                      onPress={() => {
                        setSelectedSeason(season);
                        setIsDropdownOpen(false);
                        console.log("Selected Season:", season);
                      }}
                    >
                      <Text style={styles.dropdownOptionText}>{season}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* ================================ SUBTITLE TEXT ================================ */}
            {/* Subtitle Prompting User to Spin the Wheel */}
            <Text style={styles.subtitle}>
              Let’s spin to find the perfect date!
            </Text>

            {/* ================================ WHEEL CONTAINER ================================ */}
            {/* Container for the Spinning Wheel */}
            <View style={styles.wheelContainer}>
              {/* Pointer indicating the selected section of the wheel */}
              <View style={styles.wheelPointer} />
              {/* Animated Wheel that rotates based on the `wheelRotation` value */}
              <Animated.View
                style={[
                  styles.wheel,
                  {
                    opacity: wheelOpacity,
                    transform: [
                      { rotate: wheelRotation },
                      { translateY: wheelTranslateY },
                    ],
                  },
                  isSpinning && styles.wheelShadow, // Apply shadow if spinning.
                ]}
              >
                {/* SVG Element Representing the Wheel */}
                <Svg width={300} height={300}>
                  {/* Render each section of the wheel if date options are available */}
                  {dateOptions.length > 0 ? (
                    renderWheelSections()
                  ) : (
                    <SvgText
                      x="150"
                      y="150"
                      fill="#000"
                      fontSize="16"
                      fontWeight="bold"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                    >
                      Please select a season
                    </SvgText>
                  )}
                </Svg>
              </Animated.View>
            </View>

            {/* ================================ SPIN BUTTON ================================ */}
            {/* Animated Spin Button */}
            <Animated.View
              style={{
                opacity: spinButtonOpacity,
                transform: [
                  { translateY: spinButtonTranslateY },
                ],
              }}
            >
              <TouchableOpacity
                style={[
                  styles.spinButton,
                  isSpinning && styles.disabledButton,
                  (!selectedSeason || dateOptions.length === 0) &&
                    styles.disabledButton,
                ]}
                onPress={startSpin}
                disabled={
                  isSpinning || !selectedSeason || dateOptions.length === 0
                }
              >
                <Text style={styles.spinButtonText}>SPIN THE WHEEL</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* ================================ PREVIOUS DATE BUTTON ================================ */}
            {/* Button to Retrieve Previous Date Idea */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={retrieveSavedDateIdea}
            >
              <Text style={styles.backButtonText}>Previous Date</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* ================================ RESULT SUBTITLE ================================ */}
            {/* Subtitle Indicating the Result of the Spin */}
            <Text style={styles.subtitle}>You’ve spun:</Text>

            {/* ================================ RESULT BOX ================================ */}
            {/* Animated Result Box Displaying the Selected Date Idea */}
            <Animated.View
              style={{
                opacity: resultOpacity,
                transform: [
                  { translateY: resultTranslateY },
                ],
              }}
            >
              <View style={styles.resultBox}>
                <Text style={styles.resultText}>{selectedDate}</Text>
                {/* Additional information based on the selectedDate can be added here */}
              </View>
            </Animated.View>

            {/* ================================ LOTTIE ANIMATION ================================ */}
            {/* Lottie Animation for Wheel Falling Effect */}
            <LottieView
              ref={lottieRef}
              source={wheelFallingAnimation} // Adjust the path based on your project structure
              autoPlay={false}
              loop={false}
              style={styles.lottie}
              speed={0.8}
            />

            {/* ================================ ENCOURAGEMENT TEXT ================================ */}
            {/* Animated "Enjoy your date!" Encouragement Text */}
            <Animated.View
              style={{
                opacity: enjoyTextOpacity,
                transform: [{ translateY: enjoyTextTranslateY }],
              }}
            >
              <Text style={styles.enjoyText}>Enjoy your date!</Text>
            </Animated.View>

            {/* ================================ BACK TO WHEEL BUTTON ================================ */}
            {/* Button to Return to the Wheel for Another Spin */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedDate(null)}
            >
              <Text style={styles.backButtonText}>Back to Wheel</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SignedInScreen>
  );
};

/* ================================ STYLES ================================ */
// Define the styles for the SpinTheWheel component and its subcomponents.
const styles = StyleSheet.create({
  /* ================================ MAIN CONTAINER ================================ */
  mainContainer: {
    flex: 1,
    position: "relative", // Ensure positioning context.
  },

  /* ================================ BACKGROUND COLOR VIEW ================================ */
  // Background Color View covering the entire screen.
  backgroundColorView: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#faf4e4",
  },

  /* ================================ BACKGROUND LOTTIE ANIMATIONS ================================ */
  // Styles for Falling Leaves Background Animation.
  fallingLeavesAnimation: {
    position: "absolute",
    width: Dimensions.get("window").width * 1.2,
    height: Dimensions.get("window").height * 1.5,
    top: -Dimensions.get("window").height * 0.2,
    left: -Dimensions.get("window").width * 0.25,
    transform: [{ scale: 1.65 }],
    opacity: 0.10, // Adjusted opacity for subtle effect.
    zIndex: 0, // Positioned behind other elements.
  },

  // Styles for Snow Falling Background Animation.
  snowFallingAnimation: {
    position: "absolute",
    width: Dimensions.get("window").width * 1.3,
    height: Dimensions.get("window").height * 1.6,
    top: -Dimensions.get("window").height * 0.25,
    left: -Dimensions.get("window").width * 0.3,
    transform: [{ scale: 1.5 }],
    opacity: 0.6, // Increased opacity for visibility.
    zIndex: 0,
  },

  // Styles for Flowers Falling Background Animation.
  flowersFallingAnimation: {
    position: "absolute",
    width: Dimensions.get("window").width * 1.2,
    height: Dimensions.get("window").height * 1.5,
    top: -Dimensions.get("window").height * 0.18,
    left: -Dimensions.get("window").width * 0.22,
    transform: [{ scale: 2.3 }],
    opacity: 0.20, // Adjusted opacity for balance.
    zIndex: 0,
  },

  // Styles for Summer Falling Background Animation.
  summerFallingAnimation: {
    position: "absolute",
    width: Dimensions.get("window").width * 1.25,
    height: Dimensions.get("window").height * 1.55,
    top: -Dimensions.get("window").height * 0.2,
    left: -Dimensions.get("window").width * 0.24,
    transform: [{ scale: 1.6 }],
    opacity: 0.25, // Adjusted opacity for subtle effect.
    zIndex: 0,
  },

  /* ================================ SCROLL CONTAINER ================================ */
  // Container for scrollable content ensuring alignment and padding.
  scrollContainer: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 10,
    zIndex: 1, // Ensure content is above background animations.
  },

  /* ================================ GREETING TEXT ================================ */
  // Styling for the greeting text displayed to the user.
  helloText: {
    fontSize: 36,
    fontWeight: "bold",
    marginTop: 30,
    color: "#000",
    textAlign: "center",
  },

  /* ================================ SUBTITLE TEXT ================================ */
  // Styling for the subtitle text providing additional context.
  subtitle: {
    marginTop: 10,
    fontSize: 20,
    color: "#a59f90",
    textAlign: "center",
    marginBottom: -5,
    fontWeight: "bold",
  },

  /* ================================ DROPDOWN CONTAINER ================================ */
  // Container styling for the season selection dropdown.
  dropdownContainer: {
    width: "80%",
    marginVertical: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
    overflow: "hidden",
    // Add shadow for iOS.
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Add elevation for Android.
    elevation: 3,
  },

  /* ================================ DROPDOWN HEADER ================================ */
  // Header of the dropdown displaying the selected season or prompt.
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
  },

  /* ================================ DROPDOWN HEADER TEXT ================================ */
  // Text styling for the dropdown header.
  dropdownHeaderText: {
    fontSize: 16,
    color: "#333",
  },

  /* ================================ DROPDOWN OPTIONS ================================ */
  // Container for the dropdown options when expanded.
  dropdownOptions: {
    backgroundColor: "#fff",
  },

  /* ================================ DROPDOWN OPTION ================================ */
  // Styling for each individual dropdown option.
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },

  /* ================================ DROPDOWN OPTION TEXT ================================ */
  // Text styling for the dropdown options.
  dropdownOptionText: {
    fontSize: 16,
    color: "#555",
  },

  /* ================================ WHEEL CONTAINER ================================ */
  // Container for the spinning wheel ensuring proper alignment and positioning.
  wheelContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 30,
  },

  /* ================================ WHEEL ================================ */
  // Styling for the wheel component.
  wheel: {
    width: 300,
    height: 300,
    borderRadius: 150,
    overflow: "hidden",
  },

  /* ================================ WHEEL POINTER ================================ */
  // Pointer indicating the selected section of the wheel.
  wheelPointer: {
    position: "absolute",
    bottom: 275,
    width: 0,
    height: 0,
    zIndex: 1,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderTopWidth: 30,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#FF0000",
  },

  /* ================================ WHEEL SHADOW ================================ */
  // Shadow styling for the wheel when it is spinning.
  wheelShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },

  /* ================================ SPIN BUTTON ================================ */
  // Styling for the spin button that initiates the wheel spin.
  spinButton: {
    backgroundColor: "#FAD02E",
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 20,
    elevation: 2,
  },

  /* ================================ DISABLED BUTTON ================================ */
  // Styling for the spin button when it is disabled.
  disabledButton: {
    opacity: 0.5,
  },

  /* ================================ SPIN BUTTON TEXT ================================ */
  // Text styling for the spin button.
  spinButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
  },

  /* ================================ RESULT BOX ================================ */
  // Styling for the result box displaying the selected date idea.
  resultBox: {
    backgroundColor: "#F47B5E",
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
    elevation: 5,
  },

  /* ================================ RESULT TEXT ================================ */
  // Text styling for the selected date idea within the result box.
  resultText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    textAlign: "center",
  },

  /* ================================ ENJOY TEXT ================================ */
  // Styling for the encouragement text displayed after selecting a date.
  enjoyText: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#F47B5E",
    marginTop: 40,
    textAlign: "center",
  },

  /* ================================ BACK BUTTON ================================ */
  // Styling for the back button allowing users to return to the wheel.
  backButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#a59f90",
    borderRadius: 25,
  },

  /* ================================ BACK BUTTON TEXT ================================ */
  // Text styling for the back button.
  backButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#faf4e4",
  },

  /* ================================ LOTTIE ANIMATION ================================ */
  // Styling for the Lottie animation (wheel falling effect).
  lottie: {
    position: "absolute",
    width: Dimensions.get("window").width * 1.2,
    height: Dimensions.get("window").height * 1.5,
    top: -Dimensions.get("window").height * 0.15,
    left: -Dimensions.get("window").width * 0.25,
    transform: [{ scale: 1.15 }],
    opacity: 0.6,
  },
});

/* ================================ EXPORT ================================ */
// Export the SpinTheWheel component as the default export.
export default SpinTheWheel;