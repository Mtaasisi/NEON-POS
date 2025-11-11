# 🚢 Shipping Management - Quick Start Guide

## What's New?

I've implemented a comprehensive shipping management system for your Purchase Orders! You can now:

✅ Manage shipping agents (freight forwarders)  
✅ Configure shipping methods (Sea, Air, Road, Rail)  
✅ Set default shipping addresses  
✅ Select agents when creating POs  
✅ Track shipments with container/tracking numbers  
✅ Calculate shipping costs and insurance  

---

## 🚀 Getting Started (3 Steps)

### Step 1: Run the Database Migration

Open your **Neon Database Console** and run:

```sql
-- Copy and paste the contents of:
migrations/create_shipping_tables.sql
```

This creates all necessary tables and inserts default shipping methods.

### Step 2: Configure Your First Shipping Agent

1. Go to **Admin Settings** → **Shipping Management**
2. Click **Add Agent**
3. Fill in:
   - **Name:** e.g., "China Sea Freight Co."
   - **Shipping Methods:** Check ☑ Sea and/or ☑ Air
   - **Contact Info:** Phone, Email, WhatsApp
   - **Location:** City, Country
   - **Rates (optional):** Base rate for sea/air
4. Click **Create Agent**

**Example for China Supplier:**
```
Name: Golden Dragon Shipping
Company: Golden Dragon Logistics Ltd
Contact Person: Li Wei
Phone: +86 138 0000 1234
Email: liwei@goldendragon.cn
WeChat: liwei_gd
Shipping Methods: ☑ Sea  ☑ Air
City: Guangzhou
Country: China
Base Rate (Sea): $800 USD
Base Rate (Air): $2,500 USD
☑ Active
☑ Preferred Agent
```

### Step 3: Set Default Shipping Address

1. Still in **Shipping Management**
2. Go to **Default Settings** tab
3. Enter your warehouse/business address:
   ```
   Street: Warehouse #5, Kariakoo Area
   City: Dar es Salaam
   Region: Dar es Salaam
   Country: Tanzania
   ```
4. Select default shipping method (e.g., "Sea Freight")
5. Click **Save Settings**

---

## 📦 Using Shipping in Purchase Orders

### When Creating a PO:

1. **Create PO** as usual (select supplier, add products)
2. Look for **"Shipping Information (Optional)"** section
3. Click **"Click to configure shipping"**
4. In the modal:
   - **Select Agent:** Choose from your list (⭐ = preferred)
   - **Select Method:** Sea Freight, Air Freight, etc.
   - **Set Delivery Date:** Expected arrival
   - **Address:** Pre-filled from defaults
   - **Tracking (optional):** Add later when available
5. Click **Save Configuration**

**That's it!** Your PO now has full shipping tracking.

---

## 🎯 Common Scenarios

### Scenario 1: Sea Shipment from China

```
Agent: China Sea Freight Co. ⭐
Method: Sea Freight (30-60 days)
Expected Delivery: [Date 45 days from now]
Port of Loading: Guangzhou/Shenzhen
Port of Discharge: Dar es Salaam
Container Type: 40ft HC
```

Later, add:
- Bill of Lading (B/L) number
- Container number
- Actual departure/arrival dates

### Scenario 2: Urgent Air Shipment

```
Agent: Fast Air Cargo ⭐
Method: Express Air (2-5 days)
Expected Delivery: [Date 3 days from now]
Airway Bill: AWB-123456789
```

### Scenario 3: Local/Regional Delivery

```
Agent: TZ Road Transport
Method: Road Transport (3-7 days)
Expected Delivery: [Date 5 days from now]
```

---

## 📋 Files Created

### Database:
- `migrations/create_shipping_tables.sql` - Run this first!

### Frontend Components:
- `src/lib/shippingApi.ts` - API for shipping management
- `src/features/settings/components/ShippingSettings.tsx` - Settings page
- Updated `ShippingConfigurationModal.tsx` - Now fetches real agents
- Updated `AdminSettingsPage.tsx` - Added shipping tab

### Documentation:
- `SHIPPING_SETUP_GUIDE.md` - Full documentation (READ THIS!)
- `SHIPPING_QUICK_START.md` - This file

---

## 🎨 Features Highlights

### In Admin Settings → Shipping Management:

**Shipping Agents Tab:**
- Add/Edit/Delete agents
- Mark preferred agents (⭐)
- Active/Inactive status
- View agent specializations (sea/air/road)
- Track performance metrics
- Store contact info (phone, email, WhatsApp)

**Shipping Methods Tab:**
- View all available methods
- See estimated delivery times
- Cost multipliers displayed

**Default Settings Tab:**
- Set default shipping address
- Set default billing address
- Choose default agent & method
- Configure notifications
- Set insurance percentage

### In Purchase Orders:

**Shipping Configuration:**
- Select from your configured agents
- Choose shipping method
- Set expected delivery date
- Enter shipping address (defaults loaded)
- Add tracking numbers
- Include special notes
- Calculate costs

---

## 💡 Pro Tips

1. **Mark Preferred Agents:** Your most-used agents get the ⭐ star
2. **Track Performance:** System auto-tracks shipment counts
3. **Use Notes:** Add special instructions in shipping notes
4. **Update Tracking:** Add container/AWB numbers when available
5. **Rate Agents:** Update agent ratings based on performance
6. **Multi-Currency:** Set agent rates in USD, EUR, TZS, or CNY

---

## 🔧 Customization

### Add Custom Shipping Methods:

In database, insert into `lats_shipping_methods`:
```sql
INSERT INTO lats_shipping_methods (name, code, description, estimated_days_min, estimated_days_max)
VALUES ('Express Sea', 'express_sea', 'Fast sea shipping', 20, 30, 1.5);
```

### Add More Agents:

Use the UI in Admin Settings, or via API:
```typescript
import shippingApi from '@/lib/shippingApi';

await shippingApi.agents.create({
  name: 'New Agent',
  shipping_methods: ['sea', 'air'],
  phone: '+1234567890',
  is_active: true,
});
```

---

## 📊 Database Tables Created

- `lats_shipping_agents` - Your freight forwarders
- `lats_shipping_methods` - Sea, Air, Road, Rail, etc.
- `lats_shipping_settings` - Default preferences
- `lats_purchase_order_shipping` - Links shipping to POs

---

## ❓ Need Help?

**Problem:** No agents showing in PO creation  
**Solution:** Ensure agents are marked "Active" in settings

**Problem:** Shipping methods not displaying  
**Solution:** Re-run database migration

**Problem:** Can't save configuration  
**Solution:** Expected delivery date is required

**Full Documentation:** See `SHIPPING_SETUP_GUIDE.md`

---

## 🎉 You're All Set!

Your shipping management system is ready to use:

1. ✅ Run migration → Creates tables
2. ✅ Add agents → Manage freight forwarders
3. ✅ Set defaults → Configure addresses
4. ✅ Use in POs → Select agent & method
5. ✅ Track shipments → Monitor deliveries

**Next Steps:**
- Add your real shipping agents
- Configure your warehouse address
- Create a test PO with shipping
- Track your first shipment!

---

**Made with ❤️ for efficient PO management**

