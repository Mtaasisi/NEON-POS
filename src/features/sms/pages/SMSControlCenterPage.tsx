import React, { useState, lazy, Suspense } from 'react';
import { MessageSquare, Users } from 'lucide-react';

// Lazy load the tab components
const SMSLogsPage = lazy(() => import('./SMSLogsPage'));
const BulkSMSPage = lazy(() => import('./BulkSMSPage'));

type TabType = 'logs' | 'bulk';

// Simple loading component for tabs
const TabLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

const SMSControlCenterPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('logs');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-4 py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'logs'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MessageSquare size={20} />
              SMS Logs
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`flex items-center gap-2 px-4 py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'bulk'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users size={20} />
              Bulk SMS
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="pt-0">
        <Suspense fallback={<TabLoader />}>
          {activeTab === 'logs' && <SMSLogsPage />}
          {activeTab === 'bulk' && <BulkSMSPage />}
        </Suspense>
      </div>
    </div>
  );
};

export default SMSControlCenterPage;
