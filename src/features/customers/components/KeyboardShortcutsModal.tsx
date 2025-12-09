import React from 'react';
import { createPortal } from 'react-dom';
import { X, Keyboard } from 'lucide-react';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

interface KeyboardShortcut {
  keys: string[];
  description: string;
  category: 'navigation' | 'actions' | 'modals';
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  { keys: ['Ctrl', 'K'], description: 'Focus search bar', category: 'navigation' },
  { keys: ['Ctrl', 'F'], description: 'Focus search (alternative)', category: 'navigation' },
  { keys: ['Esc'], description: 'Clear search / Close modals', category: 'navigation' },
  
  // Actions
  { keys: ['Ctrl', 'N'], description: 'Add New Customer', category: 'actions' },
  { keys: ['Ctrl', 'E'], description: 'Export to CSV', category: 'actions' },
  { keys: ['Ctrl', 'I'], description: 'Import from Excel', category: 'actions' },
  
  // Modals
  { keys: ['?'], description: 'Show this help', category: 'modals' },
  { keys: ['Esc'], description: 'Close any modal', category: 'modals' },
];

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  useBodyScrollLock(isOpen);

  // Additional scroll prevention
  React.useEffect(() => {
    if (isOpen) {
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      
      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const shortcutsByCategory = SHORTCUTS.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    actions: 'Actions',
    modals: 'Modals',
  };

  const getKeyDisplay = (key: string) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    if (key === 'Ctrl') return isMac ? '⌘' : 'Ctrl';
    if (key === 'Shift') return 'Shift';
    if (key === 'Alt') return isMac ? '⌥' : 'Alt';
    return key;
  };

  return createPortal(
    <>
      <div 
        className="fixed bg-black/60 flex items-center justify-center p-4 z-[99999]" 
        style={{
          top: 0, 
          left: 0, 
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          overscrollBehavior: 'none'
        }}
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="keyboard-shortcuts-title"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden relative"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon Header - Fixed */}
          <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <Keyboard className="w-8 h-8 text-white" />
              </div>
              
              {/* Text */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2" id="keyboard-shortcuts-title">
                  Keyboard Shortcuts
                </h3>
                <p className="text-sm text-gray-600">
                  Speed up your workflow with these shortcuts
                </p>
              </div>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {Object.entries(shortcutsByCategory).map(([category, shortcuts]) => (
                <div key={category}>
                  <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                    {categoryLabels[category]}
                  </h4>
                  <div className="space-y-2">
                    {shortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-sm text-gray-700 font-medium">
                          {shortcut.description}
                        </span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, keyIndex) => (
                            <React.Fragment key={keyIndex}>
                              <kbd className="px-2.5 py-1.5 text-xs font-semibold text-gray-800 bg-white border-2 border-gray-300 rounded-lg shadow-sm">
                                {getKeyDisplay(key)}
                              </kbd>
                              {keyIndex < shortcut.keys.length - 1 && (
                                <span className="text-gray-400 mx-1">+</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 flex-shrink-0 bg-white px-6 pb-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default KeyboardShortcutsModal;
