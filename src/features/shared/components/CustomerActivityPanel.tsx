import React, { useEffect, useState } from 'react';
import { X, Smartphone, TrendingUp, CreditCard, Clock, Package, AlertCircle, Loader2, Calendar, MessageSquare, FileText, User } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

interface CustomerActivityPanelProps {
  customerId: string;
  customerName: string;
  onClose: () => void;
}

interface ActivityData {
  devices: any[];
  sales: any[];
  payments: any[];
  appointments: any[];
  notes: any[];
  messages: any[];
  totalSpent: number;
  lastActivity: string;
  customerInfo: any;
}

const CustomerActivityPanel: React.FC<CustomerActivityPanelProps> = ({
  customerId,
  customerName,
  onClose,
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'devices' | 'sales' | 'payments' | 'appointments' | 'notes' | 'messages'>('overview');
  const [activityData, setActivityData] = useState<ActivityData>({
    devices: [],
    sales: [],
    payments: [],
    appointments: [],
    notes: [],
    messages: [],
    totalSpent: 0,
    lastActivity: '',
    customerInfo: null,
  });

  useEffect(() => {
    loadCustomerActivity();
  }, [customerId]);

  const loadCustomerActivity = async () => {
    setLoading(true);
    try {
      // IMPORTANT: There are 2 customer tables!
      // - 'customers' (legacy repair shop) - used by devices, customer_payments
      // - 'lats_customers' (new LATS) - used by lats_sales
      // We need to check both and link by phone/email
      
      // First, get the customer details to get phone/email for matching
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      // Fetch devices from 'devices' table (uses 'customers' table)
      let devicesQuery = supabase
        .from('devices')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      // ✅ Apply branch filtering (devices are typically branch-specific)
      const { addBranchFilter } = await import('../../../lib/branchAwareApi');
      devicesQuery = await addBranchFilter(devicesQuery, 'devices');
      
      const { data: devices, error: devicesError } = await devicesQuery;

      if (devicesError) {
        console.error('Error fetching devices:', devicesError);
      }

      // Fetch payments from 'customer_payments' (uses 'customers' table)
      const { data: payments, error: paymentsError } = await supabase
        .from('customer_payments')
        .select('*')
        .eq('customer_id', customerId)
        .order('payment_date', { ascending: false })

        .limit(50);

      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
      }

      // Fetch sales - Need to match by phone to lats_customers
      // Using JOIN to get sales from lats_customers matching this customer's phone
      let sales: any[] = [];
      if (customerData?.phone) {
        const { data: salesData, error: salesError } = await supabase
          .from('lats_sales')
          .select(`
            *,
            lats_customers!inner (
              phone
            )
          `)
          .eq('lats_customers.phone', customerData.phone)
          .order('created_at', { ascending: false })
  
        .limit(50);

        if (salesError) {
          console.error('Error fetching sales:', salesError);
          console.log('Sales error details:', salesError);
        } else {
          sales = salesData || [];
        }
      } else {
        console.log('No customer phone found, skipping sales fetch');
      }

      // Fetch appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('customer_id', customerId)
        .order('appointment_date', { ascending: false })

        .limit(50);

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
      }

      // Fetch customer notes
      const { data: notes, error: notesError } = await supabase
        .from('customer_notes')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

        .limit(50);

      if (notesError) {
        console.error('Error fetching notes:', notesError);
      }

      // Fetch customer messages
      const { data: messages, error: messagesError } = await supabase
        .from('customer_messages')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false})

        .limit(50);

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
      }

      // Calculate totals
      const totalSpent = (sales || []).reduce((sum, sale) => sum + (parseFloat(sale.total_amount) || 0), 0);
      
      // Find last activity - using correct column names
      const allDates = [
        ...(devices || []).map(d => new Date(d.created_at)),
        ...(sales || []).map(s => new Date(s.created_at)),
        ...(payments || []).map(p => new Date(p.payment_date)),
        ...(appointments || []).map(a => new Date(a.appointment_date)),
        ...(notes || []).map(n => new Date(n.created_at)),
        ...(messages || []).map(m => new Date(m.created_at)),
      ].filter(d => !isNaN(d.getTime()));
      
      const lastActivity = allDates.length > 0 
        ? new Date(Math.max(...allDates.map(d => d.getTime()))).toLocaleDateString()
        : 'No activity';

      setActivityData({
        devices: devices || [],
        sales: sales || [],
        payments: payments || [],
        appointments: appointments || [],
        notes: notes || [],
        messages: messages || [],
        totalSpent,
        lastActivity,
        customerInfo: customerData,
      });
    } catch (error) {
      console.error('Error loading customer activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceClick = (deviceId: string) => {
    navigate(`/devices/${deviceId}`);
    onClose();
  };

  const handleViewAllDevices = () => {
    navigate(`/devices?customer=${customerId}`);
    onClose();
  };

  const handleViewAllSales = () => {
    navigate(`/lats/sales-reports?customer=${customerId}`);
    onClose();
  };

  const handleViewCustomer = () => {
    navigate(`/customers/${customerId}`);
    onClose();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{customerName}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-6 gap-px bg-gray-200 border-b">
          <div className="bg-white p-3 text-center">
            <p className="text-2xl font-semibold text-gray-900">{activityData.devices.length}</p>
            <p className="text-xs text-gray-500 mt-1">Devices</p>
          </div>
          <div className="bg-white p-3 text-center">
            <p className="text-2xl font-semibold text-gray-900">{activityData.sales.length}</p>
            <p className="text-xs text-gray-500 mt-1">Sales</p>
          </div>
          <div className="bg-white p-3 text-center">
            <p className="text-2xl font-semibold text-gray-900">{activityData.payments.length}</p>
            <p className="text-xs text-gray-500 mt-1">Payments</p>
          </div>
          <div className="bg-white p-3 text-center">
            <p className="text-2xl font-semibold text-gray-900">{activityData.appointments.length}</p>
            <p className="text-xs text-gray-500 mt-1">Appts</p>
          </div>
          <div className="bg-white p-3 text-center">
            <p className="text-2xl font-semibold text-gray-900">{activityData.messages.length}</p>
            <p className="text-xs text-gray-500 mt-1">Messages</p>
          </div>
          <div className="bg-white p-3 text-center">
            <p className="text-xs font-medium text-gray-900">{activityData.lastActivity}</p>
            <p className="text-xs text-gray-500 mt-1">Last</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b bg-white px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { key: 'overview', label: 'All' },
              { key: 'devices', label: `Devices (${activityData.devices.length})` },
              { key: 'sales', label: `Sales (${activityData.sales.length})` },
              { key: 'payments', label: `Payments (${activityData.payments.length})` },
              { key: 'appointments', label: `Appts (${activityData.appointments.length})` },
              { key: 'notes', label: `Notes (${activityData.notes.length})` },
              { key: 'messages', label: `Messages (${activityData.messages.length})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Overview Tab - Show ALL activities in unified timeline */}
          {activeTab === 'overview' && (
            <>
              {/* Customer Info */}
              {activityData.customerInfo && (
                <div className="bg-gray-50 rounded p-4 border">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><span className="text-gray-500">Phone:</span> <span className="font-medium ml-1">{activityData.customerInfo.phone || 'N/A'}</span></div>
                    <div><span className="text-gray-500">Email:</span> <span className="font-medium ml-1">{activityData.customerInfo.email || 'N/A'}</span></div>
                    <div><span className="text-gray-500">City:</span> <span className="font-medium ml-1">{activityData.customerInfo.city || 'N/A'}</span></div>
                    <div><span className="text-gray-500">Loyalty:</span> <span className="font-medium ml-1 capitalize">{activityData.customerInfo.loyalty_level || 'Bronze'}</span></div>
                    <div><span className="text-gray-500">Points:</span> <span className="font-medium ml-1">{activityData.customerInfo.points || 0}</span></div>
                    <div><span className="text-gray-500">Total:</span> <span className="font-medium ml-1">TZS {activityData.totalSpent.toLocaleString()}</span></div>
                  </div>
                </div>
              )}

              {/* Unified Activity Timeline - ALL ACTIVITIES */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Activity Timeline</h3>
                <div className="space-y-2">
                  {/* Combine all activities and sort by date */}
                  {[
                    ...activityData.devices.map(d => ({ type: 'device', data: d, date: new Date(d.created_at) })),
                    ...activityData.sales.map(s => ({ type: 'sale', data: s, date: new Date(s.created_at) })),
                    ...activityData.payments.map(p => ({ type: 'payment', data: p, date: new Date(p.payment_date) })),
                    ...activityData.appointments.map(a => ({ type: 'appointment', data: a, date: new Date(a.appointment_date) })),
                    ...activityData.notes.map(n => ({ type: 'note', data: n, date: new Date(n.created_at) })),
                    ...activityData.messages.map(m => ({ type: 'message', data: m, date: new Date(m.created_at) })),
                  ]
                    .sort((a, b) => b.date.getTime() - a.date.getTime())
                    .map((activity, index) => {
                      // Render each activity type
                      if (activity.type === 'device') {
                        const device = activity.data;
                        return (
                          <div
                            key={`device-${device.id}-${index}`}
                            onClick={() => handleDeviceClick(device.id)}
                            className="border-l-2 border-blue-500 pl-3 py-2 hover:bg-gray-50 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Smartphone className="text-blue-500" size={16} />
                              <span className="font-medium text-gray-900">{device.model || device.device_name}</span>
                              <span className="text-xs text-gray-500">{device.status}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-0.5 ml-6">{device.problem_description || device.issue_description}</p>
                            <p className="text-xs text-gray-400 mt-0.5 ml-6">{activity.date.toLocaleString()}</p>
                          </div>
                        );
                      }
                      
                      if (activity.type === 'sale') {
                        const sale = activity.data;
                        return (
                          <div key={`sale-${sale.id}-${index}`} className="border-l-2 border-green-500 pl-3 py-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="text-green-500" size={16} />
                                <span className="font-medium text-gray-900">Sale #{sale.id}</span>
                              </div>
                              <span className="font-semibold text-green-600">TZS {(sale.total_amount || 0).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 ml-6">{sale.payment_method} • {activity.date.toLocaleString()}</p>
                          </div>
                        );
                      }

                      if (activity.type === 'payment') {
                        const payment = activity.data;
                        return (
                          <div key={`payment-${payment.id}-${index}`} className="border-l-2 border-purple-500 pl-3 py-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CreditCard className="text-purple-500" size={16} />
                                <span className="font-medium text-gray-900">{payment.method || 'Cash'}</span>
                              </div>
                              <span className="font-semibold text-purple-600">TZS {(payment.amount || 0).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 ml-6">{activity.date.toLocaleString()}</p>
                          </div>
                        );
                      }

                      if (activity.type === 'appointment') {
                        const apt = activity.data;
                        return (
                          <div key={`apt-${apt.id}-${index}`} className="border-l-2 border-cyan-500 pl-3 py-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="text-cyan-500" size={16} />
                              <span className="font-medium text-gray-900">{apt.title}</span>
                              <span className="text-xs text-gray-500">{apt.status}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 ml-6">{activity.date.toLocaleString()}</p>
                          </div>
                        );
                      }

                      if (activity.type === 'note') {
                        const note = activity.data;
                        return (
                          <div key={`note-${note.id}-${index}`} className="border-l-2 border-amber-500 pl-3 py-2">
                            <div className="flex items-start gap-2">
                              <FileText className="text-amber-500 mt-0.5" size={16} />
                              <div className="flex-1">
                                <p className="text-sm text-gray-800">{note.note}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{activity.date.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (activity.type === 'message') {
                        const msg = activity.data;
                        return (
                          <div key={`msg-${msg.id}-${index}`} className={`border-l-2 pl-3 py-2 ${
                            msg.direction === 'outbound' ? 'border-blue-500' : 'border-indigo-500'
                          }`}>
                            <div className="flex items-start gap-2">
                              <MessageSquare className={msg.direction === 'outbound' ? 'text-blue-500' : 'text-indigo-500'} size={16} />
                              <div className="flex-1">
                                <p className="text-sm text-gray-800">{msg.message}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {msg.direction === 'outbound' ? 'Sent' : 'Received'} • {msg.channel} • {activity.date.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}

                  {/* Empty state for overview */}
                  {activityData.devices.length === 0 && 
                   activityData.sales.length === 0 && 
                   activityData.payments.length === 0 &&
                   activityData.appointments.length === 0 &&
                   activityData.notes.length === 0 &&
                   activityData.messages.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <p className="text-sm">No activity found</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Devices Tab */}
          {activeTab === 'devices' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Smartphone className="text-blue-500" size={20} />
                Devices ({activityData.devices.length})
              </h3>
              {activityData.devices.length > 0 && (
                <button
                  onClick={handleViewAllDevices}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All →
                </button>
              )}
            </div>
            {activityData.devices.length > 0 ? (
              <div className="space-y-2">
                {activityData.devices.map((device) => (
                  <div
                    key={device.id}
                    onClick={() => handleDeviceClick(device.id)}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">{device.model || device.device_name}</p>
                        <p className="text-sm text-gray-600">{device.problem_description || device.issue_description || 'No issue specified'}</p>
                        <p className="text-xs text-gray-500 mt-1">Serial: {device.serial_number || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          device.status === 'active' || device.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                          device.status === 'done' || device.status === 'completed' ? 'bg-green-100 text-green-700' :
                          device.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {device.status}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(device.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package size={48} className="mx-auto mb-2 text-gray-300" />
                <p>No devices found</p>
              </div>
            )}
          </div>
          )}

          {/* Sales Tab */}
          {activeTab === 'sales' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp className="text-green-500" size={20} />
                Recent Sales ({activityData.sales.length})
              </h3>
              {activityData.sales.length > 0 && (
                <button
                  onClick={handleViewAllSales}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All →
                </button>
              )}
            </div>
            {activityData.sales.length > 0 ? (
              <div className="space-y-2">
                {activityData.sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:border-green-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">Sale #{sale.id}</p>
                        <p className="text-sm text-gray-600">{sale.customer_name || 'Walk-in'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(sale.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          TZS {(sale.total_amount || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {sale.payment_method || 'Cash'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp size={48} className="mx-auto mb-2 text-gray-300" />
                <p>No sales found</p>
              </div>
            )}
          </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CreditCard className="text-purple-500" size={20} />
                All Payments ({activityData.payments.length})
              </h3>
              {activityData.payments.length > 0 ? (
              <div className="space-y-2">
                {activityData.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="bg-white border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">{payment.method || 'Cash'}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </p>
                        {payment.notes && (
                          <p className="text-xs text-gray-400 mt-1">{payment.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-purple-600">
                          TZS {(payment.amount || 0).toLocaleString()}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {payment.status || 'completed'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <CreditCard size={48} className="mx-auto mb-2 text-gray-300" />
                  <p>No payments found</p>
                </div>
              )}
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar className="text-cyan-500" size={20} />
                All Appointments ({activityData.appointments.length})
              </h3>
              {activityData.appointments.length > 0 ? (
              <div className="space-y-2">
                {activityData.appointments.map((apt) => (
                  <div key={apt.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">{apt.title}</p>
                        <p className="text-sm text-gray-600">{apt.description || 'No description'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(apt.appointment_date).toLocaleString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        apt.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                        apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                        apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Calendar size={48} className="mx-auto mb-2 text-gray-300" />
                  <p>No appointments found</p>
                </div>
              )}
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="text-amber-500" size={20} />
                All Notes ({activityData.notes.length})
              </h3>
              {activityData.notes.length > 0 ? (
              <div className="space-y-2">
                {activityData.notes.map((note) => (
                  <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-800">{note.note}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText size={48} className="mx-auto mb-2 text-gray-300" />
                  <p>No notes found</p>
                </div>
              )}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <MessageSquare className="text-indigo-500" size={20} />
                All Messages ({activityData.messages.length})
              </h3>
              {activityData.messages.length > 0 ? (
              <div className="space-y-2">
                {activityData.messages.map((msg) => (
                  <div key={msg.id} className={`border rounded-lg p-4 ${
                    msg.direction === 'outbound' ? 'bg-blue-50 border-blue-200 ml-8' : 'bg-white border-gray-200 mr-8'
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <span className={`text-xs font-medium ${
                        msg.direction === 'outbound' ? 'text-blue-700' : 'text-gray-700'
                      }`}>
                        {msg.direction === 'outbound' ? 'Sent' : 'Received'} via {msg.channel}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        msg.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        msg.status === 'read' ? 'bg-blue-100 text-blue-700' :
                        msg.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {msg.status}
                      </span>
                    </div>
                    <p className="text-gray-800">{msg.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(msg.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare size={48} className="mx-auto mb-2 text-gray-300" />
                  <p>No messages found</p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="border-t px-6 py-3 flex gap-2 bg-white">
          <button
            onClick={handleViewCustomer}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            View Profile
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border text-sm rounded hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerActivityPanel;

