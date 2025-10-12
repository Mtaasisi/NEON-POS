import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log('📸 Taking screenshot of Storage Room Management...');
    
    // Navigate to the storage rooms page
    await page.goto('http://localhost:3000/lats/storage-rooms', { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Take screenshot of main page
    await page.screenshot({ 
      path: join(__dirname, 'screenshot-storage-rooms.png'),
      fullPage: true
    });
    console.log('✅ Screenshot saved: screenshot-storage-rooms.png');
    
    // Try to click on first storage room if exists
    const firstRoom = await page.locator('text=/manage.*shelves/i').first();
    if (await firstRoom.count() > 0) {
      await firstRoom.click();
      await page.waitForTimeout(2000);
      
      // Take screenshot of shelf management modal
      await page.screenshot({ 
        path: join(__dirname, 'screenshot-shelf-management.png'),
        fullPage: true
      });
      console.log('✅ Screenshot saved: screenshot-shelf-management.png');
    } else {
      // Try alternative selector
      const shelfButton = await page.locator('[title*="shelf" i], [title*="manage" i]').first();
      if (await shelfButton.count() > 0) {
        await shelfButton.click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: join(__dirname, 'screenshot-shelf-management.png'),
          fullPage: true
        });
        console.log('✅ Screenshot saved: screenshot-shelf-management.png');
      }
    }
    
  } catch (error) {
    console.error('❌ Error taking screenshot:', error.message);
    
    // Try to take screenshot of current state anyway
    try {
      await page.screenshot({ 
        path: join(__dirname, 'screenshot-error-state.png'),
        fullPage: true
      });
      console.log('📸 Screenshot of current state saved: screenshot-error-state.png');
    } catch (e) {
      console.error('Failed to save error screenshot:', e.message);
    }
  } finally {
    await browser.close();
    console.log('🏁 Screenshot process completed');
  }
})();

