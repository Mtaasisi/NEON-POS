# ✅ Shipping Management - Installation Checklist

## Step-by-Step Installation Guide

Follow these steps in order to activate your shipping management system:

---

### ☐ Step 1: Run Database Migration (5 minutes)

1. Open your **Neon Database Console**
2. Navigate to the SQL Query editor
3. Open the file: `migrations/create_shipping_tables.sql`
4. Copy all the SQL code
5. Paste it into the Neon query editor
6. Click **Run** or press **Ctrl+Enter**
7. Wait for confirmation message: ✅ "Shipping management tables created successfully!"

**Verify:**
```sql
-- Run this to check tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE 'lats_shipping%';
```

Expected output:
- `lats_shipping_agents`
- `lats_shipping_methods`
- `lats_purchase_order_shipping`
- `lats_shipping_settings`

---

### ☐ Step 2: Access Shipping Settings (1 minute)

1. Open your POS application
2. Click on **Admin Settings** (⚙️ gear icon in sidebar)
3. In the left sidebar, click **"Shipping Management"** (🚛 Truck icon)
4. You should see 3 tabs:
   - Shipping Agents
   - Shipping Methods
   - Default Settings

**Verify:** You can see the page without errors

---

### ☐ Step 3: View Shipping Methods (1 minute)

1. Click the **"Shipping Methods"** tab
2. You should see 5 pre-populated methods:
   - 🚢 Sea Freight (30-60 days)
   - ✈️ Air Freight (5-10 days)
   - ✈️ Express Air (2-5 days)
   - 🚛 Road Transport (3-7 days)
   - 🚊 Rail Freight (10-20 days)

**Verify:** All 5 methods are visible with icons and delivery times

---

### ☐ Step 4: Add Your First Shipping Agent (5 minutes)

1. Go to **"Shipping Agents"** tab
2. Click **"Add Agent"** button (blue button, top right)
3. Fill in the form:

**Required Fields:**
- ✅ Agent Name: `[Your agent's name]`
- ✅ Shipping Methods: Check at least one box (Sea/Air/Road/Rail)

**Recommended Fields:**
- Company Name
- Contact Person
- Phone Number
- Email
- City & Country

4. Click **"Create Agent"**
5. Agent should appear in the list

**Example Test Agent:**
```
Name: Test Shipping Co.
Company Name: Test Logistics Ltd
Contact Person: John Doe
Phone: +255 123 456 789
Email: test@shipping.com
Shipping Methods: ☑ Sea  ☑ Air
City: Dar es Salaam
Country: Tanzania
☑ Active
☑ Preferred Agent
```

**Verify:** Agent card appears in the agents list

---

### ☐ Step 5: Configure Default Settings (3 minutes)

1. Go to **"Default Settings"** tab
2. Enter your default shipping address:
   ```
   Street: [Your warehouse street address]
   City: [Your city]
   Region: [Your region/state]
   Country: [Your country]
   ```
3. Select **Default Shipping Method** from dropdown (e.g., "Sea Freight")
4. (Optional) Select **Default Agent** from dropdown
5. Check notification preferences:
   - ☑ Notify on shipment
   - ☑ Notify on arrival
6. Insurance settings:
   - ☑ Include insurance by default
   - Set percentage: `2.0` %
7. Click **"Save Settings"** button (bottom right)

**Verify:** Success message "Settings saved successfully"

---

### ☐ Step 6: Test in Purchase Order (5 minutes)

1. Navigate to **Purchase Orders** module
2. Click **"Create New PO"** or open an existing draft
3. Select a supplier
4. Add at least one product
5. Scroll down to **"Shipping Information (Optional)"** section
6. Click **"Click to configure shipping"** button
7. A modal should open showing:
   - Expected Delivery Date field
   - **Shipping Agent dropdown** (your agent should be listed)
   - **Shipping Method** options (with icons)
   - Pre-filled shipping address
8. Fill in:
   - Expected Delivery: [Select a future date]
   - Shipping Agent: [Select your test agent]
   - Shipping Method: [Select Sea Freight]
9. Click **"Save Configuration"**

**Verify:** 
- Modal closes
- Shipping section shows green checkmark ✓
- Shows: "Delivery: [your date]" and selected method

---

### ☐ Step 7: Complete & Verify (2 minutes)

1. Complete the PO creation/save
2. Go back to **Admin Settings → Shipping Management → Agents**
3. Your test agent should show:
   - Active status
   - Contact information
   - Shipping methods badges
   - (Optional) Preferred star ⭐

---

## ✅ Verification Checklist

Confirm all these work:

### Database:
- [ ] Migration ran without errors
- [ ] 4 shipping tables created
- [ ] 5 default shipping methods exist
- [ ] Can query tables successfully

### Settings Page:
- [ ] Can access Shipping Management in Admin Settings
- [ ] All 3 tabs visible (Agents, Methods, Defaults)
- [ ] Can view shipping methods
- [ ] Can add new agent
- [ ] Agent appears in list
- [ ] Can edit existing agent
- [ ] Can mark agent as preferred (⭐)
- [ ] Can toggle agent active/inactive
- [ ] Can save default settings
- [ ] Default address saved correctly

### Purchase Orders:
- [ ] Shipping configuration button visible in PO
- [ ] Modal opens when clicked
- [ ] Agents appear in dropdown
- [ ] Methods show with icons
- [ ] Default address pre-filled
- [ ] Can select agent and method
- [ ] Can save shipping configuration
- [ ] Shipping info displays on PO

### UI/UX:
- [ ] No console errors
- [ ] All icons display correctly
- [ ] Toast notifications work
- [ ] Loading states show properly
- [ ] Forms validate correctly
- [ ] Responsive on mobile/tablet

---

## 🐛 Troubleshooting

### Problem: "Table already exists" error
**Solution:** Tables already created. Skip migration and continue to Step 2.

### Problem: No agents showing in PO modal
**Solution:** 
1. Go to Admin Settings → Shipping Management → Agents
2. Check if agents exist
3. Make sure agent is marked as "Active"
4. Refresh the page

### Problem: Shipping tab not visible
**Solution:**
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
3. Check browser console for errors

### Problem: Cannot save shipping configuration
**Solution:**
1. Expected delivery date is required (must fill)
2. Shipping city is required (should be pre-filled)
3. Check browser console for specific error

### Problem: Methods not showing
**Solution:**
1. Check if migration ran successfully
2. Query: `SELECT * FROM lats_shipping_methods;`
3. Should return 5 rows
4. If empty, re-run migration

---

## 📞 Need Help?

If you encounter any issues:

1. **Check Console:** Open browser DevTools (F12) → Console tab
2. **Check Database:** Run queries to verify tables exist
3. **Read Docs:** See `SHIPPING_SETUP_GUIDE.md` for detailed info
4. **Check Files:** Ensure all files are saved and no TypeScript errors

---

## 🎉 Success!

Once all steps are complete, you have:

✅ Database tables created  
✅ Default shipping methods loaded  
✅ Shipping settings configured  
✅ First agent added  
✅ Default address set  
✅ Tested in PO creation  
✅ Verified everything works  

**Your shipping management system is now fully operational!**

---

## 📚 Next Steps

1. **Add Real Agents:**
   - Add your actual freight forwarders
   - Update contact information
   - Set accurate rates

2. **Configure Settings:**
   - Set your actual warehouse address
   - Choose preferred default agent
   - Adjust insurance percentage

3. **Create Real POs:**
   - Start using shipping in real purchase orders
   - Track actual shipments
   - Update tracking numbers

4. **Monitor Performance:**
   - Track agent success rates
   - Rate agents after deliveries
   - Adjust preferred agents

---

## 📖 Documentation

- **Quick Start:** `SHIPPING_QUICK_START.md`
- **Full Guide:** `SHIPPING_SETUP_GUIDE.md`
- **Implementation:** `SHIPPING_IMPLEMENTATION_SUMMARY.md`
- **This Checklist:** `SHIPPING_INSTALLATION_CHECKLIST.md`

---

**Installation Time:** ~20 minutes  
**Skill Level:** Basic (follow steps)  
**Status After Completion:** ✅ Production Ready

---

**Happy Shipping! 🚢✈️🚛**

