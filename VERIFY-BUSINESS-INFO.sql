-- ============================================
-- VERIFY BUSINESS INFORMATION IN SETTINGS
-- ============================================
-- This script helps you verify that your business
-- information and logo are properly stored
-- ============================================

-- 1. Check if general settings table exists
SELECT 
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'lats_pos_general_settings'
  ) as "Table Exists ✅";

-- 2. Check current business information
SELECT 
  id,
  user_id,
  business_name as "Business Name",
  business_address as "Address",
  business_phone as "Phone",
  business_email as "Email",
  business_website as "Website",
  CASE 
    WHEN business_logo IS NOT NULL AND business_logo != '' 
    THEN '✅ Logo Uploaded' 
    ELSE '❌ No Logo' 
  END as "Logo Status",
  CASE 
    WHEN business_logo IS NOT NULL AND business_logo != '' 
    THEN LEFT(business_logo, 50) || '...' 
    ELSE 'No logo' 
  END as "Logo Preview (first 50 chars)",
  created_at as "Created",
  updated_at as "Last Updated"
FROM lats_pos_general_settings
ORDER BY updated_at DESC
LIMIT 5;

-- 3. Count total settings records
SELECT 
  COUNT(*) as "Total Settings Records",
  COUNT(DISTINCT user_id) as "Unique Uasers",
  COUNT(CASE WHEN business_logo IS NOT NULL AND business_logo != '' THEN 1 END) as "Records With Logo"
FROM lats_pos_general_settings;

-- 4. Check if logo is base64 encoded (should start with 'data:image/')
SELECT 
  business_name as "Business Name",
  CASE 
    WHEN business_logo LIKE 'data:image/%' THEN '✅ Valid Base64 Image'
    WHEN business_logo LIKE 'http%' THEN '⚠️ URL (not recommended)'
    WHEN business_logo IS NULL OR business_logo = '' THEN '❌ No Logo'
    ELSE '⚠️ Invalid Format'
  END as "Logo Format",
  LENGTH(business_logo) as "Logo Size (chars)"
FROM lats_pos_general_settings
WHERE business_logo IS NOT NULL AND business_logo != '';

-- 5. Show all business fields with their status
SELECT 
  business_name,
  CASE WHEN business_address IS NOT NULL AND business_address != '' THEN '✅' ELSE '❌' END as "Address",
  CASE WHEN business_phone IS NOT NULL AND business_phone != '' THEN '✅' ELSE '❌' END as "Phone",
  CASE WHEN business_email IS NOT NULL AND business_email != '' THEN '✅' ELSE '❌' END as "Email",
  CASE WHEN business_website IS NOT NULL AND business_website != '' THEN '✅' ELSE '❌' END as "Website",
  CASE WHEN business_logo IS NOT NULL AND business_logo != '' THEN '✅' ELSE '❌' END as "Logo"
FROM lats_pos_general_settings
ORDER BY updated_at DESC
LIMIT 1;

-- ============================================
-- HELPFUL TIPS
-- ============================================
/*
✅ WHAT TO EXPECT:

1. Logo Format: Should be base64 encoded (starts with 'data:image/')
2. Logo Size: Typically 10,000 - 100,000 characters for a small logo
3. All Fields: Can be filled in the General Settings tab

📝 HOW TO UPDATE BUSINESS INFO:

1. Navigate to: Settings → General Settings
2. Fill in your business information
3. Upload your logo (max 2MB, PNG/JPG recommended)
4. Click "Save Settings"
5. The logo will appear in:
   - Sidebar header
   - Receipts (if enabled)
   - Any other place using businessInfo

🔄 REFRESH CACHE:

If changes don't appear immediately, the cache will 
refresh automatically after 5 minutes, or you can:
- Reload the page
- Log out and log back in

⚠️ TROUBLESHOOTING:

If logo doesn't show:
1. Check it's uploaded (run query #2 above)
2. Verify format is base64 (run query #4 above)
3. Clear browser cache
4. Check browser console for errors
*/

-- ============================================
-- OPTIONAL: Reset business info to defaults
-- (UNCOMMENT TO USE - BE CAREFUL!)
-- ============================================
/*
UPDATE lats_pos_general_settings
SET 
  business_name = 'My Store',
  business_address = 'Dar es Salaam, Tanzania',
  business_phone = '+255 123 456 789',
  business_email = 'info@mystore.com',
  business_website = 'www.mystore.com',
  business_logo = NULL
WHERE user_id = 'YOUR_USER_ID_HERE';
*/

