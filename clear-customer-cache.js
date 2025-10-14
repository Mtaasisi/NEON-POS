// Clear Customer Cache Script
// Run this in browser console to clear cached customer data

console.log('🧹 Clearing customer cache...');

// Clear the main customer cache
localStorage.removeItem('pos_customers_cache');
console.log('✅ Removed pos_customers_cache');

// Clear any other customer-related caches
localStorage.removeItem('customersPagePrefs');
console.log('✅ Removed customersPagePrefs');

// Clear any search caches
Object.keys(localStorage).forEach(key => {
  if (key.includes('customer') || key.includes('search')) {
    localStorage.removeItem(key);
    console.log(`✅ Removed ${key}`);
  }
});

console.log('🎉 Customer cache cleared! Refresh the page to see branch labels.');
