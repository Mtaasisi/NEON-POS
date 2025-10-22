import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Award, ExternalLink } from 'lucide-react';
import { useDateRange } from '../../../../context/DateRangeContext';
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
  const { dateRange, getDateRangeForQuery } = useDateRange();
  const [topStaff, setTopStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalStaff, setTotalStaff] = useState(0);

  useEffect(() => {
    loadStaffPerformance();
  }, [dateRange]); // Reload when date range changes

  const loadStaffPerformance = async () => {
    try {
      setIsLoading(true);
      const currentBranchId = getCurrentBranchId();
      const { startDate, endDate } = getDateRangeForQuery();
      
      // Query sales (Neon compatible approach)
      // ✅ FIXED: Use sold_by instead of user_id (correct field name)
      let query = supabase
        .from('lats_sales')
        .select('id, total_amount, sold_by, created_at, branch_id')
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data: sales, error } = await query;
      
      if (error) throw error;
      
      if (!sales || sales.length === 0) {
        setTopStaff([]);
        setTotalStaff(0);
        return;
      }
      
      // Fetch user info separately (try both users and employees tables)
      const soldByValues = [...new Set(sales.map((s: any) => s.sold_by).filter(Boolean))] as string[];
      
      let usersMap = new Map();
      if (soldByValues.length > 0) {
        // Separate UUIDs from emails
        const isValidUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        const userIds = soldByValues.filter(id => isValidUUID(id));
        const emails = soldByValues.filter(id => !isValidUUID(id));
        
        // Query by IDs if we have valid UUIDs
        if (userIds.length > 0) {
          // First try users table
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, email, full_name')
            .in('id', userIds);
          
          if (!usersError && users) {
            users.forEach((user: any) => {
              usersMap.set(user.id, user);
            });
          }
          
          // Also try employees table for those not found in users
          // ✅ Note: employees table uses 'full_name' column
          const { data: employees, error: employeesError } = await supabase
            .from('employees')
            .select('id, email, full_name')
            .in('id', userIds);
          
          if (!employeesError && employees) {
            employees.forEach((emp: any) => {
              if (!usersMap.has(emp.id)) {
                usersMap.set(emp.id, emp); // Use employee data directly
              }
            });
          }
        }
        
        // Query by emails if we have email addresses
        if (emails.length > 0) {
          // Try users table by email
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, email, full_name')
            .in('email', emails);
          
          if (!usersError && users) {
            users.forEach((user: any) => {
              usersMap.set(user.email, user);
            });
          }
          
          // Also try employees table by email
          // ✅ Note: employees table uses 'full_name' column
          const { data: employees, error: employeesError } = await supabase
            .from('employees')
            .select('id, email, full_name')
            .in('email', emails);
          
          if (!employeesError && employees) {
            employees.forEach((emp: any) => {
              if (!usersMap.has(emp.email)) {
                usersMap.set(emp.email, emp); // Use employee data directly
              }
            });
          }
        }
      }
      
      // Aggregate by user
      const userMap = new Map<string, { sales: number; count: number; name: string }>();
      
      (sales || []).forEach((sale: any) => {
        const userId = sale.sold_by;  // ✅ Use sold_by instead of user_id
        if (!userId) return;
        
        const amount = typeof sale.total_amount === 'string' 
          ? parseFloat(sale.total_amount) 
          : sale.total_amount || 0;
        
        const user = usersMap.get(userId);
        // Try multiple name fields to get the best available name
        // Note: Both users and employees tables use 'full_name' column
        const userName = user?.full_name || 
                        user?.name ||
                        user?.email?.split('@')[0] ||
                        user?.email || 
                        `Staff #${userId.substring(0, 8)}`;
        
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
              {totalStaff} active members · {dateRange.preset === '7days' ? 'Last 7 days' : 
                dateRange.preset === '1month' ? 'Last month' : 
                dateRange.preset === '3months' ? 'Last 3 months' : 
                dateRange.preset === '6months' ? 'Last 6 months' : 'Custom range'}
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

