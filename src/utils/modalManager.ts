/**
 * Global Modal Manager
 * Handles ESC key, backdrop clicks, and modal stack management
 */

type ModalState = {
  id: string;
  onClose: () => void;
  closeOnEsc?: boolean;
  closeOnBackdrop?: boolean;
};

class ModalManager {
  private modals: ModalState[] = [];
  private escListener: ((e: KeyboardEvent) => void) | null = null;

  /**
   * Register a modal
   */
  register(modal: ModalState) {
    this.modals.push(modal);
    this.setupEscListener();
  }

  /**
   * Unregister a modal
   */
  unregister(id: string) {
    this.modals = this.modals.filter(m => m.id !== id);
    if (this.modals.length === 0) {
      this.removeEscListener();
    }
  }

  /**
   * Close top modal
   */
  closeTop() {
    const topModal = this.modals[this.modals.length - 1];
    if (topModal && topModal.closeOnEsc !== false) {
      topModal.onClose();
    }
  }

  /**
   * Close all modals
   */
  closeAll() {
    [...this.modals].reverse().forEach(modal => {
      modal.onClose();
    });
  }

  /**
   * Setup ESC key listener
   */
  private setupEscListener() {
    if (this.escListener) return;

    this.escListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.closeTop();
      }
    };

    window.addEventListener('keydown', this.escListener);
  }

  /**
   * Remove ESC key listener
   */
  private removeEscListener() {
    if (this.escListener) {
      window.removeEventListener('keydown', this.escListener);
      this.escListener = null;
    }
  }
}

export const modalManager = new ModalManager();

/**
 * Hook to use modal manager
 */
import { useEffect } from 'react';

export const useModal = (
  isOpen: boolean,
  onClose: () => void,
  options: {
    closeOnEsc?: boolean;
    closeOnBackdrop?: boolean;
  } = {}
) => {
  useEffect(() => {
    if (!isOpen) return;

    const id = Math.random().toString(36).substr(2, 9);
    
    modalManager.register({
      id,
      onClose,
      closeOnEsc: options.closeOnEsc !== false,
      closeOnBackdrop: options.closeOnBackdrop !== false,
    });

    return () => {
      modalManager.unregister(id);
    };
  }, [isOpen, onClose, options.closeOnEsc, options.closeOnBackdrop]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && options.closeOnBackdrop !== false) {
      onClose();
    }
  };

  return { handleBackdropClick };
};

