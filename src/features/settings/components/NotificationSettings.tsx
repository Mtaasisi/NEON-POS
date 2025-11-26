import React, { useState, useEffect } from 'react';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import { Bell, Mail, Phone, MessageCircle, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSettingsSave } from '../../../context/SettingsSaveContext';

interface NotificationSettingsProps {
  isActive?: boolean;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ isActive }) => {
  const { registerSaveHandler, unregisterSaveHandler, setHasChanges } = useSettingsSave();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    whatsappNotifications: true,
    lowStockAlerts: true,
    salesReports: true,
    systemUpdates: false,
    marketingEmails: false
  });

  useEffect(() => {
    const handleSave = async () => {
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
    toast.success('Notification settings saved');
  };
    
    registerSaveHandler('notification-settings', handleSave);
    return () => unregisterSaveHandler('notification-settings');
  }, [settings, registerSaveHandler, unregisterSaveHandler]);

  useEffect(() => {
    setHasChanges(true);
  }, [settings, setHasChanges]);

  return (
    <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full flex flex-col overflow-hidden relative">
      {/* Icon Header - Fixed - Matching Store Management style */}
      <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center shadow-lg">
            <Bell className="w-8 h-8 text-white" />
          </div>
          
          {/* Text */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Notification Preferences</h3>
            <p className="text-sm text-gray-600">Configure notification channels and preferences</p>
          </div>
        </div>
      </div>

      {/* Scrollable Content Section */}
      <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
        <div className="py-6">
          <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-6">

        <div className="space-y-6">
          {/* Notification Channels */}
          <div>
            <h4 className="text-lg font-medium text-gray-800 mb-4">Notification Channels</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg bg-white/5 hover:bg-white/10">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded"
                />
                <Mail className="w-5 h-5 text-gray-800" />
                <span className="text-gray-800">Email Notifications</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg bg-white/5 hover:bg-white/10">
                <input
                  type="checkbox"
                  checked={settings.smsNotifications}
                  onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded"
                />
                <Phone className="w-5 h-5 text-gray-800" />
                <span className="text-gray-800">SMS Notifications</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg bg-white/5 hover:bg-white/10">
                <input
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={(e) => setSettings({ ...settings, pushNotifications: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded"
                />
                <Bell className="w-5 h-5 text-gray-800" />
                <span className="text-gray-800">Push Notifications</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg bg-white/5 hover:bg-white/10">
                <input
                  type="checkbox"
                  checked={settings.whatsappNotifications}
                  onChange={(e) => setSettings({ ...settings, whatsappNotifications: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded"
                />
                <MessageCircle className="w-5 h-5 text-gray-800" />
                <span className="text-gray-800">WhatsApp Notifications</span>
              </label>
            </div>
          </div>

          {/* Notification Types */}
          <div>
            <h4 className="text-lg font-medium text-gray-800 mb-4">Notification Types</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg bg-white/5 hover:bg-white/10">
                <input
                  type="checkbox"
                  checked={settings.lowStockAlerts}
                  onChange={(e) => setSettings({ ...settings, lowStockAlerts: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded"
                />
                <span className="text-gray-800">Low Stock Alerts</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg bg-white/5 hover:bg-white/10">
                <input
                  type="checkbox"
                  checked={settings.salesReports}
                  onChange={(e) => setSettings({ ...settings, salesReports: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded"
                />
                <span className="text-gray-800">Daily Sales Reports</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg bg-white/5 hover:bg-white/10">
                <input
                  type="checkbox"
                  checked={settings.systemUpdates}
                  onChange={(e) => setSettings({ ...settings, systemUpdates: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded"
                />
                <span className="text-gray-800">System Updates</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg bg-white/5 hover:bg-white/10">
                <input
                  type="checkbox"
                  checked={settings.marketingEmails}
                  onChange={(e) => setSettings({ ...settings, marketingEmails: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded"
                />
                <span className="text-gray-800">Marketing Emails</span>
              </label>
            </div>
          </div>
        </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
