import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, X, Save, Calendar, DollarSign, AlertTriangle, 
  CheckCircle, XCircle, RefreshCw, Edit
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import {
  getSupplierContracts,
  createSupplierContract,
  updateSupplierContract,
  renewSupplierContract,
  type SupplierContract
} from '../../../lib/supplierContractsApi';

interface SupplierContractTabProps {
  supplierId: string;
  supplierName: string;
}

const SupplierContractTab: React.FC<SupplierContractTabProps> = ({
  supplierId,
  supplierName
}) => {
  const [contracts, setContracts] = useState<SupplierContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [renewingContract, setRenewingContract] = useState<string | null>(null);

  // Form state
  const [contractNumber, setContractNumber] = useState('');
  const [contractName, setContractName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [currency, setCurrency] = useState('TZS');
  const [autoRenew, setAutoRenew] = useState(false);
  const [renewalNoticeDays, setRenewalNoticeDays] = useState('30');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadContracts();
  }, [supplierId]);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const data = await getSupplierContracts(supplierId);
      setContracts(data);
    } catch (error) {
      console.error('Error loading contracts:', error);
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!startDate || !endDate) {
      toast.error('Please enter start and end dates');
      return;
    }

    try {
      setSubmitting(true);
      await createSupplierContract({
        supplier_id: supplierId,
        contract_number: contractNumber || undefined,
        contract_name: contractName || undefined,
        start_date: startDate,
        end_date: endDate,
        contract_value: contractValue ? parseFloat(contractValue) : undefined,
        currency,
        auto_renew: autoRenew,
        renewal_notice_days: parseInt(renewalNoticeDays),
        payment_terms: paymentTerms || undefined,
        terms_and_conditions: termsAndConditions || undefined,
        notes: notes || undefined
      });

      toast.success('Contract created successfully');
      setShowAddModal(false);
      resetForm();
      loadContracts();
    } catch (error) {
      console.error('Error creating contract:', error);
      toast.error('Failed to create contract');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRenew = async (contractId: string) => {
    const newEndDate = prompt('Enter new end date (YYYY-MM-DD):');
    if (!newEndDate) return;

    try {
      setRenewingContract(contractId);
      await renewSupplierContract(contractId, newEndDate);
      toast.success('Contract renewed successfully');
      loadContracts();
    } catch (error) {
      console.error('Error renewing contract:', error);
      toast.error('Failed to renew contract');
    } finally {
      setRenewingContract(null);
    }
  };

  const handleStatusChange = async (contractId: string, newStatus: string) => {
    try {
      await updateSupplierContract(contractId, { status: newStatus });
      toast.success('Contract status updated');
      loadContracts();
    } catch (error) {
      console.error('Error updating contract:', error);
      toast.error('Failed to update contract');
    }
  };

  const resetForm = () => {
    setContractNumber('');
    setContractName('');
    setStartDate('');
    setEndDate('');
    setContractValue('');
    setCurrency('TZS');
    setAutoRenew(false);
    setRenewalNoticeDays('30');
    setPaymentTerms('');
    setTermsAndConditions('');
    setNotes('');
  };

  const getDaysUntilExpiry = (endDate: string) => {
    const days = Math.floor((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getStatusBadge = (contract: SupplierContract) => {
    const daysUntilExpiry = getDaysUntilExpiry(contract.end_date);
    
    if (contract.status === 'expired' || daysUntilExpiry < 0) {
      return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">Expired</span>;
    }
    if (contract.status === 'cancelled') {
      return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">Cancelled</span>;
    }
    if (contract.status === 'renewed') {
      return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">Renewed</span>;
    }
    if (daysUntilExpiry <= 30) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">Expiring Soon</span>;
    }
    return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">Active</span>;
  };

  const formatCurrency = (value?: number, curr: string = 'TZS') => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        <span className="ml-3 text-gray-600">Loading contracts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-700">Contracts</h4>
          <p className="text-xs text-gray-500">Manage supplier contracts and agreements</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors inline-flex items-center gap-2 text-sm"
        >
          <Plus size={16} />
          New Contract
        </button>
      </div>

      {/* Contracts List */}
      {contracts.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Contracts</h4>
          <p className="text-gray-600 mb-6">Create your first contract with this supplier</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus size={18} />
            Create Contract
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {contracts.map((contract) => {
            const daysUntilExpiry = getDaysUntilExpiry(contract.end_date);
            const isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
            const isExpired = daysUntilExpiry < 0;

            return (
              <GlassCard key={contract.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        {contract.contract_name || contract.contract_number || 'Unnamed Contract'}
                      </h4>
                      {getStatusBadge(contract)}
                      {contract.auto_renew && (
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium flex items-center gap-1">
                          <RefreshCw size={12} />
                          Auto-Renew
                        </span>
                      )}
                    </div>
                    {contract.contract_number && contract.contract_name && (
                      <p className="text-sm text-gray-600">{contract.contract_number}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {contract.status === 'active' && !isExpired && (
                      <button
                        onClick={() => handleRenew(contract.id)}
                        disabled={renewingContract === contract.id}
                        className="px-3 py-2 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors inline-flex items-center gap-1 text-xs disabled:opacity-50"
                      >
                        {renewingContract === contract.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-700 border-t-transparent"></div>
                            Renewing...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={14} />
                            Renew
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Contract Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <span className="text-sm text-gray-600">Start Date:</span>
                    <p className="font-medium text-gray-900">
                      {new Date(contract.start_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">End Date:</span>
                    <p className={`font-medium ${
                      isExpired ? 'text-red-600' : isExpiringSoon ? 'text-yellow-600' : 'text-gray-900'
                    }`}>
                      {new Date(contract.end_date).toLocaleDateString()}
                    </p>
                    {!isExpired && daysUntilExpiry >= 0 && (
                      <p className="text-xs text-gray-500">
                        {daysUntilExpiry} days remaining
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Value:</span>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(contract.contract_value, contract.currency)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Payment Terms:</span>
                    <p className="font-medium text-gray-900">
                      {contract.payment_terms || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Expiry Warning */}
                {(isExpired || isExpiringSoon) && contract.status === 'active' && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
                    isExpired ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
                  }`}>
                    <AlertTriangle size={16} />
                    <span className="text-sm font-medium">
                      {isExpired 
                        ? 'This contract has expired' 
                        : `Contract expires in ${daysUntilExpiry} days`}
                    </span>
                  </div>
                )}

                {/* Terms & Notes */}
                {(contract.terms_and_conditions || contract.notes) && (
                  <div className="border-t border-gray-200 pt-4">
                    {contract.terms_and_conditions && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-700">Terms & Conditions:</span>
                        <p className="text-sm text-gray-600 mt-1">{contract.terms_and_conditions}</p>
                      </div>
                    )}
                    {contract.notes && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Notes:</span>
                        <p className="text-sm text-gray-600 mt-1">{contract.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Actions */}
                {contract.status === 'active' && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleStatusChange(contract.id, 'cancelled')}
                      className="px-3 py-2 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors text-xs"
                    >
                      Cancel Contract
                    </button>
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Add Contract Modal */}
      {showAddModal && (
        <>
          <div 
            className="fixed bg-black/50"
            onClick={() => {
              if (!submitting) {
                setShowAddModal(false);
                resetForm();
              }
            }}
            style={{
              left: 'var(--sidebar-width, 0px)',
              top: 'var(--topbar-height, 64px)',
              right: 0,
              bottom: 0,
              zIndex: 55
            }}
          />
          
          <div 
            className="fixed flex items-center justify-center p-4"
            style={{
              left: 'var(--sidebar-width, 0px)',
              top: 'var(--topbar-height, 64px)',
              right: 0,
              bottom: 0,
              zIndex: 60,
              pointerEvents: 'none'
            }}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              style={{ pointerEvents: 'auto' }}
            >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">New Contract</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                disabled={submitting}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Contract Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contract Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                    disabled={submitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="CON-2024-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contract Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={contractName}
                    onChange={(e) => setContractName(e.target.value)}
                    disabled={submitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Annual Supply Agreement"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={submitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={submitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Value & Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contract Value (Optional)
                  </label>
                  <input
                    type="number"
                    value={contractValue}
                    onChange={(e) => setContractValue(e.target.value)}
                    disabled={submitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    disabled={submitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="TZS">TZS</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CNY">CNY</option>
                  </select>
                </div>
              </div>

              {/* Payment Terms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Terms (Optional)
                </label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Net 30, Net 60, etc."
                />
              </div>

              {/* Auto-Renew */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRenew}
                    onChange={(e) => setAutoRenew(e.target.checked)}
                    disabled={submitting}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Auto-Renew</span>
                </label>
                {autoRenew && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Notify</span>
                    <input
                      type="number"
                      value={renewalNoticeDays}
                      onChange={(e) => setRenewalNoticeDays(e.target.value)}
                      disabled={submitting}
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                      min="1"
                    />
                    <span className="text-sm text-gray-600">days before expiry</span>
                  </div>
                )}
              </div>

              {/* Terms & Conditions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Terms & Conditions (Optional)
                </label>
                <textarea
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  disabled={submitting}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter contract terms and conditions..."
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={submitting}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Internal notes about this contract..."
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                disabled={submitting}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !startDate || !endDate}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Create Contract
                  </>
                )}
              </button>
            </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SupplierContractTab;

