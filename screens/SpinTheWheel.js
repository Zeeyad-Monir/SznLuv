// Import necessary modules and components from React and React Native
// Used chatgpt.com to add comments, so me and my teammate understand what we each did and remember for the future

import React, { useState, useRef, useEffect } from "react";
import {
  View, // Container component for layout
  Text, // Component for displaying text
  StyleSheet, // For creating styles
  TouchableOpacity, // Button component with touch handling
  Animated, // For creating animated values and animations
  Easing, // Provides easing functions for animations
  Image, // For displaying images
  Alert, // For showing alert dialogs
  Dimensions, // To get device screen dimensions
} from "react-native";

// ASYNC STORAGE
// Import AsyncStorage for persistent storage
import AsyncStorage from "@react-native-async-storage/async-storage";

// SVG
// Import SVG components for drawing the wheel
import Svg, { Path, G, Text as SvgText, TSpan } from "react-native-svg";

// CONFETTI
// Import ConfettiCannon for confetti animations upon selection
import ConfettiCannon from "react-native-confetti-cannon";

// Get the width of the device screen for positioning elements
const { width: screenWidth } = Dimensions.get("window");

// DATA
// Array of date ideas to be displayed on the wheel
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
// Array of colors for each section of the wheel, cycling through as needed
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
// Main functional component for the spinning wheel feature
const SpinTheWheel = () => {
  // STATE
  // State to track if the wheel is currently spinning
  const [isSpinning, setIsSpinning] = useState(false);

  // State to store the currently selected date idea
  const [selectedDate, setSelectedDate] = useState(null);

  // REFS
  // Reference to the animated value controlling the rotation of the wheel
  const rotation = useRef(new Animated.Value(0)).current;

  // EFFECTS
  // useEffect hook to load any previously saved date idea when the component mounts
  useEffect(() => {
    // Async function to load the date idea from AsyncStorage
    const loadDateIdea = async () => {
      try {
        // Attempt to retrieve the saved date idea using the key "currentDateIdea"
        const storedDate = await AsyncStorage.getItem("currentDateIdea");

        // If a date idea was found in storage, update the state and log it
        if (storedDate) {
          console.log("Date idea retrieved from AsyncStorage:", storedDate);
          setSelectedDate(storedDate);
        }
      } catch (error) {
        // Log any errors encountered during retrieval
        console.error("Error loading date idea from AsyncStorage:", error);
      }
    };

    // Invoke the function to load the date idea
    loadDateIdea();
  }, []); // Empty dependency array ensures this runs only once on mount

  // FUNCTIONS

  /**
   * ASYNC STORAGE
   * Function to save a selected date idea to AsyncStorage
   * @param {string} idea - The date idea to be saved
   */
  const saveDateIdea = async (idea) => {
    try {
      // Store the date idea using the key "currentDateIdea"
      await AsyncStorage.setItem("currentDateIdea", idea);
      console.log("Date idea saved in AsyncStorage:", idea);
    } catch (error) {
      // Log any errors encountered during saving
      console.error("Error saving date idea to AsyncStorage:", error);
    }
  };

  /**
   * ASYNC STORAGE
   * Function to retrieve the saved date idea from AsyncStorage and display it in an alert
   */
  const retrieveSavedDateIdea = async () => {
    try {
      // Attempt to get the saved date idea
      const storedDate = await AsyncStorage.getItem("currentDateIdea");

      if (storedDate) {
        // If a date idea is found, display it in an alert dialog
        Alert.alert("Saved Date Idea", `Your saved date idea is: ${storedDate}`);
      } else {
        // If no date idea is found, inform the user
        Alert.alert("No Date Idea", "No saved date idea was found.");
      }
    } catch (error) {
      // Log any errors and inform the user via an alert
      console.error("Error retrieving date idea from AsyncStorage:", error);
      Alert.alert("Error", "Could not retrieve the saved date idea.");
    }
  };

  /**
   * WHEEL
   * Function to initiate the spinning animation of the wheel
   */
  const startSpin = () => {
    // Update state to indicate the wheel is spinning and clear any previous selection
    setIsSpinning(true);
    setSelectedDate(null);

    // Determine a random spin duration between 4 to 6 seconds
    const spinDuration = 4000 + Math.random() * 2000;

    // Determine a random number of full rotations (between 5 to 7)
    const rotations = 5 + Math.random() * 2;

    // Calculate the total rotation in degrees
    const randomRotation = rotations * 360;

    /**
     * WHEEL ANIMATION
     * Configure the animation for the wheel's rotation
     * - `toValue`: The total degrees to rotate
     * - `duration`: How long the spin should take
     * - `easing`: The easing function to make the spin decelerate smoothly
     * - `useNativeDriver`: Improves performance by offloading animation to native thread
     */
    Animated.timing(rotation, {
      toValue: randomRotation, // Target rotation value
      duration: spinDuration, // Duration of the spin
      easing: Easing.out(Easing.ease), // Easing function for smooth deceleration
      useNativeDriver: true, // Utilize native driver for better performance
    }).start(() => {
      // Callback executed once the animation completes

      // Normalize the rotation to a value between 0 and 360 degrees
      const normalizedRotation = randomRotation % 360;

      // Calculate the degrees occupied by each section on the wheel
      const degreesPerSegment = 360 / dateOptions.length;

      /**
       * Determine which segment the wheel landed on by:
       * - Dividing the normalized rotation by degrees per segment
       * - Flooring the result to get the segment index
       * - Adjusting the index to match the array order
       */
      const index =
        dateOptions.length -
        1 -
        Math.floor(normalizedRotation / degreesPerSegment) %
          dateOptions.length;

      // Retrieve the selected date idea based on the calculated index
      const newDate = dateOptions[index];

      // Update the state with the selected date idea
      setSelectedDate(newDate);

      // Save the selected date idea to AsyncStorage for persistence
      saveDateIdea(newDate);

      // Update state to indicate spinning has stopped
      setIsSpinning(false);

      // Reset the rotation animated value for future spins
      rotation.setValue(0);
    });
  };

  /**
   * WHEEL
   * Interpolate the animated rotation value to map degrees to a rotation string
   * This is necessary because the Animated API expects transformation values as strings with units
   */
  const wheelRotation = rotation.interpolate({
    inputRange: [0, 360], // Input range for the interpolation
    outputRange: ["0deg", "360deg"], // Output range in degrees as strings
  });

  /**
   * WHEEL
   * Function to render each section of the wheel using SVG paths and text
   * @returns {JSX.Element[]} Array of SVG elements representing each wheel section
   */
  const renderWheelSections = () => {
    const numSections = dateOptions.length; // Total number of sections on the wheel
    const angle = 360 / numSections; // Angle covered by each section
    const radius = 150; // Radius of the wheel (increased for a larger wheel)

    // Map over each date option to create corresponding wheel sections
    return dateOptions.map((option, index) => {
      const startAngle = index * angle; // Starting angle for the current section
      const endAngle = startAngle + angle; // Ending angle for the current section
      const largeArcFlag = angle > 180 ? 1 : 0; // Flag for SVG arc drawing

      // Calculate the (x, y) coordinates for the start of the arc
      const x1 = radius + radius * Math.cos((Math.PI * startAngle) / 180);
      const y1 = radius + radius * Math.sin((Math.PI * startAngle) / 180);

      // Calculate the (x, y) coordinates for the end of the arc
      const x2 = radius + radius * Math.cos((Math.PI * endAngle) / 180);
      const y2 = radius + radius * Math.sin((Math.PI * endAngle) / 180);

      // Calculate the position for the text label within the section
      const textAngle = startAngle + angle / 2; // Middle angle of the section
      const textRadius = radius * 0.7; // Radius at which to place the text
      const textX = radius + textRadius * Math.cos((Math.PI * textAngle) / 180);
      const textY = radius + textRadius * Math.sin((Math.PI * textAngle) / 180);

      // Split long text into multiple lines for better readability
      const words = option.split(" "); // Split the option text into individual words
      const lines = []; // Array to hold lines of text
      let line = ""; // Temporary variable to build each line

      // Iterate over each word to build lines that are no longer than 12 characters
      words.forEach((word) => {
        const testLine = line + word + " "; // Tentative line with the next word
        if (testLine.length > 12) {
          lines.push(line.trim()); // Add the current line to lines array
          line = word + " "; // Start a new line with the current word
        } else {
          line = testLine; // Continue building the current line
        }
      });
      lines.push(line.trim()); // Add the last line to lines array

      // Return the SVG group containing the path and text for the current section
      return (
        <G key={`section-${index}`}>
          {/* SVG Path representing the wedge of the wheel section */}
          <Path
            d={`M${radius},${radius} L${x1},${y1} A${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z`}
            fill={sectionColors[index % sectionColors.length]} // Fill color from the sectionColors array
            stroke="#fff" // White stroke for separation between sections
            strokeWidth="2" // Width of the stroke
          />
          {/* SVG Text for the date idea label within the section */}
          <SvgText
            x={textX} // X-coordinate for the text position
            y={textY - (lines.length - 1) * 6} // Y-coordinate adjusted for multiple lines
            fill="#000" // Black text color
            fontSize="12" // Font size for readability
            fontWeight="bold" // Bold font weight for emphasis
            textAnchor="middle" // Center the text horizontally
            alignmentBaseline="middle" // Center the text vertically
            transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`} // Rotate text for better alignment within the section
          >
            {/* Render each line of text using TSpan for multi-line support */}
            {lines.map((lineText, idx) => (
              <TSpan
                x={textX} // X-coordinate remains the same for all lines
                dy={idx === 0 ? 0 : 14} // Y-offset for each subsequent line
                key={`line-${idx}`} // Unique key for each line
              >
                {lineText} {/* The actual text content for the line */}
              </TSpan>
            ))}
          </SvgText>
        </G>
      );
    });
  };

  // RENDERING
  // Render the main UI of the component
  return (
    <View style={styles.container}>
      {/* TOP NAVIGATION */}
      {/* Top navigation bar */}
      <View style={styles.topNav}>
        {/* Application title */}
        <Text style={styles.sznluv}>SznLuv</Text>
        {/* Container for navigation icons */}
        <View style={styles.iconsContainer}>
          {/* Placeholder icons - replace 'uri' with actual image paths */}
          <Image style={styles.icon} source={{ uri: "path/to/icon1.png" }} />
          <Image style={styles.icon} source={{ uri: "path/to/icon2.png" }} />
          <Image style={styles.icon} source={{ uri: "path/to/icon3.png" }} />
        </View>
      </View>

      {/* GREETING */}
      {/* Greeting text for the user */}
      <Text style={styles.helloText}>Hello, User!</Text>

      {/* CONDITIONAL RENDERING */}
      {/* Conditional rendering based on whether a date has been selected */}
      {!selectedDate ? (
        // If no date is selected, show the spinning wheel interface
        <>
          {/* SUBTITLE */}
          {/* Subtitle prompting the user to spin the wheel */}
          <Text style={styles.subtitle}>
            Let’s spin to find the perfect date!
          </Text>
          {/* WHEEL */}
          {/* Container for the wheel and its pointer */}
          <View style={styles.wheelContainer}>
            {/* Pointer indicating the selected section */}
            <View style={styles.wheelPointer} />
            {/* Animated wheel that rotates based on the `wheelRotation` value */}
            <Animated.View
              style={[
                styles.wheel, // Base wheel styles
                { transform: [{ rotate: wheelRotation }] }, // Apply rotation transformation
                isSpinning && styles.wheelShadow, // Apply shadow effect when spinning
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
          {/* Button to initiate the spin */}
          <TouchableOpacity
            style={[styles.spinButton, isSpinning && styles.disabledButton]} // Disable styling when spinning
            onPress={startSpin} // Handle press to start spinning
            disabled={isSpinning} // Disable the button while spinning
          >
            {/* Button text */}
            <Text style={styles.spinButtonText}>SPIN THE WHEEL</Text>
          </TouchableOpacity>

          {/* Button to retrieve the saved date idea */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={retrieveSavedDateIdea} // Handle press to retrieve saved date
          >
            {/* Button text */}
            <Text style={styles.backButtonText}>Retrieve Saved Date</Text>
          </TouchableOpacity>
        </>
      ) : (
        // If a date has been selected, show the result and confetti animation
        <>
          {/* SUBTITLE */}
          {/* Subtitle indicating a selection has been made */}
          <Text style={styles.subtitle}>You’ve spun:</Text>
          {/* RESULT */}
          {/* Box displaying the selected date idea */}
          <View style={styles.resultBox}>
            {/* Display the selected date idea */}
            <Text style={styles.resultText}>{selectedDate}</Text>
            {/* Placeholder for the address of the selected date idea */}
            <Text style={styles.resultSubtitle}>
              {/* This should ideally be dynamically set based on the selectedDate */}
              123 Date Avenue, Vancouver, BC
            </Text>
          </View>
          {/* CONFETTI */}
          {/* Confetti animation to celebrate the selection */}
          <ConfettiCannon
            count={100} // Number of confetti pieces
            origin={{ x: screenWidth / 2, y: 0 }} // Starting position of confetti
            autoStart={true} // Automatically start the animation
            fadeOut={true} // Fade out confetti as it falls
            fallSpeed={2000} // Speed at which confetti falls
            explosionSpeed={0} // No initial explosion; confetti drops from top
            angle={90} // Direction of the confetti drop (straight down)
          />
          {/* ENCOURAGEMENT */}
          {/* Encouraging text for the user */}
          <Text style={styles.enjoyText}>Enjoy your date!</Text>
          {/* BUTTON */}
          {/* Button to go back to the spinning wheel interface */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedDate(null)} // Reset the selected date to go back
          >
            {/* Button text */}
            <Text style={styles.backButtonText}>Back to Wheel</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

// STYLES
// Stylesheet for the component using React Native's StyleSheet API
const styles = StyleSheet.create({
  container: {
    flex: 1, // Occupy the full available space
    backgroundColor: "#faf4e4", // Light background color
    alignItems: "center", // Center items horizontally
  },
  topNav: {
    flexDirection: "row", // Arrange children in a row
    justifyContent: "space-between", // Space out children evenly
    alignItems: "center", // Center children vertically
    width: "100%", // Full width of the screen
    height: 70, // Fixed height for the navigation bar
    backgroundColor: "#323232", // Dark background color
    paddingHorizontal: 15, // Horizontal padding
  },
  sznluv: {
    fontFamily: "Gramatika-Black", // Custom font family
    fontSize: 24, // Font size
    color: "#faf4e4", // Text color matching the container background
  },
  iconsContainer: {
    flexDirection: "row", // Arrange icons in a row
  },
  icon: {
    width: 20, // Icon width
    height: 20, // Icon height
    marginLeft: 12, // Space between icons
  },
  helloText: {
    fontSize: 36, // Large font size for greeting
    fontWeight: "bold", // Bold text
    marginTop: 30, // Top margin to space from the navigation bar
    color: "#000", // Black text color
    textAlign: "center", // Center the text
  },
  subtitle: {
    marginTop: 10, // Top margin for spacing
    fontSize: 20, // Subtitle font size
    color: "#a59f90", // Subtitle text color
    textAlign: "center", // Center the text
    marginBottom: -5, // Slight negative margin to adjust spacing
    fontWeight: "bold", // Bold text for emphasis
  },
  wheelContainer: {
    position: "relative", // Position relative to contain absolutely positioned children
    alignItems: "center", // Center children horizontally
    justifyContent: "center", // Center children vertically
    marginVertical: 30, // Vertical margins for spacing
  },
  wheel: {
    width: 300, // Wheel width
    height: 300, // Wheel height
    borderRadius: 150, // Half of width/height for a perfect circle
    overflow: "hidden", // Hide any overflow content
  },
  wheelPointer: {
    position: "absolute", // Position absolutely within the wheel container
    top: -15, // Position the pointer slightly above the wheel
    width: 0, // No width as it's a triangle
    height: 0, // No height as it's a triangle
    zIndex: 1, // Ensure the pointer is above the wheel
    backgroundColor: "transparent", // Transparent background
    borderStyle: "solid", // Solid borders to create the triangle
    borderLeftWidth: 15, // Left border width
    borderRightWidth: 15, // Right border width
    borderBottomWidth: 30, // Bottom border width to form the triangle
    borderLeftColor: "transparent", // Transparent left border
    borderRightColor: "transparent", // Transparent right border
    borderBottomColor: "#FF0000", // Red color for the triangle pointer
  },
  wheelShadow: {
    shadowColor: "#000", // Shadow color
    shadowOffset: { width: 0, height: 10 }, // Shadow offset
    shadowOpacity: 0.5, // Shadow opacity
    shadowRadius: 10, // Shadow blur radius
  },
  spinButton: {
    backgroundColor: "#FAD02E", // Button background color
    borderRadius: 25, // Rounded corners
    paddingHorizontal: 20, // Horizontal padding inside the button
    paddingVertical: 10, // Vertical padding inside the button
    marginTop: 20, // Top margin for spacing
    elevation: 2, // Elevation for shadow on Android
  },
  disabledButton: {
    opacity: 0.5, // Reduced opacity to indicate disabled state
  },
  spinButtonText: {
    fontSize: 18, // Font size for button text
    fontWeight: "bold", // Bold text for emphasis
    color: "#FFF", // White text color
  },
  resultBox: {
    backgroundColor: "#F47B5E", // Background color for the result box
    padding: 20, // Padding inside the box
    borderRadius: 10, // Rounded corners
    marginTop: 20, // Top margin for spacing
    alignItems: "center", // Center children horizontally
    elevation: 5, // Elevation for shadow on Android
  },
  resultText: {
    fontSize: 24, // Font size for the result text
    fontWeight: "bold", // Bold text for emphasis
    color: "#FFF", // White text color
    textAlign: "center", // Center the text
  },
  resultSubtitle: {
    fontSize: 16, // Font size for the subtitle
    color: "#FFF", // White text color
    marginTop: 10, // Top margin for spacing
  },
  enjoyText: {
    fontSize: 30, // Large font size for the encouragement text
    fontWeight: "bold", // Bold text for emphasis
    color: "#F47B5E", // Text color matching the result box
    marginTop: 40, // Top margin for spacing
    textAlign: "center", // Center the text
  },
  backButton: {
    marginTop: 20, // Top margin for spacing
    paddingHorizontal: 20, // Horizontal padding inside the button
    paddingVertical: 10, // Vertical padding inside the button
    backgroundColor: "#a59f90", // Button background color
    borderRadius: 25, // Rounded corners
  },
  backButtonText: {
    fontSize: 16, // Font size for button text
    fontWeight: "bold", // Bold text for emphasis
    color: "#faf4e4", // Text color matching the container background
  },
});

// Export the SpinTheWheel component as the default export
export default SpinTheWheel;
