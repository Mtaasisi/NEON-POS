# Modal Sidebar Visibility Fix

## Problem
The sidebar was being hidden when GeneralProductDetailModal was opened, even though we positioned the modal to start after the sidebar.

## Root Cause
The backdrop's z-index (z-50) was higher than the sidebar's z-index (z-40), causing the backdrop to appear visually on top of the sidebar.

## Solution

### Z-Index Layering
Updated the z-index hierarchy to ensure proper stacking:

```
Layer Stack (bottom to top):
├── Main Content: z-10
├── TopBar: z-20
├── Backdrop: z-35 ⭐ (stays below sidebar)
├── Sidebar: z-40
└── Modal: z-50
```

### Key Changes

**Before:**
```tsx
// Backdrop was z-50 (above sidebar z-40) ❌
<div style={{ zIndex: 50, ... }} />
<div style={{ zIndex: 99999, ... }} /> // Modal
```

**After:**
```tsx
// Backdrop is z-35 (below sidebar z-40) ✅
<div style={{ zIndex: 35, ... }} />
<div style={{ zIndex: 50, ... }} /> // Modal
```

### Positioning Strategy

Both backdrop and modal are positioned to avoid navigation areas:

```tsx
{
  left: 'var(--sidebar-width, 0px)',   // Start after sidebar
  top: 'var(--topbar-height, 64px)',   // Start below topbar
  right: 0,
  bottom: 0
}
```

### CSS Variables (from AppLayout)

```tsx
style={{
  '--sidebar-width': isMobile ? '0px' : (isNavCollapsed ? '88px' : '288px'),
  '--topbar-height': '64px'
}}
```

## Result

✅ **Sidebar fully visible** - z-35 backdrop stays below z-40 sidebar  
✅ **TopBar fully visible** - Backdrop starts below it  
✅ **Sidebar interactive** - Can hover to expand, click items  
✅ **TopBar interactive** - All navigation works  
✅ **Modal properly positioned** - Centered in content area  
✅ **Backdrop only on content** - Doesn't cover navigation  

## Z-Index Reference

| Element | Z-Index | Purpose |
|---------|---------|---------|
| Main Content | 10 | Base content layer |
| TopBar | 20 | Navigation header |
| Backdrop | 35 | Modal overlay (below nav) |
| Sidebar | 40 | Side navigation |
| Modal | 50 | Modal content (above all) |

## Testing Checklist

- [x] Sidebar visible when modal opens
- [x] Sidebar hover/expand works
- [x] Sidebar items clickable
- [x] TopBar visible and interactive
- [x] Modal centered in content area
- [x] Backdrop only covers content
- [x] Modal dismisses on backdrop click
- [x] Works on mobile (no sidebar)
- [x] Works with collapsed sidebar
- [x] Works with expanded sidebar

## Status

✅ **FIXED** - Sidebar and TopBar now remain fully visible and interactive when modal is open.

