import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Device, DeviceStatus, User } from '../../../../types';
import GlassButton from '../../../shared/components/ui/GlassButton';
import { CheckCircle, Send, PenTool, ShieldCheck, PackageCheck, UserCheck, Hammer, Wrench, XCircle, AlertTriangle, Loader2, X, FileText, Package } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import Modal from '../../../shared/components/ui/Modal';
import { formatCurrency } from '../../../../lib/customerApi';
import { toast } from 'react-hot-toast';
import { getRepairParts } from '../../../lats/lib/sparePartsApi';
import { validateRepairStart, hasNeededParts } from '../../../../utils/repairValidation';
import { usePaymentMethodsContext } from '../../../../context/PaymentMethodsContext';

interface StatusUpdateFormProps {
  device: Device;
  currentUser: User;
  onUpdateStatus: (status: DeviceStatus, fingerprint: string) => void;
  onAddRemark: (remark: string) => void;
  onAddRating?: (score: number, comment: string) => void;
  outstanding?: number; // Add outstanding prop
}

const StatusUpdateForm: React.FC<StatusUpdateFormProps> = ({
  device,
  currentUser,
  onUpdateStatus,
  onAddRemark,
  onAddRating,
  outstanding
}) => {
  const { paymentMethods, loading: paymentMethodsLoading } = usePaymentMethodsContext();

  const [selectedStatus, setSelectedStatus] = useState<DeviceStatus | null>(null);
  const [failResult, setFailResult] = useState<string | null>(null);
  const [failLoading, setFailLoading] = useState(false);
  const [showFailModal, setShowFailModal] = useState(false);
  const [failRemark, setFailRemark] = useState('');


  // Repair parts state
  const [repairParts, setRepairParts] = useState<any[]>([]);
  const [partsLoading, setPartsLoading] = useState(false);

  // --- Improved failed device flow ---
  const [failActionLoading, setFailActionLoading] = useState(false);
  const [failActionRemark, setFailActionRemark] = useState('');
  const [showFailActionModal, setShowFailActionModal] = useState(false);
  const [pendingFailAction, setPendingFailAction] = useState<DeviceStatus | null>(null);

  // Helper: show modal for failed device next action
  const handleFailAction = (nextStatus: DeviceStatus) => {
    setPendingFailAction(nextStatus);
    setShowFailActionModal(true);
    setFailActionRemark('');
  };

  // Helper: submit failed device next action
  const submitFailAction = async () => {
    if (!failActionRemark.trim()) {
      toast.error('Please add a remark for this action.');
      return;
    }
    setFailActionLoading(true);
    try {
      await onAddRemark(failActionRemark);
      await onUpdateStatus(pendingFailAction!, '');
      setShowFailActionModal(false);
      setPendingFailAction(null);
      setFailActionRemark('');
      toast.success('Status updated successfully.');
    } catch (e) {
      toast.error('Failed to update status.');
    } finally {
      setFailActionLoading(false);
    }
  };

  // Load repair parts when device changes
  useEffect(() => {
    const loadRepairParts = async () => {
      if (!device?.id) return;
      
      setPartsLoading(true);
      try {
        const response = await getRepairParts(device.id);
        if (response.ok && response.data) {
          // Transform the data to match the expected interface
          const transformedParts = response.data.map((part: any) => ({
            id: part.id,
            name: part.spare_part?.name || 'Unknown Part',
            description: part.spare_part?.description || '',
            quantity: part.quantity_needed || 0,
            cost: part.cost_per_unit || 0,
            status: part.status || 'needed',
            supplier: part.spare_part?.supplier?.name || 'Unknown',
            estimatedArrival: part.estimated_arrival || null,
            notes: part.notes || ''
          }));
          setRepairParts(transformedParts);
        } else {
          setRepairParts([]);
        }
      } catch (error) {
        console.error('Error loading repair parts:', error);
        setRepairParts([]);
      } finally {
        setPartsLoading(false);
      }
    };

    loadRepairParts();
  }, [device?.id]);

  // REMOVED: Payment functionality - Repair payment functionality removed
  // const [hasCompletedPayment, setHasCompletedPayment] = useState(false);
  // const [showPaymentModal, setShowPaymentModal] = useState(false);
  // const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  // const [lastPayment, setLastPayment] = useState<any>(null);
  // const [paymentAmount, setPaymentAmount] = useState('');
  // const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // const handleRecordPayment = (payment: any) => {
  //   setLastPayment(payment);
  //   setShowPaymentModal(false);
  //   setShowPaymentConfirmation(true);
  // };

  const getAvailableStatusTransitions = () => {
    const { status, assignedTo } = device;
    if (!currentUser) return [];
    const { role, id } = currentUser;
    const isAssignedTechnician = assignedTo === id;
    
    // More flexible role-based status transitions
    switch (status) {
      case 'assigned':
        if (role === 'technician' && isAssignedTechnician) {
          return [
            { status: 'diagnosis-started' as DeviceStatus, label: 'Start Diagnosis', icon: <Hammer size={18} /> }
          ];
        }
        // Allow admin and customer care to assign technicians
        if (role === 'admin' || role === 'customer-care') {
          return [
            { status: 'diagnosis-started' as DeviceStatus, label: 'Start Diagnosis', icon: <Hammer size={18} /> }
          ];
        }
        return [];
        
      case 'diagnosis-started':
        const transitions = [
          { status: 'awaiting-parts' as DeviceStatus, label: 'Awaiting Parts', icon: <PackageCheck size={18} /> }
        ];
        
        // Check if repair can be started based on parts availability
        const needsParts = hasNeededParts(repairParts);
        if (!needsParts) {
          const validation = validateRepairStart(repairParts);
          if (validation.valid) {
            transitions.push({ status: 'in-repair' as DeviceStatus, label: 'Start Repair', icon: <Wrench size={18} /> });
          } else {
            // Add disabled repair option with validation message
            transitions.push({ 
              status: 'in-repair' as DeviceStatus, 
              label: 'Start Repair (Parts Required)', 
              icon: <Wrench size={18} />,
              disabled: true,
              validationMessage: validation.message
            });
          }
        }
        
        if (role === 'technician' && isAssignedTechnician) {
          return transitions;
        }
        // Allow admin and customer care to update status
        if (role === 'admin' || role === 'customer-care') {
          return transitions;
        }
        return [];
        
      case 'awaiting-parts':
        if (role === 'technician' && isAssignedTechnician) {
          return [
            { status: 'parts-arrived' as DeviceStatus, label: 'Parts Arrived', icon: <PackageCheck size={18} /> }
          ];
        }
        // Allow admin and customer care to update status
        if (role === 'admin' || role === 'customer-care') {
          return [
            { status: 'parts-arrived' as DeviceStatus, label: 'Parts Arrived', icon: <PackageCheck size={18} /> }
          ];
        }
        return [];
        
      case 'parts-arrived':
        // Validate if repair can be started from parts-arrived status
        const partsValidation = validateRepairStart(repairParts);
        const repairTransitions = partsValidation.valid 
          ? [{ status: 'in-repair' as DeviceStatus, label: 'Start Repair', icon: <Wrench size={18} /> }]
          : [{ 
              status: 'in-repair' as DeviceStatus, 
              label: 'Start Repair (Parts Required)', 
              icon: <Wrench size={18} />,
              disabled: true,
              validationMessage: partsValidation.message
            }];
        
        if (role === 'technician' && isAssignedTechnician) {
          return repairTransitions;
        }
        // Allow admin and customer care to update status
        if (role === 'admin' || role === 'customer-care') {
          return repairTransitions;
        }
        return [];
        
      case 'in-repair':
        if (role === 'technician' && isAssignedTechnician) {
          return [
            { status: 'reassembled-testing' as DeviceStatus, label: 'Testing', icon: <CheckCircle size={18} /> }
          ];
        }
        // Allow admin and customer care to update status
        if (role === 'admin' || role === 'customer-care') {
          return [
            { status: 'reassembled-testing' as DeviceStatus, label: 'Testing', icon: <CheckCircle size={18} /> }
          ];
        }
        return [];
        
      case 'reassembled-testing':
        if (role === 'technician' && isAssignedTechnician) {
          return [
            { status: 'repair-complete' as DeviceStatus, label: 'Repair Complete', icon: <CheckCircle size={18} /> }
          ];
        }
        // Allow admin and customer care to update status
        if (role === 'admin' || role === 'customer-care') {
          return [
            { status: 'repair-complete' as DeviceStatus, label: 'Repair Complete', icon: <CheckCircle size={18} /> }
          ];
        }
        return [];
        
      case 'repair-complete':
        if (role === 'admin' || role === 'customer-care') {
          return [
            { status: 'returned-to-customer-care' as DeviceStatus, label: 'Give to Customer', icon: <UserCheck size={18} /> }
          ];
        }
        // Technicians cannot handover to customer - only admin/customer-care can
        return [];
        
      // REMOVED: process-payments case - Repair payment functionality removed
        
      case 'returned-to-customer-care':
        if (role === 'admin' || role === 'customer-care') {
          return [
            { status: 'done' as DeviceStatus, label: 'Return to Customer', icon: <UserCheck size={18} /> }
          ];
        }
        return [];
        
      case 'done':
        return [];
        
      case 'failed':
        if (role === 'technician' && isAssignedTechnician) {
          return [
            { status: 'returned-to-customer-care' as DeviceStatus, label: 'Send to Customer Care', icon: <UserCheck size={18} /> }
          ];
        }
        if (role === 'admin' || role === 'customer-care') {
          return [
            { status: 'done' as DeviceStatus, label: 'Return to Customer', icon: <UserCheck size={18} /> }
          ];
        }
        return [];
        
      default:
        return [];
    }
  };



  const handleStatusClick = (status: DeviceStatus, disabled?: boolean, validationMessage?: string) => {
    if (disabled && validationMessage) {
      toast.error(validationMessage);
      return;
    }
    
    if (status === 'awaiting-parts') {
      setShowPartsModal(true);
      return;
    }
    setSelectedStatus(status);
    onUpdateStatus(status, '');
  };

  const handleStatusUpdate = (status: DeviceStatus, fingerprint: string = '') => {
    onUpdateStatus(status, fingerprint);
  };

  const [showPartsModal, setShowPartsModal] = useState(false);
  const [partName, setPartName] = useState('');
  const [awaitingPartsLoading, setAwaitingPartsLoading] = useState(false);

  const handleAwaitingPartsSubmit = async () => {
    if (!partName.trim()) return;
    setAwaitingPartsLoading(true);
    const info = `Awaiting Part: ${partName.trim()}\nDevice: ${device.brand} ${device.model}`;
    await onAddRemark(info);
    setShowPartsModal(false);
    setPartName('');
    setAwaitingPartsLoading(false);
    setSelectedStatus('awaiting-parts');
    onUpdateStatus('awaiting-parts', '');
  };


  const transitions = getAvailableStatusTransitions();
  const isFailed = device.status === 'failed';

  // Helper to check if done transition should be disabled
  const isDoneTransition = (status: DeviceStatus) => status === 'done';
  const isCustomerCare = currentUser?.role === 'customer-care';
  const isPaid = (typeof outstanding === 'number' ? outstanding <= 0 : true);

  return (
    <div className="space-y-6">
      {/* Improved failed device flow UI */}
      {isFailed && transitions.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <h3 className="text-lg font-bold text-red-700 mb-2 flex items-center gap-2">
            <XCircle size={20} className="text-red-500" /> Device Marked as FAILED
          </h3>
          <div className="text-sm text-red-700 mb-2">This device could not be repaired. Please add a remark and proceed with the next action.</div>
          <div className="flex flex-col gap-3">
            {transitions.map((transition) => (
              <GlassButton
                key={transition.status}
                onClick={() => handleFailAction(transition.status)}
                size="lg"
                icon={transition.icon}
                className="justify-start w-full h-[50px]"
                variant={transition.status === 'done' ? 'success' : 'primary'}
                disabled={failActionLoading}
              >
                {transition.label}
              </GlassButton>
            ))}
          </div>
          {/* Modal for confirmation and remark - AddProductModal Style */}
          {showFailActionModal && createPortal(
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/60 z-[99999]"
                onClick={() => setShowFailActionModal(false)}
                aria-hidden="true"
              />
              
              {/* Modal Container */}
              <div 
                className="fixed inset-0 flex items-center justify-center z-[100000] p-4 pointer-events-none"
              >
                <div 
                  className="bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden relative pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                >
                  {/* Close Button */}
                  <button
                    onClick={() => setShowFailActionModal(false)}
                    className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
                    disabled={failActionLoading}
                  >
                    <X className="w-5 h-5" />
                  </button>

                  {/* Icon Header - Fixed */}
                  <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
                    <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
                      {/* Icon */}
                      <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                        <FileText className="w-8 h-8 text-white" />
                      </div>
                      
                      {/* Text */}
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Confirm Action</h3>
                        <p className="text-sm text-gray-600">Please provide a remark for the record</p>
                      </div>
                    </div>
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
                    <div className="py-6">
                      <textarea
                        value={failActionRemark}
                        onChange={e => setFailActionRemark(e.target.value)}
                        placeholder="Add a remark (required)"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                        rows={4}
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Fixed Footer */}
                  <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowFailActionModal(false)}
                        disabled={failActionLoading}
                        className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={submitFailAction}
                        disabled={failActionLoading || !failActionRemark.trim()}
                        className={`px-6 py-3 rounded-xl text-white transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 ${
                          pendingFailAction === 'done' 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {failActionLoading ? 'Processing...' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>,
            document.body
          )}
          {/* Show last 3 remarks for context */}
          {device.remarks && device.remarks.length > 0 && (
            <div className="mt-4">
              <div className="font-semibold text-xs text-gray-700 mb-1">Recent Remarks:</div>
              <ul className="text-xs text-gray-600 space-y-1">
                {device.remarks.slice(-3).reverse().map((r, idx) => (
                  <li key={r.id || idx} className="border-l-2 border-red-300 pl-2">{r.content} <span className="text-gray-400">({new Date(r.createdAt).toLocaleString()})</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {/* Normal status update UI for other statuses */}
      {!isFailed && (
        <>
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Status Update</h3>
            {transitions.length > 0 ? (
              <div className={"flex flex-col gap-4"}>
                {transitions.map((transition, idx) => (
                  <React.Fragment key={transition.status}>
                    <div className="relative group">
                      {/* Hide 'Return to Customer' button unless isPaid */}
                      {isDoneTransition(transition.status) ? (
                        isPaid ? (
                          <GlassButton
                            onClick={() => handleStatusClick(transition.status, transition.disabled, transition.validationMessage)}
                            size="lg"
                            icon={transition.icon}
                            className={`justify-start w-full h-[70px] ${transitions.length === 1 ? 'text-xl' : 'text-base'} ${transition.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            variant={transition.disabled ? "secondary" : "success"}
                            disabled={transition.disabled}
                          >
                            {transition.label}
                          </GlassButton>
                        ) : (
                          <span className="block w-full text-center text-gray-500 bg-gray-100 py-4 rounded-lg">Payment required before release.</span>
                        )
                      ) : (
                        <GlassButton
                          onClick={() => handleStatusClick(transition.status, transition.disabled, transition.validationMessage)}
                          size="lg"
                          icon={transition.icon}
                          className={`justify-start w-full h-[70px] ${transitions.length === 1 ? 'text-xl' : 'text-base'} ${transition.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                          variant={transition.disabled ? "secondary" : "primary"}
                          disabled={transition.disabled}
                        >
                          {transition.label}
                        </GlassButton>
                      )}
                    </div>
                    {/* REMOVED: Record Payment button - Repair payment functionality removed */}
                    {/*
                    {transition.status === 'done' && device.status === 'returned-to-customer-care' && !hasCompletedPayment && (
                      (isCustomerCare || currentUser?.role === 'admin') ? (
                        <div className="flex flex-col gap-2 my-2">
                          <GlassButton
                            variant="primary"
                            icon={<CreditCard size={18} />}
                            onClick={() => setShowPaymentModal(true)}
                            className="w-full"
                            disabled={showPaymentModal}
                          >
                            Record Payment
                          </GlassButton>
                        </div>
                      ) : null
                    )}
                    */}
                  </React.Fragment>
                ))}
                {/* REMOVED: Payment Confirmation Modal - Repair payment functionality removed */}
                {/* Add Mark as Failed to Repair button for assigned technician only */}
                {((device.status === 'in-repair' || device.status === 'assigned') &&
                  currentUser?.role === 'technician' && device.assignedTo === currentUser?.id) && (
                  <div className="relative group">
                    <GlassButton
                      onClick={() => {
                        setFailResult(null);
                        setFailRemark('');
                        setShowFailModal(true);
                      }}
                      size="lg"
                      className="justify-start w-full h-[50px] bg-gradient-to-r from-red-500/90 to-pink-500/90 text-white font-semibold mt-2 hover:from-red-600/90 hover:to-pink-600/90 transition-all duration-200"
                      variant="danger"
                      disabled={failLoading}
                    >
                      ⚠️ Failed to Repair
                    </GlassButton>
                    {failResult && <div className={`mt-2 text-sm ${failResult.startsWith('Device') ? 'text-green-600' : 'text-red-600'}`}>{failResult}</div>}
                    {/* Modal for fail remark - AddProductModal Style */}
                    {showFailModal && createPortal(
                      <>
                        {/* Backdrop */}
                        <div 
                          className="fixed inset-0 bg-black/60 z-[99999]"
                          onClick={() => setShowFailModal(false)}
                          aria-hidden="true"
                        />
                        
                        {/* Modal Container */}
                        <div 
                          className="fixed inset-0 flex items-center justify-center z-[100000] p-4 pointer-events-none"
                        >
                          <div 
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden relative pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                          >
                            {/* Close Button */}
                            <button
                              onClick={() => setShowFailModal(false)}
                              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
                              disabled={failLoading}
                            >
                              <X className="w-5 h-5" />
                            </button>

                            {/* Icon Header - Fixed */}
                            <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
                              <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
                                {/* Icon */}
                                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                                  <AlertTriangle className="w-8 h-8 text-white" />
                                </div>
                                
                                {/* Text */}
                                <div>
                                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Mark Device as Failed</h3>
                                  <p className="text-sm text-gray-600">Please provide a reason for the repair failure</p>
                                </div>
                              </div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
                              <div className="py-6">
                                <textarea
                                  value={failRemark}
                                  onChange={e => setFailRemark(e.target.value)}
                                  placeholder="Please provide a detailed reason why the repair failed..."
                                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
                                  rows={5}
                                />
                              </div>
                            </div>

                            {/* Fixed Footer */}
                            <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
                              <div className="flex justify-end gap-3">
                                <button
                                  type="button"
                                  onClick={() => setShowFailModal(false)}
                                  disabled={failLoading}
                                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    setFailLoading(true);
                                    setFailResult(null);
                                    try {
                                      // First add the remark
                                      await onAddRemark(`FAILED TO REPAIR: ${failRemark}`);
                                      // Then update the status
                                      await onUpdateStatus('failed', '');
                                      setFailResult('Device marked as failed to repair successfully.');
                                      setShowFailModal(false);
                                      // Show success toast
                                      toast.success('Device marked as failed to repair');
                                    } catch (e) {
                                      console.error('Error marking device as failed:', e);
                                      setFailResult('Error: ' + String(e));
                                      toast.error('Failed to mark device as failed');
                                    } finally {
                                      setFailLoading(false);
                                    }
                                  }}
                                  disabled={failLoading || !failRemark.trim()}
                                  className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50"
                                >
                                  {failLoading ? 'Processing...' : 'Mark as Failed'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>,
                      document.body
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-600 italic">
                No status updates available for your role.
              </p>
            )}
          </div>
        </>
      )}

      {/* REMOVED: Payment Modal - Repair payment functionality removed */}
      {/* Awaiting Parts Modal - AddProductModal Style */}
      {showPartsModal && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 z-[99999]"
            onClick={() => { setShowPartsModal(false); setPartName(''); }}
            aria-hidden="true"
          />
          
          {/* Modal Container */}
          <div 
            className="fixed inset-0 flex items-center justify-center z-[100000] p-4 pointer-events-none"
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden relative pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* Close Button */}
              <button
                onClick={() => { setShowPartsModal(false); setPartName(''); }}
                className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
                disabled={awaitingPartsLoading}
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon Header - Fixed */}
              <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
                <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
                  {/* Icon */}
                  <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center shadow-lg">
                    <Package className="w-8 h-8 text-white" />
                  </div>
                  
                  {/* Text */}
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Awaiting Parts</h3>
                    <p className="text-sm text-gray-600">Enter the part you are waiting for</p>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
                <div className="py-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Part Name</label>
                  <input
                    type="text"
                    value={partName}
                    onChange={e => setPartName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                    placeholder="e.g. Charging Port, LCD, Battery"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter' && partName.trim()) { e.preventDefault(); handleAwaitingPartsSubmit(); } }}
                    disabled={awaitingPartsLoading}
                  />
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowPartsModal(false); setPartName(''); }}
                    disabled={awaitingPartsLoading}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAwaitingPartsSubmit}
                    disabled={!partName.trim() || awaitingPartsLoading}
                    className="px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50"
                  >
                    {awaitingPartsLoading ? 'Sending...' : 'Send & Update Status'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default StatusUpdateForm;