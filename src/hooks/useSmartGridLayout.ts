import { useMemo } from 'react';
import { useDashboardSettings } from './useDashboardSettings';
import { calculateSmartGridLayout, getWidgetPriority, createResponsiveGrid, WidgetInfo } from '../utils/smartGridLayout';

/**
 * Hook for smart grid layout that automatically fills empty spaces
 */
export function useSmartGridLayout() {
  const { isWidgetEnabled, getWidgetColumnSpan, getAutoArrange } = useDashboardSettings();

  /**
   * Create smart layout for a group of widgets
   */
  const createSmartLayout = (widgetKeys: string[], maxColumns: number = 3) => {
    const widgets: WidgetInfo[] = widgetKeys.map(key => ({
      key,
      enabled: isWidgetEnabled(key as any),
      columnSpan: getWidgetColumnSpan(key),
      priority: getWidgetPriority(key)
    }));

    return calculateSmartGridLayout(widgets, maxColumns);
  };

  /**
   * Create responsive layout that adapts to screen size
   */
  const createResponsiveLayout = (widgetKeys: string[], screenSize: 'sm' | 'md' | 'lg' | 'xl' = 'lg') => {
    const widgets: WidgetInfo[] = widgetKeys.map(key => ({
      key,
      enabled: isWidgetEnabled(key as any),
      columnSpan: getWidgetColumnSpan(key),
      priority: getWidgetPriority(key)
    }));

    return createResponsiveGrid(widgets, screenSize);
  };

  /**
   * Auto-arrange widgets to fill all available space
   * Expands the LAST widget to fill remaining space ONLY if autoArrange is enabled
   */
  const autoArrangeWidgets = (widgetKeys: string[]) => {
    const enabledWidgets = widgetKeys.filter(key => isWidgetEnabled(key as any));
    const autoArrange = getAutoArrange();
    
    if (enabledWidgets.length === 0) {
      return {
        gridTemplateColumns: 'repeat(3, 1fr)',
        widgets: []
      };
    }

    // Calculate total space needed
    const totalSpan = enabledWidgets.reduce((sum, key) => sum + getWidgetColumnSpan(key), 0);
    
    // If autoArrange is enabled AND we have extra space, expand the last widget
    if (autoArrange && totalSpan < 3) {
      const availableSpace = 3 - totalSpan;
      const result: Array<{ key: string; gridColumn: string; expanded?: boolean; repositioned?: boolean }> = [];

      // If only one widget, expand it to fill entire row
      if (enabledWidgets.length === 1) {
        result.push({
          key: enabledWidgets[0],
          gridColumn: `span 3`,
          expanded: getWidgetColumnSpan(enabledWidgets[0]) < 3
        });
      } else {
        // For multiple widgets, keep original sizes except expand the last one
        for (let i = 0; i < enabledWidgets.length; i++) {
          const key = enabledWidgets[i];
          const originalSpan = getWidgetColumnSpan(key);
          const isLastWidget = i === enabledWidgets.length - 1;
          
          if (isLastWidget && availableSpace > 0) {
            // Expand last widget to fill remaining space
            const finalSpan = originalSpan + availableSpace;
            result.push({
              key,
              gridColumn: `span ${finalSpan}`,
              expanded: true
            });
          } else {
            // Keep original size for non-last widgets
            result.push({
              key,
              gridColumn: `span ${originalSpan}`,
              expanded: false
            });
          }
        }
      }

      return {
        gridTemplateColumns: 'repeat(3, 1fr)',
        widgets: result
      };
    }

    // Standard layout if autoArrange is disabled OR no expansion needed (exactly 3 columns)
    return {
      gridTemplateColumns: 'repeat(3, 1fr)',
      widgets: enabledWidgets.map(key => ({
        key,
        gridColumn: `span ${getWidgetColumnSpan(key)}`,
        expanded: false
      }))
    };
  };

  return {
    createSmartLayout,
    createResponsiveLayout,
    autoArrangeWidgets
  };
}
