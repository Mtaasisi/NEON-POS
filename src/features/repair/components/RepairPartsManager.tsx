import React, { useState, useEffect, useMemo } from 'react';
import { Device } from '../../../types';
import { useInventoryStore } from '../../lats/stores/useInventoryStore';
import { SparePart } from '../../lats/types/spareParts';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import GlassInput from '../../shared/components/ui/GlassInput';
import GlassSelect from '../../shared/components/ui/GlassSelect';
import SparePartsSelector from './SparePartsSelector';
import {
  Package, Plus, Minus, Trash2, AlertTriangle, CheckCircle,
  DollarSign, Hash, Search, Filter, Wrench, Clock, Truck
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';
import { formatCurrency } from '../../../lib/customerApi';

interface RepairPart {
  id: string;
  deviceId: string;
  sparePartId: string;
  quantity: number;
  status: 'ordered' | 'shipped' | 'received' | 'installed' | 'returned';
  costPerUnit: number;
  totalCost: number;
  notes?: string;
  orderedAt?: string;
  receivedAt?: string;
  installedAt?: string;
  supplier?: string;
  estimatedArrival?: string;
  createdAt: string;
  updatedAt: string;
}

interface RepairPartsManagerProps {
  device: Device;
  onPartsUpdate: (parts: RepairPart[]) => void;
  isReadOnly?: boolean;
}

const RepairPartsManager: React.FC<RepairPartsManagerProps> = ({
  device,
  onPartsUpdate,
  isReadOnly = false
}) => {
  const [repairParts, setRepairParts] = useState<RepairPart[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPartsSelector, setShowPartsSelector] = useState(false);
  const [editingPart, setEditingPart] = useState<RepairPart | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { spareParts, loadSpareParts } = useInventoryStore();

  // Load repair parts for this device
  useEffect(() => {
    loadRepairParts();
    loadSpareParts();
  }, [device.id]);

  const loadRepairParts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('repair_parts')
        .select(`
          *,
          spare_part:spare_parts(name, part_number, selling_price, quantity)
        `)
        .eq('device_id', device.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedParts: RepairPart[] = data.map(item => ({
        id: item.id,
        deviceId: item.device_id,
        sparePartId: item.spare_part_id,
        quantity: item.quantity,
        status: item.status,
        costPerUnit: item.cost_per_unit,
        totalCost: item.total_cost,
        notes: item.notes,
        orderedAt: item.ordered_at,
        receivedAt: item.received_at,
        installedAt: item.installed_at,
        supplier: item.supplier,
        estimatedArrival: item.estimated_arrival,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));

      setRepairParts(formattedParts);
      onPartsUpdate(formattedParts);
    } catch (error) {
      console.error('Error loading repair parts:', error);
      toast.error('Failed to load repair parts');
    } finally {
      setLoading(false);
    }
  };

  // Handle adding parts from selector
  const handlePartsSelected = async (selectedParts: any[]) => {
    try {
      const partsToInsert = selectedParts.map(part => ({
        device_id: device.id,
        spare_part_id: part.spare_part_id,
        quantity: part.quantity,
        status: 'ordered',
        cost_per_unit: part.cost_per_unit,
        total_cost: part.total_cost,
        notes: part.notes || '',
        supplier: 'Auto-selected',
        estimated_arrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days
      }));

      const { data, error } = await supabase
        .from('repair_parts')
        .insert(partsToInsert)
        .select();

      if (error) throw error;

      toast.success('Parts added to repair order');
      loadRepairParts();
      setShowPartsSelector(false);
    } catch (error) {
      console.error('Error adding parts:', error);
      toast.error('Failed to add parts');
    }
  };

  // Update part status
  const handleStatusUpdate = async (partId: string, newStatus: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Set timestamp based on status
      switch (newStatus) {
        case 'received':
          updateData.received_at = new Date().toISOString();
          break;
        case 'installed':
          updateData.installed_at = new Date().toISOString();
          break;
      }

      const { error } = await supabase
        .from('repair_parts')
        .update(updateData)
        .eq('id', partId);

      if (error) throw error;

      toast.success(`Part status updated to ${newStatus}`);
      loadRepairParts();
    } catch (error) {
      console.error('Error updating part status:', error);
      toast.error('Failed to update part status');
    }
  };

  // Remove part
  const handleRemovePart = async (partId: string) => {
    if (!confirm('Are you sure you want to remove this part?')) return;

    try {
      const { error } = await supabase
        .from('repair_parts')
        .delete()
        .eq('id', partId);

      if (error) throw error;

      toast.success('Part removed from repair');
      loadRepairParts();
    } catch (error) {
      console.error('Error removing part:', error);
      toast.error('Failed to remove part');
    }
  };

  // Update part quantity
  const handleQuantityUpdate = async (partId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      const part = repairParts.find(p => p.id === partId);
      if (!part) return;

      const newTotalCost = newQuantity * part.costPerUnit;

      const { error } = await supabase
        .from('repair_parts')
        .update({
          quantity: newQuantity,
          total_cost: newTotalCost,
          updated_at: new Date().toISOString()
        })
        .eq('id', partId);

      if (error) throw error;

      toast.success('Part quantity updated');
      loadRepairParts();
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity');
    }
  };

  // Filter parts by status
  const filteredParts = useMemo(() => {
    return repairParts.filter(part =>
      statusFilter === 'all' || part.status === statusFilter
    );
  }, [repairParts, statusFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredParts.reduce((acc, part) => ({
      totalParts: acc.totalParts + part.quantity,
      totalCost: acc.totalCost + part.totalCost,
      pendingParts: acc.pendingParts + (part.status === 'ordered' ? part.quantity : 0),
      receivedParts: acc.receivedParts + (part.status === 'received' ? part.quantity : 0),
      installedParts: acc.installedParts + (part.status === 'installed' ? part.quantity : 0)
    }), {
      totalParts: 0,
      totalCost: 0,
      pendingParts: 0,
      receivedParts: 0,
      installedParts: 0
    });
  }, [filteredParts]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ordered': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-yellow-100 text-yellow-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'installed': return 'bg-purple-100 text-purple-800';
      case 'returned': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ordered': return <Package className="w-4 h-4" />;
      case 'shipped': return <Truck className="w-4 h-4" />;
      case 'received': return <CheckCircle className="w-4 h-4" />;
      case 'installed': return <Wrench className="w-4 h-4" />;
      case 'returned': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading repair parts...</span>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Summary */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Repair Parts</h3>
            <p className="text-sm text-gray-600">
              {totals.totalParts} parts • {formatCurrency(totals.totalCost)}
            </p>
          </div>
          {!isReadOnly && (
            <GlassButton
              onClick={() => setShowPartsSelector(true)}
              icon={<Plus className="w-4 h-4" />}
              size="sm"
            >
              Add Parts
            </GlassButton>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">{totals.pendingParts}</div>
            <div className="text-xs text-gray-600">Pending</div>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded-lg">
            <div className="text-lg font-bold text-yellow-600">{totals.receivedParts}</div>
            <div className="text-xs text-gray-600">Received</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">{totals.installedParts}</div>
            <div className="text-xs text-gray-600">Installed</div>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded-lg">
            <div className="text-lg font-bold text-purple-600">{formatCurrency(totals.totalCost)}</div>
            <div className="text-xs text-gray-600">Total Cost</div>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <GlassSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="ordered">Ordered</option>
            <option value="shipped">Shipped</option>
            <option value="received">Received</option>
            <option value="installed">Installed</option>
            <option value="returned">Returned</option>
          </GlassSelect>
        </div>
      </GlassCard>

      {/* Parts List */}
      <div className="space-y-3">
        {filteredParts.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h4 className="font-medium text-gray-900 mb-1">No parts found</h4>
            <p className="text-sm text-gray-600">
              {statusFilter === 'all'
                ? 'No parts have been added to this repair yet.'
                : `No parts with status "${statusFilter}".`
              }
            </p>
            {statusFilter !== 'all' && (
              <GlassButton
                variant="outline"
                size="sm"
                onClick={() => setStatusFilter('all')}
                className="mt-3"
              >
                Show All Parts
              </GlassButton>
            )}
          </GlassCard>
        ) : (
          filteredParts.map((part) => {
            const sparePartInfo = spareParts.find(sp => sp.id === part.sparePartId);
            return (
              <GlassCard key={part.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">
                        {sparePartInfo?.name || 'Unknown Part'}
                      </h4>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(part.status)}`}>
                        {getStatusIcon(part.status)}
                        {part.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Part #:</span> {sparePartInfo?.part_number}
                      </div>
                      <div>
                        <span className="font-medium">Qty:</span> {part.quantity}
                      </div>
                      <div>
                        <span className="font-medium">Cost:</span> {formatCurrency(part.costPerUnit)} each
                      </div>
                      <div>
                        <span className="font-medium">Total:</span> {formatCurrency(part.totalCost)}
                      </div>
                    </div>

                    {part.supplier && (
                      <div className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Supplier:</span> {part.supplier}
                      </div>
                    )}

                    {part.estimatedArrival && (
                      <div className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Est. Arrival:</span> {new Date(part.estimatedArrival).toLocaleDateString()}
                      </div>
                    )}

                    {part.notes && (
                      <div className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                        <span className="font-medium">Notes:</span> {part.notes}
                      </div>
                    )}
                  </div>

                  {!isReadOnly && (
                    <div className="flex items-center gap-2 ml-4">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1">
                        <GlassButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityUpdate(part.id, part.quantity - 1)}
                          disabled={part.quantity <= 1}
                        >
                          <Minus className="w-3 h-3" />
                        </GlassButton>
                        <span className="w-8 text-center text-sm font-medium">{part.quantity}</span>
                        <GlassButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityUpdate(part.id, part.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </GlassButton>
                      </div>

                      {/* Status Actions */}
                      <div className="flex flex-col gap-1">
                        {part.status === 'ordered' && (
                          <GlassButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusUpdate(part.id, 'shipped')}
                            className="text-xs"
                          >
                            Mark Shipped
                          </GlassButton>
                        )}
                        {part.status === 'shipped' && (
                          <GlassButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusUpdate(part.id, 'received')}
                            className="text-xs"
                          >
                            Mark Received
                          </GlassButton>
                        )}
                        {part.status === 'received' && (
                          <GlassButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusUpdate(part.id, 'installed')}
                            className="text-xs"
                          >
                            Mark Installed
                          </GlassButton>
                        )}
                      </div>

                      {/* Remove */}
                      <GlassButton
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemovePart(part.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </GlassButton>
                    </div>
                  )}
                </div>
              </GlassCard>
            );
          })
        )}
      </div>

      {/* Parts Selector Modal */}
      {showPartsSelector && (
        <SparePartsSelector
          device={device}
          onPartsSelected={handlePartsSelected}
          onClose={() => setShowPartsSelector(false)}
          isOpen={showPartsSelector}
        />
      )}
    </div>
  );
};

export default RepairPartsManager;
