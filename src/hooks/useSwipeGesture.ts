import { useRef, useCallback } from 'react';

export interface SwipeConfig {
  threshold?: number; // Minimum distance to trigger swipe (default: 50px)
  velocity?: number;  // Minimum velocity for swipe (default: 0.3)
  restorePosition?: boolean; // Whether to restore position after swipe (default: true)
}

export interface SwipeResult {
  direction: 'left' | 'right' | 'up' | 'down' | null;
  distance: number;
  velocity: number;
}

/**
 * useSwipeGesture Hook
 *
 * Provides touch gesture detection for swipe actions on iPad and touch devices
 * Supports left/right/up/down swipe detection with velocity and distance thresholds
 *
 * @param onSwipe - Callback function called when swipe is detected
 * @param config - Configuration options for swipe detection
 */
export function useSwipeGesture(
  onSwipe?: (result: SwipeResult) => void,
  config: SwipeConfig = {}
) {
  const {
    threshold = 50,
    velocity: minVelocity = 0.3,
    restorePosition = true,
  } = config;

  const elementRef = useRef<HTMLElement>(null);
  const startX = useRef<number>(0);
  const startY = useRef<number>(0);
  const startTime = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    startTime.current = Date.now();
    isDragging.current = true;
    // Do NOT prevent default here; allow scroll unless we later detect a horizontal swipe.
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - startX.current;
    const deltaY = touch.clientY - startY.current;

    // If vertical movement dominates, allow natural scroll.
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }

    // For horizontal gestures, only preventDefault after a small threshold so scrolling stays fluid.
    const horizontalThreshold = 10; // pixels
    if (Math.abs(deltaX) > horizontalThreshold) {
      e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isDragging.current) return;

    const touch = e.changedTouches[0];
    const endTime = Date.now();
    const duration = endTime - startTime.current;

    const deltaX = touch.clientX - startX.current;
    const deltaY = touch.clientY - startY.current;

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration; // pixels per millisecond

    let direction: SwipeResult['direction'] = null;

    // Determine swipe direction based on dominant axis
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) >= threshold && velocity >= minVelocity) {
        direction = deltaX > 0 ? 'right' : 'left';
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) >= threshold && velocity >= minVelocity) {
        direction = deltaY > 0 ? 'down' : 'up';
      }
    }

    if (direction && onSwipe) {
      onSwipe({
        direction,
        distance,
        velocity,
      });
    }

    isDragging.current = false;
  }, [threshold, minVelocity, onSwipe]);

  const attachListeners = useCallback((element: HTMLElement) => {
    elementRef.current = element;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const detachListeners = useCallback(() => {
    if (elementRef.current) {
      elementRef.current.removeEventListener('touchstart', handleTouchStart);
      elementRef.current.removeEventListener('touchmove', handleTouchMove);
      elementRef.current.removeEventListener('touchend', handleTouchEnd);
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    attachListeners,
    detachListeners,
    elementRef,
  };
}

/**
 * useSwipeToAction Hook
 *
 * Specialized hook for swipe-to-action patterns (like swipe to add/remove from cart)
 * Provides haptic feedback and visual feedback during swipe
 */
export function useSwipeToAction(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  config: SwipeConfig = {}
) {
  const handleSwipe = useCallback((result: SwipeResult) => {
    // Provide haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    switch (result.direction) {
      case 'left':
        if (onSwipeLeft) onSwipeLeft();
        break;
      case 'right':
        if (onSwipeRight) onSwipeRight();
        break;
    }
  }, [onSwipeLeft, onSwipeRight]);

  return useSwipeGesture(handleSwipe, {
    threshold: 60, // Slightly higher threshold for actions
    velocity: 0.4, // Slightly higher velocity requirement
    ...config,
  });
}