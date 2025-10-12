# 🧪 Product Creation Auto-Test Guide

## What This Does

This automated test script creates products in your POS system and takes **screenshots at every step** so you can easily see what's happening and spot any errors visually! 📸

## Features

✅ **Automatic Screenshots** - Captures images at each step  
✅ **Error Detection** - Screenshots errors automatically  
✅ **Image Upload Support** - Tests product image upload  
✅ **Visual HTML Report** - Beautiful report you can open in browser  
✅ **Console Error Tracking** - Catches all JavaScript errors  
✅ **Network Monitoring** - Detects 400/500 errors  

## Quick Start

### 1. Make sure your dev server is running:
```bash
npm run dev
```

### 2. In a new terminal, run the test:
```bash
node auto-test-product-creation.mjs
```

### 3. Watch it work!
The test will:
- ✅ Open a browser window (you can see it!)
- ✅ Login automatically
- ✅ Navigate to product creation page
- ✅ Fill in all the product details
- ✅ Upload an image
- ✅ Submit the form
- 📸 Take screenshots at every step

## What You'll Get

After the test runs, you'll find in `test-screenshots-product-creation/`:

1. **TEST-REPORT.html** 🎨
   - Beautiful visual report
   - Open in your browser
   - Shows all steps with icons
   - Lists all errors clearly

2. **TEST-REPORT.md** 📝
   - Markdown format
   - Great for documentation
   - Contains all test details

3. **test-report.json** 📊
   - Machine-readable format
   - Contains raw test data

4. **Screenshots** 📸
   - Numbered screenshots (01-, 02-, 03-, etc.)
   - Screenshots of errors (error-, warning-)
   - Full page captures

## Screenshot Examples

You'll see screenshots like:
- `01-product-creation-page.png` - The form loaded
- `02-form-ready.png` - Ready to fill
- `03-form-filled.png` - All fields filled
- `04-file-input-found.png` - Image upload section
- `05-before-submit.png` - Just before clicking submit
- `06-after-submit.png` - Right after submit
- `07-success.png` - Success message!

**If errors occur:**
- `console-error.png` - JavaScript errors
- `http-400-error.png` - API errors
- `error-submit.png` - Submission errors

## Customizing Test Data

Edit the `TEST_PRODUCTS` array in the script to test different products:

```javascript
const TEST_PRODUCTS = [
  {
    name: `My Custom Product ${Date.now()}`,
    category: 'electronics',  // or 'accessories', etc.
    condition: 'new',         // or 'used', 'refurbished'
    sku: `CUSTOM-${Date.now()}`,
    description: 'My product description',
    price: 499.99,
    costPrice: 250.00,
    stockQuantity: 25,
    minStockLevel: 5,
    imageUrl: 'https://your-image-url.com/image.jpg'
  }
];
```

## Troubleshooting

### "Browser not found" error?
Run this to install Playwright browsers:
```bash
npx playwright install chromium
```

### Test runs too fast?
Increase the `SLOW_MO` value at the top of the script:
```javascript
const SLOW_MO = 1000; // 1 second delay between actions
```

### Want to run headless (no browser window)?
Change this line in the script:
```javascript
headless: true, // Was: headless: false
```

### Form fields not filling correctly?
The script tries to find fields by name and placeholder. Check the screenshots to see which step failed, then adjust the selectors in the script.

## Advanced Features

### Login Credentials
By default, it uses:
- Username: `admin`
- Password: `admin123`

To change, edit the `login()` call in the script:
```javascript
await this.login('youruser', 'yourpass');
```

### Multiple Products
Want to test creating multiple products in a row? Add more to the array:
```javascript
const TEST_PRODUCTS = [
  { name: 'Product 1', ... },
  { name: 'Product 2', ... },
  { name: 'Product 3', ... }
];
```

Then modify the main function to loop through them.

### Image Upload
The script detects image upload inputs. For actual file uploads, you'd need to provide local file paths. The current version focuses on form validation and UI testing.

## Understanding the Reports

### HTML Report (Open in Browser)
```bash
open test-screenshots-product-creation/TEST-REPORT.html
```

Shows:
- ✅ Green badges for successful steps
- ❌ Red badges for failed steps
- ⚠️ Yellow for warnings
- Full error details
- Test metadata

### Console Output
Watch the terminal for real-time progress:
```
🚀 Initializing product creation test...
🔐 Step 0: Logging in...
  ✅ Logged in successfully
  📸 Screenshot saved: 00-logged-in.png
📄 Step 1: Navigating to product creation page...
  ✅ Successfully loaded product creation page
  📸 Screenshot saved: 01-product-creation-page.png
...
```

## Tips for Debugging

1. **Check screenshots in order** - They're numbered, so follow the sequence
2. **Look for red error screenshots** - These show exactly what went wrong
3. **Check the HTML report** - It's the easiest way to see everything
4. **Console errors section** - Shows JavaScript errors from the page
5. **Network errors** - Shows failed API calls

## What It Tests

✅ Login flow  
✅ Navigation to product page  
✅ Form field population  
✅ Category selection  
✅ Condition selection  
✅ SKU generation  
✅ Price inputs  
✅ Stock quantity  
✅ Image upload UI  
✅ Form submission  
✅ Error handling  
✅ Success detection  

## Next Steps

After running the test:

1. **Open the HTML report** - Get a beautiful overview
2. **Check screenshots** - See exactly what happened
3. **Fix any errors** - Screenshots make it easy to spot issues
4. **Run again** - Test that your fixes work

## Example Output

```
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

Result: Product created successfully

📄 JSON Report: test-screenshots-product-creation/test-report.json
📄 Markdown Report: test-screenshots-product-creation/TEST-REPORT.md
📄 HTML Report: test-screenshots-product-creation/TEST-REPORT.html
   Open in browser: file:///path/to/TEST-REPORT.html

============================================================
✅ Test completed!
📁 Screenshots: test-screenshots-product-creation/
📄 Reports:
   - TEST-REPORT.md
   - TEST-REPORT.html (open in browser for visual report)
   - test-report.json
============================================================
```

---

**Happy Testing! 🚀**

Any errors? The screenshots will show you exactly what went wrong!

