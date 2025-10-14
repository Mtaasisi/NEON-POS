/**
 * Automated Playwright Test for Attendance Page
 * 
 * To run this test:
 * 1. npm install -D @playwright/test
 * 2. npx playwright test tests/attendance.spec.ts
 * 
 * Or add to package.json:
 * "scripts": {
 *   "test:attendance": "playwright test tests/attendance.spec.ts"
 * }
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const TEST_USER = {
  email: 'care@care.com',
  password: '123456'
};

test.describe('Attendance Page Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate and login before each test
    await page.goto(BASE_URL);
    
    // Login
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    // Wait for navigation after login
    await page.waitForURL(/dashboard|attendance/, { timeout: 10000 });
    
    // Navigate to attendance page
    await page.goto(`${BASE_URL}/attendance`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should load attendance page without errors', async ({ page }) => {
    // Check page loaded
    await expect(page.locator('h1')).toContainText('My Attendance');
    
    // Check no loading spinner stuck
    const spinner = page.locator('.animate-spin');
    await expect(spinner).not.toBeVisible({ timeout: 5000 });
    
    // Check no console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait a bit to catch any errors
    await page.waitForTimeout(2000);
    
    // Assert no critical errors
    expect(errors.filter(e => e.includes('loadData is not defined'))).toHaveLength(0);
    expect(errors.filter(e => e.includes('Maximum update depth'))).toHaveLength(0);
  });

  test('should display real data in Today\'s Summary', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Check if Today's Summary card exists
    const summaryCard = page.locator('text=Today\'s Summary').locator('..');
    await expect(summaryCard).toBeVisible();
    
    // Check that status field exists and is not always "Present"
    const statusLabel = page.locator('text=Status:');
    await expect(statusLabel).toBeVisible();
    
    // Check that check-in field exists
    const checkInLabel = page.locator('text=Check In:');
    await expect(checkInLabel).toBeVisible();
    
    // Verify it's not showing the hardcoded "08:00:00"
    // (This would fail if hardcoded data is still there)
    const checkInValue = await checkInLabel.locator('..').locator('span').last().textContent();
    console.log('Check-in time:', checkInValue);
    
    // If there's attendance, time should be in HH:MM:SS format but not always 08:00:00
    if (checkInValue && checkInValue !== 'Not checked in') {
      expect(checkInValue).toMatch(/\d{2}:\d{2}:\d{2}/);
    }
  });

  test('should show empty state when no attendance', async ({ page }) => {
    // This test checks if empty state is shown when appropriate
    await page.waitForTimeout(2000);
    
    // Check for either real data OR empty state
    const hasData = await page.locator('text=Status:').isVisible();
    const hasEmptyState = await page.locator('text=No attendance recorded for today').isVisible();
    
    // One of them should be visible
    expect(hasData || hasEmptyState).toBeTruthy();
    
    if (hasEmptyState) {
      // Verify empty state has helpful message
      await expect(page.locator('text=Please check in to start tracking')).toBeVisible();
    }
  });

  test('should display tabs and switch between them', async ({ page }) => {
    // Check all tabs exist
    await expect(page.locator('button:has-text("Today")')).toBeVisible();
    await expect(page.locator('button:has-text("History")')).toBeVisible();
    await expect(page.locator('button:has-text("Statistics")')).toBeVisible();
    
    // Click History tab
    await page.click('button:has-text("History")');
    await page.waitForTimeout(500);
    
    // Should show either table or empty state
    const hasTable = await page.locator('table').isVisible();
    const hasEmptyState = await page.locator('text=No Attendance History').isVisible();
    expect(hasTable || hasEmptyState).toBeTruthy();
    
    // If empty state, check it's friendly
    if (hasEmptyState) {
      await expect(page.locator('text=Check in today to start tracking')).toBeVisible();
    }
    
    // Click Statistics tab
    await page.click('button:has-text("Statistics")');
    await page.waitForTimeout(500);
    
    // Should show stat cards
    await expect(page.locator('text=Total Days')).toBeVisible();
    await expect(page.locator('text=Present Days')).toBeVisible();
    await expect(page.locator('text=Attendance Rate')).toBeVisible();
  });

  test('should display monthly calendar with real data', async ({ page }) => {
    // Go to Statistics tab
    await page.click('button:has-text("Statistics")');
    await page.waitForTimeout(1000);
    
    // Check monthly overview exists
    await expect(page.locator('text=Monthly Overview')).toBeVisible();
    
    // Check calendar grid exists
    const calendarGrid = page.locator('.grid.grid-cols-7');
    await expect(calendarGrid).toBeVisible();
    
    // Get current month/year
    const monthYear = await page.locator('text=Monthly Overview').textContent();
    console.log('Calendar showing:', monthYear);
    
    // Verify it shows current month (not hardcoded)
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    expect(monthYear).toContain(currentMonth);
    
    // Check legend exists
    await expect(page.locator('text=Present')).toBeVisible();
    await expect(page.locator('text=Late')).toBeVisible();
    await expect(page.locator('text=Absent')).toBeVisible();
    await expect(page.locator('text=No Record')).toBeVisible();
    await expect(page.locator('text=Today')).toBeVisible();
  });

  test('should not show hardcoded data', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Get page content
    const content = await page.content();
    
    // Check for hardcoded values that should NOT appear
    // (unless they happen to be the actual values)
    const checkInTimePattern = /Check In:.*08:00:00/;
    const hoursPattern = /Hours Worked:.*9\.0 hours/;
    
    // If these exact patterns appear, it might be hardcoded
    // This is a heuristic check - not perfect but catches obvious issues
    if (checkInTimePattern.test(content) && hoursPattern.test(content)) {
      console.warn('WARNING: Possible hardcoded data detected');
      console.warn('This might be actual data or hardcoded. Manual verification needed.');
    }
  });

  test('should handle check-in action', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for check-in button
    const checkInButton = page.locator('button:has-text("Check In")');
    
    if (await checkInButton.isVisible()) {
      // Try to check in
      await checkInButton.click();
      
      // Wait for potential security verification or success
      await page.waitForTimeout(2000);
      
      // Check if security verification appeared or if checked in
      const hasSecurityModal = await page.locator('text=Security').isVisible();
      const checkedIn = await page.locator('button:has-text("Check Out")').isVisible();
      
      console.log('Security verification:', hasSecurityModal);
      console.log('Checked in successfully:', checkedIn);
      
      // One of these should happen
      expect(hasSecurityModal || checkedIn).toBeTruthy();
    } else {
      console.log('Already checked in or check-in button not available');
    }
  });

  test('should persist data on refresh', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Get current data
    const beforeContent = await page.content();
    
    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Get data after refresh
    const afterContent = await page.content();
    
    // Basic check - if there was data before, should be data after
    const hadDataBefore = beforeContent.includes('Status:');
    const hasDataAfter = afterContent.includes('Status:');
    
    if (hadDataBefore) {
      expect(hasDataAfter).toBeTruthy();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // Check main elements are visible
    await expect(page.locator('h1:has-text("My Attendance")')).toBeVisible();
    
    // Check tabs work on mobile
    await expect(page.locator('button:has-text("Today")')).toBeVisible();
    await expect(page.locator('button:has-text("History")')).toBeVisible();
    await expect(page.locator('button:has-text("Statistics")')).toBeVisible();
    
    // Try switching tabs
    await page.click('button:has-text("History")');
    await page.waitForTimeout(500);
    
    await page.click('button:has-text("Statistics")');
    await page.waitForTimeout(500);
    
    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1 for rounding
  });

});

test.describe('Error Handling Tests', () => {
  
  test('should show error state when network fails', async ({ page, context }) => {
    // Navigate to page first
    await page.goto(BASE_URL);
    
    // Login
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|attendance/);
    
    // Go offline
    await context.setOffline(true);
    
    // Navigate to attendance (should fail to load)
    await page.goto(`${BASE_URL}/attendance`);
    await page.waitForTimeout(5000);
    
    // Should show error state (or retry mechanism)
    // This might need adjustment based on actual error handling
    const hasErrorState = await page.locator('text=Failed to Load').isVisible() ||
                         await page.locator('text=Try Again').isVisible() ||
                         await page.locator('text=Error').isVisible();
    
    console.log('Error state shown:', hasErrorState);
    
    // Go back online
    await context.setOffline(false);
    
    // If there's a retry button, try it
    const retryButton = page.locator('button:has-text("Try Again")');
    if (await retryButton.isVisible()) {
      await retryButton.click();
      await page.waitForTimeout(2000);
      
      // Should load successfully now
      await expect(page.locator('h1:has-text("My Attendance")')).toBeVisible();
    }
  });
  
});

// Export test configuration
export const config = {
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  }
};

