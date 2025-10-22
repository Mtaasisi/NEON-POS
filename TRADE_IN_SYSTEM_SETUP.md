# Trade-In/Exchange System Setup Guide

## Overview
Complete trade-in system for mobile devices with automatic valuation, condition assessment, damage deductions, legal contracts, and inventory integration.

## 📦 Installation Steps

### 1. Install Required Dependencies

```bash
npm install react-signature-canvas
npm install @types/react-signature-canvas --save-dev
```

### 2. Run Database Migration

Execute the SQL migration to create all required tables:

```bash
# Using psql
psql "$DATABASE_URL" -f migrations/create_trade_in_system.sql

# Or using your database tool
# Run the file: migrations/create_trade_in_system.sql
```

This creates:
- `lats_trade_in_prices` - Base pricing for devices
- `lats_trade_in_transactions` - Trade-in records
- `lats_trade_in_contracts` - Legal contracts
- `lats_trade_in_damage_assessments` - Damage details
- `lats_trade_in_settings` - System settings

### 3. Add Routes

Add the trade-in routes to your application router:

```typescript
// In your router configuration file

import TradeInPricingPage from './features/lats/pages/TradeInPricingPage';
import TradeInHistoryPage from './features/lats/pages/TradeInHistoryPage';

// Add these routes
{
  path: '/trade-in/pricing',
  element: <TradeInPricingPage />,
},
{
  path: '/trade-in/history',
  element: <TradeInHistoryPage />,
}
```

### 4. Add Navigation Menu Items

Add trade-in links to your navigation menu:

```typescript
// Settings or Admin Menu
{
  name: 'Trade-In Pricing',
  icon: DollarSign,
  path: '/trade-in/pricing',
  description: 'Manage device trade-in prices'
},
{
  name: 'Trade-In History',
  icon: History,
  path: '/trade-in/history',
  description: 'View all trade-in transactions'
}
```

### 5. Integrate into POS

Add the trade-in calculator button to your POS cart/checkout section:

```typescript
import TradeInCalculator from './components/pos/TradeInCalculator';
import TradeInContractModal from './components/pos/TradeInContractModal';

// In your POS component
const [showTradeInCalculator, setShowTradeInCalculator] = useState(false);
const [tradeInData, setTradeInData] = useState(null);
const [tradeInTransaction, setTradeInTransaction] = useState(null);
const [showContract, setShowContract] = useState(false);

// Add button in payment section
<button
  onClick={() => setShowTradeInCalculator(true)}
  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
>
  <Repeat className="w-5 h-5 mr-2" />
  Add Trade-In
</button>

// Add modals
<TradeInCalculator
  isOpen={showTradeInCalculator}
  onClose={() => setShowTradeInCalculator(false)}
  newDevicePrice={cartTotal}
  onTradeInComplete={(data) => {
    setTradeInData(data);
    // Apply trade-in value as discount/credit
    setTradeInDiscount(data.final_trade_in_value);
    setShowTradeInCalculator(false);
    // Create transaction and show contract
    createTradeInTransaction(data);
  }}
/>

<TradeInContractModal
  isOpen={showContract}
  transaction={tradeInTransaction}
  onClose={() => setShowContract(false)}
  onContractSigned={() => {
    // Complete the sale
    handleCompleteSale();
  }}
/>
```

## 🎯 Usage Workflow

### For Staff/Admin:

1. **Set Up Base Prices**
   - Go to Settings → Trade-In Pricing
   - Add base trade-in prices for each device model
   - Set condition multipliers (Excellent, Good, Fair, Poor)
   - Save and activate

2. **During Sale (POS)**
   - Customer brings old device
   - Staff clicks "Add Trade-In" in POS
   - Select device model from list
   - Enter IMEI
   - Assess condition (Excellent/Good/Fair/Poor)
   - Add any damage/issues (auto-deducts spare part prices)
   - Review final trade-in value
   - Customer sees how much they need to pay
   - Complete trade-in

3. **Generate Contract**
   - System auto-generates legal contract
   - Customer enters ID information
   - Reviews terms and conditions
   - Signs electronically
   - Staff signs
   - Contract saved and can be printed

4. **Add to Inventory**
   - Traded-in device automatically added to inventory
   - Mark if needs repair
   - Send to repair if needed
   - Mark as "Ready for Resale" when fixed
   - Set resale price

