import { createContext, useContext } from 'react';

// The city the signed-in person chose, and the way to change it. App.js provides it.
// `city` is an entry of CITIES (services/catalogue.js); inside the signed-in app it is always set.
// `chosen` is false only on the city picker a person must pass before the app opens.
// `unavailableCity` is a city they had chosen that is no longer offered.
// `changeCity(cityId)` saves the choice to their profile and rejects if it could not be saved;
// choosing the current city again does nothing.
export const CityContext = createContext({ city: null, chosen: false, unavailableCity: null, changeCity: async () => {} });

export const useCity = () => useContext(CityContext);
