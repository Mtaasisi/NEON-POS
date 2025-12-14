import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, User } from 'lucide-react';
import { useCustomers } from '../../../../context/CustomersContext';
import { toast } from 'react-hot-toast';
import CustomerForm from './CustomerForm';
import { Customer } from '../../../../types';
import { formatTanzaniaPhoneNumber, formatTanzaniaWhatsAppNumber } from '../../../../lib/phoneUtils';
import SuccessModal from '../../../../components/ui/SuccessModal';
import { useSuccessModal } from '../../../../hooks/useSuccessModal';
import { SuccessIcons } from '../../../../components/ui/SuccessModalIcons';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated?: (customer: Customer) => void;
  onAddAnother?: () => void; // Callback to reopen modal for adding another customer
}

const AddCustomerModal: React.FC<AddCustomerModalProps> = ({ isOpen, onClose, onCustomerCreated, onAddAnother }) => {
  const { addCustomer } = useCustomers();
  const [isLoading, setIsLoading] = useState(false);
  const successModal = useSuccessModal();

  const handleCustomerCreated = async (customerData: any) => {
    try {
      console.log('═══════════════════════════════════════════════════════');
      console.log('🎯 AddCustomerModal: Starting customer creation process');
      console.log('═══════════════════════════════════════════════════════');
      console.log('📝 Form data received:', customerData);
      
      setIsLoading(true);
      
      // Map CustomerFormValues to the expected Customer format
      const customerPayload = {
        name: customerData.name,
        phone: formatTanzaniaPhoneNumber(customerData.phone),
        email: '', // Email field removed from UI but still required by type
        gender: customerData.gender,
        city: customerData.city,
        whatsapp: formatTanzaniaWhatsAppNumber(customerData.whatsapp || ''),
        referralSource: customerData.referralSource,
        birthMonth: customerData.birthMonth,
        birthDay: customerData.birthDay,
        notes: [], // Initialize empty notes array
        // These fields will be set by the addCustomer function
        loyaltyLevel: 'interested' as const,
        colorTag: customerData.customerTag,
        referrals: [],
        totalSpent: 0,
        points: 0,
        lastVisit: new Date().toISOString(),
        isActive: true,
        devices: [],
      };
      
      console.log('📦 Customer payload prepared:', {
        name: customerPayload.name,
        phone: customerPayload.phone,
        gender: customerPayload.gender,
        city: customerPayload.city,
        whatsapp: customerPayload.whatsapp,
        loyaltyLevel: customerPayload.loyaltyLevel,
        colorTag: customerPayload.colorTag
      });
      
      console.log('🚀 Calling addCustomer function...');
      const customer = await addCustomer(customerPayload);
      
      console.log('📨 addCustomer returned:', customer ? 'Customer object' : 'null/undefined');
      
      if (customer) {
        console.log('✅ Customer created successfully:', {
          id: customer.id,
          name: customer.name,
          phone: customer.phone
        });
        
        // Show beautiful success modal (sound plays automatically)
        successModal.show(
          `${customer.name} has been added to your customer list!`,
          {
            title: 'Customer Added! ✅',
            icon: SuccessIcons.customerAdded,
            autoCloseDelay: 0, // Don't auto-close when there are action buttons
            actionButtons: [
              {
                label: 'Message on WhatsApp',
                onClick: () => {
                  const whatsappNumber = customer.whatsapp || customer.phone;
                  const cleanNumber = whatsappNumber?.replace(/\D/g, '');
                  if (cleanNumber) {
                    const message = encodeURIComponent(`Hello ${customer.name}, thank you for becoming our customer!`);
                    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
                  } else {
                    toast.error('Customer has no phone number');
                  }
                },
                variant: 'whatsapp',
              },
              {
                label: 'View Customer',
                onClick: () => {
                  if (onCustomerCreated) {
                    onCustomerCreated(customer);
                  }
                },
                variant: 'secondary',
              },
              {
                label: 'Add Another',
                onClick: () => {
                  // Reopen the modal for adding another customer
                  if (onAddAnother) {
                    onAddAnother();
                  } else {
                    // Fallback: just close the success modal
                    toast.success('Ready to add another customer!');
                  }
                },
                variant: 'secondary',
              },
            ],
          }
        );
        
        // Close the form modal
        onClose();
      } else {
        console.error('❌ AddCustomerModal: addCustomer returned null/undefined');
        console.error('This should not happen - addCustomer should throw an error instead');
        toast.error('Failed to create customer. Please try again.');
      }
    } catch (error: any) {
      console.error('═══════════════════════════════════════════════════════');
      console.error('❌ AddCustomerModal: CUSTOMER CREATION FAILED');
      console.error('═══════════════════════════════════════════════════════');
      console.error('Error caught in AddCustomerModal.handleCustomerCreated');
      console.error('Error Type:', error?.constructor?.name || 'Unknown');
      console.error('Error Message:', error?.message || 'No message');
      console.error('Error Code:', error?.code || 'No code');
      console.error('Error Details:', error?.details || 'No details');
      console.error('Error Hint:', error?.hint || 'No hint');
      console.error('PostgreSQL Error:', error?.code ? 'Yes (Database error)' : 'No (Application error)');
      console.error('Full Error Object:', error);
      console.error('Stack Trace:', error?.stack || 'No stack trace');
      console.error('═══════════════════════════════════════════════════════');
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Failed to create customer. Please try again.';
      
      if (error?.message?.includes('not authenticated')) {
        errorMessage = 'You are not logged in. Please log in and try again.';
        console.error('🔐 Authentication error detected');
      } else if (error?.code === '23505') {
        errorMessage = 'A customer with this phone number already exists.';
        console.error('📱 Duplicate phone number error');
      } else if (error?.code === '23502') {
        errorMessage = 'Missing required field. Please check all required fields.';
        console.error('📝 Missing required field error');
      } else if (error?.code === '42P01') {
        errorMessage = 'Database table not found. Please contact support.';
        console.error('🗄️ Database table missing error');
      } else if (error?.code === '42703') {
        errorMessage = 'Database column not found. Please contact support.';
        console.error('📊 Database column missing error');
      } else if (error?.message?.includes('RLS')) {
        errorMessage = 'Database security policy blocking insert. Please contact support.';
        console.error('🔒 RLS policy error');
      }
      
      console.error('💬 User-facing error message:', errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      console.log('🏁 AddCustomerModal: Customer creation process ended');
    }
  };

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Additional scroll prevention for html element
  useEffect(() => {
    if (isOpen) {
      // Prevent scrolling on html element as well
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      
      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <div 
        className="fixed bg-black/60 flex items-center justify-center p-4 z-[99999]" 
        style={{
          top: 0, 
          left: 0, 
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          overscrollBehavior: 'none'
        }}
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="customer-form-title"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden relative"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon Header - Fixed */}
          <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center shadow-lg">
                <User className="w-8 h-8 text-white" />
              </div>
              
              {/* Text */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2" id="customer-form-title">
                  Add New Customer
                </h3>
                <p className="text-sm text-gray-600">
                  Enter customer details below
                </p>
              </div>
            </div>
          </div>

          {/* Form - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            <CustomerForm
              onSubmit={handleCustomerCreated}
              onCancel={onClose}
              isLoading={isLoading}
              renderActionsInModal={false}
            />
          </div>

          {/* Action Buttons - Fixed Footer */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 flex-shrink-0 bg-white px-6 pb-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const form = document.getElementById('customer-form') as HTMLFormElement;
                if (form) {
                  form.requestSubmit();
                }
              }}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Add Customer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Success Modal - Always rendered so it persists after form closes */}
      <SuccessModal {...successModal.props} />
    </>,
    document.body
  );
};

export default AddCustomerModal; 