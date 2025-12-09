import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useNavigationHistory } from '../../../hooks/useNavigationHistory';
import { BackButton } from '../../../features/shared/components/ui/BackButton';
import { 
  Sparkles, CreditCard, DollarSign, BarChart2, Receipt, Users,
  Calendar, TrendingUp, Package, FileText, MessageCircle, Settings,
  Eye, Plus, Edit, Trash2, Download, Upload, RefreshCw, CheckCircle,
  ArrowRightLeft
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BusinessSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  category: 'loyalty' | 'payments' | 'analytics' | 'reports' | 'tools';
}

const BusinessManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { handleBackClick } = useNavigationHistory();
  const [activeTab, setActiveTab] = useState<'loyalty' | 'payments' | 'analytics' | 'reports' | 'tools'>('loyalty');

  const businessSections: BusinessSection[] = [
    // Customer Loyalty
    {
      id: 'customer-loyalty',
      title: 'Customer Loyalty',
      description: 'Manage loyalty programs and customer rewards',
      icon: <Sparkles size={24} />,
      path: '/lats/loyalty',
      color: 'from-purple-500 to-purple-600',
      category: 'loyalty'
    },
    {
      id: 'points-management',
      title: 'Points Management',
      description: 'Manage customer points and rewards system',
      icon: <Sparkles size={24} />,
      path: '/payments',
      color: 'from-yellow-500 to-yellow-600',
      category: 'loyalty'
    },
    // Payments
    {
      id: 'payment-management',
      title: 'Payment Management',
      description: 'Centralized payment tracking and management',
      icon: <CreditCard size={24} />,
      path: '/payments',
      color: 'from-green-500 to-green-600',
      category: 'payments'
    },
    {
      id: 'payments-report',
      title: 'Payments Report',
      description: 'Generate payment reports and analytics',
      icon: <Receipt size={24} />,
      path: '/payments',
      color: 'from-teal-500 to-teal-600',
      category: 'payments'
    },
    {
      id: 'payments-accounts',
      title: 'Payments Accounts',
      description: 'Manage payment accounts and settings',
      icon: <CreditCard size={24} />,
      path: '/payments',
      color: 'from-indigo-500 to-indigo-600',
      category: 'payments'
    },

    // Reports
    {
      id: 'sales-reports',
      title: 'Sales Reports',
      description: 'Generate and view sales reports',
      icon: <FileText size={24} />,
      path: '/lats/sales-reports',
      color: 'from-cyan-500 to-cyan-600',
      category: 'reports'
    },
    {
      id: 'customer-reports',
      title: 'Customer Reports',
      description: 'Customer data and activity reports',
      icon: <Users size={24} />,
      path: '/customers',
      color: 'from-violet-500 to-violet-600',
      category: 'reports'
    },

    // Business Tools
    {
      id: 'calendar-view',
      title: 'Calendar View',
      description: 'Visual calendar for appointments and events',
      icon: <Calendar size={24} />,
      path: '/calendar',
      color: 'from-amber-500 to-amber-600',
      category: 'tools'
    },
    {
      id: 'lats-dashboard',
      title: 'LATS Dashboard',
      description: 'Main LATS system dashboard',
      icon: <BarChart2 size={24} />,
      path: '/lats',
      color: 'from-blue-400 to-blue-500',
      category: 'tools'
    },
    {
      id: 'stock-transfers',
      title: 'Stock Transfers',
      description: 'Transfer inventory between branches',
      icon: <ArrowRightLeft size={24} />,
      path: '/lats/stock-transfers',
      color: 'from-blue-500 to-blue-600',
      category: 'tools'
    }
  ];

  const getTabIcon = (category: string) => {
    switch (category) {
      case 'loyalty':
        return <Sparkles size={20} />;
      case 'payments':
        return <CreditCard size={20} />;
      case 'analytics':
        return <TrendingUp size={20} />;
      case 'reports':
        return <FileText size={20} />;
      case 'tools':
        return <Settings size={20} />;
      default:
        return <BarChart2 size={20} />;
    }
  };

  const getTabLabel = (category: string) => {
    switch (category) {
      case 'loyalty':
        return 'Loyalty';
      case 'payments':
        return 'Payments';
      case 'analytics':
        return 'Analytics';
      case 'reports':
        return 'Reports';
      case 'tools':
        return 'Tools';
      default:
        return 'General';
    }
  };

  const filteredSections = businessSections.filter(section => section.category === activeTab);

  const getTabSummary = (category: string) => {
    switch (category) {
      case 'loyalty':
        return {
          title: 'Customer Loyalty Management',
          description: 'Comprehensive tools for managing customer loyalty programs, points systems, and customer analytics.',
          features: ['Loyalty Program Management', 'Points & Rewards System', 'Customer Behavior Analytics', 'Loyalty Campaigns'],
          icon: <Sparkles size={24} />
        };
      case 'payments':
        return {
          title: 'Payment & Finance Management',
          description: 'Complete payment processing, tracking, and financial management solutions.',
          features: ['Payment Transaction Tracking', 'Financial Reports', 'Account Management', 'Payment Analytics'],
          icon: <CreditCard size={24} />
        };
      case 'analytics':
        return {
          title: 'Business Analytics & Insights',
          description: 'Advanced analytics and business intelligence tools for data-driven decision making.',
          features: ['Advanced Business Analytics', 'Sales Performance Analysis', 'Business Intelligence', 'Performance Metrics'],
          icon: <TrendingUp size={24} />
        };
      case 'reports':
        return {
          title: 'Reporting & Documentation',
          description: 'Generate comprehensive reports and documentation for business operations.',
          features: ['Sales Reports Generation', 'Customer Activity Reports', 'Business Documentation', 'Report Scheduling'],
          icon: <FileText size={24} />
        };
      case 'tools':
        return {
          title: 'Business Tools & Utilities',
          description: 'Essential business tools and utilities for daily operations.',
          features: ['Calendar Management', 'LATS System Dashboard', 'Business Utilities', 'Operational Tools'],
          icon: <Settings size={24} />
        };
      default:
        return {
          title: 'Business Tools',
          description: 'Business management tools and utilities.',
          features: [],
          icon: <BarChart2 size={24} />
        };
    }
  };

  const currentSummary = getTabSummary(activeTab);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Wrapper Container - Single rounded container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Fixed Header Section */}
        <div className="p-8 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Icon */}
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <BarChart2 className="w-8 h-8 text-white" />
              </div>
              
              {/* Text */}
          <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Business Management</h1>
                <p className="text-sm text-gray-600">
                  Customer loyalty, payments, analytics, and business tools
                </p>
              </div>
            </div>

            {/* Back Button */}
            <BackButton to="/dashboard" label="" className="!w-12 !h-12 !p-0 !rounded-full !bg-blue-600 hover:!bg-blue-700 !shadow-lg flex items-center justify-center" iconClassName="text-white" />
          </div>
        </div>

        {/* Main Container - Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
      {/* Page Overview */}
          <div className="bg-gradient-to-r from-gray-50 to-green-50 border-2 border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Management Overview</h2>
          <p className="text-gray-600 max-w-3xl mx-auto">
            Complete business management suite with 14 tools organized across 5 categories. 
            Manage customer loyalty, payments, analytics, reports, and business operations from one central hub.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-white border-2 border-gray-200 rounded-xl shadow-sm">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <Sparkles size={20} />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Loyalty</h3>
            <p className="text-sm text-gray-600">3 tools</p>
            <p className="text-xs text-gray-500 mt-1">Programs, Points, Analytics</p>
          </div>
          
              <div className="text-center p-4 bg-white border-2 border-gray-200 rounded-xl shadow-sm">
            <div className="p-3 bg-green-100 text-green-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <CreditCard size={20} />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Payments</h3>
            <p className="text-sm text-gray-600">4 tools</p>
            <p className="text-xs text-gray-500 mt-1">Tracking, Reports, Accounts</p>
          </div>
          
              <div className="text-center p-4 bg-white border-2 border-gray-200 rounded-xl shadow-sm">
            <div className="p-3 bg-red-100 text-red-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <TrendingUp size={20} />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Analytics</h3>
            <p className="text-sm text-gray-600">3 tools</p>
            <p className="text-xs text-gray-500 mt-1">Advanced, Sales, Business</p>
          </div>
          
              <div className="text-center p-4 bg-white border-2 border-gray-200 rounded-xl shadow-sm">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <FileText size={20} />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Reports</h3>
            <p className="text-sm text-gray-600">2 tools</p>
            <p className="text-xs text-gray-500 mt-1">Sales, Customer</p>
          </div>
          
              <div className="text-center p-4 bg-white border-2 border-gray-200 rounded-xl shadow-sm">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <Settings size={20} />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Tools</h3>
            <p className="text-sm text-gray-600">2 tools</p>
            <p className="text-xs text-gray-500 mt-1">Calendar, Dashboard</p>
          </div>
        </div>
          </div>

      {/* Navigation Tabs */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm mb-6">
        <div className="relative mb-8">
          {/* Tab Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl" />
          
          {/* Tab Container */}
          <div className="relative flex flex-wrap gap-1 p-2">
            {(['loyalty', 'payments', 'analytics', 'reports', 'tools'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                      relative flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 border-2
                  ${activeTab === tab
                        ? 'bg-white text-blue-700 shadow-lg border-blue-300'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:shadow-md border-transparent'
                  }
                `}
              >
                {/* Active Indicator */}
                {activeTab === tab && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl" />
                )}
                
                <div className="relative flex items-center gap-2">
                  <div className={`
                    p-1.5 rounded-lg transition-all duration-300
                    ${activeTab === tab
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}>
                    {getTabIcon(tab)}
                  </div>
                  <span className="relative z-10">{getTabLabel(tab)}</span>
                </div>
                
                {/* Active Badge */}
                {activeTab === tab && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Summary */}
        <div className="mb-8">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl text-white shadow-lg">
                {currentSummary.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{currentSummary.title}</h3>
                <p className="text-gray-600 mb-4">{currentSummary.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {currentSummary.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-full" />
                          <span className="text-sm font-medium text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSections.map(section => (
            <div
              key={section.id}
              className="group cursor-pointer"
              onClick={() => navigate(section.path)}
            >
                  <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 h-full transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-blue-300">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${section.color} text-white shadow-lg`}>
                    {section.icon}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye size={16} className="text-gray-400" />
                  </div>
                </div>
                
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {section.title}
                </h3>
                
                <p className="text-sm text-gray-600 mb-4">
                  {section.description}
                </p>
                
                <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 capitalize font-medium">
                    {section.category}
                  </span>
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                  >
                    Access
                      </button>
                    </div>
                  </div>
                </div>
          ))}
        </div>

        {filteredSections.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <BarChart2 className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No tools available</h3>
                <p className="text-gray-600">Select a different category to view available tools.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessManagementPage;
