import React, { useState, useEffect, useRef } from 'react';
import { Building2, Upload, X, Save, Share2 } from 'lucide-react';
// Removed GlassCard, GlassButton - using native elements matching SetPricingModal style
import { supabase } from '../../../lib/supabaseClient';
import { businessInfoService } from '../../../lib/businessInfoService';
import toast from 'react-hot-toast';
import { useSettingsSave } from '../../../context/SettingsSaveContext';
import { MultiPhoneInput } from '../../../components/ui/MultiPhoneInput';

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
    businessLogo: null as string | null,
    businessInstagram: '',
    businessTiktok: '',
    businessWhatsapp: ''
  });

  useEffect(() => {
    fetchBusinessInfo();
  }, []);

  const fetchBusinessInfo = async () => {
    try {
      setLoading(true);
      
      // Fetch all fields including social media columns
      // @ts-ignore - Neon query builder implements thenable interface
      const { data: baseData, error: baseError } = await supabase
        .from('lats_pos_general_settings')
        .select('id, business_name, business_phone, business_email, business_website, business_address, business_logo, business_instagram, business_tiktok, business_whatsapp')
        .limit(1)
        .single();

      if (baseError) {
        // If error is about missing columns, try without them
        if (baseError.code === '42703') {
          console.warn('⚠️ Social media columns may not exist, fetching without them');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('lats_pos_general_settings')
            .select('id, business_name, business_phone, business_email, business_website, business_address, business_logo')
            .limit(1)
            .single();
          
          if (fallbackError) throw fallbackError;
          
          if (fallbackData) {
            setSettingsId(fallbackData.id);
            setFormData({
              businessName: fallbackData.business_name || '',
              businessPhone: fallbackData.business_phone || '',
              businessEmail: fallbackData.business_email || '',
              businessWebsite: fallbackData.business_website || '',
              businessAddress: fallbackData.business_address || '',
              businessLogo: fallbackData.business_logo || null,
              businessInstagram: '',
              businessTiktok: '',
              businessWhatsapp: ''
            });
            setLogoPreview(fallbackData.business_logo || null);
            return;
          }
        }
        throw baseError;
      }

      if (!baseData) {
        throw new Error('No settings record found');
      }

      // Set all data including social media fields
      setSettingsId(baseData.id);
      const formDataToSet = {
        businessName: baseData.business_name || '',
        businessPhone: baseData.business_phone || '',
        businessEmail: baseData.business_email || '',
        businessWebsite: baseData.business_website || '',
        businessAddress: baseData.business_address || '',
        businessLogo: baseData.business_logo || null,
        businessInstagram: baseData.business_instagram || '',
        businessTiktok: baseData.business_tiktok || '',
        businessWhatsapp: baseData.business_whatsapp || ''
      };
      setLogoPreview(baseData.business_logo || null);
      
      console.log('✅ Loaded business info with social media:', {
        instagram: formDataToSet.businessInstagram,
        tiktok: formDataToSet.businessTiktok,
        whatsapp: formDataToSet.businessWhatsapp
      });
      
      setFormData(formDataToSet);
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
      
      // First, prepare basic data without social media columns
      const basicUpdateData = {
        business_name: formData.businessName || null,
        business_phone: formData.businessPhone || null,
        business_email: formData.businessEmail || null,
        business_website: formData.businessWebsite || null,
        business_address: formData.businessAddress || null,
        business_logo: formData.businessLogo || null,
        updated_at: new Date().toISOString()
      };
      
      // Try to save basic data first
      console.log('💾 Saving basic business info...');
      
      // @ts-ignore - Neon query builder implements thenable interface
      let { data, error } = await supabase
        .from('lats_pos_general_settings')
        .update(basicUpdateData)
        .eq('id', settingsId)
        .select();

      if (error) {
        throw error;
      }
      
      // Try to save social media columns if they have values
      if (formData.businessInstagram?.trim() || formData.businessTiktok?.trim() || formData.businessWhatsapp?.trim()) {
        try {
          const socialData: any = {};
          if (formData.businessInstagram?.trim()) socialData.business_instagram = formData.businessInstagram.trim();
          if (formData.businessTiktok?.trim()) socialData.business_tiktok = formData.businessTiktok.trim();
          if (formData.businessWhatsapp?.trim()) socialData.business_whatsapp = formData.businessWhatsapp.trim();
          
          console.log('💾 Attempting to save social media fields:', socialData);
          
          // @ts-ignore - Neon query builder implements thenable interface
          const { data: socialResult, error: socialError } = await supabase
            .from('lats_pos_general_settings')
            .update(socialData)
            .eq('id', settingsId)
            .select('business_instagram, business_tiktok, business_whatsapp');
          
          if (socialError) {
            console.error('❌ Error saving social media fields:', socialError);
            console.error('   Error code:', socialError.code);
            console.error('   Error message:', socialError.message);
            // Don't throw - basic info is already saved
          } else {
            console.log('✅ Social media fields saved successfully:', socialResult?.[0]);
          }
        } catch (err: any) {
          console.error('❌ Exception saving social media fields:', err);
          // Don't throw - basic info is already saved
        }
      }
      
      console.log('✅ Successfully saved business info:', {
        saved: data?.[0],
        instagram: data?.[0]?.business_instagram,
        tiktok: data?.[0]?.business_tiktok,
        whatsapp: data?.[0]?.business_whatsapp
      });

      // Clear business info cache to force all components to refresh
      businessInfoService.clearCache();
      
      // Notify other components to refresh
      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { type: 'general' } }));
      
      toast.success('Business information updated successfully - All components will refresh');
    } catch (error: any) {
      console.error('Error updating business info:', error);
      
      // Check if it's a missing column error for social media
      const errorMessage = String(error.message || '').toLowerCase();
      if (errorMessage.includes('business_instagram') || errorMessage.includes('business_tiktok') || errorMessage.includes('business_whatsapp') || errorMessage.includes('does not exist')) {
        console.warn('⚠️ Social media columns may not exist in this database connection');
        toast.error(`Failed to update business information: ${error.message || 'Database column error'}`);
      } else {
        toast.error(`Failed to update business information: ${error.message || 'Unknown error'}`);
      }
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

              <div className="md:col-span-2">
                <MultiPhoneInput
                  value={formData.businessPhone}
                  onChange={(value) => setFormData({ ...formData, businessPhone: value })}
                  placeholder="+255 123 456 789"
                  label="Business Phone"
                  maxPhones={5}
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

          {/* Social Media Section */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-sm">
                <Share2 className="w-4 h-4 text-white" />
              </div>
              Social Media
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Instagram Handle
                </label>
                <input
                  type="text"
                  value={formData.businessInstagram}
                  onChange={(e) => setFormData({ ...formData, businessInstagram: e.target.value })}
                  placeholder="@yourhandle"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-gray-900 font-medium bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  TikTok Handle
                </label>
                <input
                  type="text"
                  value={formData.businessTiktok}
                  onChange={(e) => setFormData({ ...formData, businessTiktok: e.target.value })}
                  placeholder="@yourhandle"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200 text-gray-900 font-medium bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={formData.businessWhatsapp}
                  onChange={(e) => setFormData({ ...formData, businessWhatsapp: e.target.value })}
                  placeholder="+255 123 456 789"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 text-gray-900 font-medium bg-white"
                />
              </div>
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

