# How to Use Multi-Currency Purchase Orders

## Quick Start Guide

### Creating a Purchase Order in USD

1. **Navigate to PO Creation Page**
   - Go to Purchase Orders → Create New PO

2. **Select Currency**
   - Look for the currency selector (default is TZS 🇹🇿)
   - Select USD 🇺🇸 from the dropdown

3. **Enter Exchange Rate** (if using USD, EUR, or GBP)
   - Enter the current exchange rate
   - Format: `1 USD = 2500 TZS` (example)
   - The system will use this rate to calculate TZS equivalent

4. **Select Supplier**
   - Choose a supplier from the list
   - Set payment terms (e.g., Net 30, Net 60, COD)

5. **Add Products**
   - Search and add products to the cart
   - Enter prices in USD (the selected currency)
   - System will calculate totals in USD

6. **Review Totals**
   - **Subtotal:** Shows amount in USD
   - **Total in TZS:** Shows equivalent in TZS based on exchange rate
   - Both amounts are saved to the database

7. **Create PO**
   - Click "Create PO" button
   - System saves:
     - Currency: USD
     - Total Amount: (in USD)
     - Exchange Rate: 2500
     - Total in TZS: (calculated)

### Supported Currencies

| Currency | Code | Flag | Default Exchange Rate |
|----------|------|------|----------------------|
| Tanzanian Shilling | TZS | 🇹🇿 | 1.0 (base) |
| US Dollar | USD | 🇺🇸 | 2500 |
| Euro | EUR | 🇪🇺 | 2700 |
| British Pound | GBP | 🇬🇧 | 3200 |

### Exchange Rate Examples

```
Creating PO for $1,000 USD worth of goods:
- Enter: "1 USD = 2500 TZS"
- Item prices entered in USD: $100, $200, $300, etc.
- Total: $1,000 USD
- Equivalent: 2,500,000 TZS (automatically calculated)
```

```
Creating PO for €500 EUR worth of goods:
- Enter: "1 EUR = 2700 TZS"
- Item prices entered in EUR: €100, €200, €200
- Total: €500 EUR
- Equivalent: 1,350,000 TZS (automatically calculated)
```

## Viewing Existing Purchase Orders

When you view a PO:
- **Currency** is displayed in the header
- **All amounts** show in the original currency
- **TZS Equivalent** is shown below (if not TZS)
- **Exchange Rate** used is displayed

Example:
```
Purchase Order: PO-123456
Currency: USD 🇺🇸
Total Amount: $1,000.00
Exchange Rate: 1 USD = 2,500 TZS
TZS Equivalent: 2,500,000 TZS
```

## Editing Purchase Orders

When editing a PO:
1. **Currency is preserved** - You'll see the original currency
2. **Exchange rate is loaded** - The original rate is shown
3. **Item prices remain** - Prices stay in original currency
4. **You can update:**
   - Item quantities
   - Item prices (in the original currency)
   - Notes
   - Status
   - Currency or exchange rate (if needed)

## Duplicating Purchase Orders

When duplicating a PO:
- **Currency is copied** from the original
- **Exchange rate is copied** from the original
- **All items and prices** are copied
- Status is reset to "Draft"
- You can modify anything before saving

## Payment Processing

When making payments on multi-currency POs:
- **Payment amount** is in the PO's currency
- **System converts** to TZS for account transactions
- **Exchange rate used** is from the PO or current rate

Example:
```
PO in USD: $1,000
Paying: $500 USD
Exchange Rate: 2,500 TZS/USD
Account Debited: 1,250,000 TZS
```

## Reports and Analytics

Multi-currency POs appear in reports:
- **Original Currency:** Shows actual currency and amount
- **TZS Equivalent:** Shows converted amount for totals
- **Exchange Rate:** Displayed for reference

## Best Practices

### ✅ DO:
- Always enter the current exchange rate when creating POs in foreign currency
- Use consistent exchange rates from your bank or official source
- Review TZS equivalent before saving
- Keep payment terms updated
- Document exchange rate source (manual, bank, API)

### ❌ DON'T:
- Mix currencies in the same PO (use one currency per PO)
- Forget to update exchange rates regularly
- Use very old exchange rates
- Enter prices in wrong currency

## Troubleshooting

### Problem: PO shows wrong currency
**Solution:** Check the currency selector before creating the PO. Cannot change currency after creation (would require creating a new PO).

### Problem: Exchange rate seems wrong
**Solution:** Verify the exchange rate entered. Edit the PO to update if needed within the same day.

### Problem: TZS equivalent doesn't match
**Solution:** System automatically calculates. Check if exchange rate is correct. Formula: `Total Amount × Exchange Rate = TZS Equivalent`

### Problem: Cannot change currency on existing PO
**Solution:** By design - duplicate the PO and create new one with correct currency.

## Example Workflow

### Scenario: Importing phones from China

1. **Supplier quotes in USD:** $50,000
2. **Check current exchange rate:** 1 USD = 2,500 TZS
3. **Create PO:**
   - Select USD currency
   - Enter exchange rate: 2500
   - Add 500 phones at $100 each
   - Total: $50,000 USD
   - TZS Equivalent: 125,000,000 TZS

4. **Save PO** - Status: Draft
5. **Supplier confirms** - Change status to: Sent
6. **Goods arrive** - Receive items
7. **Make payment:**
   - Pay $25,000 USD (50% deposit)
   - System debits 62,500,000 TZS from account
   - Payment status: Partial

8. **Later payment:**
   - Pay remaining $25,000 USD
   - System debits 62,500,000 TZS from account
   - Payment status: Paid

## Currency Conversion Formula

```
Formula:
Total Amount in Base Currency (TZS) = Total Amount × Exchange Rate

Examples:
$1,000 × 2,500 = 2,500,000 TZS
€500 × 2,700 = 1,350,000 TZS
£200 × 3,200 = 640,000 TZS
```

## Database Fields Reference

When a multi-currency PO is created, these fields are saved:

| Field | Example | Description |
|-------|---------|-------------|
| `currency` | USD | Currency used for PO |
| `total_amount` | 1000 | Total in PO currency |
| `exchange_rate` | 2500 | Rate to base currency |
| `base_currency` | TZS | Base currency (always TZS) |
| `total_amount_base_currency` | 2500000 | Total in TZS |
| `exchange_rate_source` | manual | How rate was determined |
| `exchange_rate_date` | 2025-11-07 | When rate was applied |
| `payment_terms` | Net 30 | Payment terms |

---

**Need Help?** Contact your system administrator or refer to the CURRENCY_FIX_SUMMARY.md for technical details.

