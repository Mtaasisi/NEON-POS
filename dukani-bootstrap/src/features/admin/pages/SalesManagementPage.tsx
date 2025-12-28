// Sales Management Page - For creating deliveries from existing sales
import React, { useState, useEffect } from 'react';
import { Truck, Search, RefreshCw, Plus, Eye } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { deliveryService } from '../../../services/deliveryService';
import toast from 'react-hot-toast';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';

interface Sale {
  id: string;
  sale_number: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  created_at: string;
  items_count: number;
  has_delivery: boolean;
}

const SalesManagementPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDelivery, setShowCreateDelivery] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Load sales data
  const loadSales = async () => {
    try {
      setLoading(true);

      // Get sales with delivery status
      const { data: salesData, error } = await supabase
        .from('lats_sales')
        .select(`
          id,
          sale_number,
          customer_name,
          customer_phone,
          total,
          created_at,
          lats_sale_items (count),
          lats_delivery_orders!inner(id)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error loading sales:', error);
        toast.error('Failed to load sales');
        return;
      }

      // Transform data and check for existing deliveries
      const transformedSales: Sale[] = salesData.map((sale: any) => ({
        id: sale.id,
        sale_number: sale.sale_number || `SALE-${sale.id.slice(-8)}`,
        customer_name: sale.customer_name || 'Walk-in Customer',
        customer_phone: sale.customer_phone || '',
        total: sale.total || 0,
        created_at: sale.created_at,
        items_count: sale.lats_sale_items?.length || 0,
        has_delivery: (sale.lats_delivery_orders?.length || 0) > 0
      }));

      setSales(transformedSales);
    } catch (error) {
      console.error('Error loading sales:', error);
      toast.error('Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  // Filter sales based on search
  const filteredSales = sales.filter(sale =>
    sale.sale_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle creating delivery from sale
  const handleCreateDelivery = async (sale: Sale) => {
    try {
      // Simple delivery creation with default values
      const deliveryData = {
        deliveryMethod: 'boda',
        deliveryAddress: `${sale.customer_name}'s location`,
        deliveryPhone: sale.customer_phone || '',
        deliveryTime: 'ASAP',
        deliveryNotes: `Delivery for ${sale.sale_number}`,
        deliveryFee: 2000
      };

      const result = await deliveryService.createFromSale(sale.id, deliveryData);

      if (result.success) {
        toast.success('Delivery created successfully!');
        loadSales(); // Refresh to show delivery status
      } else {
        toast.error('Failed to create delivery: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating delivery:', error);
      toast.error('Failed to create delivery');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sales Management</h1>
        <p className="text-gray-600">Manage sales and create deliveries</p>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search sales by number or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <GlassButton
          onClick={loadSales}
          variant="secondary"
          className="flex items-center gap-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </GlassButton>
      </div>

      {/* Sales List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="animate-spin h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">Loading sales...</p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No sales found</p>
          </div>
        ) : (
          filteredSales.map((sale) => (
            <GlassCard key={sale.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{sale.sale_number}</h3>
                      <p className="text-sm text-gray-600">{sale.customer_name}</p>
                      <p className="text-xs text-gray-500">
                        {sale.items_count} items • {new Date(sale.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    {sale.has_delivery && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        <Truck size={12} />
                        Has Delivery
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      TZS {sale.total.toLocaleString()}
                    </p>
                  </div>

                  {!sale.has_delivery && (
                    <GlassButton
                      onClick={() => handleCreateDelivery(sale)}
                      variant="primary"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Truck size={14} />
                      Create Delivery
                    </GlassButton>
                  )}

                  {sale.has_delivery && (
                    <div className="text-sm text-green-600 font-medium">
                      Delivery Created
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
};

export default SalesManagementPage;