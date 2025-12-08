# ✅ Fix: WhatsApp PDF Upload - Storage Buckets Setup

## Problem
Error: `"Path is required"` when uploading PDF receipts via WhatsApp

The upload is trying to use Supabase storage buckets that don't exist:
- `whatsapp-media`
- `receipts`
- `public-files`

---

## Solution: Create Storage Buckets in Supabase

### Step 1: Open Supabase Dashboard
Go to: **https://app.supabase.com/project/jxhzveborezjhsmzsgbc/storage/buckets**

### Step 2: Create the Storage Buckets

Create these 3 buckets one by one:

#### Bucket 1: `whatsapp-media`
1. Click **"New bucket"**
2. **Name:** `whatsapp-media`
3. **Public bucket:** ✅ **YES** (check this box)
4. **File size limit:** `50 MB` (or leave default)
5. **Allowed MIME types:** Leave empty (allows all types)
6. Click **"Create bucket"**

#### Bucket 2: `receipts`
1. Click **"New bucket"**
2. **Name:** `receipts`
3. **Public bucket:** ✅ **YES** (check this box)
4. **File size limit:** `50 MB` (or leave default)
5. **Allowed MIME types:** Leave empty (allows all types)
6. Click **"Create bucket"**

#### Bucket 3: `public-files`
1. Click **"New bucket"**
2. **Name:** `public-files`
3. **Public bucket:** ✅ **YES** (check this box)
4. **File size limit:** `50 MB` (or leave default)
5. **Allowed MIME types:** Leave empty (allows all types)
6. Click **"Create bucket"**

---

### Step 3: Set Up Storage Policies (Optional but Recommended)

After creating the buckets, set up policies to allow uploads:

1. For each bucket, go to **"Policies"** tab
2. Click **"New policy"**
3. Select **"For full customization"**
4. Use this policy SQL:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'whatsapp-media' OR bucket_id = 'receipts' OR bucket_id = 'public-files');

-- Allow authenticated users to read files
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'whatsapp-media' OR bucket_id = 'receipts' OR bucket_id = 'public-files');

-- Allow public reads (since buckets are public)
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'whatsapp-media' OR bucket_id = 'receipts' OR bucket_id = 'public-files');
```

---

## Quick Setup Script

You can also use the Supabase CLI or API to create buckets. Here's a Node.js script:

```javascript
// create-whatsapp-buckets.mjs
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jxhzveborezjhsmzsgbc.supabase.co';
const supabaseKey = 'YOUR_SERVICE_ROLE_KEY'; // Get from Supabase Dashboard → Settings → API

const supabase = createClient(supabaseUrl, supabaseKey);

const buckets = [
  { name: 'whatsapp-media', public: true },
  { name: 'receipts', public: true },
  { name: 'public-files', public: true }
];

for (const bucket of buckets) {
  try {
    const { data, error } = await supabase.storage.createBucket(bucket.name, {
      public: bucket.public,
      fileSizeLimit: 52428800, // 50 MB
    });
    
    if (error) {
      if (error.message.includes('already exists')) {
        console.log(`✅ Bucket "${bucket.name}" already exists`);
      } else {
        console.error(`❌ Error creating "${bucket.name}":`, error.message);
      }
    } else {
      console.log(`✅ Created bucket "${bucket.name}"`);
    }
  } catch (err) {
    console.error(`❌ Exception creating "${bucket.name}":`, err.message);
  }
}
```

---

## Verification

After creating the buckets:

1. ✅ Go to Storage → Buckets
2. ✅ Verify all 3 buckets exist: `whatsapp-media`, `receipts`, `public-files`
3. ✅ Test uploading a file manually in the Supabase dashboard
4. ✅ Try sending a WhatsApp receipt from your application

---

## Alternative: Use Local Storage (Development Only)

If you don't want to use Supabase storage, the code will fall back to local file storage. However, this only works in development mode.

---

## Need Help?

If buckets still don't work after creation:
1. Check bucket permissions (should be public)
2. Verify your Supabase project has storage enabled
3. Check browser console for more detailed error messages
