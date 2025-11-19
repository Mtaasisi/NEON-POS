import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface GlobalSearchContextType {
  isOpen: boolean;
  initialQuery: string;
  openSearch: (query?: string) => void;
  closeSearch: () => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextType | undefined>(undefined);

export const useGlobalSearchModal = (): GlobalSearchContextType => {
  const context = useContext(GlobalSearchContext);
  if (!context) {
    throw new Error('useGlobalSearchModal must be used within a GlobalSearchProvider');
  }
  return context;
};

interface GlobalSearchProviderProps {
  children: ReactNode;
}

export const GlobalSearchProvider: React.FC<GlobalSearchProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState('');

  const openSearch = useCallback((query: string = '') => {
    setInitialQuery(query);
    setIsOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setInitialQuery('');
  }, []);

  return (
    <GlobalSearchContext.Provider value={{ isOpen, initialQuery, openSearch, closeSearch }}>
      {children}
    </GlobalSearchContext.Provider>
  );
};

