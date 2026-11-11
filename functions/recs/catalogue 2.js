// The spot catalogue the app ships. In the repo (tests, emulator) it is read straight from services/;
// a deployed function only has its own folder, so scripts/sync-functions-shared.cjs copies it to shared/ first.
function load() {
  try { return require('../../services/catalogue'); }
  catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return require('../shared/catalogue');
  }
}

module.exports = load();
