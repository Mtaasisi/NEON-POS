import React from 'react';
import { User, Plus, X, Edit3, MapPin, Mail, Phone, Crown } from 'lucide-react';

interface TabletCustomerSectionProps {
  selectedCustomer: any;
  onSelectCustomer: () => void;
  onClearCustomer: () => void;
  onEditCustomer?: () => void;
  sizes: any;
}

const TabletCustomerSection: React.FC<TabletCustomerSectionProps> = ({
  selectedCustomer,
  onSelectCustomer,
  onClearCustomer,
  onEditCustomer,
  sizes,
}) => {
  // Reduce text sizes to match cart section
  const customerSizes = {
    ...sizes,
    textXs: sizes.textXs * 0.8,
    textSm: sizes.textSm * 0.8,
    textBase: sizes.textBase * 0.8,
    textLg: sizes.textLg * 0.8,
    textXl: sizes.textXl * 0.8,
    text2xl: sizes.text2xl * 0.8,
    text3xl: sizes.text3xl * 0.8,
  };

  return (
    <div
      className="border-b border-gray-200 bg-white"
      style={{
        padding: `${sizes.spacing3}px ${sizes.spacing3}px`,
      }}
    >

      {selectedCustomer ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-3 flex-1">
              <div
                className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  width: `${sizes.avatarSize}px`,
                  height: `${sizes.avatarSize}px`,
                }}
              >
                <span
                  style={{ fontSize: `${customerSizes.textLg}px` }}
                  className="text-white font-bold"
                >
                  {selectedCustomer.name?.charAt(0) || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p style={{ fontSize: `${customerSizes.textLg}px` }} className="font-semibold text-gray-900 truncate">
                  {selectedCustomer.name}
                </p>
                  {selectedCustomer.loyaltyLevel && (
                    <div className="flex items-center gap-1">
                      <Crown size={12} className="text-yellow-500" />
                      <span style={{ fontSize: `${customerSizes.textXs}px` }} className="text-yellow-600 font-medium capitalize">
                        {selectedCustomer.loyaltyLevel}
                      </span>
                    </div>
                  )}
                </div>

                {/* Contact Information */}
                <div className="space-y-1">
                  {selectedCustomer.phone && (
                    <div className="flex items-center gap-1">
                      <Phone size={10} className="text-gray-500" />
                      <span style={{ fontSize: `${customerSizes.textSm}px` }} className="text-gray-600">
                    {selectedCustomer.phone}
                      </span>
                    </div>
                )}
                {selectedCustomer.email && (
                    <div className="flex items-center gap-1">
                      <Mail size={10} className="text-gray-500" />
                      <span style={{ fontSize: `${customerSizes.textSm}px` }} className="text-gray-600 truncate">
                    {selectedCustomer.email}
                      </span>
                    </div>
                )}
                  {selectedCustomer.city && (
                    <div className="flex items-center gap-1">
                      <MapPin size={10} className="text-gray-500" />
                      <span style={{ fontSize: `${customerSizes.textSm}px` }} className="text-gray-600">
                        {selectedCustomer.city}
                      </span>
                    </div>
                  )}
                </div>

                {/* Additional Info Row */}
                <div className="flex items-center gap-3 mt-1">
                  {selectedCustomer.gender && (
                    <span style={{ fontSize: `${customerSizes.textXs}px` }} className="text-gray-500 capitalize">
                      {selectedCustomer.gender}
                    </span>
                  )}
                  {selectedCustomer.totalSpent !== undefined && (
                    <span style={{ fontSize: `${customerSizes.textXs}px` }} className="text-green-600 font-medium">
                      TZS {selectedCustomer.totalSpent?.toLocaleString() || '0'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {onEditCustomer && (
                <button
                  onClick={onEditCustomer}
                  className="w-7 h-7 bg-blue-100 hover:bg-blue-200 rounded-full flex items-center justify-center transition-colors"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  title="Edit customer"
                >
                  <Edit3 size={12} className="text-blue-600" />
                </button>
              )}
            <button
              onClick={onClearCustomer}
                className="w-7 h-7 bg-blue-100 hover:bg-blue-200 rounded-full flex items-center justify-center transition-colors"
              style={{ WebkitTapHighlightColor: 'transparent' }}
                title="Clear customer"
            >
                <X size={12} className="text-blue-600" />
            </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={onSelectCustomer}
          className="w-full bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-200 rounded-xl p-3 flex items-center justify-center space-x-3 transition-colors"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <div
            className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"
            style={{
              width: `${sizes.avatarSize}px`,
              height: `${sizes.avatarSize}px`,
            }}
          >
            <User size={20} className="text-blue-500" />
          </div>
          <div className="text-left">
            <p style={{ fontSize: `${customerSizes.textBase}px` }} className="font-semibold text-blue-800">
              Select Customer
            </p>
            <p style={{ fontSize: `${customerSizes.textSm}px` }} className="text-blue-600">
              Choose a customer for this sale
            </p>
          </div>
          <Plus size={20} className="text-blue-400" />
        </button>
      )}
    </div>
  );
};

export default TabletCustomerSection;