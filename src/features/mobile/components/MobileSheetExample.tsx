import React, { useState } from 'react';
import MobileSheet from './MobileSheet'; // Assuming MobileSheet is the main wrapper now
import {
  SheetInputField,
  SheetInputGroup,
  SheetDetailRow,
  SheetSectionDivider,
  SheetCollapsibleSection,
  SheetContentSpacer
} from './MobileSheetContent';

/**
 * MobileSheetExample
 * 
 * Complete example that matches the EXACT layout from the reference image.
 * This shows the proper structure, spacing, and order of components.
 * 
 * Layout (matching image):
 * 1. Input fields (Item name, Item description)
 * 2. Section divider (gray)
 * 3. Detail rows (Rate, Quantity)
 * 4. Section divider (gray)
 * 5. More options (collapsible)
 * 6. Section divider (gray)
 * 7. Choose multiple (search section)
 * 8. Bottom spacer
 */

interface MobileSheetExampleProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileSheetExample: React.FC<MobileSheetExampleProps> = ({
  isOpen,
  onClose
}) => {
  // Form state
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [rate, setRate] = useState('0');
  const [quantity, setQuantity] = useState('1');
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Calculate total (for subtitle)
  const total = parseFloat(rate) * parseFloat(quantity);

  const handleAdd = () => {
    console.log('Adding item:', {
      itemName,
      itemDescription,
      rate,
      quantity,
      total
    });
    onClose();
  };

  const handleChooseMultiple = () => {
    console.log('Opening search for items, expenses, and time');
  };

  const isValid = itemName.trim().length > 0;

  return (
    <MobileSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Add items"
      subtitle={`TZS ${total}`}
      leftButtonText="Cancel"
      rightButtonText="Add"
      rightButtonDisabled={!isValid}
      onRightButtonClick={handleAdd}
    >
      {/* SECTION 1: Input Fields (matching image) */}
      <SheetInputGroup>
        <SheetInputField
          placeholder="Item name"
          value={itemName}
          onChange={setItemName}
          autoFocus
        />
        <SheetInputField
          placeholder="Item description"
          value={itemDescription}
          onChange={setItemDescription}
        />
      </SheetInputGroup>

      {/* Gray divider (8px) */}
      <SheetSectionDivider />

      {/* SECTION 2: Item Details (Rate & Quantity) */}
      <SheetInputGroup>
        <SheetDetailRow 
          label="Rate" 
          value={`TZS ${rate}`}
          onClick={() => {
            const newRate = prompt('Enter rate:', rate);
            if (newRate) setRate(newRate);
          }}
        />
        <SheetDetailRow 
          label="Quantity" 
          value={quantity}
          onClick={() => {
            const newQty = prompt('Enter quantity:', quantity);
            if (newQty) setQuantity(newQty);
          }}
        />
      </SheetInputGroup>

      {/* Gray divider (8px) */}
      <SheetSectionDivider />

      {/* SECTION 3: More Options (Collapsible) */}
      <SheetCollapsibleSection
        title="More options"
        subtitle="VAT, days or hours, discount"
        isOpen={showMoreOptions}
        onToggle={() => setShowMoreOptions(!showMoreOptions)}
      >
        {/* Content when expanded (add your options here) */}
        <div className="px-4 py-3">
          <p className="text-neutral-500 text-[14px]">
            Additional options would go here...
          </p>
        </div>
      </SheetCollapsibleSection>

      {/* Gray divider (8px) */}
      <SheetSectionDivider />

      {/* SECTION 4: Choose Multiple (Search) */}
      {/* Replaced with a placeholder for now as SheetSearchSection is not defined in MobileSheetContent.tsx */}
      <SheetInputGroup>
        <SheetDetailRow
          label="Choose multiple"
          value="Search items, expenses and time"
          onClick={handleChooseMultiple}
        />
      </SheetInputGroup>

      {/* Bottom spacer for comfortable scrolling */}
      <SheetContentSpacer />
    </MobileSheet>
  );
};

export default MobileSheetExample;
