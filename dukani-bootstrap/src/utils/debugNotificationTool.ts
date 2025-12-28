// Debug Notification Tool - Helps diagnose notification issues
// Use in browser console to test and debug notification sending

export interface DebugNotificationInfo {
  timestamp: string;
  sale?: {
    saleNumber: string;
    customerName: string;
    customerPhone: string;
    total: number;
  };
  settings: {
    whatsappEnabled: boolean;
    whatsappAutoSend: boolean;
    smsEnabled: boolean;
    smsAutoSend: boolean;
  };
  whatsappConfig: {
    configured: boolean;
    apiKeyPresent: boolean;
    sessionIdPresent: boolean;
  };
  results: {
    whatsappCheck?: {
      exists: boolean;
      error?: string;
      duration_ms?: number;
    };
    whatsappSend?: {
      success: boolean;
      error?: string;
      duration_ms?: number;
    };
    smsSend?: {
      success: boolean;
      error?: string;
      duration_ms?: number;
    };
    finalMethod?: 'whatsapp' | 'sms' | 'none';
  };
}

class DebugNotificationTool {
  /**
   * Run complete diagnostic on notification system
   */
  async runDiagnostic(phoneNumber?: string): Promise<DebugNotificationInfo> {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 DEBUG: NOTIFICATION SYSTEM DIAGNOSTIC');
    console.log('═══════════════════════════════════════════════════════');
    
    const info: DebugNotificationInfo = {
      timestamp: new Date().toISOString(),
      settings: {
        whatsappEnabled: false,
        whatsappAutoSend: false,
        smsEnabled: false,
        smsAutoSend: false
      },
      whatsappConfig: {
        configured: false,
        apiKeyPresent: false,
        sessionIdPresent: false
      },
      results: {}
    };

    try {
      // Check settings
      console.log('📋 [1/5] Checking notification settings...');
      const { notificationSettingsService } = await import('../services/notificationSettingsService');
      const settings = notificationSettingsService.getSettings();
      info.settings = {
        whatsappEnabled: settings.whatsappEnabled,
        whatsappAutoSend: settings.whatsappAutoSend,
        smsEnabled: settings.smsEnabled,
        smsAutoSend: settings.smsAutoSend
      };
      console.log('✅ Settings:', info.settings);

      // Check WhatsApp configuration
      console.log('📋 [2/5] Checking WhatsApp configuration...');
      try {
        const whatsappService = (await import('../services/whatsappService')).default;
        // Try to initialize and check config
        const checkResult = await whatsappService.isOnWhatsApp('255712345678').catch(() => ({ exists: false, error: 'not configured' }));
        info.whatsappConfig.configured = !checkResult.error || !checkResult.error.includes('not configured');
        info.whatsappConfig.apiKeyPresent = true; // If check runs, API key is likely present
        console.log('✅ WhatsApp config:', info.whatsappConfig);
      } catch (error) {
        console.warn('⚠️ Could not check WhatsApp config:', error);
      }

      // Test WhatsApp check (if phone number provided)
      if (phoneNumber) {
        console.log(`📋 [3/5] Testing WhatsApp check for ${phoneNumber}...`);
        try {
          const whatsappService = (await import('../services/whatsappService')).default;
          const startTime = Date.now();
          const checkResult = await whatsappService.isOnWhatsApp(phoneNumber);
          const duration = Date.now() - startTime;
          
          info.results.whatsappCheck = {
            exists: checkResult.exists,
            error: checkResult.error,
            duration_ms: duration
          };
          
          console.log('✅ WhatsApp check result:', info.results.whatsappCheck);
        } catch (error: any) {
          console.error('❌ WhatsApp check failed:', error);
          info.results.whatsappCheck = {
            exists: false,
            error: error.message
          };
        }
      }

      // Test notification sending (if phone number provided)
      if (phoneNumber) {
        console.log(`📋 [4/5] Testing notification send to ${phoneNumber}...`);
        try {
          const { smartNotificationService } = await import('../services/smartNotificationService');
          const startTime = Date.now();
          const result = await smartNotificationService.sendNotification(
            phoneNumber,
            'Test message from debug tool'
          );
          const duration = Date.now() - startTime;
          
          info.results.finalMethod = result.method;
          info.results.whatsappSend = result.whatsappResult ? {
            success: result.whatsappResult.success,
            error: result.whatsappResult.error,
            duration_ms: duration
          } : undefined;
          info.results.smsSend = result.smsResult ? {
            success: result.smsResult.success,
            error: result.smsResult.error,
            duration_ms: duration
          } : undefined;
          
          console.log('✅ Send result:', {
            method: result.method,
            success: result.success,
            duration_ms: duration
          });
        } catch (error: any) {
          console.error('❌ Send test failed:', error);
        }
      }

      // Summary
      console.log('📋 [5/5] Generating summary...');
      console.log('═══════════════════════════════════════════════════════');
      console.log('📊 DIAGNOSTIC SUMMARY');
      console.log('═══════════════════════════════════════════════════════');
      console.log('Settings:', info.settings);
      console.log('WhatsApp Config:', info.whatsappConfig);
      if (phoneNumber) {
        console.log('WhatsApp Check:', info.results.whatsappCheck);
        console.log('Final Method:', info.results.finalMethod);
      }
      console.log('═══════════════════════════════════════════════════════');

      return info;

    } catch (error: any) {
      console.error('❌ Diagnostic failed:', error);
      throw error;
    }
  }

