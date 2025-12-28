/**
 * Responsive Utility Functions
 * Provides helper functions for responsive styling without React hooks
 */

import { BREAKPOINTS, DeviceCategory } from '../hooks/useResponsiveSize';

/**
 * Get current device category based on window width
 */
export function getCurrentDeviceCategory(): DeviceCategory {
  const width = window.innerWidth;
  
  if (width < BREAKPOINTS.xs) return 'xs';
  if (width < BREAKPOINTS.sm) return 'sm';
  if (width < BREAKPOINTS.md) return 'md';
  if (width < BREAKPOINTS.lg) return 'lg';
  if (width < BREAKPOINTS.xl) return 'xl';
  return 'xxl';
}

/**
 * Scale a size value based on current screen width
 * @param baseSize - Size at base width (375px)
 * @param baseWidth - Base width for scaling (default: 375)
 */
export function scaleSize(baseSize: number, baseWidth = 375): number {
  const currentWidth = window.innerWidth;
  return Math.round((baseSize * currentWidth) / baseWidth);
}

/**
 * Get responsive font size class names for Tailwind
 */
export function getResponsiveFontClass(baseSizeClass: string): string {
  const category = getCurrentDeviceCategory();
  
  // Map base Tailwind text classes to responsive variants
  const fontScaleMap: Record<DeviceCategory, Record<string, string>> = {
    xs: {
      'text-xs': 'text-[10px]',
      'text-sm': 'text-[11px]',
      'text-base': 'text-[13px]',
      'text-lg': 'text-[15px]',
      'text-xl': 'text-[17px]',
      'text-2xl': 'text-[20px]',
      'text-3xl': 'text-[24px]',
    },
    sm: {
      'text-xs': 'text-[11px]',
      'text-sm': 'text-[12px]',
      'text-base': 'text-[14px]',
      'text-lg': 'text-[16px]',
      'text-xl': 'text-[18px]',
      'text-2xl': 'text-[22px]',
      'text-3xl': 'text-[26px]',
    },
    md: {
      'text-xs': 'text-xs',
      'text-sm': 'text-sm',
      'text-base': 'text-base',
      'text-lg': 'text-lg',
      'text-xl': 'text-xl',
      'text-2xl': 'text-2xl',
      'text-3xl': 'text-3xl',
    },
    lg: {
      'text-xs': 'text-sm',
      'text-sm': 'text-base',
      'text-base': 'text-lg',
      'text-lg': 'text-xl',
      'text-xl': 'text-2xl',
      'text-2xl': 'text-3xl',
      'text-3xl': 'text-4xl',
    },
    xl: {
      'text-xs': 'text-sm',
      'text-sm': 'text-base',
      'text-base': 'text-lg',
      'text-lg': 'text-xl',
      'text-xl': 'text-2xl',
      'text-2xl': 'text-3xl',
      'text-3xl': 'text-4xl',
    },
    xxl: {
      'text-xs': 'text-base',
      'text-sm': 'text-lg',
      'text-base': 'text-xl',
      'text-lg': 'text-2xl',
      'text-xl': 'text-3xl',
      'text-2xl': 'text-4xl',
      'text-3xl': 'text-5xl',
    },
  };
  
  return fontScaleMap[category][baseSizeClass] || baseSizeClass;
}

/**
 * Get responsive spacing class names for Tailwind
 */
export function getResponsiveSpacingClass(baseClass: string): string {
  const category = getCurrentDeviceCategory();
  
  // Scale spacing for different device categories
  const spacingScaleMap: Record<DeviceCategory, Record<string, string>> = {
    xs: {
      'p-4': 'p-3',
      'p-6': 'p-4',
      'p-8': 'p-5',
      'px-4': 'px-3',
      'px-6': 'px-4',
      'py-4': 'py-3',
      'gap-4': 'gap-3',
      'gap-6': 'gap-4',
    },
    sm: {
      'p-4': 'p-3',
      'p-6': 'p-5',
      'p-8': 'p-6',
      'px-4': 'px-3',
      'px-6': 'px-5',
      'py-4': 'py-3',
      'gap-4': 'gap-3',
      'gap-6': 'gap-5',
    },
    md: {
      // Base spacing - no change
    },
    lg: {
      'p-4': 'p-5',
      'p-6': 'p-7',
      'p-8': 'p-10',
      'px-4': 'px-5',
      'px-6': 'px-7',
      'py-4': 'py-5',
      'gap-4': 'gap-5',
      'gap-6': 'gap-7',
    },
    xl: {
      'p-4': 'p-6',
      'p-6': 'p-8',
      'p-8': 'p-10',
      'px-4': 'px-6',
      'px-6': 'px-8',
      'py-4': 'py-6',
      'gap-4': 'gap-6',
      'gap-6': 'gap-8',
    },
    xxl: {
      'p-4': 'p-6',
      'p-6': 'p-8',
      'p-8': 'p-12',
      'px-4': 'px-6',
      'px-6': 'px-8',
      'py-4': 'py-6',
      'gap-4': 'gap-6',
      'gap-6': 'gap-8',
    },
  };
  
  return spacingScaleMap[category]?.[baseClass] || baseClass;
}

