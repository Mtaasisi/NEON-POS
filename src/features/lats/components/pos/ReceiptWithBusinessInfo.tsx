// Wrapper component that automatically injects business info into receipts
import React from 'react';
import ReceiptGenerator from './ReceiptGenerator';
import { useBusinessInfo } from '../../../../hooks/useBusinessInfo';

interface ReceiptWithBusinessInfoProps {
  receiptData: Omit<React.ComponentProps<typeof ReceiptGenerator>['receiptData'], 'storeInfo'> & {
    storeInfo?: Partial<React.ComponentProps<typeof ReceiptGenerator>['receiptData']['storeInfo']>;
  };
  onPrint?: () => void;
  onEmail?: () => void;
  onClose?: () => void;
  className?: string;
}

/**
 * ReceiptWithBusinessInfo Component
 * 
 * Automatically loads business information from settings and injects it into the receipt.
 * This wrapper makes it easy to generate receipts without manually fetching business info.
 * 
 * Usage:
 * ```tsx
 * <ReceiptWithBusinessInfo
 *   receiptData={{
 *     transactionId: "12345",
 *     date: new Date(),
 *     cashier: "John Doe",
 *     items: [...],
 *     subtotal: 1000,
 *     total: 1180,
 *     // storeInfo will be automatically added
 *   }}
 *   onPrint={() => window.print()}
 * />
 * ```
 */
const ReceiptWithBusinessInfo: React.FC<ReceiptWithBusinessInfoProps> = ({
  receiptData,
  onPrint,
  onEmail,
  onClose,
  className
}) => {
  const { businessInfo, loading } = useBusinessInfo();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading business information...</span>
      </div>
    );
  }

  // Merge business info with any provided storeInfo overrides
  const completeReceiptData = {
    ...receiptData,
    storeInfo: {
      name: receiptData.storeInfo?.name || businessInfo.name,
      address: receiptData.storeInfo?.address || businessInfo.address,
      phone: receiptData.storeInfo?.phone || businessInfo.phone,
      email: receiptData.storeInfo?.email || businessInfo.email,
      website: receiptData.storeInfo?.website || businessInfo.website,
      logo: receiptData.storeInfo?.logo || businessInfo.logo || undefined
    }
  };

  return (
    <ReceiptGenerator
      receiptData={completeReceiptData as React.ComponentProps<typeof ReceiptGenerator>['receiptData']}
      onPrint={onPrint}
      onEmail={onEmail}
      onClose={onClose}
      className={className}
    />
  );
};

export default ReceiptWithBusinessInfo;

