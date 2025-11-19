import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';

interface KeyboardShortcut {
  keys: string[];
  description: string;
  category: 'navigation' | 'actions' | 'cart' | 'modals';
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  { keys: ['Ctrl', 'F'], description: 'Focus search bar', category: 'navigation' },
  { keys: ['Ctrl', 'K'], description: 'Focus search (alternative)', category: 'navigation' },
  { keys: ['Esc'], description: 'Clear search / Close modals', category: 'navigation' },
  
  // Actions
  { keys: ['Ctrl', 'S'], description: 'Save as Draft', category: 'actions' },
  { keys: ['Ctrl', 'Enter'], description: 'Create Purchase Order', category: 'actions' },
  { keys: ['Ctrl', 'Shift', 'S'], description: 'Open Supplier Selector', category: 'actions' },
  { keys: ['Ctrl', 'Shift', 'P'], description: 'Add New Product', category: 'actions' },
  { keys: ['Ctrl', 'B'], description: 'Toggle Barcode Scanner', category: 'actions' },
  { keys: ['Ctrl', 'I'], description: 'Bulk Import from CSV', category: 'actions' },
  { keys: ['Ctrl', 'E'], description: 'Export to Excel', category: 'actions' },
  
  // Cart Management
  { keys: ['Ctrl', 'Shift', 'C'], description: 'Clear Cart', category: 'cart' },
  { keys: ['+'], description: 'Increase quantity (in cart)', category: 'cart' },
  { keys: ['-'], description: 'Decrease quantity (in cart)', category: 'cart' },
  
  // Modals
  { keys: ['?'], description: 'Show this help', category: 'modals' },
  { keys: ['Esc'], description: 'Close any modal', category: 'modals' },
];

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  // Block body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = {
    navigation: 'Navigation',
    actions: 'Actions',
    cart: 'Cart Management',
    modals: 'Modals'
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Keyboard className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Keyboard Shortcuts</h2>
                <p className="text-blue-100 text-sm">Speed up your workflow with these shortcuts</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {Object.entries(categories).map(([key, label]) => {
              const categoryShortcuts = SHORTCUTS.filter(s => s.category === key);
              if (categoryShortcuts.length === 0) return null;

              return (
                <div key={key}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Command className="w-5 h-5 text-blue-600" />
                    {label}
                  </h3>
                  <div className="space-y-2">
                    {categoryShortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-gray-700">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, keyIndex) => (
                            <React.Fragment key={keyIndex}>
                              {keyIndex > 0 && (
                                <span className="text-gray-400 text-sm mx-1">+</span>
                              )}
                              <kbd className="px-3 py-1.5 bg-white border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 shadow-sm min-w-[40px] text-center">
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
            })}
          </div>

          {/* Pro Tip */}
          <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Command className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">💡 Pro Tip</h4>
                <p className="text-sm text-blue-800">
                  Use <kbd className="px-2 py-1 bg-white border border-blue-300 rounded text-xs font-semibold">Ctrl+F</kbd> to quickly find products, 
                  then <kbd className="px-2 py-1 bg-white border border-blue-300 rounded text-xs font-semibold">Ctrl+Enter</kbd> to create your PO in seconds!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Press <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-semibold">?</kbd> anytime to show this help
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;

