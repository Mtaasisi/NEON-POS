/**
 * [YourFeature]Modal.tsx
 * 
 * Description: [Brief description of what this modal does]
 * 
 * Usage:
 * ```tsx
 * import [YourFeature]Modal from './[YourFeature]Modal';
 * 
 * <[YourFeature]Modal 
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   // your props
 * />
 * ```
 */

import React, { useState } from 'react';
import Modal from '../../shared/components/ui/Modal';
import GlassButton from '../../shared/components/ui/GlassButton';
import GlassInput from '../../shared/components/ui/GlassInput';
import { toast } from 'react-hot-toast';

// 1. Define your props interface
interface [YourFeature]ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: any) => void | Promise<void>;
  // Add your custom props here
  // data?: YourDataType;
}

// 2. Create your component
const [YourFeature]Modal: React.FC<[YourFeature]ModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  // Your props
}) => {
  // 3. Add your state
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Your form fields
  });

  // 4. Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Your submission logic
      await onSubmit?.(formData);
      
      toast.success('Success!');
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // 5. Handle input changes
  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 6. Render modal
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title="[Your Modal Title]"
      maxWidth="lg" // sm | md | lg | xl | 2xl | full
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Your form fields */}
        <GlassInput
          label="Field Name"
          value={formData.fieldName || ''}
          onChange={(e) => handleChange('fieldName', e.target.value)}
          required
        />

        {/* More fields... */}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <GlassButton 
            type="button"
            variant="secondary" 
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </GlassButton>
          <GlassButton 
            type="submit"
            variant="primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </GlassButton>
        </div>
      </form>
    </Modal>
  );
};

export default [YourFeature]Modal;

/**
 * CHECKLIST:
 * - [ ] Uses generic Modal component (scroll lock included)
 * - [ ] Has proper TypeScript interfaces
 * - [ ] Handles loading states
 * - [ ] Handles errors with toast
 * - [ ] Form validation included
 * - [ ] Responsive design
 * - [ ] Keyboard accessible
 * - [ ] Closes on Escape key
 * - [ ] Closes on backdrop click
 */

