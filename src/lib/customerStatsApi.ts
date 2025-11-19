import { supabase } from './supabaseClient';

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  todaysBirthdays: number;
  totalRevenue: number;
  totalDevices: number;
}

export const fetchCustomerStats = async (): Promise<CustomerStats> => {
  try {
    // 🌐 CUSTOMERS ARE SHARED ACROSS ALL BRANCHES
    const currentBranchId = localStorage.getItem('current_branch_id');
    
    console.log('📊 [CustomerStats] Configuration:');
    console.log('   - Current Branch ID:', currentBranchId || '❌ NOT SET');
    console.log('   - 🌐 CUSTOMERS: SHARED ACROSS ALL BRANCHES');
    console.log('   - 📊 Will fetch stats for ALL customers from ALL branches');

    // Fetch total customers count (ALL CUSTOMERS - NO BRANCH FILTERING)
    const { count: totalCustomers, error: totalError } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true });

    if (totalError) {
      console.error('Error fetching total customers count:', totalError);
    }

    // Fetch active customers count (ALL CUSTOMERS - NO BRANCH FILTERING)
    const { count: activeCustomers, error: activeError } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    if (activeError) {
      console.error('Error fetching active customers count:', activeError);
    }

    // Fetch today's birthdays (ALL CUSTOMERS - NO BRANCH FILTERING)
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // getMonth() returns 0-11
    const currentDay = today.getDate();

    const { data: birthdayCustomers, error: birthdayError } = await supabase
      .from('customers')
      .select('id, birth_month, birth_day')
      .not('birth_month', 'is', null)
      .not('birth_day', 'is', null);

    if (birthdayError) {
      console.error('Error fetching birthday customers:', birthdayError);
    }

    // Filter customers with today's birthday
    const todaysBirthdays = birthdayCustomers?.filter(customer => {
      if (!customer.birth_month || !customer.birth_day) return false;
      
      let customerMonth: number;
      let customerDay: number;
      
      // Handle different month formats
      if (typeof customer.birth_month === 'string') {
        if (customer.birth_month.trim() === '') return false;
        
        // Check if it's a numeric month (1-12)
        const numericMonth = parseInt(customer.birth_month);
        if (!isNaN(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
          customerMonth = numericMonth;
        } else {
          // Convert month name to number
          const monthNames = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
          ];
          customerMonth = monthNames.indexOf(customer.birth_month.toLowerCase()) + 1;
        }
      } else {
        return false;
      }
      
      // Handle different day formats
      if (typeof customer.birth_day === 'string') {
        if (customer.birth_day.trim() === '') return false;
        
        // Extract day from formats like "14 00:00:00" or "14"
        const dayMatch = customer.birth_day.match(/^(\d+)/);
        if (dayMatch) {
          customerDay = parseInt(dayMatch[1]);
        } else {
          customerDay = parseInt(customer.birth_day);
        }
      } else {
        customerDay = parseInt(customer.birth_day);
      }
      
      return customerMonth === currentMonth && customerDay === currentDay;
    }).length || 0;

    // Fetch total devices count
    let totalDevices = 0;
    let devicesError: any = null;
    
    try {
      let devicesQuery = supabase
        .from('devices')
        .select('id', { count: 'exact', head: true });
      
      // 🔒 COMPLETE ISOLATION: Only count devices from current branch
      if (currentBranchId) {
        console.log('   🔒 Applying branch filter to devices count...');
        devicesQuery = devicesQuery.eq('branch_id', currentBranchId);
      }

      const result = await devicesQuery;
      totalDevices = result.count || 0;
      devicesError = result.error;
    } catch (error) {
      console.warn('⚠️  Branch filtering failed for devices, falling back to total count...');
      console.warn('⚠️  This might be because devices table does not have branch_id column');
      
      // Fallback: get total devices count without branch filtering
      try {
        const fallbackResult = await supabase
          .from('devices')
          .select('id', { count: 'exact', head: true });
        totalDevices = fallbackResult.count || 0;
        devicesError = fallbackResult.error;
      } catch (fallbackError) {
        console.error('❌ Error fetching devices count (fallback):', fallbackError);
        devicesError = fallbackError;
      }
    }

    if (devicesError) {
      console.error('❌ Error fetching total devices count:', devicesError);
      console.error('❌ Devices query details:', { currentBranchId, devicesError });
    }

    // Calculate revenue for current branch only (BRANCH-SPECIFIC REVENUE)
    let totalRevenue = 0;
    let revenueError: any = null;
    
    if (currentBranchId) {
      console.log('💰 Calculating revenue for current branch:', currentBranchId);
      
      try {
        const { data: revenueData, error: revenueError } = await supabase
          .from('customers')
          .select('total_spent')
          .eq('branch_id', currentBranchId);

        if (revenueError) {
          console.error('❌ Error fetching branch revenue data:', revenueError);
          console.error('❌ Revenue query details:', { currentBranchId, revenueError });
        } else {
          totalRevenue = revenueData?.reduce((sum, customer) => sum + (customer.total_spent || 0), 0) || 0;
          console.log('💰 Branch revenue calculated:', totalRevenue);
        }
      } catch (error) {
        console.error('❌ Error calculating branch revenue:', error);
        revenueError = error;
      }
    } else {
      console.warn('⚠️  No branch selected - revenue will be 0');
    }

    const finalStats = {
      totalCustomers: totalCustomers || 0,
      activeCustomers: activeCustomers || 0,
      todaysBirthdays,
      totalRevenue,
      totalDevices: totalDevices || 0
    };

    console.log('📊 [CustomerStats] Final Statistics:', finalStats);
    console.log('📊 [CustomerStats] Customers: SHARED | Revenue: BRANCH-SPECIFIC');

    return finalStats;
  } catch (error) {
    console.error('Error fetching customer stats:', error);
    return {
      totalCustomers: 0,
      activeCustomers: 0,
      todaysBirthdays: 0,
      totalRevenue: 0,
      totalDevices: 0
    };
  }
};
