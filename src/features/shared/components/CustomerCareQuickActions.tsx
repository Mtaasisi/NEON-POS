import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, QrCode, Stethoscope, ShoppingCart, UserPlus } from 'lucide-react';
import StandardButton from './ui/StandardButton';

interface CustomerCareQuickActionsProps {
  onScanClick: () => void;
}

const CustomerCareQuickActions: React.FC<CustomerCareQuickActionsProps> = ({
  onScanClick
}) => {
  return (
    <div className="flex flex-wrap justify-end gap-2 sm:gap-3 mb-4 sm:mb-6">
      <Link to="/devices/new" className="flex-1 sm:flex-none min-w-[120px]">
        <StandardButton
          variant="primary"
          size="md"
          icon={<PlusCircle size={16} />}
          fullWidth
          className="backdrop-blur-md border border-blue-300/30"
        >
          <span className="hidden sm:inline">New Device</span>
          <span className="sm:hidden">New</span>
        </StandardButton>
      </Link>
      
      <StandardButton
        variant="purple"
        size="md"
        icon={<QrCode size={16} />}
        onClick={onScanClick}
        className="flex-1 sm:flex-none min-w-[120px] backdrop-blur-md border border-purple-300/30"
      >
        <span className="hidden sm:inline">Scan Device</span>
        <span className="sm:hidden">Scan</span>
      </StandardButton>
      
      <Link to="/lats/pos" className="flex-1 sm:flex-none min-w-[120px]">
        <StandardButton
          variant="warning"
          size="md"
          icon={<ShoppingCart size={16} />}
          fullWidth
          className="backdrop-blur-md border border-orange-300/30"
        >
          <span className="hidden sm:inline">Quick Sale</span>
          <span className="sm:hidden">Sale</span>
        </StandardButton>
      </Link>
      
      <Link to="/customers/new" className="flex-1 sm:flex-none min-w-[120px]">
        <StandardButton
          variant="secondary"
          size="md"
          icon={<UserPlus size={16} />}
          fullWidth
          className="backdrop-blur-md border border-gray-300/30"
        >
          <span className="hidden sm:inline">Add Customer</span>
          <span className="sm:hidden">Customer</span>
        </StandardButton>
      </Link>
    </div>
  );
};

export default CustomerCareQuickActions;
