import React, { useState, useEffect, useRef } from 'react';
import { Building2, Upload, X, Save } from 'lucide-react';
// Removed GlassCard, GlassButton - using native elements matching SetPricingModal style
import { supabase } from '../../../lib/supabaseClient';
import { businessInfoService } from '../../../lib/businessInfoService';
import toast from 'react-hot-toast';
import { useSettingsSave } from '../../../context/SettingsSaveContext';

/**
 * Business Information Settings
 * Copy of POS Settings Business Information section
 * Fetches from lats_pos_general_settings table
 */
const UnifiedBrandingSettings: React.FC = () => {
  const { registerSaveHandler, unregisterSaveHandler, setHasChanges } = useSettingsSave();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    businessName: '',
    businessPhone: '',
    businessEmail: '',
    businessWebsite: '',
    businessAddress: '',
    businessLogo: null as string | null
  });

  useEffect(() => {
    fetchBusinessInfo();
  }, []);

  const fetchBusinessInfo = async () => {
    try {
      setLoading(true);
      // @ts-ignore - Neon query builder implements thenable interface
      const { data, error } = await supabase
        .from('lats_pos_general_settings')
        .select('id, business_name, business_phone, business_email, business_website, business_address, business_logo')
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setSettingsId(data.id);
        setFormData({
          businessName: data.business_name || '',
          businessPhone: data.business_phone || '',
          businessEmail: data.business_email || '',
          businessWebsite: data.business_website || '',
          businessAddress: data.business_address || '',
          businessLogo: data.business_logo || null
        });
        setLogoPreview(data.business_logo || null);
      }
    } catch (error: any) {
      console.error('Error fetching business info:', error);
      toast.error('Failed to load business information');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    setUploadingLogo(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        setFormData(prev => ({ ...prev, businessLogo: base64String }));
        toast.success('Logo uploaded! Remember to save.');
      };
      reader.onerror = () => {
        toast.error('Failed to read image file');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setFormData(prev => ({ ...prev, businessLogo: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Logo removed. Remember to save.');
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
          business_phone: formData.businessPhone,
          business_email: formData.businessEmail,
          business_website: formData.businessWebsite,
          business_address: formData.businessAddress,
          business_logo: formData.businessLogo
        })
        .eq('id', settingsId);

      if (error) throw error;

      // Clear business info cache to force all components to refresh
      businessInfoService.clearCache();
      
      // Notify other components to refresh
      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { type: 'general' } }));
      
      toast.success('Business information updated successfully - All components will refresh');
    } catch (error: any) {
      console.error('Error updating business info:', error);
      toast.error('Failed to update business information');
    } finally {
      setSaving(false);
    }
  };
    
    registerSaveHandler('unified-branding-settings', handleSave);
    return () => unregisterSaveHandler('unified-branding-settings');
  }, [formData, settingsId, registerSaveHandler, unregisterSaveHandler]);

  useEffect(() => {
    if (settingsId) {
      setHasChanges(true);
    }
  }, [formData, settingsId, setHasChanges]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading business information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Icon Header - Fixed - Matching SetPricingModal style */}
      <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          
          {/* Text */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Business Information</h2>
            <p className="text-sm text-gray-600">Configure your business details and branding</p>
          </div>
        </div>
      </div>

      {/* Scrollable Content Section */}
      <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
        <div className="py-6 space-y-6">
          {/* Business Details Section */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center shadow-sm">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              Business Details
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="My Store"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Business Phone
                </label>
                <input
                  type="tel"
                  value={formData.businessPhone}
                  onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
                  placeholder="+255 123 456 789"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Business Email
                </label>
                <input
                  type="email"
                  value={formData.businessEmail}
                  onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
                  placeholder="info@mystore.com"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Business Website
                </label>
                <input
                  type="url"
                  value={formData.businessWebsite}
                  onChange={(e) => setFormData({ ...formData, businessWebsite: e.target.value })}
                  placeholder="www.mystore.com"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Address
              </label>
              <input
                type="text"
                value={formData.businessAddress}
                onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                placeholder="123 Main Street, City, Country"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium transition-colors"
              />
            </div>
          </div>

          {/* Business Logo Upload Section */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-500 rounded-xl flex items-center justify-center shadow-sm">
                <Upload className="w-4 h-4 text-white" />
              </div>
              Business Logo
            </h4>
            
            <div className="flex items-start gap-6">
              {/* Logo Preview */}
              {logoPreview ? (
                <div className="relative">
                  <div className="w-40 h-40 border-2 border-gray-200 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-sm">
                    <img 
                      src={logoPreview} 
                      alt="Business Logo" 
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg"
                    title="Remove logo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-40 h-40 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50">
                  <Upload className="w-10 h-10 text-gray-400" />
                </div>
              )}

              {/* Upload Button */}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className={`inline-flex items-center gap-2 px-6 py-3 border-2 border-gray-300 rounded-xl shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-all ${uploadingLogo ? 'opacity-50 cursor-not-allowed' : 'hover:border-purple-500 hover:shadow-md'}`}
                >
                  <Upload className="w-5 h-5" />
                  {uploadingLogo ? 'Uploading...' : logoPreview ? 'Change Logo' : 'Upload Logo'}
                </label>
                <p className="mt-3 text-sm text-gray-600">
                  Upload your business logo. Recommended size: 200x200px. Max size: 2MB. 
                  Supported formats: JPG, PNG, GIF, WebP.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default UnifiedBrandingSettings;

