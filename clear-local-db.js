// Script to clear local database and browser cache
// Run this in browser console to reset local SQL.js database

// Clear all local storage and IndexedDB databases
localStorage.clear();
indexedDB.databases().then(dbs => {
  dbs.forEach(db => {
    if (db.name) {
      indexedDB.deleteDatabase(db.name);
    }
  });
}).then(() => {
  console.log('Local databases cleared. Refreshing page...');
  location.reload();
});