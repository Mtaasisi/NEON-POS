import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Heart, Star, TrendingUp, Gift, Award, ExternalLink } from 'lucide-react';
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
      
      // Import supabase client and branch helper
      const { supabase } = await import('../../../../lib/supabaseClient');
      const { getCurrentBranchId } = await import('../../../../lib/branchAwareApi');
      
      const currentBranchId = getCurrentBranchId();
      
      // Fetch customers data for current branch
      let query = supabase
        .from('customers')
        .select('id, name, total_spent, joined_date, points, is_active, last_visit');
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data: customersData, error: customersError} = await query;

      if (customersError) {
        console.error('❌ Customers query Supabase error:', JSON.stringify(customersError, null, 2));
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
        (c.points || 0) > 0
      ).length;

      // Default satisfaction rating (devices table doesn't have rating column)
      const averageSatisfaction = 4.5;

      // Get top customers
      const topCustomers = customers
        .filter((c: any) => c.total_spent && c.total_spent > 0)
        .sort((a: any, b: any) => (b.total_spent || 0) - (a.total_spent || 0))
        .slice(0, 3)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          totalSpent: c.total_spent || 0,
          loyaltyPoints: c.points || 0,
          lastVisit: c.last_visit || c.joined_date
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
      console.error('❌ Error loading customer insights - Full error:', error);
      console.error('❌ Nested error details:', error?.error || error);
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
      <div className={`bg-white rounded-2xl p-7 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-75"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl p-7 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Heart className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Customer Insights</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {insights.totalCustomers} customers • {insights.retentionRate}% retention
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/customers')}
          className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
          title="View All Customers"
        >
          <ExternalLink size={14} />
          <span>View All</span>
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div>
          <p className="text-xs text-gray-400 mb-1.5">New</p>
          <p className="text-2xl font-semibold text-gray-900">{insights.newThisMonth}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Loyalty</p>
          <p className="text-2xl font-semibold text-gray-900">{insights.loyaltyMembers}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Retention</p>
          <p className="text-2xl font-semibold text-gray-900">{insights.retentionRate}%</p>
        </div>
      </div>

      {/* Satisfaction Rating */}
      <div className="p-4 bg-gray-50 rounded-lg mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1.5">Customer Satisfaction</p>
            {renderStarRating(insights.averageSatisfaction)}
          </div>
          <div className={`flex items-center gap-1 ${insights.satisfactionTrend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            <TrendingUp size={14} />
            <span className="text-sm font-medium">
              {insights.satisfactionTrend > 0 ? '+' : ''}{insights.satisfactionTrend}%
            </span>
          </div>
        </div>
      </div>

      {/* Top Customers */}
      <div className="space-y-3 mb-6 flex-grow">
        <h4 className="text-xs text-gray-400 mb-3">Top Customers</h4>
        {insights.topCustomers.slice(0, 3).map((customer, index) => (
          <div key={customer.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">{index + 1}</span>
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
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
                <span className="text-xs text-gray-500">
                  {formatCurrency(customer.totalSpent)} spent
                </span>
                <span className="text-xs text-gray-400">•</span>
                <div className="flex items-center gap-1">
                  <Gift size={10} className="text-gray-500" />
                  <span className="text-xs text-gray-500">{customer.loyaltyPoints} pts</span>
                </div>
              </div>
            </div>
            <span className="text-xs text-gray-400">
              {getTimeAgo(customer.lastVisit)}
            </span>
          </div>
        ))}
      </div>

      {/* Actions - Always at bottom */}
      <div className="flex gap-2 mt-auto pt-6">
        <button
          onClick={() => navigate('/customers/loyalty')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-gray-800 transition-colors"
        >
          <Award size={14} />
          <span>Loyalty Program</span>
        </button>
      </div>
    </div>
  );
};
