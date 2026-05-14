"use client";

import {
  createContext,
  useContext,
  useState,
} from "react";

type SearchContextType = {
  isSearchOpen: boolean;
  setIsSearchOpen: (value: boolean) => void;
};

const SearchContext = createContext<SearchContextType | null>(null);

export function SearchProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <SearchContext.Provider
      value={{
        isSearchOpen,
        setIsSearchOpen,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {

  const context = useContext(SearchContext);

  if (!context) {
    throw new Error(
      "useSearch must be used inside SearchProvider"
    );
  }

  return context;
}