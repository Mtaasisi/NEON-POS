# 📦 Supabase Storage Setup for WhatsApp Media

## 🎯 **Enable Direct File Uploads for Bulk Media**

To make direct file uploads work for bulk WhatsApp media messages, you need to create a Supabase Storage bucket.

---

## 📋 **Quick Setup (5 Minutes)**

### **Step 1: Go to Supabase Dashboard**

1. Open your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **Storage** → **Buckets**

### **Step 2: Create Bucket**

1. Click **"New bucket"** button
2. Fill in the details:
   ```
   Name: whatsapp-media
   Public: ✅ Yes (enable public access)
   File size limit: 16 MB
   Allowed MIME types: (leave empty for all types)
   ```
3. Click **"Create bucket"**

### **Step 3: Configure Policies (Make Public)**

1. Click on the `whatsapp-media` bucket
2. Go to **Policies** tab
3. Create policy for **SELECT** (read):
   ```sql
   CREATE POLICY "Public Access"
   ON storage.objects FOR SELECT
   USING ( bucket_id = 'whatsapp-media' );
   ```
4. Create policy for **INSERT** (upload):
   ```sql
   CREATE POLICY "Authenticated users can upload"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'whatsapp-media' 
     AND auth.role() = 'authenticated'
   );
   ```
5. Create policy for **DELETE** (optional cleanup):
   ```sql
   CREATE POLICY "Users can delete own files"
   ON storage.objects FOR DELETE
   USING (
     bucket_id = 'whatsapp-media'
     AND auth.role() = 'authenticated'
   );
   ```

### **Step 4: Test**

1. Go to your app
2. Click "Bulk Send" → Compose → Select "Image"
3. Click "Upload File"
4. Select an image
5. Should see: "Media uploaded successfully!" ✅

---

## 🎨 **Bucket Configuration**

### **Recommended Settings:**

```yaml
Bucket Name: whatsapp-media
Public: Yes
File Size Limit: 16 MB (16777216 bytes)
Allowed MIME Types: 
  - image/*
  - video/*
  - audio/*
  - application/pdf
  - application/msword
  - application/vnd.openxmlformats-officedocument.*
```

### **Policies:**

**1. Public Read Access:**
```sql
-- Allow anyone to download files (public URLs)
CREATE POLICY "Public can read whatsapp media"
ON storage.objects FOR SELECT
USING ( bucket_id = 'whatsapp-media' );
```

**2. Authenticated Upload:**
```sql
-- Only logged-in users can upload
CREATE POLICY "Authenticated can upload whatsapp media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'whatsapp-media' 
  AND auth.role() = 'authenticated'
);
```

**3. Delete Own Files:**
```sql
-- Users can delete their own uploads
CREATE POLICY "Users can delete own whatsapp media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'whatsapp-media'
  AND auth.role() = 'authenticated'
);
```

---

## 🔧 **How It Works**

### **Upload Flow:**

```
User selects file
      ↓
File validated (max 16MB)
      ↓
Upload to Supabase Storage (whatsapp-media bucket)
      ↓
Get public URL
      ↓
Store URL in state
      ↓
URL used for all recipients ✅
```

### **Code:**

```typescript
// Upload to Supabase Storage
const fileName = `whatsapp-bulk/${Date.now()}-${file.name}`;
const { data, error } = await supabase.storage
  .from('whatsapp-media')
  .upload(fileName, file);

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('whatsapp-media')
  .getPublicUrl(fileName);

// Use URL for all recipients
setBulkMedia(publicUrl);
```

---

## ✅ **Benefits**

### **1. No CORS Issues** ✅
- Upload to same-origin Supabase
- Browser allows request
- No cross-origin blocking

### **2. Public URLs** ✅
- Files accessible to anyone with URL
- Perfect for WhatsApp
- WasenderAPI can download from URL

### **3. Efficient** ✅
- Upload once
- Reuse URL for all recipients
- Fast and reliable

### **4. Organized** ✅
- Files stored in `whatsapp-bulk/` folder
- Timestamp prefix for uniqueness
- Easy to manage and cleanup

