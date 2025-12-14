/**
 * Trade-In Management Page
 * Combined page with tabs for History & Reports and Pricing Management
 */

import React, { useState } from 'react';
import { History, DollarSign, Settings } from 'lucide-react';
import TradeInHistoryTab from '../components/tradeIn/TradeInHistoryTab';
import TradeInPricingTab from '../components/tradeIn/TradeInPricingTab';
import { TradeInSettingsModal } from '../components/tradeIn/TradeInSettingsModal';
import GlassTabs from '../../shared/components/ui/GlassTabs';

type TabType = 'history' | 'pricing';

export const TradeInManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('history');
  const [showSettings, setShowSettings] = useState(false);

  const tabs = [
    {
      id: 'history' as TabType,
      label: 'History & Reports',
      icon: History,
      description: 'View all trade-in transactions with filtering and analytics',
    },
    {
      id: 'pricing' as TabType,
      label: 'Pricing Management',
      icon: DollarSign,
      description: 'Set and manage base trade-in prices for devices',
    },
  ];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header - Enhanced Modal Style */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
              <History className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Trade-In Management</h1>
              <p className="text-sm text-gray-600">Manage device trade-ins, pricing, and transaction history</p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl"
            title="Trade-In Settings"
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="mb-6">
        <GlassTabs
          tabs={tabs.map(tab => ({
            id: tab.id,
            label: tab.label,
            icon: <tab.icon className="w-5 h-5" />,
            description: tab.description
          }))}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as TabType)}
          variant="cards"
          size="md"
        />
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'history' && <TradeInHistoryTab />}
        {activeTab === 'pricing' && <TradeInPricingTab />}
      </div>

      {/* Settings Modal */}
      <TradeInSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

export default TradeInManagementPage;

