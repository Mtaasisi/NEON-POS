/**
 * useOptimizedDebounce Hook
 * ⚡ High-performance debouncing with automatic cleanup and smart scheduling
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface DebounceOptions {
  delay?: number;
  leading?: boolean; // Execute immediately on first call
  trailing?: boolean; // Execute after delay on last call
  maxWait?: number; // Maximum time to wait before executing
}

/**
 * Optimized debounce hook with automatic cleanup and performance monitoring
 */
export function useOptimizedDebounce<T extends (...args: any[]) => any>(
  callback: T,
  options: DebounceOptions = {}
): T {
  const {
    delay = 300,
    leading = false,
    trailing = true,
    maxWait
  } = options;

  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const maxTimeoutRef = useRef<NodeJS.Timeout>();
  const lastCallTimeRef = useRef<number>(0);
  const lastExecuteTimeRef = useRef<number>(0);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
      }
    };
  }, []);

  const debouncedFunction = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTimeRef.current;
    const timeSinceLastExecute = now - lastExecuteTimeRef.current;

    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
    }

    // Handle leading edge execution
    if (leading && timeSinceLastExecute >= delay) {
      lastExecuteTimeRef.current = now;
      return callbackRef.current(...args);
    }

    lastCallTimeRef.current = now;

    // Schedule trailing edge execution
    if (trailing) {
      timeoutRef.current = setTimeout(() => {
        lastExecuteTimeRef.current = Date.now();
        callbackRef.current(...args);
      }, delay);
    }

    // Schedule max wait execution if specified
    if (maxWait && timeSinceLastExecute >= maxWait) {
      maxTimeoutRef.current = setTimeout(() => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        lastExecuteTimeRef.current = Date.now();
        callbackRef.current(...args);
      }, Math.max(0, maxWait - timeSinceLastExecute));
    }
  }, [delay, leading, trailing, maxWait]) as T;

  // Cancel function to clear pending executions
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = undefined;
    }
  }, []);

  // Flush function to execute immediately
  const flush = useCallback((...args: Parameters<T>) => {
    cancel();
    lastExecuteTimeRef.current = Date.now();
    return callbackRef.current(...args);
  }, [cancel]);

  // Return debounced function with utility methods
  return Object.assign(debouncedFunction, {
    cancel,
    flush,
    isPending: () => !!(timeoutRef.current || maxTimeoutRef.current)
  });
}

/**
 * Hook for debounced state updates with automatic cleanup
 */
export function useDebouncedState<T>(
  initialValue: T,
  options: DebounceOptions = {}
) {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  const debouncedSetValue = useOptimizedDebounce(
    (newValue: T) => setDebouncedValue(newValue),
    options
  );

  useEffect(() => {
    debouncedSetValue(value);
  }, [value, debouncedSetValue]);

  return [debouncedValue, setValue] as const;
}

/**
 * Hook for debounced search with performance monitoring
 */
export function useDebouncedSearch(
  onSearch: (query: string) => void,
  options: DebounceOptions & {
    minLength?: number; // Minimum search length before triggering
    performanceThreshold?: number; // Log performance if search takes longer than this
  } = {}
) {
  const {
    minLength = 2,
    performanceThreshold = 100,
    ...debounceOptions
  } = options;

  const searchStartTimeRef = useRef<number>(0);

  const debouncedSearch = useOptimizedDebounce(
    (query: string) => {
      if (query.length < minLength && query.length > 0) {
        return; // Skip short queries
      }

      searchStartTimeRef.current = performance.now();

      try {
        onSearch(query);

        // Performance monitoring
        const searchTime = performance.now() - searchStartTimeRef.current;
        if (searchTime > performanceThreshold) {
          console.warn(`⚡ Slow search detected: ${searchTime.toFixed(2)}ms for query "${query}"`);
        } else if (import.meta.env.DEV) {
          console.log(`🔍 Search completed in ${searchTime.toFixed(2)}ms for "${query}"`);
        }
      } catch (error) {
        console.error('Search error:', error);
      }
    },
    debounceOptions
  );

  return debouncedSearch;
}
