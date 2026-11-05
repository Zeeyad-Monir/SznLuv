// Forecast for a spot, fetched from OpenWeatherMap using the SPOT's own coordinates.
// Plain CommonJS (no React) so it can be unit-tested with a fake fetch.

const WEATHER_UNAVAILABLE = 'Weather is unavailable right now.';

function buildForecastUrl(latitude, longitude, key) {
  return `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${key}&units=metric`;
}

// The API returns one entry every 3 hours; keep one per day, preferring the one at noon.
function processDailyData(list) {
  const days = {};
  list.forEach((item) => {
    const date = new Date(item.dt * 1000);
    const day = date.toISOString().split('T')[0];
    if (!days[day]) days[day] = [];
    days[day].push(item);
  });
  return Object.keys(days).map((day) => {
    const dayData = days[day];
    return (
      dayData.find((item) => new Date(item.dt * 1000).getHours() === 12) ||
      dayData[Math.floor(dayData.length / 2)]
    );
  });
}

// Resolves to { weatherData, dailyData }. Always rejects with a friendly message (error.message)
// and the technical reason in error.detail, so the UI can show one short sentence and log the detail.
async function fetchForecast(latitude, longitude, { fetchImpl = fetch, key } = {}) {
  let response;
  let data;
  try {
    response = await fetchImpl(buildForecastUrl(latitude, longitude, key));
    data = await response.json();
  } catch (cause) {
    throw Object.assign(new Error(WEATHER_UNAVAILABLE), { cause, detail: cause && cause.message });
  }
  if (!response.ok || !data || !Array.isArray(data.list) || !data.city) {
    throw Object.assign(new Error(WEATHER_UNAVAILABLE), {
      detail: (data && data.message) || `HTTP ${response.status}`,
    });
  }
  return { weatherData: data, dailyData: processDailyData(data.list) };
}

module.exports = { WEATHER_UNAVAILABLE, buildForecastUrl, processDailyData, fetchForecast };
