#!/usr/bin/env node

/**
 * Feature Toggle System Test
 * Tests the feature toggle functionality in development and production modes
 */

import { featureToggleService } from './src/services/featureToggleService.ts';
import { FEATURE_TOGGLES } from './src/types/featureToggles.ts';

console.log('🧪 Testing Feature Toggle System...\n');

// Test 1: Check if service initializes properly
console.log('Test 1: Service Initialization');
try {
  await featureToggleService.initialize();
  console.log('✅ Service initialized successfully');
} catch (error) {
  console.log('❌ Service initialization failed:', error.message);
}

// Test 2: Check default feature states
console.log('\nTest 2: Default Feature States');
FEATURE_TOGGLES.forEach(toggle => {
  const isEnabled = featureToggleService.isEnabled(toggle.key);
  console.log(`  ${toggle.key}: ${isEnabled ? 'ENABLED' : 'DISABLED'} (default: ${toggle.defaultEnabled ? 'ENABLED' : 'DISABLED'})`);
});

// Test 3: Test toggle state changes
console.log('\nTest 3: Toggle State Changes');
const testFeature = 'ai_assistant';
const originalState = featureToggleService.isEnabled(testFeature);
console.log(`  Original state for ${testFeature}: ${originalState ? 'ENABLED' : 'DISABLED'}`);

try {
  // Toggle the feature
  await featureToggleService.saveToggleState(testFeature, !originalState);
  const newState = featureToggleService.isEnabled(testFeature);
  console.log(`  After toggle: ${newState ? 'ENABLED' : 'DISABLED'}`);

  // Toggle back
  await featureToggleService.saveToggleState(testFeature, originalState);
  const finalState = featureToggleService.isEnabled(testFeature);
  console.log(`  After toggle back: ${finalState ? 'ENABLED' : 'DISABLED'}`);

  if (finalState === originalState) {
    console.log('✅ Toggle state changes work correctly');
  } else {
    console.log('❌ Toggle state changes failed');
  }
} catch (error) {
  console.log('❌ Toggle state change test failed:', error.message);
}

// Test 4: Check available toggles
console.log('\nTest 4: Available Toggles');
const availableToggles = featureToggleService.getAvailableToggles();
console.log(`  Available toggles: ${availableToggles.length}`);
console.log(`  Total defined toggles: ${FEATURE_TOGGLES.length}`);

// Test 5: Test feature dependencies
console.log('\nTest 5: Feature Dependencies');
const depCheck = featureToggleService.canEnableFeature('ai_assistant');
console.log(`  Can enable ai_assistant: ${depCheck.canEnable ? 'YES' : 'NO'}`);
if (!depCheck.canEnable && depCheck.reason) {
  console.log(`  Reason: ${depCheck.reason}`);
}

// Test 6: Environment awareness
console.log('\nTest 6: Environment Awareness');
const isDev = import.meta.env.MODE === 'development';
const isProd = import.meta.env.MODE === 'production';
console.log(`  Current environment: ${import.meta.env.MODE || 'unknown'}`);
console.log(`  Development mode: ${isDev}`);
console.log(`  Production mode: ${isProd}`);

if (isDev) {
  console.log('  📝 In development: All features should be enabled by default');
  const allEnabledInDev = FEATURE_TOGGLES.every(toggle => featureToggleService.isEnabled(toggle.key));
  console.log(`  All features enabled in dev: ${allEnabledInDev ? 'YES' : 'NO'}`);
}

console.log('\n🎉 Feature Toggle System Test Complete!');
console.log('\n💡 Usage Examples:');
console.log('  1. Check if feature is enabled: featureToggleService.isEnabled("ai_assistant")');
console.log('  2. Toggle feature: await featureToggleService.saveToggleState("ai_assistant", true)');
console.log('  3. Get all states: featureToggleService.getAllToggleStates()');
console.log('  4. Reset to defaults: featureToggleService.resetToDefaults()');
