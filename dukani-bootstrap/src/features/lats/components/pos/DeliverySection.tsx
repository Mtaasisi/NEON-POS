// DeliverySection component for LATS module - Redesigned for Tablet POS (Step-by-Step Wizard)
import React, { useState, useEffect } from 'react';
import { X, MapPin, User, Phone, Truck, CheckCircle, Edit3, Search, Calendar, ChevronRight, ChevronLeft, Bike, Bus, Plane } from 'lucide-react';
import { useCustomers } from '../../../../context/CustomersContext';
import { useBranch } from '../../../../context/BranchContext';
import toast from 'react-hot-toast';

// Customer selection modals
import TabletCustomerSelectionModal from '../../../tablet/components/TabletCustomerSelectionModal';
import TabletAddCustomerModal from '../../../tablet/components/TabletAddCustomerModal';

export interface DeliveryFormData {
  deliveryMethod: 'boda' | 'bus' | 'air' | '';
  deliveryAddress: string;
  deliveryPhone: string;
  deliveryTime: string;
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
  const { customers } = useCustomers();
  const { currentBranch } = useBranch();

  // State for form data
  const [formData, setFormData] = useState<DeliveryFormData>({
    deliveryMethod: '',
    deliveryAddress: '',
    deliveryPhone: '',
    deliveryTime: '',
    deliveryNotes: '',
    deliveryFee: 5000,
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
        deliveryPhone: selectedCustomer.phone || '',
      }));
    }
  }, [isOpen, selectedCustomer]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        deliveryMethod: '',
        deliveryAddress: '',
        deliveryPhone: '',
        deliveryTime: '',
        deliveryNotes: '',
        deliveryFee: 5000,
        bodaDestination: '',
        bodaPrice: 0,
      });
      setCurrentStep(1);
      setCompletedSteps(new Set());
    }
  }, [isOpen]);

  // Check if location supports boda boda
  const supportsBodaBoda = (location: string) => {
    const supportedLocations = ['Dar es Salaam', 'Arusha'];
    return supportedLocations.includes(location);
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
      busOfficeLocation: method === 'bus' ? (currentBranch?.city || currentBranch?.address || '') : undefined,
      busDestination: undefined,
      flightName: undefined,
      flightArrivalTime: undefined,
      airOfficeLocation: undefined,
      airDestination: undefined,
    }));
  };

  const validateDeliveryInfo = () => {
    // For bus deliveries, "To" field serves as delivery address
    if (formData.deliveryMethod !== 'bus' && !formData.deliveryAddress.trim()) {
      toast.error('Delivery address is required');
      return false;
    }
    // For bus deliveries, validate destination instead
    if (formData.deliveryMethod === 'bus' && !formData.busDestination) {
      toast.error('Please select a destination city');
      return false;
    }
    if (!formData.deliveryPhone.trim()) {
      toast.error('Phone number is required');
      return false;
    }
    if (!formData.deliveryTime) {
      toast.error('Please select a delivery time');
      return false;
    }
    if (!formData.deliveryFee || formData.deliveryFee <= 0) {
      toast.error('Delivery fee must be greater than 0');
      return false;
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



  // Handle form submission
  const handleSubmit = async () => {
    console.log('🚚 [DeliverySection] Starting delivery submission process');

    // Validate prerequisites
    if (!selectedCustomer) {
      toast.error('Please select a customer before arranging delivery');
      console.error('❌ [DeliverySection] No customer selected');
      return;
    }
    if (cartItems.length === 0) {
      toast.error('Please add items to cart before arranging delivery');
      console.error('❌ [DeliverySection] No items in cart');
      return;
    }
    if (!validateDeliveryInfo()) {
      console.error('❌ [DeliverySection] Delivery info validation failed');
      return;
    }

    // Validate delivery data completeness
    if (!formData.deliveryMethod) {
      toast.error('Please select a delivery method');
      console.error('❌ [DeliverySection] No delivery method selected');
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('🚚 [DeliverySection] Validating and preparing delivery data:', formData);

      // Ensure all required fields are present and properly formatted
      const validatedDeliveryData = {
        deliveryMethod: formData.deliveryMethod,
        deliveryAddress: formData.deliveryAddress?.trim() || '',
        deliveryPhone: formData.deliveryPhone?.trim() || '',
        deliveryTime: formData.deliveryTime || 'ASAP',
        deliveryNotes: formData.deliveryNotes?.trim() || '',
        deliveryFee: Math.max(0, formData.deliveryFee || 0), // Ensure non-negative fee
        fee: Math.max(0, formData.deliveryFee || 0), // Alias for compatibility

        // Method-specific fields
        ...(formData.deliveryMethod === 'boda' && {
          bodaDestination: formData.bodaDestination?.trim(),
          bodaPrice: formData.bodaPrice || formData.deliveryFee
        }),
        ...(formData.deliveryMethod === 'bus' && {
          busName: formData.busName?.trim(),
          busContacts: formData.busContacts?.trim(),
          arrivalDate: formData.arrivalDate,
          busOfficeLocation: formData.busOfficeLocation?.trim(),
          busDestination: formData.busDestination?.trim()
        }),
        ...(formData.deliveryMethod === 'air' && {
          flightName: formData.flightName?.trim(),
          flightArrivalTime: formData.flightArrivalTime,
          airOfficeLocation: formData.airOfficeLocation?.trim(),
          airDestination: formData.airDestination?.trim()
        })
      };

      console.log('✅ [DeliverySection] Delivery data validated:', validatedDeliveryData);

      // Simulate API call delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Call the completion handler
      console.log('📤 [DeliverySection] Calling onDeliveryComplete with validated data');
      onDeliveryComplete(validatedDeliveryData);

      console.log('✅ [DeliverySection] Delivery arrangement completed successfully');
      toast.success('Delivery arranged successfully! Proceed to payment to complete the order.');

      onClose();
    } catch (error) {
      console.error('❌ [DeliverySection] Error during delivery submission:', error);
      toast.error('Failed to arrange delivery. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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

  // Shared input styles (modern and polished)
  const sharedInput = 'w-full py-3 px-4 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-gray-900 bg-gray-50 focus:bg-white';


  if (!isOpen) return null;

  return (
    <>
      {/* Modal Container */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-200" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Arrange Delivery</h2>
            <p className="text-sm text-gray-600 mt-1">Set up delivery for your customer</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center shadow-sm border border-gray-200 transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Step Progress Indicator */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all shadow-sm ${
                    currentStep === step.id
                      ? 'bg-blue-600 text-white shadow-blue-200'
                      : completedSteps.has(step.id)
                      ? 'bg-green-600 text-white shadow-green-200'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {completedSteps.has(step.id) ? (
                      <CheckCircle size={14} />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${
                    currentStep === step.id
                      ? 'text-blue-700'
                      : completedSteps.has(step.id)
                      ? 'text-green-700'
                      : 'text-gray-500'
                  }`}>
                    {step.title.split(' ')[0]}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-all ${
                    completedSteps.has(step.id) ? 'bg-green-500' : 'bg-gray-300'
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
                    {/* Boda Boda (Bike) - Always available */}
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

                  <div className="space-y-4">
                    {/* Delivery Address - Hide for bus deliveries since "To" field serves same purpose */}
                    {formData.deliveryMethod !== 'bus' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
                        <div className="relative">
                          <input
                            type="text"
                            className={sharedInput}
                            placeholder="Enter delivery address"
                            value={formData.deliveryAddress}
                            onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                          />
                          <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        </div>
                      </div>
                    )}

                    {/* Phone Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <div className="relative">
                        <input
                          type="tel"
                          className={sharedInput}
                          placeholder="Customer phone number"
                          value={formData.deliveryPhone}
                          onChange={(e) => handleInputChange('deliveryPhone', e.target.value)}
                        />
                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      </div>
                    </div>

                    {/* Delivery Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Time</label>
                      <div className="relative">
                        <select
                          className={`${sharedInput} appearance-none`}
                          value={formData.deliveryTime}
                          onChange={(e) => handleInputChange('deliveryTime', e.target.value)}
                        >
                          <option value="">Select delivery time</option>
                          <option value="09:00-12:00">9:00 AM - 12:00 PM</option>
                          <option value="12:00-15:00">12:00 PM - 3:00 PM</option>
                          <option value="15:00-18:00">3:00 PM - 6:00 PM</option>
                          <option value="18:00-21:00">6:00 PM - 9:00 PM</option>
                          <option value="asap">ASAP (As Soon As Possible)</option>
                        </select>
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                      </div>
                    </div>

                    {/* Method-specific optional fields */}
                    {formData.deliveryMethod === 'bus' && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                            <input
                              type="text"
                              className={`${sharedInput} bg-gray-50`}
                              value={currentBranch?.city || currentBranch?.address || 'Current Branch'}
                              readOnly
                            />
                            <p className="text-xs text-gray-500 mt-1">Automatically set to current branch location</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">To <span className="text-gray-400 text-xs">(optional)</span></label>
                            <select
                              className={`${sharedInput} appearance-none`}
                              value={formData.busDestination || ''}
                              onChange={(e) => handleInputChange('busDestination', e.target.value)}
                            >
                              <option value="">Select destination city</option>
                              <option value="Arusha">Arusha</option>
                              <option value="Mwanza">Mwanza</option>
                              <option value="Dodoma">Dodoma</option>
                              <option value="Mbeya">Mbeya</option>
                              <option value="Tanga">Tanga</option>
                              <option value="Morogoro">Morogoro</option>
                              <option value="Iringa">Iringa</option>
                              <option value="Tabora">Tabora</option>
                              <option value="Kigoma">Kigoma</option>
                              <option value="Mara">Mara</option>
                              <option value="Kagera">Kagera</option>
                              <option value="Shinyanga">Shinyanga</option>
                              <option value="Singida">Singida</option>
                              <option value="Rukwa">Rukwa</option>
                              <option value="Ruvuma">Ruvuma</option>
                              <option value="Lindi">Lindi</option>
                              <option value="Mtwara">Mtwara</option>
                              <option value="Pwani">Pwani</option>
                              <option value="Manyara">Manyara</option>
                              <option value="Geita">Geita</option>
                              <option value="Simiyu">Simiyu</option>
                              <option value="Katavi">Katavi</option>
                              <option value="Njombe">Njombe</option>
                              <option value="Songwe">Songwe</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Bus Company <span className="text-gray-400 text-xs">(optional)</span></label>
                            <input
                              type="text"
                              className={sharedInput}
                              placeholder="Bus company name"
                              value={formData.busName || ''}
                              onChange={(e) => handleInputChange('busName', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Fee</label>
                            <div className="relative">
                              <input
                                type="number"
                                className={sharedInput}
                                placeholder="Delivery fee"
                                value={formData.deliveryFee}
                                onChange={(e) => handleInputChange('deliveryFee', parseInt(e.target.value) || 0)}
                                min="0"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">TZS</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}


                    {formData.deliveryMethod === 'air' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Flight/Airline <span className="text-gray-400 text-xs">(optional)</span></label>
                          <input
                            type="text"
                            className={sharedInput}
                            placeholder="Flight or airline name"
                            value={formData.flightName || ''}
                            onChange={(e) => handleInputChange('flightName', e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Arrival Date <span className="text-gray-400 text-xs">(optional)</span></label>
                            <input
                              type="date"
                              className={sharedInput}
                              value={formData.arrivalDate || ''}
                              onChange={(e) => handleInputChange('arrivalDate', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Arrival Time <span className="text-gray-400 text-xs">(optional)</span></label>
                            <input
                              type="time"
                              className={sharedInput}
                              value={formData.flightArrivalTime ? new Date(formData.flightArrivalTime).toTimeString().slice(0, 5) : ''}
                              onChange={(e) => {
                                const timeValue = e.target.value;
                                const datetimeValue = timeValue ? `${new Date().toISOString().split('T')[0]}T${timeValue}:00` : '';
                                handleInputChange('flightArrivalTime', datetimeValue);
                              }}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Arrival Date/Time for Bus deliveries */}
                    {formData.deliveryMethod === 'bus' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Arrival Date <span className="text-gray-400 text-xs">(optional)</span></label>
                          <input
                            type="date"
                            className={sharedInput}
                            value={formData.arrivalDate || ''}
                            onChange={(e) => handleInputChange('arrivalDate', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Arrival Time <span className="text-gray-400 text-xs">(optional)</span></label>
                          <input
                            type="time"
                            className={sharedInput}
                            value={formData.flightArrivalTime ? new Date(formData.flightArrivalTime).toTimeString().slice(0, 5) : ''}
                            onChange={(e) => {
                              const timeValue = e.target.value;
                              const datetimeValue = timeValue ? `${new Date().toISOString().split('T')[0]}T${timeValue}:00` : '';
                              handleInputChange('flightArrivalTime', datetimeValue);
                            }}
                          />
                        </div>
                      </div>
                    )}


                    {/* Delivery Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Notes</label>
                      <textarea
                        className={`${sharedInput} resize-none`}
                        rows={3}
                        placeholder="Special delivery instructions..."
                        value={formData.deliveryNotes}
                        onChange={(e) => handleInputChange('deliveryNotes', e.target.value)}
                      />
                    </div>
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
                        {formData.deliveryTime && <p className="text-gray-600">Time: {formData.deliveryTime === 'asap' ? 'ASAP' : formData.deliveryTime.replace('-', ' - ')}</p>}
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
                      {formData.deliveryMethod && (
                        <div className="flex justify-between">
                          <span>Method:</span>
                          <span className="font-medium capitalize">{formData.deliveryMethod}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>{formData.deliveryMethod === 'bus' ? 'Destination:' : 'Address:'}</span>
                        <span>{formData.deliveryMethod === 'bus' ? formData.busDestination : formData.deliveryAddress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Phone:</span>
                        <span>{formData.deliveryPhone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time:</span>
                        <span>{formData.deliveryTime === 'asap' ? 'ASAP' : formData.deliveryTime.replace('-', ' - ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fee:</span>
                        <span>TZS {formData.deliveryFee.toLocaleString()}</span>
                      </div>
                      {formData.deliveryMethod === 'bus' && (
                        <>
                          <div className="flex justify-between">
                            <span>From:</span>
                            <span>{currentBranch?.city || currentBranch?.address || 'Current Branch'}</span>
                          </div>
                          {formData.busDestination && (
                            <div className="flex justify-between">
                              <span>To:</span>
                              <span>{formData.busDestination}</span>
                            </div>
                          )}
                          {formData.busName && (
                            <div className="flex justify-between">
                              <span>Bus Company:</span>
                              <span>{formData.busName}</span>
                            </div>
                          )}
                        </>
                      )}
                      {formData.deliveryMethod === 'air' && formData.flightName && (
                        <div className="flex justify-between">
                          <span>Flight/Airline:</span>
                          <span>{formData.flightName}</span>
                        </div>
                      )}
                      {(formData.deliveryMethod === 'bus' || formData.deliveryMethod === 'air') && formData.arrivalDate && (
                        <div className="flex justify-between">
                          <span>Arrival Date:</span>
                          <span>{new Date(formData.arrivalDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {(formData.deliveryMethod === 'bus' || formData.deliveryMethod === 'air') && formData.flightArrivalTime && (
                        <div className="flex justify-between">
                          <span>Arrival Time:</span>
                          <span>{new Date(formData.flightArrivalTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
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
        <div className="p-6 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30">
          <div className="flex justify-between gap-3">
            {/* Previous Step Button */}
            <button
              onClick={currentStep === 1 ? onClose : prevStep}
              disabled={isSubmitting}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-white hover:border-gray-400 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
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
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                Next
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
