/**
 * useSuccessModal Hook
 * Easy way to show success modals throughout the app
 * 
 * Example usage:
 * const successModal = useSuccessModal();
 * 
 * // Simple usage
 * successModal.show('Customer created successfully!');
 * 
 * // With custom title and buttons
 * successModal.show('Order placed!', {
 *   title: 'Order Confirmed',
 *   actionButtons: [
 *     { label: 'View Order', onClick: () => navigate('/orders/123') },
 *     { label: 'Continue Shopping', onClick: () => {}, variant: 'secondary' }
 *   ]
 * });
 */

import { useState, useCallback } from 'react';

export interface SuccessModalOptions {
  title?: string;
  autoCloseDelay?: number;
  actionButtons?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  icon?: React.ReactNode;
  showCloseButton?: boolean;
  playSound?: boolean; // Play success sound when modal opens (default: true)
}

export interface SuccessModalState {
  isOpen: boolean;
  title?: string;
  message: string;
  autoCloseDelay?: number;
  actionButtons?: SuccessModalOptions['actionButtons'];
  icon?: React.ReactNode;
  showCloseButton?: boolean;
  playSound?: boolean;
}

export const useSuccessModal = () => {
  const [state, setState] = useState<SuccessModalState>({
    isOpen: false,
    message: '',
    title: 'Success!',
    autoCloseDelay: 3000,
    showCloseButton: true,
    playSound: true,
  });

  const show = useCallback((message: string, options?: SuccessModalOptions) => {
    // Validate message - ensure it's a string and provide fallback if empty
    const messageStr = String(message || '');
    const validMessage = messageStr.trim() !== ''
      ? messageStr
      : 'Operation completed successfully!';

    // Warn if message is empty (in development)
    if (!messageStr || messageStr.trim() === '') {
      console.warn('⚠️ useSuccessModal: Empty message provided. Using fallback message.');
    }
    
    setState({
      isOpen: true,
      message: validMessage,
      title: options?.title || 'Success!',
      autoCloseDelay: options?.autoCloseDelay !== undefined ? options.autoCloseDelay : 3000,
      actionButtons: options?.actionButtons,
      icon: options?.icon,
      showCloseButton: options?.showCloseButton !== undefined ? options.showCloseButton : true,
      playSound: options?.playSound !== undefined ? options.playSound : true,
    });
  }, []);

  const hide = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    show,
    hide,
    isOpen: state.isOpen,
    props: {
      isOpen: state.isOpen,
      onClose: hide,
      message: state.message,
      title: state.title,
      autoCloseDelay: state.autoCloseDelay,
      actionButtons: state.actionButtons,
      icon: state.icon,
      showCloseButton: state.showCloseButton,
      playSound: state.playSound,
    },
  };
};

export default useSuccessModal;

