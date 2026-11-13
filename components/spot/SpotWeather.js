import React, { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import useVenueWeather from '../../hooks/useVenueWeather';
import { honey, spot } from '../theme';

export default function SpotWeather({ latitude, longitude }) {
  const { weatherData, dailyData, weatherError, weatherLoading } = useVenueWeather(latitude, longitude);
  const [fahrenheit, setFahrenheit] = useState(false);
  const [selected, setSelected] = useState(null);
  const temperature = value => fahrenheit ? `${(value * 9 / 5 + 32).toFixed(1)}°F` : `${value.toFixed(1)}°C`;

  return (
    <View style={spot.section}>
      <Text style={spot.heading} accessibilityRole="header">Weather</Text>
      {weatherLoading && <ActivityIndicator color={honey.ink} accessibilityLabel="Loading weather" />}
      {!!weatherError && <Text style={spot.body}>{weatherError}</Text>}
      {!!weatherData && (
        <>
          <Text style={spot.body}>{weatherData.city.name}, {weatherData.city.country}</Text>
          <View style={styles.units}>
            <Text style={spot.meta}>°C</Text>
            <Switch value={fahrenheit} onValueChange={setFahrenheit} accessibilityLabel="Show temperatures in Fahrenheit" />
            <Text style={spot.meta}>°F</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
            {dailyData.slice(0, 5).map(item => {
              const day = new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' });
              const expanded = selected === item.dt;
              return (
                <TouchableOpacity key={item.dt} style={styles.day} onPress={() => setSelected(expanded ? null : item.dt)}
                  accessibilityRole="button" accessibilityState={{ expanded }}>
                  <Text style={spot.label}>{day}</Text>
                  <Image style={styles.icon} accessible={false}
                    source={{ uri: `https://openweathermap.org/img/wn/${item.weather[0].icon}.png` }} />
                  {expanded ? (
                    <Text style={[spot.meta, styles.detail]}>{item.weather[0].description}{'\n'}Wind {item.wind.speed} m/s{'\n'}Humidity {item.main.humidity}%</Text>
                  ): <Text style={spot.body}>{temperature(item.main.temp)}</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  units: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  days: { gap: 8 },
  day: {
    width: 102, minHeight: 84, padding: 8, borderRadius: 12, alignItems: 'center',
    ...spot.inset,
  },
  detail: { fontSize: 12, textAlign: 'center' },
  icon: { width: 32, height: 32 },
});
