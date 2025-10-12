// SupplierForm component for LATS module
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LATS_CLASSES } from '../../../tokens';
import GlassCard from '../../../shared/components/ui/GlassCard';
import GlassInput from '../../../shared/components/ui/GlassInput';
import GlassSelect from '../../../shared/components/ui/GlassSelect';
import GlassButton from '../../../shared/components/ui/GlassButton';
import GlassBadge from '../../../shared/components/ui/GlassBadge';
import { t } from '../../lib/i18n/t';
import { AlertTriangle } from 'lucide-react';

// Validation schema - updated to match actual database schema
const supplierFormSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(100, 'Supplier name must be less than 100 characters'),
  contact_person: z.string().max(100, 'Contact person must be less than 100 characters').optional(),
  email: z.string().email('Invalid email format').max(100, 'Email must be less than 100 characters').optional().or(z.literal('')),
  address: z.string().max(200, 'Address must be less than 200 characters').optional(),
  phone: z.string().max(20, 'Phone number must be less than 20 characters').optional(),
  city: z.string().max(50, 'City must be less than 50 characters').optional(),
  country: z.string().max(50, 'Country must be less than 50 characters').optional(),
  tax_id: z.string().max(50, 'Tax ID must be less than 50 characters').optional(),
  payment_terms: z.string().max(200, 'Payment terms must be less than 200 characters').optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
  rating: z.number().min(0).max(5).optional(),
  is_active: z.boolean().optional()
});

type SupplierFormData = z.infer<typeof supplierFormSchema>;

interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  address?: string;
  phone?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  payment_terms?: string;
  notes?: string;
  rating?: number;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

interface SupplierFormProps {
  supplier?: Supplier;
  onSubmit: (data: SupplierFormData) => Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
  loading?: boolean;
  className?: string;
}

