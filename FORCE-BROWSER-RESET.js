// ============================================
// FORCE BROWSER RESET - RUN THIS IN CONSOLE
// ============================================
// Open DevTools (F12) and paste this entire script
// ============================================

console.log('🔄 Starting complete cache reset...');

// 1. Clear all localStorage
console.log('1️⃣ Clearing localStorage...');
localStorage.clear();

// 2. Clear all sessionStorage
console.log('2️⃣ Clearing sessionStorage...');
sessionStorage.clear();

// 3. Clear IndexedDB
console.log('3️⃣ Clearing IndexedDB...');
if (indexedDB.databases) {
  indexedDB.databases().then(dbs => {
    dbs.forEach(db => {
      if (db.name) {
        console.log(`   Deleting database: ${db.name}`);
        indexedDB.deleteDatabase(db.name);
      }
    });
  });
}

// 4. Set initial branch to Main Store
console.log('4️⃣ Setting branch to Main Store...');
localStorage.setItem('current_branch_id', '24cd45b8-1ce1-486a-b055-29d169c3a8ea');

console.log('✅ Cache cleared!');
console.log('🔄 Reloading in 2 seconds...');

setTimeout(() => {
  window.location.reload(true);
}, 2000);

