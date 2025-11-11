# Mobile Popup System

A reusable popup component system that exactly matches the iOS-style popup from the reference image.

## 📐 Exact Dimensions

All measurements are based on the reference image:

- **Status Bar**: `h-11` (44px) - iOS notch area spacer
- **Header Bar**: `h-11` (44px) - Total header height
- **Header Padding**: `px-4 py-3` - Horizontal and vertical padding
- **Input Padding**: `px-4 py-3.5` - Touch-friendly input spacing
- **Section Spacing**: `space-y-6` (24px) - Between major sections
- **Button Height**: `py-2.5` (20px total) - Buttons within sections
- **Border Color**: `border-gray-200` - Divider lines
- **Background**: `bg-gray-100` - Dropdowns and text areas

## 🎨 Typography

- **Title**: `text-[17px] font-semibold` - Header title
- **Subtitle**: `text-[11px]` - Header subtitle (under title)
- **Input Text**: `text-[17px]` - User input
- **Placeholder**: `text-[17px] text-gray-400` - Placeholder text
- **Label**: `text-[17px] font-semibold` - Section labels
- **Hint**: `text-[13px] text-gray-500` - Helper text

## 📦 Components

### 1. MobilePopupContainer

The main container that provides the popup structure.

```tsx
import { MobilePopupContainer } from '@/features/mobile/components';

<MobilePopupContainer
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Add items"
  subtitle="TZS 0"
  leftButtonText="Cancel"
  rightButtonText="Add"
  rightButtonDisabled={!isValid}
  onRightButtonClick={handleSubmit}
>
  {/* Your content */}
</MobilePopupContainer>
```

**Props:**
- `isOpen: boolean` - Show/hide popup
- `onClose: () => void` - Close handler
- `title: string` - Main title (centered, 17px bold)
- `subtitle?: string` - Below title (11px gray)
- `leftButtonText?: string` - Left button (default: "Cancel")
- `rightButtonText?: string` - Right button (default: "Done")
- `rightButtonDisabled?: boolean` - Disable right button
- `onRightButtonClick?: () => void` - Right button handler
- `children: ReactNode` - Popup content

### 2. Input Components

Pre-styled components matching the image exactly.

#### SimpleInput
Borderless input with bottom divider (like in image).

```tsx
<SimpleInput
  placeholder="Item name"
  value={value}
  onChange={setValue}
  type="text"
  autoFocus
/>
```

#### InputGroup
Groups multiple inputs with divider lines.

```tsx
<InputGroup>
  <SimpleInput placeholder="Name" ... />
  <SimpleInput placeholder="Description" ... />
</InputGroup>
```

#### LabelValueRow
Label on left, value on right (like "Rate: TZS 0").

```tsx
<LabelValueRow 
  label="Rate" 
  value="TZS 0" 
/>
```

#### ButtonGroup
Side-by-side buttons (for gender, category, etc.).

```tsx
<ButtonGroup
  options={[
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' }
  ]}
  selected={gender}
  onChange={setGender}
/>
```

#### Dropdown
Gray background select dropdown.

```tsx
<Dropdown
  placeholder="Select region"
  value={city}
  onChange={setCity}
  options={regions.map(r => ({ value: r, label: r }))}
/>
```

#### Textarea
Multi-line text input with gray background.

```tsx
<Textarea
  placeholder="Notes (Optional)"
  value={notes}
  onChange={setNotes}
  rows={3}
/>
```

#### CollapsibleSection
Expandable section (like "More options" in image).

```tsx
<CollapsibleSection
  title="More options"
  subtitle="VAT, days or hours, discount"
  isOpen={showMore}
  onToggle={() => setShowMore(!showMore)}
>
  <Dropdown ... />
  <Textarea ... />
</CollapsibleSection>
```

### 3. Layout Components

#### SectionDivider
Gray background spacer between sections.

```tsx
<SectionDivider />
```

#### ContentSection
Padded container for controls (24px spacing).

```tsx
<ContentSection>
  <ButtonGroup ... />
  <Dropdown ... />
</ContentSection>
```

#### BottomSpacer
Safe area padding at bottom for scrolling.

```tsx
<BottomSpacer />
```

## 📝 Complete Example

