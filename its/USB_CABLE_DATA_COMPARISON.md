# USB Cable Data Comparison Report
**Product ID:** `e4d29571-a9ac-4775-b4fc-c97c4333093a`  
**Product SKU:** `SKU-1763734739197-UEW`  
**Variant SKU (WHITE):** `SKU-1763734727995-BCW` (This is what you searched for)

## Database vs UI Comparison

### ✅ **MATCHING DATA**

| Field | Database | UI | Status |
|-------|----------|-----|--------|
| **Product Name** | USB Cable | USB Cable | ✅ Match |
| **Description** | USB-C charging cable | USB-C charging cable | ✅ Match |
| **Category** | Accessories | Accessories | ✅ Match |
| **Status** | Active (is_active=true) | Active | ✅ Match |
| **Condition** | new | new | ✅ Match |
| **Total Variants** | 3 | 3 | ✅ Match |
| **Total Stock** | 0 | 0 | ✅ Match |
| **Total Value** | TSh 0.00 | TSh 0 | ✅ Match |

### ⚠️ **INCONSISTENCIES FOUND**

#### 1. **Product-Level Pricing Mismatch**
- **Database Product Level:**
  - `cost_price`: **3,000 TSh**
  - `selling_price`: **5,000 TSh**
  
- **Variant Level (Actual):**
  - RED: cost=5,000, selling=5,000
  - BLACK: cost=5,000, selling=5,000  
  - WHITE: cost=10,000, selling=10,000

- **UI Shows:** TSh 5,000 - TSh 10,000 (correctly shows variant range)

**Issue:** The product-level `cost_price` (3,000) doesn't match any variant cost prices. The UI correctly ignores this and shows variant pricing ranges.

#### 2. **Profit & Markup Calculation**
- **Database:** All variants have `selling_price = cost_price` (no profit margin)
  - RED: 5,000 - 5,000 = 0 profit
  - BLACK: 5,000 - 5,000 = 0 profit
  - WHITE: 10,000 - 10,000 = 0 profit
  
- **UI Shows:** 
  - Profit: TSh 0 ✅ (Correct - no profit margin)
  - Markup: 0.0% ✅ (Correct - 0% markup)

**Status:** This is **CORRECT** - there's no profit margin because selling price equals cost price for all variants.

#### 3. **Missing Product Image**
- **Database:** 0 images
- **UI:** Shows "Click to upload" placeholder

**Status:** Expected - no images uploaded yet.

### 📊 **VARIANT DETAILS**

| Variant | SKU | Cost Price | Selling Price | Stock | Status |
|---------|-----|------------|---------------|-------|--------|
| **RED** | SKU-1763734727995-90U | 5,000 | 5,000 | 0 | ✅ Active |
| **BLACK** | SKU-1763734727995-XWZ | 5,000 | 5,000 | 0 | ✅ Active |
| **WHITE** | SKU-1763734727995-BCW | 10,000 | 10,000 | 0 | ✅ Active |

### 🔍 **WHAT'S MISSING OR NEEDS ATTENTION**

1. **❌ Product-Level Cost Price Mismatch**
   - Product `cost_price` = 3,000 TSh (doesn't match variants)
   - **Recommendation:** Update product-level `cost_price` to match the minimum variant cost (5,000) or remove it if variants are the source of truth

2. **❌ No Profit Margin**
   - All variants have zero profit (selling = cost)
   - **Recommendation:** Consider setting selling prices higher than cost prices to generate profit

3. **❌ No Product Images**
   - No images uploaded
   - **Status:** This is expected if images haven't been uploaded yet

4. **✅ Variant Names**
   - Variants use `name` column (RED, BLACK, WHITE) correctly
   - `variant_name` column is empty (not used)

5. **✅ Supplier Information**
   - Supplier ID: `ffb08448-ba80-4869-9f93-18bd61377c30`
   - Supplier Name: "Cable Supplier"
   - **Status:** Present in database

6. **⚠️ SERIAL NUMBERS - STORED BUT IN WRONG FIELD**
   - **Database Status:** Serial numbers ARE in the database, but stored in `attributes` field (legacy location)
   - **RED variant:** `serial_number: "YTUYTUY"` (in `attributes` JSONB)
   - **BLACK variant:** `serial_number: "JGHGHJGJ"` (in `attributes` JSONB)
   - **WHITE variant:** `serial_number: "NNNNNBBBB"` (in `attributes` JSONB)
   - **Issue:** Serial numbers are in `attributes` but NOT in `variant_attributes` (primary storage location)
   - **UI Status:** The UI code checks `variant_attributes` first, then falls back to `attributes`, so it SHOULD display them, but may not be showing them in the product modal
   - **Recommendation:** Copy serial numbers from `attributes` to `variant_attributes` for consistency

### 📝 **SUMMARY**

**What's Working:**
- ✅ All variant data is correct
- ✅ Stock levels match (all 0)
- ✅ Pricing display in UI correctly shows variant ranges
- ✅ Profit and markup calculations are correct (0 because no margin)
- ✅ Serial numbers exist in database (in `attributes` field)

**What Needs Fixing:**
- ⚠️ Product-level `cost_price` (3,000) doesn't match variant costs (5,000-10,000)
- ⚠️ No profit margin on any variant (selling price = cost price)
- ⚠️ **Serial numbers are in `attributes` but should also be in `variant_attributes`** (primary storage location)

**What's Missing:**
- 📷 Product images (expected if not uploaded)
- 💰 Profit margin (by design - selling price equals cost price)
- 🔍 Serial numbers may not be visible in UI (stored in legacy `attributes` field instead of `variant_attributes`)

### 🎯 **RECOMMENDATIONS**

1. **Fix Product-Level Pricing:**
   ```sql
   UPDATE lats_products 
   SET cost_price = 5000, selling_price = 5000 
   WHERE id = 'e4d29571-a9ac-4775-b4fc-c97c4333093a';
   ```
   Or better: Let variants be the source of truth and ignore product-level pricing.

2. **Add Profit Margin (Optional):**
   If you want profit, update selling prices:
   ```sql
   -- Example: 20% markup
   UPDATE lats_product_variants 
   SET selling_price = cost_price * 1.2 
   WHERE product_id = 'e4d29571-a9ac-4775-b4fc-c97c4333093a';
   ```

3. **Upload Product Images:**
   Use the UI to upload product images.

4. **Fix Serial Number Storage:**
   Copy serial numbers from `attributes` to `variant_attributes`:
   ```sql
   UPDATE lats_product_variants 
   SET variant_attributes = jsonb_set(
     COALESCE(variant_attributes, '{}'::jsonb),
     '{serial_number}',
     to_jsonb(attributes->>'serial_number')
   )
   WHERE product_id = 'e4d29571-a9ac-4775-b4fc-c97c4333093a'
   AND attributes->>'serial_number' IS NOT NULL;
   ```

---

**Conclusion:** The data is mostly correct. The main issues are:
1. Product-level cost_price mismatch (UI correctly uses variant pricing)
2. Serial numbers exist but are in the legacy `attributes` field instead of `variant_attributes`
3. Profit is 0 because there's no margin between cost and selling price (mathematically correct)

