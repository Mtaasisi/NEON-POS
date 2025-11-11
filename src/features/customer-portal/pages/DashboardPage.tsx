import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../components/MobileLayout';
import {
  Package,
  Heart,
  Star,
  Smartphone,
  Calendar,
  TrendingUp,
  Award,
  ShoppingBag,
  ChevronRight,
  Gift,
  Clock
} from 'lucide-react';
import customerPortalService from '../services/customerPortalService';

interface DashboardStats {
  loyaltyPoints: number;
  activeOrders: number;
  devicesInRepair: number;
  upcomingAppointments: number;
  totalPurchases: number;
}

const CustomerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    loyaltyPoints: 0,
    activeOrders: 0,
    devicesInRepair: 0,
    upcomingAppointments: 0,
    totalPurchases: 0
  });
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState('Guest');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const customerId = localStorage.getItem('customer_id');
      
      if (customerId) {
        // Load customer info using service
        const customer = await customerPortalService.getCustomerById(customerId);

        if (customer) {
          setCustomerName(customer.name);
          setStats(prev => ({ ...prev, loyaltyPoints: customer.points || 0 }));
        }

        // Load orders count (mock for now)
        setStats(prev => ({
          ...prev,
          activeOrders: Math.floor(Math.random() * 5),
          devicesInRepair: Math.floor(Math.random() * 3),
          upcomingAppointments: Math.floor(Math.random() * 2),
          totalPurchases: Math.floor(Math.random() * 50)
        }));
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      icon: ShoppingBag,
      label: 'Shop Now',
      color: 'bg-blue-500',
      action: () => navigate('/customer-portal/products')
    },
    {
      icon: Package,
      label: 'My Orders',
      color: 'bg-green-500',
      action: () => navigate('/customer-portal/orders')
    },
    {
      icon: Gift,
      label: 'Rewards',
      color: 'bg-purple-500',
      action: () => navigate('/customer-portal/loyalty')
    },
    {
      icon: Calendar,
      label: 'Book Service',
      color: 'bg-orange-500',
      action: () => navigate('/customer-portal/appointments')
    }
  ];

  const statCards = [
    {
      icon: Star,
      label: 'Loyalty Points',
      value: stats.loyaltyPoints.toLocaleString(),
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      action: () => navigate('/customer-portal/loyalty')
    },
    {
      icon: Package,
      label: 'Active Orders',
      value: stats.activeOrders.toString(),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      action: () => navigate('/customer-portal/orders')
    },
    {
      icon: Smartphone,
      label: 'Devices in Repair',
      value: stats.devicesInRepair.toString(),
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      action: () => navigate('/customer-portal/devices')
    },
    {
      icon: Calendar,
      label: 'Appointments',
      value: stats.upcomingAppointments.toString(),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      action: () => navigate('/customer-portal/appointments')
    }
  ];

  if (loading) {
    return (
      <MobileLayout title="Dashboard">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Dashboard">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back, {customerName}! 👋</h1>
        <p className="text-blue-100">Ready to continue shopping?</p>
      </div>

      {/* Quick Actions - Auto-fit Grid */}
      <div className="p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Quick Actions</h2>
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(80px, 100%), 1fr))',
            gap: 'clamp(0.5rem, 1.5vw, 0.75rem)',
            gridAutoRows: '1fr'
          }}
        >
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.action}
                className="flex flex-col items-center active:scale-95 transition-transform"
              >
                <div className={`${action.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-2 shadow-md`}>
                  <Icon size={24} className="text-white" />
                </div>
                <span className="text-xs text-gray-700 text-center font-medium">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats Grid - Auto-fit */}
      <div className="px-4 pb-4">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Your Activity</h2>
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))',
            gap: 'clamp(0.75rem, 2vw, 1rem)',
            gridAutoRows: '1fr'
          }}
        >
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <button
                key={index}
                onClick={stat.action}
                className="bg-white rounded-xl p-4 shadow-sm active:scale-95 transition-transform"
              >
                <div className={`${stat.bgColor} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
                  <Icon size={20} className={stat.color} />
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-xs text-gray-600">{stat.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured Sections */}
      <div className="px-4 pb-4 space-y-3">
        {/* Recent Orders */}
        <button
          onClick={() => navigate('/customer-portal/orders')}
          className="w-full bg-white rounded-xl p-4 shadow-sm active:scale-95 transition-transform"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center">
                <Package size={24} className="text-blue-600" />
              </div>
              <div className="text-left">
                <div className="font-bold text-gray-900">Recent Orders</div>
                <div className="text-sm text-gray-600">View your purchase history</div>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </div>
        </button>

        {/* Rewards Program */}
        <button
          onClick={() => navigate('/customer-portal/loyalty')}
          className="w-full bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-4 shadow-sm active:scale-95 transition-transform text-white"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white bg-opacity-20 w-12 h-12 rounded-lg flex items-center justify-center">
                <Award size={24} />
              </div>
              <div className="text-left">
                <div className="font-bold">Loyalty Rewards</div>
                <div className="text-sm opacity-90">{stats.loyaltyPoints} points available</div>
              </div>
            </div>
            <ChevronRight size={20} />
          </div>
        </button>

        {/* Devices in Service */}
        {stats.devicesInRepair > 0 && (
          <button
            onClick={() => navigate('/customer-portal/devices')}
            className="w-full bg-white rounded-xl p-4 shadow-sm active:scale-95 transition-transform"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-orange-50 w-12 h-12 rounded-lg flex items-center justify-center">
                  <Smartphone size={24} className="text-orange-600" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-900">Devices in Service</div>
                  <div className="text-sm text-gray-600">{stats.devicesInRepair} device(s) being serviced</div>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </div>
          </button>
        )}

        {/* Upcoming Appointments */}
        {stats.upcomingAppointments > 0 && (
          <button
            onClick={() => navigate('/customer-portal/appointments')}
            className="w-full bg-white rounded-xl p-4 shadow-sm active:scale-95 transition-transform"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-50 w-12 h-12 rounded-lg flex items-center justify-center">
                  <Clock size={24} className="text-green-600" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-900">Upcoming Appointments</div>
                  <div className="text-sm text-gray-600">{stats.upcomingAppointments} appointment(s) scheduled</div>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </div>
          </button>
        )}
      </div>

      {/* Promotional Banner */}
      <div className="px-4 pb-4">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <TrendingUp size={32} />
            <div>
              <div className="font-bold text-lg">Special Offers!</div>
              <div className="text-sm opacity-90">Check out our latest deals</div>
            </div>
          </div>
          <button
            onClick={() => navigate('/customer-portal/products')}
            className="mt-3 bg-white text-orange-600 font-bold py-2 px-4 rounded-lg w-full hover:bg-gray-50 active:scale-95 transition-all"
          >
            Shop Now
          </button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default CustomerDashboardPage;

