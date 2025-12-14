import React, { useState } from 'react';
import MobileFullScreenSheet from './MobileFullScreenSheet';
import {
  SheetInputField,
  SheetInputGroup,
  SheetDetailRow,
  SheetSectionDivider,
  SheetCollapsibleSection,
  SheetSearchSection,
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
    <MobileFullScreenSheet
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
      <div className="border-t border-b border-gray-200">
        <SheetDetailRow 
          label="Rate" 
          value={`TZS ${rate}`}
          onClick={() => {
            const newRate = prompt('Enter rate:', rate);
            if (newRate) setRate(newRate);
          }}
        />
        <div className="border-t border-gray-200">
          <SheetDetailRow 
            label="Quantity" 
            value={quantity}
            onClick={() => {
              const newQty = prompt('Enter quantity:', quantity);
              if (newQty) setQuantity(newQty);
            }}
          />
        </div>
      </div>

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
        <div style={{ padding: '16px' }}>
          <p className="text-gray-500 text-sm">
            Additional options would go here...
          </p>
        </div>
      </SheetCollapsibleSection>

      {/* Gray divider (8px) */}
      <SheetSectionDivider />

      {/* SECTION 4: Choose Multiple (Search) */}
      <SheetSearchSection
        title="Choose multiple"
        subtitle="Search items, expenses and time"
        onClick={handleChooseMultiple}
      />

      {/* Bottom spacer for comfortable scrolling */}
      <SheetContentSpacer />
    </MobileFullScreenSheet>
  );
};

export default MobileSheetExample;

/**
 * USAGE:
 * ======
 * 
 * import MobileSheetExample from '@/features/mobile/components/MobileSheetExample';
 * 
 * function MyComponent() {
 *   const [showSheet, setShowSheet] = useState(false);
 * 
 *   return (
 *     <>
 *       <button onClick={() => setShowSheet(true)}>
 *         Add Item
 *       </button>
 * 
 *       <MobileSheetExample 
 *         isOpen={showSheet} 
 *         onClose={() => setShowSheet(false)} 
 *       />
 *     </>
 *   );
 * }
 * 
 * 
 * LAYOUT REFERENCE (from image):
 * ===============================
 * 
 * [Header: Cancel | Add items (TZS 0) | Add]
 * ├─ Item name
 * ├─ Item description
 * [Gray Divider]
 * ├─ Rate: TZS 0
 * ├─ Quantity: 1
 * [Gray Divider]
 * ├─ More options (chevron)
 * │  └─ VAT, days or hours, discount
 * [Gray Divider]
 * ├─ Choose multiple (search icon)
 * │  └─ Search items, expenses and time
 * [Bottom Spacer]
 * [Home Indicator]
 * 
 * 
 * DIMENSIONS REFERENCE:
 * ====================
 * - Top margin: 40px (shows background behind sheet)
 * - Border radius: 20px (top corners only)
 * - Header height: 44px content + 12px padding top/bottom = 56px
 * - Input padding: 14px vertical, 16px horizontal
 * - Section divider: 8px height, #F2F2F7 gray
 * - Font sizes: 17px (main), 13px (subtitle), 11px (header subtitle)
 * - Border color: #E5E5EA (gray-200)
 * - Home indicator: 134px width, 5px height, rounded-full
 */

