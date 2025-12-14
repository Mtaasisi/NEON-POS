import { useEffect } from 'react';

// Track the number of active locks to handle multiple modals
let lockCount = 0;
let originalStyles: {
  position: string;
  top: string;
  width: string;
  overflow: string;
  paddingRight: string;
} | null = null;
let scrollY = 0;

/**
 * Custom hook to prevent body scrolling when a modal is open
 * Supports multiple modals being open simultaneously
 * @param isLocked - Whether to lock the body scroll
 */
export const useBodyScrollLock = (isLocked: boolean) => {
  useEffect(() => {
    if (isLocked) {
      lockCount++;
      
      // Only apply lock styles on the first lock
      if (lockCount === 1) {
        // Store the current scroll position and original styles
        scrollY = window.scrollY;
        originalStyles = {
          position: document.body.style.position,
          top: document.body.style.top,
          width: document.body.style.width,
          overflow: document.body.style.overflow,
          paddingRight: document.body.style.paddingRight,
        };
        
        // Get scrollbar width to prevent layout shift
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        
        // Prevent scrolling
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
        
        // Add padding to compensate for scrollbar removal
        if (scrollbarWidth > 0) {
          document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
      }
      
      return () => {
        lockCount--;
        
        // Only restore styles when all locks are released
        if (lockCount === 0 && originalStyles) {
          // Restore original styles
          document.body.style.position = originalStyles.position;
          document.body.style.top = originalStyles.top;
          document.body.style.width = originalStyles.width;
          document.body.style.overflow = originalStyles.overflow;
          document.body.style.paddingRight = originalStyles.paddingRight;
          
          // Restore scroll position
          window.scrollTo(0, scrollY);
          
          // Clear stored values
          originalStyles = null;
        }
      };
    }
  }, [isLocked]);
};
