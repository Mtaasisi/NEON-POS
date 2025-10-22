# Trade-In Admin Pricing Workflow

## Overview

The trade-in inventory system now requires **admin confirmation with pricing details** before adding traded-in devices to inventory. This ensures all items are properly priced and ready for resale.

## New Workflow

### 1. Customer Trade-In Exchange
1. Customer brings device for trade-in
2. Cashier adds new product to cart
3. Cashier clicks "Trade-In" button
4. Trade-in calculator opens to assess device

### 2. Device Assessment
1. Enter device details (name, model, IMEI)
2. Select condition rating (Excellent, Good, Fair, Poor)
3. Add damage items if applicable (with costs)
4. System calculates final trade-in value
5. Apply trade-in discount to purchase

### 3. Contract Signing
1. Trade-in contract modal appears
2. Customer reviews and signs contract
3. Contract is linked to transaction

### 4. Payment Processing
Customer completes payment using:
- Regular payment methods (Cash, M-Pesa, etc.)
- ZenoPay
- Installment plan

**🎯 NEW STEP:** After payment completes, **Pricing Modal automatically opens**

### 5. ⭐ Admin Pricing Configuration (NEW)

After successful payment, the **Trade-In Pricing Modal** opens automatically, requiring admin to:

#### Device Information Displayed:
- Device name and model
- IMEI/Serial number
- Condition rating
- Repair status
- Condition description

#### Pricing Configuration:
1. **Trade-In Value Paid** (Read-only)
   - The amount paid to customer for the device

2. **Additional Costs** (Optional)
   - Add repair costs
   - Add cleaning costs
   - Add refurbishment costs
   - Add testing/packaging costs
   - Each cost is recorded as an expense

3. **Total Cost** (Auto-calculated)
   - Trade-in value + all additional costs

4. **Selling Price** (Required - Must be set)
   - Admin enters desired resale price
   - Can use quick markup buttons (30%, 50%)
   - Or enter custom markup percentage
   - System shows profit/loss in real-time

5. **Profit Analysis**
   - Shows expected profit per unit
   - Displays markup percentage
   - Warns if selling below cost

#### Validation:
- ✅ Selling price must be greater than 0
- ⚠️ Warning if selling below total cost
- ✅ All additional costs recorded as expenses

### 6. Inventory Addition

After admin clicks **"Confirm & Add to Inventory"**:

1. ✅ All additional costs are saved as expense records
2. ✅ Device is added to inventory with:
   - Product created with SKU `TI-{IMEI}`
   - Variant created with device details
   - Categorized in "Trade-In Items"
   - Cost price = Total cost (trade-in value + additional costs)
   - **Selling price = Admin-confirmed price**
   - Stock quantity = 1
   - Status = Active (if no repair) or Inactive (if needs repair)
3. ✅ Inventory item record created
4. ✅ Stock movement recorded
5. ✅ Transaction updated with inventory references
6. ✅ Success notification shown
7. ✅ Trade-in data cleared

## Key Features

### 📋 Comprehensive Pricing Modal
- Full device information display
- Interactive pricing calculator
- Real-time profit/loss analysis
- Additional cost tracking
- Expense integration

### 💰 Expense Tracking
All additional costs (repairs, cleaning, etc.) are automatically recorded as expenses in the system with:
- Proper categorization
- Linked to trade-in transaction
- Proper description
- Timestamped records

### 🔒 Admin Control
- **No automatic inventory addition**
- Admin must review and confirm pricing
- Can add costs before setting price
- Sees profit/loss before confirming
- Can cancel and modify if needed

### ✅ Complete Information
Every trade-in device in inventory includes:
- Full device details (IMEI, condition, etc.)
- Accurate cost price (including all expenses)
- Admin-verified selling price
- Expected profit margin
- Link to original trade-in transaction
- Link to original customer

## Benefits

1. **Accurate Pricing**: Admin sets resale price based on actual costs
2. **Expense Tracking**: All costs recorded as expenses
3. **Profit Visibility**: See profit/loss before adding to inventory
4. **Quality Control**: Admin reviews each device before listing
5. **Flexible Pricing**: Can account for repairs, refurbishment, market conditions
6. **Complete Records**: Full audit trail from trade-in to resale

## Example Scenario

### Trade-In: iPhone 12 Pro

1. **Customer Trade-In**
   - Trade-in value: 800,000 TZS
   - Condition: Good
   - Device has minor scratches

2. **Payment Complete**
   - Customer purchases iPhone 14 Pro (2,000,000 TZS)
   - Trade-in discount applied: 800,000 TZS
   - Customer pays: 1,200,000 TZS
   - Payment successful ✅

3. **Pricing Modal Opens**
   - Trade-in value paid: 800,000 TZS
   - Admin adds costs:
     - Screen repair: 50,000 TZS
     - Cleaning/refurbishment: 20,000 TZS
     - Testing: 10,000 TZS
   - **Total cost: 880,000 TZS**

4. **Admin Sets Selling Price**
   - Applies 50% markup
   - Selling price: 1,320,000 TZS
   - Expected profit: 440,000 TZS
   - Clicks "Confirm & Add to Inventory"

5. **Result**
   - ✅ 3 expense records created (80,000 TZS total)
   - ✅ iPhone 12 Pro added to inventory
   - ✅ SKU: TI-352468095123456
   - ✅ Category: Trade-In Items
   - ✅ Cost: 880,000 TZS
   - ✅ Selling: 1,320,000 TZS
   - ✅ Ready for resale!

## Files Modified

1. **New Component**: `src/features/lats/components/pos/TradeInPricingModal.tsx`
   - Complete pricing modal interface
   - Additional cost management
   - Real-time profit calculations
   - Expense recording integration

2. **Updated**: `src/features/lats/pages/POSPageOptimized.tsx`
   - Added pricing modal state
   - Modified all payment completion handlers
   - Added `handleTradeInPricingConfirm` function
   - Integrated modal into render

3. **Existing**: `src/features/lats/lib/tradeInInventoryService.ts`
   - No changes needed
   - Already supports all required parameters

## Testing

### Test the Complete Workflow:

1. **Start Trade-In**
   - Add product to cart
   - Click "Trade-In"
   - Enter device details
   - Complete assessment

2. **Complete Payment**
   - Process payment (any method)
   - Verify payment success

3. **Pricing Modal Should Open**
   - Verify device information displays correctly
   - Add some additional costs
   - Set selling price
   - Verify profit calculation
   - Click "Confirm & Add to Inventory"

4. **Verify Results**
   - Check inventory for new trade-in device
   - Verify selling price matches your input
   - Check expenses table for cost records
   - Verify stock movement recorded
   - Check device is in "Trade-In Items" category

## Troubleshooting

### Modal Doesn't Open After Payment
- Check console for trade-in transaction
- Verify payment completed successfully
- Ensure trade-in transaction exists

### Can't Save Pricing
- Ensure selling price > 0
- Check for any console errors
- Verify category can be created

### Expenses Not Recorded
- Check expenses table in database
- Verify user has permission to create expenses
- Check console for expense creation errors

## Future Enhancements

- [ ] Bulk pricing for multiple trade-ins
- [ ] Pricing templates by device type
- [ ] Auto-suggest pricing based on market rates
- [ ] Photo upload during pricing
- [ ] Approval workflow for high-value items
- [ ] Price history and trends
- [ ] Integration with online marketplaces

