/**
 * Keyboard Shortcuts Manager
 * Global keyboard shortcuts for power users
 */

import { useEffect } from 'react';

export type ShortcutKey = {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
};

export type Shortcut = {
  id: string;
  keys: ShortcutKey;
  description: string;
  action: () => void;
  enabled?: boolean;
};

class KeyboardShortcutsManager {
  private shortcuts: Map<string, Shortcut> = new Map();

  /**
   * Register a keyboard shortcut
   */
  register(shortcut: Shortcut) {
    this.shortcuts.set(shortcut.id, shortcut);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(id: string) {
    this.shortcuts.delete(id);
  }

  /**
   * Handle keyboard event
   */
  handleKeyDown(e: KeyboardEvent) {
    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Ctrl+K and Ctrl+N even in inputs
      if (!((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'n'))) {
        return;
      }
    }

    for (const shortcut of this.shortcuts.values()) {
      if (shortcut.enabled === false) continue;

      const keys = shortcut.keys;
      const matches =
        e.key.toLowerCase() === keys.key.toLowerCase() &&
        !!e.ctrlKey === !!keys.ctrl &&
        !!e.metaKey === !!keys.meta &&
        !!e.shiftKey === !!keys.shift &&
        !!e.altKey === !!keys.alt;

      if (matches) {
        e.preventDefault();
        shortcut.action();
        break;
      }
    }
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): Shortcut[] {
    return Array.from(this.shortcuts.values());
  }
}

export const keyboardManager = new KeyboardShortcutsManager();

/**
 * Hook to register keyboard shortcuts
 */
export const useKeyboardShortcuts = (shortcuts: Shortcut[]) => {
  useEffect(() => {
    shortcuts.forEach(shortcut => {
      keyboardManager.register(shortcut);
    });

    return () => {
      shortcuts.forEach(shortcut => {
        keyboardManager.unregister(shortcut.id);
      });
    };
  }, [shortcuts]);
};

/**
 * Initialize global keyboard shortcuts
 */
export const initializeKeyboardShortcuts = () => {
  const handleKeyDown = (e: KeyboardEvent) => {
    keyboardManager.handleKeyDown(e);
  };

  window.addEventListener('keydown', handleKeyDown);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
};

/**
 * Format shortcut for display
 */
export const formatShortcut = (keys: ShortcutKey): string => {
  const parts: string[] = [];
  
  if (keys.ctrl) parts.push('Ctrl');
  if (keys.meta) parts.push('Cmd');
  if (keys.shift) parts.push('Shift');
  if (keys.alt) parts.push('Alt');
  parts.push(keys.key.toUpperCase());

  return parts.join('+');
};

/**
 * Component to display keyboard shortcut
 */
export const KeyboardShortcutBadge: React.FC<{ keys: ShortcutKey }> = ({ keys }) => {
  return (
    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">
      {formatShortcut(keys)}
    </kbd>
  );
};

