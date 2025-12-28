/**
 * Clear localStorage entries to fix quota issues
 */

// Clear all storage-related localStorage entries
const keys = Object.keys(localStorage);
const storageKeys = keys.filter(key => key.startsWith('storage:'));

console.log(`Found ${storageKeys.length} storage entries to clean up`);

storageKeys.forEach(key => {
  localStorage.removeItem(key);
  console.log(`Removed: ${key}`);
});

console.log('✅ localStorage cleanup complete!');
