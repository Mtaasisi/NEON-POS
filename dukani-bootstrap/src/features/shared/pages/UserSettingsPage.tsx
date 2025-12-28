import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { PageErrorWrapper } from '../components/PageErrorWrapper';
import DashboardCustomizationSettings from '../components/DashboardCustomizationSettings';
import GlassTabs from '../components/ui/GlassTabs';
import { 
  LayoutDashboard, 
  User, 
  Bell, 
  Shield,
  Settings as SettingsIcon
} from 'lucide-react';
import { useLoadingJob } from '../../../hooks/useLoadingJob';

type SettingsTab = 'dashboard' | 'profile' | 'notifications' | 'security';

const UserSettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('dashboard');

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard, description: 'Customize your dashboard' },
    { id: 'profile' as const, label: 'Profile', icon: User, description: 'Manage your profile', disabled: true },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell, description: 'Notification preferences', disabled: true },
    { id: 'security' as const, label: 'Security', icon: Shield, description: 'Security settings', disabled: true },
  ];

  return (
    <PageErrorWrapper>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header - Enhanced */}
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                <SettingsIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
                <p className="text-sm text-gray-600">
                  Manage your preferences and customize your experience
                </p>
              </div>
            </div>
          </div>

          {/* Modern Tabs */}
          <div className="mb-6">
            <GlassTabs
              tabs={tabs.map(tab => ({
                id: tab.id,
                label: tab.label,
                icon: <tab.icon className="w-5 h-5" />,
                description: tab.description,
                disabled: tab.disabled,
                badge: tab.disabled ? 'Soon' : undefined
              }))}
              activeTab={activeTab}
              onTabChange={(tabId) => setActiveTab(tabId as SettingsTab)}
              variant="modern"
              size="md"
            />
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

            {activeTab === 'dashboard' && <DashboardCustomizationSettings />}
            
            {activeTab === 'profile' && (
              <div className="text-center py-12 text-gray-500">
                <User className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Profile settings coming soon</p>
              </div>
            )}
            
            {activeTab === 'notifications' && (
              <div className="text-center py-12 text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Notification settings coming soon</p>
              </div>
            )}
            
            {activeTab === 'security' && (
              <div className="text-center py-12 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Security settings coming soon</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageErrorWrapper>
  );
};

export default UserSettingsPage;

