// DeliverySection component for LATS module - Redesigned for Tablet POS (Step-by-Step Wizard)
import React, { useState, useEffect } from 'react';
import { X, MapPin, User, Phone, Truck, CheckCircle, Plane, Bus, Bike, Edit3, Plus, Save, Search, Mail, Crown, Calendar, ChevronDown, ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import { useCustomers } from '../../../../context/CustomersContext';
import toast from 'react-hot-toast';

// Customer selection modals
import TabletCustomerSelectionModal from '../../../tablet/components/TabletCustomerSelectionModal';
import TabletAddCustomerModal from '../../../tablet/components/TabletAddCustomerModal';

export interface DeliveryFormData {
  deliveryMethod: 'boda' | 'bus' | 'air' | '';
  deliveryAddress: string;
  deliveryNotes: string;
  deliveryFee: number;

  // Boda Boda specific
  bodaDestination?: string;
  bodaPrice?: number;

  // Bus specific
  busName?: string;
  busContacts?: string;
  arrivalDate?: string;
  busOfficeLocation?: string;
  busDestination?: string;

  // Air specific
  flightName?: string;
  flightArrivalTime?: string;
  airOfficeLocation?: string;
  airDestination?: string;
}

interface DeliverySectionProps {
  isOpen: boolean;
  onClose: () => void;
  onDeliveryComplete: (delivery: DeliveryFormData) => void;
  onDeliverySet?: (delivery: DeliveryFormData) => void;
  selectedCustomer?: any;
  onCustomerSelect?: (customer: any) => void;
  deliverySettings?: any;
  cartItems?: any[];
  cartTotal?: number;
  cartSubtotal?: number;
}

const DeliverySection: React.FC<DeliverySectionProps> = ({
  isOpen,
  onClose,
  onDeliveryComplete,
  selectedCustomer,
  onCustomerSelect,
  cartItems = [],
  cartTotal = 0,
  cartSubtotal = 0,
}) => {
  const { customers, updateCustomer } = useCustomers();

  // State for form data
  const [formData, setFormData] = useState<DeliveryFormData>({
    deliveryMethod: '',
    deliveryAddress: '',
    deliveryNotes: '',
    deliveryFee: 0,
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Customer selection modal states
  const [showCustomerSelectionModal, setShowCustomerSelectionModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // Step definitions
  const steps = [
    { id: 1, title: 'Delivery Method', description: 'Choose how to deliver' },
    { id: 2, title: 'Customer Details', description: 'Select or add customer' },
    { id: 3, title: 'Delivery Details', description: 'Enter delivery information' },
    { id: 4, title: 'Review & Confirm', description: 'Review and arrange delivery' }
  ];

  // Load customer information when modal opens
  useEffect(() => {
    if (isOpen && selectedCustomer) {
      setFormData(prev => ({
        ...prev,
        deliveryAddress: selectedCustomer.address || '',
      }));
    }
  }, [isOpen, selectedCustomer]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        deliveryMethod: '',
        deliveryAddress: '',
        deliveryNotes: '',
        deliveryFee: 0,
        bodaDestination: '',
        bodaPrice: 0,
      });
      setCurrentStep(1);
      setCompletedSteps(new Set());
    }
  }, [isOpen]);

  const validateDeliveryInfo = () => {
    if (!formData.deliveryMethod) {
      toast.error('Please select a delivery method');
      return false;
    }
    if (!formData.deliveryAddress.trim()) {
      toast.error('Delivery address is required');
      return false;
    }

    // Validate method-specific fields
    if (formData.deliveryMethod === 'boda') {
      if (!formData.bodaDestination?.trim()) {
        toast.error('Boda destination is required');
        return false;
      }
      if (!formData.bodaPrice || formData.bodaPrice <= 0) {
        toast.error('Boda delivery price must be greater than 0');
        return false;
      }
    }
    if (formData.deliveryMethod === 'bus') {
      if (!formData.busName?.trim()) {
        toast.error('Bus name is required');
        return false;
      }
      if (!formData.busContacts?.trim()) {
        toast.error('Bus contacts are required');
        return false;
      }
      if (!formData.arrivalDate) {
        toast.error('Arrival date is required');
        return false;
      }
    }

    if (formData.deliveryMethod === 'air') {
      if (!formData.flightName?.trim()) {
        toast.error('Flight name is required');
        return false;
      }
      if (!formData.flightArrivalTime) {
        toast.error('Flight arrival time is required');
        return false;
      }
    }

    return true;
  };

  // Handle input changes
  const handleInputChange = (field: keyof DeliveryFormData, value: string | number) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };

      // Update delivery fee for Boda Boda when price changes
      if (field === 'bodaPrice' && prev.deliveryMethod === 'boda') {
        updated.deliveryFee = value as number || 2000; // Default to 2000 if invalid
      }

      return updated;
    });
  };


  // Handle delivery method change
  const handleDeliveryMethodChange = (method: 'boda' | 'bus' | 'air' | '') => {
    const methodFees = {
      boda: 2000, // Boda boda fee
      bus: 5000,  // Bus delivery fee
      air: 15000  // Air freight fee
    };

    setFormData(prev => ({
      ...prev,
      deliveryMethod: method,
      deliveryFee: method ? methodFees[method] : 0,
      // Reset method-specific fields
      bodaDestination: undefined,
      bodaPrice: undefined,
      busName: undefined,
      busContacts: undefined,
      arrivalDate: undefined,
      busOfficeLocation: undefined,
      busDestination: undefined,
      flightName: undefined,
      flightArrivalTime: undefined,
      airOfficeLocation: undefined,
      airDestination: undefined,
    }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer before arranging delivery');
      return;
    }
    if (cartItems.length === 0) {
      toast.error('Please add items to cart before arranging delivery');
      return;
    }
    if (!validateDeliveryInfo()) return;

    try {
      setIsSubmitting(true);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      onDeliveryComplete(formData);
      toast.success('Delivery arranged successfully');
      onClose();
    } catch (error) {
      console.error('Error setting delivery:', error);
      toast.error('Failed to arrange delivery');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if location supports boda boda
  const supportsBodaBoda = (location: string) => {
    const supportedLocations = ['Dar es Salaam', 'Arusha'];
    return supportedLocations.includes(location);
  };

  // Step navigation functions
  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  // Validate current step before proceeding
  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1: // Delivery Method
        if (!formData.deliveryMethod) {
          toast.error('Please select a delivery method');
          return false;
        }
        return true;

      case 2: // Customer Details
        if (!selectedCustomer) {
          toast.error('Please select a customer');
          return false;
        }
        return true;

      case 3: // Delivery Details
        return validateDeliveryInfo();

      case 4: // Review & Confirm
        return true;

      default:
        return true;
    }
  };

  // Shared input styles (matching CustomerForm styling)
  const sharedInput = 'w-full py-3 px-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-colors text-gray-900';

  // Tanzanian regions for location dropdown
  const regions = [
    'Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Mbeya', 'Tanga', 'Morogoro',
    'Iringa', 'Tabora', 'Kigoma', 'Mara', 'Kagera', 'Shinyanga', 'Singida',
    'Rukwa', 'Ruvuma', 'Lindi', 'Mtwara', 'Pwani', 'Manyara', 'Geita',
    'Simiyu', 'Katavi', 'Njombe', 'Songwe'
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-[100000]" onClick={onClose} />

      {/* Modal Container */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Arrange Delivery</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Step Progress Indicator */}
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                    currentStep === step.id
                      ? 'bg-blue-600 text-white'
                      : completedSteps.has(step.id)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}>
                    {completedSteps.has(step.id) ? (
                      <CheckCircle size={12} />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span className={`text-xs mt-1 ${
                    currentStep === step.id
                      ? 'text-blue-600 font-medium'
                      : completedSteps.has(step.id)
                      ? 'text-green-600'
                      : 'text-gray-500'
                  }`}>
                    {step.title.split(' ')[0]}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 transition-colors ${
                    completedSteps.has(step.id) ? 'bg-green-600' : 'bg-gray-300'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Step 1: Delivery Method Selection */}
              {currentStep === 1 && (
                <>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Choose Delivery Method</h3>
                    <p className="text-sm text-gray-600">Select how you want to deliver these items</p>
                  </div>

                  <div className="space-y-3">
                    {/* Boda Boda (Bike) - Only for Arusha and Dar es Salaam */}
                    {supportsBodaBoda(selectedCustomer?.city) && (
                      <div
                        className={`p-4 border rounded-lg transition-all cursor-pointer ${
                          formData.deliveryMethod === 'boda'
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                        }`}
                        onClick={() => handleDeliveryMethodChange('boda')}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              formData.deliveryMethod === 'boda' ? 'bg-green-600' : 'bg-green-100'
                            }`}>
                              <Bike size={20} className={formData.deliveryMethod === 'boda' ? 'text-white' : 'text-green-600'} />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">Boda Boda (Bike)</div>
                              <div className="text-sm text-gray-600">Fast local delivery</div>
                              <div className="text-sm font-semibold text-green-600">TZS 2,000</div>
                            </div>
                          </div>
                          {formData.deliveryMethod === 'boda' && (
                            <CheckCircle size={20} className="text-green-600" />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Bus Delivery */}
                    <div
                      className={`p-4 border rounded-lg transition-all cursor-pointer ${
                        formData.deliveryMethod === 'bus'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                      onClick={() => handleDeliveryMethodChange('bus')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            formData.deliveryMethod === 'bus' ? 'bg-blue-600' : 'bg-blue-100'
                          }`}>
                            <Bus size={20} className={formData.deliveryMethod === 'bus' ? 'text-white' : 'text-blue-600'} />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">Bus Delivery</div>
                            <div className="text-sm text-gray-600">Inter-city delivery</div>
                            <div className="text-sm font-semibold text-blue-600">TZS 5,000</div>
                          </div>
                        </div>
                        {formData.deliveryMethod === 'bus' && (
                          <CheckCircle size={20} className="text-blue-600" />
                        )}
                      </div>
                    </div>

                    {/* Air Freight */}
                    <div
                      className={`p-4 border rounded-lg transition-all cursor-pointer ${
                        formData.deliveryMethod === 'air'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                      }`}
                      onClick={() => handleDeliveryMethodChange('air')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            formData.deliveryMethod === 'air' ? 'bg-purple-600' : 'bg-purple-100'
                          }`}>
                            <Plane size={20} className={formData.deliveryMethod === 'air' ? 'text-white' : 'text-purple-600'} />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">Air Freight</div>
                            <div className="text-sm text-gray-600">Express air delivery</div>
                            <div className="text-sm font-semibold text-purple-600">TZS 15,000</div>
                          </div>
                        </div>
                        {formData.deliveryMethod === 'air' && (
                          <CheckCircle size={20} className="text-purple-600" />
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Customer Selection */}
              {currentStep === 2 && (
                <>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Customer Information</h3>
                    <p className="text-sm text-gray-600">Select the customer for this delivery</p>
                  </div>

                  {/* Customer Selection */}
                  {!selectedCustomer ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <User size={24} className="text-blue-600" />
                      </div>
                      <p className="text-gray-600 mb-4">No customer selected</p>
                      <button
                        onClick={() => setShowCustomerSelectionModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                      >
                        <Search size={16} />
                        Select Customer
                      </button>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {selectedCustomer.name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
                            {selectedCustomer.phone && (
                              <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setShowCustomerSelectionModal(true)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Change customer"
                        >
                          <Edit3 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Step 3: Delivery Details */}
              {currentStep === 3 && (
                <>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Delivery Details</h3>
                    <p className="text-sm text-gray-600">Enter the delivery information</p>
                  </div>

                  {/* Delivery Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                    <div className="relative">
                      <input
                        type="text"
                        className="w-full border border-gray-200 rounded-lg py-2 px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter delivery address"
                        value={formData.deliveryAddress}
                        onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                      />
                      <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <div className="relative">
                      <input
                        type="tel"
                        className="w-full border border-gray-200 rounded-lg py-2 px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Customer phone number"
                        value={formData.deliveryPhone}
                        onChange={(e) => handleInputChange('deliveryPhone', e.target.value)}
                      />
                      <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    </div>
                  </div>

                  {/* Method-specific details */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 text-sm mb-3 capitalize">{formData.deliveryMethod} Details</h4>

                    {formData.deliveryMethod === 'boda' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                          <input
                            className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Destination area"
                            value={formData.bodaDestination || ''}
                            onChange={(e) => handleInputChange('bodaDestination', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Fee</label>
                          <input
                            type="number"
                            className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Fee amount"
                            value={formData.bodaPrice || ''}
                            onChange={(e) => handleInputChange('bodaPrice', parseInt(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                      </div>
                    )}

                    {formData.deliveryMethod === 'bus' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Bus Company</label>
                          <input
                            className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Bus company name"
                            value={formData.busName || ''}
                            onChange={(e) => handleInputChange('busName', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                          <input
                            className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Contact number"
                            value={formData.busContacts || ''}
                            onChange={(e) => handleInputChange('busContacts', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Arrival Date</label>
                          <input
                            type="date"
                            className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.arrivalDate || ''}
                            onChange={(e) => handleInputChange('arrivalDate', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                          <input
                            className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Destination city/area"
                            value={formData.busDestination || ''}
                            onChange={(e) => handleInputChange('busDestination', e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {formData.deliveryMethod === 'air' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Flight/Airline</label>
                          <input
                            className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Flight or airline name"
                            value={formData.flightName || ''}
                            onChange={(e) => handleInputChange('flightName', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Arrival Time</label>
                          <input
                            type="datetime-local"
                            className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.flightArrivalTime || ''}
                            onChange={(e) => handleInputChange('flightArrivalTime', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                          <input
                            className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Destination city"
                            value={formData.airDestination || ''}
                            onChange={(e) => handleInputChange('airDestination', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Delivery Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Notes</label>
                    <textarea
                      className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                      placeholder="Special delivery instructions..."
                      value={formData.deliveryNotes}
                      onChange={(e) => handleInputChange('deliveryNotes', e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Step 4: Review & Confirm */}
              {currentStep === 4 && (
                <>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Review & Confirm</h3>
                    <p className="text-sm text-gray-600">Please review the delivery details before confirming</p>
                  </div>

                  {/* Customer Summary */}
                  {selectedCustomer && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <User size={16} />
                        Customer
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">{selectedCustomer.name}</p>
                        {selectedCustomer.phone && <p className="text-gray-600">{selectedCustomer.phone}</p>}
                        {formData.deliveryAddress && <p className="text-gray-600">{formData.deliveryAddress}</p>}
                      </div>
                    </div>
                  )}

                  {/* Order Summary */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Order Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Items:</span>
                        <span>{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</span>
                      </div>
                      {cartSubtotal > 0 && (
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>TZS {cartSubtotal.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium">
                        <span>Delivery Fee:</span>
                        <span>TZS {formData.deliveryFee.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-gray-300 pt-2 flex justify-between font-semibold">
                        <span>Total:</span>
                        <span>TZS {(cartTotal + formData.deliveryFee).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Summary */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Truck size={16} />
                      Delivery Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Method:</span>
                        <span className="font-medium capitalize">{formData.deliveryMethod}</span>
                      </div>
                      {formData.deliveryMethod === 'bus' && formData.busName && (
                        <div className="flex justify-between">
                          <span>Bus:</span>
                          <span>{formData.busName}</span>
                        </div>
                      )}
                      {formData.deliveryMethod === 'air' && formData.flightName && (
                        <div className="flex justify-between">
                          <span>Flight:</span>
                          <span>{formData.flightName}</span>
                        </div>
                      )}
                      {formData.deliveryNotes && (
                        <div className="mt-2 pt-2 border-t border-green-200">
                          <span className="font-medium">Notes:</span>
                          <p className="text-gray-600 mt-1">{formData.deliveryNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between gap-3">
            {/* Previous Step Button */}
            <button
              onClick={currentStep === 1 ? onClose : prevStep}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {currentStep === 1 ? (
                <>
                  <X size={16} />
                  Cancel
                </>
              ) : (
                <>
                  <ChevronLeft size={16} />
                  Previous
                </>
              )}
            </button>

            {/* Next Step / Submit Button */}
            {currentStep < 4 ? (
              <button
                onClick={nextStep}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Next
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Arranging...
                  </>
                ) : (
                  <>
                    <Truck size={16} />
                    Arrange Delivery
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Customer Selection Modal */}
      {showCustomerSelectionModal && (
        <TabletCustomerSelectionModal
          customers={customers}
          onSelect={(customer) => {
            onCustomerSelect?.(customer);
            setShowCustomerSelectionModal(false);
            toast.success(`Selected customer: ${customer.name}`);
          }}
          onClose={() => setShowCustomerSelectionModal(false)}
          onAddNew={() => {
            setShowCustomerSelectionModal(false);
            setShowAddCustomerModal(true);
          }}
        />
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <TabletAddCustomerModal
          onClose={() => setShowAddCustomerModal(false)}
          onSuccess={(customer) => {
            onCustomerSelect?.(customer);
            setShowAddCustomerModal(false);
            toast.success(`Added new customer: ${customer.name}`);
          }}
        />
      )}
    </>
  );
};

export default DeliverySection;
