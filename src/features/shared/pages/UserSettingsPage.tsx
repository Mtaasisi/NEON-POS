import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { PageErrorWrapper } from '../components/PageErrorWrapper';
import DashboardCustomizationSettings from '../components/DashboardCustomizationSettings';
import { 
  LayoutDashboard, 
  User, 
  Bell, 
  Shield,
  Settings as SettingsIcon
} from 'lucide-react';

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
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center">
                <SettingsIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600">
                  Manage your preferences and customize your experience
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-1 p-2" aria-label="Settings Tabs">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => !tab.disabled && setActiveTab(tab.id)}
                      disabled={tab.disabled}
                      className={`
                        flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                        ${isActive 
                          ? 'bg-indigo-50 text-indigo-700 border-2 border-indigo-200' 
                          : tab.disabled
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                      title={tab.disabled ? 'Coming soon' : tab.description}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                      {tab.disabled && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                          Soon
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
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
      </div>
    </PageErrorWrapper>
  );
};

export default UserSettingsPage;

