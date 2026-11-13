function sessionAccess({ initializing, user, registering, registrationError, profile }) {
  if (initializing) return 'loading';
  // Firebase signs in immediately on createUser; signup must remain on its own screen.
  if (registering || !user) return 'auth';
  if (registrationError) return 'blocked';
  if (profile.status === 'checking') return 'loading';
  if (profile.status !== 'ready') return 'blocked';
  // The app opens only once a city is chosen: without one, the city picker is the only screen there is.
  return profile.cityId ? 'home' : 'city';
}
module.exports = { sessionAccess };
