import { useState, useCallback } from 'react';

type WidgetSize = 'small' | 'medium' | 'large';

interface WidgetSizes {
  [key: string]: WidgetSize;
}

export const useWidgetSize = (storageKey: string) => {
  // Load saved sizes from localStorage if available
  const loadSizes = (): WidgetSizes => {
    if (typeof window === 'undefined') return {};
    
    try {
      const saved = localStorage.getItem(`widget-sizes-${storageKey}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  const [widgetSizes, setWidgetSizes] = useState<WidgetSizes>(loadSizes);

  // Save sizes to localStorage
  const saveSizes = useCallback((sizes: WidgetSizes) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(`widget-sizes-${storageKey}`, JSON.stringify(sizes));
    } catch (error) {
      console.error('Failed to save widget sizes:', error);
    }
  }, [storageKey]);

  // Get size for a specific widget (default to 'medium')
  const getSize = useCallback((widgetId: string): WidgetSize => {
    return widgetSizes[widgetId] || 'medium';
  }, [widgetSizes]);

  // Update size for a specific widget
  const updateSize = useCallback((widgetId: string, size: WidgetSize) => {
    setWidgetSizes(prev => {
      const newSizes = { ...prev, [widgetId]: size };
      saveSizes(newSizes);
      return newSizes;
    });
  }, [saveSizes]);

  // Get grid column span class for a given size
  const getColSpan = useCallback((size: WidgetSize): string => {
    switch (size) {
      case 'small':
        return 'col-span-1';
      case 'medium':
        return 'col-span-2';
      case 'large':
        return 'col-span-3';
      default:
        return 'col-span-2';
    }
  }, []);

  return {
    getSize,
    updateSize,
    getColSpan,
    widgetSizes
  };
};

