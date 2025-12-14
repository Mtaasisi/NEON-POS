import { useState, useCallback } from 'react';

interface UseGlobalSearchModalReturn {
  isOpen: boolean;
  initialQuery: string;
  openSearch: (query?: string) => void;
  closeSearch: () => void;
}

export const useGlobalSearchModal = (): UseGlobalSearchModalReturn => {
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

  return {
    isOpen,
    initialQuery,
    openSearch,
    closeSearch,
  };
};

