import React, { useEffect } from 'react';
import { useScreenInfo, useResponsiveSizes } from '../../../hooks/useResponsiveSize';

interface ResponsiveMobileWrapperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Responsive wrapper for mobile components
 * Automatically adjusts sizing based on screen dimensions
 */
export const ResponsiveMobileWrapper: React.FC<ResponsiveMobileWrapperProps> = ({
  children,
  className = '',
}) => {
  const screenInfo = useScreenInfo();
  const sizes = useResponsiveSizes();

  // Log screen info for debugging (remove in production)
  useEffect(() => {
    console.log('📱 Screen Info:', {
      width: screenInfo.width,
      height: screenInfo.height,
      category: screenInfo.deviceCategory,
      scale: sizes.scale,
      isPortrait: screenInfo.isPortrait,
      pixelDensity: screenInfo.pixelDensity,
    });
  }, [screenInfo.deviceCategory]);

  // Apply responsive CSS variables to the wrapper
  const style = {
    '--screen-width': `${screenInfo.width}px`,
    '--screen-height': `${screenInfo.height}px`,
    '--scale-factor': sizes.scale,
    '--text-base-size': `${sizes.textBase}px`,
    '--spacing-base': `${sizes.spacing4}px`,
    '--button-height': `${sizes.buttonHeight}px`,
  } as React.CSSProperties;

  return (
    <div
      className={`responsive-mobile-container ${className}`}
      style={style}
      data-device-category={screenInfo.deviceCategory}
      data-orientation={screenInfo.isPortrait ? 'portrait' : 'landscape'}
    >
      {children}
    </div>
  );
};

export default ResponsiveMobileWrapper;

