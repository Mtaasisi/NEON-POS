/**
 * Trade-In Management Page
 * Combined page with tabs for History & Reports and Pricing Management
 */

import React, { useState } from 'react';
import { History, DollarSign, Settings } from 'lucide-react';
import TradeInHistoryTab from '../components/tradeIn/TradeInHistoryTab';
import TradeInPricingTab from '../components/tradeIn/TradeInPricingTab';
import { TradeInSettingsModal } from '../components/tradeIn/TradeInSettingsModal';
import { useLoadingJob } from '../../../hooks/useLoadingJob';

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
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <History className="w-8 h-8 text-blue-600" />
            Trade-In Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage device trade-ins, pricing, and transaction history
          </p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
          title="Trade-In Settings"
        >
          <Settings className="w-5 h-5" />
          Settings
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-lg shadow-sm mb-6 border border-gray-200">
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-4 text-left transition-all ${
                  isActive
                    ? 'border-b-2 border-blue-600 bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 ${
                      isActive ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  />
                  <div>
                    <div
                      className={`font-semibold ${
                        isActive ? 'text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      {tab.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {tab.description}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
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

