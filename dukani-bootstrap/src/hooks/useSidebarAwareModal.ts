/**
 * Hook to get sidebar-aware modal positioning styles
 * 
 * Use this hook in any modal to automatically position it correctly
 * relative to the sidebar and topbar.
 * 
 * @example
 * ```tsx
 * const { backdropStyle, modalContainerStyle } = useSidebarAwareModal();
 * 
 * return createPortal(
 *   <>
 *     <div style={backdropStyle} onClick={onClose} />
 *     <div style={modalContainerStyle}>
 *       <div style={{ pointerEvents: 'auto' }}>
 *         {/* Your modal content *\/}
 *       </div>
 *     </div>
 *   </>,
 *   document.body
 * );
 * ```
 */
export const useSidebarAwareModal = () => {
  return {
    // Backdrop: below sidebar (z-35), positioned after sidebar/topbar
    backdropStyle: {
      position: 'fixed' as const,
      left: 'var(--sidebar-width, 0px)',
      top: 'var(--topbar-height, 64px)',
      right: 0,
      bottom: 0,
      zIndex: 35,
    },
    
    // Modal Container: above sidebar (z-50), positioned after sidebar/topbar
    modalContainerStyle: {
      position: 'fixed' as const,
      left: 'var(--sidebar-width, 0px)',
      top: 'var(--topbar-height, 64px)',
      right: 0,
      bottom: 0,
      zIndex: 50,
      pointerEvents: 'none' as const,
    },
  };
};

/**
 * Get sidebar-aware positioning without React hooks
 * Useful for class components or direct styling
 */
export const getSidebarAwareStyles = () => {
  return {
    backdropStyle: {
      position: 'fixed' as const,
      left: 'var(--sidebar-width, 0px)',
      top: 'var(--topbar-height, 64px)',
      right: 0,
      bottom: 0,
      zIndex: 35,
    },
    modalContainerStyle: {
      position: 'fixed' as const,
      left: 'var(--sidebar-width, 0px)',
      top: 'var(--topbar-height, 64px)',
      right: 0,
      bottom: 0,
      zIndex: 50,
      pointerEvents: 'none' as const,
    },
  };
};

