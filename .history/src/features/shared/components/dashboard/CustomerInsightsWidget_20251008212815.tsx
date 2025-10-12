import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Heart, Star, TrendingUp, Gift, ExternalLink, Award } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import GlassButton from '../ui/GlassButton';

interface CustomerInsightsWidgetProps {
  className?: string;
}

interface CustomerInsights {
  totalCustomers: number;
  newThisMonth: number;
  loyaltyMembers: number;
  averageSatisfaction: number;
  topCustomers: Array<{
    id: string;
    name: string;
    totalSpent: number;
    loyaltyPoints: number;
    lastVisit: string;
  }>;
  satisfactionTrend: number;
  retentionRate: number;
}

export const CustomerInsightsWidget: React.FC<CustomerInsightsWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const [insights, setInsights] = useState<CustomerInsights>({
    totalCustomers: 0,
    newThisMonth: 0,
    loyaltyMembers: 0,
    averageSatisfaction: 0,
    topCustomers: [],
    satisfactionTrend: 0,
    retentionRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCustomerInsights();
  }, []);

  const loadCustomerInsights = async () => {
    try {
      setIsLoading(true);
      
      // Import supabase client
      const { supabase } = await import('../../../../lib/supabaseClient');
      
      // Fetch customers data
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, total_spent, joined_date, loyalty_points, is_active, last_visit_date');

      if (customersError) {
        console.error('Customers query error:', customersError);
        throw customersError;
      }

      const customers = customersData || [];
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Calculate insights
      const totalCustomers = customers.length;
      const newThisMonth = customers.filter((c: any) => 
        new Date(c.joined_date) >= monthStart
      ).length;

      const loyaltyMembers = customers.filter((c: any) => 
        (c.loyalty_points || 0) > 0
      ).length;

      // Calculate average satisfaction from device ratings
      const { data: devicesData } = await supabase
        .from('devices')
        .select('rating, customer_id');

      const devices = devicesData || [];
      const ratedDevices = devices.filter((d: any) => d.rating && d.rating > 0);
      const averageSatisfaction = ratedDevices.length > 0
        ? ratedDevices.reduce((sum: number, d: any) => sum + d.rating, 0) / ratedDevices.length
        : 4.5;

      // Get top customers
      const topCustomers = customers
        .filter((c: any) => c.total_spent && c.total_spent > 0)
        .sort((a: any, b: any) => (b.total_spent || 0) - (a.total_spent || 0))
        .slice(0, 3)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          totalSpent: c.total_spent || 0,
          loyaltyPoints: c.loyalty_points || 0,
          lastVisit: c.last_visit_date || c.joined_date
        }));

      // Calculate retention rate (customers with repeat visits)
      const repeatCustomers = customers.filter((c: any) => 
        (c.total_spent || 0) > 0 && c.is_active
      ).length;
      const retentionRate = totalCustomers > 0 
        ? Math.round((repeatCustomers / totalCustomers) * 100)
        : 0;

      // Calculate satisfaction trend (simplified)
      const satisfactionTrend = 8.5; // TODO: Calculate from historical data

      setInsights({
        totalCustomers,
        newThisMonth,
        loyaltyMembers,
        averageSatisfaction,
        topCustomers,
        satisfactionTrend,
        retentionRate
      });
    } catch (error: any) {
      console.error('Error loading customer insights:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    return `${diffInDays}d ago`;
  };

  const getSatisfactionColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={12}
            className={`${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className={`text-sm font-medium ml-1 ${getSatisfactionColor(rating)}`}>
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <GlassCard className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-pink-100 to-rose-100 rounded-lg">
            <Heart className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Customer Insights</h3>
            <p className="text-sm text-gray-600">
              {insights.totalCustomers} customers • {insights.retentionRate}% retention
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-blue-50 rounded-lg">
          <p className="text-lg font-bold text-blue-700">{insights.newThisMonth}</p>
          <p className="text-xs text-blue-600">New</p>
        </div>
        <div className="text-center p-2 bg-purple-50 rounded-lg">
          <p className="text-lg font-bold text-purple-700">{insights.loyaltyMembers}</p>
          <p className="text-xs text-purple-600">Loyalty</p>
        </div>
        <div className="text-center p-2 bg-green-50 rounded-lg">
          <p className="text-lg font-bold text-green-700">{insights.retentionRate}%</p>
          <p className="text-xs text-green-600">Retention</p>
        </div>
      </div>

      {/* Satisfaction Rating */}
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-yellow-800">Customer Satisfaction</p>
            {renderStarRating(insights.averageSatisfaction)}
          </div>
          <div className={`flex items-center gap-1 ${insights.satisfactionTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp size={12} />
            <span className="text-xs font-medium">
              {insights.satisfactionTrend > 0 ? '+' : ''}{insights.satisfactionTrend}%
            </span>
          </div>
        </div>
      </div>

      {/* Top Customers */}
      <div className="space-y-2 h-40 overflow-y-auto">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Top Customers</h4>
        {insights.topCustomers.slice(0, 3).map((customer, index) => (
          <div key={customer.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">{index + 1}</span>
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-gray-700">
                  {customer.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">
                {customer.name}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-600">
                  {formatCurrency(customer.totalSpent)} spent
                </span>
                <span className="text-xs text-gray-400">•</span>
                <div className="flex items-center gap-1">
                  <Gift size={10} className="text-purple-500" />
                  <span className="text-xs text-purple-600">{customer.loyaltyPoints} pts</span>
                </div>
              </div>
            </div>
            <span className="text-xs text-gray-500">
              {getTimeAgo(customer.lastVisit)}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
        <GlassButton
          onClick={() => navigate('/customers')}
          variant="ghost"
          size="sm"
          className="flex-1"
          icon={<ExternalLink size={14} />}
        >
          All Customers
        </GlassButton>
        <GlassButton
          onClick={() => navigate('/customers/loyalty')}
          variant="ghost"
          size="sm"
          icon={<Award size={14} />}
        >
          Loyalty
        </GlassButton>
      </div>
    </GlassCard>
  );
};
