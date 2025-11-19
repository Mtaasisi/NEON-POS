/**
 * Responsive Dashboard Example Component
 * 
 * This component demonstrates both CSS classes and Tailwind responsive patterns
 * for building mobile-friendly dashboard layouts.
 * 
 * Usage:
 * import { ResponsiveDashboardExample } from '@/components/examples/ResponsiveDashboardExample';
 * 
 * Features:
 * - Responsive stat cards using Tailwind grid
 * - Quick actions with Flexbox
 * - Mobile-first design approach
 * - Touch-friendly buttons (44x44px minimum)
 */

import React from 'react';
import { 
  Smartphone, 
  Users, 
  Package, 
  DollarSign, 
  Plus, 
  FileText, 
  Calendar,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  trend: {
    value: string;
    isPositive: boolean;
  };
  iconBgColor: string;
  iconColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  iconBgColor,
  iconColor
}) => (
  <div className="bg-white p-4 md:p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className={`${iconBgColor} p-3 rounded-full`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
    </div>
    <div className="flex items-center mt-3">
      {trend.isPositive ? (
        <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
      ) : (
        <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
      )}
      <p className={`text-xs md:text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {trend.value}
      </p>
    </div>
  </div>
);

interface QuickActionProps {
  title: string;
  icon: React.ElementType;
  color: string;
  onClick: () => void;
}

const QuickActionButton: React.FC<QuickActionProps> = ({ 
  title, 
  icon: Icon, 
  color,
  onClick 
}) => (
  <button
    onClick={onClick}
    className={`flex-1 min-w-[200px] ${color} text-white py-3 px-4 rounded-lg transition-all font-medium text-sm md:text-base hover:opacity-90 active:scale-98 flex items-center justify-center gap-2`}
  >
    <Icon className="w-5 h-5" />
    <span>{title}</span>
  </button>
);

export const ResponsiveDashboardExample: React.FC = () => {
  // Sample stat cards data
  const statCards = [
    {
      title: 'Total Devices',
      value: '1,234',
      icon: Smartphone,
      iconBgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      trend: { value: '↑ 12% from last month', isPositive: true }
    },
    {
      title: 'Customers',
      value: '567',
      icon: Users,
      iconBgColor: 'bg-green-100',
      iconColor: 'text-green-600',
      trend: { value: '↑ 8% from last month', isPositive: true }
    },
    {
      title: 'Inventory Items',
      value: '890',
      icon: Package,
      iconBgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
      trend: { value: '↓ 3% from last month', isPositive: false }
    },
    {
      title: 'Revenue',
      value: '$45.2K',
      icon: DollarSign,
      iconBgColor: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      trend: { value: '↑ 23% from last month', isPositive: true }
    }
  ];

  // Sample quick actions
  const quickActions = [
    {
      title: 'Add New Device',
      icon: Plus,
      color: 'bg-blue-600 hover:bg-blue-700',
      onClick: () => console.log('Add Device')
    },
    {
      title: 'View Customers',
      icon: Users,
      color: 'bg-green-600 hover:bg-green-700',
      onClick: () => console.log('View Customers')
    },
    {
      title: 'Create Report',
      icon: FileText,
      color: 'bg-purple-600 hover:bg-purple-700',
      onClick: () => console.log('Create Report')
    },
    {
      title: 'Schedule Appointment',
      icon: Calendar,
      color: 'bg-orange-600 hover:bg-orange-700',
      onClick: () => console.log('Schedule')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Container with responsive padding */}
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
            Responsive Dashboard
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-2">
            Welcome back! Here's what's happening today.
          </p>
        </div>

        {/* Stats Cards - Using CSS Class Method */}
        <div className="mb-8">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
            Method 1: Using CSS Classes
          </h2>
          <div className="dashboard-cards">
            {statCards.map((stat, index) => (
              <div key={`css-${index}`} className="dashboard-card">
                <StatCard {...stat} />
              </div>
            ))}
          </div>
        </div>

        {/* Stats Cards - Using Tailwind Grid */}
        <div className="mb-8">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
            Method 2: Using Tailwind Responsive Grid
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, index) => (
              <StatCard key={`tailwind-${index}`} {...stat} />
            ))}
          </div>
        </div>

        {/* Quick Actions - Using CSS Class Method */}
        <div className="mb-8">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
            Quick Actions (CSS Classes)
          </h2>
          <div className="quick-actions">
            {quickActions.slice(0, 3).map((action, index) => (
              <QuickActionButton key={`css-action-${index}`} {...action} />
            ))}
          </div>
        </div>

        {/* Quick Actions - Using Tailwind Flexbox */}
        <div className="mb-8">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
            Quick Actions (Tailwind Flexbox)
          </h2>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4">
            {quickActions.map((action, index) => (
              <QuickActionButton key={`tailwind-action-${index}`} {...action} />
            ))}
          </div>
        </div>

        {/* Two Column Layout Example */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity - Takes 2 columns on large screens */}
          <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">
              Recent Activity
            </h3>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      New device added
                    </p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats - Takes 1 column */}
          <div className="bg-white p-4 md:p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">
              Quick Stats
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Pending</span>
                <span className="text-lg font-bold text-blue-600">12</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Completed</span>
                <span className="text-lg font-bold text-green-600">45</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">In Progress</span>
                <span className="text-lg font-bold text-orange-600">8</span>
              </div>
            </div>
          </div>
        </div>

        {/* Responsive Visibility Example */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-bold text-blue-900 mb-2">
            Responsive Visibility Demo
          </h3>
          
          {/* Mobile only */}
          <div className="block sm:hidden p-3 bg-blue-100 rounded mb-2">
            <p className="text-sm text-blue-900">
              📱 This text is only visible on mobile devices (width &lt; 640px)
            </p>
          </div>
          
          {/* Tablet and up */}
          <div className="hidden sm:block lg:hidden p-3 bg-green-100 rounded mb-2">
            <p className="text-sm text-green-900">
              💻 This text is only visible on tablet devices (640px - 1024px)
            </p>
          </div>
          
          {/* Desktop only */}
          <div className="hidden lg:block p-3 bg-purple-100 rounded">
            <p className="text-sm text-purple-900">
              🖥️ This text is only visible on desktop devices (width ≥ 1024px)
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ResponsiveDashboardExample;

