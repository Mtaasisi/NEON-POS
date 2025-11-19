/**
 * Smart Grid Layout Utility
 * Automatically arranges widgets to fill empty spaces and optimize layout
 */

export interface WidgetInfo {
  key: string;
  enabled: boolean;
  columnSpan: number;
  priority?: number;
}

export interface SmartGridResult {
  gridTemplateColumns: string;
  widgets: Array<{
    key: string;
    gridColumn: string;
    expanded?: boolean;
    repositioned?: boolean;
  }>;
}

/**
 * Calculate optimal grid layout for widgets
 * Automatically expands widgets to fill empty spaces and repositions them
 */
export function calculateSmartGridLayout(
  widgets: WidgetInfo[],
  maxColumns: number = 3
): SmartGridResult {
  const enabledWidgets = widgets.filter(w => w.enabled);
  
  if (enabledWidgets.length === 0) {
    return {
      gridTemplateColumns: `repeat(${maxColumns}, 1fr)`,
      widgets: []
    };
  }

  // Calculate total column span needed
  const totalSpan = enabledWidgets.reduce((sum, widget) => sum + widget.columnSpan, 0);
  
  // If total span equals max columns, use standard layout
  if (totalSpan === maxColumns) {
    return {
      gridTemplateColumns: `repeat(${maxColumns}, 1fr)`,
      widgets: enabledWidgets.map(widget => ({
        key: widget.key,
        gridColumn: `span ${widget.columnSpan}`
      }))
    };
  }

  // If total span is less than max columns, expand widgets to fill space
  if (totalSpan < maxColumns) {
    const availableSpace = maxColumns - totalSpan;
    
    // Expand widgets to fill all available space
    return expandWidgetsToFillSpace(enabledWidgets, maxColumns, availableSpace);
  }

  // If total span exceeds max columns, try to fit in multiple rows
  if (totalSpan > maxColumns) {
    const rows: WidgetInfo[][] = [];
    let currentRow: WidgetInfo[] = [];
    let currentRowSpan = 0;

    // Sort widgets by priority and size
    const sortedWidgets = [...enabledWidgets].sort((a, b) => {
      if (a.priority !== undefined && b.priority !== undefined) {
        return b.priority - a.priority;
      }
      return a.columnSpan - b.columnSpan; // Smaller widgets first for better fit
    });

    for (const widget of sortedWidgets) {
      if (currentRowSpan + widget.columnSpan <= maxColumns) {
        currentRow.push(widget);
        currentRowSpan += widget.columnSpan;
      } else {
        if (currentRow.length > 0) {
          rows.push([...currentRow]);
        }
        currentRow = [widget];
        currentRowSpan = widget.columnSpan;
      }
    }
    
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    // Return the first row (most important widgets)
    const firstRow = rows[0] || [];
    return {
      gridTemplateColumns: `repeat(${maxColumns}, 1fr)`,
      widgets: firstRow.map(widget => ({
        key: widget.key,
        gridColumn: `span ${widget.columnSpan}`
      }))
    };
  }

  // Fallback to standard layout
  return {
    gridTemplateColumns: `repeat(${maxColumns}, 1fr)`,
    widgets: enabledWidgets.map(widget => ({
      key: widget.key,
      gridColumn: `span ${widget.columnSpan}`
    }))
  };
}

/**
 * Try to fill gaps by repositioning widgets
 * Uses a greedy algorithm to pack widgets efficiently
 */
function tryFillGapsWithRepositioning(
  widgets: WidgetInfo[], 
  maxColumns: number, 
  availableSpace: number
): SmartGridResult | null {
  // If no space available or no widgets, return null
  if (availableSpace <= 0 || widgets.length === 0) {
    return null;
  }

  // Sort widgets by priority (highest first)
  const sortedWidgets = [...widgets].sort((a, b) => {
    const priorityA = a.priority || 0;
    const priorityB = b.priority || 0;
    return priorityB - priorityA;
  });

  const result: SmartGridResult = {
    gridTemplateColumns: `repeat(${maxColumns}, 1fr)`,
    widgets: []
  };

  let currentPosition = 1;
  
  // Place widgets sequentially, filling gaps as we go
  for (const widget of sortedWidgets) {
    const widgetSpan = widget.columnSpan;
    
    // Check if widget fits in current position
    if (currentPosition + widgetSpan - 1 <= maxColumns) {
      // Widget fits in current row
      result.widgets.push({
        key: widget.key,
        gridColumn: `span ${widgetSpan}`
      });
      currentPosition += widgetSpan;
    } else {
      // Widget doesn't fit, try to expand previous widgets to fill gap
      const remainingSpace = maxColumns - currentPosition + 1;
      
      if (remainingSpace > 0 && result.widgets.length > 0) {
        // Find last widget and try to expand it
        const lastWidget = result.widgets[result.widgets.length - 1];
        const lastWidgetInfo = widgets.find(w => w.key === lastWidget.key);
        
        if (lastWidgetInfo && lastWidgetInfo.columnSpan < maxColumns) {
          // Expand last widget to fill remaining space
          const newSpan = lastWidgetInfo.columnSpan + remainingSpace;
          result.widgets[result.widgets.length - 1] = {
            key: lastWidget.key,
            gridColumn: `span ${newSpan}`,
            expanded: true
          };
        }
      }
      
      // Add current widget (it will go to next row or be handled separately)
      result.widgets.push({
        key: widget.key,
        gridColumn: `span ${widgetSpan}`
      });
      currentPosition = widgetSpan + 1;
    }
  }
  
  // After placing all widgets, check if we can expand the last widget to fill remaining space
  if (currentPosition <= maxColumns && result.widgets.length > 0) {
    const remainingSpace = maxColumns - currentPosition + 1;
    const lastWidget = result.widgets[result.widgets.length - 1];
    const lastWidgetInfo = widgets.find(w => w.key === lastWidget.key);
    
    if (lastWidgetInfo && remainingSpace > 0) {
      const newSpan = lastWidgetInfo.columnSpan + remainingSpace;
      result.widgets[result.widgets.length - 1] = {
        key: lastWidget.key,
        gridColumn: `span ${newSpan}`,
        expanded: true
      };
    }
  }

  return result;
}

/**
 * Expand widgets to fill available space
 * Prioritizes expanding the last widget to fill remaining space
 */
function expandWidgetsToFillSpace(
  widgets: WidgetInfo[], 
  maxColumns: number, 
  availableSpace: number
): SmartGridResult {
  const result: SmartGridResult = {
    gridTemplateColumns: `repeat(${maxColumns}, 1fr)`,
    widgets: []
  };

  // If only one widget, expand it to fill entire row
  if (widgets.length === 1) {
    result.widgets.push({
      key: widgets[0].key,
      gridColumn: `span ${maxColumns}`,
      expanded: widgets[0].columnSpan < maxColumns
    });
    return result;
  }

  // For multiple widgets, expand the last widget to fill remaining space
  for (let i = 0; i < widgets.length; i++) {
    const widget = widgets[i];
    const isLastWidget = i === widgets.length - 1;
    
    if (isLastWidget && availableSpace > 0) {
      // Expand last widget to fill remaining space
      const finalSpan = widget.columnSpan + availableSpace;
      result.widgets.push({
        key: widget.key,
        gridColumn: `span ${finalSpan}`,
        expanded: true
      });
    } else {
      // Keep original size for non-last widgets
      result.widgets.push({
        key: widget.key,
        gridColumn: `span ${widget.columnSpan}`,
        expanded: false
      });
    }
  }

  return result;
}

/**
 * Get widget priority for smart arrangement
 */
export function getWidgetPriority(widgetKey: string): number {
  const priorities: { [key: string]: number } = {
    // High priority widgets (expand first)
    'appointmentWidget': 10,
    'notificationWidget': 9,
    'salesWidget': 8,
    'financialWidget': 7,
    'customerInsightsWidget': 6,
    
    // Medium priority widgets
    'employeeWidget': 5,
    'serviceWidget': 4,
    'inventoryWidget': 3,
    'systemHealthWidget': 2,
    
    // Lower priority widgets
    'reminderWidget': 1,
    'chatWidget': 1,
    'activityFeedWidget': 1,
    
    // Charts (medium priority)
    'revenueTrendChart': 5,
    'salesChart': 5,
    'deviceStatusChart': 4,
    'appointmentsTrendChart': 4,
    'purchaseOrderChart': 3,
    'paymentMethodsChart': 3,
    'salesByCategoryChart': 3,
    'profitMarginChart': 3,
    'performanceMetricsChart': 4,
    'customerActivityChart': 4,
    'salesFunnelChart': 3,
    
    // Other widgets
    'analyticsWidget': 2,
    'topProductsWidget': 2,
    'expensesWidget': 2,
    'purchaseOrderWidget': 2,
    'staffPerformanceWidget': 1
  };
  
  return priorities[widgetKey] || 0;
}

/**
 * Create responsive grid that adapts to screen size
 */
export function createResponsiveGrid(
  widgets: WidgetInfo[],
  screenSize: 'sm' | 'md' | 'lg' | 'xl' = 'lg'
): SmartGridResult {
  const maxColumns = {
    'sm': 1,
    'md': 2, 
    'lg': 3,
    'xl': 4
  }[screenSize];
  
  return calculateSmartGridLayout(widgets, maxColumns);
}
