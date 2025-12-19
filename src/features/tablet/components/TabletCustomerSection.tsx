import React, { useState, useEffect } from 'react';
import { User, Plus, X, Phone, DollarSign, Package, LineChart, Calendar, MessageCircle, ChevronDown, Crown } from 'lucide-react';
import { format } from '../../lats/lib/format';
import { getCustomerStatistics, formatTimeSinceLastOrder } from '../../../lib/customerStatsService';

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
  const [isExpanded, setIsExpanded] = useState(false); // State to manage collapsible section
  const [customerStats, setCustomerStats] = useState<{
    totalOrders: number;
    totalSpent: number;
    averageOrder: number;
    lastOrderDate: string | null;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Fetch customer statistics when customer changes
  useEffect(() => {
    const fetchCustomerStats = async () => {
      if (!selectedCustomer?.id) {
        setCustomerStats(null);
        return;
      }

      setLoadingStats(true);
      try {
        const stats = await getCustomerStatistics(selectedCustomer.id);
        setCustomerStats(stats);
      } catch (error) {
        console.error('❌ [TabletCustomerSection] Error fetching customer stats:', error);
        setCustomerStats({
          totalOrders: 0,
          totalSpent: 0,
          averageOrder: 0,
          lastOrderDate: null
        });
      } finally {
        setLoadingStats(false);
      }
    };

    fetchCustomerStats();
  }, [selectedCustomer?.id]);
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
        <div className="mb-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
            <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={toggleExpanded}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold text-lg shadow-sm border border-gray-200">
                      {selectedCustomer.name?.charAt(0) || '?'}
                    </div>
                    {/* Assuming loyaltyLevel indicates a special status, using a Crown icon */}
                    {selectedCustomer.loyaltyLevel && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center bg-blue-600">
                        <Crown size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg">{selectedCustomer.name || 'Unnamed Customer'}</div>
                    {selectedCustomer.phone && (
                      <a href={`tel:${selectedCustomer.phone}`} className="text-sm text-gray-600 flex items-center gap-2">
                        <Phone size={12} className="text-gray-500" />
                        {selectedCustomer.phone}
                      </a>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {selectedCustomer.city && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                          {selectedCustomer.city}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={toggleExpanded} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors transform transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <ChevronDown size={20} />
                  </button>
                  <button onClick={onClearCustomer} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200">
                    <X size={20} />
                  </button>
                </div>
              </div>
            </div>
            {isExpanded && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <div className="bg-white rounded-none border-0 shadow-none border-t border-gray-200">
                  <div className="p-4 grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Package size={16} className="text-blue-600" />
                        <span className="text-xs text-gray-600">Total Orders</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">
                        {loadingStats ? '...' : (customerStats?.totalOrders || 0)}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign size={16} className="text-green-600" />
                        <span className="text-xs text-gray-600">Total Spent</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {loadingStats ? '...' : format.money(customerStats?.totalSpent || 0, { short: true })}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <LineChart size={16} className="text-purple-600" />
                        <span className="text-xs text-gray-600">Avg Order</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {loadingStats ? '...' : format.money(customerStats?.averageOrder || 0, { short: true })}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar size={16} className="text-gray-600" />
                        <span className="text-xs text-gray-600">Last Order</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900">
                        {loadingStats ? '...' : formatTimeSinceLastOrder(customerStats?.lastOrderDate || null)}
                      </p>
                    </div>
                  </div>
                  <div className="px-4 pb-4 space-y-2"></div>
                  <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                    {selectedCustomer.phone && (
                      <button className="flex flex-col items-center gap-1 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm" title={selectedCustomer.phone}>
                        <Phone size={20} className="text-blue-600" />
                        <span className="text-xs font-medium text-gray-700">Call</span>
                      </button>
                    )}
                    {selectedCustomer.phone && (
                      <button className="flex flex-col items-center gap-1 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm" title={selectedCustomer.phone}>
                        <MessageCircle size={20} className="text-green-600" />
                        <span className="text-xs font-medium text-gray-700">WhatsApp</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
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