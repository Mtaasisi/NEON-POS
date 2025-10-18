import React, { useState } from 'react';
import { X, User, Phone, Mail, MapPin, Save, Loader2, Check, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Customer } from '../../../customers/types';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';
import SuccessModal from '../../../../components/ui/SuccessModal';
import { useSuccessModal } from '../../../../hooks/useSuccessModal';
import { SuccessIcons } from '../../../../components/ui/SuccessModalIcons';

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (customer: Customer) => void;
}

const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({
  isOpen,
  onClose,
  onCustomerCreated
}) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    country: 'Tanzania',
    loyaltyLevel: 'bronze' as 'bronze' | 'silver' | 'gold' | 'platinum',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const successModal = useSuccessModal();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^(\+255|0)[0-9]{9}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid Tanzanian phone number';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Import the customer API
      const { createCustomer } = await import('../../../../lib/customerApi');
      
      const customerData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        country: formData.country,
        loyaltyLevel: formData.loyaltyLevel,
        notes: formData.notes.trim() || undefined,
        isActive: true
      };

      const result = await createCustomer(customerData);

      if (result.success && result.customer) {
        // Show success modal
        successModal.show(
          `${result.customer.name} has been added to your customer list!`,
          {
            title: 'Customer Added! ✅',
            icon: SuccessIcons.customerAdded,
            autoCloseDelay: 0, // Don't auto-close when there are action buttons
            actionButtons: [
              {
                label: 'View Customer',
                onClick: () => {
                  onCustomerCreated(result.customer);
                },
                variant: 'primary',
              },
            ],
          }
        );
        handleClose();
      } else {
        toast.error(result.error || 'Failed to create customer');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Failed to create customer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      country: 'Tanzania',
      loyaltyLevel: 'bronze',
      notes: ''
    });
    setErrors({});
  };

  const handleClose = () => {
    handleReset();
    setIsSubmitting(false);
    onClose();
  };

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[99999]">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Create New Customer</h3>
                <p className="text-xs text-gray-500">Add a new customer to your database</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900 ${
                    errors.name ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="Enter customer name"
                  disabled={isSubmitting}
                />
              </div>
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900 ${
                    errors.phone ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="+255 123 456 789"
                  disabled={isSubmitting}
                />
              </div>
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900 ${
                    errors.email ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="customer@example.com"
                  disabled={isSubmitting}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loyalty Level
              </label>
              <select
                value={formData.loyaltyLevel}
                onChange={(e) => handleInputChange('loyaltyLevel', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                disabled={isSubmitting}
              >
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
            </div>
          </div>

          {/* Address Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                  placeholder="Street address"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                placeholder="City"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
              placeholder="Country"
              disabled={isSubmitting}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
              placeholder="Additional notes about the customer..."
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Action Buttons - Sticky Footer */}
          <div className="w-full" style={{
            position: 'sticky',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.97)',
            boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.05)',
            padding: '16px',
            display: 'flex',
            justifyContent: 'flex-end',
            borderBottomLeftRadius: '24px',
            borderBottomRightRadius: '24px',
            zIndex: 20
          }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-base transition-all duration-200 shadow-sm ml-2 bg-rose-500 text-white hover:bg-rose-600 hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-base transition-all duration-200 shadow-sm ml-2 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-5 h-5" />
              Reset
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-base transition-all duration-200 shadow-sm ml-2 bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Create Customer
                </>
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
      
      {/* Success Modal */}
      <SuccessModal {...successModal.props} />
    </div>
  );
};

export default CreateCustomerModal;