const SupplierForm: React.FC<SupplierFormProps> = ({
  supplier,
  onSubmit,
  onCancel,
  onClose,
  loading = false,
  className = ''
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  // Form setup
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    reset,
    setValue
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: supplier?.name || '',
      contact_person: supplier?.contact_person || '',
      email: supplier?.email || '',
      address: supplier?.address || '',
      phone: supplier?.phone || '',
      city: supplier?.city || '',
      country: supplier?.country || '',
      tax_id: supplier?.tax_id || '',
      payment_terms: supplier?.payment_terms || '',
      notes: supplier?.notes || '',
      rating: supplier?.rating || undefined,
      is_active: supplier?.is_active ?? true, // Default to true for new suppliers
    }
  });

  // Watch form values
  const watchedValues = watch();
  const selectedCountry = watchedValues.country;
  const showWeChatField = selectedCountry === 'CN';

  // Handle form submission
  const handleFormSubmit = async (data: SupplierFormData) => {
    try {
      // Ensure new suppliers are always active by default
      const submissionData = {
        ...data,
        is_active: data.is_active ?? true // Default to true if not set
      };
      
      await onSubmit(submissionData);
      reset(submissionData); // Reset form with new values
    } catch (error) {
      console.error('Supplier form submission error:', error);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    const cancelHandler = onCancel || onClose;
    if (!cancelHandler) {
      console.warn('SupplierForm: No cancel handler provided');
      return;
    }

    if (isDirty) {
      if (confirm(t('common.confirmDiscard'))) {
        reset();
        cancelHandler();
      }
    } else {
      cancelHandler();
    }
  };

  // Country options with flags
  const countryOptions = [
    { value: 'TZ', label: 'Tanzania', flag: '🇹🇿' },
    { value: 'AE', label: 'UAE', flag: '🇦🇪' },
    { value: 'CN', label: 'China', flag: '🇨🇳' },
    { value: 'US', label: 'United States', flag: '🇺🇸' },
    { value: 'CA', label: 'Canada', flag: '🇨🇦' },
    { value: 'UK', label: 'United Kingdom', flag: '🇬🇧' },
    { value: 'DE', label: 'Germany', flag: '🇩🇪' },
    { value: 'FR', label: 'France', flag: '🇫🇷' },
    { value: 'JP', label: 'Japan', flag: '🇯🇵' },
    { value: 'IN', label: 'India', flag: '🇮🇳' },
    { value: 'BR', label: 'Brazil', flag: '🇧🇷' },
    { value: 'AU', label: 'Australia', flag: '🇦🇺' },
    { value: 'KE', label: 'Kenya', flag: '🇰🇪' },
    { value: 'UG', label: 'Uganda', flag: '🇺🇬' },
    { value: 'RW', label: 'Rwanda', flag: '🇷🇼' },
    { value: 'ET', label: 'Ethiopia', flag: '🇪🇹' },
    { value: 'NG', label: 'Nigeria', flag: '🇳🇬' },
    { value: 'ZA', label: 'South Africa', flag: '🇿🇦' },
    { value: 'EG', label: 'Egypt', flag: '🇪🇬' },
    { value: 'SA', label: 'Saudi Arabia', flag: '🇸🇦' },
    { value: 'TR', label: 'Turkey', flag: '🇹🇷' },
    { value: 'RU', label: 'Russia', flag: '🇷🇺' },
    { value: 'KR', label: 'South Korea', flag: '🇰🇷' },
    { value: 'SG', label: 'Singapore', flag: '🇸🇬' },
    { value: 'MY', label: 'Malaysia', flag: '🇲🇾' },
    { value: 'TH', label: 'Thailand', flag: '🇹🇭' },
    { value: 'VN', label: 'Vietnam', flag: '🇻🇳' },
    { value: 'ID', label: 'Indonesia', flag: '🇮🇩' },
    { value: 'PH', label: 'Philippines', flag: '🇵🇭' }
  ];



  // Currency options with flags
  const currencyOptions = [
    { value: 'TZS', label: 'Tanzanian Shilling (TZS)', flag: '🇹🇿' },
    { value: 'AED', label: 'UAE Dirham (AED)', flag: '🇦🇪' },
    { value: 'CNY', label: 'Chinese Yuan (CNY)', flag: '🇨🇳' },
    { value: 'USD', label: 'US Dollar (USD)', flag: '🇺🇸' },
    { value: 'CAD', label: 'Canadian Dollar (CAD)', flag: '🇨🇦' },
    { value: 'GBP', label: 'British Pound (GBP)', flag: '🇬🇧' },
    { value: 'EUR', label: 'Euro (EUR)', flag: '🇪🇺' },
    { value: 'JPY', label: 'Japanese Yen (JPY)', flag: '🇯🇵' },
    { value: 'INR', label: 'Indian Rupee (INR)', flag: '🇮🇳' },
    { value: 'BRL', label: 'Brazilian Real (BRL)', flag: '🇧🇷' },
    { value: 'AUD', label: 'Australian Dollar (AUD)', flag: '🇦🇺' },
    { value: 'KES', label: 'Kenyan Shilling (KES)', flag: '🇰🇪' },
    { value: 'UGX', label: 'Ugandan Shilling (UGX)', flag: '🇺🇬' },
    { value: 'RWF', label: 'Rwandan Franc (RWF)', flag: '🇷🇼' },
    { value: 'ETB', label: 'Ethiopian Birr (ETB)', flag: '🇪🇹' },
    { value: 'NGN', label: 'Nigerian Naira (NGN)', flag: '🇳🇬' },
    { value: 'ZAR', label: 'South African Rand (ZAR)', flag: '🇿🇦' },
    { value: 'EGP', label: 'Egyptian Pound (EGP)', flag: '🇪🇬' },
    { value: 'SAR', label: 'Saudi Riyal (SAR)', flag: '🇸🇦' },
    { value: 'TRY', label: 'Turkish Lira (TRY)', flag: '🇹🇷' },
    { value: 'RUB', label: 'Russian Ruble (RUB)', flag: '🇷🇺' },
    { value: 'KRW', label: 'South Korean Won (KRW)', flag: '🇰🇷' },
    { value: 'SGD', label: 'Singapore Dollar (SGD)', flag: '🇸🇬' },
    { value: 'MYR', label: 'Malaysian Ringgit (MYR)', flag: '🇲🇾' },
    { value: 'THB', label: 'Thai Baht (THB)', flag: '🇹🇭' },
    { value: 'VND', label: 'Vietnamese Dong (VND)', flag: '🇻🇳' },
    { value: 'IDR', label: 'Indonesian Rupiah (IDR)', flag: '🇮🇩' },
    { value: 'PHP', label: 'Philippine Peso (PHP)', flag: '🇵🇭' }
  ];

  // Map of countries to their default currencies
  const countryCurrencyMap: { [key: string]: string } = {
    TZ: 'TZS', // Tanzania
    AE: 'AED', // UAE
    CN: 'CNY', // China
    US: 'USD', // United States
    CA: 'CAD', // Canada
    UK: 'GBP', // United Kingdom
    DE: 'EUR', // Germany
    FR: 'EUR', // France
    JP: 'JPY', // Japan
    IN: 'INR', // India
    BR: 'BRL', // Brazil
    AU: 'AUD', // Australia
    KE: 'KES', // Kenya
    UG: 'UGX', // Uganda
    RW: 'RWF', // Rwanda
    ET: 'ETB', // Ethiopia
    NG: 'NGN', // Nigeria
    ZA: 'ZAR', // South Africa
    EG: 'EGP', // Egypt
    SA: 'SAR', // Saudi Arabia
    TR: 'TRY', // Turkey
    RU: 'RUB', // Russia
    KR: 'KRW', // South Korea
    SG: 'SGD', // Singapore
    MY: 'MYR', // Malaysia
    TH: 'THB', // Thailand
    VN: 'VND', // Vietnam
    ID: 'IDR', // Indonesia
    PH: 'PHP'  // Philippines
  };

  return (
    <GlassCard className={`max-w-2xl mx-auto ${className}`}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-lats-text">
              {supplier ? t('common.edit') : t('common.add')} {t('common.supplier')}
            </h2>
            <p className="text-sm text-lats-text-secondary mt-1">
              {supplier ? 'Update supplier information' : 'Create a new supplier'}
            </p>
          </div>
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-lats-text">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <GlassInput
                  label={t('common.name')}
                  placeholder="Enter supplier name"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.name?.message}
                  required
                  maxLength={100}
                />
              )}
            />

            {/* Contact Person */}
            <Controller
              name="contact_person"
              control={control}
              render={({ field }) => (
                <GlassInput
                  label="Contact Person"
                  placeholder="Enter contact person name (optional)"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.contact_person?.message}
                  maxLength={100}
                  helperText="The person to contact at this supplier"
                />
              )}
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-lats-text">Contact Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Phone */}
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <GlassInput
                  label="Phone"
                  placeholder="+1 (555) 123-4567"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.phone?.message}
                  maxLength={20}
                  helperText="Primary phone number"
                />
              )}
            />

            {/* Email */}
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <GlassInput
                  label="Email"
                  placeholder="supplier@example.com"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.email?.message}
                  maxLength={100}
                  helperText="Email address for communications"
                />
              )}
            />
          </div>
        </div>

        {/* Location Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-lats-text">Location Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Country */}
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <GlassInput
                  label="Country"
                  placeholder="Enter country"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.country?.message}
                  maxLength={50}
                  helperText="Supplier's country"
                />
              )}
            />

            {/* City */}
            <Controller
              name="city"
              control={control}
              render={({ field }) => (
                <GlassInput
                  label="City"
                  placeholder="Enter city"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.city?.message}
                  maxLength={50}
                  helperText="Supplier's city"
                />
              )}
            />

            {/* Address */}
            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <GlassInput
                  label="Address"
                  placeholder="Enter street address"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.address?.message}
                  maxLength={200}
                  helperText="Full street address"
                  multiline
                  rows={2}
                />
              )}
            />
          </div>
        </div>

        {/* Business Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-lats-text">Business Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tax ID */}
            <Controller
              name="tax_id"
              control={control}
              render={({ field }) => (
                <GlassInput
                  label="Tax ID"
                  placeholder="Enter tax identification number"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.tax_id?.message}
                  maxLength={50}
                  helperText="Tax identification number (optional)"
                />
              )}
            />

            {/* Payment Terms */}
            <Controller
              name="payment_terms"
              control={control}
              render={({ field }) => (
                <GlassInput
                  label="Payment Terms"
                  placeholder="e.g., Net 30, Net 60, COD"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.payment_terms?.message}
                  maxLength={200}
                  helperText="Payment terms for this supplier"
                />
              )}
            />

            {/* Rating - Not implemented in form yet, placeholder for future */}
            <Controller
              name="rating"
              control={control}
              render={({ field }) => (
                <GlassInput
                  label="Rating"
                  placeholder="Enter rating (0-5)"
                  type="number"
                  value={field.value?.toString() || ''}
                  onChange={(value) => field.onChange(value ? parseFloat(value) : undefined)}
                  error={errors.rating?.message}
                  helperText="Supplier rating (0-5 stars)"
                  min={0}
                  max={5}
                  step={0.1}
                />
              )}
            />
          </div>
        </div>

        {/* Remove old Currency section - replaced with placeholder */}
        <div className="hidden">
          <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <GlassSelect
                  label="Country"
                  placeholder="Select country"
                  value={field.value}
                  onChange={field.onChange}
                  options={currencyOptions.map(currency => ({
                    value: currency.value,
                    label: `${currency.flag} ${currency.label}`
                  }))}
                  error={errors.country?.message}
                />
              )}
            />
          </div>
        </div>

        {/* Old currency section removed as currency field doesn't exist in database */}

        {/* Notes */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-lats-text">Additional Information</h3>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <GlassInput
                  placeholder="Enter additional notes about this supplier"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.notes?.message}
                  multiline
                  rows={2}
                  maxLength={1000}
                  helperText={`${field.value?.length || 0}/1000 characters`}
                />
              )}
            />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-lats-text">Status</h3>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-sm text-green-700">
                <p className="font-medium mb-1">New suppliers are automatically active</p>
                <p>
                  All new suppliers are set to active by default. You can change this status if needed.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    Active Supplier
                  </label>
                </div>
              )}
            />
            <span className="text-sm text-gray-500">
              {watch('is_active') ? 'This supplier is currently active' : 'This supplier is currently inactive'}
            </span>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-lats-glass-border">
          <GlassButton
            type="submit"
            variant="primary"
            loading={loading}
            disabled={!isDirty}
            className="flex-1 sm:flex-none"
          >
            {loading ? 'Saving...' : supplier ? 'Update Supplier' : 'Create Supplier'}
          </GlassButton>
          
          <GlassButton
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </GlassButton>
        </div>
      </form>
    </GlassCard>
  );
};

// Export with display name for debugging
SupplierForm.displayName = 'SupplierForm';

export default SupplierForm;
