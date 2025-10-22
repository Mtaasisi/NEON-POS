# Sidebar-Aware Modals Implementation Guide

## Overview
All modals in the application now respect the sidebar and topbar positioning, ensuring they never cover navigation elements and are properly centered in the available content space.

## What's Been Updated

### ✅ Core Components Updated
1. **`src/features/shared/components/ui/Modal.tsx`** - Base modal component
2. **`src/features/shared/components/GlobalSearchModal.tsx`** - Global search modal
3. **`src/features/lats/components/product/GeneralProductDetailModal.tsx`** - Product detail modal

### ✅ New Utilities Created
1. **`src/hooks/useSidebarAwareModal.ts`** - React hook for sidebar-aware positioning
2. **`src/layout/AppLayout.tsx`** - Added CSS variables for layout dimensions

## CSS Variables Available

The AppLayout now provides these CSS variables globally:

```css
--sidebar-width: 0px | 88px | 288px
--topbar-height: 64px
```

These variables automatically update when:
- Window is resized (mobile vs desktop)
- Sidebar collapses/expands
- User hovers over collapsed sidebar

## Z-Index Hierarchy

```
Layer Stack (bottom to top):
├── Main Content: z-10
├── TopBar: z-20
├── Modal Backdrop: z-35 ⭐ (below sidebar)
├── Sidebar: z-40
└── Modal Content: z-50
```

## Implementation Pattern

### Option 1: Use the Updated Base Modal Component

The simplest approach - just use the updated `Modal` component:

```tsx
import Modal from '../shared/components/ui/Modal';

<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="My Modal"
  maxWidth="lg"
>
  {/* Your content */}
</Modal>
```

✅ **Already sidebar-aware!** No additional changes needed.

### Option 2: Use the Hook for Custom Modals

For custom modal implementations, use the `useSidebarAwareModal` hook:

```tsx
import { createPortal } from 'react-dom';
import { useSidebarAwareModal } from '../../../hooks/useSidebarAwareModal';

const MyModal = ({ isOpen, onClose }) => {
  const { backdropStyle, modalContainerStyle } = useSidebarAwareModal();
  
  if (!isOpen) return null;
  
  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        style={{
          ...backdropStyle,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
        }}
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div style={{
        ...modalContainerStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Modal Content */}
        <div style={{ pointerEvents: 'auto' }}>
          {/* Your modal content */}
        </div>
      </div>
    </>,
    document.body
  );
};
```

### Option 3: Manual Implementation

If you prefer full control, use this pattern:

```tsx
return createPortal(
  <>
    {/* Backdrop - stays below sidebar (z-35) */}
    <div 
      className="fixed bg-black/30 backdrop-blur-sm"
      onClick={onClose}
      style={{
        left: 'var(--sidebar-width, 0px)',
        top: 'var(--topbar-height, 64px)',
        right: 0,
        bottom: 0,
        zIndex: 35,
      }}
    />
    
    {/* Modal Container - above sidebar (z-50) */}
    <div 
      className="fixed flex items-center justify-center p-4"
      style={{
        left: 'var(--sidebar-width, 0px)',
        top: 'var(--topbar-height, 64px)',
        right: 0,
        bottom: 0,
        zIndex: 50,
        pointerEvents: 'none', // Important!
      }}
    >
      {/* Modal Content */}
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }} // Important!
      >
        {/* Your content */}
      </div>
    </div>
  </>,
  document.body
);
```

## Key Points to Remember

### 1. **Backdrop Z-Index**
```tsx
zIndex: 35  // Must be below sidebar (z-40)
```

### 2. **Modal Z-Index**
```tsx
zIndex: 50  // Above sidebar but not too high
```

### 3. **Positioning**
```tsx
left: 'var(--sidebar-width, 0px)',   // Start after sidebar
top: 'var(--topbar-height, 64px)',    // Start below topbar
right: 0,
bottom: 0,
```

### 4. **Pointer Events**
```tsx
// Modal Container
pointerEvents: 'none'  // Allows clicks to pass through

// Modal Content
pointerEvents: 'auto'  // Makes modal interactive
```

## Modals That Still Need Updating

There are 90+ modal files that haven't been updated yet. Priority list:

### High Priority (Frequently Used)
- [ ] `CustomerDetailModal.tsx`
- [ ] `POSReceiptModal.tsx`
- [ ] `PaymentTrackingModal.tsx`
- [ ] `VariantSelectionModal.tsx`
- [ ] `CustomerSelectionModal.tsx`
- [ ] `EditProductModal.tsx`
- [ ] `StockAdjustModal.tsx`

### Medium Priority (Common Actions)
- [ ] `AddCustomerModal.tsx`
- [ ] `CreateUserModal.tsx`
- [ ] `EditUserModal.tsx`
- [ ] `StorageRoomModal.tsx`
- [ ] `ShelfModal.tsx`
- [ ] `CategoryFormModal.tsx`

### Lower Priority (Admin/Settings)
- [ ] `RoleManagementModal.tsx`
- [ ] `DiagnosticTemplateManagerModal.tsx`
- [ ] `POSSettingsModal.tsx`
- [ ] `QuickExpenseModal.tsx`
- [ ] `QuickReminderModal.tsx`

## Quick Migration Script

To quickly update a modal, follow these steps:

1. **Find the backdrop div** (usually has `fixed inset-0` or `z-[99999]`)

2. **Split into backdrop + container**:
   ```tsx
   // OLD
   <div className="fixed inset-0 z-[99999]">
     <div className="modal-content">...</div>
   </div>
   
   // NEW
   <>
     <div className="fixed" style={backdropStyle} />
     <div className="fixed" style={modalContainerStyle}>
       <div style={{ pointerEvents: 'auto' }}>...</div>
     </div>
   </>
   ```

3. **Update z-index values**:
   - Backdrop: `z-35`
   - Modal: `z-50`

4. **Add CSS variables**:
   ```tsx
   left: 'var(--sidebar-width, 0px)',
   top: 'var(--topbar-height, 64px)',
   ```

5. **Test**:
   - Open modal on desktop
   - Verify sidebar is visible
   - Hover to expand sidebar
   - Verify modal repositions correctly
   - Test on mobile

## Testing Checklist

For each updated modal, verify:

- [ ] Sidebar remains visible when modal opens
- [ ] Topbar remains visible when modal opens
- [ ] Sidebar is clickable (can expand/collapse)
- [ ] Topbar buttons are clickable
- [ ] Modal is centered in available space
- [ ] Backdrop only covers content area
- [ ] Modal closes on backdrop click
- [ ] Modal closes on ESC key
- [ ] Works on mobile (no sidebar)
- [ ] Works with collapsed sidebar (88px)
- [ ] Works with expanded sidebar (288px)
- [ ] Smooth transitions when sidebar expands/collapses

## Benefits

✅ **Better UX** - Navigation always accessible  
✅ **Consistent Positioning** - All modals behave the same  
✅ **Responsive** - Automatically adjusts to sidebar changes  
✅ **Mobile Friendly** - Handles no-sidebar layout correctly  
✅ **Maintainable** - Single source of truth (CSS variables)  

## Examples

### Before
```tsx
// Modal covered sidebar and topbar ❌
<div className="fixed inset-0 z-[99999]" ...>
  <div className="modal">...</div>
</div>
```

### After
```tsx
// Modal respects navigation ✅
<>
  <div style={{ 
    left: 'var(--sidebar-width, 0px)',
    top: 'var(--topbar-height, 64px)',
    zIndex: 35 
  }} />
  <div style={{ 
    left: 'var(--sidebar-width, 0px)',
    top: 'var(--topbar-height, 64px)',
    zIndex: 50 
  }}>
    <div style={{ pointerEvents: 'auto' }}>...</div>
  </div>
</>
```

## Status

- ✅ **Core Infrastructure**: Complete
- ✅ **Base Modal Component**: Updated
- ✅ **Example Implementations**: 3 modals updated
- ✅ **Utilities**: Hook created
- ⏳ **Remaining Modals**: 90+ to update

## Next Steps

1. Update high-priority modals first (customer-facing features)
2. Update medium-priority modals (common actions)
3. Update low-priority modals (admin features)
4. Consider creating a codemod script for automated updates

---

**Last Updated**: [Current Date]  
**Author**: AI Assistant  
**Version**: 1.0

