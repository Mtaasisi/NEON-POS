/**
 * useDeviceDetection Hook
 * 
 * Detects device type and provides responsive breakpoints
 * Automatically updates on window resize and orientation change
 * 
 * Features:
 * - Mobile device detection (phones, tablets)
 * - Responsive breakpoint detection
 * - Touch capability detection
 * - Orientation detection
 * - User agent parsing
 * 
 * Usage:
 * const { isMobile, isTablet, isDesktop, isTouchDevice, orientation } = useDeviceDetection();
 */

import { useState, useEffect, useCallback } from 'react';

export interface DeviceDetection {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  deviceType: 'mobile' | 'tablet' | 'desktop';
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

// Breakpoints (following Tailwind CSS defaults)
const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Detect if device is mobile based on user agent
 */
const detectMobileUserAgent = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Check for mobile devices
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  return mobileRegex.test(userAgent.toLowerCase());
};

/**
 * Detect if device is tablet based on user agent and screen size
 */
const detectTabletUserAgent = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const isTabletUA = /ipad|tablet|playbook|silk|kindle/i.test(userAgent.toLowerCase());
  
  // Also check screen size for tablets (typically 768px - 1024px)
  const width = window.innerWidth;
  const isTabletSize = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
  
  return isTabletUA || isTabletSize;
};

/**
 * Detect if device has touch capability
 */
const detectTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
};

/**
 * Get current breakpoint based on window width
 */
const getCurrentBreakpoint = (width: number): DeviceDetection['breakpoint'] => {
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
};

/**
 * Get screen orientation
 */
const getOrientation = (width: number, height: number): 'portrait' | 'landscape' => {
  return height > width ? 'portrait' : 'landscape';
};

/**
 * Hook to detect device type and capabilities
 */
export const useDeviceDetection = (): DeviceDetection => {
  const getDeviceInfo = useCallback((): DeviceDetection => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouchDevice: false,
        screenWidth: 1920,
        screenHeight: 1080,
        orientation: 'landscape',
        deviceType: 'desktop',
        breakpoint: '2xl',
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isTouchDevice = detectTouchDevice();
    const isMobileUA = detectMobileUserAgent();
    const isTabletUA = detectTabletUserAgent();
    
    // Determine device type based on multiple factors
    const isMobile = (width < BREAKPOINTS.md || isMobileUA) && !isTabletUA;
    const isTablet = isTabletUA || (width >= BREAKPOINTS.md && width < BREAKPOINTS.lg && isTouchDevice);
    const isDesktop = !isMobile && !isTablet;
    
    const deviceType: DeviceDetection['deviceType'] = 
      isMobile ? 'mobile' : 
      isTablet ? 'tablet' : 
      'desktop';

    return {
      isMobile,
      isTablet,
      isDesktop,
      isTouchDevice,
      screenWidth: width,
      screenHeight: height,
      orientation: getOrientation(width, height),
      deviceType,
      breakpoint: getCurrentBreakpoint(width),
    };
  }, []);

  const [deviceInfo, setDeviceInfo] = useState<DeviceDetection>(getDeviceInfo);

  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;
    
    // Throttled resize handler to prevent excessive re-renders
    const handleResize = () => {
      // Clear existing timeout to debounce
      clearTimeout(resizeTimeout);
      
      // Only update after resize has stopped for 150ms
      resizeTimeout = setTimeout(() => {
        const newInfo = getDeviceInfo();
        // Only update if device info actually changed
        setDeviceInfo(prevInfo => {
          if (
            prevInfo.isMobile !== newInfo.isMobile ||
            prevInfo.isTablet !== newInfo.isTablet ||
            prevInfo.deviceType !== newInfo.deviceType ||
            prevInfo.breakpoint !== newInfo.breakpoint ||
            prevInfo.orientation !== newInfo.orientation
          ) {
            return newInfo;
          }
          return prevInfo;
        });
      }, 150);
    };

    // Update device info on orientation change
    const handleOrientationChange = () => {
      // Delay to ensure dimensions are updated
      setTimeout(() => {
        const newInfo = getDeviceInfo();
        setDeviceInfo(newInfo);
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Initial update
    const initialInfo = getDeviceInfo();
    setDeviceInfo(initialInfo);

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [getDeviceInfo]);

  return deviceInfo;
};

/**
 * Hook to check if current breakpoint is at least the specified breakpoint
 */
export const useBreakpoint = (minBreakpoint: keyof typeof BREAKPOINTS): boolean => {
  const { breakpoint } = useDeviceDetection();
  
  const breakpointOrder: Array<keyof typeof BREAKPOINTS> = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  const minIndex = breakpointOrder.indexOf(minBreakpoint);
  
  return currentIndex >= minIndex;
};

/**
 * Hook to get media query match
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } 
    // Legacy browsers
    else {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, [query]);

  return matches;
};

export default useDeviceDetection;

