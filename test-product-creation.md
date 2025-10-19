# Product Creation Test Checklist

## Test the Fix - Step by Step

### Test 1: Create Product from Purchase Order Modal

1. **Navigate to Purchase Orders**
   - Go to `/lats/purchase-orders`
   - Click "Create New Purchase Order"

2. **Open Add Product Modal**
   - Click "+ Add Product" button
   - Click "Add New Product" in the dropdown

3. **Fill Product Form**
   - Name: `Test Product ${Date.now()}`
   - SKU: (auto-generated or custom)
   - Category: Select any
   - Description: "Test product for debugging"

4. **Submit Form**
   - Click "Create Product"
   - ✅ **Expected**: Success toast "Product created successfully!"
   - ✅ **Expected**: ProductDetailModal opens

5. **Check Product Creation**
   Open browser console and look for:
   ```
   🔧 [Provider] Starting product creation...
   🔧 [Provider] Raw data received: {...}
   🔧 [Provider] Mapped product data: {...}
   🔧 [Provider] Calling API createProduct...
   🔒 [createProduct] Assigning product to branch: ...
   🔄 No variants provided, creating default variant automatically
   ✅ Default variant created successfully
   ✅ [Provider] Product created successfully: {...}
   ```

6. **Enter Price in ProductDetailModal**
   - Cost Price: 50000
   - Quantity: 10
   - Click "Add to Purchase Order"
   - ✅ **Expected**: "Cost price updated and saved!"
   - ✅ **Expected**: Product added to PO

### Test 2: Verify in Database (if you have access)

Run this query:
```sql
-- Get recently created products
SELECT 
  p.id,
  p.name, 
  p.sku,
  p.cost_price as product_cost,
  p.unit_price as product_price,
  v.id as variant_id,
  v.sku as variant_sku,
  v.cost_price as variant_cost,
  v.unit_price as variant_price,
  v.quantity
FROM lats_products p
LEFT JOIN lats_product_variants v ON v.product_id = p.id
WHERE p.created_at > NOW() - INTERVAL '1 hour'
ORDER BY p.created_at DESC
LIMIT 5;
```

### Test 3: Check Product in Inventory

1. Go to Inventory (`/lats/unified-inventory`)
2. Search for the product you just created
3. Click on it to view details
4. Check the variant tab
5. ✅ **Expected**: 
   - Product exists
   - Has at least one variant
   - Variant has the price you entered

## Common Issues and Solutions

### Issue: Products not being created at all
**Symptom**: No product appears in inventory, console shows provider error
**Solution**: ✅ FIXED - provider.createProduct now implemented

### Issue: Products created but price is 0
**Symptom**: Product exists but cost_price is 0 in ProductDetailModal
**Reason**: This is EXPECTED behavior for purchase orders
**Solution**: Enter the price in ProductDetailModal before adding to PO

### Issue: Price not saving when clicked "Add to PO"
**Symptom**: Price entered but reverts to 0
**Check**: 
1. Browser console for `updateProductVariantCostPrice` call
2. Network tab for failed API calls
3. Database RLS policies

### Issue: Product created but not visible in inventory
**Check**:
1. Branch isolation - is product assigned to correct branch?
2. Filter settings in inventory page
3. `is_active` flag on product

## Debug Console Commands

Open browser console and run:

```javascript
// Check if provider has createProduct
const { getLatsProvider } = await import('./src/features/lats/lib/data/provider');
const provider = getLatsProvider();
console.log('Has createProduct?', typeof provider.createProduct === 'function');

// Test create product
const testProduct = {
  name: 'Console Test Product',
  sku: 'TEST-' + Date.now(),
  categoryId: null,
  description: 'Test from console'
};
const result = await provider.createProduct(testProduct);
console.log('Create result:', result);
```

