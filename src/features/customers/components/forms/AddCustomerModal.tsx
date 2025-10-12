import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, Sparkles, CheckCircle } from 'lucide-react';
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
                label: 'View Customer',
                onClick: () => {
                  if (onCustomerCreated) {
                    onCustomerCreated(customer);
                  }
                },
                variant: 'primary',
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

  if (!isOpen) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes successPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .modal-enter {
          animation: slideInUp 0.3s ease-out;
        }
        
        .success-animation {
          animation: successPulse 0.6s ease-in-out;
        }
        
        .fade-in {
          animation: fadeIn 0.2s ease-out;
        }
        
        .glass-effect {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .gradient-border {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2px;
          border-radius: 20px;
        }
        
        .gradient-border > div {
          background: rgba(255, 255, 255, 0.98);
          border-radius: 18px;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #667eea, #764ba2);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #5a6fd8, #6a4190);
        }
      `}</style>
      
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
        <div className="modal-enter gradient-border w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
          <div className="glass-effect rounded-t-[18px] flex-1 flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="flex-shrink-0 relative bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-white/30">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5"></div>
              <div className="relative flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <UserPlus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                      Add New Customer
                    </h2>
                    <p className="text-gray-600 mt-1 text-sm">
                      Enter customer details to add them to your system
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="p-3 hover:bg-red-50 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-6 h-6 text-red-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6">
                <CustomerForm
                  onSubmit={handleCustomerCreated}
                  onCancel={onClose}
                  isLoading={isLoading}
                  renderActionsInModal={false}
                >
                  {(actions, formFields) => (
                    <div className="space-y-6">
                      {formFields}
                      
                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-6 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={onClose}
                          disabled={isLoading}
                          className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              Adding Customer...
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" />
                              Add Customer
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </CustomerForm>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Success Modal */}
      <SuccessModal {...successModal.props} />
    </>,
    document.body
  );
};

export default AddCustomerModal; 