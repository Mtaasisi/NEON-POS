import React, { useState, lazy, Suspense } from 'react';
import { MessageSquare, Users } from 'lucide-react';
import BulkSMSModal from '../components/BulkSMSModal';

// Lazy load the SMS logs page
const SMSLogsPage = lazy(() => import('./SMSLogsPage'));

// Simple loading component
const TabLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

const SMSControlCenterPage: React.FC = () => {
  const [showBulkSMSModal, setShowBulkSMSModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">SMS Control Center</h1>
            </div>
            <button
              onClick={() => setShowBulkSMSModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold shadow-lg hover:shadow-xl"
            >
              <Users size={20} />
              Send Bulk SMS
            </button>
          </div>
        </div>
      </div>

      {/* SMS Logs Content */}
      <div className="pt-0">
        <Suspense fallback={<TabLoader />}>
          <SMSLogsPage />
        </Suspense>
      </div>

      {/* Bulk SMS Modal */}
      <BulkSMSModal 
        isOpen={showBulkSMSModal} 
        onClose={() => setShowBulkSMSModal(false)} 
      />
    </div>
  );
};

export default SMSControlCenterPage;
