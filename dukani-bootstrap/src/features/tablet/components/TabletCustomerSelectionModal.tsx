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
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Select Customer</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>
        <div className="p-6 space-y-4">
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

          {/* Customer list */}
          <div className="border border-gray-200 rounded-xl divide-y divide-gray-200 max-h-[50vh] overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-4 text-sm text-gray-500 text-center">
                No customers found
              </div>
            )}
            {filtered.map((customer: any) => (
              <button
                key={customer.id}
                onClick={() => handleSelect(customer)}
                className="w-full text-left p-4 hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                    {customer.name?.[0]?.toUpperCase() || <User size={16} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-gray-900 truncate">
                      {customer.name || 'Unnamed customer'}
                    </p>
                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                      {customer.phone && (
                        <span className="flex items-center space-x-1">
                          <Phone size={14} />
                          <span>{customer.phone}</span>
                        </span>
                      )}
                      {customer.email && (
                        <span className="flex items-center space-x-1">
                          <Mail size={14} />
                          <span className="truncate">{customer.email}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-sm font-semibold text-blue-600">Select</span>
              </button>
            ))}
          </div>

          <div className="flex justify-between gap-3">
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