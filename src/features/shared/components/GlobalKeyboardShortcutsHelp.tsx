import React, { useState, useMemo } from 'react';
import { Keyboard, X, Command, Zap } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface Shortcut {
  keys: string[];
  description: string;
  category?: string;
}

interface PageShortcuts {
  pageName: string;
  shortcuts: Shortcut[];
}

// Page-specific shortcuts mapping
const PAGE_SHORTCUTS_MAP: Record<string, PageShortcuts> = {
  '/lats/purchase-order/create': {
    pageName: 'Purchase Order Creation',
    shortcuts: [
      { keys: ['Ctrl', 'F'], description: 'Focus search bar', category: 'navigation' },
      { keys: ['Ctrl', 'K'], description: 'Focus search (alternative)', category: 'navigation' },
      { keys: ['Esc'], description: 'Clear search / Close modals', category: 'navigation' },
      { keys: ['Ctrl', 'S'], description: 'Save as Draft', category: 'actions' },
      { keys: ['Ctrl', 'Enter'], description: 'Create Purchase Order', category: 'actions' },
      { keys: ['Ctrl', 'Shift', 'S'], description: 'Open Supplier Selector', category: 'actions' },
      { keys: ['Ctrl', 'Shift', 'P'], description: 'Add New Product', category: 'actions' },
      { keys: ['Ctrl', 'B'], description: 'Toggle Barcode Scanner', category: 'actions' },
      { keys: ['Ctrl', 'I'], description: 'Bulk Import from CSV', category: 'actions' },
      { keys: ['Ctrl', 'E'], description: 'Export to Excel', category: 'actions' },
      { keys: ['Ctrl', 'Shift', 'C'], description: 'Clear Cart', category: 'cart' },
      { keys: ['+'], description: 'Increase quantity (in cart)', category: 'cart' },
      { keys: ['-'], description: 'Decrease quantity (in cart)', category: 'cart' },
      { keys: ['?'], description: 'Show this help', category: 'modals' },
    ]
  },
  '/customers': {
    pageName: 'Customers',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Focus search bar', category: 'navigation' },
      { keys: ['Ctrl', 'F'], description: 'Focus search (alternative)', category: 'navigation' },
      { keys: ['Esc'], description: 'Clear search / Close modals', category: 'navigation' },
      { keys: ['Ctrl', 'N'], description: 'Add New Customer', category: 'actions' },
      { keys: ['Ctrl', 'E'], description: 'Export to CSV', category: 'actions' },
      { keys: ['Ctrl', 'I'], description: 'Import from Excel', category: 'actions' },
      { keys: ['?'], description: 'Show this help', category: 'modals' },
    ]
  },
  '/lats/unified-inventory': {
    pageName: 'Inventory Management',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Focus search bar', category: 'navigation' },
      { keys: ['Ctrl', 'F'], description: 'Focus search (alternative)', category: 'navigation' },
      { keys: ['Esc'], description: 'Clear search / Close modals', category: 'navigation' },
      { keys: ['Ctrl', 'N'], description: 'Add New Product', category: 'actions' },
      { keys: ['Ctrl', 'E'], description: 'Export to Excel', category: 'actions' },
      { keys: ['?'], description: 'Show this help', category: 'modals' },
    ]
  }
};

const GLOBAL_SHORTCUTS: Shortcut[] = [
  {
    keys: ['Ctrl', 'K'],
    description: 'Open Global Search',
  },
  {
    keys: ['Ctrl', 'Shift', 'O'],
    description: 'Create Purchase Order',
  }
];

/**
 * Floating help button that shows keyboard shortcuts based on current page
 */
const GlobalKeyboardShortcutsHelp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Get shortcuts for current page
  const currentPageShortcuts = useMemo(() => {
    const currentPath = location.pathname;
    
    // Try exact match first
    if (PAGE_SHORTCUTS_MAP[currentPath]) {
      return PAGE_SHORTCUTS_MAP[currentPath];
    }
    
    // Try partial matches for nested routes
    for (const [path, shortcuts] of Object.entries(PAGE_SHORTCUTS_MAP)) {
      if (currentPath.startsWith(path)) {
        return shortcuts;
      }
    }
    
    // Default to global shortcuts if no page-specific shortcuts found
    return {
      pageName: 'Global Shortcuts',
      shortcuts: GLOBAL_SHORTCUTS
    };
  }, [location.pathname]);

  // Group shortcuts by category if they have categories
  const shortcutsByCategory = useMemo(() => {
    const grouped: Record<string, Shortcut[]> = {};
    const uncategorized: Shortcut[] = [];
    
    currentPageShortcuts.shortcuts.forEach(shortcut => {
      if (shortcut.category) {
        if (!grouped[shortcut.category]) {
          grouped[shortcut.category] = [];
        }
        grouped[shortcut.category].push(shortcut);
      } else {
        uncategorized.push(shortcut);
      }
    });
    
    return { grouped, uncategorized };
  }, [currentPageShortcuts]);

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    actions: 'Actions',
    cart: 'Cart Management',
    modals: 'Modals'
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    navigation: <Command className="w-3.5 h-3.5" />,
    actions: <Zap className="w-3.5 h-3.5" />,
    cart: <Keyboard className="w-3.5 h-3.5" />,
    modals: <Keyboard className="w-3.5 h-3.5" />,
  };

  const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
    navigation: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300'
    },
    actions: {
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      border: 'border-purple-200 dark:border-purple-800',
      text: 'text-purple-700 dark:text-purple-300'
    },
    cart: {
      bg: 'bg-orange-50 dark:bg-orange-950/30',
      border: 'border-orange-200 dark:border-orange-800',
      text: 'text-orange-700 dark:text-orange-300'
    },
    modals: {
      bg: 'bg-green-50 dark:bg-green-950/30',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-700 dark:text-green-300'
    }
  };

  return (
    <>
      {/* Modern Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-700 dark:to-slate-600 text-white rounded-2xl shadow-2xl hover:shadow-slate-900/50 hover:scale-105 transition-all duration-300 flex items-center justify-center group border border-slate-700/50"
        title={`Keyboard Shortcuts - ${currentPageShortcuts.pageName}`}
      >
        <Keyboard className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 dark:border-slate-700 shadow-lg" />
      </button>

      {/* Modern Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 px-6 py-5 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Keyboard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-0.5">
                      {currentPageShortcuts.pageName}
                    </h2>
                    <p className="text-sm text-slate-300">Keyboard shortcuts for this page</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
              <div className="space-y-6">
                {/* Render categorized shortcuts */}
                {Object.keys(shortcutsByCategory.grouped).length > 0 && (
                  Object.entries(shortcutsByCategory.grouped).map(([category, shortcuts]) => {
                    const colors = categoryColors[category] || categoryColors.navigation;
                    return (
                      <div key={category} className="space-y-3">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${colors.bg} ${colors.border} ${colors.text}`}>
                          {categoryIcons[category]}
                          <h3 className="text-sm font-bold uppercase tracking-wide">
                            {categoryLabels[category] || category}
                          </h3>
                        </div>
                        <div className="grid gap-2">
                          {shortcuts.map((shortcut, index) => (
                            <div
                              key={index}
                              className="group flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all duration-200"
                            >
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">
                                {shortcut.description}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {shortcut.keys.map((key, keyIndex) => (
                                  <React.Fragment key={keyIndex}>
                                    {keyIndex > 0 && (
                                      <span className="text-slate-400 dark:text-slate-500 text-xs font-medium mx-1">+</span>
                                    )}
                                    <kbd className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm min-w-[2.5rem] text-center">
                                      {key}
                                    </kbd>
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Render uncategorized shortcuts */}
                {shortcutsByCategory.uncategorized.length > 0 && (
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                      <Command className="w-3.5 h-3.5" />
                      <h3 className="text-sm font-bold uppercase tracking-wide">
                        General
                      </h3>
                    </div>
                    <div className="grid gap-2">
                      {shortcutsByCategory.uncategorized.map((shortcut, index) => (
                        <div
                          key={index}
                          className="group flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all duration-200"
                        >
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">
                            {shortcut.description}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {shortcut.keys.map((key, keyIndex) => (
                              <React.Fragment key={keyIndex}>
                                {keyIndex > 0 && (
                                  <span className="text-slate-400 dark:text-slate-500 text-xs font-medium mx-1">+</span>
                                )}
                                <kbd className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm min-w-[2.5rem] text-center">
                                  {key}
                                </kbd>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalKeyboardShortcutsHelp;

