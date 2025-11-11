# iOS Full-Screen Modal Sheet

A pixel-perfect iOS-style full-screen modal sheet that matches the exact layout from the reference image.

## 🎯 Overview

This component recreates the iOS "Add items" sheet with exact dimensions, spacing, and animations.

**Key Features:**
- ✅ Full-screen height (fills screen minus 40px top margin)
- ✅ Rounded top corners (20px radius)
- ✅ Slides up from bottom with smooth animation
- ✅ Semi-transparent backdrop overlay
- ✅ iOS-style header with Cancel/Title/Action buttons
- ✅ Scrollable content area
- ✅ Home indicator at bottom
- ✅ Prevents body scroll when open
- ✅ Click backdrop to dismiss

## 📐 Exact Dimensions (from reference image)

### Layout Structure
```
┌──────────────────────────────────────┐
│  [40px space - shows background]     │
├──────────────────────────────────────┤ ← Rounded top (20px)
│  Header (56px total)                 │
│  ├─ Cancel | Add items | Add         │ ← 44px content
│  └─ TZS 0                             │ ← 11px subtitle
├──────────────────────────────────────┤
│                                       │
│  Scrollable Content Area              │
│  (fills remaining height)             │
│                                       │
├──────────────────────────────────────┤
│  Home Indicator (21px)                │
│  ▁▁▁▁▁▁▁▁▁▁▁ (134x5px)               │
└──────────────────────────────────────┘
```

### Header Dimensions
- **Total height**: 56px (44px content + 12px padding top/bottom)
- **Horizontal padding**: 16px left/right
- **Button min-width**: 70px
- **Title font**: 17px, semibold, -0.41px letter-spacing
- **Subtitle font**: 11px, normal, -0.07px letter-spacing, gray-500
- **Button font**: 17px, normal, -0.41px letter-spacing
- **Border**: 1px solid gray-200 at bottom

### Content Dimensions
- **Input padding**: 14px vertical, 16px horizontal
- **Font size**: 17px, -0.41px letter-spacing
- **Placeholder color**: #C7C7CC (gray-400)
- **Border dividers**: 1px solid #E5E5EA (gray-200)

### Section Divider
- **Height**: 8px
- **Background**: #F2F2F7 (gray-100)

### Detail Rows (Rate, Quantity)
- **Padding**: 14px vertical, 16px horizontal
- **Label font**: 17px, normal
- **Value font**: 17px, semibold

### Collapsible Section
- **Title font**: 17px, semibold
- **Subtitle font**: 13px, normal, -0.08px letter-spacing
- **Icon size**: 20px (ChevronDown)
- **Rotation**: 180deg when open

### Home Indicator
- **Width**: 134px
- **Height**: 5px
- **Color**: gray-300
- **Padding**: 8px top/bottom
- **Border radius**: Full (rounded-full)

## 📦 Components

### 1. MobileFullScreenSheet

The main container component.

```tsx
import { MobileFullScreenSheet } from '@/features/mobile/components';

<MobileFullScreenSheet
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
</MobileFullScreenSheet>
```

**Props:**
- `isOpen: boolean` - Controls visibility
- `onClose: () => void` - Called when closing
- `title: string` - Header title (centered, bold)
- `subtitle?: string` - Below title (gray, 11px)
- `leftButtonText?: string` - Left button (default: "Cancel")
- `leftButtonDisabled?: boolean` - Disable left button
- `rightButtonText?: string` - Right button (default: "Add")
- `rightButtonDisabled?: boolean` - Disable right button (gray when true)
- `onRightButtonClick?: () => void` - Right button handler
- `children: ReactNode` - Sheet content

### 2. Sheet Content Components

Pre-styled components matching the exact image layout.

#### SheetInputField
Borderless input with divider line.

```tsx
<SheetInputField
  placeholder="Item name"
  value={value}
  onChange={setValue}
  type="text"
  autoFocus
/>
```

#### SheetInputGroup
Groups multiple inputs with dividers.

```tsx
<SheetInputGroup>
  <SheetInputField placeholder="Item name" ... />
  <SheetInputField placeholder="Item description" ... />
</SheetInputGroup>
```

#### SheetDetailRow
Label-value row (like "Rate: TZS 0").

```tsx
<SheetDetailRow 
  label="Rate" 
  value="TZS 0"
  onClick={handleEditRate}
/>
```

#### SheetSectionDivider
8px gray divider between sections.

```tsx
<SheetSectionDivider />
```

#### SheetCollapsibleSection
Expandable section with chevron.

```tsx
<SheetCollapsibleSection
  title="More options"
  subtitle="VAT, days or hours, discount"
  isOpen={isOpen}
  onToggle={() => setIsOpen(!isOpen)}
>
  {/* Content when expanded */}
</SheetCollapsibleSection>
```

#### SheetSearchSection
Section with search icon.

```tsx
<SheetSearchSection
  title="Choose multiple"
  subtitle="Search items, expenses and time"
  onClick={handleSearch}
/>
```

#### SheetContentSpacer
Bottom padding for comfortable scrolling.

```tsx
<SheetContentSpacer height={80} />
```

## 🎨 Complete Example (Matching Reference Image)

```tsx
import { 
  MobileFullScreenSheet,
  SheetInputGroup,
  SheetInputField,
  SheetDetailRow,
  SheetSectionDivider,
  SheetCollapsibleSection,
  SheetSearchSection,
  SheetContentSpacer
} from '@/features/mobile/components';

function AddItemSheet({ isOpen, onClose }) {
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [rate, setRate] = useState('0');
  const [quantity, setQuantity] = useState('1');
  const [showMore, setShowMore] = useState(false);

  const total = parseFloat(rate) * parseFloat(quantity);

  return (
    <MobileFullScreenSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Add items"
      subtitle={`TZS ${total}`}
      rightButtonText="Add"
      rightButtonDisabled={!itemName}
      onRightButtonClick={handleSubmit}
    >
      {/* Input Fields */}
      <SheetInputGroup>
        <SheetInputField
          placeholder="Item name"
          value={itemName}
          onChange={setItemName}
          autoFocus
        />
        <SheetInputField
          placeholder="Item description"
          value={description}
          onChange={setDescription}
        />
      </SheetInputGroup>

      <SheetSectionDivider />

      {/* Details */}
      <div className="border-t border-b border-gray-200">
        <SheetDetailRow label="Rate" value={`TZS ${rate}`} />
        <div className="border-t border-gray-200">
          <SheetDetailRow label="Quantity" value={quantity} />
        </div>
      </div>

      <SheetSectionDivider />

      {/* More Options */}
      <SheetCollapsibleSection
        title="More options"
        subtitle="VAT, days or hours, discount"
        isOpen={showMore}
        onToggle={() => setShowMore(!showMore)}
      >
        {/* Options content */}
      </SheetCollapsibleSection>

      <SheetSectionDivider />

      {/* Search */}
      <SheetSearchSection
        title="Choose multiple"
        subtitle="Search items, expenses and time"
        onClick={handleSearch}
      />

      <SheetContentSpacer />
    </MobileFullScreenSheet>
  );
}
```

## 🎭 Animations

### Slide Up Animation
- **Duration**: 0.4s
- **Easing**: `cubic-bezier(0.32, 0.72, 0, 1)` - iOS spring curve
- **Transform**: `translateY(100%)` → `translateY(0)`

### Backdrop Fade In
- **Duration**: 0.3s
- **Easing**: `ease-out`
- **Opacity**: 0 → 1 (40% black)

### Smooth Scrolling
- **iOS momentum**: `-webkit-overflow-scrolling: touch`
- **Overscroll**: `contain` (prevents background scroll)
- **Scrollbar**: Hidden but functional

## 🎯 Layout Order (from reference image)

1. **Header** (Cancel | Title + Subtitle | Add)
2. **Input Fields** (Item name, Description)
3. **Section Divider** (8px gray)
4. **Detail Rows** (Rate, Quantity with borders)
5. **Section Divider** (8px gray)
6. **Collapsible Section** (More options with chevron)
7. **Section Divider** (8px gray)
8. **Search Section** (Choose multiple with search icon)
9. **Content Spacer** (80px bottom padding)
10. **Home Indicator** (134×5px rounded bar)

## 💡 Usage Tips

1. **Always use SheetContentSpacer** at the bottom for comfortable scrolling
2. **Wrap detail rows** in bordered container for proper styling
3. **Use SheetSectionDivider** to separate major sections (matches image)
4. **Set rightButtonDisabled** based on form validation
5. **Update subtitle** to show calculated values (like total)
6. **Click backdrop** to dismiss sheet
7. **Prevent body scroll** - handled automatically

## 🎨 Color Reference

```tsx
// Text colors
const colors = {
  primary: '#000000',           // Black - main text
  secondary: '#8E8E93',         // Gray-500 - subtitles
  placeholder: '#C7C7CC',       // Gray-400 - placeholders
  blue: '#007AFF',              // iOS blue - buttons
  blueDisabled: '#C7C7CC',      // Gray-400 - disabled button
  
  // Backgrounds
  white: '#FFFFFF',             // Main background
  grayDivider: '#F2F2F7',      // Gray-100 - section dividers
  
  // Borders
  border: '#E5E5EA',           // Gray-200 - divider lines
  
  // Home Indicator
  indicator: '#D1D1D6'         // Gray-300
};
```

## 📱 Responsive Behavior

- **Takes full screen height** minus 40px at top
- **Shows background** behind top rounded corners
- **Backdrop overlay** covers entire screen
- **Prevents body scroll** when open
- **Smooth animations** on open/close
- **Touch-optimized** spacing and sizing

## ✨ Features

✅ Pixel-perfect dimensions from reference image  
✅ iOS-style slide-up animation  
✅ Rounded top corners (20px)  
✅ Semi-transparent backdrop  
✅ Scrollable content area  
✅ Home indicator at bottom  
✅ Prevents background scroll  
✅ Click outside to dismiss  
✅ Touch-optimized spacing  
✅ Consistent typography  
✅ TypeScript support  

## 🔧 Advanced Customization

### Custom Backdrop
The backdrop uses `bg-black/40` (40% opacity). Modify in `MobileFullScreenSheet.tsx`.

### Custom Top Margin
Default is 40px. Change `calc(100vh - 40px)` to adjust.

### Custom Border Radius
Default is 20px. Modify `borderTopLeftRadius` and `borderTopRightRadius`.

### Hide Home Indicator
Home indicator is always shown. To hide, remove the indicator div.

### Custom Animation
Modify animation timing in the `<style>` block for different feel.

