import { useMemo } from 'react';
import { useScreenInfo } from './useResponsiveSize';

/**
 * Tablet-specific responsive sizing hook
 * Optimized for iPad devices with larger touch targets and better spacing
 */
export function useTabletSizes() {
  const screenInfo = useScreenInfo();

  return useMemo(() => {
    // Base scale for tablet (larger than mobile, smaller than desktop)
    const baseScale = 1.2;

    // iPad Pro gets slightly larger elements
    const isIPadPro = screenInfo.width >= 1024;
    const finalScale = isIPadPro ? baseScale * 1.1 : baseScale;

    return {
      // Text sizes (larger for tablet readability)
      textXs: Math.round(12 * finalScale),
      textSm: Math.round(14 * finalScale),
      textBase: Math.round(16 * finalScale),
      textLg: Math.round(18 * finalScale),
      textXl: Math.round(20 * finalScale),
      text2xl: Math.round(24 * finalScale),
      text3xl: Math.round(28 * finalScale),

      // Spacing (generous for touch)
      spacing1: Math.round(4 * finalScale),
      spacing2: Math.round(6 * finalScale),
      spacing3: Math.round(8 * finalScale),
      spacing4: Math.round(12 * finalScale),
      spacing5: Math.round(16 * finalScale),
      spacing6: Math.round(20 * finalScale),
      spacing8: Math.round(24 * finalScale),
      spacing10: Math.round(28 * finalScale),

      // Component sizes (touch-friendly)
      buttonHeight: Math.round(44 * finalScale), // Minimum 44px for touch
      inputHeight: Math.round(44 * finalScale),
      iconSize: Math.round(20 * finalScale),
      iconSizeLg: Math.round(24 * finalScale),
      iconSizeXl: Math.round(28 * finalScale),
      avatarSize: Math.round(44 * finalScale),

      // Border radius (softer, more iOS-like)
      radiusSm: Math.round(8 * finalScale),
      radiusMd: Math.round(12 * finalScale),
      radiusLg: Math.round(16 * finalScale),
      radiusXl: Math.round(20 * finalScale),
      radiusFull: 9999,

      // Grid gaps (comfortable spacing)
      gapSm: Math.round(8 * finalScale),
      gapMd: Math.round(12 * finalScale),
      gapLg: Math.round(16 * finalScale),
      gapXl: Math.round(20 * finalScale),

      // Card padding (generous for tablet screens)
      cardPadding: Math.round(16 * finalScale),
      cardPaddingLg: Math.round(20 * finalScale),

      // Product card specific (optimized for tablet grid)
      productCardPadding: Math.round(16 * finalScale),
      productImageRadius: Math.round(16 * finalScale),

      // Scale factor for custom calculations
      scale: finalScale,
    };
  }, [screenInfo.width]);
}