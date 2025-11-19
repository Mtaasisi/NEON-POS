import React from 'react';
import SuccessModal from '../../../../components/ui/SuccessModal';
import { PurchaseOrder } from '../../types/inventory';
import { Eye, Edit, Printer, DollarSign } from 'lucide-react';

interface PurchaseOrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder;
  onViewOrder: () => void;
  onEditOrder: () => void;
  onPrintOrder: () => void;
  onSendToSupplier: () => void;
  onDownloadPDF: () => void;
  onCopyOrderNumber: () => void;
  onShareOrder: () => void;
  onGoToOrders: () => void;
  onAddPayment?: () => void; // New: Add payment handler
}

const PurchaseOrderSuccessModal: React.FC<PurchaseOrderSuccessModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  onViewOrder,
  onEditOrder,
  onPrintOrder,
  onSendToSupplier,
  onDownloadPDF,
  onCopyOrderNumber,
  onShareOrder,
  onGoToOrders,
  onAddPayment
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Prepare the message with order details
  const message = `PO #${purchaseOrder.orderNumber} has been successfully created with ${purchaseOrder.items.length} item(s) totaling ${formatCurrency(purchaseOrder.totalAmount)}`;

  // Define action buttons
  const actionButtons = [
    {
      label: (
        <div className="flex items-center justify-center gap-2">
          <Eye className="w-5 h-5" />
          <span>View Order</span>
        </div>
      ),
      onClick: onViewOrder,
      variant: 'primary' as const
    },
    {
      label: (
        <div className="flex items-center justify-center gap-2">
          <Edit className="w-5 h-5" />
          <span>Edit Order</span>
        </div>
      ),
      onClick: onEditOrder,
      variant: 'secondary' as const
    },
    {
      label: (
        <div className="flex items-center justify-center gap-2">
          <Printer className="w-5 h-5" />
          <span>Print PO</span>
        </div>
      ),
      onClick: onPrintOrder,
      variant: 'secondary' as const
    },
    {
      label: (
        <div className="flex items-center justify-center gap-2">
          <DollarSign className="w-5 h-5" />
          <span>Add Payment</span>
        </div>
      ),
      onClick: onAddPayment || (() => {}),
      variant: 'success' as const,
      disabled: !onAddPayment
    }
  ];

  return (
    <SuccessModal
      isOpen={isOpen}
      onClose={onClose}
      title="Purchase Order Created!"
      message={message}
      autoCloseDelay={0} // Don't auto-close since user needs to take action
      actionButtons={actionButtons}
      playSound={true}
      showCloseButton={true}
    />
  );
};

export default PurchaseOrderSuccessModal;
