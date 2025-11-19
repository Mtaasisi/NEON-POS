import React, { useState } from 'react';
import MobileFullScreenSheet from '../components/MobileFullScreenSheet';
import {
  SheetInputField,
  SheetInputGroup,
  SheetDetailRow,
  SheetSectionDivider,
  SheetCollapsibleSection,
  SheetSearchSection,
  SheetContentSpacer
} from '../components/MobileSheetContent';

/**
 * MobileSheetDemo
 * 
 * Demo page to test the full-screen sheet component.
 * This shows the exact layout from the reference image.
 */

const MobileSheetDemo: React.FC = () => {
  const [showSheet, setShowSheet] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [rate, setRate] = useState('0');
  const [quantity, setQuantity] = useState('1');
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const total = parseFloat(rate || '0') * parseFloat(quantity || '1');

  const handleAdd = () => {
    console.log('Adding item:', {
      itemName,
      itemDescription,
      rate,
      quantity,
      total
    });
    alert(`Item added!\n\nName: ${itemName}\nDescription: ${itemDescription}\nRate: ${rate}\nQuantity: ${quantity}\nTotal: TZS ${total}`);
    setShowSheet(false);
  };

  const isValid = itemName.trim().length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 p-6">
      {/* Demo Page Content */}
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Full-Screen Sheet Demo
          </h1>
          <p className="text-gray-600 mb-6">
            Click the button below to see the iOS-style full-screen modal sheet
          </p>
          
          <button
            onClick={() => setShowSheet(true)}
            className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-all"
          >
            Open "Add items" Sheet
          </button>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">What to look for:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ 40px gap at top (shows this background)</li>
              <li>✓ Rounded top corners (20px)</li>
              <li>✓ Dark backdrop overlay</li>
              <li>✓ Slides up from bottom</li>
              <li>✓ Header: Cancel | Title | Add</li>
              <li>✓ Subtitle below title (TZS 0)</li>
              <li>✓ Scrollable content</li>
              <li>✓ Home indicator at bottom</li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            Layout Sections
          </h2>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">1</span>
              <span>Input fields (Item name, Description)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">2</span>
              <span>Gray divider (8px)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">3</span>
              <span>Detail rows (Rate, Quantity)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">4</span>
              <span>Gray divider (8px)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">5</span>
              <span>More options (collapsible)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">6</span>
              <span>Gray divider (8px)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">7</span>
              <span>Choose multiple (search)</span>
            </div>
          </div>
        </div>
      </div>

      {/* THE FULL-SCREEN SHEET */}
      <MobileFullScreenSheet
        isOpen={showSheet}
        onClose={() => setShowSheet(false)}
        title="Add items"
        subtitle={`TZS ${total}`}
        leftButtonText="Cancel"
        rightButtonText="Add"
        rightButtonDisabled={!isValid}
        onRightButtonClick={handleAdd}
      >
        {/* SECTION 1: Input Fields */}
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
              const newRate = prompt('Enter rate (TZS):', rate);
              if (newRate !== null && newRate.trim() !== '') {
                setRate(newRate.trim());
              }
            }}
          />
          <div className="border-t border-gray-200">
            <SheetDetailRow 
              label="Quantity" 
              value={quantity}
              onClick={() => {
                const newQty = prompt('Enter quantity:', quantity);
                if (newQty !== null && newQty.trim() !== '') {
                  setQuantity(newQty.trim());
                }
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
          <div style={{ padding: '16px' }}>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">VAT</p>
                <p className="text-xs text-gray-500">Tax settings would go here</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Time tracking</p>
                <p className="text-xs text-gray-500">Hours/days input would go here</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Discount</p>
                <p className="text-xs text-gray-500">Discount settings would go here</p>
              </div>
            </div>
          </div>
        </SheetCollapsibleSection>

        {/* Gray divider (8px) */}
        <SheetSectionDivider />

        {/* SECTION 4: Choose Multiple (Search) */}
        <SheetSearchSection
          title="Choose multiple"
          subtitle="Search items, expenses and time"
          onClick={() => alert('Search functionality would open here')}
        />

        {/* Bottom spacer for comfortable scrolling */}
        <SheetContentSpacer height={80} />
      </MobileFullScreenSheet>
    </div>
  );
};

export default MobileSheetDemo;

