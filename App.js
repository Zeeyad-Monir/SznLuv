import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      {/* 
        StatusBar Configuration
        - Sets the status bar text to light content for better visibility against dark backgrounds.
        - Background color matches the header for a seamless blend.
      */}
      <StatusBar barStyle="light-content" backgroundColor="#333333" />

      {/* 
        Header Container
        - Holds the entire header section.
        - Background color set to dark gray to match the desired header appearance.
      */}
      <View style={styles.headerContainer}>
        {/* 
          SafeAreaView for Header
          - Ensures header content does not overlap with device notches or status bars.
          - Applies the same background color as the header container for consistency.
        */}
        <SafeAreaView style={styles.safeArea}>
          {/* 
            Header Content
            - Arranged in a row with space between the app name and icons.
            - Vertically centers all header elements.
          */}
          <View style={styles.header}>
            {/* 
              App Name ("SznLuv")
              - Positioned on the left side of the header.
              - Increased font size and weight for prominence.
            */}
            <Text style={styles.headerText}>SznLuv</Text>

            {/* 
              Header Icons Container
              - Holds the heart and user icons.
              - Arranged horizontally with spacing between each icon.
            */}
            <View style={styles.headerIcons}>
              {/* 
                Heart Icon Button
                - Touchable area for the heart icon.
                - Contains a circular background with a heart symbol.
              */}
              <TouchableOpacity style={styles.icon}>
                <View style={styles.iconCircle}>
                  <Text style={styles.iconSymbol}>❤️</Text>
                </View>
              </TouchableOpacity>

              {/* 
                User Icon Button
                - Touchable area for the user icon.
                - Contains a circular background with a user symbol.
              */}
              <TouchableOpacity style={styles.icon}>
                <View style={styles.iconCircle}>
                  <Text style={styles.iconSymbol}>👤</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* 
        Main Content Area
        - Contains the greeting, section titles, and seasonal cards.
        - Padded to separate from the header.
      */}
      <View style={styles.content}>
        {/* 
          Greeting Text
          - Displays a personalized greeting to the user.
          - Bold and large font to serve as the primary focus.
        */}
        <Text style={styles.greetingText}>Hello, Vanessa</Text>

        {/* 
          "In Season" Section Title
          - Labels the current season section.
          - Styled to stand out as a secondary heading.
        */}
        <Text style={styles.sectionTitle}>In Season</Text>

        {/* 
          Fall Season Card
          - Represents the Fall season with associated active ideas.
          - Styled with a soft orange background and centered content.
        */}
        <View style={[styles.card, styles.cardFall]}>
          {/* 
            Season Title ("Fall")
            - Bold and prominent within the card.
          */}
          <Text style={styles.cardTitle}>Fall</Text>

          {/* 
            Active Ideas Badge
            - Indicates the number of active ideas for the season.
            - Styled with a semi-transparent background and rounded edges.
          */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>12 Active Ideas</Text>
          </View>
        </View>

        {/* 
          "Upcoming Seasons" Section Title
          - Labels the upcoming seasons section.
          - Styled similarly to the "In Season" title for consistency.
        */}
        <Text style={styles.sectionTitle}>Upcoming Seasons</Text>

        {/* 
          Winter Season Card
          - Represents the Winter season with associated active ideas.
          - Styled with a soft blue background and centered content.
        */}
        <View style={[styles.card, styles.cardWinter]}>
          <Text style={styles.cardTitle}>Winter</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>2 Active Ideas</Text>
          </View>
        </View>

        {/* 
          Spring Season Card
          - Represents the Spring season with associated active ideas.
          - Styled with a soft pink background and centered content.
        */}
        <View style={[styles.card, styles.cardSpring]}>
          <Text style={styles.cardTitle}>Spring</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>5 Active Ideas</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* 
    Container Style
    - Sets up the main container to occupy the full screen.
    - Applies a warm, soft beige background color.
  */
  container: {
    flex: 1,
    backgroundColor: '#F5F2EF', // Warmer, softer beige
  },

  /* 
    Header Container Style
    - Defines the background color for the header section.
  */
  headerContainer: {
    backgroundColor: '#333333', // Dark gray background for the header
  },

  /* 
    Safe Area Style for Header
    - Ensures the header content respects safe area boundaries.
    - Matches the header container's background color.
  */
  safeArea: {
    backgroundColor: '#333333', // Consistent background color
  },

  /* 
    Header Content Style
    - Arranges header elements horizontally with space between.
    - Vertically centers all items within the header.
    - Adds padding for better spacing within the header.
  */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15, // Adjusted padding for vertical spacing
    paddingHorizontal: 20, // Adjusted padding for horizontal spacing
  },

  /* 
    Header Text Style ("SznLuv")
    - Large, bold font for the app name.
    - White color to stand out against the dark header background.
  */
  headerText: {
    fontSize: 28, // Increased font size for prominence
    fontWeight: '700', // Bold font weight
    color: '#FAF5EF', // White color
    fontFamily: 'Arial',
  },

  /* 
    Header Icons Container Style
    - Arranges the icons horizontally.
  */
  headerIcons: {
    flexDirection: 'row', // Horizontal arrangement of icons
  },

  /* 
    Icon Button Style
    - Adds left margin to space out each icon.
  */
  icon: {
    marginLeft: 20, // Spacing between icons
  },

  /* 
    Icon Circle Style
    - Creates a circular background for each icon.
    - Dark gray background to match the header aesthetic.
    - Centers the icon symbol within the circle.
  */
  iconCircle: {
    backgroundColor: '#555555', // Dark gray circle background
    width: 40, // Width of the circular icon
    height: 40, // Height of the circular icon
    borderRadius: 20, // Makes the view circular
    justifyContent: 'center', // Centers content vertically
    alignItems: 'center', // Centers content horizontally
  },

  /* 
    Icon Symbol Style
    - Styles the emoji icons within the circular background.
    - White color for visibility against the dark background.
  */
  iconSymbol: {
    fontSize: 20, // Size of the icon symbol
    color: '#FFFFFF', // White color for the symbol
  },

  /* 
    Content Area Style
    - Holds the main content below the header.
    - Adds horizontal padding and top padding to separate from the header.
  */
  content: {
    flex: 1,
    paddingHorizontal: 20, // Horizontal padding for content
    paddingTop: 20, // Top padding to separate from the header
  },

  /* 
    Greeting Text Style
    - Large, bold font for the primary greeting.
    - Centered horizontally for balanced appearance.
    - Margins added for spacing below the greeting.
  */
  greetingText: {
    fontSize: 36, // Large font size for prominence
    fontWeight: '800', // Heavier font weight
    color: '#333333', // Dark gray color
    marginBottom: 20, // Space below the greeting
    textAlign: 'center', // Centers the text horizontally
    fontFamily: 'Arial',
  },

  /* 
    Section Title Style ("In Season" & "Upcoming Seasons")
    - Medium-sized, bold font for section headers.
    - Warm medium gray color for a softer appearance.
    - Margins added for vertical spacing between sections.
    - Centered horizontally for consistency.
  */
  sectionTitle: {
    fontSize: 30, // Increased font size for better readability
    fontWeight: '700', // Bold font weight
    color: '#7F7F7F', // Warmer medium gray color
    marginVertical: 20, // Vertical spacing above and below the title
    textAlign: 'center', // Centers the text horizontally
    fontFamily: 'Arial',
    marginBottom: 20,
  },

  /* 
    Card Style (Common for All Seasons)
    - Adds padding and rounded corners for a modern look.
    - Vertical margins for spacing between cards.
    - Centers all content within the card.
    - Horizontal margins to center the cards within the screen.
  */
  card: {
    padding: 25, // Padding inside the card
    borderRadius: 20, // Rounded corners for a softer look
    marginVertical: 10, // Vertical spacing between cards
    alignItems: 'center', // Centers content horizontally within the card
    marginHorizontal: 20, // Centers the card within the screen by adding horizontal margins
  marginBottom: 30,
  },

  /* 
    Fall Season Card Style
    - Specific background color for the Fall season.
  */
  cardFall: {
    backgroundColor: '#FFB27A', // Soft orange for Fall
  },

  /* 
    Winter Season Card Style
    - Specific background color for the Winter season.
  */
  cardWinter: {
    backgroundColor: '#AED7FF', // Light blue for Winter
  },

  /* 
    Spring Season Card Style
    - Specific background color for the Spring season.
  */
  cardSpring: {
    backgroundColor: '#FFCCE5', // Pastel pink for Spring
  },

  /* 
    Card Title Style (Season Names)
    - Large, bold font for the season name.
    - White color to contrast against the card background.
    - Centered text for balanced appearance.
    - Margin below the title to separate from the badge.
  */
  cardTitle: {
    fontSize: 30, // Increased font size for prominence
    fontWeight: '700', // Bold font weight
    color: '#FFFFFF', // White color for contrast
    marginBottom: 15, // Space below the title
    fontFamily: 'Arial',
    textAlign: 'center', // Centers the text within the card
  },

  /* 
    Badge Style (Active Ideas)
    - Semi-transparent white background for readability.
    - Padding and rounded edges for a pill-shaped appearance.
    - Centers the badge horizontally within the card.
  */
  badge: {
    alignSelf: 'center', // Centers the badge horizontally within the card
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Semi-transparent white background
    paddingVertical: 6, // Vertical padding inside the badge
    paddingHorizontal: 14, // Horizontal padding inside the badge
    borderRadius: 15, // Rounded edges for a pill shape
  },

  /* 
    Badge Text Style
    - Medium-sized font for readability.
    - Dark gray color for contrast against the badge background.
    - Semi-bold font weight for emphasis.
    - Centered text within the badge.
  */
  badgeText: {
    fontSize: 16, // Increased font size for better readability
    color: '#333333', // Dark gray color for text
    fontWeight: '600', // Semi-bold font weight
    fontFamily: 'Arial',
    textAlign: 'center', // Centers the text within the badge
  },
});
