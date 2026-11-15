// The Saved page's search text, filters and sort, shared with its two "View all" pages: what is typed on
// one is still there on the next, and on the way back. Mounted once for the Favourites tab
// (navigation/MainTabs.js). Without the provider (a screen on its own) each page keeps its own.
import { createContext, createElement, useContext, useMemo, useState } from 'react';
import { DEFAULT_SAVED_FILTERS } from '../services/savedLibrary';

const SavedQueryContext = createContext(null);

function useQueryState() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_SAVED_FILTERS);
  return useMemo(() => ({ query, setQuery, filters, setFilters }), [query, filters]);
}

export function SavedQueryProvider({ children }) {
  const value = useQueryState();
  return createElement(SavedQueryContext.Provider, { value }, children);
}

export default function useSavedQuery() {
  const shared = useContext(SavedQueryContext);
  const own = useQueryState();
  return shared ?? own;
}
