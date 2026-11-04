function firebaseErrorMessage(error, action = 'login') {
  if (error.cleanupErrors?.length) {
    return 'Account setup failed and cleanup could not finish. The account may still exist. Try logging in to complete setup; do not repeatedly sign up with this email.';
  }
  if (error.profileSaved) {
    return 'Your account was created, but signing out failed. Please retry signing out, then log in with your credentials.';
  }
  switch (error.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'The email or password is incorrect.';
    case 'auth/email-already-in-use': return 'This email is already in use. Please log in instead.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/weak-password': return 'Please choose a stronger password.';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait before trying again.';
    case 'auth/network-request-failed':
    case 'unavailable':
    case 'deadline-exceeded': return 'Could not reach Firebase. Check your connection and try again.';
    case 'auth/operation-not-allowed': return 'Email/password sign-in is disabled for this Firebase project.';
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.': return 'The Firebase API key is invalid. The app configuration needs attention.';
    case 'auth/user-disabled': return 'This account has been disabled.';
    case 'permission-denied': return 'Firebase denied access to account data. Account setup could not finish. Please contact the app owner.';
    case 'failed-precondition': return 'Firebase account data is unavailable. Please contact the app owner.';
    case 'signup/username-taken': return 'This username is already taken. Please choose another one.';
    default: return action === 'login' ? 'Login failed. Please try again.' : 'Account setup failed. Please try again.';
  }
}

module.exports = { firebaseErrorMessage };
