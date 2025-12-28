/**
 * MobileDashboard Page - Bootstrap Version
 * Simplified mobile dashboard for bootstrap
 */

import React from 'react';

const MobileDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome to Dukani Pro</h2>
        <p className="text-gray-600">Your mobile POS dashboard</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-blue-600">$1,250</div>
          <div className="text-sm text-gray-600">Today's Sales</div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-green-600">24</div>
          <div className="text-sm text-gray-600">Transactions</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Sale #1234</p>
              <p className="text-sm text-gray-600">2 minutes ago</p>
            </div>
            <span className="font-semibold text-green-600">$45.00</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Sale #1233</p>
              <p className="text-sm text-gray-600">15 minutes ago</p>
            </div>
            <span className="font-semibold text-green-600">$89.50</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900">Sale #1232</p>
              <p className="text-sm text-gray-600">1 hour ago</p>
            </div>
            <span className="font-semibold text-green-600">$156.00</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button className="p-4 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition-colors">
            <div className="text-blue-600 text-2xl mb-2">🛒</div>
            <div className="font-medium text-gray-900">New Sale</div>
          </button>

          <button className="p-4 bg-green-50 rounded-lg text-center hover:bg-green-100 transition-colors">
            <div className="text-green-600 text-2xl mb-2">📦</div>
            <div className="font-medium text-gray-900">Inventory</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileDashboard;
