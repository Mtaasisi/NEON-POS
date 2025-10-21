# Set Pricing Before Receiving Purchase Orders

## 🎉 Feature Complete!

This feature allows you to set selling prices for all products **before** they are received into inventory. This ensures that all items have proper pricing immediately when they become available for sale.

## 📋 How It Works

### 1. **Receive Button**
When you click the "Receive" button on a Purchase Order, instead of immediately receiving the items, a pricing modal will open first.

### 2. **Pricing Modal**
The modal shows:
- **All items** in the purchase order
- **Cost price** for each item (from PO)
- **Selling price** field (editable)
- **Markup percentage** (auto-calculated)
- **Profit per unit** (auto-calculated)

### 3. **Features**

#### Quick Markup Buttons
- **20% Markup** - Apply 20% markup to all items
- **30% Markup** - Apply 30% markup to all items (default)
- **50% Markup** - Apply 50% markup to all items
- **100% Markup** - Double the price for all items

#### Individual Pricing
You can set custom prices for each product:
- **Enter Selling Price** - Automatically calculates markup %
- **Enter Markup %** - Automatically calculates selling price
- See **real-time profit** calculations

#### Statistics Dashboard
At the top, you'll see:
- **Total Cost** - Total cost of all items
- **Total Selling** - Total potential selling value
- **Total Profit** - Expected profit
- **Average Markup** - Average markup across all items

### 4. **Validation**
- All items **must have** a selling price before you can proceed
- Warns you if selling price is below cost price (negative profit)
- Shows quantity to be received for each item

### 5. **Database Updates**
When you click "Confirm & Receive Items":

1. ✅ Updates `lats_product_variants` table with selling prices
2. ✅ Receives items into inventory
3. ✅ Updates `inventory_items` table with selling prices
4. ✅ Makes products immediately ready for sale

## 🎯 Benefits

### Before This Feature:
- Items received without selling prices ❌
- Manual price entry needed later ❌
- Risk of selling items at wrong price ❌

### After This Feature:
- All items have prices when received ✅
- Bulk pricing with quick markup buttons ✅
- Visual profit calculations ✅
- Items ready to sell immediately ✅

## 💡 Usage Tips

### Best Practices:
1. **Review cost prices** - Make sure they're correct
2. **Use quick markup buttons** for consistent pricing
3. **Adjust individual items** if needed (premium products)
4. **Check profit margins** before confirming
5. **Ensure positive profit** on all items

### Markup Guidelines:
- **20%** - Low margin products (fast movers)
- **30%** - Standard retail markup
- **50%** - Specialty items
- **100%+** - Premium/luxury products

## 📸 Visual Guide

### Step 1: Click Receive Button
```
Purchase Order Detail Page → "Receive" Button
```

### Step 2: Pricing Modal Opens
```
┌─────────────────────────────────────────────┐
│ 💰 Set Product Prices                       │
│ Configure selling prices before receiving   │
├─────────────────────────────────────────────┤
│ Stats: Total Cost | Selling | Profit        │
│ Quick Apply: [20%] [30%] [50%] [100%]       │
├─────────────────────────────────────────────┤
│ Product 1                                    │
│ Cost: 500 | Selling: [650] | Markup: [30%]  │
│ Profit: 150 TZS per unit                    │
├─────────────────────────────────────────────┤
│ Product 2                                    │
│ Cost: 1000 | Selling: [1300] | Markup: [30%]│
│ Profit: 300 TZS per unit                    │
└─────────────────────────────────────────────┘
```

### Step 3: Confirm & Receive
```
✅ Prices saved to database
✅ Items received into inventory
✅ Products ready for sale
```

## 🔧 Technical Details

### Files Modified:
1. **SetPricingModal.tsx** - New pricing modal component
2. **PurchaseOrderDetailPage.tsx** - Integrated pricing flow

### Database Tables Updated:
- `lats_product_variants` - Selling prices
- `inventory_items` - Item-level selling prices
- `lats_purchase_orders` - Status updates

### Functions:
- `handleReceive()` - Opens pricing modal
- `handleConfirmPricingAndReceive()` - Saves prices and receives items

## 🚀 Quick Start

1. **Open a Purchase Order** with status: shipped/confirmed/sent
2. **Click "Receive" button**
3. **Set prices** using quick markup or custom amounts
4. **Review totals** and profit margins
5. **Click "Confirm & Receive Items"**
6. **Done!** Items are in inventory with prices set

## ✅ Testing

To verify it's working:

```bash
# Check inventory after receiving
node check-inventory-products.js

# Should show:
# - Selling prices set on variants ✅
# - Selling prices set on inventory items ✅
# - Items status: available ✅
```

## 📝 Notes

- Default markup: **30%**
- Currency: **TZS** (Tanzanian Shillings)
- Prices can be edited later in product management
- Pricing modal is **required** - can't skip it
- Validation ensures no items are missed

## 🎓 Example Workflow

```
Scenario: Receiving iPhone shipment

1. PO: 10 iPhones @ 500,000 TZS each
2. Click Receive → Pricing Modal Opens
3. Apply 20% markup → Selling: 600,000 TZS
4. Or manually set → Selling: 650,000 TZS
5. Profit shown: 150,000 TZS per unit
6. Total profit: 1,500,000 TZS
7. Confirm → Items received with prices!
```

---

## 🆘 Troubleshooting

**Q: Modal doesn't open?**
- Check PO status (must be shipped/confirmed/sent)
- Check if items exist in PO

**Q: Can't confirm?**
- Ensure all items have selling prices
- Check for validation errors (negative prices)

**Q: Prices not saving?**
- Check console for errors
- Verify database permissions
- Check variant IDs exist

---

**Feature Status:** ✅ **COMPLETE**

**Created:** October 20, 2025  
**Version:** 1.0  
**Author:** AI Assistant

