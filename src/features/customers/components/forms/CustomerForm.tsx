import React, { ReactNode, useState, useEffect, useRef, useMemo } from 'react';
import { User, Phone, MapPin, Tag, Check, RefreshCw, X, ArrowLeft, AlertTriangle, ChevronDown, Users, UserCheck, Facebook, Instagram, Globe, CreditCard, Newspaper, Search, Building, Calendar, HelpCircle } from 'lucide-react';
// import FloatingActionBar from '../ui/FloatingActionBar';
// import { addCustomer } from '../../../services/customer.services'; // Not used in this context
import { supabase } from '../../../../lib/supabaseClient';
import { saveActionOffline } from '../../../../lib/offlineSync';
import { useDraftForm } from '../../../../lib/useDraftForm';
import { formatTanzaniaPhoneNumber, formatTanzaniaWhatsAppNumber } from '../../../lib/phoneUtils';

// Define ActionButton type for local use
export interface ActionButton {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  disabled?: boolean;
}

// Update types to include id
type CustomerFormValues = Omit<
  {
    id?: string;
    name: string;
    email: string;
    phone: string;
    whatsapp: string;
    gender: 'male' | 'female';
    city: string;
    birthMonth: string;
    birthDay: string;
    referralSource: string;
    notes: string;
    referralSourceCustom?: string;
  }, 'customerTag'>;

interface CustomerFormProps {
  onSubmit: (values: CustomerFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  initialValues?: Partial<CustomerFormValues>;
  showBackAction?: boolean;
  onBack?: () => void;
  renderActionsInModal?: boolean;
  children?: (actions: ReactNode, formFields: ReactNode) => ReactNode;
}

const defaultValues: CustomerFormValues = {
  name: '',
  email: '',
  phone: '',
  whatsapp: '',
  gender: '' as any, // No default
  city: '',
  birthMonth: '',
  birthDay: '',
  referralSource: '',
  notes: '',
  referralSourceCustom: '' // Initialize custom referral source
};

// Normalize phone number for comparison (removes +, spaces, and converts to standard format)
const normalizePhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Handle different formats:
  // +255123456789 -> 255123456789
  // 0123456789 -> 255123456789 (assumes Tanzania)
  // 123456789 -> 255123456789 (assumes Tanzania)
  if (digits.startsWith('255')) {
    return digits;
  } else if (digits.startsWith('0')) {
    return '255' + digits.substring(1);
  } else if (digits.length === 9) {
    return '255' + digits;
  }
  return digits;
};

// Validate Tanzania phone number format
const isValidTanzaniaPhone = (phone: string): boolean => {
  const normalized = normalizePhoneNumber(phone);
  // Tanzania numbers: 255 + 9 digits (total 12 digits)
  // Valid prefixes after 255: 6, 7 (mobile)
  return /^255[67]\d{8}$/.test(normalized);
};


