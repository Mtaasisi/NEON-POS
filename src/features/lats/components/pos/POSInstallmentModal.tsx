import React, { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { installmentService } from '../../../../lib/installmentService';
import { saleProcessingService } from '../../../../lib/saleProcessingService';
import { financeAccountService } from '../../../../lib/financeAccountService';
import { PaymentFrequency } from '../../../../types/specialOrders';
import { useBranch } from '../../../../context/BranchContext';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';

interface POSInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cartItems: any[];
  cartTotal: number;
  customer: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  currentUser: any;
}

const POSInstallmentModal: React.FC<POSInstallmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  cartItems,
  cartTotal,
  customer,
  currentUser
}) => {
  const { currentBranch } = useBranch();
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);
  
  const [formData, setFormData] = useState({
    down_payment: 0,
    number_of_installments: 3,
    payment_frequency: 'monthly' as PaymentFrequency,
    start_date: new Date().toISOString().split('T')[0],
    late_fee_amount: 0,
    notes: 'Created from POS',
    payment_method: 'cash',
    account_id: ''
  });

  // Debug props on mount
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 [POS Installment] Modal opened with props:');
      console.log('   - customer:', customer);
      console.log('   - currentUser:', currentUser);
      console.log('   - cartItems:', cartItems);
      console.log('   - cartTotal:', cartTotal);
      
      if (!customer) {
        console.error('❌ [POS Installment] Customer is null/undefined!');
      }
      if (!currentUser) {
        console.error('❌ [POS Installment] CurrentUser is null/undefined!');
      }
    }
  }, [isOpen, customer, currentUser, cartItems, cartTotal]);

  // Fetch payment accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const accounts = await financeAccountService.getPaymentMethods();
        setPaymentAccounts(accounts);
      } catch (error) {
        console.error('Error fetching payment accounts:', error);
      }
    };

    if (isOpen) {
      fetchAccounts();
    }
  }, [isOpen]);

  const amountFinanced = cartTotal - formData.down_payment;
  const installmentAmount = amountFinanced / formData.number_of_installments;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 [POS Installment] Form submitted');
    console.log('📋 [POS Installment] Form Data:', formData);
    console.log('👤 [POS Installment] Customer:', customer);
    console.log('🛒 [POS Installment] Cart Total:', cartTotal);
    console.log('📦 [POS Installment] Cart Items Count:', cartItems?.length);
    
    // Validate customer
    if (!customer) {
      console.error('❌ [POS Installment] Customer is null/undefined');
      toast.error('Customer information is missing. Please select a customer.');
      return;
    }
    
    if (!customer.id) {
      console.error('❌ [POS Installment] Customer ID is missing:', customer);
      toast.error('Customer ID is missing. Please reselect the customer.');
      return;
    }
    
    // Validate cart
    if (!cartItems || cartItems.length === 0) {
      console.error('❌ [POS Installment] No items in cart');
      toast.error('Please add items to cart first');
      return;
    }
    
    if (!formData.account_id) {
      console.error('❌ [POS Installment] No payment account selected');
      toast.error('Please select a payment account');
      return;
    }

    if (formData.down_payment < 0 || formData.down_payment > cartTotal) {
      console.error('❌ [POS Installment] Invalid down payment:', formData.down_payment);
      toast.error('Invalid down payment amount');
      return;
    }

    if (!currentUser) {
      console.error('❌ [POS Installment] CurrentUser is null/undefined');
      toast.error('User not authenticated. Please log in again.');
      return;
    }
    
    if (!currentUser.id) {
      console.error('❌ [POS Installment] User ID is missing:', currentUser);
      toast.error('User ID is missing. Please log in again.');
      return;
    }

    console.log('✅ [POS Installment] All validations passed');
    setIsSubmitting(true);
    
    try {
      // Step 1: Create the sale first
      console.log('📝 [POS Installment] Step 1: Creating sale...');
      
      const saleData = {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        items: cartItems.map(item => ({
          id: item.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          variantName: item.variantName || '',
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          costPrice: item.costPrice || 0,
          profit: item.profit || 0
        })),
        subtotal: cartTotal,
        tax: 0,
        discount: 0,
        total: cartTotal,
        paymentMethod: {
          type: 'installment',
          amount: 0, // Set to 0 to skip payment transaction creation
          details: {
            accountId: formData.account_id,
            reference: 'Installment Plan - Payments tracked via installment_payments table',
            notes: `Installment Plan: ${formData.number_of_installments} payments`
          }
        },
        // Set payment_status to 'completed' to avoid trigger issues
        // Actual payment tracking is handled by the installment_payments table
        paymentStatus: 'completed',
        soldBy: currentUser?.name || currentUser?.email || 'POS User',
        notes: `Installment Plan: ${formData.number_of_installments} payments`
      };

      console.log('📤 [POS Installment] Sale Data:', JSON.stringify(saleData, null, 2));
      
      const saleResult = await saleProcessingService.processSale(saleData as any);

      console.log('📥 [POS Installment] Sale Result:', saleResult);

      if (!saleResult.success || !saleResult.sale) {
        console.error('❌ [POS Installment] Sale creation failed:', saleResult.error);
        throw new Error(saleResult.error || 'Failed to create sale');
      }

      console.log('✅ [POS Installment] Sale created successfully');
      console.log('🔢 [POS Installment] Sale ID:', saleResult.sale.id);
      console.log('🔢 [POS Installment] Sale Number:', saleResult.sale.saleNumber);

      // Step 2: Create the installment plan linked to the sale
      console.log('📝 [POS Installment] Step 2: Creating installment plan...');
      
      const installmentData = {
        customer_id: customer.id,
        sale_id: saleResult.sale.id, // Link to the sale we just created
        total_amount: cartTotal,
        down_payment: formData.down_payment,
        number_of_installments: formData.number_of_installments,
        payment_frequency: formData.payment_frequency,
        start_date: formData.start_date,
        late_fee_amount: formData.late_fee_amount,
        notes: `${formData.notes} - Sale: ${saleResult.sale.saleNumber}`,
        payment_method: formData.payment_method,
        account_id: formData.account_id
      };

      console.log('📤 [POS Installment] Installment Data:', JSON.stringify(installmentData, null, 2));
      console.log('👤 [POS Installment] Created By User ID:', currentUser.id);
      console.log('💰 [POS Installment] Payment Calculations:', {
        cartTotal,
        downPayment: formData.down_payment,
        amountToFinance: amountFinanced,
        calculatedInstallmentAmount: installmentAmount,
        numberOfInstallments: formData.number_of_installments
      });

      const installmentResult = await installmentService.createInstallmentPlan(
        installmentData,
        currentUser.id,
        currentBranch?.id
      );

      console.log('📥 [POS Installment] Installment Result:', installmentResult);

      if (installmentResult.success) {
        console.log('✅ [POS Installment] Installment plan created successfully!');
        console.log('🔢 [POS Installment] Plan Number:', installmentResult.plan?.plan_number);
        console.log('🔢 [POS Installment] Plan ID:', installmentResult.plan?.id);
        toast.success(`✅ Sale completed with installment plan!\nSale: ${saleResult.sale.saleNumber}\nPlan: ${installmentResult.plan?.plan_number}`);
        onSuccess();
      } else {
        console.error('❌ [POS Installment] Installment plan creation failed:', installmentResult.error);
        toast.error(installmentResult.error || 'Failed to create installment plan');
      }
    } catch (error: any) {
      console.error('❌ [POS Installment] Error creating installment sale:', error);
      console.error('❌ [POS Installment] Error Stack:', error.stack);
      toast.error(error.message || 'An error occurred');
    } finally {
      console.log('🏁 [POS Installment] Process complete, resetting submit state');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - respects sidebar and topbar */}
      <div 
        className="fixed bg-black bg-opacity-50"
        onClick={onClose}
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ pointerEvents: 'auto' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-purple-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg">
              <CreditCard className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Create Installment Plan</h3>
              <p className="text-sm text-purple-100">Set up payment terms for this sale</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Customer & Cart Summary */}
        <div className="p-6 bg-purple-50 border-b border-purple-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-purple-700 mb-1">Customer</p>
              <p className="font-semibold text-gray-900">{customer?.name || 'N/A'}</p>
              {customer?.phone && <p className="text-sm text-gray-600">{customer.phone}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-purple-700 mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                {cartTotal.toLocaleString('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 })}
              </p>
              <p className="text-sm text-gray-600">{cartItems?.length || 0} items</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Down Payment & Installments */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Down Payment <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.down_payment}
                onChange={(e) => setFormData(prev => ({ ...prev, down_payment: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                min="0"
                max={cartTotal}
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Installments <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.number_of_installments}
                onChange={(e) => setFormData(prev => ({ ...prev, number_of_installments: parseInt(e.target.value) || 1 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                min="1"
                required
              />
            </div>
          </div>

          {/* Calculation Summary */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Amount to Finance:</span>
                  <div className="font-bold text-green-900 text-lg">
                    {amountFinanced.toLocaleString('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 })}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Calculated Per Installment:</span>
                  <div className="font-bold text-green-900 text-lg">
                    {installmentAmount.toLocaleString('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
              {formData.down_payment > 0 && (
                <div className="pt-2 border-t border-green-300">
                  <p className="text-xs text-green-800">
                    💰 <strong>Down payment of {formData.down_payment.toLocaleString('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 })}</strong> will be recorded when you create this plan. 
                    Future payments will be <strong>{installmentAmount.toLocaleString('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 })} each</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Frequency & Start Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Frequency <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.payment_frequency}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_frequency: e.target.value as PaymentFrequency }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="weekly">Weekly</option>
                <option value="bi_weekly">Bi-Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Payment Method & Account */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Account <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.account_id}
                onChange={(e) => setFormData(prev => ({ ...prev, account_id: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="">Select Account</option>
                {paymentAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Late Fee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Late Fee Amount</label>
            <input
              type="number"
              value={formData.late_fee_amount}
              onChange={(e) => setFormData(prev => ({ ...prev, late_fee_amount: parseFloat(e.target.value) || 0 }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              min="0"
              step="0.01"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Calendar size={18} />
                  Create Installment Plan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      </div>
    </>
  );
};

export default POSInstallmentModal;

