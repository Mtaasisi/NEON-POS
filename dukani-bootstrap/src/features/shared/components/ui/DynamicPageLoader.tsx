/**
 * DynamicPageLoader Component
 * Shows skeleton while lazy-loaded pages load
 * Works with unified loading system - non-blocking!
 * Now includes TopBar and Sidebar for better UX during loading
 */

import React, { useState } from 'react';
import TopBar from '../TopBar';

interface DynamicPageLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const DynamicPageLoader: React.FC<DynamicPageLoaderProps> = ({
  message = 'Loading page...',
  size = 'md',
  className = ''
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNavCollapsed] = useState(false); // Default to expanded for loading state

  return (
    <div className={`min-h-screen ${className}`} style={{ backgroundColor: 'transparent' }}>
      {/* Real TopBar - Always visible during loading */}
      <TopBar
        onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
        isMenuOpen={isMenuOpen}
        isNavCollapsed={isNavCollapsed}
      />

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Skeleton Sidebar */}
      <div
        className="fixed top-0 bottom-0 left-0 z-40 w-64 md:w-72 bg-white/80 backdrop-blur-xl border-r border-white/30 shadow-lg md:block hidden"
      >
        <div className="animate-pulse flex flex-col h-full">
          {/* Logo/Brand Section */}
          <div className="p-6 border-b border-gray-200/50" style={{ marginTop: '64px' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              <div className="h-5 w-24 bg-gray-200 rounded"></div>
            </div>
          </div>

          {/* Navigation Items Skeleton */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                <div className="w-5 h-5 bg-gray-200 rounded"></div>
                <div className="h-4 flex-1 bg-gray-200 rounded"></div>
                {i <= 3 && <div className="w-5 h-5 bg-gray-200 rounded-full"></div>}
              </div>
            ))}
          </nav>

          {/* Bottom Section */}
          <div className="p-4 border-t border-gray-200/50">
            <div className="flex items-center gap-3 p-3 rounded-lg">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 w-20 bg-gray-200 rounded mb-1"></div>
                <div className="h-3 w-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Skeleton */}
      <main className="transition-all duration-500 min-h-screen relative z-10 pt-[140px] pb-8 md:ml-72">
        <div className="animate-pulse">
          {/* Content Skeleton */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Title Section */}
            <div className="mb-6">
              <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-64 bg-gray-200 rounded"></div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="h-4 w-20 bg-gray-200 rounded mb-3"></div>
                  <div className="h-8 w-24 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 w-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Large content area */}
              <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
                <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex gap-4 items-center">
                      <div className="h-16 w-16 bg-gray-200 rounded"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                        <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar Content */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="h-6 w-24 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Loading handled by GlobalLoadingProgress in top-right corner */}
    </div>
  );
};

export default DynamicPageLoader;