/**
 * Generate responsive inline styles
 */
export function getResponsiveStyles(baseStyles: React.CSSProperties): React.CSSProperties {
  const category = getCurrentDeviceCategory();
  const scale = getScaleForCategory(category);
  
  const scaledStyles: React.CSSProperties = {};
  
  // Scale numeric values
  Object.entries(baseStyles).forEach(([key, value]) => {
    if (typeof value === 'number') {
      scaledStyles[key as any] = Math.round(value * scale);
    } else if (typeof value === 'string' && value.endsWith('px')) {
      const numValue = parseInt(value);
      if (!isNaN(numValue)) {
        scaledStyles[key as any] = `${Math.round(numValue * scale)}px`;
      } else {
        scaledStyles[key as any] = value;
      }
    } else {
      scaledStyles[key as any] = value;
    }
  });
  
  return scaledStyles;
}

/**
 * Get scale factor for device category
 */
function getScaleForCategory(category: DeviceCategory): number {
  const scaleMap: Record<DeviceCategory, number> = {
    xs: 0.85,
    sm: 0.95,
    md: 1.0,
    lg: 1.1,
    xl: 1.2,
    xxl: 1.3,
  };
  
  return scaleMap[category];
}

/**
 * Generate responsive grid columns class
 */
export function getResponsiveGridCols(baseColumns: number): string {
  const category = getCurrentDeviceCategory();
  
  const gridMap: Record<DeviceCategory, Record<number, string>> = {
    xs: {
      1: 'grid-cols-1',
      2: 'grid-cols-1',
      3: 'grid-cols-2',
      4: 'grid-cols-2',
    },
    sm: {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-2',
      4: 'grid-cols-2',
    },
    md: {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-2',
      4: 'grid-cols-3',
    },
    lg: {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
    },
    xl: {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
    },
    xxl: {
      1: 'grid-cols-2',
      2: 'grid-cols-3',
      3: 'grid-cols-4',
      4: 'grid-cols-5',
    },
  };
  
  return gridMap[category][baseColumns] || `grid-cols-${baseColumns}`;
}

/**
 * Check if device is in portrait mode
 */
export function isPortrait(): boolean {
  return window.innerHeight > window.innerWidth;
}

/**
 * Check if device is in landscape mode
 */
export function isLandscape(): boolean {
  return window.innerWidth > window.innerHeight;
}

/**
 * Get device pixel ratio
 */
export function getDevicePixelRatio(): number {
  return window.devicePixelRatio || 1;
}

/**
 * Get viewport dimensions
 */
export function getViewportDimensions() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    ratio: window.innerWidth / window.innerHeight,
  };
}

/**
 * Create responsive CSS value
 * @example
 * responsive({ xs: 12, sm: 14, md: 16, default: 14 })
 */
export function responsive<T>(config: {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  xxl?: T;
  default: T;
}): T {
  const category = getCurrentDeviceCategory();
  return config[category] ?? config.default;
}

/**
 * Create responsive style object
 */
export function createResponsiveStyle(
  baseSize: number,
  property: 'fontSize' | 'padding' | 'margin' | 'width' | 'height' | 'gap'
): React.CSSProperties {
  const value = scaleSize(baseSize);
  return { [property]: `${value}px` };
}

/**
 * Clamp a value between min and max for responsive sizing
 */
export function clampSize(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generate media query for specific breakpoint
 */
export function getMediaQuery(breakpoint: keyof typeof BREAKPOINTS): string {
  return `(min-width: ${BREAKPOINTS[breakpoint]}px)`;
}

/**
 * Check if current screen matches a media query
 */
export function matchesMediaQuery(query: string): boolean {
  return window.matchMedia(query).matches;
}

