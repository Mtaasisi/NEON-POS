/**
 * Custom[YourFeature]Modal.tsx
 * 
 * Use this template when you need full control over modal styling
 * and don't want to use the generic Modal component.
 * 
 * ⚠️ IMPORTANT: This template includes useBodyScrollLock hook
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { toast } from 'react-hot-toast';

// 1. Define your props
interface Custom[YourFeature]ModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Add your custom props
}

// 2. Create your component
const Custom[YourFeature]Modal: React.FC<Custom[YourFeature]ModalProps> = ({
  isOpen,
  onClose,
  // Your props
}) => {
  // ✅ MANDATORY: Add scroll lock hook
  useBodyScrollLock(isOpen);

  // 3. Add your state
  const [loading, setLoading] = useState(false);

  // 4. Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // 5. Don't render if not open
  if (!isOpen) return null;

  // 6. Render modal using createPortal
  return createPortal(
    <>
      {/* Backdrop - respects sidebar and topbar */}
      <div 
        className="fixed bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        style={{
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0,
          zIndex: 35
        }}
      />
      
      {/* Modal Container */}
      <div 
        className="fixed flex items-center justify-center p-4"
        style={{
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0,
          zIndex: 50,
          pointerEvents: 'none'
        }}
      >
        {/* Modal Content */}
        <div 
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto modal-scrollable"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              [Your Modal Title]
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {/* Your modal content here */}
            <div className="space-y-4">
              <p className="text-gray-600">
                Your content goes here...
              </p>
            </div>
          </div>
          
          {/* Footer (optional) */}
          <div className="flex justify-end gap-2 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default Custom[YourFeature]Modal;

/**
 * CHECKLIST:
 * - [x] useBodyScrollLock hook added ✅
 * - [ ] Has proper TypeScript interfaces
 * - [ ] Handles Escape key
 * - [ ] Handles backdrop click
 * - [ ] Respects sidebar/topbar positioning
 * - [ ] Uses correct z-index values
 * - [ ] Modal content is scrollable
 * - [ ] Responsive design
 * - [ ] Loading states
 * - [ ] Error handling
 */

