import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Award, TrendingUp, ExternalLink } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';

interface StaffPerformanceWidgetProps {
  className?: string;
}

interface StaffMember {
  id: string;
  name: string;
  sales: number;
  transactions: number;
  avatar: string;
}

export const StaffPerformanceWidget: React.FC<StaffPerformanceWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [topStaff, setTopStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalStaff, setTotalStaff] = useState(0);

  useEffect(() => {
    loadStaffPerformance();
  }, []);

  const loadStaffPerformance = async () => {
    try {
      setIsLoading(true);
      const currentBranchId = getCurrentBranchId();
      
      // Get last 7 days
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      // Query sales with user info
      let query = supabase
        .from('lats_sales')
        .select(`
          id,
          total_amount,
          user_id,
          users:users!user_id (
            id,
            email,
            full_name
          )
        `)
        .gte('created_at', weekAgo.toISOString());
      
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data: sales, error } = await query;
      
      if (error) throw error;
      
      // Aggregate by user
      const userMap = new Map<string, { sales: number; count: number; name: string }>();
      
      (sales || []).forEach((sale: any) => {
        const userId = sale.user_id;
        if (!userId) return;
        
        const amount = typeof sale.total_amount === 'string' 
          ? parseFloat(sale.total_amount) 
          : sale.total_amount || 0;
        
        const userName = sale.users?.full_name || sale.users?.email || 'Unknown User';
        
        if (userMap.has(userId)) {
          const existing = userMap.get(userId)!;
          existing.sales += amount;
          existing.count += 1;
        } else {
          userMap.set(userId, { 
            sales: amount, 
            count: 1,
            name: userName
          });
        }
      });
      
      // Convert to array and sort by sales
      const staffList: StaffMember[] = Array.from(userMap.entries())
        .map(([id, data]) => ({
          id,
          name: data.name,
          sales: data.sales,
          transactions: data.count,
          avatar: data.name.substring(0, 2).toUpperCase()
        }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);
      
      setTopStaff(staffList);
      setTotalStaff(userMap.size);
      
    } catch (error) {
      console.error('Error loading staff performance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `TSh ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `TSh ${(amount / 1000).toFixed(0)}K`;
    return `TSh ${amount.toFixed(0)}`;
  };

  const getAvatarColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-emerald-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500'
    ];
    return colors[index % colors.length];
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl p-7 flex flex-col ${className}`}>
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
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Staff Performance</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {totalStaff} active members
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/employees')}
          className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
          title="View All Staff"
        >
          <ExternalLink size={14} />
          <span>View All</span>
        </button>
      </div>

      {/* Top Performers */}
      <div className="space-y-3 flex-grow mb-6">
        {topStaff.length > 0 ? (
          topStaff.map((staff, index) => (
            <div 
              key={staff.id} 
              className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors relative overflow-hidden"
            >
              {/* Rank Badge */}
              {index < 3 && (
                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center ${
                  index === 0 ? 'bg-yellow-500' :
                  index === 1 ? 'bg-gray-400' :
                  'bg-orange-600'
                }`}>
                  {index === 0 && <Award size={14} className="text-white" />}
                  {index > 0 && <span className="text-xs font-bold text-white">#{index + 1}</span>}
                </div>
              )}
              
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getAvatarColor(index)}`}>
                  <span className="text-sm font-bold text-white">{staff.avatar}</span>
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {staff.name}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">
                      {staff.transactions} sales
                    </span>
                    <span className="text-sm font-semibold text-indigo-600">
                      {formatCurrency(staff.sales)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No staff activity yet</p>
            <p className="text-xs text-gray-400 mt-1">Sales data will appear here</p>
          </div>
        )}
      </div>

      {/* Top Performer Highlight */}
      {topStaff.length > 0 && (
        <div className="mt-auto pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-xs text-gray-600">Top Performer</p>
                <p className="text-sm font-semibold text-gray-900">{topStaff[0].name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-indigo-600">
                {formatCurrency(topStaff[0].sales)}
              </p>
              <p className="text-xs text-gray-600">{topStaff[0].transactions} sales</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

