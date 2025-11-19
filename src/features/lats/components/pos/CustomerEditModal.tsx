import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, User, Phone, MapPin, Star, Crown, AlertCircle, CheckCircle, Calendar, MessageSquare, Users, Gift, CreditCard, Clock, FileText, UserPlus, Award, TrendingUp, Check, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Customer } from '../../../customers/types';
import { updateCustomerInDb } from '../../../../lib/customerApi/core';
import CustomerSearchDropdown from '../../../shared/components/CustomerSearchDropdown';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';
import { useDialog } from '../../../shared/hooks/useDialog';

interface CustomerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onCustomerUpdated: (updatedCustomer: Customer) => void;
}

const CustomerEditModal: React.FC<CustomerEditModalProps> = ({
  isOpen,
  onClose,
  customer,
  onCustomerUpdated
}) => {
  const { confirm } = useDialog();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    gender: 'other',
    city: '',
    loyaltyLevel: 'interested',
    colorTag: 'new',
    referredBy: '',
    birthMonth: '',
    birthDay: '',
    notes: '',
    isActive: true,
    whatsappOptOut: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showDayDropdown, setShowDayDropdown] = useState(false);

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Initialize form data when customer changes
  useEffect(() => {
    if (customer) {
      const initialData = {
        name: customer.name || '',
        phone: customer.phone || '',
        whatsapp: customer.whatsapp || '',
        gender: customer.gender || 'other',
        city: customer.city || '',
        loyaltyLevel: customer.loyaltyLevel || 'bronze',
        colorTag: customer.colorTag || 'new',
        referredBy: customer.referredBy || '',
        birthMonth: customer.birthMonth || '',
        birthDay: customer.birthDay || '',
        notes: customer.notes ? (Array.isArray(customer.notes) ? customer.notes.join('\n') : customer.notes) : '',
        isActive: customer.isActive !== false,
        whatsappOptOut: customer.whatsappOptOut || false
      };
      setFormData(initialData);
      setHasChanges(false);
    }
  }, [customer]);

  // Track changes
  useEffect(() => {
    if (customer) {
      const hasFormChanges = 
        formData.name !== (customer.name || '') ||
        formData.phone !== (customer.phone || '') ||
        formData.whatsapp !== (customer.whatsapp || '') ||
        formData.gender !== (customer.gender || 'other') ||
        formData.city !== (customer.city || '') ||
        formData.loyaltyLevel !== (customer.loyaltyLevel || 'bronze') ||
        formData.colorTag !== (customer.colorTag || 'new') ||
        formData.referredBy !== (customer.referredBy || '') ||
        formData.birthMonth !== (customer.birthMonth || '') ||
        formData.birthDay !== (customer.birthDay || '') ||
        formData.notes !== (customer.notes ? (Array.isArray(customer.notes) ? customer.notes.join('\n') : customer.notes) : '') ||
        formData.isActive !== (customer.isActive !== false) ||
        formData.whatsappOptOut !== (customer.whatsappOptOut || false);
      
      setHasChanges(hasFormChanges);
    }
  }, [formData, customer]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      
      if (showRegionDropdown && !target.closest('[data-region-dropdown]')) {
        setShowRegionDropdown(false);
      }
      
      if (showMonthDropdown && !target.closest('[data-month-dropdown]')) {
        setShowMonthDropdown(false);
      }
      
      if (showDayDropdown && !target.closest('[data-day-dropdown]')) {
        setShowDayDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showRegionDropdown, showMonthDropdown, showDayDropdown]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customer || !hasChanges) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      // Prepare update data
      const updateData: Partial<Customer> = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        whatsapp: formData.whatsapp.trim(),
        gender: formData.gender,
        city: formData.city.trim(),
        loyaltyLevel: formData.loyaltyLevel,
        colorTag: formData.colorTag,
        referredBy: formData.referredBy.trim(),
        birthMonth: formData.birthMonth.trim(),
        birthDay: formData.birthDay.trim(),
        isActive: formData.isActive,
        whatsappOptOut: formData.whatsappOptOut
      };

      // Handle notes - convert to array if there are notes
      if (formData.notes.trim()) {
        updateData.notes = formData.notes.trim().split('\n').filter(note => note.trim());
      }

      // Update customer in database
      await updateCustomerInDb(customer.id, updateData);

      // Create updated customer object
      const updatedCustomer: Customer = {
        ...customer,
        ...updateData
      };

      // Notify parent component
      onCustomerUpdated(updatedCustomer);

      toast.success('Customer information updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('Failed to update customer information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = async () => {
    if (hasChanges) {
      const confirmClose = await confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmClose) return;
    }
    onClose();
  };

  const getLoyaltyIcon = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'vip':
        return <Crown className="w-4 h-4 text-purple-500" />;
      case 'premium':
        return <Star className="w-4 h-4 text-yellow-500 fill-current" />;
      case 'regular':
        return <Star className="w-4 h-4 text-blue-500 fill-current" />;
      case 'active':
        return <Star className="w-4 h-4 text-green-500 fill-current" />;
      case 'payment_customer':
        return <Star className="w-4 h-4 text-teal-500 fill-current" />;
      case 'engaged':
        return <Star className="w-4 h-4 text-indigo-500 fill-current" />;
      case 'interested':
        return <Star className="w-4 h-4 text-gray-400 fill-current" />;
      default:
        return <Star className="w-4 h-4 text-gray-400" />;
    }
  };

  const getColorTagStyle = (colorTag: string) => {
    switch (colorTag) {
      case 'vip':
        return 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border-purple-200';
      case 'premium':
        return 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-700 border-yellow-200';
      case 'regular':
        return 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-blue-200';
      case 'new':
        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200';
      default:
        return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border-gray-200';
    }
  };

  // Helper function to check if a field is missing or empty
  const isFieldMissing = (value: string | undefined | null): boolean => {
    return !value || value.trim() === '';
  };

  // Get missing fields for the customer
  const getMissingFields = () => {
    if (!customer) return [];
    
    const missingFields = [];
    
    if (isFieldMissing(customer.whatsapp)) missingFields.push('WhatsApp');
    if (isFieldMissing(customer.city)) missingFields.push('City');
    if (isFieldMissing(customer.birthMonth)) missingFields.push('Birth Month');
    if (isFieldMissing(customer.birthDay)) missingFields.push('Birth Day');
    
    return missingFields;
  };

  const missingFields = getMissingFields();

  // Tanzania regions array (same as CustomerForm)
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

  // Memoize filtered regions for performance
  const filteredRegions = useMemo(() => {
    return tanzaniaRegions.filter(region => 
      region.toLowerCase().includes(formData.city.toLowerCase())
    );
  }, [formData.city]);

  // Days array (1-31)
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

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

  if (!isOpen || !customer) return null;

  return (
    <>
      {/* Backdrop - respects sidebar and topbar */}
      <div 
        className="fixed bg-black/60"
        onClick={handleClose}
        style={{
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0,
          zIndex: 35
        }}
      />
      
      {/* Modal Container */}
      <div 
        className="fixed flex items-center justify-center p-4"
        style={{
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0,
          zIndex: 50,
          pointerEvents: 'none'
        }}
      >
        <div 
          className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          style={{ pointerEvents: 'auto' }}
        >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Edit Customer</h2>
              <p className="text-sm text-gray-600">Update customer information</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-6">
            {/* Missing Information Alert */}
            {missingFields.length > 0 && (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <h3 className="font-semibold text-orange-800">Missing Information</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {missingFields.map((field, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-white text-orange-700 text-sm font-medium rounded-lg border border-orange-300 shadow-sm"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-4 py-3 pl-11 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Enter full name"
                      required
                    />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-4 py-3 pl-11 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="+255 123 456 789"
                      required
                    />
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    WhatsApp Number
                    {isFieldMissing(customer?.whatsapp) && <AlertCircle className="w-4 h-4 text-orange-500" />}
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={formData.whatsapp}
                      onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                      className="w-full px-4 py-3 pl-11 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="+255 123 456 789"
                    />
                    <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    {[
                      { value: 'male', label: 'Male', icon: '👨', color: 'bg-blue-600 text-white border-blue-600 shadow-lg', hoverColor: 'hover:bg-gray-50 hover:border-gray-400 hover:shadow-md' },
                      { value: 'female', label: 'Female', icon: '👩', color: 'bg-pink-600 text-white border-pink-600 shadow-lg', hoverColor: 'hover:bg-gray-50 hover:border-gray-400 hover:shadow-md' }
                    ].map((option) => {
                      const isSelected = formData.gender === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleInputChange('gender', option.value)}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all duration-200 cursor-pointer
                            ${isSelected
                              ? option.color
                              : `bg-white text-gray-700 border-gray-300 ${option.hoverColor}`
                            }
                            focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-50 h-[52px]`}
                        >
                          <span className="text-xl">{option.icon}</span>
                          <span>{option.label}</span>
                          {isSelected && (
                            <Check className="w-4 h-4 ml-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Region
                    {isFieldMissing(customer?.city) && <AlertCircle className="w-4 h-4 text-orange-500" />}
                  </label>
                  <div className="relative" data-region-dropdown>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      onFocus={() => setShowRegionDropdown(true)}
                      onBlur={() => setTimeout(() => setShowRegionDropdown(false), 200)}
                      className="w-full min-h-[48px] py-3 pl-11 pr-10 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Type or select region"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    
                    {/* Region Dropdown */}
                    {showRegionDropdown && (
                      <div 
                        className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-xl z-[9999] max-h-60 overflow-y-auto"
                      >
                        {filteredRegions.map((region) => (
                          <div
                            key={region}
                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                            onClick={() => {
                              handleInputChange('city', region);
                              setShowRegionDropdown(false);
                            }}
                          >
                            {region}
                          </div>
                        ))}
                        {filteredRegions.length === 0 && (
                          <div className="px-4 py-3 text-gray-500 text-center">
                            No matching regions found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>


            {/* Customer Status */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-600" />
                Customer Status
              </h3>
              
              <div className="space-y-5">
                {/* Loyalty Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Loyalty Level
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { value: 'interested', label: 'Interested', color: 'bg-white text-gray-700 border-gray-300 hover:border-gray-400', activeColor: 'bg-gray-500 text-white border-gray-500' },
                      { value: 'engaged', label: 'Engaged', color: 'bg-white text-indigo-700 border-indigo-300 hover:border-indigo-400', activeColor: 'bg-indigo-500 text-white border-indigo-500' },
                      { value: 'payment_customer', label: 'Payment Customer', color: 'bg-white text-teal-700 border-teal-300 hover:border-teal-400', activeColor: 'bg-teal-500 text-white border-teal-500' },
                      { value: 'active', label: 'Active', color: 'bg-white text-green-700 border-green-300 hover:border-green-400', activeColor: 'bg-green-500 text-white border-green-500' },
                      { value: 'regular', label: 'Regular', color: 'bg-white text-blue-700 border-blue-300 hover:border-blue-400', activeColor: 'bg-blue-500 text-white border-blue-500' },
                      { value: 'premium', label: 'Premium', color: 'bg-white text-yellow-700 border-yellow-300 hover:border-yellow-400', activeColor: 'bg-yellow-500 text-white border-yellow-500' },
                      { value: 'vip', label: 'VIP', color: 'bg-white text-purple-700 border-purple-300 hover:border-purple-400', activeColor: 'bg-purple-500 text-white border-purple-500' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleInputChange('loyaltyLevel', option.value)}
                        className={`px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                          formData.loyaltyLevel === option.value 
                            ? option.activeColor 
                            : option.color
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer Tag */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Customer Tag
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { value: 'new', label: 'New', color: 'bg-white text-green-700 border-green-300 hover:border-green-400', activeColor: 'bg-green-500 text-white border-green-500' },
                      { value: 'regular', label: 'Regular', color: 'bg-white text-blue-700 border-blue-300 hover:border-blue-400', activeColor: 'bg-blue-500 text-white border-blue-500' },
                      { value: 'premium', label: 'Premium', color: 'bg-white text-yellow-700 border-yellow-300 hover:border-yellow-400', activeColor: 'bg-yellow-500 text-white border-yellow-500' },
                      { value: 'vip', label: 'VIP', color: 'bg-white text-purple-700 border-purple-300 hover:border-purple-400', activeColor: 'bg-purple-500 text-white border-purple-500' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleInputChange('colorTag', option.value)}
                        className={`px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                          formData.colorTag === option.value 
                            ? option.activeColor 
                            : option.color
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Referral Information */}
            <div className="bg-purple-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Referred By Customer</p>
                    <p className="text-xs text-gray-500">Link referrer to earn points</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-purple-600 text-white text-xs font-medium rounded-full">
                  Bonus Points
                </span>
              </div>
              <CustomerSearchDropdown
                value={formData.referredBy}
                onChange={(value) => handleInputChange('referredBy', value)}
                placeholder="Search for the referring customer..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-gray-900"
              />
            </div>

            {/* Birth Information */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-pink-600" />
                Birth Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Birth Month
                    {isFieldMissing(customer?.birthMonth) && <AlertCircle className="w-4 h-4 text-orange-500" />}
                  </label>
                  <div className="relative" data-month-dropdown>
                    <input
                      type="text"
                      value={formData.birthMonth}
                      onChange={(e) => handleInputChange('birthMonth', e.target.value)}
                      onFocus={() => setShowMonthDropdown(true)}
                      onBlur={() => setTimeout(() => setShowMonthDropdown(false), 200)}
                      className="w-full py-3 pl-11 pr-10 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Type or select month"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl pointer-events-none">🎂</span>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    
                    {/* Month Dropdown */}
                    {showMonthDropdown && (
                      <div 
                        className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-xl z-[9999] max-h-60 overflow-y-auto p-2"
                      >
                        {filteredMonths.map((month) => (
                          <div
                            key={month}
                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer rounded transition-colors"
                            onClick={() => {
                              handleInputChange('birthMonth', month);
                              setShowMonthDropdown(false);
                            }}
                          >
                            {month}
                          </div>
                        ))}
                        {filteredMonths.length === 0 && (
                          <div className="px-4 py-3 text-gray-500 text-center">
                            No matching months found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Birth Day
                    {isFieldMissing(customer?.birthDay) && <AlertCircle className="w-4 h-4 text-orange-500" />}
                  </label>
                  <div className="relative" data-day-dropdown>
                    <input
                      type="text"
                      value={formData.birthDay}
                      onChange={(e) => handleInputChange('birthDay', e.target.value)}
                      onFocus={() => setShowDayDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDayDropdown(false), 200)}
                      className="w-full py-3 pl-11 pr-10 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Type or select day"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl pointer-events-none">🎉</span>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    
                    {/* Day Dropdown */}
                    {showDayDropdown && (
                      <div 
                        className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-xl z-[9999] max-h-60 overflow-y-auto p-2"
                      >
                        <div className="grid grid-cols-7 gap-1">
                          {filteredDays.map((day) => (
                            <div
                              key={day}
                              className="px-2 py-2 hover:bg-blue-50 cursor-pointer rounded text-sm text-center transition-colors"
                              onClick={() => {
                                handleInputChange('birthDay', day);
                                setShowDayDropdown(false);
                              }}
                            >
                              {day}
                            </div>
                          ))}
                        </div>
                        {filteredDays.length === 0 && (
                          <div className="px-4 py-3 text-gray-500 text-center">
                            No matching days found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={4}
                  placeholder="Add notes about this customer..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900 resize-none"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Optional: Add any important information or preferences about this customer
                </p>
              </div>
            </div>

          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-white">
          <div className="text-sm">
            {hasChanges && (
              <span className="flex items-center gap-2 text-orange-600 font-medium">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                Unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-6 py-3 text-sm font-medium bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={!hasChanges || isLoading}
              className="px-6 py-3 text-sm font-medium bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
        </div>
      </div>
    </>
  );
};

export default CustomerEditModal;
