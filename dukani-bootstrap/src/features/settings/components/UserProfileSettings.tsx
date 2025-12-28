import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import { User, Mail, Phone, MapPin, Save, Building2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';
import { businessInfoService } from '../../../lib/businessInfoService';
import { useSettingsSave } from '../../../context/SettingsSaveContext';

interface UserProfileSettingsProps {
  isActive: boolean;
}

const UserProfileSettings: React.FC<UserProfileSettingsProps> = ({ isActive }) => {
  const { user } = useAuth();
  const { registerSaveHandler, unregisterSaveHandler, setHasChanges } = useSettingsSave();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    businessName: '',
    businessEmail: '',
    businessPhone: '',
    businessAddress: '',
    businessWebsite: ''
  });

  // Fetch profile data from lats_pos_general_settings
  useEffect(() => {
    if (isActive) {
      fetchProfileData();
    }
  }, [isActive]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      // @ts-ignore - Neon query builder implements thenable interface
      const { data, error } = await supabase
        .from('lats_pos_general_settings')
        .select('id, business_name, business_email, business_phone, business_address, business_website')
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setSettingsId(data.id);
        setFormData({
          businessName: data.business_name || '',
          businessEmail: data.business_email || '',
          businessPhone: data.business_phone || '',
          businessAddress: data.business_address || '',
          businessWebsite: data.business_website || ''
        });
      }
    } catch (error: any) {
      console.error('Error fetching profile data:', error);
      toast.error('Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!settingsId) return;

  const handleSave = async () => {
    try {
      setSaving(true);
      // @ts-ignore - Neon query builder implements thenable interface
      const { error } = await supabase
        .from('lats_pos_general_settings')
        .update({
          business_name: formData.businessName,
          business_email: formData.businessEmail,
          business_phone: formData.businessPhone,
          business_address: formData.businessAddress,
          business_website: formData.businessWebsite
        })
        .eq('id', settingsId);

      if (error) throw error;

      // Clear business info cache to force all components to refresh
      businessInfoService.clearCache();
      
      // Notify other components to refresh
      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { type: 'general' } }));

      toast.success('Profile updated successfully - All components will refresh');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };
    
    registerSaveHandler('user-profile-settings', handleSave);
    return () => unregisterSaveHandler('user-profile-settings');
  }, [formData, settingsId, registerSaveHandler, unregisterSaveHandler]);

  useEffect(() => {
    if (settingsId) {
      setHasChanges(true);
    }
  }, [formData, settingsId, setHasChanges]);

  if (!isActive) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full flex flex-col overflow-hidden relative">
      {/* Icon Header - Fixed - Matching Store Management style */}
      <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          
          {/* Text */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Business Profile Information</h3>
            <p className="text-sm text-gray-600">Update your business information below</p>
          </div>
        </div>
      </div>

      {/* Scrollable Content Section */}
      <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
        <div className="py-6">
          <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              Business Name
            </label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              placeholder="Enter business name"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" />
              Business Email
            </label>
            <input
              type="email"
              value={formData.businessEmail}
              onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
              placeholder="business@example.com"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500" />
              Business Phone
            </label>
            <input
              type="tel"
              value={formData.businessPhone}
              onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
              placeholder="+255 XXX XXX XXX"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              Website
            </label>
            <input
              type="url"
              value={formData.businessWebsite}
              onChange={(e) => setFormData({ ...formData, businessWebsite: e.target.value })}
              placeholder="https://www.example.com"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              Business Address
            </label>
            <textarea
              value={formData.businessAddress}
              onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
              rows={3}
              placeholder="Enter full business address"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileSettings;
