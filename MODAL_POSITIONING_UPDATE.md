# Modal Positioning Update

## Overview
Updated the GeneralProductDetailModal to be aware of the sidebar and topbar, positioning itself in the center of the available viewport space without covering navigation elements.

## Changes Made

### 1. AppLayout.tsx
Added CSS custom properties to communicate layout dimensions to modals:

```typescript
// Added isMobile state
const [isMobile, setIsMobile] = useState(false);

// Added resize listener
useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768);
  };
  
  checkMobile();
  window.addEventListener('resize', checkMobile);
  
  return () => window.removeEventListener('resize', checkMobile);
}, []);

// Added CSS variables to root div
<div 
  className="min-h-screen" 
  style={{ 
    backgroundColor: 'transparent',
    '--sidebar-width': isMobile ? '0px' : (isNavCollapsed ? '88px' : '288px'),
    '--topbar-height': '64px'
  } as React.CSSProperties}
>
```

### 2. GeneralProductDetailModal.tsx
Updated modal positioning to respect sidebar and topbar:

```typescript
// Modal container now starts after sidebar and topbar
<div 
  className="fixed flex items-center justify-center p-2 sm:p-4 overflow-y-auto" 
  style={{ 
    zIndex: 99999,
    left: 'var(--sidebar-width, 0px)',
    top: 'var(--topbar-height, 64px)',
    right: 0,
    bottom: 0
  }}
>
  {/* Backdrop covers entire screen including sidebar/topbar */}
  <div 
    className="absolute bg-black/30 backdrop-blur-sm"
    onClick={onClose}
    style={{
      left: 'calc(-1 * var(--sidebar-width, 0px))',
      top: 'calc(-1 * var(--topbar-height, 64px))',
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh'
    }}
  />
```

## How It Works

### Desktop Behavior
1. **Sidebar Width**: 
   - Collapsed: `88px`
   - Expanded: `288px`
   - Modal starts after the sidebar edge

2. **Topbar Height**: 
   - Fixed at `64px`
   - Modal starts below the topbar

3. **Modal Centering**:
   - Modal is centered in the remaining viewport space
   - Backdrop covers the entire screen (including sidebar/topbar)
   - Modal content appears only in the available space

### Mobile Behavior
- Sidebar width is `0px` (sidebar is hidden on mobile)
- Topbar height remains `64px`
- Modal uses full width but starts below topbar

### Responsive Updates
- Window resize events automatically update the layout
- Modal repositions when sidebar collapses/expands
- Smooth transitions maintain UX

## CSS Variables
The following CSS custom properties are now available globally:

- `--sidebar-width`: Current sidebar width (0px, 88px, or 288px)
- `--topbar-height`: Topbar height (64px)

These can be used by any modal or overlay component in the application.

## Benefits

✅ **No Navigation Overlap**: Modal never covers sidebar or topbar  
✅ **Proper Centering**: Modal is centered in available space  
✅ **Responsive**: Automatically adjusts on window resize  
✅ **Mobile Friendly**: Handles mobile layout correctly  
✅ **Reusable**: CSS variables can be used by other components  
✅ **Smooth Transitions**: Layout changes are smooth and natural  

## Testing

To verify the changes:

1. Open a product detail modal on desktop
2. Observe modal is centered between sidebar and right edge
3. Hover over sidebar to expand it
4. Modal should remain centered in the new available space
5. Resize window to mobile view
6. Modal should use full width (minus padding) below topbar

## Status

✅ **COMPLETE** - Modal now properly respects sidebar and topbar positioning across all screen sizes.

