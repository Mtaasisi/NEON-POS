# 📱 How to Create a Trade-In - Complete Guide

**Last Updated:** October 22, 2025

---

## 🚀 QUICK START - Create Your First Trade-In

### **3 Simple Steps:**

1. **Go to Create Trade-In page**
2. **Click "Add Trade-In Device"**
3. **Follow the wizard**

That's it! Let me show you exactly how...

---

## 📍 WHERE TO CREATE TRADE-INS

### **Option 1: Test Page** (For Learning/Testing) ⭐

**URL:** `http://localhost:5173/lats/trade-in/create`

**From Sidebar:**
- Look for "Inventory & Stock Management" section
- Click **"+ Create Trade-In"** (third trade-in option)

**Best For:**
- Learning the system
- Testing the flow
- Creating standalone trade-ins
- Training staff

---

### **Option 2: POS Integration** (For Real Sales)

**In POS System:**
- Add new device to cart
- Click "Add Trade-In" button
- Follow same process
- Complete sale with trade-in credit

**Best For:**
- Real customer transactions
- Trade-in + new purchase
- Production use

---

## 🎯 COMPLETE WALKTHROUGH

### **Step 1: Access the Create Trade-In Page**

```bash
# Start your server (if not running)
npm run dev

# Navigate to:
http://localhost:5173/lats/trade-in/create
```

**Or from sidebar:** Click **"+ Create Trade-In"**

---

### **Step 2: Click "Add Trade-In Device"**

You'll see a simulated sale scenario showing:
- New device customer is buying: **iPhone 14 Pro Max** (TSh 1,200,000)
- Empty slot for trade-in device
- Total customer pays: **TSh 1,200,000**

**Click the dashed box that says:** "Add Trade-In Device"

---

### **Step 3: Trade-In Calculator Opens - Select Device**

#### **Screen 1: Device Selection**

You'll see a list of devices with prices you've set up:

```
┌─────────────────────────────────┐
│ 📱 iPhone 13 Pro                │
│ 128GB Graphite                  │
│ Up to TSh 600,000              │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 📱 Samsung Galaxy S23 Ultra     │
│ 256GB Phantom Black             │
│ Up to TSh 700,000              │
└─────────────────────────────────┘
```

**Action:** Click on the device the customer is trading in.

**Example:** Customer has iPhone 13 Pro → Click that card

---

### **Step 4: Assess Condition**

#### **Screen 2: Device Condition Assessment**

Now you need to:

**A. Enter Device IMEI:**
```
Device IMEI: [123456789012345]
```

**B. Select Condition:**

Choose one of 4 condition levels:

```
┌─────────────────────────────────┐
│ ✅ EXCELLENT (100%)             │
│ TSh 600,000                     │
│ Like new, no visible wear       │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ✅ GOOD (85%)                   │
│ TSh 510,000                     │
│ Minor wear, fully functional    │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ⚠️ FAIR (70%)                   │
│ TSh 420,000                     │
│ Visible wear, works fine        │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ⚠️ POOR (50%)                   │
│ TSh 300,000                     │
│ Heavy damage, may have issues   │
└─────────────────────────────────┘
```

**Action:** Click the condition that matches the device.

**Example:** Minor scratches but works perfectly → Click **"GOOD"**

**C. Add Condition Notes (Optional):**
```
Condition Notes:
[Device has minor scratches on back, screen is perfect, 
 battery health 90%, all features working]
```

**Click:** **"Next: Assess Damage"**

---

### **Step 5: Assess Damage/Issues**

#### **Screen 3: Damage Assessment**

Here you can add specific damage that reduces the value:

**Current Value Shown:**
```
Base Price: TSh 600,000
Good Condition (85%): TSh 510,000
Damage Deductions: TSh 0
───────────────────────────────
Final Value: TSh 510,000
```

**Add Damage:**

You'll see a grid of spare parts from your inventory:

```
┌──────────────────┐ ┌──────────────────┐
│ Back Glass       │ │ Screen           │
│ TSh 50,000       │ │ TSh 120,000      │
└──────────────────┘ └──────────────────┘

┌──────────────────┐ ┌──────────────────┐
│ Battery          │ │ Camera Module    │
│ TSh 80,000       │ │ TSh 100,000      │
└──────────────────┘ └──────────────────┘
```

**Action:** Click on any damaged parts

**Example:** Back glass is cracked → Click **"Back Glass"**

**Calculation Updates Automatically:**
```
Base Price: TSh 600,000
Good Condition (85%): TSh 510,000
Damage Deductions: -TSh 50,000
───────────────────────────────
Final Value: TSh 460,000 ✅
```

**You can add multiple damages:**
- Each click adds the damage
- Price automatically deducts
- Can add description for each damage

**Click:** **"Review & Complete"**

---

### **Step 6: Review Final Calculation**

