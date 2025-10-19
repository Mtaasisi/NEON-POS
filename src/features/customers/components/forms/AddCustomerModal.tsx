import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { useCustomers } from '../../../../context/CustomersContext';
import { toast } from 'react-hot-toast';
import CustomerForm from './CustomerForm';
import { Customer } from '../../../../types';
import { formatTanzaniaPhoneNumber, formatTanzaniaWhatsAppNumber } from '../../../../lib/phoneUtils';
import SuccessModal from '../../../../components/ui/SuccessModal';
import { useSuccessModal } from '../../../../hooks/useSuccessModal';
import { SuccessIcons } from '../../../../components/ui/SuccessModalIcons';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated?: (customer: Customer) => void;
}

const AddCustomerModal: React.FC<AddCustomerModalProps> = ({ isOpen, onClose, onCustomerCreated }) => {
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
        loyaltyLevel: 'bronze' as const,
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
                  const cleanNumber = whatsappNumber.replace(/\D/g, '');
                  window.open(`https://wa.me/${cleanNumber}`, '_blank');
                },
                variant: 'primary',
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
                  // Form will reset automatically
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

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[99999]">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Add New Customer</h3>
                    <p className="text-xs text-gray-500">Enter customer details below</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                <CustomerForm
                  onSubmit={handleCustomerCreated}
                  onCancel={onClose}
                  isLoading={isLoading}
                  renderActionsInModal={false}
                />
                
                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Adding...' : 'Add Customer'}
                  </button>
                </div>
                <p className="text-xs text-center text-gray-500 mt-2">
                  All changes are saved automatically
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Success Modal - Always rendered so it persists after form closes */}
      <SuccessModal {...successModal.props} />
    </>
  );
};

export default AddCustomerModal; 