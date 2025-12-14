/**
 * WhatsApp Automation Settings Modal
 * Simple modal to manage WhatsApp automation notifications
 * Uses UI style from AddCustomerModal
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Zap, Phone, Plus, Trash2, Save, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';
import { getInventorySettings, updateInventorySetting } from '../../../lib/inventorySettingsApi';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

interface WhatsAppAutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AutomationType {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  settingKey: string;
}

const WhatsAppAutomationModal: React.FC<WhatsAppAutomationModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([]);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  
  const [automations, setAutomations] = useState<AutomationType[]>([
    {
      id: 'installment-due',
      name: 'Installment Payment Due',
      description: 'Notify when installment payments are due',
      enabled: false,
      settingKey: 'installment_due_notifications'
    },
    {
      id: 'installment-overdue',
      name: 'Installment Overdue',
      description: 'Notify when installment payments are overdue',
      enabled: false,
      settingKey: 'installment_overdue_notifications'
    },
    {
      id: 'inventory-low',
      name: 'Low Stock Alerts',
      description: 'Notify when inventory items are low on stock',
      enabled: false,
      settingKey: 'inventory_low_stock_notifications'
    },
    {
      id: 'inventory-out',
      name: 'Out of Stock Alerts',
      description: 'Notify when items are completely out of stock',
      enabled: false,
      settingKey: 'inventory_out_of_stock_notifications'
    },
    {
      id: 'sale-receipt',
      name: 'Sale Receipts',
      description: 'Automatically send receipts after sales',
      enabled: false,
      settingKey: 'sale_receipt_notifications'
    },
    {
      id: 'payment-received',
      name: 'Payment Received',
      description: 'Notify when payments are received',
      enabled: false,
      settingKey: 'payment_received_notifications'
    }
  ]);

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Load settings on mount
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Load phone numbers
      const { data: phoneData } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('category', 'whatsapp_automation')
        .eq('setting_key', 'notification_phones')
        .single();

      if (phoneData?.setting_value) {
        try {
          const phones = JSON.parse(phoneData.setting_value);
          if (Array.isArray(phones)) {
            setPhoneNumbers(phones);
          }
        } catch (e) {
          console.warn('Error parsing phone numbers:', e);
        }
      }

      // If no phones, try to get from business info
      if (phoneNumbers.length === 0) {
        const { data: businessInfo } = await supabase
          .from('business_info')
          .select('phone, whatsapp')
          .single();

        const phones: string[] = [];
        if (businessInfo?.phone) phones.push(businessInfo.phone);
        if (businessInfo?.whatsapp && businessInfo.whatsapp !== businessInfo.phone) {
          phones.push(businessInfo.whatsapp);
        }
        if (phones.length > 0) {
          setPhoneNumbers(phones);
        }
      }

      // Load automation settings
      const { data: automationData } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value')
        .eq('category', 'whatsapp_automation');

      if (automationData) {
        const automationMap = new Map(automationData.map(a => [a.setting_key, a.setting_value === 'true']));
        setAutomations(prev => prev.map(auto => ({
          ...auto,
          enabled: automationMap.get(auto.settingKey) || false
        })));
      }

      // Also check inventory settings for backward compatibility
      const inventorySettings = await getInventorySettings();
      setAutomations(prev => prev.map(auto => {
        if (auto.settingKey === 'inventory_low_stock_notifications') {
          return { ...auto, enabled: inventorySettings.low_stock_alerts || false };
        }
        if (auto.settingKey === 'inventory_out_of_stock_notifications') {
          return { ...auto, enabled: inventorySettings.out_of_stock_alerts || false };
        }
        return auto;
      }));
    } catch (error: any) {
      console.error('Error loading automation settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (phoneNumbers.length === 0) {
      toast.error('Please add at least one phone number');
      return;
    }

    setSaving(true);
    try {
      // Save phone numbers
      const phoneValue = JSON.stringify(phoneNumbers);
      
      const { data: existing } = await supabase
        .from('admin_settings')
        .select('id')
        .eq('category', 'whatsapp_automation')
        .eq('setting_key', 'notification_phones')
        .single();

      if (existing) {
        await supabase
          .from('admin_settings')
          .update({
            setting_value: phoneValue,
            updated_at: new Date().toISOString()
          })
          .eq('category', 'whatsapp_automation')
          .eq('setting_key', 'notification_phones');
      } else {
        await supabase
          .from('admin_settings')
          .insert({
            category: 'whatsapp_automation',
            setting_key: 'notification_phones',
            setting_value: phoneValue,
            setting_type: 'string',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      // Save automation settings
      for (const automation of automations) {
        const { data: existing } = await supabase
          .from('admin_settings')
          .select('id')
          .eq('category', 'whatsapp_automation')
          .eq('setting_key', automation.settingKey)
          .single();

        if (existing) {
          await supabase
            .from('admin_settings')
            .update({
              setting_value: automation.enabled.toString(),
              setting_type: 'boolean',
              updated_at: new Date().toISOString()
            })
            .eq('category', 'whatsapp_automation')
            .eq('setting_key', automation.settingKey);
        } else {
          await supabase
            .from('admin_settings')
            .insert({
              category: 'whatsapp_automation',
              setting_key: automation.settingKey,
              setting_value: automation.enabled.toString(),
              setting_type: 'boolean',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
      }

        // Also update inventory settings for backward compatibility
        if (automation.settingKey === 'inventory_low_stock_notifications') {
          await updateInventorySetting('low_stock_alerts', automation.enabled);
        }
        if (automation.settingKey === 'inventory_out_of_stock_notifications') {
          await updateInventorySetting('out_of_stock_alerts', automation.enabled);
        }
        if (automation.settingKey === 'inventory_low_stock_notifications' || 
            automation.settingKey === 'inventory_out_of_stock_notifications') {
          await updateInventorySetting('whatsapp_notifications', automation.enabled);
        }
      }

      toast.success('Automation settings saved successfully!');
      onClose();
    } catch (error: any) {
      console.error('Error saving automation settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPhone = () => {
    if (!newPhoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    const cleanPhone = newPhoneNumber.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    const formattedPhone = newPhoneNumber.trim().startsWith('+') 
      ? newPhoneNumber.trim() 
      : `+${cleanPhone}`;

    if (phoneNumbers.includes(formattedPhone)) {
      toast.error('This phone number is already added');
      return;
    }

    setPhoneNumbers([...phoneNumbers, formattedPhone]);
    setNewPhoneNumber('');
    toast.success('Phone number added');
  };

  const handleRemovePhone = (index: number) => {
    setPhoneNumbers(phoneNumbers.filter((_, i) => i !== index));
    toast.success('Phone number removed');
  };

  const toggleAutomation = (id: string) => {
    setAutomations(automations.map(auto => 
      auto.id === id ? { ...auto, enabled: !auto.enabled } : auto
    ));
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <div 
        className="fixed bg-black/60 flex items-center justify-center p-4 z-[99999]" 
        style={{
          top: 0, 
          left: 0, 
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          overscrollBehavior: 'none'
        }}
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="automation-modal-title"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden relative"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            disabled={saving || loading}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon Header - Fixed */}
          <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center shadow-lg">
                <Zap className="w-8 h-8 text-white" />
              </div>
              
              {/* Text */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2" id="automation-modal-title">
                  WhatsApp Automation
                </h3>
                <p className="text-sm text-gray-600">
                  Manage automated WhatsApp notifications
                </p>
              </div>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Phone Numbers Section */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Notification Recipients</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Phone numbers that will receive WhatsApp notifications
                  </p>

                  {/* Add Phone Number */}
                  <div className="flex gap-2 mb-4">
                    <input
                      type="tel"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddPhone()}
                      placeholder="+255 123 456 789"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleAddPhone}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>

                  {/* Phone Numbers List */}
                  <div className="space-y-2">
                    {phoneNumbers.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Phone className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">No phone numbers added yet</p>
                      </div>
                    ) : (
                      phoneNumbers.map((phone, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center gap-3">
                            <Phone className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-medium text-gray-900">{phone}</span>
                          </div>
                          <button
                            onClick={() => handleRemovePhone(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Automations Section */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Automation Types</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Choose which notifications to send automatically
                  </p>

                  <div className="space-y-3">
                    {automations.map((automation) => (
                      <label
                        key={automation.id}
                        className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50/50 transition-colors cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={automation.enabled}
                          onChange={() => toggleAutomation(automation.id)}
                          className="mt-1 w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{automation.name}</div>
                          <div className="text-sm text-gray-600 mt-1">{automation.description}</div>
                        </div>
                        {automation.enabled && (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons - Fixed Footer */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 flex-shrink-0 bg-white px-6 pb-6">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || loading}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading || phoneNumbers.length === 0}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default WhatsAppAutomationModal;
