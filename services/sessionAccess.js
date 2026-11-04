function sessionAccess({ initializing, user, registering, registrationError, profile }) {
  if (initializing) return 'loading';
  // Firebase signs in immediately on createUser; signup must remain on its own screen.
  if (registering || !user) return 'auth';
  if (registrationError) return 'blocked';
  if (profile.status === 'checking') return 'loading';
  return profile.status === 'ready' ? 'home' : 'blocked';
}
module.exports = { sessionAccess };
