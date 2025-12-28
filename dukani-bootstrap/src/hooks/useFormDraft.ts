import { useEffect, useCallback, useRef } from 'react';

// Simple debounce function (no lodash dependency)
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  
  const executedFunction = function(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };

  executedFunction.cancel = function() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  
  return executedFunction as typeof executedFunction & { cancel: () => void };
}

interface UseFormDraftOptions<T> {
  key: string;
  data: T;
  enabled?: boolean;
  debounceMs?: number;
  exclude?: (keyof T)[];
}

/**
 * Hook to auto-save form drafts to localStorage
 * 
 * @example
 * const { saveDraft, clearDraft, hasDraft, loadDraft } = useFormDraft({
 *   key: 'reminder_form',
 *   data: formData,
 *   enabled: true,
 *   debounceMs: 1000,
 *   exclude: ['id', 'createdAt']
 * });
 */
export const useFormDraft = <T extends Record<string, any>>(
  options: UseFormDraftOptions<T>
) => {
  const {
    key,
    data,
    enabled = true,
    debounceMs = 1000,
    exclude = []
  } = options;

  const draftKey = `form_draft_${key}`;
  const isInitialMount = useRef(true);

  // Filter out excluded fields
  const getCleanData = useCallback((formData: T): Partial<T> => {
    const cleaned = { ...formData };
    exclude.forEach(field => {
      delete cleaned[field];
    });
    return cleaned;
  }, [exclude]);

  // Save draft to localStorage
  const saveDraft = useCallback((formData: T) => {
    if (!enabled) return;

    try {
      const cleanData = getCleanData(formData);
      const draftData = {
        data: cleanData,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draftData));
    } catch (error) {
      console.error('Error saving form draft:', error);
    }
  }, [enabled, draftKey, getCleanData]);

  // Debounced save
  const debouncedSave = useRef(
    debounce((formData: T) => saveDraft(formData), debounceMs)
  ).current;

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
    } catch (error) {
      console.error('Error clearing form draft:', error);
    }
  }, [draftKey]);

  // Check if draft exists
  const hasDraft = useCallback((): boolean => {
    try {
      return localStorage.getItem(draftKey) !== null;
    } catch {
      return false;
    }
  }, [draftKey]);

  // Load draft from localStorage
  const loadDraft = useCallback((): { data: Partial<T>; timestamp: string } | null => {
    try {
      const stored = localStorage.getItem(draftKey);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      return {
        data: parsed.data,
        timestamp: parsed.timestamp,
      };
    } catch (error) {
      console.error('Error loading form draft:', error);
      return null;
    }
  }, [draftKey]);

  // Get draft age in minutes
  const getDraftAge = useCallback((): number | null => {
    const draft = loadDraft();
    if (!draft) return null;

    const timestamp = new Date(draft.timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    return Math.floor(diffMs / 60000); // Convert to minutes
  }, [loadDraft]);

  // Auto-save on data change
  useEffect(() => {
    // Skip first render to avoid saving initial empty state
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!enabled || !data) return;

    // Check if data is not empty
    const hasData = Object.values(data).some(value => {
      if (typeof value === 'string') return value.trim() !== '';
      if (typeof value === 'number') return value !== 0;
      if (Array.isArray(value)) return value.length > 0;
      return value != null;
    });

    if (hasData) {
      debouncedSave(data);
    }
  }, [data, enabled, debouncedSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  return {
    saveDraft,
    clearDraft,
    hasDraft,
    loadDraft,
    getDraftAge,
  };
};

export default useFormDraft;

