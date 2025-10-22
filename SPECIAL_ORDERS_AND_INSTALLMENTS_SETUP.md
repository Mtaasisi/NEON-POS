# Special Orders & Installments Feature - Setup & Testing Guide

## 🎉 Features Implemented

### 1. **Special Orders (Pre-Orders/Imports)**
- Create special orders for items not in stock
- Track order status from deposit to delivery
- Record payments towards special orders
- Send automatic WhatsApp/SMS notifications at each status change
- Manage international orders with tracking numbers

### 2. **Installment Payment Plans**
- Create payment plans for customers
- Flexible payment frequencies (weekly, bi-weekly, monthly)
- Automatic payment schedule generation
- Track overdue payments
- Send payment reminders
- Progress visualization

## 📋 Setup Instructions

### Step 1: Run Database Migration

You need to run the migration file to create the necessary tables in your Neon database.

**Option A: Using Neon SQL Editor (Recommended)**
1. Go to your Neon Database console at https://console.neon.tech
2. Open SQL Editor
3. Copy the contents from `migrations/create_special_orders_and_installments.sql`
4. Paste and click "Run"
5. Check for success messages

**Option B: Using psql**
```bash
psql "YOUR_NEON_DATABASE_URL" -f migrations/create_special_orders_and_installments.sql
```

### Step 2: Verify Installation

The features are already integrated into your app! Check:

**✅ Routes Added:**
- `/special-orders` - Special Orders management page
- `/installments` - Installment Plans management page

**✅ Navigation Menu:**
- "Special Orders" (Truck icon) - for admin, sales, manager roles
- "Installment Plans" (Dollar icon) - for admin, sales, manager roles

**✅ Notifications:**
- WhatsApp integration ✅
- SMS integration ✅
- In-app notifications ✅

## 🚀 How to Use

### Creating a Special Order

1. Navigate to **Special Orders** from the sidebar
2. Click **"New Special Order"**
3. Fill in the form:
   - Select customer
   - Product name and description
   - Quantity and unit price
   - Deposit amount
   - Supplier info (optional)
   - Country of origin
   - Expected arrival date
   - Payment method and account
4. Click **"Create Special Order"**

**What happens:**
- Order is created with unique order number (SPO-001, SPO-002, etc.)
- Deposit payment is recorded
- Finance account is updated
- Customer receives WhatsApp confirmation with order details

### Managing Special Order Status

1. Find the order in the list
2. Click **"Update"** button
3. Change status to:
   - `Deposit Received` → Initial state
   - `Ordered` → You've ordered from supplier
   - `In Transit` → Item is shipping
   - `Arrived` → Item reached your store
   - `Ready for Pickup` → Customer can collect
   - `Delivered` → Order complete
4. Add tracking number, arrival dates, notes
5. Click **"Update Order"**

**What happens:**
- Status is updated
- Customer receives notification with new status
- If status is "Arrived" or "Ready for Pickup", customer gets balance due notification

### Recording Additional Payments

1. Find the order with balance due
2. Click **"Record Payment"**
3. Enter:
   - Payment amount
   - Payment method
   - Account
   - Reference number (optional)
4. Click **"Record Payment"**

**What happens:**
- Payment is recorded
- Balance is updated automatically (via database triggers)
- Finance account is updated
- Customer receives payment confirmation with remaining balance

### Creating an Installment Plan

1. Navigate to **Installment Plans** from sidebar
2. Click **"New Installment Plan"**
3. Fill in the form:
   - Select customer
   - Total amount
   - Down payment amount
   - Number of installments
   - Payment frequency (weekly/bi-weekly/monthly)
   - Start date
   - Late fee amount (optional)
   - Payment method and account
4. Click **"Create Installment Plan"**

**What happens:**
- Plan is created with unique plan number (INS-001, INS-002, etc.)
- Down payment is recorded (if any)
- Payment schedule is auto-generated
- Next payment date is calculated
- Customer receives plan details via WhatsApp

### Recording Installment Payments

1. Find active plan
2. Click **"Record Payment"**
3. Enter:
   - Payment amount (defaults to installment amount)
   - Payment method
   - Account
   - Reference number
4. Click **"Record Payment"**

**What happens:**
- Payment is recorded as next installment
- Plan balance is updated automatically
- Installments paid counter increases
- Next payment date is calculated
- Customer receives payment confirmation

### Sending Payment Reminders

1. Find active plan
2. Click **"Remind"** button

**What happens:**
- WhatsApp/SMS reminder is sent
- Message includes: amount due, due date, balance, installments status
- Reminder count is updated in database

### Viewing Payment Schedule

1. Find any plan
2. Click **"Schedule"** button
3. See complete payment schedule with:
   - Each installment number
   - Due dates
   - Payment amounts
   - Status (pending/paid/overdue)
   - Paid dates (for completed installments)

## 📊 Dashboard Statistics

### Special Orders Stats:
- Total orders
- Orders in progress (deposit received + ordered + in transit)
- Orders ready (arrived + ready for pickup)
- Total balance due

### Installment Plans Stats:
- Total plans
- Active plans
- Overdue payments
- Due this week
- Due this month
- Total balance due

## 🔔 Automatic Notifications

### Special Orders:

**Order Created:**
```
✅ Special Order Confirmed!
Thank you for your order SPO-001!
Product: iPhone 15 Pro Max
Quantity: 1
Total: TZS 3,500,000
Deposit Paid: TZS 1,000,000
Balance: TZS 2,500,000
Expected Arrival: 15 Mar 2025
We'll keep you updated on your order status!
```

