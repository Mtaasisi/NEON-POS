/**
 * OptimizedLazyImage Component
 * ⚡ High-performance lazy loading with intelligent caching and memory management
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface OptimizedLazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
  priority?: boolean; // For above-the-fold images
  quality?: number; // Image quality (1-100)
  sizes?: string; // Responsive image sizes
  rootMargin?: string; // Intersection observer margin
  threshold?: number; // Intersection observer threshold
  style?: React.CSSProperties;
}

// Global image cache to prevent duplicate loads and memory waste
const imageCache = new Map<string, {
  blob?: string;
  status: 'loading' | 'loaded' | 'error';
  subscribers: Set<(blob: string | null) => void>;
}>();

// Global intersection observer for better performance
let globalObserver: IntersectionObserver | null = null;
const observedElements = new WeakMap<Element, () => void>();

function getGlobalObserver(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
  if (!globalObserver) {
    globalObserver = new IntersectionObserver(callback, {
      rootMargin: '50px', // Start loading 50px before entering viewport
      threshold: 0.1,
      ...options
    });
  }
  return globalObserver;
}

const OptimizedLazyImage: React.FC<OptimizedLazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholder,
  fallbackSrc,
  onLoad,
  onError,
  priority = false,
  quality = 80,
  sizes = '100vw',
  rootMargin = '50px',
  threshold = 0.1,
  style
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority); // Load immediately if priority
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate optimized image URL if supported
  const getOptimizedSrc = useCallback((originalSrc: string) => {
    // You can integrate with image optimization services here
    // For now, we'll use the original src
    return originalSrc;
  }, []);

  // Load image with caching
  const loadImage = useCallback(async (imageUrl: string) => {
    const optimizedUrl = getOptimizedSrc(imageUrl);

    // Check cache first
    const cached = imageCache.get(optimizedUrl);
    if (cached) {
      if (cached.status === 'loaded' && cached.blob) {
        setImageSrc(cached.blob);
        setIsLoading(false);
        onLoad?.();
        return;
      } else if (cached.status === 'loading') {
        // Subscribe to loading result
        cached.subscribers.add((blob) => {
          if (blob) {
            setImageSrc(blob);
            setIsLoading(false);
            onLoad?.();
          } else {
            setHasError(true);
            setIsLoading(false);
            onError?.();
          }
        });
        return;
      } else if (cached.status === 'error') {
        setHasError(true);
        setIsLoading(false);
        onError?.();
        return;
      }
    }

    // Start loading
    setIsLoading(true);
    const cacheEntry = {
      status: 'loading' as const,
      subscribers: new Set<() => void>()
    };
    imageCache.set(optimizedUrl, cacheEntry);

    try {
      // Use fetch with proper caching headers
      const response = await fetch(optimizedUrl, {
        cache: 'default', // Use browser cache
        headers: {
          'Accept': 'image/webp,image/*,*/*;q=0.8'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      // Update cache
      cacheEntry.status = 'loaded';
      cacheEntry.blob = objectUrl;

      // Notify subscribers
      cacheEntry.subscribers.forEach(callback => callback(objectUrl));
      cacheEntry.subscribers.clear();

      setImageSrc(objectUrl);
      setIsLoading(false);
      onLoad?.();

    } catch (error) {
      console.warn('Image load failed:', optimizedUrl, error);

      // Update cache
      cacheEntry.status = 'error';

      // Notify subscribers
      cacheEntry.subscribers.forEach(callback => callback(null));
      cacheEntry.subscribers.clear();

      setHasError(true);
      setIsLoading(false);
      onError?.();

      // Try fallback if available
      if (fallbackSrc && fallbackSrc !== imageUrl) {
        loadImage(fallbackSrc);
      }
    }
  }, [getOptimizedSrc, onLoad, onError, fallbackSrc]);

  // Intersection observer callback
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !isInView) {
        setIsInView(true);
      }
    });
  }, [isInView]);

  // Set up intersection observer
  useEffect(() => {
    if (priority || isInView) return; // Already loading or priority

    const element = containerRef.current;
    if (!element) return;

    const observer = getGlobalObserver(handleIntersection, { rootMargin, threshold });
    observer.observe(element);

    // Store cleanup function
    observedElements.set(element, () => observer.unobserve(element));

    return () => {
      const cleanup = observedElements.get(element);
      if (cleanup) {
        cleanup();
        observedElements.delete(element);
      }
    };
  }, [priority, isInView, handleIntersection, rootMargin, threshold]);

  // Load image when in view
  useEffect(() => {
    if ((priority || isInView) && !imageSrc && !hasError && src) {
      loadImage(src);
    }
  }, [priority, isInView, imageSrc, hasError, src, loadImage]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (imageSrc && imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [imageSrc]);

  // Generate placeholder
  const placeholderSrc = placeholder || `data:image/svg+xml;base64,${btoa(`
    <svg width="400" height="300" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="300" fill="#F3F4F6"/>
      <text x="200" y="150" font-family="Arial, sans-serif" font-size="16" fill="#6B6B6B" text-anchor="middle" dy=".3em">Loading...</text>
    </svg>
  `)}`;

  return (
    <div ref={containerRef} className={`relative ${className}`} style={style}>
      {/* Placeholder/Loading state */}
      {(!imageSrc || isLoading) && !hasError && (
        <img
          src={placeholderSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-sm scale-105"
          style={{ filter: 'blur(10px)' }}
        />
      )}

      {/* Main image */}
      {imageSrc && !hasError && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Image unavailable</p>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-10 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

// Utility function to preload critical images
export const preloadCriticalImages = (srcs: string[]) => {
  srcs.forEach(src => {
    const img = new Image();
    img.src = src;
  });
};

// Utility function to clear image cache (useful for memory management)
export const clearImageCache = () => {
  imageCache.forEach(entry => {
    if (entry.blob && entry.blob.startsWith('blob:')) {
      URL.revokeObjectURL(entry.blob);
    }
  });
  imageCache.clear();
};

export default OptimizedLazyImage;
