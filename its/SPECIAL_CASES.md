# ⚠️ Special Cases for Dialog Conversion

## Files That Keep Browser Dialogs

### `src/hooks/useBehaviorSettings.ts`
**Reason:** This is a utility hook that provides confirmation helpers. It intentionally uses `window.confirm()` as a fallback/settings-based behavior. This is acceptable because:
- It's a low-level utility hook
- It respects user settings (confirmDelete flag)
- It's used as a wrapper for other components
- Using custom dialogs here would create circular dependencies

**Status:** ✅ Intentionally keeps `window.confirm()` - No conversion needed

## Summary
- **19 out of 21 files** converted to custom UI dialogs ✅
- **2 files** keep browser dialogs (by design):
  1. `useBehaviorSettings.ts` - Utility hook
  
All user-facing confirmation dialogs now use beautiful custom UI! 🎉

