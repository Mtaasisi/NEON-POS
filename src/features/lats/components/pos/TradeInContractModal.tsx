/**
 * Trade-In Contract Modal
 * Generates and manages legal contracts for device trade-ins
 */

import React, { useState, useRef, useEffect } from 'react';
import { FileText, Download, Printer, CheckCircle, X, AlertTriangle } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'sonner';
import type { TradeInTransaction, CustomerIdType } from '../../types/tradeIn';
import { createTradeInContract, getTradeInSettings } from '../../lib/tradeInApi';
import { format } from '../../lib/format';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';

interface TradeInContractModalProps {
  isOpen: boolean;
  transaction: TradeInTransaction;
  onClose: () => void;
  onContractSigned: () => void;
}

export const TradeInContractModal: React.FC<TradeInContractModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onContractSigned,
}) => {
  const [loading, setLoading] = useState(true);
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [ownershipDeclaration, setOwnershipDeclaration] = useState('');
  
  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);
  
  // Form state
  const [idNumber, setIdNumber] = useState('');
  const [idType, setIdType] = useState<CustomerIdType>('national_id');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [saving, setSaving] = useState(false);

  // Signature refs
  const customerSigRef = useRef<SignatureCanvas>(null);
  const staffSigRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setLoading(true);
    const result = await getTradeInSettings();
    if (result.success && result.data) {
      setTermsAndConditions(result.data.contract_terms || '');
      setOwnershipDeclaration(result.data.ownership_declaration || '');
    }
    setLoading(false);
  };

  const handleClearCustomerSignature = () => {
    customerSigRef.current?.clear();
  };

  const handleClearStaffSignature = () => {
    staffSigRef.current?.clear();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!idNumber) {
      toast.error('Please enter customer ID number');
      return;
    }

    if (!agreedToTerms) {
      toast.error('Customer must agree to terms and conditions');
      return;
    }

    if (customerSigRef.current?.isEmpty()) {
      toast.error('Customer signature is required');
      return;
    }

    if (staffSigRef.current?.isEmpty()) {
      toast.error('Staff signature is required');
      return;
    }

    setSaving(true);

    try {
      const result = await createTradeInContract(transaction, {
        transaction_id: transaction.id,
        customer_id_number: idNumber,
        customer_id_type: idType,
        customer_agreed_terms: agreedToTerms,
        customer_signature_data: customerSigRef.current?.toDataURL(),
        staff_signature_data: staffSigRef.current?.toDataURL(),
      });

      if (result.success) {
        toast.success('Contract signed successfully');
        onContractSigned();
        onClose();
      } else {
        toast.error(result.error || 'Failed to create contract');
      }
    } catch (error) {
      console.error('Error creating contract:', error);
      toast.error('Failed to create contract');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
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
        <div 
          className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
          style={{ pointerEvents: 'auto' }}
        >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-purple-700 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-white" />
              <div>
                <h2 className="text-2xl font-bold text-white">Trade-In Purchase Contract</h2>
                <p className="text-purple-100 text-sm mt-1">Legal agreement for device trade-in</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="p-2 hover:bg-purple-800 rounded-lg transition-colors text-white"
                title="Print Contract"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-purple-800 rounded-lg transition-colors text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Contract Header */}
              <div className="text-center border-b-2 border-gray-300 pb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  DEVICE TRADE-IN PURCHASE AGREEMENT
                </h1>
                <p className="text-gray-600">
                  Contract Number: {transaction.transaction_number}
                </p>
                <p className="text-gray-600">
                  Date: {new Date().toLocaleDateString()}
                </p>
              </div>

              {/* Parties Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-4 uppercase text-sm">Seller (Customer)</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>{' '}
                      <span className="font-medium">{transaction.customer?.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Phone:</span>{' '}
                      <span className="font-medium">{transaction.customer?.phone}</span>
                    </div>
                    {transaction.customer?.email && (
                      <div>
                        <span className="text-gray-600">Email:</span>{' '}
                        <span className="font-medium">{transaction.customer.email}</span>
                      </div>
                    )}
                    {transaction.customer?.address && (
                      <div>
                        <span className="text-gray-600">Address:</span>{' '}
                        <span className="font-medium">{transaction.customer.address}</span>
                      </div>
                    )}
                  </div>

                  {/* ID Information */}
                  <div className="mt-4 pt-4 border-t border-gray-200 print:hidden">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ID Type *
                        </label>
                        <select
                          value={idType}
                          onChange={(e) => setIdType(e.target.value as CustomerIdType)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          required
                        >
                          <option value="national_id">National ID</option>
                          <option value="passport">Passport</option>
                          <option value="drivers_license">Driver's License</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ID Number *
                        </label>
                        <input
                          type="text"
                          value={idNumber}
                          onChange={(e) => setIdNumber(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          placeholder="Enter ID number"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm print:block hidden">
                    <div>
                      <span className="text-gray-600">ID Type:</span>{' '}
                      <span className="font-medium">{idType.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">ID Number:</span>{' '}
                      <span className="font-medium">{idNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-4 uppercase text-sm">
                    Buyer (Company)
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Company:</span>{' '}
                      <span className="font-medium">Your Company Name</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Branch:</span>{' '}
                      <span className="font-medium">{transaction.branch?.name || 'Main Branch'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Staff:</span>{' '}
                      <span className="font-medium">{transaction.created_by || 'Staff Member'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Device Information */}
              <div>
                <h3 className="font-bold text-gray-900 mb-4 uppercase text-sm border-b pb-2">
                  Device Information
                </h3>
                <div className="bg-blue-50 p-6 rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Device Name:</span>{' '}
                      <span className="font-medium">{transaction.device_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Model:</span>{' '}
                      <span className="font-medium">{transaction.device_model}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">IMEI:</span>{' '}
                      <span className="font-medium">{transaction.device_imei || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Serial Number:</span>{' '}
                      <span className="font-medium">{transaction.device_serial_number || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Condition:</span>{' '}
                      <span className="font-medium capitalize">{transaction.condition_rating}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Agreed Value:</span>{' '}
                      <span className="font-bold text-green-600">
                        {format.money(transaction.final_trade_in_value)}
                      </span>
                    </div>
                  </div>
                  {transaction.condition_description && (
                    <div className="pt-3 border-t border-blue-200">
                      <span className="text-gray-600 text-sm">Condition Notes:</span>
                      <p className="text-sm mt-1">{transaction.condition_description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ownership Declaration */}
              <div>
                <h3 className="font-bold text-gray-900 mb-4 uppercase text-sm border-b pb-2">
                  Ownership Declaration
                </h3>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />
                    <div className="text-sm text-gray-700 whitespace-pre-line">
                      {ownershipDeclaration}
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div>
                <h3 className="font-bold text-gray-900 mb-4 uppercase text-sm border-b pb-2">
                  Terms and Conditions
                </h3>
                <div className="bg-gray-50 p-6 rounded-lg max-h-64 overflow-y-auto">
                  <div className="text-sm text-gray-700 whitespace-pre-line space-y-2">
                    {termsAndConditions}
                  </div>
                </div>
              </div>

              {/* Agreement Checkbox */}
              <div className="bg-green-50 border-2 border-green-200 p-6 rounded-lg print:hidden">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500 mt-1"
                    required
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-gray-900">
                      I have read, understood, and agree to all terms and conditions stated above.
                    </span>
                    <p className="text-sm text-gray-600 mt-1">
                      I confirm that I am the legal owner of the device and have the right to sell it.
                    </p>
                  </div>
                </label>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Signature */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">
                    Customer Signature *
                  </label>
                  <div className="border-2 border-gray-300 rounded-lg p-2 bg-white print:hidden">
                    <SignatureCanvas
                      ref={customerSigRef}
                      canvasProps={{
                        className: 'w-full h-32 border border-gray-200 rounded',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleClearCustomerSignature}
                      className="mt-2 text-xs text-red-600 hover:text-red-700"
                    >
                      Clear Signature
                    </button>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <div>Name: {transaction.customer?.name}</div>
                    <div>Date: {new Date().toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Staff Signature */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">
                    Staff Signature *
                  </label>
                  <div className="border-2 border-gray-300 rounded-lg p-2 bg-white print:hidden">
                    <SignatureCanvas
                      ref={staffSigRef}
                      canvasProps={{
                        className: 'w-full h-32 border border-gray-200 rounded',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleClearStaffSignature}
                      className="mt-2 text-xs text-red-600 hover:text-red-700"
                    >
                      Clear Signature
                    </button>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <div>Staff Member: {transaction.created_by || 'Staff Name'}</div>
                    <div>Date: {new Date().toLocaleDateString()}</div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200 print:hidden">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !agreedToTerms}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                      Saving Contract...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Sign & Complete Contract
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
        
        {/* Print Styles */}
        <style>{`
          @media print {
            @page {
              size: A4;
              margin: 20mm;
            }
            
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        `}</style>
      </div>
      </div>
    </>
  );
};

export default TradeInContractModal;

