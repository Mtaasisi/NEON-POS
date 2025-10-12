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
    console.log('📸 Taking screenshot of UI demo...');
    
    await page.goto('http://localhost:3000/demo-shelf-ui.html', { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });
    
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: join(__dirname, 'screenshot-ui-demo.png'),
      fullPage: true
    });
    
    console.log('✅ Screenshot saved: screenshot-ui-demo.png');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
    console.log('🏁 Done');
  }
})();

