// SupplierForm component for LATS module
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Building2, MessageSquare, ChevronDown, ChevronUp, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Validation schema
const supplierFormSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(100, 'Supplier name must be less than 100 characters'),
  company_name: z.string().max(100, 'Company name must be less than 100 characters').optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  contact_person: z.string().max(100, 'Contact person must be less than 100 characters').optional(),
  email: z.string().email('Invalid email format').max(100, 'Email must be less than 100 characters').optional().or(z.literal('')),
  phone: z.string().max(20, 'Phone number must be less than 20 characters').optional(),
  whatsapp: z.string().max(20, 'WhatsApp number must be less than 20 characters').optional(),
  wechat: z.string().max(50, 'WeChat ID must be less than 50 characters').optional(),
  address: z.string().max(200, 'Address must be less than 200 characters').optional(),
  city: z.string().max(50, 'City must be less than 50 characters').optional(),
  country: z.string().max(50, 'Country must be less than 50 characters').optional(),
  tax_id: z.string().max(50, 'Tax ID must be less than 50 characters').optional(),
  payment_terms: z.string().max(200, 'Payment terms must be less than 200 characters').optional(),
  preferred_currency: z.string().max(10, 'Currency code must be less than 10 characters').optional(),
  exchange_rate: z.union([z.number().min(0, 'Exchange rate must be positive'), z.string()]).optional().transform((val) => {
    if (val === '' || val === undefined || val === null) return undefined;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? undefined : num;
  }),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional()
});

type SupplierFormData = z.infer<typeof supplierFormSchema>;

interface Supplier {
  id: string;
  name: string;
  company_name?: string;
  description?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  wechat?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  payment_terms?: string;
  preferred_currency?: string;
  exchange_rate?: number;
  notes?: string;
  rating?: number;
  wechat_qr_code?: string;
  alipay_qr_code?: string;
  bank_account_details?: string;
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [wechatQRCode, setWechatQRCode] = useState<string | null>(supplier?.wechat_qr_code || null);
  const [alipayQRCode, setAlipayQRCode] = useState<string | null>(supplier?.alipay_qr_code || null);
  const [bankAccount, setBankAccount] = useState(supplier?.bank_account_details || '');
  
