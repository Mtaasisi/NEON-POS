import React, { useState, useEffect } from 'react';
import { 
  Download, 
  FileText, 
  Calendar,
  DollarSign,
  Package,
  TrendingUp,
  BarChart3,
  Printer,
  Mail
} from 'lucide-react';
import GlassCard from '../../../shared/components/ui/GlassCard';
import GlassButton from '../../../shared/components/ui/GlassButton';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../../lib/supabaseClient';

interface ReceivedItemsReportProps {
  purchaseOrderId: string;
  purchaseOrderNumber: string;
}

interface ReportData {
  totalItems: number;
  totalCost: number;
  totalValue: number;
  avgCostPerItem: number;
  itemsByStatus: {
    available: number;
    sold: number;
    damaged: number;
    reserved: number;
  };
  warrantyInfo: {
    withWarranty: number;
    withoutWarranty: number;
    avgWarrantyMonths: number;
  };
  items: Array<{
    serial_number: string;
    product_name: string;
    variant_name?: string;
    cost_price: number;
    selling_price?: number;
    status: string;
    warranty_start?: string;
    warranty_end?: string;
    location?: string;
    received_date: string;
  }>;
}

const ReceivedItemsReport: React.FC<ReceivedItemsReportProps> = ({
  purchaseOrderId,
  purchaseOrderNumber
}) => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateReport();
  }, [purchaseOrderId]);

  const generateReport = async () => {
    try {
      setLoading(true);

      // Fetch inventory items with product details
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          product!product_id (name),
          variant!variant_id (name)
        `)
        .contains('metadata', { purchase_order_id: purchaseOrderId });

      if (error) {
        console.error('Error fetching items:', error);
        toast.error('Failed to generate report');
        return;
      }

      if (!items || items.length === 0) {
        setReportData(null);
        return;
      }

      // Calculate statistics
      const totalItems = items.length;
      const totalCost = items.reduce((sum, item) => sum + (item.cost_price || 0), 0);
      const totalValue = items.reduce((sum, item) => sum + (item.selling_price || item.cost_price || 0), 0);
      const avgCostPerItem = totalCost / totalItems;

      // Count by status
      const itemsByStatus = {
        available: items.filter(i => i.status === 'available').length,
        sold: items.filter(i => i.status === 'sold').length,
        damaged: items.filter(i => i.status === 'damaged').length,
        reserved: items.filter(i => i.status === 'reserved').length
      };

      // Warranty info
      const withWarranty = items.filter(i => i.warranty_start && i.warranty_end).length;
      const warrantyMonths = items
        .filter(i => i.metadata?.warranty_months)
        .map(i => i.metadata.warranty_months);
      const avgWarrantyMonths = warrantyMonths.length > 0 
        ? warrantyMonths.reduce((sum, m) => sum + m, 0) / warrantyMonths.length 
        : 0;

      // Format items for table
      const formattedItems = items.map(item => ({
        serial_number: item.serial_number,
        product_name: item.product?.name || 'Unknown',
        variant_name: item.variant?.name,
        cost_price: item.cost_price || 0,
        selling_price: item.selling_price,
        status: item.status,
        warranty_start: item.warranty_start,
        warranty_end: item.warranty_end,
        location: item.location,
        received_date: item.metadata?.received_at || item.created_at
      }));

      setReportData({
        totalItems,
        totalCost,
        totalValue,
        avgCostPerItem,
        itemsByStatus,
        warrantyInfo: {
          withWarranty,
          withoutWarranty: totalItems - withWarranty,
          avgWarrantyMonths
        },
        items: formattedItems
      });

    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData) return;

    const headers = [
      'Serial Number',
      'Product',
      'Variant',
      'Cost Price',
      'Selling Price',
      'Status',
      'Warranty Start',
      'Warranty End',
      'Location',
      'Received Date'
    ];

    const rows = reportData.items.map(item => [
      item.serial_number,
      item.product_name,
      item.variant_name || '',
      item.cost_price.toFixed(2),
      item.selling_price?.toFixed(2) || '',
      item.status,
      item.warranty_start || '',
      item.warranty_end || '',
      item.location || '',
      new Date(item.received_date).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `received-items-${purchaseOrderNumber}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Report exported to CSV');
  };

  const printReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <GlassCard className="p-8 text-center">
        <p className="text-gray-600">Generating report...</p>
      </GlassCard>
    );
  }

  if (!reportData) {
    return (
      <GlassCard className="p-8 text-center">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No received items to report</p>
      </GlassCard>
    );
  }

  const profitMargin = reportData.totalValue - reportData.totalCost;
  const profitPercentage = (profitMargin / reportData.totalCost) * 100;

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-end gap-3">
        <GlassButton
          variant="outline"
          onClick={printReport}
        >
          <Printer className="w-4 h-4 mr-2" />
          Print
        </GlassButton>
        <GlassButton
          onClick={exportToCSV}
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </GlassButton>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.totalItems}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold text-gray-900">${reportData.totalCost.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Avg: ${reportData.avgCostPerItem.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Estimated Value</p>
              <p className="text-2xl font-bold text-gray-900">${reportData.totalValue.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Profit: ${profitMargin.toFixed(2)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Profit Margin</p>
              <p className="text-2xl font-bold text-gray-900">{profitPercentage.toFixed(1)}%</p>
              <p className="text-xs text-gray-500">${profitMargin.toFixed(2)}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-yellow-600" />
          </div>
        </GlassCard>
      </div>

      {/* Status Breakdown */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{reportData.itemsByStatus.available}</p>
            <p className="text-sm text-gray-600 mt-1">Available</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{reportData.itemsByStatus.reserved}</p>
            <p className="text-sm text-gray-600 mt-1">Reserved</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-3xl font-bold text-purple-600">{reportData.itemsByStatus.sold}</p>
            <p className="text-sm text-gray-600 mt-1">Sold</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-3xl font-bold text-red-600">{reportData.itemsByStatus.damaged}</p>
            <p className="text-sm text-gray-600 mt-1">Damaged</p>
          </div>
        </div>
      </GlassCard>

      {/* Warranty Info */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Warranty Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{reportData.warrantyInfo.withWarranty}</p>
            <p className="text-sm text-gray-600 mt-1">With Warranty</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-3xl font-bold text-gray-600">{reportData.warrantyInfo.withoutWarranty}</p>
            <p className="text-sm text-gray-600 mt-1">Without Warranty</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-3xl font-bold text-purple-600">{reportData.warrantyInfo.avgWarrantyMonths.toFixed(0)}</p>
            <p className="text-sm text-gray-600 mt-1">Avg. Warranty (months)</p>
          </div>
        </div>
      </GlassCard>

      {/* Items Table */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-semibold text-gray-700">Serial Number</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-700">Product</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700">Cost</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700">Sell Price</th>
                <th className="text-center py-3 px-2 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-700">Warranty</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-700">Location</th>
              </tr>
            </thead>
            <tbody>
              {reportData.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium">{item.serial_number}</td>
                  <td className="py-3 px-2">
                    {item.product_name}
                    {item.variant_name && (
                      <span className="text-gray-500 text-xs block">{item.variant_name}</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-right">${item.cost_price.toFixed(2)}</td>
                  <td className="py-3 px-2 text-right">
                    {item.selling_price ? `$${item.selling_price.toFixed(2)}` : '-'}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === 'available' ? 'bg-green-100 text-green-700' :
                      item.status === 'sold' ? 'bg-purple-100 text-purple-700' :
                      item.status === 'damaged' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-xs">
                    {item.warranty_start && item.warranty_end ? (
                      <>
                        {new Date(item.warranty_start).toLocaleDateString()} -<br />
                        {new Date(item.warranty_end).toLocaleDateString()}
                      </>
                    ) : (
                      <span className="text-gray-400">No warranty</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-xs text-gray-600">{item.location || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Report Footer */}
      <GlassCard className="p-4">
        <div className="text-sm text-gray-600 text-center">
          Report generated on {new Date().toLocaleString()} for Purchase Order {purchaseOrderNumber}
        </div>
      </GlassCard>
    </div>
  );
};

export default ReceivedItemsReport;

