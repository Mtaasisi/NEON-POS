import { useEffect, useCallback, useRef } from 'react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean; // Cmd on Mac, Win on Windows
  action: (e: KeyboardEvent) => void;
  description?: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  enableInInputs?: boolean; // Allow shortcuts when focused on input fields
}

/**
 * Hook to register keyboard shortcuts
 * 
 * @example
 * useKeyboardShortcuts([
 *   { key: 's', meta: true, action: handleSave, description: 'Save form' },
 *   { key: 'Escape', action: handleClose, description: 'Close modal' }
 * ]);
 */
export const useKeyboardShortcuts = (
  shortcuts: ShortcutConfig[] = [],
  options: UseKeyboardShortcutsOptions = {}
) => {
  const { enabled = true, enableInInputs = false } = options;
  const shortcutsRef = useRef<ShortcutConfig[]>(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Check if we're in an input field
      const target = e.target as HTMLElement;
      const isInput = 
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if (isInput && !enableInInputs) {
        // Allow only specific shortcuts in inputs (like Cmd+S, Escape)
        const allowedInInputs = ['Escape', 's', 'z', 'y'];
        if (!e.key || !allowedInInputs.includes(e.key.toLowerCase()) || 
            !(e.metaKey || e.ctrlKey || e.key === 'Escape')) {
          return;
        }
      }

      // Check each shortcut
      if (!shortcutsRef.current || !Array.isArray(shortcutsRef.current)) return;
      
      // Early return if key is undefined
      if (!e.key) return;
      
      for (const shortcut of shortcutsRef.current) {
        if (!shortcut.key) continue; // Skip shortcuts with undefined key
        
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !shortcut.ctrl || e.ctrlKey;
        const altMatch = !shortcut.alt || e.altKey;
        const shiftMatch = !shortcut.shift || e.shiftKey;
        const metaMatch = !shortcut.meta || e.metaKey;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch) {
          if (shortcut.preventDefault !== false) {
            e.preventDefault();
          }
          shortcut.action(e);
          break; // Only trigger first matching shortcut
        }
      }
    },
    [enabled, enableInInputs]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: shortcutsRef.current,
  };
};

/**
 * Hook to get platform-specific modifier key name
 */
export const useModifierKey = () => {
  const isMac = typeof navigator !== 'undefined' && 
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  
  return {
    modKey: isMac ? '⌘' : 'Ctrl',
    isMac,
    isWindows: !isMac,
  };
};

/**
 * Format shortcut for display
 */
export const formatShortcut = (shortcut: ShortcutConfig): string => {
  const parts: string[] = [];
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  
  if (shortcut.ctrl) parts.push(isMac ? '⌃' : 'Ctrl');
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift');
  if (shortcut.meta) parts.push(isMac ? '⌘' : 'Win');
  
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(isMac ? '' : '+');
};

export default useKeyboardShortcuts;