  /**
   * Check why SMS was sent instead of WhatsApp
   */
  async diagnoseSMSFallback(phoneNumber: string): Promise<void> {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 DEBUG: WHY SMS INSTEAD OF WHATSAPP?');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📞 Phone Number: ${phoneNumber}`);
    
    try {
      // Check 1: Settings
      console.log('\n[1] Checking Settings...');
      const { notificationSettingsService } = await import('../services/notificationSettingsService');
      const settings = notificationSettingsService.getSettings();
      
      if (!settings.whatsappEnabled) {
        console.log('❌ WhatsApp is DISABLED in settings');
        console.log('💡 Enable in POS Settings → Notifications');
      } else {
        console.log('✅ WhatsApp is ENABLED');
      }
      
      if (!settings.whatsappAutoSend) {
        console.log('❌ Auto-send is DISABLED');
        console.log('💡 Enable in POS Settings → Notifications');
      } else {
        console.log('✅ Auto-send is ENABLED');
      }

      // Check 2: WhatsApp configuration
      console.log('\n[2] Checking WhatsApp Configuration...');
      try {
        const whatsappService = (await import('../services/whatsappService')).default;
        const checkResult = await whatsappService.isOnWhatsApp(phoneNumber);
        
        if (checkResult.error) {
          console.log(`❌ WhatsApp check error: ${checkResult.error}`);
          if (checkResult.error.includes('not configured')) {
            console.log('💡 Configure WhatsApp in Admin Settings → Integrations');
          }
        } else {
          console.log(`✅ WhatsApp check passed`);
          console.log(`📱 Number is ${checkResult.exists ? 'ON' : 'NOT ON'} WhatsApp`);
          
          if (!checkResult.exists) {
            console.log('⚠️ This is why SMS is being sent - number is not on WhatsApp');
            console.log('💡 Solution: Use a number that is registered on WhatsApp');
          }
        }
      } catch (error: any) {
        console.error('❌ WhatsApp check failed:', error.message);
      }

      // Check 3: Phone number format
      console.log('\n[3] Checking Phone Number Format...');
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length < 9 || cleanPhone.length > 15) {
        console.log(`❌ Phone number format might be wrong: ${cleanPhone} (${cleanPhone.length} digits)`);
        console.log('💡 Use format: +255712345678');
      } else {
        console.log(`✅ Phone number format looks OK: ${cleanPhone}`);
      }

      console.log('\n═══════════════════════════════════════════════════════');
      console.log('📊 DIAGNOSIS COMPLETE');
      console.log('═══════════════════════════════════════════════════════');

    } catch (error: any) {
      console.error('❌ Diagnosis failed:', error);
    }
  }
}

// Export singleton
export const debugNotificationTool = new DebugNotificationTool();

// Make it available globally in development
if (import.meta.env.DEV) {
  (window as any).debugNotification = debugNotificationTool;
  console.log('💡 Debug tool available: window.debugNotification');
  console.log('💡 Usage: await window.debugNotification.diagnoseSMSFallback("+255712345678")');
}

export default debugNotificationTool;
