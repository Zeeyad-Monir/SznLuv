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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Path, G, Text as SvgText } from "react-native-svg";

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

const SpinTheWheel = () => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const rotation = useRef(new Animated.Value(0)).current;

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
        Math.floor(normalizedRotation / degreesPerSegment) %
          dateOptions.length;
      const newDate = dateOptions[index];

      setSelectedDate(newDate);
      saveDateIdea(newDate);
      setIsSpinning(false);
      rotation.setValue(0); // Reset rotation for the next spin
    });
  };

  const wheelRotation = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  const renderWheelSections = () => {
    const numSections = dateOptions.length;
    const angle = 360 / numSections;
    const radius = 150; // Increased radius for a bigger wheel

    return dateOptions.map((option, index) => {
      const startAngle = index * angle;
      const endAngle = startAngle + angle;
      const largeArcFlag = angle > 180 ? 1 : 0;

      const x1 = radius + radius * Math.cos((Math.PI * startAngle) / 180);
      const y1 = radius + radius * Math.sin((Math.PI * startAngle) / 180);
      const x2 = radius + radius * Math.cos((Math.PI * endAngle) / 180);
      const y2 = radius + radius * Math.sin((Math.PI * endAngle) / 180);

      // Calculate text position
      const textAngle = startAngle + angle / 2;
      const textX =
        radius +
        (radius * 0.6) * Math.cos((Math.PI * textAngle) / 180); // Adjusted for better positioning
      const textY =
        radius +
        (radius * 0.6) * Math.sin((Math.PI * textAngle) / 180); // Adjusted for better positioning

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
            y={textY}
            fill="#000"
            fontSize="10" // Reduced font size
            fontWeight="bold"
            textAnchor="middle"
            alignmentBaseline="middle"
            transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`} // Rotated text for better readability
            width={radius * 0.6}
          >
            {option}
          </SvgText>
        </G>
      );
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.topNav}>
        <Text style={styles.sznluv}>SznLuv</Text>
        <View style={styles.iconsContainer}>
          <Image style={styles.icon} source={{ uri: "path/to/icon1.png" }} />
          <Image style={styles.icon} source={{ uri: "path/to/icon2.png" }} />
          <Image style={styles.icon} source={{ uri: "path/to/icon3.png" }} />
        </View>
      </View>

      <Text style={styles.helloText}>Hello, User!</Text>

      {!selectedDate ? (
        <>
          <Text style={styles.subtitle}>
            Let’s spin to find the perfect date!
          </Text>
          <View style={styles.wheelContainer}>
            <View style={styles.wheelPointer} />
            <Animated.View
              style={[
                styles.wheel,
                { transform: [{ rotate: wheelRotation }] },
                isSpinning && styles.wheelShadow,
              ]}
            >
              <Svg width={300} height={300}>
                {renderWheelSections()}
              </Svg>
            </Animated.View>
          </View>

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
          <Text style={styles.subtitle}>You’ve spun:</Text>
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>{selectedDate}</Text>
            {/* You may want to dynamically set the address based on the selectedDate */}
            <Text style={styles.resultSubtitle}>
              24900 84 Ave, Langley, BC
            </Text>
          </View>
          <Text style={styles.enjoyText}>Enjoy!</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedDate(null)}
          >
            <Text style={styles.backButtonText}>Back to Wheel</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#faf4e4",
    alignItems: "center",
  },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    height: 70,
    backgroundColor: "#323232",
    paddingHorizontal: 15,
  },
  sznluv: {
    fontFamily: "Gramatika-Black",
    fontSize: 20,
    color: "#faf4e4",
  },
  iconsContainer: {
    flexDirection: "row",
  },
  icon: {
    width: 20,
    height: 20,
    marginLeft: 12,
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
    fontSize: 18,
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
    top: -15,
    width: 0,
    height: 0,
    zIndex: 1,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 30,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#FF0000",
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
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
  resultText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
  },
  resultSubtitle: {
    fontSize: 14,
    color: "#FFF",
  },
  enjoyText: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#a59f90",
    marginTop: 60,
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
