// The city a person chose, saved on their profile as `users/{uid}.selectedCityId` so it follows them
// to any device. Plain CommonJS so it can be unit-tested directly.
const { findCity, isSelectableCity } = require('./catalogue');

const CITY_FIELD = 'selectedCityId';
const SAVE_TIMEOUT_MS = 10000;

// The saved city, or null when there is none to use: never chosen, not a city SznLuv knows, or switched off.
// Null sends the person to the city picker (services/sessionAccess.js), so a bad value is never shown as a city.
const selectedCityFrom = profile => (isSelectableCity(profile?.[CITY_FIELD]) ? profile[CITY_FIELD] : null);

// A city they had chosen that is no longer offered, so the picker can say why it is asking again.
function unavailableCityFrom(profile) {
  const city = findCity(profile?.[CITY_FIELD]);
  return city && !city.active ? city : null;
}

// How far along a brand-new account is treated as new, for the picker's welcome wording.
const NEW_ACCOUNT_MS = 24 * 60 * 60 * 1000;
function isNewAccount(creationTime, now = Date.now()) {
  const created = Date.parse(creationTime);
  return Number.isFinite(created) && now - created < NEW_ACCOUNT_MS;
}

// Firestore queues a write made offline and its promise stays pending until the connection is back, so a
// save that hasn't been confirmed in time is reported as a failure instead of leaving the button spinning.
function withTimeout(promise, ms = SAVE_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error('Timed out'), { code: 'unavailable' })), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

module.exports = { CITY_FIELD, SAVE_TIMEOUT_MS, selectedCityFrom, unavailableCityFrom, isNewAccount, withTimeout };