```tsx
import { 
  MobilePopupContainer,
  InputGroup,
  SimpleInput,
  LabelValueRow,
  SectionDivider,
  ContentSection,
  ButtonGroup,
  CollapsibleSection,
  Dropdown,
  Textarea,
  BottomSpacer
} from '@/features/mobile/components';

function MyPopup({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [showMore, setShowMore] = useState(false);

  return (
    <MobilePopupContainer
      isOpen={isOpen}
      onClose={onClose}
      title="Add Item"
      subtitle="TZS 0"
      rightButtonText="Add"
      rightButtonDisabled={!name}
      onRightButtonClick={handleSubmit}
    >
      {/* Top inputs */}
      <InputGroup>
        <SimpleInput 
          placeholder="Item name" 
          value={name} 
          onChange={setName} 
          autoFocus 
        />
        <SimpleInput 
          placeholder="Description" 
          value={desc} 
          onChange={setDesc} 
        />
      </InputGroup>

      <SectionDivider />

      {/* Label-value rows */}
      <div className="border-t border-b border-gray-200">
        <LabelValueRow label="Rate" value="TZS 0" />
      </div>

      <SectionDivider />

      {/* Controls section */}
      <ContentSection>
        <div>
          <div className="flex justify-between mb-3">
            <span className="text-[17px] font-semibold">Type</span>
            <span className="text-[17px] font-semibold">{type || '--'}</span>
          </div>
          <ButtonGroup
            options={[
              { value: 'product', label: 'Product' },
              { value: 'service', label: 'Service' }
            ]}
            selected={type}
            onChange={setType}
          />
        </div>

        <CollapsibleSection
          title="More options"
          subtitle="Additional settings"
          isOpen={showMore}
          onToggle={() => setShowMore(!showMore)}
        >
          <Dropdown
            placeholder="Category"
            value={category}
            onChange={setCategory}
            options={categories}
          />
          <Textarea
            placeholder="Notes"
            value={notes}
            onChange={setNotes}
          />
        </CollapsibleSection>
      </ContentSection>

      <BottomSpacer />
    </MobilePopupContainer>
  );
}
```

## 🎯 Layout Patterns

### Pattern 1: Simple Form
```tsx
<InputGroup>
  <SimpleInput ... />
  <SimpleInput ... />
</InputGroup>
<BottomSpacer />
```

### Pattern 2: With Sections
```tsx
<InputGroup>...</InputGroup>
<SectionDivider />
<ContentSection>...</ContentSection>
<BottomSpacer />
```

### Pattern 3: Full Layout (from image)
```tsx
<InputGroup>...</InputGroup>
<SectionDivider />
<div className="border-t border-b">
  <LabelValueRow ... />
</div>
<SectionDivider />
<ContentSection>
  <ButtonGroup ... />
  <CollapsibleSection ...>
    <Dropdown ... />
  </CollapsibleSection>
</ContentSection>
<BottomSpacer />
```

## 🎨 Customization

### Custom Header Value
```tsx
subtitle={`TZS ${calculateTotal()}`}
```

### Disabled State
```tsx
rightButtonDisabled={!isFormValid()}
```

### Custom Handler
```tsx
onRightButtonClick={async () => {
  await saveData();
  onClose();
}}
```

## 📱 Responsive Behavior

- **Mobile**: Full screen, slides up from bottom
- **Desktop (sm:)**: Centered modal with shadow and rounded corners
- **Animation**: 0.35s cubic-bezier slide-up on mobile, fade-in on desktop

## ✨ Features

✅ Exact dimensions from reference image  
✅ iOS-style header with status bar spacer  
✅ Smooth animations (slide-up on mobile, fade on desktop)  
✅ Home indicator at bottom  
✅ Scrollable content area  
✅ Touch-optimized spacing  
✅ Consistent typography  
✅ Reusable components  
✅ TypeScript support  
✅ Fully responsive  

## 🔧 Tips

1. **Always use BottomSpacer** at the end for safe scrolling
2. **Use InputGroup** for borderless inputs with dividers
3. **Use ContentSection** for controls with proper spacing
4. **Use SectionDivider** to separate major sections
5. **Match font sizes** from the constants above
6. **Keep button text short** for proper layout (≤70px min-width)

