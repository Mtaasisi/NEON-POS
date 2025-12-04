#!/usr/bin/env node

/**
 * Media Library Recovery Script
 * 
 * This script helps recover and diagnose media library images
 * by analyzing localStorage contents and database records.
 * 
 * Usage:
 *   node scripts/recover-media-library.mjs
 */

console.log('🔍 Media Library Recovery Tool\n');

// Instructions for manual recovery
console.log('📋 To recover your media library images:\n');

console.log('1️⃣  Open your browser DevTools (F12)');
console.log('2️⃣  Go to the Console tab');
console.log('3️⃣  Copy and paste this code:\n');

console.log('```javascript');
console.log(`// List all stored media URLs
console.log('📦 Stored Media in localStorage:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && key.startsWith('storage:whatsapp-media:')) {
    const value = localStorage.getItem(key);
    const filename = key.split('/').pop();
    const urlType = value.startsWith('data:') ? '📊 Base64' : '🔗 URL';
    const size = value.length;
    console.log(\`  \${urlType} \${filename} (\${(size / 1024).toFixed(1)}KB)\`);
  }
}

// Count total storage
const totalSize = Object.keys(localStorage)
  .filter(k => k.startsWith('storage:whatsapp-media:'))
  .reduce((sum, k) => sum + (localStorage.getItem(k)?.length || 0), 0);
console.log(\`\\n💾 Total Storage Used: \${(totalSize / 1024 / 1024).toFixed(2)}MB\`);

// Check localStorage quota
if ('storage' in navigator && 'estimate' in navigator.storage) {
  navigator.storage.estimate().then(estimate => {
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentUsed = ((usage / quota) * 100).toFixed(2);
    console.log(\`📊 Browser Storage: \${(usage / 1024 / 1024).toFixed(2)}MB / \${(quota / 1024 / 1024).toFixed(2)}MB (\${percentUsed}%)\`);
  });
}

// Clear specific media if needed
console.log('\\n🧹 To clear specific media:');
console.log('localStorage.removeItem("storage:whatsapp-media:path/to/file.jpg")');

// Clear all media
console.log('\\n🗑️  To clear ALL media (caution):');
console.log('Object.keys(localStorage).filter(k => k.startsWith("storage:whatsapp-media:")).forEach(k => localStorage.removeItem(k))');
`);
console.log('```\n');

console.log('4️⃣  Run the code and review the output');
console.log('5️⃣  If images are missing, re-upload them via the Media Library\n');

console.log('📝 Notes:');
console.log('   - Base64 images are stored in localStorage (dev mode)');
console.log('   - URL images reference external storage (production)');
console.log('   - localStorage has 5-10MB limit per domain');
console.log('   - Clear old images to free up space\n');

console.log('✅ After running the recovery code above:');
console.log('   1. Reload your application');
console.log('   2. Open Media Library');
console.log('   3. Images should now display correctly\n');

console.log('❓ Need help? Check MEDIA_LIBRARY_FIX.md for details\n');

