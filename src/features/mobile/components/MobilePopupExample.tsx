import React, { useState } from 'react';
import MobilePopupContainer from './MobilePopupContainer';
import {
  SimpleInput,
  InputGroup,
  LabelValueRow,
  SectionDivider,
  ContentSection,
  CollapsibleSection,
  ButtonGroup,
  Dropdown,
  Textarea,
  BottomSpacer
} from './MobilePopupInputs';

/**
 * Example: How to use MobilePopupContainer and MobilePopupInputs
 * 
 * This demonstrates the exact layout structure from the reference image.
 * Copy this pattern to create any form with the same UI style.
 */

interface MobilePopupExampleProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobilePopupExample: React.FC<MobilePopupExampleProps> = ({ isOpen, onClose }) => {
  // Form state
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [rate, setRate] = useState('0');
  const [quantity, setQuantity] = useState('1');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const handleSubmit = () => {
    console.log('Submitting:', { itemName, description, rate, quantity, category, notes });
    onClose();
  };

  const isValid = itemName.trim().length > 0;

  return (
    <MobilePopupContainer
      isOpen={isOpen}
      onClose={onClose}
      title="Add items"
      subtitle={`TZS ${rate}`}
      leftButtonText="Cancel"
      rightButtonText="Add"
      rightButtonDisabled={!isValid}
      onRightButtonClick={handleSubmit}
    >
      {/* TOP SECTION: Simple inputs with dividers (matching image exactly) */}
      <InputGroup>
        <SimpleInput
          placeholder="Item name"
          value={itemName}
          onChange={setItemName}
          autoFocus
        />
        <SimpleInput
          placeholder="Item description"
          value={description}
          onChange={setDescription}
        />
      </InputGroup>

      {/* SECTION DIVIDER - Gray background spacer (optional) */}
      <SectionDivider />

      {/* MIDDLE SECTION: Label-value rows (like "Rate" and "Quantity" in image) */}
      <div className="border-t border-b border-gray-200">
        <LabelValueRow 
          label="Rate" 
          value={`TZS ${rate}`} 
        />
        <div className="border-t border-gray-200">
          <LabelValueRow 
            label="Quantity" 
            value={quantity} 
          />
        </div>
      </div>

      {/* SECTION DIVIDER */}
      <SectionDivider />

      {/* BOTTOM SECTION: More controls in padded area */}
      <ContentSection>
        {/* Button Group Example */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[17px] font-semibold text-gray-900">Category</span>
            <span className="text-[17px] font-semibold text-gray-900">
              {category || '--'}
            </span>
          </div>
          <ButtonGroup
            options={[
              { value: 'product', label: 'Product' },
              { value: 'service', label: 'Service' }
            ]}
            selected={category}
            onChange={setCategory}
          />
        </div>

        {/* Collapsible Section (like "More options" in image) */}
        <CollapsibleSection
          title="More options"
          subtitle="VAT, days or hours, discount"
          isOpen={showMoreOptions}
          onToggle={() => setShowMoreOptions(!showMoreOptions)}
        >
          {/* Dropdown Example */}
          <Dropdown
            placeholder="Select discount type"
            value=""
            onChange={() => {}}
            options={[
              { value: 'percent', label: 'Percentage' },
              { value: 'fixed', label: 'Fixed Amount' }
            ]}
          />

          {/* Textarea Example */}
          <Textarea
            placeholder="Additional notes"
            value={notes}
            onChange={setNotes}
            rows={3}
          />
        </CollapsibleSection>
      </ContentSection>

      {/* BOTTOM SPACER - Safe area for scrolling */}
      <BottomSpacer />
    </MobilePopupContainer>
  );
};

export default MobilePopupExample;

/**
 * USAGE GUIDE:
 * ============
 * 
 * 1. SIMPLE FORM (just inputs):
 * ```tsx
 * <MobilePopupContainer title="Add Item" ...>
 *   <InputGroup>
 *     <SimpleInput placeholder="Name" ... />
 *     <SimpleInput placeholder="Price" ... />
 *   </InputGroup>
 *   <BottomSpacer />
 * </MobilePopupContainer>
 * ```
 * 
 * 2. WITH SECTIONS:
 * ```tsx
 * <MobilePopupContainer title="Edit" ...>
 *   <InputGroup>
 *     <SimpleInput ... />
 *   </InputGroup>
 *   
 *   <SectionDivider />
 *   
 *   <ContentSection>
 *     <ButtonGroup ... />
 *     <Dropdown ... />
 *   </ContentSection>
 *   
 *   <BottomSpacer />
 * </MobilePopupContainer>
 * ```
 * 
 * 3. WITH COLLAPSIBLE:
 * ```tsx
 * <ContentSection>
 *   <CollapsibleSection
 *     title="Advanced"
 *     subtitle="More settings"
 *     isOpen={open}
 *     onToggle={toggle}
 *   >
 *     <Dropdown ... />
 *     <Textarea ... />
 *   </CollapsibleSection>
 * </ContentSection>
 * ```
 * 
 * DIMENSIONS REFERENCE:
 * ====================
 * - Status bar spacer: h-11 (44px)
 * - Header height: h-11 (44px)
 * - Header padding: px-4 py-3
 * - Input padding: px-4 py-3.5
 * - Input font: text-[17px]
 * - Label font: text-[17px] font-semibold
 * - Subtitle font: text-[11px] or text-[13px]
 * - Section spacing: space-y-6 (24px)
 * - Button height: py-2.5 (10px top+bottom)
 * - Border color: border-gray-200
 * - Background: bg-gray-100 (for dropdowns/textarea)
 */

