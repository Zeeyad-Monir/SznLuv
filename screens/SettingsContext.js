// SettingsContext.js

import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

export const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);

  // Load saved settings from AsyncStorage when the provider mounts
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedLocationSetting = await AsyncStorage.getItem('isLocationEnabled');
        if (savedLocationSetting !== null) {
          setIsLocationEnabled(JSON.parse(savedLocationSetting));
        }
      } catch (e) {
        console.error('Failed to load location setting:', e);
      }
    };
    loadSettings();
  }, []);

  // Save settings to AsyncStorage whenever they change
  useEffect(() => {
    const saveSettings = async () => {
      try {
        await AsyncStorage.setItem('isLocationEnabled', JSON.stringify(isLocationEnabled));
      } catch (e) {
        console.error('Failed to save location setting:', e);
      }
    };
    saveSettings();
  }, [isLocationEnabled]);

  // Toggle location services and handle permissions
  const toggleLocationServices = async () => {
    if (!isLocationEnabled) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          console.log('User Location:', location);
          setIsLocationEnabled(true);
          Alert.alert('Location Enabled', 'Location services have been enabled.');
        } else {
          console.warn('Location permission denied.');
          Alert.alert('Permission Denied', 'Location permission was not granted.');
        }
      } catch (error) {
        console.error('Error enabling location services:', error);
        Alert.alert('Error', 'An error occurred while enabling location services.');
      }
    } else {
      setIsLocationEnabled(false);
      Alert.alert('Location Disabled', 'Location services have been disabled.');
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        isLocationEnabled,
        setIsLocationEnabled,
        toggleLocationServices, // Expose toggle function
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};