### For Customers:

1. Customer brings old device
2. Staff values device using calculator
3. Customer sees trade-in value and payment amount
4. Customer agrees and signs contract
5. Customer pays difference (if any)
6. Customer gets new device

## 📊 Features

### ✅ Completed Features

1. **Base Pricing Management**
   - Manual entry per device model
   - Customizable condition multipliers
   - Active/inactive status
   - Branch-specific pricing (optional)

2. **Trade-In Calculator**
   - Device selection
   - Condition assessment (4 levels)
   - Automatic price adjustment
   - Damage/issue tracking
   - Spare parts price deduction
   - Real-time calculation
   - Customer payment calculator

3. **Damage Assessment**
   - Linked to spare parts inventory
   - Auto-deducts spare part prices
   - Custom descriptions
   - Multiple damages supported

4. **Legal Contract**
   - Auto-generates contract
   - Customer information
   - Device details
   - Terms & conditions
   - Ownership declaration
   - Electronic signatures (customer + staff)
   - Printable format
   - Legally binding

5. **Inventory Integration**
   - Adds traded device to inventory
   - Repair status tracking
   - Ready for resale flag
   - Cost tracking (trade-in value)

6. **Database Schema**
   - All tables created
   - Indexes optimized
   - Auto-incrementing transaction numbers
   - Audit trails
   - Relationships maintained

## 🔧 Configuration

### Default Condition Multipliers

Edit in Trade-In Pricing page or database:

```
- Excellent: 100% of base price
- Good: 85% of base price
- Fair: 70% of base price
- Poor: 50% of base price
```

### Terms and Conditions

Customize in database table `lats_trade_in_settings`:

```sql
UPDATE lats_trade_in_settings
SET value = 'Your custom terms here...'
WHERE key = 'contract_terms';

UPDATE lats_trade_in_settings
SET value = 'Your custom ownership declaration...'
WHERE key = 'ownership_declaration';
```

## 📋 Database Tables

### lats_trade_in_prices
Stores base trade-in pricing per device model.

### lats_trade_in_transactions
Main trade-in transaction records with all details.

### lats_trade_in_contracts
Legal contracts with signatures and terms.

### lats_trade_in_damage_assessments
Detailed damage records linked to spare parts.

### lats_trade_in_settings
System configuration (terms, conditions, etc).

## 🎨 UI Components

### TradeInPricingPage
- `/src/features/lats/pages/TradeInPricingPage.tsx`
- Manage base prices
- CRUD operations
- Search and filter

### TradeInCalculator
- `/src/features/lats/components/pos/TradeInCalculator.tsx`
- Device selection
- Condition assessment
- Damage deductions
- Real-time calculations

### TradeInContractModal
- `/src/features/lats/components/pos/TradeInContractModal.tsx`
- Contract generation
- Electronic signatures
- Print support

## 🔌 API Functions

All in `/src/features/lats/lib/tradeInApi.ts`:

- `getTradeInPrices()` - List all prices
- `createTradeInPrice()` - Add new price
- `updateTradeInPrice()` - Update price
- `deleteTradeInPrice()` - Soft delete
- `calculateTradeInValue()` - Calculate value
- `createTradeInTransaction()` - Create transaction
- `createTradeInContract()` - Generate contract
- `getTradeInTransactions()` - List transactions
- `approveTradeInTransaction()` - Approve
- `completeTradeInTransaction()` - Complete

## 📈 Reports & Analytics

Track:
- Total trade-ins per period
- Average trade-in values
- Most traded device models
- Devices needing repair
- Devices ready for resale
- Trade-in to sales conversion

## 🔐 Security & Legal

- Customer ID verification required
- Electronic signatures captured
- Contract legally binding
- Audit trail maintained
- Terms and conditions signed
- Ownership verification

## 🚀 Next Steps

1. Run database migration
2. Install dependencies
3. Configure pricing for your devices
4. Customize terms and conditions
5. Train staff on the system
6. Test with sample transaction
7. Go live!

## 📞 Support

For issues or questions:
- Check database migration ran successfully
- Verify all dependencies installed
- Review console for errors
- Check API responses in network tab

## 🎉 You're Ready!

The trade-in system is fully functional and ready to use. Start by setting up base prices for your devices in the Trade-In Pricing page.

