# Payment Accounts - Automated Testing Guide

## 🎯 Overview

This guide covers **two testing approaches** for the Payment Accounts feature:

1. **Visual Test Guide** - Interactive HTML guide for manual testing
2. **Automated Test Script** - Playwright script for automated browser testing

---

## 📋 Method 1: Visual Test Guide (Manual)

### Already Opened!
The test guide has been opened in your browser automatically.

### Manual Access:
```bash
open test-payment-accounts.html
# Or double-click the file
```

### What it includes:
- ✅ 8 comprehensive test scenarios
- ✅ Step-by-step instructions
- ✅ Expected results for each test
- ✅ Validation error scenarios
- ✅ Quick access to the application
- ✅ Beautiful, easy-to-follow interface

### Test Scenarios Covered:
1. **Create Cash Account (USD)** - Test multi-currency support
2. **Bank Account Validation** - Test required field validation
3. **Complete Bank Account** - Test bank-specific fields
4. **Mobile Money Account** - Test mobile money fields + settings
5. **Credit Card Account** - Test credit card fields
6. **Edit Account** - Test update functionality
7. **Currency Filter** - Test filtering by currency
8. **Validation Edge Cases** - Test all validation scenarios

---

## 🤖 Method 2: Automated Testing (Playwright)

### Prerequisites:

1. **Install Playwright**
```bash
npm install --save-dev playwright
# Or
npm install playwright
```

2. **Application Running**
- Make sure your dev server is running on http://localhost:5173
- You can verify with: `lsof -ti:5173`

3. **Update Credentials** (if needed)
Edit `test-payment-accounts.js` and update:
```javascript
const CONFIG = {
  username: 'admin@example.com',  // Your admin email
  password: 'admin123'             // Your admin password
};
```

### Running the Tests:

#### Option 1: Direct Node Execution
```bash
cd "/Users/mtaasisi/Downloads/POS-main NEON DATABASE"
node test-payment-accounts.js
```

#### Option 2: Add to package.json
Add this to your `package.json` scripts:
```json
{
  "scripts": {
    "test:payments": "node test-payment-accounts.js"
  }
}
```

Then run:
```bash
npm run test:payments
```

### What the Automated Tests Do:

The script will:
1. ✅ Open Chrome browser (visible, not headless)
2. ✅ Login with admin credentials
3. ✅ Navigate to Payment Accounts page
4. ✅ Run 7 automated test scenarios:
   - Create Cash Account (USD)
   - Test Bank Account Validation
   - Create Complete Bank Account
   - Create Mobile Money Account
   - Test Currency Filter
   - Edit an Account
   - View Transaction History
5. ✅ Show results summary
6. ✅ Keep browser open for 30 seconds for inspection

### Example Output:
```
🚀 Starting Payment Accounts Automated Tests

==================================================
📝 Attempting to login...
✅ Login successful
📝 Navigating to Payment Accounts...
✅ Successfully navigated to Payment Accounts

==================================================
Running Test Suite...

🧪 TEST 1: Create Cash Account (USD)
✅ ✓ Cash account created successfully

🧪 TEST 2: Bank Account Validation
✅ ✓ Validation working - error shown for missing bank name

🧪 TEST 3: Create Bank Account (Complete)
✅ ✓ Bank account created successfully

🧪 TEST 4: Create Mobile Money Account
✅ ✓ Mobile money account created successfully

🧪 TEST 5: Currency Filter
✅ ✓ Currency filter working - shows only USD accounts

🧪 TEST 6: Edit Account
✅ ✓ Account edited successfully

🧪 TEST 7: View Transaction History
✅ ✓ History modal opened successfully

==================================================
📊 Test Results Summary

Total Tests: 7
✅ Passed: 7
❌ Failed: 0
Success Rate: 100.0%
==================================================
```

---

## 🎬 Quick Start (Recommended Approach)

### For First-Time Testing:

1. **Start with Visual Guide** (already open in browser)
   - Familiarize yourself with test scenarios
   - Understand what each test should do
   - Try 1-2 tests manually

2. **Run Automated Tests**
   ```bash
   cd "/Users/mtaasisi/Downloads/POS-main NEON DATABASE"
   node test-payment-accounts.js
   ```

3. **Watch the Magic** ✨
   - Sit back and watch the browser automatically test everything
   - All 7 tests will run in sequence
   - Results printed at the end

---

## 📝 Test Checklist

Use this checklist to verify all features:

### ✅ Form Features
- [ ] Currency dropdown shows 6 currencies (TZS, USD, EUR, GBP, KES, UGX)
- [ ] Account type dropdown shows all 6 types
- [ ] Required fields marked with red asterisk (*)
- [ ] Conditional fields show based on account type:
  - [ ] Bank: Bank name + account number
  - [ ] Mobile Money: Provider + phone number
  - [ ] Credit Card: Issuer + last 4 digits

### ✅ Validation
- [ ] Can't save with empty account name
- [ ] Can't save bank account without bank name
- [ ] Can't save mobile money without provider and phone
- [ ] Error messages are clear and specific

### ✅ Settings Checkboxes
- [ ] Active Account checkbox works
- [ ] Payment Method checkbox works
- [ ] Require Reference Number checkbox works
- [ ] Require Account Number checkbox works
- [ ] All settings save properly

### ✅ Currency Display
- [ ] Account cards show correct currency
- [ ] Total balance respects currency filter
- [ ] Transaction amounts show correct currency
- [ ] History modal shows correct currency

### ✅ Filtering
- [ ] Currency filter works
- [ ] Shows only selected currency accounts
- [ ] Totals update per currency
- [ ] "All Currencies" shows everything

### ✅ CRUD Operations
- [ ] Can create new accounts
- [ ] Can edit existing accounts
- [ ] Can delete accounts (with confirmation)
- [ ] Changes reflect immediately

### ✅ UI/UX
- [ ] Modal opens/closes smoothly
- [ ] Form is well-organized
- [ ] Help text is helpful
- [ ] Loading states work
- [ ] Success/error toasts appear

---

## 🐛 Troubleshooting

### Issue: "Application not running"
```bash
# Check if server is running
lsof -ti:5173

# If not, start it
npm run dev
```

### Issue: "Playwright not found"
```bash
# Install Playwright
npm install --save-dev playwright

# Or globally
npm install -g playwright
```

### Issue: "Login failed"
- Update credentials in `test-payment-accounts.js`
- Check your admin user exists in database
- Verify credentials are correct

### Issue: "Tests failing"
- Run tests with slowMo increased: Change `slowMo: 500` to `slowMo: 1000`
- Check browser console for errors
- Try running manually first to understand flow

### Issue: "Elements not found"
- The app UI might have changed
- Update selectors in test script
- Use browser DevTools to find correct selectors

---

## 📚 Additional Resources

### Test Files Created:
1. **test-payment-accounts.html** - Visual test guide
2. **test-payment-accounts.js** - Automated Playwright script
3. **PAYMENT_ACCOUNTS_FORM_FIXES.md** - Detailed fix documentation
4. **PAYMENT_ACCOUNTS_BEFORE_AFTER.md** - Before/after comparison
5. **PAYMENT_ACCOUNTS_QUICK_REFERENCE.md** - Developer reference

### Related Documentation:
- Component: `src/features/payments/components/PaymentAccountManagement.tsx`
- Page: `src/features/payments/pages/EnhancedPaymentManagementPage.tsx`
- Route: `/payments` (tab: "Payment Accounts")

---

## 🎯 Expected Test Results

### All Tests Should PASS ✅

If any test fails:
1. Check the error message in console
2. Verify the application is running
3. Check if UI elements exist
4. Review browser console for errors
5. Try running that specific test manually

### Common Pass Criteria:
- ✅ Accounts created successfully appear in list
- ✅ Validation errors show appropriate messages
- ✅ Currency displays correctly everywhere
- ✅ Edit updates reflect immediately
- ✅ Filters work as expected
- ✅ No console errors

---

## 🚀 Next Steps

After successful testing:

1. **Delete test accounts** created during testing
2. **Document any issues** found
3. **Verify in production** (if applicable)
4. **Share results** with team
5. **Update test suite** if UI changes

---

## 📞 Support

If you encounter issues:

1. Check this documentation first
2. Review the visual test guide
3. Check browser console for errors
4. Verify all prerequisites are met
5. Try running tests manually first

---

## ✨ Pro Tips

1. **Run tests after any changes** to Payment Accounts component
2. **Watch the automated tests** the first time to understand flow
3. **Use Visual Guide** for training new team members
4. **Keep test data clean** - delete test accounts after testing
5. **Update credentials** in test script before running

---

**Happy Testing! 🎉**

All tests should pass with the fixes implemented. If you find any issues, they're likely environment-specific or credential-related.

