import React, { useMemo, useState } from 'react';
import { X, Phone, MapPin, Crown } from 'lucide-react';
import { format } from '../../lats/lib/format';

interface TabletCustomerSelectionModalProps {
  customers: any[];
  onSelect: (customer: any) => void;
  onClose: () => void;
  onAddNew: () => void;
}

const TabletCustomerSelectionModal: React.FC<TabletCustomerSelectionModalProps> = ({
  customers,
  onSelect,
  onClose,
  onAddNew,
}) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return customers;
    const q = query.toLowerCase();
    return customers.filter((c: any) =>
      [c.name, c.phone, c.email]
        .filter(Boolean)
        .some((field: string) => field.toLowerCase().includes(q))
    );
  }, [customers, query]);

  const handleSelect = (customer: any) => {
    onSelect(customer);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Select Customer</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>
        <div className="p-6">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customers by name, phone, or email..."
              className="w-full border border-gray-200 rounded-lg py-3 px-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Customer Grid */}
          <div className="mt-6">
          <div className="max-h-[60vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-sm text-gray-500 text-center">
                No customers found
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((customer: any) => (
                  <div
                    key={customer.id}
                    onClick={() => handleSelect(customer)}
                    className="bg-white rounded-xl p-5 shadow-sm hover:shadow-lg border border-gray-200 hover:border-blue-300 cursor-pointer transition-all duration-200"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-xl">{customer.name?.[0]?.toUpperCase() || '?'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <h3 className="font-semibold text-gray-800 text-lg truncate">{customer.name || 'Unnamed Customer'}</h3>
                          {customer.loyaltyLevel && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full capitalize">
                              <Crown size={12} className="text-yellow-600" />
                              {customer.loyaltyLevel}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                      {customer.phone && (
                            <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-base text-gray-700 hover:text-blue-600 transition-colors">
                              <Phone size={16} className="text-gray-500" />
                              <span>{customer.phone}</span>
                            </a>
                          )}
                          {customer.city && (
                            <div className="flex items-center gap-2 text-base text-gray-600">
                              <MapPin size={16} className="text-gray-500" />
                              <span>{customer.city}</span>
                        </div>
                      )}
                        </div>
                      </div>
                    </div>
                    {(customer.points !== undefined || customer.total_spent !== undefined) && (
                      <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-100">
                        {customer.points !== undefined && (
                          <div className="flex flex-col items-start">
                          <div className="text-xs text-gray-500">Customer Points</div>
                            <div className="text-blue-600 font-bold text-lg">{customer.points || 0}</div>
                        </div>
                        )}
                        {customer.total_spent !== undefined && (
                          <div className="flex flex-col items-end">
                          <div className="text-xs text-gray-500">Customer Spent</div>
                            <div className="text-green-600 font-bold text-lg">
                              {format.money(customer.total_spent || 0, { short: true })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>

          <div className="flex justify-between gap-3 mt-6">
            <button
              onClick={onAddNew}
              className="flex-1 bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors"
            >
              Add New Customer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabletCustomerSelectionModal;