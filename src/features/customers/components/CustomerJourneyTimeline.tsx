import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { 
  MessageSquare, Phone, Calendar, Smartphone, DollarSign, 
  Gift, Star, TrendingUp, Clock, CheckCircle, AlertCircle,
  Package, Wrench, Mail, MessageCircle, User, Award, ShoppingBag
} from 'lucide-react';
import { format } from 'date-fns';
import { format as formatLats } from '../../lats/lib/format';

interface TimelineEvent {
  id: string;
  type: 'device' | 'payment' | 'sms' | 'whatsapp' | 'call' | 'appointment' | 'purchase' | 'points' | 'note' | 'checkin';
  title: string;
  description: string;
  date: string;
  icon: any;
  color: string;
  metadata?: any;
}

interface CustomerJourneyTimelineProps {
  customerId: string;
  customerPhone: string;
}

const CustomerJourneyTimeline: React.FC<CustomerJourneyTimelineProps> = ({ customerId, customerPhone }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'communication' | 'transactions' | 'service'>('all');

  useEffect(() => {
    fetchCustomerJourney();
  }, [customerId]);

  const fetchCustomerJourney = async () => {
    try {
      setLoading(true);
      const allEvents: TimelineEvent[] = [];

      // Fetch devices
      const { data: devices } = await supabase
        .from('devices')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      devices?.forEach((device: any) => {
        allEvents.push({
          id: `device-${device.id}`,
          type: 'device',
          title: `Device: ${device.brand} ${device.model}`,
          description: device.problem_description || device.issue_description || 'No description',
          date: device.created_at,
          icon: Smartphone,
          color: 'bg-blue-500',
          metadata: { status: device.status, id: device.id }
        });

        // Add device status updates
        if (device.status === 'completed' && device.actual_completion_date) {
          allEvents.push({
            id: `device-completed-${device.id}`,
            type: 'device',
            title: `Device Repair Completed`,
            description: `${device.brand} ${device.model} - Repair finished`,
            date: device.actual_completion_date,
            icon: CheckCircle,
            color: 'bg-green-500',
            metadata: { deviceId: device.id }
          });
        }
      });

      // Fetch SMS communications
      const { data: smsLogs } = await supabase
        .from('sms_logs')
        .select('*')
        .eq('recipient_phone', customerPhone)
        .order('created_at', { ascending: false });

      smsLogs?.forEach((sms: any) => {
        allEvents.push({
          id: `sms-${sms.id}`,
          type: 'sms',
          title: 'SMS Sent',
          description: sms.message.substring(0, 100) + (sms.message.length > 100 ? '...' : ''),
          date: sms.sent_at || sms.created_at,
          icon: MessageSquare,
          color: 'bg-purple-500',
          metadata: { status: sms.status }
        });
      });

      // Fetch customer communications
      const { data: communications } = await supabase
        .from('customer_communications')
        .select('*')
        .eq('customer_id', customerId)
        .order('sent_at', { ascending: false });

      communications?.forEach((comm: any) => {
        const icon = comm.type === 'whatsapp' ? MessageCircle : 
                     comm.type === 'call' ? Phone : 
                     comm.type === 'email' ? Mail : MessageSquare;
        
        allEvents.push({
          id: `comm-${comm.id}`,
          type: comm.type,
          title: `${comm.type.charAt(0).toUpperCase() + comm.type.slice(1)} Communication`,
          description: comm.message?.substring(0, 100) || 'Communication sent',
          date: comm.sent_at || comm.created_at,
          icon: icon,
          color: comm.type === 'whatsapp' ? 'bg-green-600' : 
                 comm.type === 'call' ? 'bg-blue-600' : 'bg-gray-600',
          metadata: { status: comm.status }
        });
      });

      // Fetch appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      appointments?.forEach((apt: any) => {
        allEvents.push({
          id: `apt-${apt.id}`,
          type: 'appointment',
          title: `Appointment: ${apt.service_type}`,
          description: `Scheduled for ${apt.appointment_date} at ${apt.appointment_time}`,
          date: apt.created_at,
          icon: Calendar,
          color: 'bg-orange-500',
          metadata: { status: apt.status, date: apt.appointment_date }
        });
      });

      // Fetch POS sales
      const { data: sales } = await supabase
        .from('lats_receipts')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      sales?.forEach((sale: any) => {
        allEvents.push({
          id: `sale-${sale.id}`,
          type: 'purchase',
          title: 'Purchase',
          description: `Bought items worth ${formatLats.money(sale.total_amount || 0)}`,
          date: sale.created_at,
          icon: ShoppingBag,
          color: 'bg-emerald-500',
          metadata: { amount: sale.total_amount, paymentMethod: sale.payment_method }
        });
      });

      // Fetch payments
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      payments?.forEach((payment: any) => {
        allEvents.push({
          id: `payment-${payment.id}`,
          type: 'payment',
          title: 'Payment Received',
          description: `${formatLats.money(payment.amount || 0)} via ${payment.method}`,
          date: payment.created_at,
          icon: DollarSign,
          color: 'bg-green-500',
          metadata: { amount: payment.amount, method: payment.method }
        });
      });

      // Fetch points history
      const { data: pointsHistory } = await supabase
        .from('customer_points_history')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      pointsHistory?.forEach((points: any) => {
        allEvents.push({
          id: `points-${points.id}`,
          type: 'points',
          title: points.points_change > 0 ? 'Points Earned' : 'Points Redeemed',
          description: `${Math.abs(points.points_change)} points - ${points.reason}`,
          date: points.created_at,
          icon: points.points_change > 0 ? Gift : Award,
          color: points.points_change > 0 ? 'bg-yellow-500' : 'bg-indigo-500',
          metadata: { points: points.points_change }
        });
      });

      // Sort all events by date (newest first)
      allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching customer journey:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'communication') return ['sms', 'whatsapp', 'call', 'email'].includes(event.type);
    if (filter === 'transactions') return ['purchase', 'payment', 'points'].includes(event.type);
    if (filter === 'service') return ['device', 'appointment'].includes(event.type);
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({events.length})
        </button>
        <button
          onClick={() => setFilter('communication')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'communication' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Communication
        </button>
        <button
          onClick={() => setFilter('transactions')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'transactions' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Transactions
        </button>
        <button
          onClick={() => setFilter('service')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'service' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Service
        </button>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {/* Timeline events */}
        <div className="space-y-6">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No events found for this filter
            </div>
          ) : (
            filteredEvents.map((event, index) => {
              const Icon = event.icon;
              return (
                <div key={event.id} className="relative flex items-start gap-4 pl-14">
                  {/* Icon */}
                  <div className={`absolute left-0 w-12 h-12 ${event.color} rounded-full flex items-center justify-center text-white shadow-lg z-10`}>
                    <Icon size={20} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{event.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      </div>
                      <div className="text-xs text-gray-500 whitespace-nowrap ml-4">
                        {format(new Date(event.date), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>

                    {/* Metadata */}
                    {event.metadata && (
                      <div className="flex gap-2 mt-2">
                        {event.metadata.status && (
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            event.metadata.status === 'completed' || event.metadata.status === 'sent' || event.metadata.status === 'delivered' 
                              ? 'bg-green-100 text-green-800'
                              : event.metadata.status === 'pending' 
                              ? 'bg-yellow-100 text-yellow-800'
                              : event.metadata.status === 'failed' || event.metadata.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {event.metadata.status}
                          </span>
                        )}
                        {event.metadata.amount && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {formatLats.money(event.metadata.amount)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {filteredEvents.length > 0 && (
        <div className="text-center text-sm text-gray-500 pt-4">
          Showing {filteredEvents.length} of {events.length} events
        </div>
      )}
    </div>
  );
};

export default CustomerJourneyTimeline;

