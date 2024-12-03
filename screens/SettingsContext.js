// SETTINGSCONTEXT.JS
// Detailed comments are added by chatgpt.com to the existing code, this way it makes it easier for each other to know what we coded when the other looks at it. Aswell as helps remember everything going on. 

// =========================
// IMPORTS SECTION
// =========================

// Importing necessary modules and hooks from React
import React, { createContext, useState, useEffect } from 'react';

// Importing AsyncStorage for persistent storage of settings
import AsyncStorage from '@react-native-async-storage/async-storage';

// Importing Expo's Location API to handle location services
import * as Location from 'expo-location';

// Importing Alert from React Native to display alert dialogs
import { Alert } from 'react-native';

// =========================
// CONTEXT CREATION SECTION
// =========================

// Creating a Context for managing and providing settings across the app
export const SettingsContext = createContext();

// =========================
// PROVIDER COMPONENT DEFINITION
// =========================

/**
 * SettingsProvider Component
 * 
 * This component wraps around parts of the app that need access to settings.
 * It provides the current state of location services and functions to toggle them.
 */
export const SettingsProvider = ({ children }) => {
  
  // =========================
  // STATE VARIABLES SECTION
  // =========================
  
  /**
   * isLocationEnabled
   * 
   * A state variable that indicates whether location services are enabled.
   * Initialized to false by default.
   */
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);

  // =========================
  // LOAD SETTINGS EFFECT SECTION
  // =========================
  
  /**
   * useEffect Hook: Load Settings on Mount
   * 
   * This effect runs once when the component mounts. It attempts to load the
   * saved location setting from AsyncStorage and updates the state accordingly.
   */
  useEffect(() => {
    /**
     * loadSettings Function
     * 
     * An asynchronous function that retrieves the saved location setting from AsyncStorage.
     */
    const loadSettings = async () => {
      try {
        // Attempt to get the 'isLocationEnabled' item from AsyncStorage
        const savedLocationSetting = await AsyncStorage.getItem('isLocationEnabled');
        
        // If a saved setting exists, parse it and update the state
        if (savedLocationSetting !== null) {
          setIsLocationEnabled(JSON.parse(savedLocationSetting));
        }
      } catch (e) {
        // Log any errors that occur during the retrieval process
        console.error('Failed to load location setting:', e);
      }
    };
    
    // Invoke the loadSettings function to load settings on mount
    loadSettings();
  }, []); // Empty dependency array ensures this runs only once

  // =========================
  // SAVE SETTINGS EFFECT SECTION
  // =========================
  
  /**
   * useEffect Hook: Save Settings on Change
   * 
   * This effect runs whenever the 'isLocationEnabled' state changes.
   * It saves the current state to AsyncStorage to persist the setting.
   */
  useEffect(() => {
    /**
     * saveSettings Function
     * 
     * An asynchronous function that saves the current location setting to AsyncStorage.
     */
    const saveSettings = async () => {
      try {
        // Attempt to save the 'isLocationEnabled' state as a JSON string
        await AsyncStorage.setItem('isLocationEnabled', JSON.stringify(isLocationEnabled));
      } catch (e) {
        // Log any errors that occur during the saving process
        console.error('Failed to save location setting:', e);
      }
    };
    
    // Invoke the saveSettings function to persist the current setting
    saveSettings();
  }, [isLocationEnabled]); // Dependency array ensures this runs whenever 'isLocationEnabled' changes

  // =========================
  // TOGGLE LOCATION SERVICES FUNCTION
  // =========================
  
  /**
   * toggleLocationServices Function
   * 
   * This asynchronous function toggles the state of location services.
   * If enabling, it requests the necessary permissions and retrieves the current location.
   * If disabling, it simply updates the state.
   */
  const toggleLocationServices = async () => {
    if (!isLocationEnabled) {
      // Attempting to enable location services
      try {
        // Request foreground location permissions from the user
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status === 'granted') {
          // If permission is granted, retrieve the current position
          const location = await Location.getCurrentPositionAsync({});
          
          // Log the retrieved location for debugging purposes
          console.log('User Location:', location);
          
          // Update the state to indicate that location services are enabled
          setIsLocationEnabled(true);
          
          // Notify the user that location services have been enabled
          Alert.alert('Location Enabled', 'Location services have been enabled.');
        } else {
          // If permission is denied, log a warning and notify the user
          console.warn('Location permission denied.');
          Alert.alert('Permission Denied', 'Location permission was not granted.');
        }
      } catch (error) {
        // Handle any errors that occur during the permission request or location retrieval
        console.error('Error enabling location services:', error);
        Alert.alert('Error', 'An error occurred while enabling location services.');
      }
    } else {
      // Disabling location services
      setIsLocationEnabled(false); // Update the state to indicate that location services are disabled
      Alert.alert('Location Disabled', 'Location services have been disabled.'); // Notify the user
    }
  };

  // =========================
  // PROVIDER RENDER SECTION
  // =========================
  
  /**
   * Render Function
   * 
   * Returns the SettingsContext.Provider component that wraps around its children.
   * It provides the current state and functions related to settings to the component tree.
   */
  return (
    <SettingsContext.Provider
      value={{
        isLocationEnabled,       // Current state indicating if location is enabled
        setIsLocationEnabled,    // Function to manually set the location enabled state
        toggleLocationServices,  // Function to toggle location services on or off
      }}
    >
      {children} {/* Render any child components that are wrapped by the provider */}
    </SettingsContext.Provider>
  );
};