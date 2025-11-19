import React, { useEffect } from 'react';
import GlobalSearchModal from './GlobalSearchModal';
import { useGlobalSearchModal } from '../../../context/GlobalSearchContext';

const GlobalSearchShortcut: React.FC = () => {
  const { isOpen, initialQuery, openSearch, closeSearch } = useGlobalSearchModal();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+K (Windows/Linux) or Cmd+K (Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        event.stopPropagation();
        openSearch();
      }
    };

    // Use capture phase to intercept before other handlers
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [openSearch]);

  return (
    <GlobalSearchModal
      isOpen={isOpen}
      onClose={closeSearch}
      initialQuery={initialQuery}
    />
  );
};

export default GlobalSearchShortcut;
