# Font Size Feature - Implementation Guide

## What's New? 🎉

You can now change the font size across your entire POS system! The font size control is in **POS Settings > General > Interface Settings**.

## Changes Made

### 1. Database Schema
- Added `font_size` field to `GeneralSettings` interface
- Three options: 'small' (14px), 'medium' (16px), 'large' (18px)
- Default: 'medium'

### 2. Files Modified

#### `/src/lib/posSettingsApi.ts`
- Added `font_size: 'small' | 'medium' | 'large'` to `GeneralSettings` interface
- Added default `font_size: 'medium'` in settings initialization

#### `/src/hooks/usePOSSettings.ts`
- Added `font_size: 'medium'` to `defaultGeneralSettings`

#### `/src/features/lats/components/pos/GeneralSettingsTab.tsx`
- Added font size dropdown control in Interface Settings section
- Added `applyFontSize()` function to apply changes immediately
- Font size updates in real-time as you change the dropdown

#### `/src/context/GeneralSettingsContext.tsx`
- Added `applyFontSize()` function for global font size application
- Font size applies automatically when settings load
- Persists in localStorage

### 3. Database Migration
- Created `ADD-FONT-SIZE-COLUMN.sql` for database schema update

## How to Use

### For Users:
1. Open POS system
2. Click Settings (⚙️) icon
3. Go to "General" tab
4. Scroll to "Interface Settings" section
5. Find "Font Size" dropdown
6. Select: Small (14px), Medium (16px), or Large (18px)
7. **Font changes instantly** - no need to save!
8. Click "Save" to persist your choice

### For Developers:
1. Run the database migration:
   ```sql
   -- In your database console (Neon/Supabase)
   -- Run: ADD-FONT-SIZE-COLUMN.sql
   ```

2. The feature is ready to use! No code compilation needed.

## How It Works

### Real-Time Updates
- When you change the dropdown, `handleSettingChange()` detects it
- Calls `applyFontSize()` immediately
- Updates `document.documentElement.style.fontSize`
- Changes apply to the entire app instantly
- **Smooth transition effect** (0.2s ease) for pleasant UX

### Persistence
- Font size saves to database when you click "Save"
- Stored in localStorage for quick access
- Loads automatically on app start via multiple entry points:
  1. **App.tsx** - Loads immediately on mount (fastest)
  2. **GeneralSettingsContext** - Loads from localStorage
  3. **Settings sync** - Loads from database when authenticated

### Global Application Throughout Codebase
✅ **Applied to `<html>` root element**
- All components using `rem` or `em` units scale automatically
- Tailwind classes using rem units (text-sm, text-base, etc.) scale perfectly
- Spacing using rem (p-4, m-2, etc.) scales proportionally
- Fixed `px` sizes remain unchanged (by design)

✅ **CSS Variables scale with rem**
- All LATS module font sizes (--lats-font-size-*) use rem
- Spacing variables use rem
- Everything scales proportionally!

✅ **Components automatically benefit**
- Buttons, inputs, cards all scale
- Product grids, tables, modals scale
- POS interface, dashboard, reports all scale
- No code changes needed in components!

✅ **What scales:**
- All text using Tailwind classes
- All spacing using rem/em
- Components using relative units
- CSS variables defined in rem

❌ **What doesn't scale:**
- Fixed pixel values in custom CSS
- SVG/icon sizes with fixed px
- Images with hardcoded dimensions
- Border widths (intentionally stay crisp)

## Technical Details

### Font Size Values
```typescript
'small'  → 14px  // Compact view (87.5% of default)
'medium' → 16px  // Default (recommended, 100%)
'large'  → 18px  // Better readability (112.5% of default)
```

### Implementation Flow
1. **App loads** → `App.tsx` applies saved font size from localStorage (instant)
2. **User opens settings** → Current font size displayed in dropdown
3. **User changes dropdown** → `handleSettingChange('font_size', value)` triggers
4. **Real-time update** → `applyFontSize(value)` updates `html` root immediately
5. **Entire app scales** → All rem/em-based components resize smoothly
6. **User clicks "Save"** → `saveSettings()` persists to database + localStorage
7. **Context syncs** → `GeneralSettingsContext` ensures consistency
8. **Next visit** → Font size loads from localStorage on app mount

### Code Implementation Points

#### 1. **App.tsx** (Line 945-969)
```typescript
// Loads font size immediately on app mount
useEffect(() => {
  const savedFontSize = localStorage.getItem('fontSize');
  if (savedFontSize) {
    applyFontSize(savedFontSize);
  }
}, []);
```

#### 2. **GeneralSettingsContext.tsx** (Line 124-213)
```typescript
// Applies font size from settings & localStorage
const applyFontSize = (size: 'small' | 'medium' | 'large') => {
  document.documentElement.style.fontSize = /* size */;
  localStorage.setItem('fontSize', size);
};
```

#### 3. **GeneralSettingsTab.tsx** (Line 62-89)
```typescript
// Real-time application in settings UI
const handleSettingChange = (key, value) => {
  if (key === 'font_size') {
    applyFontSize(value); // Instant feedback!
  }
};
```

#### 4. **index.css** (Line 50-108)
```css
/* Root font size with smooth transition */
html {
  font-size: 16px;
  transition: font-size 0.2s ease;
}

/* Helper classes (optional) */
html.font-small { font-size: 14px; }
html.font-medium { font-size: 16px; }
html.font-large { font-size: 18px; }
```

## Benefits

✅ **Immediate Feedback** - See changes as you make them  
✅ **Accessibility** - Better readability for all users  
✅ **Consistent** - Applies across entire POS system  
✅ **Persistent** - Saves your preference  
✅ **Simple** - Just 3 easy choices  

## Troubleshooting

**Q: Font size didn't change?**  
A: Make sure you're not overriding with fixed `px` sizes in CSS. Use `rem` or `em` units for scalable text.

**Q: Changes revert after refresh?**  
A: Click "Save Settings" to persist your choice to the database.

**Q: Can I add more font sizes?**  
A: Yes! Update the interface in `posSettingsApi.ts`, add options in `GeneralSettingsTab.tsx`, and update the switch cases in both files.

## Example Usage in Components

Your components will automatically scale if using relative units:

```css
/* ✅ This will scale with font size setting */
.my-text {
  font-size: 1rem;  /* Scales with root font-size */
}

/* ❌ This won't scale */
.fixed-text {
  font-size: 16px;  /* Fixed size */
}
```

## Future Enhancements

Consider adding:
- Extra small (12px) for data-dense views
- Extra large (20px) for accessibility
- Custom font size input (advanced users)
- Per-component font size overrides

---

**Implemented by:** AI Assistant  
**Date:** October 17, 2025  
**Status:** ✅ Ready to Use