const CustomerForm: React.FC<CustomerFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  initialValues = {},
  showBackAction = false,
  onBack,
  renderActionsInModal = false,
  children
}) => {
  const [formData, setFormData] = useState<CustomerFormValues>({ ...defaultValues, ...initialValues });
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [hasWhatsapp, setHasWhatsapp] = useState(true);
  const [duplicateCustomers, setDuplicateCustomers] = useState<any[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showDayDropdown, setShowDayDropdown] = useState(false);
  const [showReferralDropdown, setShowReferralDropdown] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [offlineSuccess, setOfflineSuccess] = useState(false);
  
  // Ref for auto-focus
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on name field when form mounts
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  // Draft-saving hook
  const { clearDraft } = useDraftForm<CustomerFormValues>({
    key: 'customer_form_draft',
    formData,
    setFormData,
    clearOnSubmit: true,
    submitted,
  });

  // Autofill form when initialValues change (e.g., when opening edit modal)
  useEffect(() => {
    // Always set formData from initialValues when they change
    setFormData({ ...defaultValues, ...initialValues });
    // eslint-disable-next-line
  }, [JSON.stringify(initialValues)]);

  const handleReset = () => {
    setFormData({ ...defaultValues });
    clearDraft();
  };

  // Tanzania regions array
  const tanzaniaRegions = [
    'Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Mbeya', 'Tanga', 'Morogoro', 
    'Iringa', 'Tabora', 'Kigoma', 'Mara', 'Kagera', 'Shinyanga', 'Singida', 
    'Rukwa', 'Ruvuma', 'Lindi', 'Mtwara', 'Pwani', 'Manyara', 'Geita', 
    'Simiyu', 'Katavi', 'Njombe', 'Songwe'
  ];

  // Months array
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Days array (1-31)
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

  interface ReferralSource {
    label: string;
    icon: React.ReactNode;
  }

  // TikTok Logo Component
  const TikTokIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );

  const referralSources: ReferralSource[] = [
    { label: 'Friend', icon: <Users className="w-5 h-5" /> },
    { label: 'Walk-in', icon: <UserCheck className="w-5 h-5" /> },
    { label: 'Facebook', icon: <Facebook className="w-5 h-5" /> },
    { label: 'Instagram', icon: <Instagram className="w-5 h-5" /> },
    { label: 'Tiktok', icon: <TikTokIcon /> },
    { label: 'Website', icon: <Globe className="w-5 h-5" /> },
    { label: 'Business Card', icon: <CreditCard className="w-5 h-5" /> },
    { label: 'Newspaper', icon: <Newspaper className="w-5 h-5" /> },
    { label: 'Google Search', icon: <Search className="w-5 h-5" /> },
    { label: 'Billboard', icon: <Building className="w-5 h-5" /> },
    { label: 'Event', icon: <Calendar className="w-5 h-5" /> },
    { label: 'Other', icon: <HelpCircle className="w-5 h-5" /> },
  ];

  // Add a prop for customerId to know if we're editing
  const customerId = initialValues?.id;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      
      // Close region dropdown
      if (showRegionDropdown && !target.closest('[data-dropdown="region"]')) {
        setShowRegionDropdown(false);
      }
      
      // Close month dropdown
      if (showMonthDropdown && !target.closest('[data-dropdown="month"]')) {
        setShowMonthDropdown(false);
      }
      
      // Close day dropdown
      if (showDayDropdown && !target.closest('[data-dropdown="day"]')) {
        setShowDayDropdown(false);
      }
      
      // Close referral dropdown
      if (showReferralDropdown && !target.closest('[data-dropdown="referral"]')) {
        setShowReferralDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showRegionDropdown, showMonthDropdown, showDayDropdown, showReferralDropdown]);

  // Check for duplicate phone numbers
  const checkDuplicatePhone = async (phone: string) => {
    if (!phone || phone.length < 9) return;
    
    setCheckingPhone(true);
    try {
      // Normalize the input phone for comparison
      const normalizedInput = normalizePhoneNumber(phone);
      
      // Get all customers and check for normalized matches
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, email');
      
      if (error) {
        console.error('Error checking phone:', error);
        return;
      }
      
      // Find duplicates by normalizing and comparing
      const duplicates = data 
        ? data.filter((c: any) => {
            const normalizedExisting = normalizePhoneNumber(c.phone || '');
            return normalizedExisting === normalizedInput && (!customerId || c.id !== customerId);
          })
        : [];
      
      if (duplicates.length > 0) {
        setDuplicateCustomers(duplicates);
        setShowDuplicateWarning(true);
        setValidationErrors(prev => ({
          ...prev,
          phone: customerId ? 'Another customer with this phone number already exists.' : 'A customer with this phone number already exists.'
        }));
      } else {
        setDuplicateCustomers([]);
        setShowDuplicateWarning(false);
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.phone;
          return newErrors;
        });
      }
    } catch (error) {
      console.error('Error checking duplicate phone:', error);
    } finally {
      setCheckingPhone(false);
    }
  };

  // Debounced phone check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.phone && formData.phone.length >= 10) {
        checkDuplicatePhone(formData.phone);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.phone]);



  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Smart capitalize for name field (handles multi-word names properly)
    let processedValue = value;
    if (name === 'name') {
      processedValue = value
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
    
    // Auto-fill WhatsApp number when phone number changes and WhatsApp is enabled
    if (name === 'phone' && hasWhatsapp) {
      setFormData(prev => ({ ...prev, whatsapp: processedValue }));
    }
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    const errors: { [key: string]: string } = {};
    
    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    // Phone validation
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!isValidTanzaniaPhone(formData.phone)) {
      errors.phone = 'Please enter a valid Tanzania phone number (e.g., 0712345678 or +255712345678)';
    }
    
    // Duplicate check
    if (showDuplicateWarning && duplicateCustomers.length > 0) {
      errors.phone = 'A customer with this phone number already exists. Please use a different phone number.';
    }
    
    // Gender validation
    if (!formData.gender) {
      errors.gender = 'Gender is required';
    }
    
    // Birthday validation (if both month and day are provided)
    if (formData.birthMonth || formData.birthDay) {
      if (!formData.birthMonth) {
        errors.birthMonth = 'Birth month is required if birthday is provided';
      }
      if (!formData.birthDay) {
        errors.birthDay = 'Birth day is required if birthday is provided';
      }
      
      // Validate day is valid for the month
      if (formData.birthMonth && formData.birthDay) {
        const monthIndex = months.indexOf(formData.birthMonth);
        const day = parseInt(formData.birthDay);
        const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        
        if (monthIndex >= 0 && day > daysInMonth[monthIndex]) {
          errors.birthDay = `${formData.birthMonth} has only ${daysInMonth[monthIndex]} days`;
        }
      }
    }
    
    // WhatsApp validation (if enabled and provided)
    if (hasWhatsapp && formData.whatsapp && !isValidTanzaniaPhone(formData.whatsapp)) {
      errors.whatsapp = 'Please enter a valid WhatsApp number';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    if (navigator.onLine) {
      try {
        await onSubmit(formData);
        setSubmitted(true); // Clear draft on successful submit
      } catch (error) {
        // Optionally handle error
      }
    } else {
      await saveActionOffline({ type: 'submitData', payload: formData });
      setOfflineSuccess(true);
      setFormData({ ...defaultValues });
      setTimeout(() => setOfflineSuccess(false), 3000);
    }
  };

  const isEditMode = !!formData.id;

  // Action buttons for both modal and page
  const actionButtons = [
    showBackAction && onBack ? {
      icon: <ArrowLeft />, label: 'Back', onClick: onBack, color: 'primary',
    } : null,
    {
      icon: <X />, label: 'Cancel', onClick: onCancel, color: 'danger',
    },
    {
      icon: <RefreshCw />, label: 'Reset', onClick: handleReset, color: 'secondary',
    },
    {
      icon: isLoading ? <RefreshCw className="animate-spin" /> : <Check />, 
      label: isLoading ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Customer' : 'Add Customer'), 
      onClick: () => {}, // Submit button - onClick will be ignored, form submit handles it
      color: 'success', 
      disabled: isLoading,
    },
  ].filter(Boolean) as ActionButton[];

  // Use referralSources in original order (no sorting by clicks)
  const sortedReferralSources = referralSources;

  // Memoize filtered regions for performance
  const filteredRegions = useMemo(() => {
    return tanzaniaRegions.filter(region => 
      region.toLowerCase().includes(formData.city.toLowerCase()) || 
      formData.city === ''
    );
  }, [formData.city]);

  // Memoize filtered months for performance
  const filteredMonths = useMemo(() => {
    return months.filter(month => 
      month.toLowerCase().includes(formData.birthMonth.toLowerCase()) || 
      formData.birthMonth === ''
    );
  }, [formData.birthMonth]);

  // Memoize filtered days for performance
  const filteredDays = useMemo(() => {
    return days.filter(day => 
      day.includes(formData.birthDay) || 
      formData.birthDay === ''
    );
  }, [formData.birthDay]);

  function handleReferralClick(label: string) {
    setFormData(prev => ({ ...prev, referralSource: label }));
  }

  // Reusable form fields component
  const renderFormFields = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Name */}
      <div className="md:col-span-2">
        <label className="block text-gray-700 mb-2 font-medium">
          Name <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            ref={nameInputRef}
            type="text"
            name="name"
            value={formData.name || ''}
            onChange={handleInputChange}
            className={`w-full py-3 pl-12 pr-4 border-2 rounded-xl focus:outline-none transition-colors text-gray-900 ${
              validationErrors.name
                ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                : 'border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
            }`}
            placeholder="Enter customer name"
            required
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={100}
            aria-label="Customer name"
            aria-required="true"
          />
          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
        </div>
        {validationErrors.name && (
          <div className="mt-1 text-sm text-red-600 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            {validationErrors.name}
          </div>
        )}
      </div>
      {/* Phone Number */}
      <div>
        <label className="block text-gray-700 mb-2 font-medium">
          Phone Number <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="tel"
            name="phone"
            value={formData.phone || ''}
            onChange={handleInputChange}
            className={`w-full py-3 pl-12 pr-4 border-2 rounded-xl focus:outline-none transition-colors text-gray-900 ${
              validationErrors.phone
                ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                : 'border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
            }`}
            placeholder="e.g., 0712345678 or +255712345678"
            required
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={15}
            aria-label="Customer phone number"
            aria-required="true"
          />
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          {checkingPhone && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
            </div>
          )}
        </div>
        {validationErrors.phone && (
          <div className="mt-1 text-sm text-red-600 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            {validationErrors.phone}
          </div>
        )}
        {showDuplicateWarning && duplicateCustomers.length > 0 && (
          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Existing customer found:</span>
            </div>
            {duplicateCustomers.map((customer, _index) => (
              <div key={customer.id} className="text-sm text-yellow-700">
                • {customer.name} ({customer.phone}) {customer.email && `- ${customer.email}`}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* WhatsApp */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-gray-700 font-medium">WhatsApp</label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hasWhatsapp"
              checked={hasWhatsapp}
              onChange={(e) => {
                setHasWhatsapp(e.target.checked);
                if (!e.target.checked) {
                  // Clear WhatsApp field when unchecked
                  setFormData(prev => ({ ...prev, whatsapp: '' }));
                } else if (formData.phone) {
                  // Auto-fill WhatsApp with phone number when checked and phone exists
                  setFormData(prev => ({ ...prev, whatsapp: formData.phone }));
                }
              }}
              className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
            />
            <label htmlFor="hasWhatsapp" className="text-sm text-gray-600">Has WhatsApp</label>
          </div>
        </div>
        <div className="relative">
          <input
            type="text"
            name="whatsapp"
            value={formData.whatsapp || ''}
            onChange={handleInputChange}
            disabled={!hasWhatsapp}
            className={`w-full py-3 pl-12 pr-4 border-2 rounded-xl focus:outline-none transition-colors ${
              hasWhatsapp
                ? 'border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-gray-900'
                : 'border-gray-200 bg-gray-50 text-gray-500'
            }`}
              placeholder={hasWhatsapp ? "Enter WhatsApp number" : "WhatsApp disabled"}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="WhatsApp number"
            aria-disabled={!hasWhatsapp}
          />
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
        </div>
        {validationErrors.whatsapp && <div className="text-red-600 text-xs mt-1">{validationErrors.whatsapp}</div>}
      </div>
      {/* Region & Gender on the same row */}
      <div className="md:col-span-1">
        <label className="block text-gray-700 mb-2 font-medium">Region</label>
        <div className="relative">
          <input
            type="text"
            name="city"
            value={formData.city || ''}
            onChange={handleInputChange}
            onFocus={() => setShowRegionDropdown(true)}
            onBlur={() => setTimeout(() => setShowRegionDropdown(false), 200)}
            className="w-full min-h-[48px] py-3 pl-12 pr-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-colors text-gray-900"
            placeholder="Type or select region"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Region or city"
            role="combobox"
            aria-expanded={showRegionDropdown}
            aria-autocomplete="list"
          />
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          {/* Region Dropdown */}
          {showRegionDropdown && (
            <div
              data-dropdown="region"
              className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-300 rounded-xl shadow-xl z-[9999] max-h-60 overflow-y-auto"
              role="listbox"
              aria-label="Region options"
            >
              {filteredRegions.map((region, _index) => (
                  <div
                    key={region}
                    className="px-4 py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, city: region }));
                      setShowRegionDropdown(false);
                    }}
                  >
                    {region}
                  </div>
                ))}
              {filteredRegions.length === 0 && (
                <div className="px-4 py-3 text-gray-500">
                  No matching regions found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="md:col-span-1 flex flex-col justify-end">
        <label className="block text-gray-700 mb-2 font-medium">Gender <span className="text-red-500">*</span></label>
        <div className="flex gap-3">
          {[{ value: 'male', label: 'Male', icon: '👨' }, { value: 'female', label: 'Female', icon: '👩' }].map(option => {
            const isSelected = formData.gender === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, gender: option.value as 'male' | 'female' }));
                  // Clear validation error when user makes selection
                  if (validationErrors.gender) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.gender;
                      return newErrors;
                    });
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all duration-200 cursor-pointer relative
                  ${validationErrors.gender && !isSelected
                    ? 'border-red-500 bg-red-50'
                    : isSelected
                    ? option.value === 'male'
                      ? 'bg-orange-600 text-white border-orange-600 shadow-lg'
                      : 'bg-pink-600 text-white border-pink-600 shadow-lg'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-md'
                  }
                  focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-opacity-50
                  h-[52px]`}
                style={{ userSelect: 'none' }}
                aria-label={`Select ${option.label}`}
                aria-pressed={isSelected}
              >
                <span className="text-lg">{option.icon}</span>
                <span className="font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
        {validationErrors.gender && (
          <div className="mt-1 text-sm text-red-600 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            {validationErrors.gender}
          </div>
        )}
      </div>
      {/* Birthday */}
      <div className="md:col-span-2">
        <label className="block text-gray-700 mb-2 font-medium">Birthday</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <input
              type="text"
              name="birthMonth"
              value={formData.birthMonth || ''}
              onChange={handleInputChange}
              onFocus={() => setShowMonthDropdown(true)}
              onBlur={() => setTimeout(() => setShowMonthDropdown(false), 200)}
              className={`w-full py-3 pl-12 pr-4 border-2 rounded-xl focus:outline-none transition-colors text-gray-900 ${
                validationErrors.birthMonth
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                  : 'border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
              }`}
              placeholder="Type or select month"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Birth month"
              role="combobox"
              aria-expanded={showMonthDropdown}
              aria-autocomplete="list"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">🎂</span>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            {/* Month Dropdown */}
            {showMonthDropdown && (
              <div
                data-dropdown="month"
                className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-md border-2 border-gray-300 rounded-lg shadow-xl z-[9999] max-h-60 overflow-y-auto p-2"
                role="listbox"
                aria-label="Month options"
              >
                <div className="grid grid-cols-2 gap-1">
                  {filteredMonths.map((month) => (
                      <div
                        key={month}
                        className="px-3 py-2 hover:bg-orange-50 cursor-pointer rounded text-sm"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, birthMonth: month }));
                          setShowMonthDropdown(false);
                        }}
                      >
                        {month}
                      </div>
                    ))}
                </div>
                {filteredMonths.length === 0 && (
                  <div className="px-4 py-3 text-gray-500">
                    No matching months found
                  </div>
                )}
              </div>
            )}
            {validationErrors.birthMonth && (
              <div className="mt-1 text-sm text-red-600 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                {validationErrors.birthMonth}
              </div>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              name="birthDay"
              value={formData.birthDay || ''}
              onChange={handleInputChange}
              onFocus={() => setShowDayDropdown(true)}
              onBlur={() => setTimeout(() => setShowDayDropdown(false), 200)}
              className={`w-full py-3 pl-12 pr-4 border-2 rounded-xl focus:outline-none transition-colors text-gray-900 ${
                validationErrors.birthDay
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                  : 'border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
              }`}
              placeholder="Type or select day"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Birth day"
              role="combobox"
              aria-expanded={showDayDropdown}
              aria-autocomplete="list"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">🎉</span>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            {/* Day Dropdown */}
            {showDayDropdown && (
              <div
                data-dropdown="day"
                className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-md border-2 border-gray-300 rounded-lg shadow-xl z-[9999] max-h-60 overflow-y-auto p-2"
                role="listbox"
                aria-label="Day options"
              >
                <div className="grid grid-cols-7 gap-1">
                  {filteredDays.map((day) => (
                      <div
                        key={day}
                        className="px-2 py-2 hover:bg-orange-50 cursor-pointer rounded text-sm text-center"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, birthDay: day }));
                          setShowDayDropdown(false);
                        }}
                      >
                        {day}
                      </div>
                    ))}
                </div>
                {filteredDays.length === 0 && (
                  <div className="px-4 py-3 text-gray-500">
                    No matching days found
                  </div>
                )}
              </div>
            )}
            {validationErrors.birthDay && (
              <div className="mt-1 text-sm text-red-600 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                {validationErrors.birthDay}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Referral Source */}
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">How did you hear about us?</label>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {sortedReferralSources.map((source) => {
            const selected = formData.referralSource === source.label;
            return (
              <button
                key={source.label}
                type="button"
                onClick={() => handleReferralClick(source.label)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  selected
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={{ userSelect: 'none' }}
              >
                <span className={selected ? 'text-white' : 'text-gray-500'}>
                  {source.icon}
                </span>
                <span className="text-xs">
                  {source.label}
                </span>
              </button>
            );
          })}
        </div>
        {/* Show custom input if 'Other' is selected */}
        {formData.referralSource === 'Other' && (
          <div className="mt-3">
            <input
              type="text"
              name="referralSourceCustom"
              value={formData.referralSourceCustom || ''}
              onChange={e => setFormData(prev => ({ ...prev, referralSourceCustom: e.target.value }))}
              className="w-full py-2.5 px-3 bg-white border-2 border-gray-300 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none transition-colors text-gray-900 text-sm"
              placeholder="Please specify..."
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Custom referral source"
            />
          </div>
        )}
      </div>
      {/* Show Notes Button */}
      <div className="md:col-span-2 flex justify-end">
        {!showNotes ? (
          <button
            type="button"
            onClick={() => setShowNotes(true)}
            className="text-orange-600 hover:underline text-sm mt-2"
          >
            + Add Notes
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowNotes(false)}
            className="text-gray-500 hover:underline text-sm mt-2"
          >
            Hide Notes
          </button>
        )}
      </div>
      {/* Notes */}
      {showNotes && (
        <div className="md:col-span-2">
          <label className="block text-gray-700 mb-2 font-medium">Notes</label>
          <textarea
            name="notes"
            value={formData.notes || ''}
            onChange={handleInputChange}
            rows={2}
            className="w-full min-h-[48px] py-3 px-4 border-2 border-gray-300 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none transition-colors text-gray-900 resize-none"
            placeholder="Additional notes"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Additional notes"
          />
        </div>
      )}
    </div>
    </>
  );

  const formContent = (
    <div style={{ position: 'relative' }}>
      {offlineSuccess && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg text-center text-base font-semibold animate-fade-in">
          Customer saved offline! Will sync when you are back online.
        </div>
      )}
      <form id="customer-form" onSubmit={handleSubmit} className="space-y-6">
        {renderFormFields()}
      </form>
    </div>
  );

  if (renderActionsInModal && typeof children === 'function') {
    // Create the action buttons JSX for the modal (inline, not sticky)
    const modalActions = (
      <div className="flex gap-3 w-full justify-end">
        {actionButtons.map((btn: ActionButton, i: number) => {
          const { icon, label, onClick, color, disabled } = btn;
          return (
            <button
              key={label}
              type={i === actionButtons.length - 1 ? 'submit' : 'button'}
              onClick={i === actionButtons.length - 1 ? (e) => {
                // For submit button, trigger form submission
                e.preventDefault();
                const form = document.getElementById('customer-form');
                if (form) {
                  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                }
              } : onClick}
              disabled={disabled}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-base transition-all duration-200 shadow-sm ml-2
                ${color === 'danger' ? 'bg-rose-500 text-white hover:bg-rose-600 hover:shadow-md' :
                  color === 'success' ? 'bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-md' :
                  color === 'primary' ? 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-md' :
                  'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
                focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-50
              `}
            >
              {icon} {label}
            </button>
          );
        })}
      </div>
    );

    return children(
      modalActions,
      <form id="customer-form" onSubmit={handleSubmit} className={`space-y-6`}>
        {renderFormFields()}
      </form>
    );
  }

  return formContent;
};

export default CustomerForm; 