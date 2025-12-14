import React from 'react';
import { User, Plus, X } from 'lucide-react';

interface TabletCustomerSectionProps {
  selectedCustomer: any;
  onSelectCustomer: () => void;
  onClearCustomer: () => void;
  sizes: any;
}

const TabletCustomerSection: React.FC<TabletCustomerSectionProps> = ({
  selectedCustomer,
  onSelectCustomer,
  onClearCustomer,
  sizes,
}) => {
  return (
    <div
      className="border-b border-gray-200 bg-white"
      style={{
        padding: `${sizes.spacing6}px ${sizes.spacing6}px`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 style={{ fontSize: `${sizes.textLg}px` }} className="font-bold text-gray-900">
          Customer
        </h3>
      </div>

      {selectedCustomer ? (
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center"
                style={{
                  width: `${sizes.avatarSize}px`,
                  height: `${sizes.avatarSize}px`,
                }}
              >
                <span
                  style={{ fontSize: `${sizes.textLg}px` }}
                  className="text-white font-bold"
                >
                  {selectedCustomer.name?.charAt(0) || '?'}
                </span>
              </div>
              <div>
                <p style={{ fontSize: `${sizes.textLg}px` }} className="font-semibold text-gray-900">
                  {selectedCustomer.name}
                </p>
                {selectedCustomer.phone && (
                  <p style={{ fontSize: `${sizes.textBase}px` }} className="text-gray-600">
                    {selectedCustomer.phone}
                  </p>
                )}
                {selectedCustomer.email && (
                  <p style={{ fontSize: `${sizes.textSm}px` }} className="text-gray-500">
                    {selectedCustomer.email}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClearCustomer}
              className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <X size={16} className="text-gray-600" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={onSelectCustomer}
          className="w-full bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-200 rounded-xl p-4 flex items-center justify-center space-x-3 transition-colors"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <div
            className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center"
            style={{
              width: `${sizes.avatarSize}px`,
              height: `${sizes.avatarSize}px`,
            }}
          >
            <User size={20} className="text-gray-500" />
          </div>
          <div className="text-left">
            <p style={{ fontSize: `${sizes.textBase}px` }} className="font-semibold text-gray-700">
              Select Customer
            </p>
            <p style={{ fontSize: `${sizes.textSm}px` }} className="text-gray-500">
              Choose a customer for this sale
            </p>
          </div>
          <Plus size={20} className="text-gray-400" />
        </button>
      )}
    </div>
  );
};

export default TabletCustomerSection;