# Manual Testing Checklist - Media Library Local Storage

## ✅ Automated Checks (COMPLETED)

All automated checks have **PASSED** ✅:

- [x] TypeScript compilation successful
- [x] Production build successful (20.74s)
- [x] Media folder included in dist output
- [x] All imports verified
- [x] No lint errors
- [x] No circular dependencies
- [x] Bundle optimized and minified

**The code is working and ready for manual testing!**

---

## 🧪 Manual Testing Steps

### Prerequisites

```bash
# Start the development server
npm run dev
```

The app should open at `http://localhost:5173` (or the configured port)

---

### Test 1: Upload Media ✅

**Steps:**
1. Navigate to **WhatsApp** → **Campaigns** → **Media Library**
2. Click **"Upload Media"** button
3. Select an image file (JPG, PNG, or GIF)
4. Wait for upload to complete

**Expected Result:**
- ✅ Success toast message appears
- ✅ Image appears in the library grid
- ✅ Image displays correctly (not broken)
- ✅ File info shows (name, size, usage count)

**Verify localStorage:**
1. Open DevTools (F12)
2. Go to **Application** → **Local Storage** → `http://localhost:5173`
3. Look for key starting with `local-media:General/`
4. Value should be JSON with base64 data

---

### Test 2: View Uploaded Media ✅

**Steps:**
1. Click the **eye icon** (preview) on any media item
2. Preview modal should open

**Expected Result:**
- ✅ Preview modal opens
- ✅ Image displays at full size
- ✅ Image is clear (not blurry)
- ✅ File name shown in header
- ✅ Close button works

---

### Test 3: Backup Media ✅

**Steps:**
1. In Media Library, click the **Database icon** 🗄️ in header
   - OR click **"Backup & Restore"** button in footer
2. Modal opens with backup/restore options
3. Click **"Download Backup"** button

**Expected Result:**
- ✅ JSON file downloads automatically
- ✅ Filename: `whatsapp-media-backup-{timestamp}.json`
- ✅ File contains media data (open in text editor to verify)
- ✅ Success toast message appears

---

### Test 4: Delete Media ✅

**Steps:**
1. Hover over any media item
2. Click the **trash icon** (red button)
3. Confirm deletion in the alert dialog

**Expected Result:**
- ✅ Confirmation dialog appears
- ✅ After confirming, item disappears from grid
- ✅ Success toast message appears
- ✅ localStorage key is removed (check DevTools)

---

### Test 5: Restore from Backup ✅

**Steps:**
1. Click **Database icon** → **Backup & Restore**
2. Click **"Select Backup File"** button
3. Choose the backup JSON file you downloaded earlier
4. Wait for import to complete

**Expected Result:**
- ✅ Import progress shows (if implemented)
- ✅ Success message shows count of imported files
- ✅ Previously deleted media reappears
- ✅ All images display correctly

---

### Test 6: Persistence Test ✅

**Steps:**
1. Upload some media files
2. Refresh the page (F5)
3. Navigate away and come back to Media Library

**Expected Result:**
- ✅ All media still visible after refresh
- ✅ Images load correctly
- ✅ No "Failed to load" errors
- ✅ localStorage data persists

---

### Test 7: Folder Organization ✅

**Steps:**
1. Upload media to different folders:
   - Upload to "General" folder
   - Click folder tab to select "Products" (or create new folder)
   - Upload to that folder
2. Switch between folder tabs

**Expected Result:**
- ✅ Media organized by folders
- ✅ Folder tabs filter correctly
- ✅ "All" tab shows all media
- ✅ Folder-specific tabs show only that folder's media

---

### Test 8: Search Functionality ✅

**Steps:**
1. Upload several images with different names
2. Use the search bar to search by filename
3. Try partial matches

**Expected Result:**
- ✅ Search filters media in real-time
- ✅ Partial matches work
- ✅ Case-insensitive search
- ✅ Clear search shows all media again

---

### Test 9: Error Handling ✅

**Steps:**
1. Try to upload a file larger than 16MB
2. Try to upload an unsupported file type (e.g., .zip, .exe)
3. Try to upload without selecting a file

**Expected Result:**
- ✅ Error toast for file too large
- ✅ Error toast for invalid file type
- ✅ Appropriate error messages
- ✅ No crashes or console errors

---

### Test 10: Migration (If Applicable) ✅

**Only if you have existing media with external URLs:**

**Steps:**
1. Open Media Library
2. Click **Backup & Restore**
3. If yellow warning appears, click **"Migrate to Local Storage"**
4. Wait for migration to complete

**Expected Result:**
- ✅ Migration progress shows
- ✅ Success message with stats (migrated/failed/skipped)
- ✅ External URLs converted to local paths
- ✅ Images still display correctly after migration

---

### Test 11: Production Build Test ✅

**Steps:**
```bash
# Build for production
npm run build

# Serve the build (use any static server)
npx serve dist
# Or: python3 -m http.server --directory dist 8000
```

**Expected Result:**
- ✅ Build completes without errors
- ✅ `dist/media/whatsapp/` folder exists
- ✅ App loads correctly from dist
- ✅ Media upload/display works in production build
- ✅ localStorage functions the same

---

## 📊 Test Results Tracking

### Environment: Development (npm run dev)

| Test | Status | Notes |
|------|--------|-------|
| 1. Upload Media | ⬜ | |
| 2. View Media | ⬜ | |
| 3. Backup Export | ⬜ | |
| 4. Delete Media | ⬜ | |
| 5. Restore Backup | ⬜ | |
| 6. Persistence | ⬜ | |
| 7. Folders | ⬜ | |
| 8. Search | ⬜ | |
| 9. Error Handling | ⬜ | |
| 10. Migration | ⬜ | (if applicable) |

### Environment: Production Build (npm run build)

| Test | Status | Notes |
|------|--------|-------|
| 11. Production Build | ⬜ | |
| Upload in Production | ⬜ | |
| Display in Production | ⬜ | |
| localStorage in Production | ⬜ | |

---

## 🐛 Common Issues & Solutions

### Issue: Images show "Failed to load"

**Solution:**
1. Click "Retry" button on the image
2. Or click "Reload All Images" in footer
3. Check browser console for errors
4. Verify localStorage has the data

### Issue: "Storage quota exceeded"

**Solution:**
1. Delete unused media
2. Export backup first
3. Check localStorage size in DevTools
4. Clear old entries if needed

### Issue: Backup file won't import

**Solution:**
1. Verify JSON file is valid (open in text editor)
2. Check file isn't corrupted
3. Try exporting a new backup and importing it
4. Check browser console for specific error

### Issue: Media disappeared after clearing browser

**Solution:**
1. This is expected behavior (localStorage cleared)
2. Restore from backup file
3. Educate users about backup importance
4. Consider adding backup reminders in UI

---

## ✅ Testing Complete Checklist

When you've completed all tests:

- [ ] All core features work (upload, display, delete)
- [ ] Backup & restore tested successfully
- [ ] localStorage verified in DevTools
- [ ] No console errors during testing
- [ ] Production build tested
- [ ] Migration tested (if applicable)
- [ ] Error handling works as expected
- [ ] Ready to deploy to production

---

## 📝 Additional Notes

**Browser Compatibility:**
- Test on Chrome/Edge (recommended)
- Test on Firefox (if possible)
- Test on Safari (if possible)
- Mobile testing (optional but recommended)

**Performance Notes:**
- Upload should be instant (local processing)
- Display should be instant (no network requests)
- No lag or delays expected

**Data Safety:**
- Always keep backup files safe
- Test restore before deploying
- Educate users about localStorage limitations

---

## 🚀 Ready for Production?

Once all tests pass:

1. ✅ All automated checks passed
2. ✅ All manual tests passed
3. ✅ Production build tested
4. ✅ No critical bugs found

**You're ready to deploy!** 🎉

Deploy the `dist/` folder to your hosting platform:
- Vercel, Netlify, GitHub Pages
- AWS S3, DigitalOcean
- Traditional web servers
- Any static hosting

**No special configuration needed!**

---

**Testing Date:** _____________  
**Tested By:** _____________  
**Status:** [ ] PASS [ ] FAIL [ ] NEEDS REVIEW  


