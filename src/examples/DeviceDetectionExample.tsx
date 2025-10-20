/**
 * Device Detection Examples
 * 
 * This file demonstrates various ways to use the device detection hooks
 * throughout the application for responsive and adaptive UIs.
 */

import React from 'react';
import { useDeviceDetection, useBreakpoint, useMediaQuery } from '../hooks/useDeviceDetection';

/**
 * Example 1: Basic Device Detection
 * Switch between mobile and desktop layouts
 */
export const BasicDeviceExample: React.FC = () => {
  const { isMobile, isTablet, isDesktop } = useDeviceDetection();

  return (
    <div className="p-4">
      {isMobile && (
        <div className="mobile-layout">
          <h2 className="text-xl font-bold">Mobile View</h2>
          <p>Optimized for small screens</p>
        </div>
      )}

      {isTablet && (
        <div className="tablet-layout">
          <h2 className="text-2xl font-bold">Tablet View</h2>
          <p>Optimized for medium screens</p>
        </div>
      )}

      {isDesktop && (
        <div className="desktop-layout">
          <h2 className="text-3xl font-bold">Desktop View</h2>
          <p>Full-featured desktop experience</p>
        </div>
      )}
    </div>
  );
};

/**
 * Example 2: Device Info Display
 * Show detailed device information
 */
export const DeviceInfoExample: React.FC = () => {
  const deviceInfo = useDeviceDetection();

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="font-bold mb-2">Device Information</h3>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="font-semibold">Device Type:</dt>
        <dd>{deviceInfo.deviceType}</dd>
        
        <dt className="font-semibold">Screen Size:</dt>
        <dd>{deviceInfo.screenWidth} × {deviceInfo.screenHeight}</dd>
        
        <dt className="font-semibold">Orientation:</dt>
        <dd className="capitalize">{deviceInfo.orientation}</dd>
        
        <dt className="font-semibold">Breakpoint:</dt>
        <dd className="uppercase">{deviceInfo.breakpoint}</dd>
        
        <dt className="font-semibold">Touch Device:</dt>
        <dd>{deviceInfo.isTouchDevice ? 'Yes' : 'No'}</dd>
      </dl>
    </div>
  );
};

/**
 * Example 3: Responsive Navigation
 * Different navigation styles based on device
 */
export const ResponsiveNavExample: React.FC = () => {
  const { isMobile } = useDeviceDetection();

  return (
    <nav className={isMobile ? 'mobile-nav' : 'desktop-nav'}>
      {isMobile ? (
        // Bottom navigation for mobile
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2">
          <button className="flex flex-col items-center">
            <span>🏠</span>
            <span className="text-xs">Home</span>
          </button>
          <button className="flex flex-col items-center">
            <span>📊</span>
            <span className="text-xs">Stats</span>
          </button>
          <button className="flex flex-col items-center">
            <span>⚙️</span>
            <span className="text-xs">Settings</span>
          </button>
        </div>
      ) : (
        // Sidebar navigation for desktop
        <div className="fixed left-0 top-0 h-screen w-64 bg-white border-r p-4">
          <button className="w-full py-2 px-4 text-left hover:bg-gray-100 rounded">
            🏠 Home
          </button>
          <button className="w-full py-2 px-4 text-left hover:bg-gray-100 rounded">
            📊 Statistics
          </button>
          <button className="w-full py-2 px-4 text-left hover:bg-gray-100 rounded">
            ⚙️ Settings
          </button>
        </div>
      )}
    </nav>
  );
};

/**
 * Example 4: Breakpoint-Based Layout
 * Use breakpoints for fine-grained control
 */
export const BreakpointLayoutExample: React.FC = () => {
  const isSmall = useBreakpoint('sm');
  const isMedium = useBreakpoint('md');
  const isLarge = useBreakpoint('lg');

  return (
    <div className={`
      grid gap-4 p-4
      ${isSmall ? 'grid-cols-1' : ''}
      ${isMedium ? 'md:grid-cols-2' : ''}
      ${isLarge ? 'lg:grid-cols-3' : ''}
    `}>
      <div className="p-4 bg-blue-100 rounded">Card 1</div>
      <div className="p-4 bg-green-100 rounded">Card 2</div>
      <div className="p-4 bg-purple-100 rounded">Card 3</div>
      <div className="p-4 bg-yellow-100 rounded">Card 4</div>
      <div className="p-4 bg-pink-100 rounded">Card 5</div>
      <div className="p-4 bg-indigo-100 rounded">Card 6</div>
    </div>
  );
};

/**
 * Example 5: Media Query Usage
 * Use custom media queries for specific scenarios
 */
