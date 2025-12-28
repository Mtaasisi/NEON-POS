// useNotificationSettings Hook - Easy access to notification settings
import { useState, useEffect, useCallback } from 'react';
import { 
  notificationSettingsService, 
  NotificationSettings, 
  InvoiceData 
} from '../services/notificationSettingsService';

export const useNotificationSettings = () => {
  const [settings, setSettings] = useState<NotificationSettings>(
    notificationSettingsService.getDefaultSettings()
  );
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loadedSettings = notificationSettingsService.getSettings();
    setSettings(loadedSettings);
  }, []);

  // Save settings
  const saveSettings = useCallback((newSettings: NotificationSettings) => {
    try {
      notificationSettingsService.saveSettings(newSettings);
      setSettings(newSettings);
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }, []);

  // Update specific setting
  const updateSetting = useCallback((key: keyof NotificationSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    notificationSettingsService.saveSettings(newSettings);
    setSettings(newSettings);
  }, [settings]);

  // Send WhatsApp invoice
  const sendWhatsApp = useCallback(async (invoice: InvoiceData) => {
    setSending(true);
    try {
      const result = await notificationSettingsService.sendWhatsAppInvoice(invoice);
      return result;
    } finally {
      setSending(false);
    }
  }, []);

  // Send SMS invoice
  const sendSMS = useCallback(async (invoice: InvoiceData) => {
    setSending(true);
    try {
      const result = await notificationSettingsService.sendSMSInvoice(invoice);
      return result;
    } finally {
      setSending(false);
    }
  }, []);

  // Send Email invoice
  const sendEmail = useCallback(async (invoice: InvoiceData) => {
    setSending(true);
    try {
      const result = await notificationSettingsService.sendEmailInvoice(invoice);
      return result;
    } finally {
      setSending(false);
    }
  }, []);

  // Auto-send invoice
  const autoSendInvoice = useCallback(async (invoice: InvoiceData) => {
    setSending(true);
    try {
      const results = await notificationSettingsService.autoSendInvoice(invoice);
      return results;
    } finally {
      setSending(false);
    }
  }, []);

  // Generate preview messages
  const getWhatsAppPreview = useCallback((invoice: InvoiceData) => {
    return notificationSettingsService.generateWhatsAppMessage(invoice, settings);
  }, [settings]);

  const getSMSPreview = useCallback((invoice: InvoiceData) => {
    return notificationSettingsService.generateSMSMessage(invoice, settings);
  }, [settings]);

  // Check if auto-send is enabled
  const hasAutoSend = useCallback(() => {
    return notificationSettingsService.hasAutoSendEnabled();
  }, []);

  // Check if manual send is available
  const hasManualSend = useCallback(() => {
    return notificationSettingsService.hasManualSendEnabled();
  }, []);

  return {
    settings,
    loading,
    sending,
    saveSettings,
    updateSetting,
    sendWhatsApp,
    sendSMS,
    sendEmail,
    autoSendInvoice,
    getWhatsAppPreview,
    getSMSPreview,
    hasAutoSend,
    hasManualSend,
  };
};

export default useNotificationSettings;