**Status Updates:**
```
📦 Ordered from Supplier
Good news! We've ordered your iPhone 15 Pro Max from Dubai.
We'll update you when it ships.

🚢 In Transit
Your iPhone 15 Pro Max is on the way!
Expected arrival: 15 Mar 2025

✨ Arrived at Store
Great news! Your iPhone 15 Pro Max has arrived!
Balance due: TZS 2,500,000
Please visit us to collect your order.
```

**Payment Received:**
```
✅ Payment Received!
Order: SPO-001
Product: iPhone 15 Pro Max
Amount Paid: TZS 1,500,000
Total Paid: TZS 2,500,000
Remaining Balance: TZS 1,000,000
Thank you for your payment!
```

### Installment Plans:

**Plan Created:**
```
✅ Installment Plan Created!
Plan: INS-001
Total Amount: TZS 1,000,000
Down Payment: TZS 200,000
Amount to Finance: TZS 800,000

Payment Schedule:
- TZS 266,667 per month
- 3 installments
- Next payment: 21 Nov 2025

Thank you for choosing our installment plan!
```

**Payment Received:**
```
✅ Payment Received!
Plan: INS-001
Amount Paid: TZS 266,667
Remaining Balance: TZS 533,333

Installments Paid: 1/3
Next Payment Due: 21 Dec 2025

Thank you for your payment!
```

**Payment Reminder:**
```
📅 Payment Reminder

Hi John Doe,
Your installment payment of TZS 266,667 is due on 21 Nov 2025 (3 days).

Plan: INS-001
Current Balance: TZS 533,333
Installments Paid: 1/3

Please make your payment on time. Thank you!
```

## 🎨 UI Features

### Flat UI Design
- Clean, modern interface matching your reminder page style
- Card-based layout with shadows
- Color-coded status badges
- Progress bars for installments
- Responsive design (mobile-friendly)

### Form Design
- Similar to "Add New Account" form
- Clear field labels with validation
- Real-time calculations (total amount, installment amounts)
- Preview sections
- Dropdown selects for customers and accounts

### Status Indicators
- **Special Orders:** Color-coded badges (blue/purple/yellow/green/red)
- **Installments:** Progress bars, overdue warnings (red highlight)
- **Icons:** Intuitive icons for each status/action

## 🧪 Testing Checklist

### Database Migration
- [ ] Run migration successfully
- [ ] Tables created: `customer_special_orders`, `special_order_payments`, `customer_installment_plans`, `installment_payments`
- [ ] Indexes created
- [ ] Triggers working (balance auto-update)

### Special Orders
- [ ] Create special order with deposit
- [ ] View order in list
- [ ] Update order status
- [ ] Record additional payment
- [ ] Check customer receives notifications
- [ ] Verify finance account updates
- [ ] Check statistics update
- [ ] Search and filter orders
- [ ] Delete order

### Installment Plans
- [ ] Create installment plan with down payment
- [ ] View plan in list
- [ ] View payment schedule
- [ ] Record installment payment
- [ ] Send payment reminder
- [ ] Check overdue detection
- [ ] Verify auto-calculations (next payment date, balance)
- [ ] Check statistics update
- [ ] Cancel plan

### Notifications
- [ ] WhatsApp notifications working
- [ ] SMS notifications working (if configured)
- [ ] In-app notifications appearing
- [ ] Notification messages are correct
- [ ] Customer phone numbers formatted correctly

### Finance Integration
- [ ] Payment accounts update correctly
- [ ] Account transactions recorded
- [ ] Balance calculations accurate

## 🐛 Troubleshooting

### No notification sent?
- Check customer has valid phone number
- Verify WhatsApp integration is configured in Admin Settings → Integrations
- Check browser console for errors

### Finance account not updating?
- Verify account ID is valid
- Check account exists in `finance_accounts` table
- Look for errors in browser console

### Migration failed?
- Check database connection
- Verify you're connected to correct database
- Look for syntax errors in console output
- Make sure you have permission to create tables

### Navigation links not showing?
- Check your user role (admin, sales, or manager required)
- Refresh the page
- Clear browser cache

## 📱 Mobile Support

Both features are fully responsive:
- Works on phones and tablets
- Touch-friendly buttons
- Scrollable lists
- Mobile-optimized forms

## 🔐 Role Permissions

**Who can access:**
- **Admins:** Full access to both features
- **Sales:** Full access to both features
- **Managers:** Full access to both features
- **Others:** No access

## 🎯 Next Steps

1. **Run the database migration** (most important!)
2. **Test creating a special order** with a real customer
3. **Test creating an installment plan**
4. **Verify notifications are sent**
5. **Check finance accounts update correctly**

## 💡 Tips

1. **Special Orders are perfect for:**
   - Importing phones from Dubai/China
   - Custom computer builds
   - Bulk orders for corporate clients
   - Hard-to-find items

2. **Installment Plans are perfect for:**
   - High-value items (laptops, phones)
   - Loyal customers
   - Bulk purchases
   - Building customer relationships

3. **Use internal notes** in special orders to keep private information

4. **Set realistic expected arrival dates** to manage customer expectations

5. **Late fees** can be configured per installment plan

## 📞 Support

If you encounter any issues:
1. Check browser console for errors
2. Verify database migration ran successfully
3. Check user permissions
4. Ensure WhatsApp integration is configured

## ✅ Summary

You now have a complete system for:
- Managing pre-orders and imports
- Offering installment payment plans to customers
- Automatic notification system
- Full payment tracking
- Integration with your finance system

Both features use:
- Clean, flat UI design
- Simple, intuitive forms
- Real-time updates
- Automatic calculations
- WhatsApp/SMS notifications

Everything is ready to use! Just run the migration and start creating orders! 🚀

