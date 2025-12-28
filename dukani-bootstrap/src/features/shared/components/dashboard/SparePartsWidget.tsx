import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Plus, ExternalLink, AlertTriangle, Package } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';
import Modal from '../../../shared/components/ui/Modal';
import toast from 'react-hot-toast';

interface SparePartsWidgetProps {
  className?: string;
}

interface SparePartsMetrics {
  totalParts: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
  categories: number;
  recentUsage: number;
}

export const SparePartsWidget: React.FC<SparePartsWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<SparePartsMetrics>({
    totalParts: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0,
    categories: 0,
    recentUsage: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLowStockModal, setShowLowStockModal] = useState(false);

  useEffect(() => {
    loadSparePartsData();
  }, []);

  const loadSparePartsData = async () => {
    try {
      setIsLoading(true);
      const currentBranchId = getCurrentBranchId();
      
      // Note: lats_spare_parts table does not have branch_id column
      // All spare parts are shared across branches
      let query = supabase
        .from('lats_spare_parts')
        .select('id, quantity, min_quantity, selling_price, cost_price, category_id');

      const { data: parts, error } = await query;

      // Handle missing table or column gracefully
      if (error) {
        if (error.code === '42P01' || error.code === '42703') {
          // Table or column doesn't exist - show empty state
          setMetrics({
            totalParts: 0,
            lowStock: 0,
            outOfStock: 0,
            totalValue: 0,
            categories: 0,
            recentUsage: 0
          });
          setIsLoading(false);
          return;
        }
        throw error;
      }

      const total = parts?.length || 0;
      const lowStock = parts?.filter(p => (p.quantity || 0) > 0 && (p.quantity || 0) <= (p.min_quantity || 0)).length || 0;
      const outOfStock = parts?.filter(p => (p.quantity || 0) === 0).length || 0;
      // Calculate total value using selling_price or cost_price as fallback
      const totalValue = parts?.reduce((sum, p) => {
        const price = p.selling_price || p.cost_price || 0;
        return sum + ((p.quantity || 0) * price);
      }, 0) || 0;
      const categories = new Set(parts?.map(p => p.category_id).filter(Boolean)).size;

      // Get recent usage (from stock movements or usage logs)
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      let usageQuery = supabase
        .from('lats_stock_movements')
        .select('id')
        .eq('movement_type', 'out')
        .gte('created_at', lastWeek.toISOString());

      if (currentBranchId) {
        usageQuery = usageQuery.eq('branch_id', currentBranchId);
      }

      const { data: movements } = await usageQuery;
      const recentUsage = movements?.length || 0;

      setMetrics({
        totalParts: total,
        lowStock,
        outOfStock,
        totalValue,
        categories,
        recentUsage
      });
    } catch (error) {
      console.error('Error loading spare parts data:', error);
      setMetrics({
        totalParts: 0,
        lowStock: 0,
        outOfStock: 0,
        totalValue: 0,
        categories: 0,
        recentUsage: 0
      });
    } finally {
      setIsLoading(false);
    }
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
    <div className={`bg-white rounded-2xl p-7 flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Spare Parts</h3>
            <p className="text-xs text-gray-400 mt-0.5">Inventory overview</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/spare-parts')}
          className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
        >
          <ExternalLink size={14} />
          <span>View All</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Total Parts</p>
          <p className="text-2xl font-semibold text-gray-900">{metrics.totalParts}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Categories</p>
          <p className="text-2xl font-semibold text-blue-600">{metrics.categories}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Low Stock</p>
          <p className="text-xl font-semibold text-amber-600">{metrics.lowStock}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Out of Stock</p>
          <p className="text-xl font-semibold text-rose-600">{metrics.outOfStock}</p>
        </div>
      </div>

      {/* Value & Usage */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">Total Value</span>
          </div>
          <span className="text-sm font-medium text-gray-900">{metrics.totalValue.toLocaleString()} TZS</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-50">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-500">Recent Usage (7d)</span>
          </div>
          <span className="text-sm font-medium text-blue-700">{metrics.recentUsage}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto pt-4 border-t">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowAddModal(true);
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 hover:scale-110 shadow-sm hover:shadow-md transition-all duration-200"
          title="Add Part"
        >
          <Plus size={18} />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowLowStockModal(true);
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-black hover:scale-105 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <AlertTriangle size={14} />
          <span>Low Stock</span>
        </button>
      </div>

      {/* Add Part Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Spare Part" maxWidth="md">
        <div className="p-4">
          <p className="text-gray-600">Spare part creation form will be implemented here.</p>
          <button
            onClick={() => {
              toast.success('Feature coming soon');
              setShowAddModal(false);
            }}
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black"
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Low Stock Modal */}
      <Modal isOpen={showLowStockModal} onClose={() => setShowLowStockModal(false)} title="Low Stock Parts" maxWidth="lg">
        <div className="p-4">
          <p className="text-gray-600">Low stock parts will be listed here.</p>
          <button
            onClick={() => setShowLowStockModal(false)}
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

