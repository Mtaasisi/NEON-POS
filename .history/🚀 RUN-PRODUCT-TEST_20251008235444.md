# 🚀 Quick Start: Run Product Creation Test

## Super Simple - 3 Steps!

### 1️⃣ Install Playwright (first time only)
```bash
npm install --save-dev playwright
npx playwright install chromium
```

**Or use the setup script:**
```bash
./setup-product-test.sh
```

### 2️⃣ Start your dev server
```bash
npm run dev
```

### 3️⃣ Run the test (in a new terminal)
```bash
node auto-test-product-creation.mjs
```

## What You'll See

1. **Browser opens automatically** (you can watch it!)
2. **Test logs appear in terminal** with step-by-step progress
3. **Screenshots saved** to `test-screenshots-product-creation/`
4. **Reports generated** in HTML, Markdown, and JSON formats

## After the Test

### View the Beautiful HTML Report:
```bash
open test-screenshots-product-creation/TEST-REPORT.html
```

### Check Screenshots:
```bash
open test-screenshots-product-creation/
```

## What Gets Tested

✅ **Login** - Auto-login with admin credentials  
✅ **Navigation** - Goes to product creation page  
✅ **Form Fill** - Fills all product fields  
✅ **Image Upload** - Tests image upload UI  
✅ **Submission** - Submits the form  
✅ **Error Detection** - Catches all errors with screenshots  

## Example Output

```
🚀 Initializing product creation test...

🔐 Step 0: Logging in...
  ✅ Logged in successfully
  📸 Screenshot saved: 00-logged-in.png

📄 Step 1: Navigating to product creation page...
  ✅ Successfully loaded product creation page
  📸 Screenshot saved: 01-product-creation-page.png

📝 Step 2: Filling product form...
  📝 Filling product name: Test Headphones 1728393827...
  📝 Selecting category: accessories
  📝 Selecting condition: new
  📝 Setting SKU
  ✅ Auto-generated SKU
  📝 Filling description: Premium wireless...
  📝 Filling price: 299.99
  📝 Filling cost price: 150
  📝 Filling stock quantity: 10
  📝 Filling min stock level: 2
  ✅ Form filled successfully
  📸 Screenshot saved: 03-form-filled.png

📷 Step 3: Uploading product image...
  ✅ Image upload section accessed
  📸 Screenshot saved: 04-file-input-found.png

🚀 Step 4: Submitting form...
  ✅ Submit button clicked
  ✅ Product created successfully!
  📸 Screenshot saved: 07-success.png

============================================================
📊 TEST RESULTS
============================================================

Test: Product Creation Workflow
Time: 10/8/2025, 2:30:45 PM
Status: ✅ PASSED
Screenshots: 8

Steps:
  0. Login: ✅
  1. Navigation: ✅
  2. Form Fill: ✅
  3. Image Upload: ✅
  4. Submission: ✅

📄 JSON Report: test-screenshots-product-creation/test-report.json
📄 Markdown Report: test-screenshots-product-creation/TEST-REPORT.md
📄 HTML Report: test-screenshots-product-creation/TEST-REPORT.html

============================================================
✅ Test completed!
📁 Screenshots: test-screenshots-product-creation/
============================================================
```

## Troubleshooting

### Issue: "Playwright not found"
**Solution:**
```bash
npm install --save-dev playwright
npx playwright install chromium
```

### Issue: "Cannot connect to localhost:3000"
**Solution:** Make sure your dev server is running:
```bash
npm run dev
```

### Issue: Test runs too fast to see
**Solution:** Edit `auto-test-product-creation.mjs` and increase `SLOW_MO`:
```javascript
const SLOW_MO = 1000; // Change from 300 to 1000
```

### Issue: Want to run without seeing the browser
**Solution:** Edit `auto-test-product-creation.mjs`:
```javascript
headless: true, // Change from false to true
```

## Customizing Test Data

Edit the `TEST_PRODUCTS` array in `auto-test-product-creation.mjs`:

```javascript
const TEST_PRODUCTS = [
  {
    name: `My Product ${Date.now()}`,
    category: 'electronics',
    condition: 'new',
    sku: `SKU-${Date.now()}`,
    description: 'Product description here',
    price: 99.99,
    costPrice: 50.00,
    stockQuantity: 20,
    minStockLevel: 5,
    imageUrl: 'https://example.com/image.jpg'
  }
];
```

## Next Steps

1. ✅ Run the test
2. 📸 Check the screenshots
3. 📄 Open the HTML report
4. 🐛 Fix any errors you see
5. 🔄 Run again to verify fixes

---

**Need help?** Check `🧪 PRODUCT-CREATION-TEST-GUIDE.md` for detailed documentation!

