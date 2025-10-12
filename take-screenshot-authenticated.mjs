import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

(async () => {
  const browser = await chromium.launch({ headless: false }); // Non-headless to see what happens
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log('🔐 Logging in...');
    
    // Navigate to login page
    await page.goto('http://localhost:3000/login', { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });
    
    // Wait for login form
    await page.waitForSelector('input[type="email"], input[placeholder*="email" i]', { timeout: 5000 });
    
    // Fill in login credentials (you'll need to provide these)
    await page.fill('input[type="email"], input[placeholder*="email" i]', 'admin@example.com');
    await page.fill('input[type="password"], input[placeholder*="password" i]', 'admin123');
    
    // Click sign in button
    await page.click('button:has-text("Sign In")');
    
    // Wait for navigation after login
    await page.waitForTimeout(3000);
    
    console.log('📸 Navigating to Storage Room Management...');
    
    // Navigate to the storage rooms page
    await page.goto('http://localhost:3000/lats/storage-rooms', { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Take screenshot of main page
    await page.screenshot({ 
      path: join(__dirname, 'screenshot-storage-rooms-authenticated.png'),
      fullPage: true
    });
    console.log('✅ Screenshot saved: screenshot-storage-rooms-authenticated.png');
    
    // Try to click on manage shelves button
    const shelfButton = await page.locator('button:has-text("Manage Shelves"), button:has-text("manage"), [title*="shelf" i]').first();
    if (await shelfButton.count() > 0) {
      console.log('🔘 Clicking Manage Shelves button...');
      await shelfButton.click();
      await page.waitForTimeout(2000);
      
      // Take screenshot of shelf management modal
      await page.screenshot({ 
        path: join(__dirname, 'screenshot-shelf-management-authenticated.png'),
        fullPage: true
      });
      console.log('✅ Screenshot saved: screenshot-shelf-management-authenticated.png');
    } else {
      console.log('⚠️  Could not find Manage Shelves button');
    }
    
    // Keep browser open for 5 seconds to see the result
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Take screenshot of current state
    try {
      await page.screenshot({ 
        path: join(__dirname, 'screenshot-error-state.png'),
        fullPage: true
      });
      console.log('📸 Error state screenshot saved');
    } catch (e) {
      console.error('Failed to save error screenshot:', e.message);
    }
  } finally {
    await browser.close();
    console.log('🏁 Done');
  }
})();

