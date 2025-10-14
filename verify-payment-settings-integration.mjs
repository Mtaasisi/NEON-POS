import fs from 'fs';
import path from 'path';

console.log('🔍 Payment Settings Integration Verification\n');
console.log('=' .repeat(60));

const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Check 1: PaymentSettings.tsx exists and has all tabs
console.log('\n✅ CHECK 1: PaymentSettings Component');
try {
  const paymentSettingsPath = './src/features/settings/components/PaymentSettings.tsx';
  const content = fs.readFileSync(paymentSettingsPath, 'utf8');
  
  const tabs = ['categories', 'gateway', 'preferences', 'notifications', 'currency', 'refunds', 'reports'];
  let allTabsFound = true;
  
  tabs.forEach(tab => {
    if (content.includes(`'${tab}'`)) {
      console.log(`   ✅ ${tab} tab configured`);
      results.passed.push(`Tab: ${tab}`);
    } else {
      console.log(`   ❌ ${tab} tab missing`);
      results.failed.push(`Tab: ${tab}`);
      allTabsFound = false;
    }
  });
  
  if (allTabsFound) {
    console.log('   ✅ All 7 tabs present');
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
  results.failed.push('PaymentSettings file check');
}

// Check 2: Component uses URL parameters
console.log('\n✅ CHECK 2: URL Parameter Support');
try {
  const paymentSettingsPath = './src/features/settings/components/PaymentSettings.tsx';
  const content = fs.readFileSync(paymentSettingsPath, 'utf8');
  
  if (content.includes('useSearchParams')) {
    console.log('   ✅ useSearchParams imported');
    results.passed.push('URL parameters - import');
  } else {
    console.log('   ❌ useSearchParams not found');
    results.failed.push('URL parameters - import');
  }
  
  if (content.includes('handleTabChange')) {
    console.log('   ✅ handleTabChange function exists');
    results.passed.push('URL parameters - handler');
  } else {
    console.log('   ❌ handleTabChange function missing');
    results.failed.push('URL parameters - handler');
  }
  
  if (content.includes('setSearchParams')) {
    console.log('   ✅ URL updating implemented');
    results.passed.push('URL parameters - update');
  } else {
    console.log('   ❌ URL updating not implemented');
    results.failed.push('URL parameters - update');
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
  results.failed.push('URL parameter check');
}

// Check 3: State management for all settings
console.log('\n✅ CHECK 3: State Management');
try {
  const paymentSettingsPath = './src/features/settings/components/PaymentSettings.tsx';
  const content = fs.readFileSync(paymentSettingsPath, 'utf8');
  
  const states = [
    'notificationSettings',
    'currencySettings', 
    'refundSettings',
    'reportSettings'
  ];
  
  states.forEach(state => {
    if (content.includes(state)) {
      console.log(`   ✅ ${state} state exists`);
      results.passed.push(`State: ${state}`);
    } else {
      console.log(`   ❌ ${state} state missing`);
      results.failed.push(`State: ${state}`);
    }
  });
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
  results.failed.push('State management check');
}

// Check 4: Save functions for each settings group
console.log('\n✅ CHECK 4: Save Functions');
try {
  const paymentSettingsPath = './src/features/settings/components/PaymentSettings.tsx';
  const content = fs.readFileSync(paymentSettingsPath, 'utf8');
  
  const saveFunctions = [
    'saveNotificationSettings',
    'saveCurrencySettings',
    'saveRefundSettings',
    'saveReportSettings'
  ];
  
  saveFunctions.forEach(func => {
    if (content.includes(func)) {
      console.log(`   ✅ ${func} function exists`);
      results.passed.push(`Save function: ${func}`);
    } else {
      console.log(`   ❌ ${func} function missing`);
      results.failed.push(`Save function: ${func}`);
    }
  });
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
  results.failed.push('Save functions check');
}

// Check 5: LocalStorage integration
console.log('\n✅ CHECK 5: LocalStorage Persistence');
try {
  const paymentSettingsPath = './src/features/settings/components/PaymentSettings.tsx';
  const content = fs.readFileSync(paymentSettingsPath, 'utf8');
  
  const storageKeys = [
    'paymentNotifications',
    'paymentCurrency',
    'paymentRefunds',
    'paymentReports'
  ];
  
  storageKeys.forEach(key => {
    if (content.includes(`'${key}'`)) {
      console.log(`   ✅ ${key} localStorage key configured`);
      results.passed.push(`Storage: ${key}`);
    } else {
      console.log(`   ❌ ${key} localStorage key missing`);
      results.failed.push(`Storage: ${key}`);
    }
  });
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
  results.failed.push('LocalStorage check');
}

// Check 6: Component is exported
console.log('\n✅ CHECK 6: Component Export');
try {
  const indexPath = './src/features/settings/components/index.ts';
  const content = fs.readFileSync(indexPath, 'utf8');
  
  if (content.includes('PaymentSettings')) {
    console.log('   ✅ PaymentSettings exported from index.ts');
    results.passed.push('Export: index.ts');
  } else {
    console.log('   ❌ PaymentSettings not exported from index.ts');
    results.failed.push('Export: index.ts');
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
  results.failed.push('Export check');
}

// Check 7: Integration in AdminSettingsPage
console.log('\n✅ CHECK 7: Admin Settings Integration');
try {
  const adminPath = './src/features/admin/pages/AdminSettingsPage.tsx';
  const content = fs.readFileSync(adminPath, 'utf8');
  
  if (content.includes("import PaymentSettings from '../../settings/components/PaymentSettings'") ||
      content.includes("import PaymentSettings from")) {
    console.log('   ✅ PaymentSettings imported');
    results.passed.push('Admin integration: import');
  } else {
    console.log('   ⚠️ PaymentSettings import not verified');
    results.warnings.push('Admin integration: import');
  }
  
  if (content.includes('{ id: \'payments\'')) {
    console.log('   ✅ Payments menu item exists');
    results.passed.push('Admin integration: menu item');
  } else {
    console.log('   ❌ Payments menu item missing');
    results.failed.push('Admin integration: menu item');
  }
  
  if (content.includes("<PaymentSettings")) {
    console.log('   ✅ PaymentSettings component rendered');
    results.passed.push('Admin integration: render');
  } else {
    console.log('   ❌ PaymentSettings component not rendered');
    results.failed.push('Admin integration: render');
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
  results.failed.push('Admin integration check');
}

// Check 8: Icons imported
console.log('\n✅ CHECK 8: Required Icons');
try {
  const paymentSettingsPath = './src/features/settings/components/PaymentSettings.tsx';
  const content = fs.readFileSync(paymentSettingsPath, 'utf8');
  
  const icons = [
    'Mail', 'MessageSquare', 'Globe', 'RefreshCw', 
    'BarChart3', 'RotateCcw', 'Phone'
  ];
  
  let allIconsImported = true;
  icons.forEach(icon => {
    if (content.includes(icon)) {
      console.log(`   ✅ ${icon} icon imported`);
    } else {
      console.log(`   ❌ ${icon} icon missing`);
      allIconsImported = false;
    }
  });
  
  if (allIconsImported) {
    results.passed.push('Icons: All imported');
  } else {
    results.failed.push('Icons: Some missing');
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
  results.failed.push('Icons check');
}

// Final Summary
console.log('\n' + '='.repeat(60));
console.log('📊 VERIFICATION SUMMARY');
console.log('='.repeat(60));

console.log(`\n✅ PASSED CHECKS: ${results.passed.length}`);
results.passed.forEach((test, index) => {
  console.log(`   ${index + 1}. ${test}`);
});

if (results.failed.length > 0) {
  console.log(`\n❌ FAILED CHECKS: ${results.failed.length}`);
  results.failed.forEach((test, index) => {
    console.log(`   ${index + 1}. ${test}`);
  });
}

if (results.warnings.length > 0) {
  console.log(`\n⚠️ WARNINGS: ${results.warnings.length}`);
  results.warnings.forEach((test, index) => {
    console.log(`   ${index + 1}. ${test}`);
  });
}

const totalChecks = results.passed.length + results.failed.length;
const successRate = ((results.passed.length / totalChecks) * 100).toFixed(1);

console.log('\n' + '='.repeat(60));
console.log(`✨ Integration Quality: ${successRate}% (${results.passed.length}/${totalChecks} checks passed)`);
console.log('='.repeat(60));

if (results.failed.length === 0) {
  console.log('\n🎉 All integration checks passed! Payment Settings is fully integrated.');
} else {
  console.log('\n⚠️ Some integration checks failed. Review the failed items above.');
}

console.log('\n✅ Code verification completed.\n');

