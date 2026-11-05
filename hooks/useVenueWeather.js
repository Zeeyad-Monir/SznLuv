import { useEffect, useState } from 'react';
import { fetchForecast, WEATHER_UNAVAILABLE } from '../services/weather';
import { WEATHER_API_KEY } from '../services/apiKeys';

// Loads the forecast for a spot's coordinates when the page opens.
// It always finishes with either data or a short error message, so the page never shows an endless spinner,
// and it does not depend on location permission or a GPS fix.
export default function useVenueWeather(latitude, longitude) {
  const [state, setState] = useState({ weatherData: null, dailyData: [], weatherError: null, weatherLoading: true });

  useEffect(() => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setState({ weatherData: null, dailyData: [], weatherError: WEATHER_UNAVAILABLE, weatherLoading: false });
      return undefined;
    }
    let cancelled = false;
    fetchForecast(latitude, longitude, { key: WEATHER_API_KEY })
      .then(({ weatherData, dailyData }) => {
        if (!cancelled) setState({ weatherData, dailyData, weatherError: null, weatherLoading: false });
      })
      .catch((error) => {
        console.error('Weather unavailable:', error.detail || error.message);
        if (!cancelled) setState({ weatherData: null, dailyData: [], weatherError: error.message, weatherLoading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  return state;
}
