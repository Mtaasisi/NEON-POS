#!/usr/bin/env node

/**
 * ============================================================================
 * AUTOMATED PRODUCT THUMBNAIL DIAGNOSTIC TOOL
 * ============================================================================
 * This script automatically diagnoses why product thumbnails are not showing
 * by checking:
 * 1. Taking screenshots of the product list
 * 2. Analyzing the frontend code
 * 3. Checking console errors
 * 4. Analyzing image loading
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DIAGNOSTIC_REPORT = {
  timestamp: new Date().toISOString(),
  issues: [],
  fixes: [],
  screenshots: [],
  databaseAnalysis: {},
  recommendations: []
};

console.log('🔍 AUTOMATED PRODUCT THUMBNAIL DIAGNOSTIC');
console.log('==========================================\n');

// 1. Take screenshots of product pages
async function takeProductScreenshots() {
  console.log('\n📸 Step 1: Taking screenshots of product pages...');
  
  let browser;
  try {
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        DIAGNOSTIC_REPORT.issues.push({
          severity: 'MEDIUM',
          issue: 'Browser console error',
          error: msg.text()
        });
      }
    });
    
    // Login first - try multiple credential combinations
    console.log('   Logging in...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 30000 });
    
    const credentials = [
      { email: 'admin@pos.com', password: 'admin123' },
      { email: 'admin@pos.com', password: 'Admin@2024' },
      { email: 'care@care.com', password: '123456' },
      { email: 'admin@admin.com', password: 'admin123' }
    ];
    
    let loginSuccessful = false;
    for (const cred of credentials) {
      try {
        console.log(`   Trying login with ${cred.email}...`);
        await page.fill('input[type="email"]', cred.email);
        await page.fill('input[type="password"]', cred.password);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
        
        // Check if login was successful by checking URL
        const currentUrl = page.url();
        if (!currentUrl.includes('/login')) {
          console.log(`   ✅ Login successful with ${cred.email}`);
          loginSuccessful = true;
          break;
        } else {
          console.log(`   ❌ Login failed with ${cred.email}, trying next...`);
          // Clear fields for next attempt
          await page.fill('input[type="email"]', '');
          await page.fill('input[type="password"]', '');
        }
      } catch (e) {
        console.log(`   Error with ${cred.email}: ${e.message}`);
      }
    }
    
    if (!loginSuccessful) {
      throw new Error('All login attempts failed');
    }
    
    await page.waitForTimeout(1000);
    
    // Navigate to inventory page
    console.log('   Navigating to inventory page...');
    await page.goto('http://localhost:3000/inventory', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Take screenshot
    const screenshotPath = join(__dirname, 'thumbnail-diagnostic-screenshots', `inventory-page-${Date.now()}.png`);
    await fs.mkdir(join(__dirname, 'thumbnail-diagnostic-screenshots'), { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`   ✅ Screenshot saved: ${screenshotPath}`);
    DIAGNOSTIC_REPORT.screenshots.push(screenshotPath);
    
    // Check for image elements
    const imageElements = await page.$$eval('img', imgs => 
      imgs.map(img => ({
        src: img.src,
        alt: img.alt,
        width: img.width,
        height: img.height,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        complete: img.complete
      }))
    );
    
    const brokenImages = imageElements.filter(img => img.complete && img.naturalWidth === 0);
    const workingImages = imageElements.filter(img => img.complete && img.naturalWidth > 0);
    
    console.log(`   Total images on page: ${imageElements.length}`);
    console.log(`   Working images: ${workingImages.length}`);
    console.log(`   Broken images: ${brokenImages.length}`);
    
    DIAGNOSTIC_REPORT.databaseAnalysis.pageImages = {
      total: imageElements.length,
      working: workingImages.length,
      broken: brokenImages.length
    };
    
    if (brokenImages.length > 0) {
      DIAGNOSTIC_REPORT.issues.push({
        severity: 'HIGH',
        issue: 'Broken images detected on inventory page',
        count: brokenImages.length,
        samples: brokenImages.slice(0, 3)
      });
    }
    
    // Check network requests for images
    const imageRequests = [];
    page.on('response', response => {
      const url = response.url();
      if (url.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
        imageRequests.push({
          url,
          status: response.status()
        });
      }
    });
    
    await page.waitForTimeout(2000);
    
    const failedImageRequests = imageRequests.filter(req => req.status !== 200);
    if (failedImageRequests.length > 0) {
      DIAGNOSTIC_REPORT.issues.push({
        severity: 'HIGH',
        issue: 'Failed image requests',
        count: failedImageRequests.length,
        samples: failedImageRequests.slice(0, 3)
      });
    }
    
    await browser.close();
    
  } catch (error) {
    console.log('❌ Screenshot error:', error.message);
    DIAGNOSTIC_REPORT.issues.push({
      severity: 'MEDIUM',
      issue: 'Failed to take screenshots',
      error: error.message
    });
    
    if (browser) {
      await browser.close();
    }
  }
}

// 2. Analyze frontend image service usage
async function analyzeFrontendCode() {
  console.log('\n📝 Step 2: Analyzing frontend code...');
  
  try {
    // Check which image service is being used
    const productCardPath = join(__dirname, 'src/features/lats/components/inventory/ProductCard.tsx');
    const productCardContent = await fs.readFile(productCardPath, 'utf-8');
    
    const imageServiceImports = [];
    if (productCardContent.includes('UnifiedImageService')) imageServiceImports.push('UnifiedImageService');
    if (productCardContent.includes('RobustImageService')) imageServiceImports.push('RobustImageService');
    if (productCardContent.includes('EnhancedImageUploadService')) imageServiceImports.push('EnhancedImageUploadService');
    if (productCardContent.includes('LocalProductImageStorageService')) imageServiceImports.push('LocalProductImageStorageService');
    
    console.log(`   Image services used in ProductCard: ${imageServiceImports.join(', ') || 'None detected'}`);
    DIAGNOSTIC_REPORT.databaseAnalysis.imageServicesUsed = imageServiceImports;
    
    // Check if ProductImageDisplay is used
    const usesProductImageDisplay = productCardContent.includes('ProductImageDisplay');
    const usesSimpleImageDisplay = productCardContent.includes('SimpleImageDisplay');
    
    console.log(`   Uses ProductImageDisplay: ${usesProductImageDisplay}`);
    console.log(`   Uses SimpleImageDisplay: ${usesSimpleImageDisplay}`);
    
    DIAGNOSTIC_REPORT.databaseAnalysis.displayComponents = {
      ProductImageDisplay: usesProductImageDisplay,
      SimpleImageDisplay: usesSimpleImageDisplay
    };
    
  } catch (error) {
    console.log('⚠️  Could not analyze frontend code:', error.message);
  }
}

// 3. Generate recommendations
function generateRecommendations() {
  console.log('\n💡 Step 3: Generating recommendations...');
  
  const recommendations = [];
  
  // Check if frontend is using correct service
  if (!DIAGNOSTIC_REPORT.databaseAnalysis.imageServicesUsed?.includes('UnifiedImageService') &&
      !DIAGNOSTIC_REPORT.databaseAnalysis.imageServicesUsed?.includes('RobustImageService')) {
    recommendations.push({
      priority: 'MEDIUM',
      action: 'Update frontend to use UnifiedImageService or RobustImageService',
      details: 'These services properly handle product_images table queries'
    });
  }
  
  // Check for broken images on page
  if (DIAGNOSTIC_REPORT.databaseAnalysis.pageImages?.broken > 0) {
    recommendations.push({
      priority: 'HIGH',
      action: 'Fix broken image URLs',
      details: `${DIAGNOSTIC_REPORT.databaseAnalysis.pageImages.broken} broken images detected on inventory page`
    });
  }
  
  // General recommendations based on findings
  if (DIAGNOSTIC_REPORT.issues.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      action: 'Review console errors and fix image loading issues',
      details: `Found ${DIAGNOSTIC_REPORT.issues.length} issues during diagnostics`
    });
  }
  
  DIAGNOSTIC_REPORT.recommendations = recommendations;
  
  recommendations.forEach((rec, idx) => {
    console.log(`   ${idx + 1}. [${rec.priority}] ${rec.action}`);
    if (rec.details) console.log(`      ${rec.details}`);
    if (rec.command) console.log(`      Command: ${rec.command}`);
  });
}

// 4. Save diagnostic report
async function saveDiagnosticReport() {
  console.log('\n💾 Step 4: Saving diagnostic report...');
  
  const reportPath = join(__dirname, 'PRODUCT-THUMBNAIL-DIAGNOSTIC-REPORT.json');
  await fs.writeFile(reportPath, JSON.stringify(DIAGNOSTIC_REPORT, null, 2));
  console.log(`   ✅ Report saved: ${reportPath}`);
  
  // Also create a markdown summary
  const mdReport = `# Product Thumbnail Diagnostic Report
Generated: ${DIAGNOSTIC_REPORT.timestamp}

## Issues Found (${DIAGNOSTIC_REPORT.issues.length})

${DIAGNOSTIC_REPORT.issues.map((issue, idx) => `
### ${idx + 1}. [${issue.severity}] ${issue.issue}
${issue.details ? `**Details:** ${issue.details}\n` : ''}
${issue.solution ? `**Solution:** ${issue.solution}\n` : ''}
${issue.error ? `**Error:** ${issue.error}\n` : ''}
`).join('\n')}

## Page Analysis

${DIAGNOSTIC_REPORT.databaseAnalysis.pageImages ? `
- **Total Images on Page:** ${DIAGNOSTIC_REPORT.databaseAnalysis.pageImages.total}
- **Working Images:** ${DIAGNOSTIC_REPORT.databaseAnalysis.pageImages.working}
- **Broken Images:** ${DIAGNOSTIC_REPORT.databaseAnalysis.pageImages.broken}
` : 'No page analysis available'}

## Frontend Code Analysis

**Image Services Used:** ${DIAGNOSTIC_REPORT.databaseAnalysis.imageServicesUsed?.join(', ') || 'None detected'}

**Display Components:**
${DIAGNOSTIC_REPORT.databaseAnalysis.displayComponents ? Object.entries(DIAGNOSTIC_REPORT.databaseAnalysis.displayComponents).map(([key, val]) => `- ${key}: ${val}`).join('\n') : 'None detected'}

## Recommendations (${DIAGNOSTIC_REPORT.recommendations.length})

${DIAGNOSTIC_REPORT.recommendations.map((rec, idx) => `
### ${idx + 1}. [${rec.priority}] ${rec.action}
${rec.details ? `${rec.details}\n` : ''}
${rec.command ? `\`\`\`bash\n${rec.command}\n\`\`\`\n` : ''}
`).join('\n')}

## Screenshots

${DIAGNOSTIC_REPORT.screenshots.map(path => `- ${path}`).join('\n')}

## Next Steps

1. Review the issues found above
2. Apply recommended fixes in priority order
3. Run this diagnostic again to verify fixes
4. Check the screenshots to visually confirm the issue

---
*Report generated automatically by auto-diagnose-product-thumbnails.mjs*
`;
  
  const mdReportPath = join(__dirname, 'PRODUCT-THUMBNAIL-DIAGNOSTIC-REPORT.md');
  await fs.writeFile(mdReportPath, mdReport);
  console.log(`   ✅ Markdown report saved: ${mdReportPath}`);
}

// Main execution
async function main() {
  await takeProductScreenshots();
  await analyzeFrontendCode();
  generateRecommendations();
  await saveDiagnosticReport();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ DIAGNOSTIC COMPLETE!');
  console.log('='.repeat(50));
  console.log(`\nFound ${DIAGNOSTIC_REPORT.issues.length} issues`);
  console.log(`Generated ${DIAGNOSTIC_REPORT.recommendations.length} recommendations`);
  console.log(`Captured ${DIAGNOSTIC_REPORT.screenshots.length} screenshots`);
  console.log('\nCheck PRODUCT-THUMBNAIL-DIAGNOSTIC-REPORT.md for full details\n');
}

main().catch(console.error);

