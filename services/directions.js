// Opens turn-by-turn directions in the phone's maps app. Plain CommonJS for unit tests.
const { hasCoordinates } = require('./spotDiscovery');

function directionsUrl({ latitude, longitude, address }, platform) {
  const hasPin = hasCoordinates({ latitude, longitude });
  const street = typeof address === 'string' ? address.trim() : '';
  if (!hasPin && !street) return null;
  const destination = encodeURIComponent(hasPin ? `${latitude},${longitude}` : street);
  return platform === 'ios'
    ? `http://maps.apple.com/?daddr=${destination}`
    : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

module.exports = { directionsUrl };
