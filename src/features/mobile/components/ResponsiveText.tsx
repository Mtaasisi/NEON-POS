import React from 'react';
import { useResponsiveSizes } from '../../../hooks/useResponsiveSize';

interface ResponsiveTextProps {
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  className?: string;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div';
}

/**
 * Responsive text component that automatically scales based on screen size
 */
export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  size = 'base',
  weight = 'normal',
  className = '',
  as: Component = 'span',
}) => {
  const sizes = useResponsiveSizes();

  const sizeMap = {
    xs: sizes.textXs,
    sm: sizes.textSm,
    base: sizes.textBase,
    lg: sizes.textLg,
    xl: sizes.textXl,
    '2xl': sizes.text2xl,
    '3xl': sizes.text3xl,
  };

  const weightMap = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  const fontSize = sizeMap[size];
  const fontWeight = weightMap[weight];

  return (
    <Component
      className={`${fontWeight} ${className}`}
      style={{ fontSize: `${fontSize}px` }}
    >
      {children}
    </Component>
  );
};

interface ResponsiveIconProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Responsive icon wrapper that scales icons based on screen size
 */
export const ResponsiveIcon: React.FC<ResponsiveIconProps> = ({
  children,
  size = 'md',
  className = '',
}) => {
  const sizes = useResponsiveSizes();

  const sizeMap = {
    sm: sizes.iconSize * 0.8,
    md: sizes.iconSize,
    lg: sizes.iconSizeLg,
  };

  const iconSize = sizeMap[size];

  // Clone the child element and add size props
  const iconElement = React.Children.only(children) as React.ReactElement;
  const clonedIcon = React.cloneElement(iconElement, {
    ...iconElement.props,
    size: Math.round(iconSize),
    className: `${iconElement.props.className || ''} ${className}`,
  });

  return <>{clonedIcon}</>;
};

interface ResponsiveSpacingProps {
  children: React.ReactNode;
  type?: 'padding' | 'margin' | 'gap';
  size?: 1 | 2 | 3 | 4 | 5 | 6 | 8;
  direction?: 'all' | 'x' | 'y' | 't' | 'r' | 'b' | 'l';
  className?: string;
}

/**
 * Responsive spacing component
 */
export const ResponsiveSpacing: React.FC<ResponsiveSpacingProps> = ({
  children,
  type = 'padding',
  size = 4,
  direction = 'all',
  className = '',
}) => {
  const sizes = useResponsiveSizes();

  const spacingSizeMap = {
    1: sizes.spacing1,
    2: sizes.spacing2,
    3: sizes.spacing3,
    4: sizes.spacing4,
    5: sizes.spacing5,
    6: sizes.spacing6,
    8: sizes.spacing8,
  };

  const spacing = spacingSizeMap[size];

  const getSpacingStyle = () => {
    const baseStyle: React.CSSProperties = {};
    const property = type;

    switch (direction) {
      case 'all':
        baseStyle[property] = `${spacing}px`;
        break;
      case 'x':
        baseStyle[`${property}Left`] = `${spacing}px`;
        baseStyle[`${property}Right`] = `${spacing}px`;
        break;
      case 'y':
        baseStyle[`${property}Top`] = `${spacing}px`;
        baseStyle[`${property}Bottom`] = `${spacing}px`;
        break;
      case 't':
        baseStyle[`${property}Top`] = `${spacing}px`;
        break;
      case 'r':
        baseStyle[`${property}Right`] = `${spacing}px`;
        break;
      case 'b':
        baseStyle[`${property}Bottom`] = `${spacing}px`;
        break;
      case 'l':
        baseStyle[`${property}Left`] = `${spacing}px`;
        break;
    }

    return baseStyle;
  };

  return (
    <div className={className} style={getSpacingStyle()}>
      {children}
    </div>
  );
};

export default ResponsiveText;

