import React, { useState } from 'react';
import { Keyboard, X, Zap } from 'lucide-react';

interface GlobalShortcut {
  keys: string[];
  description: string;
  action: string;
}

const GLOBAL_SHORTCUTS: GlobalShortcut[] = [
  {
    keys: ['Ctrl', 'K'],
    description: 'Open Global Search',
    action: 'Search anywhere in the app'
  },
  {
    keys: ['Ctrl', 'Shift', 'O'],
    description: 'Create Purchase Order',
    action: 'Quick access to PO creation'
  }
];

/**
 * Floating help button that shows global keyboard shortcuts
 */
const GlobalKeyboardShortcutsHelp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 flex items-center justify-center group"
        title="Keyboard Shortcuts (Global)"
      >
        <Keyboard className="w-6 h-6 group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <Zap className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Global Keyboard Shortcuts</h2>
                    <p className="text-blue-100 text-sm">Work faster from anywhere in the app</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {GLOBAL_SHORTCUTS.map((shortcut, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border-2 border-blue-100 hover:border-blue-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{shortcut.description}</h3>
                        <p className="text-sm text-gray-600">{shortcut.action}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            {keyIndex > 0 && (
                              <span className="text-gray-400 text-sm mx-1">+</span>
                            )}
                            <kbd className="px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-sm font-bold text-gray-700 shadow-md min-w-[50px] text-center">
                              {key}
                            </kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Additional Info */}
              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-900 mb-1">💡 Pro Tip</h4>
                    <p className="text-sm text-green-800">
                      These shortcuts work from <strong>anywhere</strong> in the application. 
                      No need to navigate through menus - just press the keys!
                    </p>
                  </div>
                </div>
              </div>

              {/* Page-Specific Shortcuts Note */}
              <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Keyboard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-1">📄 Page-Specific Shortcuts</h4>
                    <p className="text-sm text-amber-800">
                      Many pages have their own shortcuts too! Look for the <kbd className="px-1.5 py-0.5 bg-white border border-amber-300 rounded text-xs font-bold">?</kbd> button 
                      or press <kbd className="px-1.5 py-0.5 bg-white border border-amber-300 rounded text-xs font-bold">?</kbd> on the Purchase Order page for more shortcuts.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  More shortcuts coming soon! 🚀
                </p>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalKeyboardShortcutsHelp;

