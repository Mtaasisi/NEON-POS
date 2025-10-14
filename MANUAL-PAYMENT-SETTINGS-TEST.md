# ✅ Manual Payment Settings Test Checklist

**Login:** care@care.com | Password: 123456  
**Date:** October 13, 2025

---

## 🚀 Pre-Test Setup

- [ ] **Step 1:** Start your development server
  ```bash
  npm run dev
  ```
- [ ] **Step 2:** Open browser and navigate to `http://localhost:5173`
- [ ] **Step 3:** Login with credentials above
- [ ] **Step 4:** Navigate to "Admin Settings" (or `/admin-settings`)
- [ ] **Step 5:** Click "Payments" in the left sidebar

---

## 📦 TEST 1: Expense Categories Tab

**Navigate to:** Expense Categories tab

### Visual Checks:
- [ ] Tab loads successfully
- [ ] Title shows "Expense Categories"
- [ ] Description shows "Manage categories for organizing expenses"
- [ ] "Add Category" button is visible

### Functional Tests:
- [ ] **Click "Add Category" button**
  - [ ] Form appears with title "New Category"
  - [ ] Category Name field is present
  - [ ] Description field is present
  - [ ] Icon dropdown is present
  - [ ] Color dropdown is present
  
- [ ] **Fill in test data:**
  - [ ] Enter "Test Category" in name
  - [ ] Enter "Test Description" in description
  - [ ] Select an icon
  - [ ] Select a color
  
- [ ] **Click "Cancel"** (to avoid saving test data)
  - [ ] Form closes successfully
  
- [ ] **If existing categories are visible:**
  - [ ] Each category shows icon and color
  - [ ] Edit button works (opens form)
  - [ ] Active/Inactive toggle is visible

**✅ RESULT:** PASS / FAIL / NOTES: ___________________

---

## 🛡️ TEST 2: Payment Gateway Tab

**Navigate to:** Payment Gateway tab

### Visual Checks:
- [ ] Tab loads successfully
- [ ] Title shows "Payment Gateway Configuration"
- [ ] "Beem Payment Gateway" section is visible
- [ ] Enable/Disable toggle is present

### Functional Tests:
- [ ] **Check current Beem status:**
  - Current state: Enabled ☐ / Disabled ☐
  
- [ ] **Toggle Beem enable/disable:**
  - [ ] Click toggle
  - [ ] If enabled, configuration fields appear (API Key, Secret Key, Environment)
  - [ ] If disabled, fields hide
  - [ ] Toggle back to original state
  
- [ ] **Test Connection button:**
  - [ ] Button is visible when enabled
  - [ ] Clicking button shows toast notification

- [ ] **Save button:**
  - [ ] "Save Gateway Settings" button present
  - [ ] Clicking shows success toast

**✅ RESULT:** PASS / FAIL / NOTES: ___________________

---

## ⚙️ TEST 3: Preferences Tab

**Navigate to:** Preferences tab

### Visual Checks:
- [ ] Tab loads successfully
- [ ] Title shows "Payment Preferences"
- [ ] "Enabled Payment Methods" section visible
- [ ] "Transaction Settings" section visible
- [ ] "Tax & Currency" section visible

### Functional Tests:
- [ ] **Payment Methods (3 checkboxes):**
  - [ ] Cash Payments checkbox present
  - [ ] Card Payments checkbox present  
  - [ ] Mobile Money checkbox present
  - [ ] Can toggle each checkbox
  
- [ ] **Transaction Settings (3 toggles):**
  - [ ] Auto-confirm successful payments toggle present
  - [ ] Require receipt for all transactions toggle present
  - [ ] Allow partial payments toggle present
  - [ ] Can toggle each setting
  
- [ ] **Tax & Currency:**
  - [ ] Default Tax Rate field present
  - Current value: ________%
  - [ ] Can edit tax rate
  - [ ] Default Currency field present
  - Current value: ________
  - [ ] Can edit currency

- [ ] **Save button:**
  - [ ] "Save Preferences" button present
  - [ ] Clicking shows success toast

**✅ RESULT:** PASS / FAIL / NOTES: ___________________

---

## 📧 TEST 4: Notifications & Receipts Tab ⭐ NEW

**Navigate to:** Notifications & Receipts tab

### Visual Checks:
- [ ] Tab loads successfully
- [ ] Title shows "Payment Notifications & Receipts"
- [ ] "Receipt Delivery Methods" section visible
- [ ] "Notification Triggers" section visible
- [ ] "Receipt Template & Customization" section visible

### Functional Tests:
- [ ] **Receipt Delivery Methods (3 toggles):**
  - [ ] Email Receipts toggle present & works
  - [ ] SMS Receipts toggle present & works
  - [ ] WhatsApp Receipts toggle present & works
  
- [ ] **Notification Triggers (3 toggles):**
  - [ ] Auto-send on payment success toggle present & works
  - [ ] Notify on payment failure toggle present & works
  - [ ] Notify admin on payments toggle present & works
  
- [ ] **Receipt Template:**
  - [ ] Receipt Template dropdown present
  - [ ] Options visible: Modern, Classic, Minimal, Detailed
  - [ ] Can select different templates
  
- [ ] **Customization (2 toggles):**
  - [ ] Include QR code toggle present & works
  - [ ] Include company logo toggle present & works

- [ ] **Save & Persistence:**
  - [ ] Change Email Receipts to ON
  - [ ] Click "Save Notification Settings"
  - [ ] Success toast appears
  - [ ] **Refresh the page**
  - [ ] Navigate back to Notifications tab
  - [ ] Email Receipts is still ON ✅

**✅ RESULT:** PASS / FAIL / NOTES: ___________________

---

## 🌍 TEST 5: Currency Management Tab ⭐ NEW

**Navigate to:** Currency Management tab

### Visual Checks:
- [ ] Tab loads successfully
- [ ] Title shows "Multi-Currency Management"
- [ ] "Base Currency Settings" section visible
- [ ] "Exchange Rate Management" section visible
- [ ] "Enabled Currencies" section visible

### Functional Tests:
- [ ] **Base Currency:**
  - [ ] Base Currency dropdown present
  - [ ] Options include: TZS, USD, EUR, GBP, KES
  - [ ] Can select different currency
  - [ ] "Show currency symbol" checkbox present & works
  
- [ ] **Exchange Rate Source:**
  - [ ] Dropdown present with 3 options
  - [ ] "Manual Entry" option available
  - [ ] "Auto-update from API" option available
  - [ ] "Bank of Tanzania Rates" option available
  
- [ ] **When Manual Entry selected:**
  - [ ] USD to TZS Rate field appears
  - [ ] EUR to TZS Rate field appears
  - [ ] Can edit rate values
  - [ ] Info message about manual update appears
  
- [ ] **When API selected:**
  - [ ] Update Frequency dropdown appears
  - [ ] Auto-update checkbox appears
  - [ ] "Refresh Rates Now" button appears
  
- [ ] **Enabled Currencies:**
  - [ ] TZS checkbox present
  - [ ] USD checkbox present
  - [ ] EUR checkbox present
  - [ ] GBP checkbox present
  - [ ] KES checkbox present
  - [ ] Can check/uncheck currencies

- [ ] **Save & Persistence:**
  - [ ] Select "Manual Entry"
  - [ ] Change USD to TZS rate to 2400
  - [ ] Click "Save Currency Settings"
  - [ ] Success toast appears
  - [ ] **Refresh the page**
  - [ ] Navigate back to Currency tab
  - [ ] Rate is still 2400 ✅

**✅ RESULT:** PASS / FAIL / NOTES: ___________________

---

## ↩️ TEST 6: Refunds & Disputes Tab ⭐ NEW

**Navigate to:** Refunds & Disputes tab

### Visual Checks:
- [ ] Tab loads successfully
- [ ] Title shows "Refunds & Dispute Management"
- [ ] "Refund Policies" section visible
- [ ] "Dispute & Chargeback Management" section visible

### Functional Tests:
- [ ] **Refund Policies:**
  - [ ] "Enable refunds" toggle present
  - [ ] Click "Enable refunds" ON
  - [ ] Additional options appear:
    - [ ] "Require approval" toggle appears
    - [ ] "Allow partial refunds" toggle appears
    - [ ] "Auto-process refunds" toggle appears
  - [ ] All toggles work correctly
  
- [ ] **Refund Time Limit:**
  - [ ] "Refund window (days)" field appears when enabled
  - Current value: _______ days
  - [ ] Can change value
  - [ ] Description updates with new value
  
- [ ] **Refund Notifications:**
  - [ ] "Notify customer on refund" toggle present & works
  
- [ ] **Dispute Management:**
  - [ ] "Track payment disputes" toggle present
  - [ ] When enabled, yellow info box appears
  - [ ] Info box explains dispute tracking

- [ ] **Save & Persistence:**
  - [ ] Enable refunds
  - [ ] Set time limit to 14 days
  - [ ] Click "Save Refund Settings"
  - [ ] Success toast appears
  - [ ] **Refresh the page**
  - [ ] Navigate back to Refunds tab
  - [ ] Refunds still enabled ✅
  - [ ] Time limit still 14 days ✅

**✅ RESULT:** PASS / FAIL / NOTES: ___________________

---

## 📊 TEST 7: Payment Reports Tab ⭐ NEW

**Navigate to:** Payment Reports tab

### Visual Checks:
- [ ] Tab loads successfully
- [ ] Title shows "Payment Reports & Analytics"
- [ ] "Default Report Settings" section visible
- [ ] "Automated Reports" section visible
- [ ] "Report Content" section visible
- [ ] "Key Metrics to Track" section visible

### Functional Tests:
- [ ] **Default Report Settings:**
  - [ ] Default Report Period dropdown present
  - [ ] Options include: Today, Week, Month, Quarter, Year, Custom
  - [ ] Report Format dropdown present
  - [ ] Options include: PDF, Excel, CSV, JSON
  
- [ ] **Automated Reports:**
  - [ ] "Enable auto-generated reports" toggle present
  - [ ] Click toggle ON
  - [ ] Additional fields appear:
    - [ ] Report Frequency dropdown (Daily, Weekly, Monthly, Quarterly)
    - [ ] "Email reports automatically" toggle
    - [ ] When email enabled, Recipients field appears
  
- [ ] **Report Content:**
  - [ ] "Include charts and graphs" toggle present & works
  - [ ] "Include transaction details" toggle present & works
  
- [ ] **Key Metrics (8 checkboxes):**
  - [ ] Total Revenue checkbox present
  - [ ] Transaction Count checkbox present
  - [ ] Average Transaction Value checkbox present
  - [ ] Success Rate checkbox present
  - [ ] Payment Method Breakdown checkbox present
  - [ ] Refund Rate checkbox present
  - [ ] Peak Transaction Times checkbox present
  - [ ] Customer Payment Trends checkbox present
  - [ ] All checkboxes work
  
- [ ] **Info box:**
  - [ ] Blue info box with message about reports visible

- [ ] **Save & Persistence:**
  - [ ] Enable auto-generated reports
  - [ ] Set frequency to Weekly
  - [ ] Click "Save Report Settings"
  - [ ] Success toast appears
  - [ ] **Refresh the page**
  - [ ] Navigate back to Reports tab
  - [ ] Auto-generate still enabled ✅
  - [ ] Frequency still Weekly ✅

**✅ RESULT:** PASS / FAIL / NOTES: ___________________

---

## 🔗 TEST 8: URL Navigation & Tab Switching

### Functional Tests:
- [ ] **Tab Switching Speed:**
  - [ ] Click each tab in sequence
  - [ ] Tabs switch instantly without delay
  - [ ] No console errors appear
  
- [ ] **URL Parameters:**
  - [ ] Navigate to: `/admin-settings?tab=notifications`
  - [ ] Notifications tab opens automatically ✅
  - [ ] Navigate to: `/admin-settings?tab=currency`
  - [ ] Currency tab opens automatically ✅
  - [ ] Navigate to: `/admin-settings?tab=refunds`
  - [ ] Refunds tab opens automatically ✅
  - [ ] Navigate to: `/admin-settings?tab=reports`
  - [ ] Reports tab opens automatically ✅
  
- [ ] **Browser Navigation:**
  - [ ] Click Notifications tab
  - [ ] Click Currency tab
  - [ ] Press browser Back button
  - [ ] Returns to Notifications tab ✅
  - [ ] Press browser Forward button
  - [ ] Returns to Currency tab ✅

**✅ RESULT:** PASS / FAIL / NOTES: ___________________

---

## 📱 TEST 9: Responsive Design (Optional)

### If testing on mobile/tablet:
- [ ] All tabs are horizontally scrollable
- [ ] Text is readable
- [ ] Buttons are touch-friendly
- [ ] Forms work on mobile
- [ ] No horizontal overflow

**✅ RESULT:** PASS / FAIL / NOTES: ___________________

---

## 📊 FINAL TEST SUMMARY

**Total Tests:** 9  
**Passed:** _____  
**Failed:** _____  
**Notes/Issues:**

_______________________________________________________________
_______________________________________________________________
_______________________________________________________________

---

## ✅ Quick Success Checklist

After completing all tests, verify:
- [ ] All 7 tabs load without errors
- [ ] All new features (Notifications, Currency, Refunds, Reports) are functional
- [ ] Settings persist after page refresh
- [ ] URL navigation works
- [ ] Save buttons show success toasts
- [ ] No console errors throughout testing

---

## 🐛 If You Find Issues

**Common Issues & Solutions:**

1. **Tab doesn't switch:**
   - Check browser console for errors
   - Try refreshing the page
   
2. **Settings don't persist:**
   - Check localStorage in browser DevTools
   - Verify no errors when clicking Save
   
3. **Fields don't appear:**
   - Make sure correct tab is selected
   - Try toggling parent settings ON

---

**Test Completed By:** ___________________  
**Date:** ___________________  
**Browser:** ___________________  
**Overall Result:** ✅ PASS / ❌ FAIL

