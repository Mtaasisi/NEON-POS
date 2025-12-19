import React, { useMemo, useState } from 'react';
import { X, User, Phone, Mail } from 'lucide-react';

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
                    className="border-2 border-gray-200 rounded-2xl bg-white shadow-sm hover:shadow-lg hover:scale-[1.02] hover:border-blue-300 cursor-pointer transition-all duration-300 p-4"
                  >
                    {/* Avatar and Name */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                        {customer.name?.[0]?.toUpperCase() || <User size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 truncate">
                          {customer.name || 'Unnamed customer'}
                        </h3>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-1 mb-3">
                      {customer.phone && (
                        <div className="flex items-center space-x-2 text-xs text-gray-600">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-phone">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                          </svg>
                          <span className="truncate">{customer.phone}</span>
                        </div>
                      )}
                      {customer.email && (
                        <div className="flex items-center space-x-2 text-xs text-gray-600">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-mail">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                          </svg>
                          <span className="truncate">{customer.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Stats (if available) */}
                    {(customer.points !== undefined || customer.total_spent !== undefined) && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                        <div className="text-center">
                          <div className="text-xs text-gray-500">Points</div>
                          <div className="font-semibold text-gray-900 text-sm">{customer.points || 0}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500">Spent</div>
                          <div className="font-semibold text-gray-900 text-sm">
                            TSh {customer.total_spent ? customer.total_spent.toLocaleString() : '0'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Select Button */}
                    <button className="w-full mt-3 bg-blue-600 text-white py-2 px-3 rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors">
                      Select Customer
                    </button>
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
            <button
              onClick={onClose}
              className="px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabletCustomerSelectionModal;