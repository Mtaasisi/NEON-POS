# 🧪 Device Creation Auto-Test Guide

## What This Does

This automated test script will:
- ✅ Navigate to your device creation page
- ✅ Fill out the device form automatically
- ✅ Submit the form
- ✅ **Take screenshots at EVERY step**
- ✅ **Auto-capture screenshots when ANY error occurs**
- ✅ Generate detailed test reports

## Quick Start

### 1. Make sure your app is running
```bash
npm run dev
```

### 2. Run the test
```bash
node auto-test-device-creation.mjs
```

## What You'll Get

### Screenshots 📸
The test creates a `test-screenshots-device-creation/` folder with:
- **01-device-creation-page.png** - Initial page load
- **02-form-ready.png** - Form ready to fill
- **03-form-filled.png** - After filling all fields
- **04-customer-selected.png** - Customer selection
- **05-before-submit.png** - Right before clicking submit
- **06-after-submit.png** - Immediately after submit
- **07-success.png** or **07-error-response.png** - Final result

**PLUS**: Automatic screenshots on any error:
- `console-error-*.png` - When browser console shows errors
- `page-error-*.png` - When JavaScript errors occur
- `request-failed-*.png` - When network requests fail
- `error-*.png` - When any step fails

### Reports 📄
- **TEST-REPORT.md** - Human-readable markdown report
- **test-report.json** - Detailed JSON data for debugging

## Customize Test Data

Edit the `TEST_DEVICE_DATA` object in the script:

```javascript
const TEST_DEVICE_DATA = {
  brand: 'Apple',              // Change this
  model: 'iPhone 15 Pro',      // Change this
  serialNumber: `TEST-${Date.now()}`,
  issueDescription: 'Screen cracked, needs replacement.',
  unlockCode: '1234',
  customerName: null  // Set to 'John Doe' to test with a specific customer
};
```

## Browser Visibility

By default, the test runs in **visible mode** (headless: false) so you can watch what happens.

To run it invisibly (faster):
```javascript
// In the script, change:
headless: false,  // to
headless: true,
```

## Troubleshooting

### Test runs but no screenshots?
- Check the `test-screenshots-device-creation/` folder
- Screenshots are saved even if the test fails

### Form fields not filling?
- The script looks for common field names and placeholders
- Check the screenshots to see which step failed
- You might need to adjust the field selectors

### Want to test with a real customer?
```javascript
customerName: 'Test Customer'  // Use an actual customer name from your DB
```

## Exit Codes

- **0** = Test passed ✅
- **1** = Test failed ❌

Perfect for CI/CD pipelines!

## Example Output

```
🚀 Initializing device creation test...

📄 Step 1: Navigating to device creation page...
  📸 Screenshot saved: 01-device-creation-page.png
  ✅ Successfully loaded device creation page

📝 Step 2: Filling device form...
  📝 Filling brand: Apple
  📝 Filling model: iPhone 15 Pro
  📝 Filling serial number: TEST-1696123456789
  📝 Filling issue description: Screen cracked...
  📸 Screenshot saved: 03-form-filled.png
  ✅ Form filled successfully

👤 Step 3: Selecting customer...
  📸 Screenshot saved: 04-customer-selected.png

🚀 Step 4: Submitting form...
  📸 Screenshot saved: 05-before-submit.png
  ✅ Submit button clicked
  📸 Screenshot saved: 06-after-submit.png
  ✅ Device created successfully!
  📸 Screenshot saved: 07-success.png

============================================================
📊 TEST RESULTS
============================================================

Test: Device Creation Workflow
Status: ✅ PASSED
Screenshots: 7

Steps:
  1. Navigation: ✅
  2. Form Fill: ✅
  3. Customer Selection: ✅
  4. Submission: ✅

📄 Report saved: test-screenshots-device-creation/test-report.json
📄 Markdown report: test-screenshots-device-creation/TEST-REPORT.md

============================================================
✅ Test completed!
📁 Screenshots: test-screenshots-device-creation/
📄 Reports: TEST-REPORT.md & test-report.json
============================================================
```

## Advanced Features

### Automatic Error Detection
The test listens for:
- Console errors (red text in browser console)
- JavaScript page errors
- Failed network requests (400, 500 errors)
- Form validation errors

Every time an error is detected, a screenshot is **automatically** captured!

### Slow Motion Mode
The test runs with a 500ms delay between actions so you can see what's happening. Adjust in the script:
```javascript
slowMo: 500,  // milliseconds
```

### Wait Times
If your app is slow to load, increase wait times:
```javascript
const WAIT_TIME = 2000; // Change to 3000 or 5000
```

---

**Pro Tip**: Run this test every time you make changes to the device creation form to catch bugs early! 🚀

