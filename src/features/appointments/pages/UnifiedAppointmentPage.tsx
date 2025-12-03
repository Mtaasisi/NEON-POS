import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import GlassTabs from '../../../features/shared/components/ui/GlassTabs';
import SearchBar from '../../../features/shared/components/ui/SearchBar';
import GlassSelect from '../../../features/shared/components/ui/GlassSelect';
import { BackButton } from '../../../features/shared/components/ui/BackButton';
import { PageErrorBoundary } from '../../../features/shared/components/PageErrorBoundary';
import { 
  Calendar, Plus, CheckCircle, CalendarDays, RefreshCw
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
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <BackButton to="/dashboard" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Appointments & Calendar</h1>
              <p className="text-gray-600 mt-1">
                {currentTab?.description || 'Comprehensive appointment management system'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
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
            
            <SearchBar
              onSearch={setSearchQuery}
              placeholder="Search appointments..."
              className="min-w-[200px]"
            />

            <GlassButton
              onClick={handleRefresh}
              icon={<RefreshCw size={18} />}
              variant="secondary"
              loading={isLoading}
              disabled={isLoading}
            >
              Refresh
            </GlassButton>

            <GlassButton
              onClick={handleCreateAppointment}
              icon={<Plus size={18} />}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white"
            >
              New Appointment
            </GlassButton>
          </div>
        </div>

        {/* Modern Top Tabs Navigation */}
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

        {/* Appointment Content */}
        <div className="w-full">
            <GlassCard className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className={`text-${currentTab?.color}-500`}>
                  {currentTab?.icon}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {currentTab?.label}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {currentTab?.description}
                  </p>
                </div>
              </div>

              {/* Loading State */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600">Loading appointments...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {renderTabContent()}
                </div>
              )}
            </GlassCard>
        </div>
      </div>
    </PageErrorBoundary>
  );
};

export default UnifiedAppointmentPage;