#### **Screen 4: Review & Summary**

**Complete Breakdown:**

```
╔══════════════════════════════════════╗
║    📱 TRADE-IN SUMMARY               ║
╚══════════════════════════════════════╝

Device:
  iPhone 13 Pro - 128GB Graphite
  IMEI: 123456789012345

Condition:
  Good - Minor scratches, fully functional

Damage/Issues:
  - Back Glass Cracked: -TSh 50,000

╔══════════════════════════════════════╗
║    💰 CALCULATION                    ║
╚══════════════════════════════════════╝

Base Trade-In Price:        TSh 600,000
Condition Adjustment (85%): TSh 510,000
Total Deductions:          -TSh  50,000
─────────────────────────────────────
Final Trade-In Value:       TSh 460,000 ✅

╔══════════════════════════════════════╗
║    🛒 SALE SUMMARY                   ║
╚══════════════════════════════════════╝

New Device Price:          TSh 1,200,000
Trade-In Credit:          -TSh   460,000
─────────────────────────────────────
Customer Pays:             TSh   740,000 ✅
```

**Action:** Review everything, then click **"Complete Trade-In"**

---

### **Step 7: Transaction Created!**

You'll see:
```
✅ Transaction Created: TI-000001
```

The page updates showing:
- Trade-in added to the sale
- Customer payment amount adjusted
- Transaction number generated

---

### **Step 8: Generate & Sign Contract**

**Click:** **"View/Sign Contract"**

#### **Contract Modal Opens:**

**Shows:**
- Customer information
- Device details
- Agreed value
- Terms & conditions
- Ownership declaration

**To Complete:**

1. **Enter Customer ID:**
   ```
   ID Type: [National ID ▼]
   ID Number: [12345678]
   ```

2. **Customer Reads Terms:**
   - Full terms displayed
   - Ownership declaration shown

3. **Customer Agrees:**
   ```
   ☑️ I have read, understood, and agree to all terms
   ```

4. **Customer Signs:**
   - Draw signature in the box
   - Or click "Clear" to redo

5. **Staff Signs:**
   - You also sign in your box

6. **Click:** **"Sign & Complete Contract"**

---

### **Step 9: Done!**

**Success Messages:**
```
✅ Contract signed successfully!
✅ Transaction Created: TI-000001
✅ Device added to inventory
✅ Sale completed!
```

**What Happens Next:**
- Trade-in transaction saved in database
- Contract stored with signatures
- Device automatically added to inventory
- Customer payment recorded
- Can view in Trade-In History

---

## 📊 WHAT YOU'LL SEE IN EACH STEP

### **Visual Flow:**

```
1. Create Trade-In Page
   └─> Shows simulated sale
       └─> Click "Add Trade-In"

2. Device Selection
   └─> Grid of available devices
       └─> Click device model

3. Condition Assessment  
   └─> Enter IMEI
   └─> Choose condition level
   └─> Add notes
       └─> Click "Next"

4. Damage Assessment
   └─> See spare parts grid
   └─> Click damaged parts
   └─> Price updates automatically
       └─> Click "Review"

5. Review & Complete
   └─> Full breakdown shown
   └─> Final calculations
       └─> Click "Complete"

6. Transaction Created
   └─> Transaction number generated
       └─> Click "View Contract"

7. Contract Signing
   └─> Enter customer ID
   └─> Customer reviews
   └─> Both sign
       └─> Click "Sign & Complete"

8. Success!
   └─> All saved
   └─> Device in inventory
   └─> View in history
```

---

## 💡 EXAMPLE SCENARIOS

### **Scenario 1: Perfect Condition**

```
Customer: Trades iPhone 13 Pro (excellent condition)
IMEI: 123456789012345
Condition: Excellent (100%)
Damage: None

Calculation:
  Base: TSh 600,000
  Multiplier: 1.0
  Deductions: TSh 0
  ─────────────────
  Final: TSh 600,000 ✅

New Phone: TSh 1,200,000
Customer Pays: TSh 600,000
```

---

### **Scenario 2: Good with Minor Damage**

```
Customer: Trades iPhone 13 Pro
IMEI: 987654321012345
Condition: Good (85%)
Damage: 
  - Back Glass Cracked: -TSh 50,000

Calculation:
  Base: TSh 600,000
  Good (85%): TSh 510,000
  Deductions: -TSh 50,000
  ─────────────────
  Final: TSh 460,000 ✅

New Phone: TSh 1,200,000
Customer Pays: TSh 740,000
```

---

### **Scenario 3: Fair with Multiple Issues**

```
Customer: Trades iPhone 13 Pro
IMEI: 555666777888999
Condition: Fair (70%)
Damage:
  - Back Glass Cracked: -TSh 50,000
  - Battery Weak: -TSh 80,000
  - Camera Scratched: -TSh 30,000

Calculation:
  Base: TSh 600,000
  Fair (70%): TSh 420,000
  Deductions: -TSh 160,000
  ─────────────────
  Final: TSh 260,000 ✅

New Phone: TSh 1,200,000
Customer Pays: TSh 940,000
```