  // File input refs for manual triggering
  const wechatFileInputRef = React.useRef<HTMLInputElement>(null);
  const alipayFileInputRef = React.useRef<HTMLInputElement>(null);
  
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
      company_name: supplier?.company_name || '',
      description: supplier?.description || '',
      contact_person: supplier?.contact_person || '',
      email: supplier?.email || '',
      phone: supplier?.phone || '',
      whatsapp: supplier?.whatsapp || '',
      wechat: supplier?.wechat || '',
      address: supplier?.address || '',
      city: supplier?.city || '',
      country: supplier?.country || '',
      tax_id: supplier?.tax_id || '',
      payment_terms: supplier?.payment_terms || '',
      preferred_currency: supplier?.preferred_currency || 'TZS',
      exchange_rate: supplier?.exchange_rate || undefined,
      notes: supplier?.notes || ''
    }
  });

  // Watch form values
  const selectedCountry = watch('country');
  const selectedCurrency = watch('preferred_currency');
  const notesValue = watch('notes') || '';

  // Country-Currency mapping
  const countryCurrencyMap: Record<string, string> = {
    'Tanzania': 'TZS',
    'UAE': 'AED',
    'China': 'CNY',
    'Hong Kong': 'HKD',
    'India': 'INR',
    'Kenya': 'KES',
    'USA': 'USD',
    'UK': 'GBP',
    'Germany': 'EUR',
    'France': 'EUR',
    'Japan': 'JPY',
    'South Korea': 'KRW',
    'Singapore': 'SGD',
    'Thailand': 'THB',
    'Vietnam': 'VND',
    'Malaysia': 'MYR',
    'Indonesia': 'IDR',
    'Philippines': 'PHP',
    'Turkey': 'TRY',
    'Egypt': 'EGP',
    'South Africa': 'ZAR',
    'Nigeria': 'NGN',
    'Ghana': 'GHS',
    'Uganda': 'UGX',
    'Rwanda': 'RWF',
    'Ethiopia': 'ETB',
    'Morocco': 'MAD',
    'Saudi Arabia': 'SAR',
    'Pakistan': 'PKR'
  };

  // Auto-set currency based on country selection
  useEffect(() => {
    if (selectedCountry && !supplier) {
      const currency = countryCurrencyMap[selectedCountry];
      if (currency) {
        setValue('preferred_currency', currency);
      }
    }
  }, [selectedCountry, supplier, setValue]);

  // Handle QR code image upload
  const handleQRCodeUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'wechat' | 'alipay') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    try {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        try {
          const base64String = reader.result as string;
          if (!base64String) {
            toast.error('Failed to read image file');
            return;
          }
          
          if (type === 'wechat') {
            setWechatQRCode(base64String);
            toast.success('WeChat QR code uploaded');
          } else {
            setAlipayQRCode(base64String);
            toast.success('Alipay QR code uploaded');
          }
        } catch (error) {
          console.error('Error processing image:', error);
          toast.error('Failed to process image');
        }
      };
      
      reader.onerror = () => {
        console.error('FileReader error:', reader.error);
        toast.error('Failed to read image file. Please try again.');
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading QR code:', error);
      toast.error('Failed to upload image. Please try again.');
    }
    
    // Reset the input so the same file can be selected again if needed
    e.target.value = '';
  };

  // Remove QR code
  const removeQRCode = (type: 'wechat' | 'alipay') => {
    if (type === 'wechat') {
      setWechatQRCode(null);
    } else {
      setAlipayQRCode(null);
    }
  };

  // Handle form submission
  const handleFormSubmit = async (data: SupplierFormData) => {
    try {
      const submissionData = {
        ...data,
        wechat_qr_code: wechatQRCode || undefined,
        alipay_qr_code: alipayQRCode || undefined,
        bank_account_details: bankAccount || undefined,
        is_active: supplier?.is_active ?? true
      } as any;
      
      await onSubmit(submissionData);
      reset(data);
    } catch (error) {
      console.error('Supplier form submission error:', error);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    const cancelHandler = onCancel || onClose;
    if (!cancelHandler) return;

    if (isDirty) {
      if (confirm('Discard changes?')) {
        reset();
        cancelHandler();
      }
    } else {
      cancelHandler();
    }
  };

  // Country options
  const countryOptions = [
    'Tanzania', 'UAE', 'China', 'Hong Kong', 'India', 'Kenya', 'USA', 'UK', 
    'Germany', 'France', 'Japan', 'South Korea', 'Singapore', 'Thailand',
    'Vietnam', 'Malaysia', 'Indonesia', 'Philippines', 'Turkey', 'Egypt',
    'South Africa', 'Nigeria', 'Ghana', 'Uganda', 'Rwanda', 'Ethiopia',
    'Morocco', 'Saudi Arabia', 'Pakistan'
  ];

  // Currency options
  const currencyOptions = [
    { code: 'TZS', name: 'Tanzanian Shilling' },
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'CNY', name: 'Chinese Yuan' },
    { code: 'AED', name: 'UAE Dirham' },
    { code: 'INR', name: 'Indian Rupee' },
    { code: 'KES', name: 'Kenyan Shilling' },
    { code: 'HKD', name: 'Hong Kong Dollar' },
    { code: 'JPY', name: 'Japanese Yen' },
    { code: 'KRW', name: 'South Korean Won' },
    { code: 'SGD', name: 'Singapore Dollar' },
    { code: 'THB', name: 'Thai Baht' },
    { code: 'VND', name: 'Vietnamese Dong' },
    { code: 'MYR', name: 'Malaysian Ringgit' },
    { code: 'IDR', name: 'Indonesian Rupiah' },
    { code: 'PHP', name: 'Philippine Peso' },
    { code: 'TRY', name: 'Turkish Lira' },
    { code: 'EGP', name: 'Egyptian Pound' },
    { code: 'ZAR', name: 'South African Rand' },
    { code: 'NGN', name: 'Nigerian Naira' },
    { code: 'GHS', name: 'Ghanaian Cedi' },
    { code: 'UGX', name: 'Ugandan Shilling' },
    { code: 'RWF', name: 'Rwandan Franc' },
    { code: 'ETB', name: 'Ethiopian Birr' },
    { code: 'MAD', name: 'Moroccan Dirham' },
    { code: 'SAR', name: 'Saudi Riyal' },
    { code: 'PKR', name: 'Pakistani Rupee' }
  ];

  return (
    <div className={`bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto ${className}`}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {supplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <p className="text-xs text-gray-500">Update supplier information</p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Supplier Identity */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Supplier Identity</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Supplier Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier Name <span className="text-red-500">*</span>
              </label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <input
                    type="text"
                    {...field}
                    placeholder="Enter supplier name"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors text-gray-900 ${
                      errors.name ? 'border-red-500 focus:border-red-600' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                )}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <Controller
                name="company_name"
                control={control}
                render={({ field }) => (
                  <input
                    type="text"
                    {...field}
                    placeholder="Enter company name"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                  />
                )}
              />
            </div>

            {/* Contact Person */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Person
              </label>
              <Controller
                name="contact_person"
                control={control}
                render={({ field }) => (
                  <input
                    type="text"
                    {...field}
                    placeholder="Enter contact person name"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Contact Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <input
                    type="tel"
                    {...field}
                    placeholder="+255 123 456 789"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                  />
                )}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <input
                    type="email"
                    {...field}
                    placeholder="supplier@example.com"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors text-gray-900 ${
                      errors.email ? 'border-red-500 focus:border-red-600' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                )}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp
              </label>
              <div className="relative">
                <Controller
                  name="whatsapp"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="tel"
                      {...field}
                      placeholder="+255 123 456 789"
                      className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                    />
                  )}
                />
                <MessageSquare className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
              </div>
            </div>

            {/* WeChat */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WeChat ID
              </label>
              <div className="relative">
                <Controller
                  name="wechat"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="text"
                      {...field}
                      placeholder="Enter WeChat ID"
                      className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                    />
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-green-600 rounded-sm flex items-center justify-center">
                  <span className="text-white text-xs font-bold">W</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Location</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                  >
                    <option value="">Select country</option>
                    {countryOptions.map(country => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <Controller
                name="city"
                control={control}
                render={({ field }) => (
                  <input
                    type="text"
                    {...field}
                    placeholder="Enter city"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                  />
                )}
              />
            </div>

            {/* Full Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    rows={2}
                    placeholder="Enter full street address"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900 resize-none"
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Financial Terms */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Financial Terms</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Preferred Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Currency
              </label>
              <Controller
                name="preferred_currency"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                  >
                    <option value="">Select currency</option>
                    {currencyOptions.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>

            {/* Exchange Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exchange Rate
              </label>
              <Controller
                name="exchange_rate"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={field.value?.toString() || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        field.onChange(undefined);
                      } else {
                        const numValue = parseFloat(value);
                        field.onChange(isNaN(numValue) ? undefined : numValue);
                      }
                    }}
                    placeholder={`1 ${selectedCurrency || 'USD'} = ? TZS`}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors text-gray-900 ${
                      errors.exchange_rate ? 'border-red-500 focus:border-red-600' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                )}
              />
              {errors.exchange_rate && (
                <p className="text-red-500 text-sm mt-1">{errors.exchange_rate.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Options - Collapsible */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border-2 border-gray-200"
          >
            <span className="text-sm font-semibold text-gray-700">Advanced Options</span>
            {showAdvanced ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-4 p-4 border-2 border-gray-200 rounded-lg bg-gray-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tax ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax ID
                  </label>
                  <Controller
                    name="tax_id"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="text"
                        {...field}
                        placeholder="Enter tax identification number"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900 bg-white"
                      />
                    )}
                  />
                </div>

                {/* Payment Terms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Terms
                  </label>
                  <Controller
                    name="payment_terms"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="text"
                        {...field}
                        placeholder="e.g., Net 30, Net 60, COD"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900 bg-white"
                      />
                    )}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <textarea
                        {...field}
                        rows={3}
                        placeholder="Brief description of the supplier"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900 resize-none bg-white"
                      />
                    )}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <Controller
                    name="notes"
                    control={control}
                    render={({ field }) => (
                      <textarea
                        {...field}
                        rows={3}
                        placeholder="Any additional information about this supplier"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900 resize-none bg-white"
                      />
                    )}
                  />
                </div>
              </div>

              {/* Payment Information for Chinese Suppliers */}
              {selectedCountry === 'China' && (
                <div className="mt-6 pt-6 border-t-2 border-gray-300">
                  <div className="flex items-center gap-2 mb-4">
                    <h5 className="text-sm font-semibold text-gray-700">Payment Information</h5>
                    <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">🇨🇳 China</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* WeChat Pay QR Code */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        WeChat Pay QR Code
                      </label>
                      {!wechatQRCode ? (
                        <div 
                          onClick={() => wechatFileInputRef.current?.click()}
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors bg-white"
                        >
                          <Upload className="w-6 h-6 text-gray-400 mb-1" />
                          <p className="text-xs text-gray-500">Upload WeChat QR</p>
                          <p className="text-xs text-gray-400 mt-1">Click to browse</p>
                          <input
                            ref={wechatFileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleQRCodeUpload(e, 'wechat')}
                          />
                        </div>
                      ) : (
                        <div className="relative w-full h-32 border-2 border-green-300 rounded-lg overflow-hidden bg-green-50">
                          <img
                            src={wechatQRCode}
                            alt="WeChat QR Code"
                            className="w-full h-full object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => removeQRCode('wechat')}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-green-600/90 text-white text-xs py-1 px-2 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            WeChat Pay
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Alipay QR Code */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Alipay QR Code
                      </label>
                      {!alipayQRCode ? (
                        <div 
                          onClick={() => alipayFileInputRef.current?.click()}
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors bg-white"
                        >
                          <Upload className="w-6 h-6 text-gray-400 mb-1" />
                          <p className="text-xs text-gray-500">Upload Alipay QR</p>
                          <p className="text-xs text-gray-400 mt-1">Click to browse</p>
                          <input
                            ref={alipayFileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleQRCodeUpload(e, 'alipay')}
                          />
                        </div>
                      ) : (
                        <div className="relative w-full h-32 border-2 border-blue-300 rounded-lg overflow-hidden bg-blue-50">
                          <img
                            src={alipayQRCode}
                            alt="Alipay QR Code"
                            className="w-full h-full object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => removeQRCode('alipay')}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-blue-600/90 text-white text-xs py-1 px-2 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            Alipay
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bank Account Details */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bank Account Details
                      </label>
                      <textarea
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        rows={2}
                        placeholder="Bank name, Account number, SWIFT/BIC code, etc."
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900 resize-none bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !isDirty}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : supplier ? 'Update Supplier' : 'Create Supplier'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SupplierForm;
