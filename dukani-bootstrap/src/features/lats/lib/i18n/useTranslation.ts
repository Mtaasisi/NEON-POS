import { useState, useEffect } from 'react';
import { t as translateFn, subscribeToLocaleChange, getLocale } from './t';

/**
 * React hook for translations that automatically re-renders when locale changes
 */
export function useTranslation() {
  // Force re-render when locale changes
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    // Subscribe to locale changes
    const unsubscribe = subscribeToLocaleChange(() => {
      console.log('🔄 Locale changed, re-rendering component...');
      forceUpdate({}); // Force re-render
    });
    
    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);
  
  // Return the translation function
  return {
    t: translateFn,
    locale: getLocale()
  };
}

