import React from 'react';
import SuccessModal from '../../../../components/ui/SuccessModal';
import { PurchaseOrder } from '../../types/inventory';

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
  onCreateAnother: () => void;
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
  onCreateAnother
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
      label: '👁️ View Order',
      onClick: onViewOrder,
      variant: 'primary' as const
    },
    {
      label: '✏️ Edit Order',
      onClick: onEditOrder,
      variant: 'secondary' as const
    },
    {
      label: '🖨️ Print',
      onClick: onPrintOrder,
      variant: 'secondary' as const
    },
    {
      label: '📧 Send to Supplier',
      onClick: onSendToSupplier,
      variant: 'secondary' as const
    },
    {
      label: '➕ Create Another',
      onClick: onCreateAnother,
      variant: 'secondary' as const
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
