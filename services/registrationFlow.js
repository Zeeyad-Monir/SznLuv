// Kept independent of Firebase/React so failure recovery can be tested directly.
async function registerWithProfile(operations, credentials) {
  let user;
  let profileSaved = false;
  let stage = 'authentication';
  try {
    user = await operations.createAccount(credentials.email, credentials.password);
    stage = 'profile';
    await operations.saveProfile(user, credentials.username);
    profileSaved = true;
    stage = 'signout';
    await operations.signOut();
    return user;
  } catch (cause) {
    const cleanupErrors = [];
    // Never delete a successfully provisioned account because logout failed.
    if (user && !profileSaved) {
      try { await operations.deleteAccount(user); }
      catch (error) { cleanupErrors.push({ stage: 'delete-account', code: error.code }); }
    }
    if (user) {
      try { await operations.signOut(); }
      catch (error) { cleanupErrors.push({ stage: 'signout', code: error.code }); }
    }
    const error = new Error(cause.message);
    Object.assign(error, { code: cause.code, cause, stage, profileSaved, cleanupErrors });
    throw error;
  }
}

module.exports = { registerWithProfile };