---

## 🎯 AFTER CREATING TRADE-IN

### **View in History:**

1. Go to **"⏱ Trade-In History"** in sidebar
2. You'll see your transaction:

```
┌────────────────────────────────────────────────┐
│ TI-000001 | iPhone 13 Pro                      │
│ Customer: John Doe (+255...)                   │
│ Condition: Good                                │
│ Value: TSh 460,000                            │
│ Status: Pending 🟡                            │
│ Date: Oct 22, 2025                            │
└────────────────────────────────────────────────┘
```

---

### **Device in Inventory:**

The traded device is automatically added to your inventory:

```
Product: iPhone 13 Pro (Trade-In)
IMEI: 123456789012345
Cost: TSh 460,000 (what you paid)
Condition: Good
Status: Available
Ready for Resale: Yes
```

You can:
- Mark if needs repair
- Set resale price
- Sell it like regular inventory

---

## 🔑 KEY FEATURES

### **Automatic Calculations:**
- ✅ Price adjusts by condition automatically
- ✅ Damage deductions calculated instantly
- ✅ Customer payment auto-calculated
- ✅ All math done for you

### **Smart Deductions:**
- ✅ Linked to spare parts prices
- ✅ Add multiple damages
- ✅ Custom descriptions
- ✅ Transparent for customer

### **Legal Protection:**
- ✅ IMEI recorded
- ✅ Customer ID required
- ✅ Electronic signatures
- ✅ Complete contract
- ✅ Terms agreed to

### **Inventory Integration:**
- ✅ Auto-adds to inventory
- ✅ Cost tracked (trade-in value)
- ✅ Repair status managed
- ✅ Ready for resale when fixed

---

## 📝 CHECKLIST FOR EACH TRADE-IN

Before you start:
- [ ] Device pricing set up
- [ ] Spare parts in system
- [ ] Customer in database

During trade-in:
- [ ] Get device IMEI
- [ ] Assess condition honestly
- [ ] Check for all damage
- [ ] Show customer calculation
- [ ] Get customer ID
- [ ] Generate contract
- [ ] Both parties sign

After trade-in:
- [ ] Verify in history
- [ ] Check inventory added
- [ ] Mark repair status
- [ ] Set resale price when ready

---

## 🎓 TIPS & BEST PRACTICES

### **Condition Assessment:**

**Excellent (100%):**
- Like brand new
- No visible wear
- Perfect screen
- All features 100%

**Good (85%):**
- Minor scratches
- Light wear
- Fully functional
- Good battery health

**Fair (70%):**
- Visible wear
- Some scratches
- Works fine
- May need battery

**Poor (50%):**
- Heavy wear
- Multiple issues
- Major damage
- Needs repairs

---

### **Damage Deduction:**

**Always check:**
- Screen condition
- Back glass
- Camera
- Buttons
- Battery health
- Water damage
- IMEI blacklist

**Be Fair:**
- Use actual spare part costs
- Be consistent
- Show customer why
- Document everything

---

### **Customer Communication:**

**Show Them:**
1. Base price for their device
2. Condition multiplier effect
3. Each damage deduction
4. Final trade-in value
5. How much they'll pay

**Be Transparent:**
- Explain each step
- Show calculations
- Answer questions
- Build trust

---

## 🆘 TROUBLESHOOTING

### **Problem: Device not in list**
**Solution:** Go to Trade-In Pricing, add the device first

### **Problem: Can't find spare part**
**Solution:** Add spare part to spare parts inventory

### **Problem: Customer disputes price**
**Solution:** Show them calculation, adjust if fair

### **Problem: IMEI already in system**
**Solution:** Check if device was traded in before

### **Problem: Contract won't generate**
**Solution:** Ensure all required fields filled

---

## 🎉 SUCCESS!

You now know how to:
- ✅ Access the create trade-in page
- ✅ Use the trade-in calculator
- ✅ Assess device condition
- ✅ Add damage deductions
- ✅ Generate contracts
- ✅ Complete transactions
- ✅ View in history
- ✅ Manage inventory

---

## 📍 QUICK LINKS

**Create Trade-In:**
```
http://localhost:5173/lats/trade-in/create
```

**View History:**
```
http://localhost:5173/lats/trade-in/history
```

**Manage Pricing:**
```
http://localhost:5173/lats/trade-in/pricing
```

---

## 🚀 START NOW!

```bash
# 1. Start server
npm run dev

# 2. Go to:
http://localhost:5173/lats/trade-in/create

# 3. Click "Add Trade-In Device"

# 4. Follow the wizard!
```

**You're ready to create your first trade-in!** 🎉

