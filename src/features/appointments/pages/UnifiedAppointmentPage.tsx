import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import GlassTabs from '../../../features/shared/components/ui/GlassTabs';
import SearchBar from '../../../features/shared/components/ui/SearchBar';
import GlassSelect from '../../../features/shared/components/ui/GlassSelect';
import { BackButton } from '../../../features/shared/components/ui/BackButton';
import { PageErrorBoundary } from '../../../features/shared/components/PageErrorBoundary';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { 
  Calendar, Plus, CheckCircle, CalendarDays, RefreshCw, Search
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLoadingJob } from '../../../hooks/useLoadingJob';

// Import appointment components
import AppointmentManagementTab from '../components/AppointmentManagementTab';
import CalendarViewTab from '../components/CalendarViewTab';
import AppointmentStatsTab from '../components/AppointmentStatsTab';

// Appointment tab types
type AppointmentTab = 
  | 'management' 
  | 'calendar' 
  | 'stats';

interface TabConfig {
  id: AppointmentTab;
  label: string;
  icon: React.ReactNode;
  description: string;
  adminOnly?: boolean;
  color: string;
}

const UnifiedAppointmentPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AppointmentTab>('management');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('📅 UnifiedAppointmentPage loaded');
    console.log('👤 Current user:', currentUser);
    console.log('🔑 User role:', currentUser?.role);
  }, [currentUser]);

  // Define all appointment tabs
  const appointmentTabs: TabConfig[] = [
    {
      id: 'management',
      label: 'Appointment Management',
      icon: <Calendar size={20} />,
      description: 'Manage customer appointments and scheduling',
      color: 'blue'
    },
    {
      id: 'calendar',
      label: 'Calendar View',
      icon: <CalendarDays size={20} />,
      description: 'Visual calendar interface for appointments and events',
      color: 'green'
    },
    {
      id: 'stats',
      label: 'Appointment Statistics',
      icon: <CheckCircle size={20} />,
      description: 'Analytics and insights for appointment performance',
      color: 'purple'
    }
  ];

  // Filter tabs based on user role
  const availableTabs = appointmentTabs.filter(tab => 
    !tab.adminOnly || currentUser?.role === 'admin'
  );

  // Get current tab config
  const currentTab = appointmentTabs.find(tab => tab.id === activeTab);

  // Handle tab changes
  const handleTabChange = (tabId: AppointmentTab) => {
    setActiveTab(tabId);
  };

  // Create new appointment
  const handleCreateAppointment = () => {
    setShowCreateModal(true);
  };

  // Refresh data
  const handleRefresh = () => {
    setIsLoading(true);
    // Trigger refresh for current tab
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Appointment data refreshed');
    }, 1000);
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'management':
        return (
          <AppointmentManagementTab 
            isActive={true} 
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            showCreateModal={showCreateModal}
            setShowCreateModal={setShowCreateModal}
          />
        );
      case 'calendar':
        return <CalendarViewTab isActive={true} />;
      case 'stats':
        return <AppointmentStatsTab isActive={true} />;
      default:
        return (
          <AppointmentManagementTab 
            isActive={true} 
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            showCreateModal={showCreateModal}
            setShowCreateModal={setShowCreateModal}
          />
        );
    }
  };

  return (
    <PageErrorBoundary pageName="Unified Appointments" showDetails={true}>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Wrapper Container - Single rounded container */}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[95vh]">
          {/* Fixed Header Section */}
          <div className="p-8 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {/* Icon */}
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center shadow-lg">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                
                {/* Text */}
            <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Appointments & Calendar</h1>
                  <p className="text-sm text-gray-600">
                {currentTab?.description || 'Comprehensive appointment management system'}
              </p>
            </div>
          </div>

              {/* Back Button */}
              <BackButton to="/dashboard" label="" className="!w-12 !h-12 !p-0 !rounded-full !bg-blue-600 hover:!bg-blue-700 !shadow-lg flex items-center justify-center" iconClassName="text-white" />
            </div>
          </div>
          {/* Action Bar - Enhanced Design */}
          <div className="px-8 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/50 flex-shrink-0">
            <div className="flex gap-3 flex-wrap items-center">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search appointments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all text-gray-900 bg-white font-medium"
                  />
                </div>
              </div>

              {/* Status Filter */}
            <GlassSelect
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'in-progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'no-show', label: 'No Show' }
              ]}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              placeholder="Filter by Status"
              className="min-w-[150px]"
            />
            
              {/* Refresh Button */}
              <button
              onClick={handleRefresh}
              disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 bg-white font-semibold text-sm"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" color="gray" />
                ) : (
                  <RefreshCw size={18} />
                )}
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {/* New Appointment Button */}
              <button
              onClick={handleCreateAppointment}
                className="flex items-center gap-2 px-6 py-2.5 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:from-green-600 hover:to-green-700"
            >
                <Plus size={18} />
                <span>New Appointment</span>
              </button>
          </div>
        </div>

          {/* Tab Navigation */}
          <div className="p-6 pb-0 flex-shrink-0">
            <div className="bg-white rounded-xl border-2 border-gray-200 p-2">
        <GlassTabs
          tabs={availableTabs.map(tab => ({
            id: tab.id,
            label: tab.label,
            icon: tab.icon,
            description: tab.description,
            badge: tab.adminOnly ? 'Admin' : undefined
          }))}
          activeTab={activeTab}
          onTabChange={(tabId) => handleTabChange(tabId as AppointmentTab)}
          variant="modern"
          size="md"
        />
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Loading State */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <LoadingSpinner size="lg" color="green" />
                <p className="mt-4 text-gray-600 font-medium">Loading appointments...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Tab Header */}
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    currentTab?.color === 'blue' ? 'bg-blue-100' :
                    currentTab?.color === 'green' ? 'bg-green-100' :
                    currentTab?.color === 'purple' ? 'bg-purple-100' :
                    'bg-gray-100'
                  }`}>
                    <div className={
                      currentTab?.color === 'blue' ? 'text-blue-600' :
                      currentTab?.color === 'green' ? 'text-green-600' :
                      currentTab?.color === 'purple' ? 'text-purple-600' :
                      'text-gray-600'
                    }>
                  {currentTab?.icon}
                    </div>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">
                    {currentTab?.label}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {currentTab?.description}
                  </p>
                </div>
              </div>

                {/* Tab Content */}
                  {renderTabContent()}
                </div>
              )}
          </div>
        </div>
      </div>
    </PageErrorBoundary>
  );
};

export default UnifiedAppointmentPage;
