import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, AlertTriangle, TrendingDown, Plus, ExternalLink } from 'lucide-react';
import { dashboardService, InventoryAlert } from '../../../../services/dashboardService';
import { useAuth } from '../../../../context/AuthContext';
import AddProductModal from '../../../lats/components/product/AddProductModal';

interface InventoryWidgetProps {
  className?: string;
}

export const InventoryWidget: React.FC<InventoryWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [stats, setStats] = useState({
    lowStock: 0,
    critical: 0,
    total: 0,
    value: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = async () => {
    try {
      setIsLoading(true);
      const [inventoryAlerts, dashboardStats] = await Promise.all([
        dashboardService.getInventoryAlerts(4),
        dashboardService.getDashboardStats(currentUser?.id || '')
      ]);
      
      console.log('📦 Inventory Value:', {
        raw: dashboardStats.inventoryValue,
        type: typeof dashboardStats.inventoryValue,
        asString: String(dashboardStats.inventoryValue)
      });
      
      setAlerts(inventoryAlerts);
      setStats({
        lowStock: dashboardStats.lowStockItems,
        critical: dashboardStats.criticalStockAlerts,
        total: dashboardStats.totalProducts,
        value: dashboardStats.inventoryValue
      });
    } catch (error) {
      console.error('Error loading inventory data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAlertColor = (alertLevel: string) => {
    switch (alertLevel) {
      case 'out-of-stock': return 'text-red-600 bg-red-100 border-red-200';
      case 'critical': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'low': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getAlertIcon = (alertLevel: string) => {
    switch (alertLevel) {
      case 'out-of-stock': return <AlertTriangle size={12} className="text-red-600" />;
      case 'critical': return <TrendingDown size={12} className="text-orange-600" />;
      default: return <Package size={12} className="text-yellow-600" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatLargeNumber = (num: number) => {
    // Handle invalid values
    if (!num || isNaN(num) || num < 0) {
      return 'TSh 0';
    }
    
    // Convert to proper number if it's a string
    const value = typeof num === 'string' ? parseFloat(num) : num;
    
    if (value >= 1000000000) {
      return `TSh ${(value / 1000000000).toFixed(1)}B`;
    }
    if (value >= 1000000) {
      return `TSh ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `TSh ${(value / 1000).toFixed(1)}K`;
    }
    return `TSh ${value.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl p-7 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-75"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl p-7 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Package className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Inventory Status</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {stats.total} products tracked
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/lats/inventory')}
          className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
          title="View All Products"
        >
          <ExternalLink size={14} />
          <span>View All</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Critical</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.critical}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Low Stock</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.lowStock}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Value</p>
          <p className="text-2xl font-semibold text-gray-900">{formatLargeNumber(stats.value)}</p>
        </div>
      </div>

      {/* Inventory Alerts */}
      <div className="space-y-3 max-h-64 overflow-y-auto mb-6 flex-grow">
        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <div key={alert.id} className={`p-3 rounded-lg ${
              alert.alertLevel === 'out-of-stock' ? 'bg-rose-50' :
              alert.alertLevel === 'critical' ? 'bg-amber-50' :
              'bg-gray-50'
            } hover:opacity-80 transition-opacity`}>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {alert.productName}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {alert.category}
                    </span>
                    <span className={`text-xs font-medium ${
                      alert.alertLevel === 'out-of-stock' ? 'text-rose-600' :
                      alert.alertLevel === 'critical' ? 'text-amber-600' :
                      'text-gray-600'
                    }`}>
                      {alert.currentStock}/{alert.minimumStock} units
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">All stock levels normal</p>
          </div>
        )}
      </div>

      {/* Actions - Always at bottom */}
      <div className="flex gap-2 mt-auto pt-6">
        <button
          onClick={() => setShowAddProductModal(true)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-gray-800 transition-colors"
        >
          <Plus size={14} />
          <span>Add Product</span>
        </button>
      </div>

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        onProductCreated={() => {
          setShowAddProductModal(false);
          loadInventoryData();
        }}
      />

    </div>
  );
};
