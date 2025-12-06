# Excel Import Template - Complete Field List

## ✅ Added Missing Fields for Perfect Variant Handling

The template has been updated to include all necessary fields for proper variant and child variant management.

---

## 📋 Complete Template Structure

### **Product Fields** (Required/Optional)
1. **Product SKU** ⭐ (Recommended) - Unique product identifier
2. **Product Name** ⭐ (Required) - Product name
3. **Description** - Product description
4. **Category Name** ⭐ (Required) - Category name (auto-created if doesn't exist)
5. **Supplier Name** - Supplier name (auto-created if doesn't exist)
6. **Condition** - Product condition (new, used, refurbished, etc.)
7. **Price** - Default selling price
8. **Cost Price** - Default cost price
9. **Stock Quantity** - Total stock quantity
10. **Min Stock Level** - Minimum stock threshold

### **Variant Fields** (For Products with Variants)
11. **Variant SKU** ⭐ (Recommended) - Unique variant identifier (auto-generated if not provided)
12. **Variant Name** - Variant name/description
13. **Variant Barcode** - Barcode for scanning
14. **Variant Type** - Type: `standard`, `parent`, or `imei_child`
15. **Is Parent** - Boolean: `true` or `false` (for parent variants)
16. **Parent Variant SKU** - SKU of parent variant (for child variants)
17. **Variant Selling Price** - Selling price for this variant
18. **Variant Cost Price** - Cost price for this variant
19. **Variant Quantity** - Stock quantity for this variant
20. **Variant Min Quantity** - Minimum stock for this variant
21. **Variant Weight** - Weight (for shipping calculations)
22. **Variant Dimensions** - Dimensions (LxWxH format)
23. **Variant Is Active** - Boolean: `true` or `false` (defaults to `true`)

### **IMEI/Serial Fields** (For IMEI Child Variants)
24. **IMEI** - IMEI number for device tracking
25. **Serial Number** - Serial number for device tracking

---

## 🎯 Key Improvements

### **Before (Missing Fields)**
- ❌ No Product SKU field
- ❌ No Variant SKU field (auto-generated only)
- ❌ No Variant Barcode
- ❌ No Variant Quantity (defaulted to 0)
- ❌ No Weight field
- ❌ No Dimensions field
- ❌ No Variant Is Active field

### **After (Complete Fields)** ✅
- ✅ Product SKU field added
- ✅ Variant SKU field added (can be specified or auto-generated)
- ✅ Variant Barcode field added
- ✅ Variant Quantity field added (can import stock levels)
- ✅ Weight field added
- ✅ Dimensions field added
- ✅ Variant Is Active field added

---

## 📝 Example Usage

### **Parent Variant Row:**
```
Product SKU: SKU-1
Product Name: iPhone 14 Pro
Variant SKU: IPH14PRO-128GB
Variant Name: 128GB Storage
Variant Type: parent
Is Parent: true
Variant Quantity: 0
```

### **Child IMEI Variant Row:**
```
Product SKU: SKU-1
Product Name: iPhone 14 Pro
Variant SKU: IPH14PRO-128GB-001
Variant Name: 128GB - IMEI: 123456789012345
Variant Type: imei_child
Is Parent: false
Parent Variant SKU: IPH14PRO-128GB
Variant Quantity: 1
IMEI: 123456789012345
Serial Number: SN001
```

---

## 🔄 Import Logic Updates

1. **Variant SKU**: Now explicitly read from template, auto-generated only if missing
2. **Variant Quantity**: Now imported from template (was defaulting to 0)
3. **Variant Barcode**: Now imported and stored
4. **Weight & Dimensions**: Now imported and stored in variant attributes
5. **Variant Is Active**: Now imported (defaults to `true` if not specified)

---

## ✅ Benefits

1. **Better Control**: Explicit SKUs for products and variants
2. **Stock Management**: Can import initial stock quantities
3. **Barcode Support**: Can import barcodes for scanning
4. **Shipping Ready**: Weight and dimensions for shipping calculations
5. **Flexibility**: Can set variant active/inactive status
6. **Complete Data**: All fields from export are now importable

---

## 📊 Template Column Order

The template columns are organized in this logical order:
1. Product identification (SKU, Name, Description)
2. Product categorization (Category, Supplier)
3. Product pricing (Price, Cost, Stock)
4. Variant identification (SKU, Name, Barcode)
5. Variant relationships (Type, Parent)
6. Variant pricing (Selling, Cost, Quantity)
7. Variant physical attributes (Weight, Dimensions)
8. Variant status (Is Active)
9. Device tracking (IMEI, Serial Number)

This order makes it easy to fill out the template row by row!

