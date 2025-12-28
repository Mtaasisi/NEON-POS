import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Smartphone, Hash, Calendar, Key, DollarSign, User, FileText, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useDevices } from '../../../context/DevicesContext';
import { useCustomers } from '../../../context/CustomersContext';
import { useAuth } from '../../../context/AuthContext';
import { DeviceStatus } from '../../../types';
import { searchCustomersFast } from '../../../lib/customerApi/search';
import AddCustomerModal from '../../customers/components/forms/AddCustomerModal';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import ModelSuggestionInput from '../../shared/components/ui/ModelSuggestionInput';
import { supabase } from '../../../lib/supabaseClient';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceCreated?: () => void;
}

const AddDeviceModal: React.FC<AddDeviceModalProps> = ({
  isOpen,
  onClose,
  onDeviceCreated
}) => {
  const { addDevice } = useDevices();
  const { customers } = useCustomers();
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    serialNumber: '',
    issueDescription: '',
    repairCost: '',
    expectedReturnDate: new Date().toISOString().split('T')[0],
    unlockCode: '',
    assignedTo: '',
  });

  // Customer selection
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // Technicians
  const [technicians, setTechnicians] = useState<any[]>([]);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingTechnicians, setLoadingTechnicians] = useState(true);

  // Prevent body scroll
  useBodyScrollLock(isOpen);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset form after a short delay to allow modal close animation
      setTimeout(() => {
        setFormData({
          brand: '',
          model: '',
          serialNumber: '',
          issueDescription: '',
          repairCost: '',
          expectedReturnDate: new Date().toISOString().split('T')[0],
          unlockCode: '',
          assignedTo: '',
        });
        setSelectedCustomer(null);
        setCustomerSearch('');
        setShowSuggestions(false);
        setFilteredCustomers([]);
        setErrors({});
      }, 300);
    }
  }, [isOpen]);

  // Load technicians
  useEffect(() => {
    const loadTechnicians = async () => {
      try {
        setLoadingTechnicians(true);
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, email')
          .eq('role', 'technician')
          .order('full_name');
        
        if (error) throw error;
        setTechnicians(data || []);
      } catch (error) {
        console.error('Error loading technicians:', error);
        toast.error('Failed to load technicians');
      } finally {
        setLoadingTechnicians(false);
      }
    };
    
    if (isOpen) {
      loadTechnicians();
    }
  }, [isOpen]);

  // Customer search
  useEffect(() => {
    if (customerSearch.trim().length > 0) {
      const searchCustomers = async () => {
        setSearchingCustomers(true);
        try {
          console.log('🔍 Searching customers with query:', customerSearch);
          const result = await searchCustomersFast(customerSearch, 1, 20);
          console.log('🔍 Customer search result:', result);
          
          // searchCustomersFast returns { customers: [], total: number, ... }
          const customers = result?.customers || [];
          console.log('📋 Found customers:', customers.length, customers);
          
          setFilteredCustomers(customers);
          setShowSuggestions(customers.length > 0);
          
          if (customers.length === 0 && customerSearch.trim().length > 0) {
            console.warn('⚠️ No customers found for query:', customerSearch);
          }
        } catch (error) {
          console.error('❌ Error searching customers:', error);
          toast.error('Failed to search customers. Please try again.');
          setFilteredCustomers([]);
          setShowSuggestions(false);
        } finally {
          setSearchingCustomers(false);
        }
      };
      
      // Debounce search
      const timeoutId = setTimeout(() => {
        searchCustomers();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    } else {
      setFilteredCustomers([]);
      setShowSuggestions(false);
    }
  }, [customerSearch]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isClickInsideInput = customerInputRef.current?.contains(target);
      const isClickInsideSuggestions = suggestionsRef.current?.contains(target);
      
      // Only close if click is outside both input and suggestions
      if (!isClickInsideInput && !isClickInsideSuggestions) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    if (showSuggestions) {
      // Use a small delay to allow click events to process first
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  // Validate IMEI/Serial Number
  const validateImeiOrSerial = (value: string): { isValid: boolean; error?: string } => {
    const cleaned = value.replace(/\D/g, '');
    
    if (!value.trim()) {
      return { isValid: false, error: 'Serial Number / IMEI is required' };
    }
    
    const totalLength = value.replace(/\s/g, '').length;
    const digitCount = cleaned.length;
    const letterCount = totalLength - digitCount;
    
    // Allow alphanumeric serials with more letters than digits
    if (letterCount > digitCount && totalLength >= 8) {
      return { isValid: true };
    }
    
    // Allow mixed alphanumeric serials with reasonable length
    if (totalLength >= 8 && digitCount >= 2 && letterCount >= 2) {
      return { isValid: true };
    }
    
    // For IMEI-style numbers, check minimum length (12 digits)
    if (digitCount < 12 && letterCount === 0) {
      return { isValid: false, error: 'IMEI must be at least 12 digits' };
    }
    
    // Check maximum length
    if (digitCount > 20) {
      return { isValid: false, error: 'IMEI or Serial Number is too long' };
    }
    
    // Prevent common model names
    const lowerValue = value.toLowerCase();
    const modelPatterns = [
      'iphone', 'galaxy', 'pixel', 'oneplus', 'huawei', 'xiaomi', 'samsung', 'apple',
      'note', 'plus', 'pro', 'max', 'ultra', 'mini', 'lite'
    ];
    
    for (const pattern of modelPatterns) {
      if (lowerValue.includes(pattern)) {
        return { isValid: false, error: 'Please enter the actual IMEI or Serial Number, not the model name' };
      }
    }
    
    return { isValid: true };
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.model.trim()) {
      newErrors.model = 'Model is required';
    }
    
    // Validate serial number
    const serialValidation = validateImeiOrSerial(formData.serialNumber);
    if (!serialValidation.isValid) {
      newErrors.serialNumber = serialValidation.error || 'Serial Number / IMEI is invalid';
    }
    
    if (!selectedCustomer) {
      newErrors.customer = 'Customer is required';
    }
    
    if (!formData.assignedTo) {
      newErrors.assignedTo = 'Technician assignment is required';
    }
    
    if (!formData.expectedReturnDate) {
      newErrors.expectedReturnDate = 'Expected return date is required';
    }
    
    // Validate date is not in the past
    const selectedDate = new Date(formData.expectedReturnDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      newErrors.expectedReturnDate = 'Expected return date cannot be in the past';
    }
    
    // Validate repair cost if provided
    if (formData.repairCost && parseFloat(formData.repairCost) < 0) {
      newErrors.repairCost = 'Repair cost cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      // Extract brand from model if not provided
      const brand = formData.brand.trim() || extractBrandFromModel(formData.model);
      const serialNumber = formData.serialNumber.trim().toUpperCase();
      
      // Validate that we have all required data
      if (!selectedCustomer?.id) {
        throw new Error('Customer is required');
      }
      
      if (!formData.model.trim()) {
        throw new Error('Model is required');
      }
      
      if (!serialNumber) {
        throw new Error('Serial Number / IMEI is required');
      }
      
      if (!formData.assignedTo) {
        throw new Error('Technician assignment is required');
      }
      
      if (!formData.expectedReturnDate) {
        throw new Error('Expected return date is required');
      }
      
      // Prepare device data matching the Device interface
      const newDevice = {
        brand: brand || 'Unknown',
        model: formData.model.trim(),
        serialNumber: serialNumber,
        unlockCode: formData.unlockCode.trim() || null,
        customerId: selectedCustomer.id,
        expectedReturnDate: formData.expectedReturnDate,
        status: 'assigned' as DeviceStatus,
        issueDescription: formData.issueDescription.trim() || '',
        assignedTo: formData.assignedTo,
        deviceNotes: '',
        deviceCondition: null,
        repairCost: formData.repairCost ? parseFloat(formData.repairCost) : null,
      };

      console.log('📱 Creating device with data:', {
        ...newDevice,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        serialNumber: serialNumber,
        brand: brand
      });

      const device = await addDevice(newDevice);
      
      console.log('✅ Device created successfully:', device);

      if (device) {
        toast.success('Device created successfully!');
        // Reset form
        setFormData({
          brand: '',
          model: '',
          serialNumber: '',
          issueDescription: '',
          repairCost: '',
          expectedReturnDate: new Date().toISOString().split('T')[0],
          unlockCode: '',
          assignedTo: '',
        });
        setSelectedCustomer(null);
        setCustomerSearch('');
        setErrors({});
        
        onDeviceCreated?.();
        onClose();
      }
    } catch (error: any) {
      console.error('Error creating device:', error);
      toast.error(error.message || 'Failed to create device');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Extract brand from model
  const extractBrandFromModel = (model: string): string => {
    if (!model) return '';
    
    const modelLower = model.toLowerCase();
    
    // Check for common brand patterns by product names
    if (modelLower.includes('iphone') || modelLower.includes('ipad') || modelLower.includes('macbook') || modelLower.includes('imac') || modelLower.includes('watch') || modelLower.includes('airpods')) {
      return 'Apple';
    } else if (modelLower.includes('samsung') || modelLower.includes('galaxy')) {
      return 'Samsung';
    } else if (modelLower.includes('google') || modelLower.includes('pixel')) {
      return 'Google';
    } else if (modelLower.includes('huawei')) {
      return 'Huawei';
    } else if (modelLower.includes('xiaomi') || modelLower.includes('redmi') || modelLower.includes('poco')) {
      return 'Xiaomi';
    } else if (modelLower.includes('oneplus')) {
      return 'OnePlus';
    } else if (modelLower.includes('sony') || modelLower.includes('xperia')) {
      return 'Sony';
    } else if (modelLower.includes('lg')) {
      return 'LG';
    } else if (modelLower.includes('motorola')) {
      return 'Motorola';
    } else if (modelLower.includes('nokia')) {
      return 'Nokia';
    } else if (modelLower.includes('microsoft') || modelLower.includes('surface')) {
      return 'Microsoft';
    } else if (modelLower.includes('hp')) {
      return 'HP';
    } else if (modelLower.includes('dell')) {
      return 'Dell';
    } else if (modelLower.includes('lenovo')) {
      return 'Lenovo';
    }
    
    // If no brand found, return empty string (will default to 'Unknown' in handleSubmit)
    return '';
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // Real-time validation for serial number
    if (name === 'serialNumber' && value.trim()) {
      const validation = validateImeiOrSerial(value);
      if (!validation.isValid) {
        setErrors(prev => ({
          ...prev,
          serialNumber: validation.error || 'Invalid serial number'
        }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.serialNumber;
          return newErrors;
        });
      }
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-[99999]"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Container */}
      <div 
        className="fixed inset-0 flex items-center justify-center z-[100000] p-4 pointer-events-none"
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon Header - Fixed */}
          <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              
              {/* Text */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Add New Device</h2>
                <p className="text-sm text-gray-600">Create a new device intake record</p>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
            <form onSubmit={handleSubmit} className="py-6 space-y-6" id="add-device-form">
              {/* Customer Selection */}
              <div>
                <label className={`block mb-2 font-medium text-gray-700 ${errors.customer ? 'text-red-600' : ''}`}>
                  Customer *
                </label>
                <div className="relative" ref={customerInputRef}>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowSuggestions(true);
                      setSelectedSuggestionIndex(-1);
                    }}
                    onFocus={() => {
                      if (filteredCustomers.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setSelectedSuggestionIndex(prev => 
                          prev < filteredCustomers.length - 1 ? prev + 1 : prev
                        );
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
                      } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
                        e.preventDefault();
                        const customer = filteredCustomers[selectedSuggestionIndex];
                        if (customer) {
                          setSelectedCustomer(customer);
                          setCustomerSearch(customer.name || customer.phone || '');
                          setShowSuggestions(false);
                          setSelectedSuggestionIndex(-1);
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.customer;
                            return newErrors;
                          });
                        }
                      } else if (e.key === 'Escape') {
                        setShowSuggestions(false);
                        setSelectedSuggestionIndex(-1);
                      }
                    }}
                    placeholder="Search customer by name or phone..."
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      errors.customer 
                        ? 'border-red-500 focus:border-red-500' 
                        : selectedCustomer 
                        ? 'border-green-500' 
                        : 'border-gray-300'
                    }`}
                  />
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  
                  {/* Customer Suggestions Dropdown */}
                  {(showSuggestions || searchingCustomers) && (
                    <div 
                      ref={suggestionsRef}
                      className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto"
                      onMouseDown={(e) => {
                        // Prevent input blur when clicking on suggestions
                        e.preventDefault();
                      }}
                    >
                      {searchingCustomers ? (
                        <div className="p-4 flex items-center gap-2 text-gray-600">
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm">Searching customers...</span>
                        </div>
                      ) : filteredCustomers.length > 0 ? (
                        filteredCustomers.map((customer, index) => (
                          <button
                            key={customer.id}
                            type="button"
                            onMouseDown={(e) => {
                              // Prevent the click outside handler from closing suggestions
                              e.preventDefault();
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('👤 Selecting customer:', customer);
                              setSelectedCustomer(customer);
                              setCustomerSearch(customer.name || customer.phone || '');
                              setShowSuggestions(false);
                              setSelectedSuggestionIndex(-1);
                              setErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.customer;
                                return newErrors;
                              });
                            }}
                            className={`w-full px-4 py-3 text-left transition-colors border-b border-gray-100 last:border-b-0 cursor-pointer ${
                              index === selectedSuggestionIndex 
                                ? 'bg-blue-100 border-blue-300' 
                                : 'hover:bg-blue-50'
                            }`}
                          >
                            <div className="font-medium text-gray-900">{customer.name || 'No name'}</div>
                            <div className="text-sm text-gray-500">{customer.phone || 'No phone'}</div>
                            {customer.email && (
                              <div className="text-xs text-gray-400">{customer.email}</div>
                            )}
                          </button>
                        ))
                      ) : customerSearch.trim().length > 0 ? (
                        <div className="p-4 text-sm text-gray-500">
                          No customers found matching "{customerSearch}"
                        </div>
                      ) : null}
                    </div>
                  )}
                  
                  {selectedCustomer && (
                    <div className="mt-2 p-3 bg-green-50 border-2 border-green-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{selectedCustomer.name}</div>
                          <div className="text-sm text-gray-600">{selectedCustomer.phone}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(null);
                            setCustomerSearch('');
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => setShowAddCustomerModal(true)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Add New Customer
                  </button>
                  
                  {errors.customer && (
                    <div className="text-red-500 text-xs mt-1">{errors.customer}</div>
                  )}
                </div>
              </div>

              {/* Model */}
              <div>
                <label className={`block mb-2 font-medium text-gray-700 ${errors.model ? 'text-red-600' : ''}`}>
                  Model *
                </label>
                <ModelSuggestionInput
                  value={formData.model}
                  onChange={(val) => {
                    setFormData(prev => ({ ...prev, model: val }));
                    if (errors.model) {
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.model;
                        return newErrors;
                      });
                    }
                  }}
                  placeholder="Enter device model"
                  className={`w-full ${errors.model ? 'ring-2 ring-red-200' : ''}`}
                />
                {errors.model && (
                  <div className="text-red-500 text-xs mt-1">{errors.model}</div>
                )}
              </div>

              {/* Serial Number */}
              <div>
                <label className={`block mb-2 font-medium text-gray-700 ${errors.serialNumber ? 'text-red-600' : ''}`}>
                  Serial Number / IMEI *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="serialNumber"
                    value={formData.serialNumber}
                    onChange={handleInputChange}
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        const validation = validateImeiOrSerial(e.target.value);
                        if (!validation.isValid) {
                          setErrors(prev => ({
                            ...prev,
                            serialNumber: validation.error || 'Invalid serial number'
                          }));
                        }
                      }
                    }}
                    placeholder="Enter serial number or IMEI (min 12 digits)"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className={`w-full px-4 py-3 pl-12 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase ${
                      errors.serialNumber 
                        ? 'border-red-500 focus:border-red-500' 
                        : formData.serialNumber && !errors.serialNumber
                        ? 'border-green-500'
                        : 'border-gray-300'
                    }`}
                  />
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                </div>
                {errors.serialNumber && (
                  <div className="text-red-500 text-xs mt-1">{errors.serialNumber}</div>
                )}
                {!errors.serialNumber && formData.serialNumber && (
                  <div className="text-green-600 text-xs mt-1">✓ Valid format</div>
                )}
              </div>

              {/* Issue Description */}
              <div>
                <label className="block mb-2 font-medium text-gray-700">
                  Issue Description
                </label>
                <div className="relative">
                  <textarea
                    name="issueDescription"
                    value={formData.issueDescription}
                    onChange={handleInputChange}
                    placeholder="Describe the device problem..."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Expected Return Date */}
                <div>
                  <label className={`block mb-2 font-medium text-gray-700 ${errors.expectedReturnDate ? 'text-red-600' : ''}`}>
                    Expected Return Date *
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      name="expectedReturnDate"
                      value={formData.expectedReturnDate}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 pl-12 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                        errors.expectedReturnDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  </div>
                  {errors.expectedReturnDate && (
                    <div className="text-red-500 text-xs mt-1">{errors.expectedReturnDate}</div>
                  )}
                </div>

                {/* Repair Cost */}
                <div>
                  <label className={`block mb-2 font-medium text-gray-700 ${errors.repairCost ? 'text-red-600' : ''}`}>
                    Estimated Repair Cost (TZS)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="repairCost"
                      value={formData.repairCost}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className={`w-full px-4 py-3 pl-12 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                        errors.repairCost ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  </div>
                  {errors.repairCost && (
                    <div className="text-red-500 text-xs mt-1">{errors.repairCost}</div>
                  )}
                </div>

                {/* Unlock Code */}
                <div>
                  <label className="block mb-2 font-medium text-gray-700">
                    Unlock Code / Password
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="unlockCode"
                      value={formData.unlockCode}
                      onChange={handleInputChange}
                      placeholder="Optional"
                      className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  </div>
                </div>

                {/* Assign Technician */}
                <div>
                  <label className={`block mb-2 font-medium text-gray-700 ${errors.assignedTo ? 'text-red-600' : ''}`}>
                    Assign Technician *
                  </label>
                  {loadingTechnicians ? (
                    <div className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-600">Loading technicians...</span>
                    </div>
                  ) : (
                    <select
                      name="assignedTo"
                      value={formData.assignedTo}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, assignedTo: e.target.value }));
                        if (errors.assignedTo) {
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.assignedTo;
                            return newErrors;
                          });
                        }
                      }}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                        errors.assignedTo ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select technician...</option>
                      {technicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.full_name || tech.email}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.assignedTo && (
                    <div className="text-red-500 text-xs mt-1">{errors.assignedTo}</div>
                  )}
                  {!loadingTechnicians && technicians.length === 0 && (
                    <div className="text-xs text-yellow-600 mt-1 bg-yellow-50 p-2 rounded">
                      ⚠️ No technicians available. Please add technicians first.
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Fixed Footer */}
          <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-device-form"
                disabled={isSubmitting || loadingTechnicians}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </>
                ) : (
                  'Create Device'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <AddCustomerModal
          isOpen={showAddCustomerModal}
          onClose={() => setShowAddCustomerModal(false)}
          onCustomerCreated={(customer) => {
            setSelectedCustomer(customer);
            setCustomerSearch(customer.name || customer.phone || '');
            setShowAddCustomerModal(false);
          }}
        />
      )}
    </>,
    document.body
  );
};

export default AddDeviceModal;
