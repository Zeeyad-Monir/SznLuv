// Import necessary modules and components from React and React Native
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
  Alert,
  Dimensions,
  ScrollView, // ScrollView is still imported
} from "react-native";

// Import your external NavBar component
import NavBar from "../components/NavBar"; // Adjust the path based on your project structure

// ASYNC STORAGE
import AsyncStorage from "@react-native-async-storage/async-storage";

// SVG
import Svg, { Path, G, Text as SvgText, TSpan } from "react-native-svg";

// CONFETTI
import ConfettiCannon from "react-native-confetti-cannon";

// Get the width of the device screen for positioning elements
const { width: screenWidth } = Dimensions.get("window");

// DATA
const dateOptions = [
  "Aldor Acres Family Farm",
  "Eagle Acres Dairy & Pumpkin Patch",
  "Laity Pumpkin Patch",
  "Quarry Rock",
  "Lighthouse Park",
  "Lynn Canyon Park",
  "Dog Mountain Trail",
  "Queen Elizabeth Park",
  "Stanley Park",
];

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

  // REFS
  const rotation = useRef(new Animated.Value(0)).current;

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
        (Math.floor(normalizedRotation / degreesPerSegment) % dateOptions.length);
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
      const textX = radius + textRadius * Math.cos((Math.PI * textAngle) / 180);
      const textY = radius + textRadius * Math.sin((Math.PI * textAngle) / 180);

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
              <TSpan
                x={textX}
                dy={idx === 0 ? 0 : 14}
                key={`line-${idx}`}
              >
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
        <Text style={styles.helloText}>Hello, User!</Text>

        {/* CONDITIONAL RENDERING */}
        {!selectedDate ? (
          <>
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
                  { transform: [{ rotate: wheelRotation }] },
                  isSpinning && styles.wheelShadow,
                ]}
              >
                {/* SVG element representing the wheel */}
                <Svg width={300} height={300}>
                  {/* Render each section of the wheel */}
                  {renderWheelSections()}
                </Svg>
              </Animated.View>
            </View>

            {/* BUTTONS */}
            <TouchableOpacity
              style={[styles.spinButton, isSpinning && styles.disabledButton]}
              onPress={startSpin}
              disabled={isSpinning}
            >
              <Text style={styles.spinButtonText}>SPIN THE WHEEL</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={retrieveSavedDateIdea}
            >
              <Text style={styles.backButtonText}>Retrieve Saved Date</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* SUBTITLE */}
            <Text style={styles.subtitle}>You’ve spun:</Text>
            {/* RESULT */}
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>{selectedDate}</Text>
              <Text style={styles.resultSubtitle}>
                {/* This should ideally be dynamically set based on the selectedDate */}
                123 Date Avenue, Vancouver, BC
              </Text>
            </View>
            {/* CONFETTI */}
            <ConfettiCannon
              count={100}
              origin={{ x: screenWidth / 2, y: 0 }}
              autoStart={true}
              fadeOut={true}
              fallSpeed={2000}
              explosionSpeed={0}
              angle={90}
            />
            {/* ENCOURAGEMENT */}
            <Text style={styles.enjoyText}>Enjoy your date!</Text>
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
    paddingVertical: 20, // Apply padding only to scrollable content
    paddingHorizontal: 10, // Optional: Add horizontal padding if needed
  },
  // Removed navbar-related styles:
  // topNav, sznluv, iconsContainer, icon

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
  resultSubtitle: {
    fontSize: 16,
    color: "#FFF",
    marginTop: 10,
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
});

export default SpinTheWheel;