export const MediaQueryExample: React.FC = () => {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const isHighRes = useMediaQuery('(min-resolution: 2dppx)');

  return (
    <div className={`p-4 rounded-lg ${prefersDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
      <h3 className="font-bold mb-3">System Preferences</h3>
      <ul className="space-y-2">
        <li className="flex items-center gap-2">
          <span>{prefersDark ? '🌙' : '☀️'}</span>
          <span>Color Scheme: {prefersDark ? 'Dark' : 'Light'}</span>
        </li>
        <li className="flex items-center gap-2">
          <span>{prefersReducedMotion ? '🐌' : '⚡'}</span>
          <span>Motion: {prefersReducedMotion ? 'Reduced' : 'Normal'}</span>
        </li>
        <li className="flex items-center gap-2">
          <span>{isPortrait ? '📱' : '🖥️'}</span>
          <span>Orientation: {isPortrait ? 'Portrait' : 'Landscape'}</span>
        </li>
        <li className="flex items-center gap-2">
          <span>{isHighRes ? '✨' : '📺'}</span>
          <span>Display: {isHighRes ? 'Retina' : 'Standard'}</span>
        </li>
      </ul>
    </div>
  );
};

/**
 * Example 6: Conditional Component Loading
 * Load different components based on device type
 */
export const ConditionalLoadingExample: React.FC = () => {
  const { isMobile, isDesktop } = useDeviceDetection();

  // Load different components for different devices
  const MobileGallery = () => (
    <div className="space-y-2">
      <h3 className="font-bold">Mobile Gallery</h3>
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="aspect-square bg-gray-200 rounded" />
        ))}
      </div>
    </div>
  );

  const DesktopGallery = () => (
    <div className="space-y-4">
      <h3 className="font-bold text-xl">Desktop Gallery</h3>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="aspect-square bg-gray-200 rounded" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-4">
      {isMobile && <MobileGallery />}
      {isDesktop && <DesktopGallery />}
    </div>
  );
};

/**
 * Example 7: Touch-Optimized Controls
 * Adjust control sizes based on touch capability
 */
export const TouchOptimizedExample: React.FC = () => {
  const { isTouchDevice } = useDeviceDetection();

  const buttonClass = isTouchDevice
    ? 'px-6 py-4 text-lg' // Larger for touch
    : 'px-4 py-2 text-base'; // Smaller for mouse

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-bold">
        {isTouchDevice ? 'Touch Controls' : 'Mouse Controls'}
      </h3>
      <div className="flex gap-2">
        <button className={`${buttonClass} bg-blue-500 text-white rounded`}>
          Primary
        </button>
        <button className={`${buttonClass} bg-gray-500 text-white rounded`}>
          Secondary
        </button>
      </div>
    </div>
  );
};

/**
 * Example 8: Orientation-Aware Layout
 * Different layouts for portrait vs landscape
 */
export const OrientationAwareExample: React.FC = () => {
  const { orientation } = useDeviceDetection();

  return (
    <div className="p-4">
      <h3 className="font-bold mb-4">Orientation: {orientation}</h3>
      <div className={`
        grid gap-4
        ${orientation === 'portrait' ? 'grid-cols-1 grid-rows-3' : 'grid-cols-3 grid-rows-1'}
      `}>
        <div className="p-8 bg-red-100 rounded">Panel 1</div>
        <div className="p-8 bg-blue-100 rounded">Panel 2</div>
        <div className="p-8 bg-green-100 rounded">Panel 3</div>
      </div>
    </div>
  );
};

/**
 * Example 9: Complete Responsive Page
 * Combining multiple techniques
 */
export const ResponsivePageExample: React.FC = () => {
  const { isMobile, deviceType, breakpoint } = useDeviceDetection();
  const isLarge = useBreakpoint('lg');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className={`
        bg-white shadow-sm
        ${isMobile ? 'px-4 py-3' : 'px-8 py-4'}
      `}>
        <h1 className={`font-bold ${isMobile ? 'text-xl' : 'text-3xl'}`}>
          Responsive App
        </h1>
        <p className="text-sm text-gray-600">
          Device: {deviceType} • Breakpoint: {breakpoint}
        </p>
      </header>

      {/* Main Content */}
      <main className={`
        ${isMobile ? 'p-4' : 'p-8'}
        ${isLarge ? 'max-w-7xl mx-auto' : ''}
      `}>
        <div className={`
          grid gap-4
          ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}
        `}>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="font-bold mb-2">Card 1</h2>
            <p className="text-gray-600">Content adapts to screen size</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="font-bold mb-2">Card 2</h2>
            <p className="text-gray-600">Responsive grid layout</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="font-bold mb-2">Card 3</h2>
            <p className="text-gray-600">Mobile-first design</p>
          </div>
        </div>
      </main>

      {/* Footer/Navigation */}
      {isMobile ? (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-2">
          <div className="flex justify-around">
            <button className="p-2">🏠</button>
            <button className="p-2">📊</button>
            <button className="p-2">⚙️</button>
          </div>
        </div>
      ) : (
        <footer className="mt-8 bg-white border-t p-8">
          <div className="max-w-7xl mx-auto flex justify-between">
            <div>© 2025 Your App</div>
            <div className="flex gap-4">
              <a href="#" className="hover:text-blue-600">Home</a>
              <a href="#" className="hover:text-blue-600">About</a>
              <a href="#" className="hover:text-blue-600">Contact</a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

/**
 * Example 10: All Examples Combined Demo
 * Interactive showcase of all device detection features
 */
export const AllExamplesDemo: React.FC = () => {
  const [activeExample, setActiveExample] = React.useState<string>('info');

  const examples = [
    { id: 'info', label: 'Device Info', component: DeviceInfoExample },
    { id: 'basic', label: 'Basic Detection', component: BasicDeviceExample },
    { id: 'nav', label: 'Responsive Nav', component: ResponsiveNavExample },
    { id: 'breakpoint', label: 'Breakpoints', component: BreakpointLayoutExample },
    { id: 'media', label: 'Media Queries', component: MediaQueryExample },
    { id: 'loading', label: 'Conditional Loading', component: ConditionalLoadingExample },
    { id: 'touch', label: 'Touch Optimized', component: TouchOptimizedExample },
    { id: 'orientation', label: 'Orientation', component: OrientationAwareExample },
    { id: 'page', label: 'Full Page', component: ResponsivePageExample },
  ];

  const ActiveComponent = examples.find(e => e.id === activeExample)?.component || DeviceInfoExample;

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Device Detection Examples</h1>
        
        {/* Example Selector */}
        <div className="mb-6 flex flex-wrap gap-2">
          {examples.map(example => (
            <button
              key={example.id}
              onClick={() => setActiveExample(example.id)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeExample === example.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-200'
              }`}
            >
              {example.label}
            </button>
          ))}
        </div>

        {/* Active Example */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
};

export default AllExamplesDemo;

