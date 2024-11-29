// Import necessary modules and components from React and React Native
import React, { useState, useRef, useEffect } from "react";
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
  Platform, // Import Platform for platform-specific code
} from "react-native";

// Import your external NavBar component
import NavBar from "../components/NavBar"; // Adjust the path based on your project structure

// ASYNC STORAGE
import AsyncStorage from "@react-native-async-storage/async-storage";

// SVG
import Svg, { Path, G, Text as SvgText, TSpan } from "react-native-svg";

// IMPORT LOTTIE
import LottieView from "lottie-react-native"; // Import LottieView

// Import Icon library (optional for arrow indicators)
import { Ionicons } from "@expo/vector-icons"; // If you're using Expo
// If not using Expo, you can use react-native-vector-icons or any other icon library

// Get the width of the device screen for positioning elements
const { width: screenWidth } = Dimensions.get("window");

// DATA: Season-specific date ideas
const seasonDateOptions = {
  Fall: [
    "Aldor Acres Family Farm",
    "Eagle Acres Dairy",
    "Laity Pumpkin Patch",
    "Sunset Summit",
    "Leaf Trail",
  ],
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

// COLORS
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

// WHEEL COMPONENT
const SpinTheWheel = () => {
  // STATE
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(""); // New state for selected season
  const [dateOptions, setDateOptions] = useState([]); // Date options based on selected season
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // State for dropdown visibility

  // REFS
  const rotation = useRef(new Animated.Value(0)).current;

  // Animated values for greeting text
  const greetingOpacity = useRef(new Animated.Value(0)).current;
  const greetingTranslateY = useRef(new Animated.Value(-20)).current;

  // Animated values for wheel
  const wheelOpacity = useRef(new Animated.Value(0)).current;
  const wheelTranslateY = useRef(new Animated.Value(30)).current;
  const wheelScale = useRef(new Animated.Value(0.9)).current;

  // Animated values for spin button
  const spinButtonOpacity = useRef(new Animated.Value(0)).current;
  const spinButtonTranslateY = useRef(new Animated.Value(30)).current;
  const spinButtonScale = useRef(new Animated.Value(0.9)).current;

  // Animated values for result box
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const resultTranslateY = useRef(new Animated.Value(30)).current;
  const resultScale = useRef(new Animated.Value(0.9)).current;

  // Animated values for "Enjoy your date!" text
  const enjoyTextOpacity = useRef(new Animated.Value(0)).current;
  const enjoyTextTranslateY = useRef(new Animated.Value(20)).current;

  // Animated value for Lottie animation (optional: to control playback)
  const lottieRef = useRef(null);

  // EFFECTS
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

  // Update date options when the selected season changes
  useEffect(() => {
    if (selectedSeason && seasonDateOptions[selectedSeason]) {
      setDateOptions(seasonDateOptions[selectedSeason]);
    } else {
      setDateOptions([]);
    }
  }, [selectedSeason]);

  // Trigger animations when the component loads or selectedDate changes
  useEffect(() => {
    if (!selectedDate) {
      // Reset animated values
      greetingOpacity.setValue(0);
      greetingTranslateY.setValue(-20);

      wheelOpacity.setValue(0);
      wheelTranslateY.setValue(30);
      wheelScale.setValue(0.9);

      spinButtonOpacity.setValue(0);
      spinButtonTranslateY.setValue(30);
      spinButtonScale.setValue(0.9);

      // Animate the greeting text
      Animated.parallel([
        Animated.timing(greetingOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(greetingTranslateY, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      // Animate the wheel
      Animated.parallel([
        Animated.timing(wheelOpacity, {
          toValue: 1,
          duration: 600,
          delay: 500,
          useNativeDriver: true,
        }),
        Animated.timing(wheelTranslateY, {
          toValue: 0,
          duration: 2000,
          delay: 1000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(wheelScale, {
          toValue: 1,
          friction: 5,
          tension: 40,
          delay: 500,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate the spin button
      Animated.parallel([
        Animated.timing(spinButtonOpacity, {
          toValue: 1,
          duration: 600,
          delay: 800,
          useNativeDriver: true,
        }),
        Animated.timing(spinButtonTranslateY, {
          toValue: 0,
          duration: 600,
          delay: 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(spinButtonScale, {
          toValue: 1,
          friction: 5,
          tension: 40,
          delay: 800,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset result box animated values
      resultOpacity.setValue(0);
      resultTranslateY.setValue(30);
      resultScale.setValue(0.9);

      enjoyTextOpacity.setValue(0);
      enjoyTextTranslateY.setValue(20);

      // When a date is selected, animate the result box
      Animated.parallel([
        Animated.timing(resultOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(resultTranslateY, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(resultScale, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate the "Enjoy your date!" text
      Animated.parallel([
        Animated.timing(enjoyTextOpacity, {
          toValue: 1,
          duration: 800,
          delay: 500,
          useNativeDriver: true,
        }),
        Animated.timing(enjoyTextTranslateY, {
          toValue: 0,
          duration: 800,
          delay: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      // Play the Lottie animation when a date is selected
      if (lottieRef.current) {
        lottieRef.current.play();
      }
    }
  }, [selectedDate]);

  // NEW EFFECT: Animate wheel when a season is selected
  useEffect(() => {
    if (selectedSeason) {
      // Reset wheel animated values
      wheelOpacity.setValue(0);
      wheelTranslateY.setValue(30);
      wheelScale.setValue(0.9);

      // Animate the wheel appearance
      Animated.parallel([
        Animated.timing(wheelOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(wheelTranslateY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(wheelScale, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // If no season is selected, optionally hide the wheel
      Animated.parallel([
        Animated.timing(wheelOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(wheelTranslateY, {
          toValue: 30,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(wheelScale, {
          toValue: 0.9,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selectedSeason]);

  // FUNCTIONS

  const saveDateIdea = async (idea) => {
    try {
      await AsyncStorage.setItem("currentDateIdea", idea);
      console.log("Date idea saved in AsyncStorage:", idea);
    } catch (error) {
      console.error("Error saving date idea to AsyncStorage:", error);
    }
  };

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

  const startSpin = () => {
    // Handle case where no season is selected
    if (!selectedSeason) {
      Alert.alert(
        "No Season Selected",
        "Please select a season before spinning the wheel."
      );
      return;
    }

    // Handle case where no date options are available
    if (dateOptions.length === 0) {
      Alert.alert(
        "No Date Ideas",
        "No date ideas are available for the selected season."
      );
      return;
    }

    setIsSpinning(true);
    setSelectedDate(null);

    const spinDuration = 4000 + Math.random() * 2000;
    const rotations = 5 + Math.random() * 2;
    const randomRotation = rotations * 360;

    Animated.timing(rotation, {
      toValue: randomRotation,
      duration: spinDuration,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
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
      rotation.setValue(0);
    });
  };

  const wheelRotation = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  const renderWheelSections = () => {
    const numSections = dateOptions.length;
    const angle = 360 / numSections;
    const radius = 150;

    return dateOptions.map((option, index) => {
      const startAngle = index * angle;
      const endAngle = startAngle + angle;
      const largeArcFlag = angle > 180 ? 1 : 0;

      const x1 = radius + radius * Math.cos((Math.PI * startAngle) / 180);
      const y1 = radius + radius * Math.sin((Math.PI * startAngle) / 180);

      const x2 = radius + radius * Math.cos((Math.PI * endAngle) / 180);
      const y2 = radius + radius * Math.sin((Math.PI * endAngle) / 180);

      const textAngle = startAngle + angle / 2;
      const textRadius = radius * 0.7;
      const textX =
        radius + textRadius * Math.cos((Math.PI * textAngle) / 180);
      const textY =
        radius + textRadius * Math.sin((Math.PI * textAngle) / 180);

      const words = option.split(" ");
      const lines = [];
      let line = "";

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
          <Path
            d={`M${radius},${radius} L${x1},${y1} A${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z`}
            fill={sectionColors[index % sectionColors.length]}
            stroke="#fff"
            strokeWidth="2"
          />
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
        </G>
      );
    });
  };

  // RENDERING
  return (
    <View style={styles.mainContainer}>
      {/* Integrate the external NavBar component */}
      <NavBar />

      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* GREETING */}
        <Animated.View
          style={[
            {
              opacity: greetingOpacity,
              transform: [{ translateY: greetingTranslateY }],
            },
          ]}
        >
          <Text style={styles.helloText}>Hello, User!</Text>
        </Animated.View>

        {/* CONDITIONAL RENDERING */}
        {!selectedDate ? (
          <>
            {/* SEASON SELECTION DROPDOWN */}
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

            {/* SUBTITLE */}
            <Text style={styles.subtitle}>
              Let’s spin to find the perfect date!
            </Text>
            {/* WHEEL */}
            <View style={styles.wheelContainer}>
              {/* Pointer indicating the selected section */}
              <View style={styles.wheelPointer} />
              {/* Animated wheel that rotates based on the `wheelRotation` value */}
              <Animated.View
                style={[
                  styles.wheel,
                  {
                    opacity: wheelOpacity,
                    transform: [
                      { rotate: wheelRotation },
                      { translateY: wheelTranslateY },
                      { scale: wheelScale },
                    ],
                  },
                  isSpinning && styles.wheelShadow,
                ]}
              >
                {/* SVG element representing the wheel */}
                <Svg width={300} height={300}>
                  {/* Render each section of the wheel */}
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

            {/* BUTTONS */}
            <Animated.View
              style={{
                opacity: spinButtonOpacity,
                transform: [
                  { translateY: spinButtonTranslateY },
                  { scale: spinButtonScale },
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

            <TouchableOpacity
              style={styles.backButton}
              onPress={retrieveSavedDateIdea}
            >
              <Text style={styles.backButtonText}>Previous Date</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* SUBTITLE */}
            <Text style={styles.subtitle}>You’ve spun:</Text>
            {/* RESULT */}
            <Animated.View
              style={{
                opacity: resultOpacity,
                transform: [
                  { translateY: resultTranslateY },
                  { scale: resultScale },
                ],
              }}
            >
              <View style={styles.resultBox}>
                <Text style={styles.resultText}>{selectedDate}</Text>
                {/* You can dynamically set additional info based on the selectedDate */}
              </View>
            </Animated.View>
            {/* REPLACE CONFETTI WITH LOTTIE ANIMATION */}
            <LottieView
              ref={lottieRef}
              source={require("../assets/wheelFalling.json")} // Adjust the path based on your project structure
              autoPlay={false}
              loop={false}
              style={styles.lottie}
              speed={0.8}
            />
            {/* ENCOURAGEMENT */}
            <Animated.View
              style={{
                opacity: enjoyTextOpacity,
                transform: [{ translateY: enjoyTextTranslateY }],
              }}
            >
              <Text style={styles.enjoyText}>Enjoy your date!</Text>
            </Animated.View>
            {/* BUTTON */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedDate(null)}
            >
              <Text style={styles.backButtonText}>Back to Wheel</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

// STYLES
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#faf4e4",
  },
  scrollContainer: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  helloText: {
    fontSize: 36,
    fontWeight: "bold",
    marginTop: 30,
    color: "#000",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 10,
    fontSize: 20,
    color: "#a59f90",
    textAlign: "center",
    marginBottom: -5,
    fontWeight: "bold",
  },
  dropdownContainer: {
    width: "80%",
    marginVertical: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
    overflow: "hidden",
    // Add shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Add elevation for Android
    elevation: 3,
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
  },
  dropdownHeaderText: {
    fontSize: 16,
    color: "#333",
  },
  dropdownOptions: {
    backgroundColor: "#fff",
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  dropdownOptionText: {
    fontSize: 16,
    color: "#555",
  },
  wheelContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 30,
  },
  wheel: {
    width: 300,
    height: 300,
    borderRadius: 150,
    overflow: "hidden",
  },
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
  wheelShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  spinButton: {
    backgroundColor: "#FAD02E",
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 20,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.5,
  },
  spinButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
  },
  resultBox: {
    backgroundColor: "#F47B5E",
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
    elevation: 5,
  },
  resultText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    textAlign: "center",
  },
  enjoyText: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#F47B5E",
    marginTop: 40,
    textAlign: "center",
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#a59f90",
    borderRadius: 25,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#faf4e4",
  },
  // ADD NEW STYLE FOR LOTTIE ANIMATION
  lottie: {
    position: 'absolute',
    width: Dimensions.get('window').width * 1.2,
    height: Dimensions.get('window').height * 1.5,
    top: -Dimensions.get('window').height * 0.15,
    left: -Dimensions.get('window').width * 0.25,
    transform: [{ scale: 1.15 }],
    opacity: 0.6,
  },
});

export default SpinTheWheel;