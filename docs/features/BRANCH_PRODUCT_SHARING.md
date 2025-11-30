# Branch Product Sharing Feature

## Overview
This feature allows you to manually share products from one branch to another with empty stock data. Products are copied with all their details, but stock quantities are reset to zero in the target branch.

## Location
**Admin Settings → Branch Debug → Branch Product Sharing**

Path: `/admin/settings?section=branch-debug`

## How It Works

### Step 1: Select Source Branch
Choose the branch that has the products you want to share.

### Step 2: Browse & Select Products
- View all products from the source branch
- See product details: name, SKU, stock, variants
- Use search to find specific products
- **Filter option:** Show only products NOT in target branch
- See visual indicators for products that already exist in target
- Select individual products or use "Select All"

### Step 3: Select Target Branch
Choose the destination branch where you want to share the products.

### Step 4: Share Products
Click the "Share Products" button to execute the sharing.

## What Gets Shared

### ✅ Product Details (Copied)
- Product name
- Description
- SKU (modified to avoid conflicts)
- Cost price
- Selling price
- Category
- Supplier
- Image URL
- All attributes and metadata

### ✅ Parent Variants (Copied)
- Variant names (e.g., Size: Small, Medium, Large)
- Variant SKUs (modified)
- Variant prices
- Variant attributes
- **Only parent variants** - NOT child variants (like IMEI children)

### ❌ Stock Data (Reset to Zero)
- Product stock quantity: `0`
- Variant quantities: `0`
- The target branch can then add their own stock

### ❌ Child Variants (Not Shared)
- IMEI-specific variants
- Serial number variants
- Any variant with `parent_variant_id` set

## Example Usage

### Scenario
- **Source Branch:** Main Warehouse
- **Target Branch:** Downtown Store
- **Product:** iPhone 14 Pro with variants (128GB, 256GB, 512GB)

### Before Sharing
**Main Warehouse:**
- iPhone 14 Pro
  - 128GB Black: 50 units
  - 256GB Silver: 30 units
  - 512GB Gold: 20 units

**Downtown Store:**
- (No iPhone 14 Pro)

### After Sharing
**Main Warehouse:**
- iPhone 14 Pro (unchanged)
  - 128GB Black: 50 units
  - 256GB Silver: 30 units
  - 512GB Gold: 20 units

**Downtown Store:**
- iPhone 14 Pro (newly added)
  - 128GB Black: 0 units ← Empty stock
  - 256GB Silver: 0 units ← Empty stock
  - 512GB Gold: 0 units ← Empty stock

Now Downtown Store can receive stock transfers or purchase orders for this product.

## Important Notes

### SKU Modification
To avoid conflicts, the SKU is automatically modified by appending the target branch ID:
- Original: `IPHONE-14-128`
- Shared: `IPHONE-14-128-a1b2c3d4`

### Duplicate Detection
If a product with the same SKU already exists in the target branch, it will be skipped.

### Variants Only
- Parent variants (e.g., size options) are copied
- Child variants (e.g., individual IMEI numbers) are NOT copied
- This prevents IMEI/serial number conflicts

### Independent Stock Management
After sharing:
- Each branch manages its own stock independently
- Stock transfers between branches work normally
- Purchase orders can be created for either branch

## Database Tables Affected

1. **store_locations** - Branch/store information
2. **lats_products** - Product records created in target branch
3. **lats_product_variants** - Parent variants created in target branch

## Settings

### Branch Isolation Mode
This feature works with all branch isolation modes:
- `isolated` - Each branch has separate data (default)
- `shared` - Some data is shared across branches
- `custom` - Mixed mode

### Sharing Mode
Newly shared products are set to:
- `sharing_mode`: `isolated`
- `is_shared`: `false`
- `branch_id`: Target branch ID

## Filter: Show Only Missing Products

### What It Does
When you select a target branch, you can enable a filter to show **only products that don't exist** in the target branch. This helps you:
- Avoid duplicates
- Focus on products that actually need to be shared
- Save time by not scrolling through products that already exist

### How to Use
1. Select **source branch** and **target branch**
2. Check the box: **"Show only products NOT in [Target Branch Name]"**
3. The list will filter to show only missing products
4. A badge shows the count of missing products

### Visual Indicators
- **Orange badge** on products that already exist in target branch
- Badge says: "Already in target"
- These products are hidden when the filter is enabled

### Example
**Source Branch:** Main Warehouse (100 products)  
**Target Branch:** Downtown Store (70 products)  
**Filter Enabled:** Shows only 30 products that Downtown Store doesn't have

## Use Cases

### 1. New Branch Setup
When opening a new branch, share the entire product catalog so staff can start taking orders immediately, even with zero stock.

### 2. Seasonal Products
Share seasonal products to all branches before the season starts, allowing each branch to order stock based on local demand.

### 3. Product Catalog Standardization
Ensure all branches have the same product listings for consistent customer experience.

### 4. Testing New Products
Share new products to select branches for testing before rolling out to all locations.

## Troubleshooting

### Products Not Showing
- Ensure source branch is selected
- Check that products are marked as `is_active: true`
- Verify branch has products

### Sharing Failed
- Check SKU conflicts in target branch
- Verify user has permissions
- Check database connection
- Review browser console for errors

### Variants Missing
- Only parent variants are shared (by design)
- Child variants (IMEI, Serial) are not shared
- Check variant structure in source branch

### Filter Not Working
- Make sure target branch is selected first
- Check that products have valid SKUs
- Products may have different SKU formats
- Try disabling and re-enabling the filter

## Future Enhancements

Potential improvements:
- [x] **Show only products not in target branch** ✅ (Completed)
- [ ] Bulk sharing to multiple branches at once
- [ ] Scheduled automatic sharing
- [ ] Share product categories
- [ ] Share with initial stock amount (not zero)
- [ ] Undo/reverse sharing
- [ ] Sharing history/audit log
- [ ] Share products back to source branch
- [ ] Template-based sharing rules
- [ ] Export/import product sharing templates

## Technical Details

### Component Location
`src/features/admin/components/BranchProductSharing.tsx`

### Key Functions
- `loadBranches()` - Fetches active branches from store_locations
- `loadProducts()` - Fetches products from source branch with variant counts
- `loadTargetBranchProducts()` - Fetches product SKUs from target branch for comparison
- `handleShare()` - Executes product sharing logic
- `filteredProducts` - Filters products by search term and missing status

### Database Queries
```sql
-- Insert new product in target branch
INSERT INTO lats_products (...)
VALUES (..., stock_quantity = 0, branch_id = target_branch);

-- Insert variants (parents only)
INSERT INTO lats_product_variants (...)
SELECT ... 
WHERE parent_variant_id IS NULL OR is_parent = true;
```

## Support

For issues or questions:
1. Check browser console for errors
2. Verify database connectivity
3. Review branch permissions
4. Contact system administrator

