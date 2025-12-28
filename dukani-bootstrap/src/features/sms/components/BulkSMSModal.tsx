import React, { useState, useEffect, useMemo } from 'react';
import { X, Users, MessageSquare, Search, Filter, Check, DollarSign, FileText, Lightbulb, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { format } from '../../lats/lib/format';
import { useLoadingJob } from '../../../hooks/useLoadingJob';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  total_spent?: number;
  loyalty_level?: string;
  color_tag?: string;
  last_visit?: string;
  is_active?: boolean;
  points?: number;
}

interface BulkSMSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const calculateSMSInfo = (message: string) => {
  const charCount = message.length;
  const hasUnicode = /[^\x00-\x7F]/.test(message);
  const charsPerSMS = hasUnicode ? 70 : 160;
  const smsUnits = Math.ceil(charCount / charsPerSMS);
  
  return {
    charCount,
    smsUnits,
    charsPerSMS,
    encoding: hasUnicode ? 'Unicode' : 'GSM-7'
  };
};

const formatPrice = (price: number | string): string => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (num % 1 === 0) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const BulkSMSModal: React.FC<BulkSMSModalProps> = ({ isOpen, onClose }) => {
  const { startLoading, completeLoading, failLoading } = useLoadingJob();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [filters, setFilters] = useState({
    loyaltyLevel: 'all',
    colorTag: 'all',
    city: 'all',
    minSpent: '',
    maxSpent: '',
    minPoints: '',
    activeOnly: true,
    hasDevices: 'all' as 'all' | 'yes' | 'no',
    lastVisit: 'all' as 'all' | '7days' | '30days' | '90days' | '6months' | '1year'
  });

  const [pricePerSMS] = useState<number>(() => {
    const saved = localStorage.getItem('sms_price_per_unit');
    return saved ? parseFloat(saved) : 50;
  });

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const messageTemplates = {
    'win-back': {
      title: 'Win-Back',
      message: `Hi [Name], we noticed it's been a while since your last visit! We'd love to see you again. Get 20% off your next repair. Reply VISIT to book.`,
    },
    'vip-exclusive': {
      title: 'VIP Offer',
      message: `Dear [Name], as one of our valued VIP customers, you're invited to an exclusive 30% off on all services this month. Thank you for your continued trust!`,
    },
    'loyalty-reward': {
      title: 'Loyalty Points',
      message: `Hi [Name]! You have [Points] loyalty points ready to use. That's [Amount] TZS in savings! Visit us today to redeem them.`,
    },
    'high-spender': {
      title: 'Thank You',
      message: `Thank you for being one of our top customers, [Name]! As appreciation, enjoy free diagnostics on your next device. We value your business!`,
    },
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      fetchCustomers();
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const fetchCustomers = async () => {
    const jobId = startLoading('Loading customers...');
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, email, city, total_spent, loyalty_level, color_tag, last_visit, is_active, points')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
      completeLoading(jobId);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      failLoading(jobId, 'Failed to load customers');
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const cities = useMemo(() => {
    return Array.from(new Set(customers.map(c => c.city).filter(Boolean)));
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    let filtered = customers.filter(customer => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (
          !customer.name.toLowerCase().includes(search) &&
          !customer.phone.toLowerCase().includes(search) &&
          !(customer.email?.toLowerCase().includes(search))
        ) {
          return false;
        }
      }

      if (filters.loyaltyLevel !== 'all' && customer.loyalty_level !== filters.loyaltyLevel) {
        return false;
      }

      if (filters.colorTag !== 'all' && customer.color_tag !== filters.colorTag) {
        return false;
      }

      if (filters.city !== 'all' && customer.city !== filters.city) {
        return false;
      }

      if (filters.minSpent && (customer.total_spent || 0) < parseFloat(filters.minSpent)) {
        return false;
      }
      if (filters.maxSpent && (customer.total_spent || 0) > parseFloat(filters.maxSpent)) {
        return false;
      }

      if (filters.minPoints && (customer.points || 0) < parseFloat(filters.minPoints)) {
        return false;
      }

      if (filters.activeOnly && !customer.is_active) {
        return false;
      }

      if (filters.lastVisit !== 'all' && customer.last_visit) {
        const lastVisitDate = new Date(customer.last_visit);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));

        switch (filters.lastVisit) {
          case '7days':
            if (daysDiff > 7) return false;
            break;
          case '30days':
            if (daysDiff > 30) return false;
            break;
          case '90days':
            if (daysDiff > 90) return false;
            break;
          case '6months':
            if (daysDiff > 180) return false;
            break;
          case '1year':
            if (daysDiff > 365) return false;
            break;
        }
      }

      return true;
    });

    return filtered;
  }, [customers, searchTerm, filters]);

  const smartSuggestions = useMemo(() => {
    const suggestions = [];
    
    const vipCustomers = filteredCustomers.filter(c => c.loyalty_level === 'platinum' || c.color_tag === 'vip');
    if (vipCustomers.length > 0) {
      suggestions.push({ 
        type: 'vip', 
        text: `${vipCustomers.length} VIP customers`,
        action: () => {
          const vipIds = new Set(vipCustomers.map(c => c.id));
          setSelectedCustomers(vipIds);
          toast.success(`Selected ${vipCustomers.length} VIP customers`);
        }
      });
    }

    const inactiveCustomers = filteredCustomers.filter(c => {
      if (!c.last_visit) return false;
      const daysSinceVisit = Math.floor((Date.now() - new Date(c.last_visit).getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceVisit > 90;
    });
    if (inactiveCustomers.length > 0) {
      suggestions.push({ 
        type: 'inactive', 
        text: `${inactiveCustomers.length} inactive (90+ days)`,
        action: () => {
          const inactiveIds = new Set(inactiveCustomers.map(c => c.id));
          setSelectedCustomers(inactiveIds);
          toast.success(`Selected ${inactiveCustomers.length} inactive customers`);
        }
      });
    }

    return suggestions;
  }, [filteredCustomers]);

  const toggleCustomer = (customerId: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const toggleAll = () => {
    if (selectedCustomers.size === filteredCustomers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(filteredCustomers.map(c => c.id)));
    }
  };

  const smsInfo = calculateSMSInfo(message);
  const totalCost = selectedCustomers.size * smsInfo.smsUnits * pricePerSMS;

  const handleSendBulkSMS = async () => {
    if (selectedCustomers.size === 0) {
      toast.error('Please select at least one customer');
      return;
    }

    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      setSending(true);
      const selectedCustomerData = customers.filter(c => selectedCustomers.has(c.id));
      
      const smsLogs = selectedCustomerData.map(customer => ({
        recipient_phone: customer.phone,
        message: message,
        status: 'pending',
        created_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('sms_logs')
        .insert(smsLogs);

      if (error) throw error;

      toast.success(`Successfully queued ${selectedCustomers.size} SMS messages!`);
      setMessage('');
      setSelectedCustomers(new Set());
      onClose();
    } catch (error: any) {
      console.error('Error sending bulk SMS:', error);
      toast.error('Failed to send SMS messages');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999]" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Bulk SMS</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {selectedCustomers.size} selected • {filteredCustomers.length} available
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Customers */}
            <div className="lg:col-span-2 space-y-4">
              {/* Quick Actions */}
              {smartSuggestions.length > 0 && (
                <div className="flex gap-2">
                  {smartSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={suggestion.action}
                      className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      {suggestion.text}
                    </button>
                  ))}
                </div>
              )}

              {/* Search & Filter */}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search customers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <button
                    onClick={() => setShowFilterPanel(!showFilterPanel)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      showFilterPanel 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                  </button>
                </div>

                {/* Filters */}
                {showFilterPanel && (
                  <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Loyalty</label>
                        <select
                          value={filters.loyaltyLevel}
                          onChange={(e) => setFilters({ ...filters, loyaltyLevel: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">All</option>
                          <option value="platinum">Platinum</option>
                          <option value="gold">Gold</option>
                          <option value="silver">Silver</option>
                          <option value="bronze">Bronze</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">City</label>
                        <select
                          value={filters.city}
                          onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">All Cities</option>
                          {cities.map(city => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.activeOnly}
                        onChange={(e) => setFilters({ ...filters, activeOnly: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <label className="text-sm text-gray-700">Active customers only</label>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer List */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-700">
                    {filteredCustomers.length} customers
                  </span>
                  <button
                    onClick={toggleAll}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {selectedCustomers.size === filteredCustomers.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : filteredCustomers.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-sm">
                      No customers found
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredCustomers.map((customer) => {
                        const isSelected = selectedCustomers.has(customer.id);
                        return (
                          <div
                            key={customer.id}
                            onClick={() => toggleCustomer(customer.id)}
                            className={`px-4 py-3 cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                isSelected 
                                  ? 'bg-blue-600 border-blue-600' 
                                  : 'border-gray-300'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-sm">{customer.name}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3" />
                                  {customer.phone}
                                </div>
                              </div>
                              {customer.loyalty_level && (
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  customer.loyalty_level === 'platinum' ? 'bg-purple-100 text-purple-700' :
                                  customer.loyalty_level === 'gold' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {customer.loyalty_level}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Message Composer */}
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900 text-sm">Message</h4>
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {showTemplates ? 'Hide' : 'Show'} Templates
                  </button>
                </div>

                {showTemplates && (
                  <div className="space-y-2">
                    {Object.entries(messageTemplates).map(([key, template]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setMessage(template.message);
                          setShowTemplates(false);
                        }}
                        className="w-full text-left p-2.5 text-xs bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{template.title}</div>
                      </button>
                    ))}
                  </div>
                )}

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                  rows={6}
                />

                {/* SMS Info */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Characters</span>
                    <span className="font-semibold text-gray-900">{smsInfo.charCount}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Units</span>
                    <span className="font-semibold text-gray-900">{smsInfo.smsUnits}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Encoding</span>
                    <span className="font-semibold text-gray-900">{smsInfo.encoding}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Price/Unit</span>
                    <span className="font-semibold text-gray-900">{formatPrice(pricePerSMS)}</span>
                  </div>
                </div>

                {/* Summary */}
                <div className="pt-3 border-t border-gray-200 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Recipients</span>
                    <span className="font-semibold text-gray-900">{selectedCustomers.size}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Units</span>
                    <span className="font-semibold text-gray-900">{selectedCustomers.size * smsInfo.smsUnits}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="font-semibold text-gray-900">Total Cost</span>
                    <span className="text-lg font-bold text-green-600">{formatPrice(totalCost)} TZS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={handleSendBulkSMS}
            disabled={sending || selectedCustomers.size === 0 || !message.trim()}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </span>
            ) : (
              `Send to ${selectedCustomers.size} Customer${selectedCustomers.size !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkSMSModal;
