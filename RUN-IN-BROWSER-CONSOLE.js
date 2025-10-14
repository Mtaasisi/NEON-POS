// ============================================
// 🚨 EMERGENCY FIX - RUN THIS IN BROWSER CONSOLE
// ============================================
// Copy this ENTIRE script and paste into browser console (F12)
// ============================================

console.log('%c🔄 EMERGENCY BRANCH ISOLATION FIX', 'background: #ff0000; color: white; font-size: 20px; padding: 10px;');
console.log('%cStep 1: Clearing all caches...', 'color: #0066cc; font-size: 14px;');

// Clear localStorage
localStorage.clear();
console.log('✅ localStorage cleared');

// Clear sessionStorage  
sessionStorage.clear();
console.log('✅ sessionStorage cleared');

// Clear IndexedDB
if (indexedDB.databases) {
  indexedDB.databases().then(dbs => {
    dbs.forEach(db => {
      if (db.name) {
        console.log(`   🗑️ Deleting database: ${db.name}`);
        indexedDB.deleteDatabase(db.name);
      }
    });
    console.log('✅ IndexedDB cleared');
  });
} else {
  console.log('✅ IndexedDB not available');
}

console.log('%cStep 2: Setting Main Store as default branch...', 'color: #0066cc; font-size: 14px;');
localStorage.setItem('current_branch_id', '24cd45b8-1ce1-486a-b055-29d169c3a8ea');
console.log('✅ Branch set to Main Store');

console.log('%cStep 3: Force reload in 3 seconds...', 'color: #0066cc; font-size: 14px;');
console.log('');
console.log('%c⏳ Wait... 3', 'color: #ff6600; font-size: 16px;');
setTimeout(() => console.log('%c⏳ Wait... 2', 'color: #ff6600; font-size: 16px;'), 1000);
setTimeout(() => console.log('%c⏳ Wait... 1', 'color: #ff6600; font-size: 16px;'), 2000);
setTimeout(() => {
  console.log('%c🚀 RELOADING NOW!', 'background: #00ff00; color: black; font-size: 20px; padding: 10px;');
  window.location.href = window.location.origin + '/?nocache=' + Date.now();
}, 3000);

