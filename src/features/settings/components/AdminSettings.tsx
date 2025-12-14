import React, { useState, useEffect } from 'react';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import { Shield, Save, Users, Lock, Activity } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSettingsSave } from '../../../context/SettingsSaveContext';

interface AdminSettingsProps {
  isActive?: boolean;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ isActive }) => {
  const { registerSaveHandler, unregisterSaveHandler, setHasChanges } = useSettingsSave();
  const [settings, setSettings] = useState({
    userRegistration: true,
    requireEmailVerification: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    enableAuditLog: true,
    backupFrequency: 'daily',
    dataRetention: 365
  });

  useEffect(() => {
    const handleSave = async () => {
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    toast.success('Admin settings saved');
  };
    
    registerSaveHandler('admin-settings', handleSave);
    return () => unregisterSaveHandler('admin-settings');
  }, [settings, registerSaveHandler, unregisterSaveHandler]);

  useEffect(() => {
    setHasChanges(true);
  }, [settings, setHasChanges]);

  return (
    <div className="space-y-6">
      {/* Icon Header - Matching SetPricingModal style */}
      <div className="bg-white rounded-2xl shadow-2xl p-8 border-b border-gray-200">
        <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          
          {/* Text */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Administrative Settings</h3>
            <p className="text-sm text-gray-600">Configure system administration and security settings</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
        <div className="space-y-6">
          {/* User Management */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              User Management
            </h4>
            
            <div className="space-y-3">
              <div className={`flex items-center justify-between p-4 border-2 rounded-xl transition-all ${
                settings.userRegistration 
                  ? 'border-blue-300 bg-blue-50 hover:border-blue-400' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <span className="text-sm font-semibold text-gray-900">Allow new user registration</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.userRegistration}
                    onChange={(e) => setSettings({ ...settings, userRegistration: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 shadow-sm"></div>
                </label>
              </div>

              <div className={`flex items-center justify-between p-4 border-2 rounded-xl transition-all ${
                settings.requireEmailVerification 
                  ? 'border-blue-300 bg-blue-50 hover:border-blue-400' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <span className="text-sm font-semibold text-gray-900">Require email verification</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requireEmailVerification}
                    onChange={(e) => setSettings({ ...settings, requireEmailVerification: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 shadow-sm"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <Lock className="w-4 h-4 text-white" />
              </div>
              Security Settings
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => setSettings({ ...settings, sessionTimeout: Number(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 text-gray-900 font-medium transition-colors"
                  min="5"
                  max="480"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Login Attempts
                </label>
                <input
                  type="number"
                  value={settings.maxLoginAttempts}
                  onChange={(e) => setSettings({ ...settings, maxLoginAttempts: Number(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 text-gray-900 font-medium transition-colors"
                  min="3"
                  max="10"
                />
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              System Settings
            </h4>
            
            <div className="space-y-4">
              <div className={`flex items-center justify-between p-4 border-2 rounded-xl transition-all ${
                settings.enableAuditLog 
                  ? 'border-green-300 bg-green-50 hover:border-green-400' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <span className="text-sm font-semibold text-gray-900">Enable audit logging</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableAuditLog}
                    onChange={(e) => setSettings({ ...settings, enableAuditLog: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 shadow-sm"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Backup Frequency
                </label>
                <select
                  value={settings.backupFrequency}
                  onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 text-gray-900 font-medium transition-colors bg-white"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Retention (days)
                </label>
                <input
                  type="number"
                  value={settings.dataRetention}
                  onChange={(e) => setSettings({ ...settings, dataRetention: Number(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 text-gray-900 font-medium transition-colors"
                  min="30"
                  max="1095"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
