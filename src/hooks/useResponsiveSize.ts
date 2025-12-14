import { useState, useEffect } from 'react';

/**
 * Screen Size Breakpoints (matching common Android device sizes)
 */
export const BREAKPOINTS = {
  // Small phones (320-360px width)
  xs: 360,
  // Standard phones (360-480px width)
  sm: 480,
  // Large phones / Small tablets (480-768px width)
  md: 768,
  // Tablets (768-1024px width)
  lg: 1024,
  // Large tablets / Small desktops (1024-1280px width)
  xl: 1280,
  // Desktops (1280px+ width)
  xxl: 1920,
} as const;

/**
 * Device categories based on screen size
 */
export type DeviceCategory = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

/**
 * Screen dimension information
 */
export interface ScreenInfo {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
  isPortrait: boolean;
  isLandscape: boolean;
  deviceCategory: DeviceCategory;
  pixelDensity: number;
}

/**
 * Responsive size configuration for different screen categories
 */
interface ResponsiveSizeConfig {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  xxl?: number;
  default: number;
}

/**
 * Get current device category based on screen width
 */
function getDeviceCategory(width: number): DeviceCategory {
  if (width < BREAKPOINTS.xs) return 'xs';
  if (width < BREAKPOINTS.sm) return 'sm';
  if (width < BREAKPOINTS.md) return 'md';
  if (width < BREAKPOINTS.lg) return 'lg';
  if (width < BREAKPOINTS.xl) return 'xl';
  return 'xxl';
}

/**
 * Calculate scale factor relative to a base width (375px - iPhone standard)
 */
function calculateScale(width: number, baseWidth = 375): number {
  return width / baseWidth;
}

/**
 * Get pixel density (DPR - Device Pixel Ratio)
 */
function getPixelDensity(): number {
  return window.devicePixelRatio || 1;
}

/**
 * Hook to get current screen information with auto-updates on resize
 */
export function useScreenInfo(): ScreenInfo {
  const [screenInfo, setScreenInfo] = useState<ScreenInfo>(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const scale = calculateScale(width);
    const pixelDensity = getPixelDensity();
    
    return {
      width,
      height,
      scale,
      fontScale: scale,
      isPortrait: height > width,
      isLandscape: width > height,
      deviceCategory: getDeviceCategory(width),
      pixelDensity,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const scale = calculateScale(width);
      const pixelDensity = getPixelDensity();
      
      setScreenInfo({
        width,
        height,
        scale,
        fontScale: scale,
        isPortrait: height > width,
        isLandscape: width > height,
        deviceCategory: getDeviceCategory(width),
        pixelDensity,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return screenInfo;
}

/**
 * Hook to get responsive size based on current screen category
 * 
 * @example
 * const fontSize = useResponsiveSize({ xs: 12, sm: 14, md: 16, default: 14 });
 * const padding = useResponsiveSize({ xs: 8, sm: 12, md: 16, default: 12 });
 */
export function useResponsiveSize(config: ResponsiveSizeConfig): number {
  const { deviceCategory } = useScreenInfo();
  return config[deviceCategory] ?? config.default;
}

/**
 * Hook to get scaled size based on screen width
 * Automatically scales values relative to a 375px base width (iPhone standard)
 * 
 * @example
 * const buttonHeight = useScaledSize(44); // Will be 44px on 375px width, scales proportionally
 * const fontSize = useScaledSize(17); // Will be 17px on 375px width, scales proportionally
 */
export function useScaledSize(baseSize: number, baseWidth = 375): number {
  const { width } = useScreenInfo();
  return (baseSize * width) / baseWidth;
}

/**
 * Utility function to convert pixel value to responsive value
 * Can be used outside of React components
 */
export function getResponsiveValue(
  baseValue: number,
  screenWidth: number,
  baseWidth = 375
): number {
  return (baseValue * screenWidth) / baseWidth;
}

/**
 * Get safe area insets (for notched devices)
 */
export function useSafeAreaInsets() {
  const [insets, setInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    const updateInsets = () => {
      // Get CSS environment variables for safe area
      const computedStyle = getComputedStyle(document.documentElement);
      
      setInsets({
        top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
        right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
        left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0'),
      });
    };

    updateInsets();
    window.addEventListener('resize', updateInsets);
    
    return () => window.removeEventListener('resize', updateInsets);
  }, []);

  return insets;
}

/**
 * Responsive sizing helper - returns scaled sizes for common use cases
 */
export function useResponsiveSizes() {
  const { scale, deviceCategory } = useScreenInfo();

  // Define size multipliers for different categories
  // Optimized for 1080x2400 screens (xl category) - Compact for maximum content
  const sizeMultiplier = {
    xs: 0.85,  // Small phones - reduce by 15%
    sm: 0.95,  // Standard phones - reduce by 5%
    md: 1.0,   // Large phones - base size (375px-768px)
    lg: 1.0,   // Tablets - base size (768px-1024px)
    xl: 0.95,  // Large phones/phablets - reduce by 5% (1024px-1280px) - compact for 1080x2400
    xxl: 1.1,  // Desktops - increase by 10% (1280px+)
  };

  const multiplier = sizeMultiplier[deviceCategory];

  return {
    // Text sizes (compact for 1080x2400 - maximizes visible content)
    textXs: Math.round(10 * multiplier),
    textSm: Math.round(12 * multiplier),
    textBase: Math.round(14 * multiplier),
    textLg: Math.round(16 * multiplier),
    textXl: Math.round(18 * multiplier),
    text2xl: Math.round(20 * multiplier),
    text3xl: Math.round(24 * multiplier),

    // Spacing (compact for 1080px width - saves space)
    spacing1: Math.round(4 * multiplier),
    spacing2: Math.round(6 * multiplier),
    spacing3: Math.round(8 * multiplier),
    spacing4: Math.round(12 * multiplier),
    spacing5: Math.round(14 * multiplier),
    spacing6: Math.round(16 * multiplier),
    spacing8: Math.round(20 * multiplier),
    spacing10: Math.round(24 * multiplier),

    // Component sizes (compact but still touch-friendly)
    buttonHeight: Math.round(40 * multiplier),
    inputHeight: Math.round(40 * multiplier),
    iconSize: Math.round(18 * multiplier),
    iconSizeLg: Math.round(20 * multiplier),
    iconSizeXl: Math.round(24 * multiplier),
    avatarSize: Math.round(40 * multiplier),

    // Border radius (slightly smaller for compact look)
    radiusSm: Math.round(6 * multiplier),
    radiusMd: Math.round(8 * multiplier),
    radiusLg: Math.round(12 * multiplier),
    radiusXl: Math.round(16 * multiplier),
    radiusFull: 9999,

    // Grid gaps (compact for more products visible)
    gapSm: Math.round(6 * multiplier),
    gapMd: Math.round(8 * multiplier),
    gapLg: Math.round(12 * multiplier),
    gapXl: Math.round(16 * multiplier),

    // Card padding (compact to show more content)
    cardPadding: Math.round(10 * multiplier),
    cardPaddingLg: Math.round(12 * multiplier),

    // Product card specific (compact 3-column layout)
    productCardPadding: Math.round(10 * multiplier),
    productImageRadius: Math.round(12 * multiplier),

    // Scale factor for custom calculations
    scale: multiplier,
  };
}

export default useScreenInfo;

