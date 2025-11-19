import { useCallback } from 'react';
import { useGeneralSettingsContext } from '../context/GeneralSettingsContext';
import { toast } from 'react-hot-toast';

/**
 * Hook for accessing and using behavior settings throughout the application
 * This ensures all components respect the user's behavior preferences
 */
export const useBehaviorSettings = () => {
  const {
    autoCompleteSearch,
    confirmDelete,
    showConfirmations,
    enableSoundEffects,
    enableAnimations,
    settings
  } = useGeneralSettingsContext();

  /**
   * Show a toast message only if showConfirmations is enabled
   */
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (!showConfirmations) {
      console.log(`[Toast Suppressed] ${type}: ${message}`);
      return;
    }

    switch (type) {
      case 'success':
        toast.success(message);
        break;
      case 'error':
        toast.error(message);
        break;
      case 'info':
        toast(message);
        break;
    }
  }, [showConfirmations]);

  /**
   * Ask for confirmation before performing a delete action
   * @returns Promise<boolean> - true if confirmed, false if cancelled
   */
  const confirmDeleteAction = useCallback(async (
    itemName: string,
    onConfirm: () => Promise<void> | void,
    onCancel?: () => void
  ): Promise<boolean> => {
    if (!confirmDelete) {
      // Skip confirmation, execute directly
      await onConfirm();
      return true;
    }

    // Use browser's confirm dialog (can be replaced with custom modal)
    const confirmed = window.confirm(`Are you sure you want to delete "${itemName}"? This action cannot be undone.`);
    
    if (confirmed) {
      await onConfirm();
      return true;
    } else {
      if (onCancel) onCancel();
      return false;
    }
  }, [confirmDelete]);

  /**
   * Get animation class based on enableAnimations setting
   */
  const getAnimationClass = useCallback((baseClass: string = ''): string => {
    const classes = [baseClass];
    if (!enableAnimations) {
      classes.push('no-animate');
    }
    return classes.filter(Boolean).join(' ');
  }, [enableAnimations]);

  /**
   * Get transition duration based on enableAnimations setting
   */
  const getTransitionDuration = useCallback((): number => {
    return enableAnimations ? 300 : 0;
  }, [enableAnimations]);

  /**
   * Play a sound effect if enableSoundEffects is true
   */
  const playSound = useCallback((soundType: 'click' | 'success' | 'error' | 'cart' | 'payment') => {
    if (!enableSoundEffects) return;

    // Sound effects can be implemented here
    // For now, we'll just log
    console.log(`[Sound] Playing ${soundType} sound`);
    
    // Example: You can add actual audio playback here
    // const audio = new Audio(`/sounds/${soundType}.mp3`);
    // audio.play();
  }, [enableSoundEffects]);

  /**
   * Get search configuration based on autoCompleteSearch
   */
  const getSearchConfig = useCallback(() => {
    return {
      autoComplete: autoCompleteSearch,
      debounceDelay: autoCompleteSearch ? 300 : 0,
      minLength: autoCompleteSearch ? 2 : 3,
      showSuggestions: autoCompleteSearch
    };
  }, [autoCompleteSearch]);

  /**
   * Check if animations should be disabled
   */
  const shouldDisableAnimations = useCallback((): boolean => {
    return !enableAnimations;
  }, [enableAnimations]);

  /**
   * Check if sounds should be disabled
   */
  const shouldDisableSounds = useCallback((): boolean => {
    return !enableSoundEffects;
  }, [enableSoundEffects]);

  /**
   * Wrapper function for actions that might need confirmation
   */
  const withConfirmation = useCallback(async (
    message: string,
    action: () => Promise<void> | void,
    requireConfirm: boolean = true
  ): Promise<boolean> => {
    if (!requireConfirm || !confirmDelete) {
      await action();
      return true;
    }

    const confirmed = window.confirm(message);
    if (confirmed) {
      await action();
      return true;
    }
    return false;
  }, [confirmDelete]);

  return {
    // Settings
    autoCompleteSearch,
    confirmDelete,
    showConfirmations,
    enableSoundEffects,
    enableAnimations,
    
    // Helper functions
    showToast,
    confirmDeleteAction,
    getAnimationClass,
    getTransitionDuration,
    playSound,
    getSearchConfig,
    shouldDisableAnimations,
    shouldDisableSounds,
    withConfirmation,
    
    // Direct access to full settings
    settings
  };
};

/**
 * Wrapper component for toast notifications that respects showConfirmations setting
 */
export const conditionalToast = {
  success: (message: string, showConfirmations: boolean) => {
    if (showConfirmations) toast.success(message);
  },
  error: (message: string, showConfirmations: boolean) => {
    if (showConfirmations) toast.error(message);
  },
  info: (message: string, showConfirmations: boolean) => {
    if (showConfirmations) toast(message);
  },
  loading: (message: string, showConfirmations: boolean) => {
    if (showConfirmations) return toast.loading(message);
    return null;
  },
  promise: <T,>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string },
    showConfirmations: boolean
  ) => {
    if (showConfirmations) {
      return toast.promise(promise, messages);
    }
    return promise;
  }
};