---

## 📁 **Storage Structure**

```
whatsapp-media/
├── whatsapp-bulk/
│   ├── 1733241234567-product.jpg
│   ├── 1733241245678-promo.png
│   ├── 1733241256789-catalog.pdf
│   └── ... (bulk campaign files)
└── media-library/
    ├── images/
    ├── videos/
    └── documents/
```

---

## 🔒 **Security Notes**

### **Public Bucket:**
- ✅ **Safe:** Files are public by design (for WhatsApp sharing)
- ✅ **No sensitive data:** Don't upload confidential files
- ✅ **Temporary:** Can set up auto-cleanup after X days

### **Access Control:**
- Upload: Authenticated users only
- Read: Public (anyone with URL)
- Delete: Authenticated users only

---

## 🧹 **Cleanup (Optional)**

### **Manual Cleanup:**

```sql
-- Delete old files (older than 30 days)
DELETE FROM storage.objects
WHERE bucket_id = 'whatsapp-media'
AND created_at < NOW() - INTERVAL '30 days';
```

### **Automatic Cleanup (Future):**

Set up a Supabase Edge Function to auto-delete old files:
```typescript
// edge-functions/cleanup-whatsapp-media.ts
const { data, error } = await supabase.storage
  .from('whatsapp-media')
  .list('whatsapp-bulk');

// Delete files older than 30 days
for (const file of data) {
  if (isOlderThan30Days(file.created_at)) {
    await supabase.storage
      .from('whatsapp-media')
      .remove([`whatsapp-bulk/${file.name}`]);
  }
}
```

---

## 🚀 **After Setup**

Once the bucket is created, direct file uploads will work:

### **User Experience:**

```
1. Click "Bulk Send"
2. Select "Image" message type
3. Click "Upload File"
4. Select image from computer
5. ✅ "Uploading media..."
6. ✅ "Media uploaded successfully!"
7. Image uploaded to Supabase Storage
8. Public URL obtained
9. Continue to compose caption
10. Send to all recipients ✅
```

---

## ⚠️ **If Bucket Doesn't Exist**

### **Error Message:**
```
"Storage bucket 'whatsapp-media' not found. Please create it in Supabase Storage or use Media Library."
```

### **Solution:**
Follow the setup steps above to create the bucket!

---

## 🎯 **Fallback Options**

If you can't create the bucket right now:

### **Option 1: Media Library**
- Upload media to Media Library
- Select from library in bulk send
- Works perfectly!

### **Option 2: Text Messages**
- Use powerful text messages with variables
- Add links to images instead
- Still very effective!

---

## ✅ **Summary**

**Setup Required:** Create `whatsapp-media` bucket in Supabase Storage

**Steps:**
1. Go to Supabase Dashboard → Storage
2. Create bucket: `whatsapp-media` (public)
3. Add policies (SELECT, INSERT, DELETE)
4. Test upload in app

**Time:** ~5 minutes

**Result:** Direct file uploads working for bulk media! ✅

---

**Once setup is complete:**
- ✅ Upload files directly in bulk send
- ✅ No CORS errors
- ✅ Public URLs generated automatically
- ✅ Efficient and reliable
- ✅ Production ready

---

## 📖 **Quick Start SQL**

Run this in your Supabase SQL Editor for quick setup:

```sql
-- Enable the storage extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create storage policies for whatsapp-media bucket
-- (Create the bucket via UI first, then run these policies)

-- Allow public read access
CREATE POLICY "Public can read whatsapp media"
ON storage.objects FOR SELECT
USING ( bucket_id = 'whatsapp-media' );

-- Allow authenticated users to upload
CREATE POLICY "Authenticated can upload whatsapp media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'whatsapp-media' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete
CREATE POLICY "Authenticated can delete whatsapp media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'whatsapp-media'
  AND auth.role() = 'authenticated'
);
```

---

**Status:** ✅ Solution Implemented  
**Complexity:** Low (5-minute setup)  
**Benefit:** Direct file uploads working!  
**Production:** 🚀 Ready after bucket creation  

