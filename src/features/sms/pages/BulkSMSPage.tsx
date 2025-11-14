import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { Search, Filter, Check } from 'lucide-react';
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

// Calculate SMS units and character info
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

const BulkSMSPage: React.FC = () => {
  const { startLoading, completeLoading, failLoading } = useLoadingJob();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
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

  const [pricePerSMS, setPricePerSMS] = useState<number>(() => {
    const saved = localStorage.getItem('sms_price_per_unit');
    return saved ? parseFloat(saved) : 50;
  });

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Smart message templates based on customer segments
  const messageTemplates = {
    'win-back': {
      title: 'Win-Back Inactive Customers',
      message: `Hi [Name], we noticed it's been a while since your last visit! We'd love to see you again. Get 20% off your next repair. Reply VISIT to book.`,
      description: "For customers who haven't visited in 90+ days"
    },
    'vip-exclusive': {
      title: 'VIP Exclusive Offer',
      message: `Dear [Name], as one of our valued VIP customers, you're invited to an exclusive 30% off on all services this month. Thank you for your continued trust!`,
      description: 'For Platinum/VIP customers'
    },
    'loyalty-reward': {
      title: 'Loyalty Points Reminder',
      message: `Hi [Name]! You have [Points] loyalty points ready to use. That's [Amount] TZS in savings! Visit us today to redeem them.`,
      description: 'For customers with high points balance'
    },
    'high-spender': {
      title: 'Thank You - High Value',
      message: `Thank you for being one of our top customers, [Name]! As appreciation, enjoy free diagnostics on your next device. We value your business!`,
      description: 'For customers who spent over 500K TZS'
    },
    'new-service': {
      title: 'New Service Announcement',
      message: `Hi [Name]! We've launched a new service that might interest you. [Service Name] - now available with special introductory pricing. Call us to learn more!`,
      description: 'General announcement for active customers'
    },
    'appointment-reminder': {
      title: 'Appointment Follow-up',
      message: `Hi [Name], this is a friendly reminder about your appointment on [Date] at [Time]. Reply CONFIRM or call us. See you soon!`,
      description: 'For customers with upcoming appointments'
    },
    'device-ready': {
      title: 'Device Repair Complete',
      message: `Good news [Name]! Your [Device] is ready for pickup. Our store is open 8AM-8PM daily. Thank you for your patience!`,
      description: 'For customers with completed repairs'
    },
    'feedback-request': {
      title: 'Service Feedback',
      message: `Hi [Name], thank you for choosing us! How was your experience? Reply with a rating 1-5 or visit our store to share feedback. Your opinion matters!`,
      description: 'Post-service feedback request'
    },
    'birthday': {
      title: 'Birthday Special',
      message: `Happy Birthday [Name]! 🎉 Celebrate with us - get 25% off any service this month. Wishing you a fantastic year ahead!`,
      description: 'For customers with birthdays this month'
    },
    'referral-incentive': {
      title: 'Referral Program',
      message: `Hi [Name]! Refer a friend to us and you both get 15% off your next service. Share the love and save together!`,
      description: 'Encourage referrals from satisfied customers'
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const jobId = startLoading('Loading customers...');
    try {
      setLoading(true);
      // @ts-ignore - Neon query builder implements thenable interface
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

  // Get unique cities for filter
  const cities = useMemo(() => {
    return Array.from(new Set(customers.map(c => c.city).filter(Boolean)));
  }, [customers]);

  // Apply filters
  const filteredCustomers = useMemo(() => {
    let filtered = customers.filter(customer => {
      // Search term
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

      // Loyalty level
      if (filters.loyaltyLevel !== 'all' && customer.loyalty_level !== filters.loyaltyLevel) {
        return false;
      }

      // Color tag
      if (filters.colorTag !== 'all' && customer.color_tag !== filters.colorTag) {
        return false;
      }

      // City
      if (filters.city !== 'all' && customer.city !== filters.city) {
        return false;
      }

      // Spending range
      if (filters.minSpent && (customer.total_spent || 0) < parseFloat(filters.minSpent)) {
        return false;
      }
      if (filters.maxSpent && (customer.total_spent || 0) > parseFloat(filters.maxSpent)) {
        return false;
      }

      // Points
      if (filters.minPoints && (customer.points || 0) < parseFloat(filters.minPoints)) {
        return false;
      }

      // Active only
      if (filters.activeOnly && !customer.is_active) {
        return false;
      }

      // Last visit
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

  // Smart suggestions based on filters
  const smartSuggestions = useMemo(() => {
    const suggestions = [];
    
    if (filteredCustomers.length === 0) {
      suggestions.push({ type: 'warning', text: 'No customers match your filters' });
    }

    const vipCustomers = filteredCustomers.filter(c => c.loyalty_level === 'platinum' || c.color_tag === 'vip');
    if (vipCustomers.length > 0) {
      suggestions.push({ 
        type: 'vip', 
        text: `${vipCustomers.length} VIP customers found`,
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
        text: `${inactiveCustomers.length} customers haven't visited in 90+ days`,
        action: () => {
          const inactiveIds = new Set(inactiveCustomers.map(c => c.id));
          setSelectedCustomers(inactiveIds);
          toast.success(`Selected ${inactiveCustomers.length} inactive customers`);
        }
      });
    }

    const highSpenders = filteredCustomers.filter(c => (c.total_spent || 0) > 500000);
    if (highSpenders.length > 0) {
      suggestions.push({ 
        type: 'highspender', 
        text: `${highSpenders.length} customers have spent over 500,000 TZS`,
        action: () => {
          const spenderIds = new Set(highSpenders.map(c => c.id));
          setSelectedCustomers(spenderIds);
          toast.success(`Selected ${highSpenders.length} high spenders`);
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
      
      // Insert SMS logs for each customer
      const smsLogs = selectedCustomerData.map(customer => ({
        recipient_phone: customer.phone,
        message: message,
        status: 'pending',
        created_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
      }));

      // @ts-ignore - Neon query builder implements thenable interface
      const { error } = await supabase
        .from('sms_logs')
        .insert(smsLogs);

      if (error) throw error;

      toast.success(`Successfully queued ${selectedCustomers.size} SMS messages!`);
      setMessage('');
      setSelectedCustomers(new Set());
    } catch (error: any) {
      console.error('Error sending bulk SMS:', error);
      toast.error('Failed to send SMS messages');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bulk SMS</h1>
          <p className="text-gray-600">Send SMS to multiple customers at once with smart filtering</p>
        </div>

        {/* Smart Suggestions */}
        {smartSuggestions.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">💡 Smart Suggestions</h3>
            <div className="space-y-2">
              {smartSuggestions.map((suggestion, index) => (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    suggestion.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                    suggestion.type === 'vip' ? 'bg-purple-50 border border-purple-200' :
                    suggestion.type === 'inactive' ? 'bg-orange-50 border border-orange-200' :
                    'bg-green-50 border border-green-200'
                  }`}
                >
                  <span className="text-sm text-gray-700">{suggestion.text}</span>
                  {suggestion.action && (
                    <button
                      onClick={suggestion.action}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Select These
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search and Filter */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search by name, phone, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    showFilterPanel ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  <Filter size={20} />
                  Filters
                </button>
              </div>

              {/* Filter Panel */}
              {showFilterPanel && (
                <div className="border-t pt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loyalty Level</label>
                    <select
                      value={filters.loyaltyLevel}
                      onChange={(e) => setFilters({ ...filters, loyaltyLevel: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="all">All Levels</option>
                      <option value="platinum">Platinum</option>
                      <option value="gold">Gold</option>
                      <option value="silver">Silver</option>
                      <option value="bronze">Bronze</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color Tag</label>
                    <select
                      value={filters.colorTag}
                      onChange={(e) => setFilters({ ...filters, colorTag: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="all">All Tags</option>
                      <option value="vip">VIP</option>
                      <option value="new">New</option>
                      <option value="complainer">Complainer</option>
                      <option value="purchased">Purchased</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <select
                      value={filters.city}
                      onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="all">All Cities</option>
                      {cities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Visit</label>
                    <select
                      value={filters.lastVisit}
                      onChange={(e) => setFilters({ ...filters, lastVisit: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="all">Any Time</option>
                      <option value="7days">Last 7 days</option>
                      <option value="30days">Last 30 days</option>
                      <option value="90days">Last 90 days</option>
                      <option value="6months">Last 6 months</option>
                      <option value="1year">Last year</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Spent (TZS)</label>
                    <input
                      type="number"
                      value={filters.minSpent}
                      onChange={(e) => setFilters({ ...filters, minSpent: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Points</label>
                    <input
                      type="number"
                      value={filters.minPoints}
                      onChange={(e) => setFilters({ ...filters, minPoints: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="0"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.activeOnly}
                        onChange={(e) => setFilters({ ...filters, activeOnly: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Show active customers only</span>
                    </label>
                  </div>

                  <div className="col-span-2 flex gap-2">
                    <button
                      onClick={() => setFilters({
                        loyaltyLevel: 'all',
                        colorTag: 'all',
                        city: 'all',
                        minSpent: '',
                        maxSpent: '',
                        minPoints: '',
                        activeOnly: true,
                        hasDevices: 'all',
                        lastVisit: 'all'
                      })}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Customer List */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Customers ({filteredCustomers.length})
                </h3>
                <button
                  onClick={toggleAll}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {selectedCustomers.size === filteredCustomers.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => toggleCustomer(customer.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedCustomers.has(customer.id)
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded flex items-center justify-center ${
                          selectedCustomers.has(customer.id) ? 'bg-blue-600' : 'bg-gray-200'
                        }`}>
                          {selectedCustomers.has(customer.id) && <Check size={16} className="text-white" />}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-600">{customer.phone}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        {customer.loyalty_level && (
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            customer.loyalty_level === 'platinum' ? 'bg-purple-100 text-purple-800' :
                            customer.loyalty_level === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                            customer.loyalty_level === 'silver' ? 'bg-gray-100 text-gray-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {customer.loyalty_level}
                          </span>
                        )}
                        {customer.total_spent && (
                          <div className="text-sm text-gray-600 mt-1">
                            Spent: {format.money(customer.total_spent)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Message Composer */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Compose Message</h3>
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {showTemplates ? 'Hide' : 'Show'} Templates
                </button>
              </div>

              {/* Message Templates */}
              {showTemplates && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">📝 Message Templates</h4>
                  <div className="space-y-2">
                    {Object.entries(messageTemplates).map(([key, template]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setMessage(template.message);
                          setShowTemplates(false);
                          toast.success(`Template "${template.title}" loaded!`);
                        }}
                        className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                      >
                        <div className="font-medium text-gray-900 text-sm">{template.title}</div>
                        <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    💡 Tip: Use [Name], [Points], [Device], [Date], [Time], [Amount] as placeholders
                  </div>
                </div>
              )}

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here or use a template above..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                rows={6}
              />

              {/* Character & Cost Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Characters:</span>
                    <span className="font-medium text-gray-900">{smsInfo.charCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">SMS Units (each):</span>
                    <span className="font-medium text-gray-900">{smsInfo.smsUnits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Encoding:</span>
                    <span className="font-medium text-gray-900">{smsInfo.encoding}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price per SMS:</span>
                    <span className="font-medium text-gray-900">{pricePerSMS} TZS</span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-gray-900 mb-3">📊 Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Recipients:</span>
                    <span className="font-bold text-gray-900">{selectedCustomers.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total SMS Units:</span>
                    <span className="font-bold text-gray-900">{selectedCustomers.size * smsInfo.smsUnits}</span>
                  </div>
                  <div className="border-t border-green-300 pt-2 mt-2 flex justify-between">
                    <span className="font-semibold text-gray-900">Total Cost:</span>
                    <span className="text-lg font-bold text-green-700">{format.money(totalCost)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSendBulkSMS}
                disabled={sending || selectedCustomers.size === 0 || !message.trim()}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {sending ? 'Sending...' : `Send to ${selectedCustomers.size} Customer${selectedCustomers.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkSMSPage;

