# 🚀 Device Creation Auto-Test - Quick Start

## Super Simple - Just Run This! 

```bash
./setup-and-test-device.sh
```

That's it! The script will:
1. ✅ Install Playwright (if needed)
2. ✅ Install browser binaries (if needed)
3. ✅ Run the complete device creation test
4. ✅ Take screenshots at every step
5. ✅ Auto-capture screenshots when errors occur

## Before Running

**Make sure your app is running:**
```bash
npm run dev
```

Keep it running in another terminal tab.

## What Happens During Test

You'll see a browser window open and watch it:
- Navigate to `/devices/new`
- Fill in the form (Brand, Model, Serial, etc.)
- Submit the device
- Screenshot everything!

## Results

Check the **`test-screenshots-device-creation/`** folder:

### Regular Screenshots
- `01-device-creation-page.png` - Page loaded
- `02-form-ready.png` - Form is ready
- `03-form-filled.png` - All fields filled
- `04-customer-selected.png` - Customer picked
- `05-before-submit.png` - About to submit
- `06-after-submit.png` - Right after submit
- `07-success.png` - Success! ✅

### Error Screenshots (if problems occur)
- `console-error-*.png` - Console errors
- `page-error-*.png` - JavaScript errors
- `request-failed-*.png` - Network failures
- `error-*.png` - Any other errors

### Reports
- **TEST-REPORT.md** - Easy to read summary
- **test-report.json** - Full details

## Customize Test

Edit `auto-test-device-creation.mjs` and change:

```javascript
const TEST_DEVICE_DATA = {
  brand: 'Samsung',           // Your brand
  model: 'Galaxy S24',        // Your model
  serialNumber: `TEST-${Date.now()}`,
  issueDescription: 'Battery not charging',
  unlockCode: '1234',
  customerName: 'John Doe'    // Or null to skip
};
```

## Just Want to Install Dependencies?

```bash
npm install --save-dev playwright
npx playwright install chromium
```

Then run manually:
```bash
node auto-test-device-creation.mjs
```

## Troubleshooting

### "Cannot find module 'playwright'"
Run the setup script first:
```bash
./setup-and-test-device.sh
```

### Test fails but you don't see why
Check the screenshots! Every error creates a screenshot showing exactly what went wrong.

### Want to run headless (no browser window)?
Edit `auto-test-device-creation.mjs`:
```javascript
headless: false,  // Change to true
```

---

**That's it!** The test automatically captures screenshots whenever something goes wrong, so debugging is super easy! 🎉

