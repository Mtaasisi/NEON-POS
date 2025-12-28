#!/usr/bin/env node

import { supabase } from './src/lib/supabaseClient.js';
import { unifiedSettingsService } from './src/lib/unifiedSettingsService.js';
import { loadUserSettings, saveUserSettings } from './src/lib/userSettingsApi.js';

async function testDashboardSettings() {
  console.log('🧪 Testing Dashboard Settings Save/Load Functionality');

  try {
    // Test user ID
    const testUserId = 'test-user-123';

    // Test dashboard settings
    const testDashboardSettings = {
      quickActions: {
        devices: true,
        customers: false,
        inventory: true,
        appointments: true,
        settings: false
      },
      widgets: {
        revenueTrendChart: true,
        appointmentWidget: false,
        notificationWidget: true
      }
    };

    const testUserSettings = {
      theme: 'dark',
      dashboard: testDashboardSettings
    };

    console.log('📤 Testing saveUserSettings...');
    const saveResult = await saveUserSettings(testUserId, testUserSettings);
    console.log('✅ Save result:', saveResult);

    if (!saveResult) {
      console.error('❌ Save failed!');
      return;
    }

    console.log('📥 Testing loadUserSettings...');
    const loadedSettings = await loadUserSettings(testUserId);
    console.log('✅ Loaded settings:', loadedSettings);

    if (!loadedSettings) {
      console.error('❌ Load failed!');
      return;
    }

    // Verify dashboard settings were saved and loaded correctly
    const savedDashboard = loadedSettings.dashboard;
    if (JSON.stringify(savedDashboard) === JSON.stringify(testDashboardSettings)) {
      console.log('🎉 SUCCESS: Dashboard settings save and load correctly!');
    } else {
      console.log('❌ FAILURE: Dashboard settings mismatch');
      console.log('Expected:', testDashboardSettings);
      console.log('Received:', savedDashboard);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

testDashboardSettings();
