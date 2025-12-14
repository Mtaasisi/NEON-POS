// Notification Diagnostics Tool
// Helps diagnose why notifications aren't being sent after sales

import { notificationSettingsService } from '../services/notificationSettingsService';

export interface NotificationDiagnostics {
  whatsappConfigured: boolean;
  whatsappEnabled: boolean;
  whatsappAutoSend: boolean;
  smsEnabled: boolean;
  smsAutoSend: boolean;
  customerPhoneProvided: boolean;
  customerPhone?: string;
  shouldAutoSend: boolean;
  issues: string[];
  recommendations: string[];
}

/**
 * Diagnose why notifications might not be sending
 */
export async function diagnoseNotificationIssues(customerPhone?: string): Promise<NotificationDiagnostics> {
  const diagnostics: NotificationDiagnostics = {
    whatsappConfigured: false,
    whatsappEnabled: false,
    whatsappAutoSend: false,
    smsEnabled: false,
    smsAutoSend: false,
    customerPhoneProvided: !!customerPhone,
    customerPhone,
    shouldAutoSend: false,
    issues: [],
    recommendations: []
  };

  // Check notification settings
  const settings = notificationSettingsService.getSettings();
  diagnostics.whatsappEnabled = settings.whatsappEnabled || false;
  diagnostics.whatsappAutoSend = settings.whatsappAutoSend || false;
  diagnostics.smsEnabled = settings.smsEnabled || false;
  diagnostics.smsAutoSend = settings.smsAutoSend || false;

  // Check if WhatsApp is configured
  try {
    const { default: whatsappService } = await import('../services/whatsappService');
    // Try to check if service is initialized (this will tell us if configured)
    const checkResult = await whatsappService.isOnWhatsApp('255712345678').catch(() => ({ exists: false, error: 'not configured' }));
    diagnostics.whatsappConfigured = !checkResult.error || !checkResult.error.includes('not configured');
  } catch (error) {
    diagnostics.whatsappConfigured = false;
  }

  // Calculate if auto-send should work
  diagnostics.shouldAutoSend = 
    (diagnostics.whatsappEnabled && diagnostics.whatsappAutoSend) ||
    (diagnostics.smsEnabled && diagnostics.smsAutoSend);

  // Identify issues
  if (!diagnostics.customerPhoneProvided) {
    diagnostics.issues.push('Customer phone number not provided');
    diagnostics.recommendations.push('Ensure customer has a phone number when creating the sale');
  }

  if (!diagnostics.whatsappConfigured) {
    diagnostics.issues.push('WhatsApp API not configured');
    diagnostics.recommendations.push('Configure WhatsApp WasenderAPI in Admin Settings → Integrations');
  }

  if (!diagnostics.whatsappEnabled) {
    diagnostics.issues.push('WhatsApp integration is disabled');
    diagnostics.recommendations.push('Enable WhatsApp in POS Settings → Notifications');
  }

  if (!diagnostics.whatsappAutoSend && diagnostics.whatsappEnabled) {
    diagnostics.issues.push('WhatsApp auto-send is disabled');
    diagnostics.recommendations.push('Enable "Auto-send after payment" in POS Settings → Notifications');
  }

  if (!diagnostics.smsEnabled && !diagnostics.whatsappAutoSend) {
    diagnostics.issues.push('SMS is disabled and WhatsApp auto-send is off');
    diagnostics.recommendations.push('Enable SMS or WhatsApp auto-send in POS Settings → Notifications');
  }

  if (!diagnostics.shouldAutoSend) {
    diagnostics.issues.push('Auto-send is not enabled for any channel');
    diagnostics.recommendations.push('Enable auto-send for WhatsApp or SMS in POS Settings → Notifications');
  }

  // Phone number validation
  if (customerPhone) {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      diagnostics.issues.push('Customer phone number is too short or invalid');
      diagnostics.recommendations.push('Use a valid phone number format: +255712345678');
    }
  }

  return diagnostics;
}

/**
 * Get a user-friendly diagnostic message
 */
export function getDiagnosticMessage(diagnostics: NotificationDiagnostics): string {
  if (diagnostics.shouldAutoSend && diagnostics.customerPhoneProvided) {
    return '✅ All settings look good! Notifications should be sending.';
  }

  if (diagnostics.issues.length === 0) {
    return '✅ No issues detected.';
  }

  const mainIssue = diagnostics.issues[0];
  const mainRecommendation = diagnostics.recommendations[0];

  return `⚠️ ${mainIssue}\n\n💡 ${mainRecommendation}`;
}

export default {
  diagnoseNotificationIssues,
  getDiagnosticMessage
};
