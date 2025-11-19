# Products Per Row Feature

## Overview
This feature adds a new setting to control the number of products displayed per row in the POS product grid. Previously, the grid used an auto-fit layout that automatically adjusted columns based on screen width. Now, users can manually control the number of products per row.

## Changes Made

### 1. Database Schema
- **File**: `migrations/add_products_per_row_setting.sql`
- Added `products_per_row` column to `lats_pos_general_settings` table
- Default value: 4 products per row
- Valid range: 2-12 products per row
- **Action Required**: Run this migration on your database

### 2. Type Definitions
- **File**: `src/lib/posSettingsApi.ts`
- Added `products_per_row: number` to `GeneralSettings` interface

### 3. Default Settings
- **File**: `src/hooks/usePOSSettings.ts`
- Added `products_per_row: 4` to default general settings

### 4. Settings UI
- **File**: `src/features/lats/components/pos/GeneralSettingsTab.tsx`
- Modified Product Grid Settings section to prioritize Products Per Row
- Added dropdown with options: 2, 3, 4 (default), 5, 6, 8 products
- Added custom input allowing 2-12 products
- Kept Products Per Page setting below for total pagination control

### 5. Settings Context
- **File**: `src/context/GeneralSettingsContext.tsx`
- Added `productsPerRow` to context interface
- Added default value of 4 in all provider fallbacks
- Exposed `productsPerRow` to all consuming components

### 6. Product Grid Components
Updated the following components to use the new setting:
- **File**: `src/features/lats/components/pos/POSProductGrid.tsx`
  - Changed from `repeat(auto-fit, minmax(min(280px, 100%), 1fr))`
  - To: `repeat(${productsPerRow}, 1fr)`
  
- **File**: `src/features/lats/components/pos/ProductSearchSection.tsx`
  - Applied same grid template change

## How It Works

### Before
```css
gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))'
```
The grid automatically adjusted the number of columns based on available screen width and minimum card width (280px).

### After
```css
gridTemplateColumns: `repeat(${productsPerRow}, 1fr)`
```
The grid now uses a fixed number of columns based on the user's preference, providing consistent layout regardless of screen size.

## Usage

### For Users
1. Open POS Settings (⚙️ icon)
2. Navigate to the General tab
3. Scroll to "Product Grid Settings"
4. Choose from preset options (2-8 products) or enter a custom value (2-12)
5. Optionally adjust "Products Per Page" for pagination
6. Click Save

### Recommendations
- **Small screens** (tablets, small laptops): 2-3 products per row
- **Medium screens** (standard laptops): 3-4 products per row
- **Large monitors** (desktop monitors): 4-6 products per row
- **Ultra-wide displays**: 6-8 products per row

## Migration Instructions

To apply this feature to your database, run:

```bash
# Connect to your database and run:
psql -d your_database_name -f migrations/add_products_per_row_setting.sql

# Or if using Supabase:
# Copy the contents of add_products_per_row_setting.sql and run in SQL Editor
```

## Benefits

1. **Consistent Layout**: Products always display in the same grid regardless of screen size
2. **User Control**: Different users can configure their preferred layout
3. **Better UX**: Products are easier to scan when layout is consistent
4. **Responsive**: Still adapts to screen size by adjusting product card sizes within the fixed columns
5. **Flexible**: Supports a wide range of configurations (2-12 products per row)

## Backwards Compatibility

- Existing settings will automatically get the default value of 4 products per row
- No breaking changes to existing functionality
- Products Per Page setting continues to work alongside the new setting

## Testing

Test the feature by:
1. Changing the products per row setting
2. Verifying the grid updates immediately (may require page refresh)
3. Testing on different screen sizes
4. Ensuring product cards remain properly sized
5. Checking that pagination still works correctly

## Future Enhancements

Possible improvements:
- Responsive breakpoints (different values for mobile/tablet/desktop)
- Preview of grid layout in settings
- Auto-adjust based on screen size with manual override
- Save per-device preferences

