// Opens turn-by-turn directions in the phone's maps app. Plain CommonJS for unit tests.
function directionsUrl({ latitude, longitude, address }, platform) {
  const hasPin = Number.isFinite(latitude) && Number.isFinite(longitude);
  if (!hasPin && !address) return null;
  const destination = encodeURIComponent(hasPin ? `${latitude},${longitude}` : address);
  return platform === 'ios'
    ? `http://maps.apple.com/?daddr=${destination}`
    : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

module.exports = { directionsUrl };
