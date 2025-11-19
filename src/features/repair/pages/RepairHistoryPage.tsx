import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevices } from '../../../context/DevicesContext';
import { useAuth } from '../../../context/AuthContext';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import SearchBar from '../../shared/components/ui/SearchBar';
import GlassSelect from '../../shared/components/ui/GlassSelect';
import { BackButton } from '../../shared/components/ui/BackButton';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import {
  History, Search, Download, FileText, Eye, Filter,
  Calendar, User, Smartphone, DollarSign, Clock,
  CheckCircle, XCircle, AlertTriangle, Wrench, Package,
  BarChart3, TrendingUp, Star, MessageSquare
} from 'lucide-react';
import { Device, DeviceStatus } from '../../../types';
import { formatCurrency } from '../../../lib/customerApi';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from 'react-hot-toast';

interface RepairHistory {
  id: string;
  deviceId: string;
  device: Device;
  technicianId: string;
  technicianName: string;
  startDate: string;
  endDate?: string;
  totalCost: number;
  laborCost: number;
  partsCost: number;
  status: 'completed' | 'failed' | 'cancelled';
  customerRating?: number;
  customerFeedback?: string;
  repairNotes: string[];
  partsUsed: RepairPart[];
  timeline: RepairEvent[];
  warrantyPeriod?: number;
  nextServiceDate?: string;
}

interface RepairPart {
  id: string;
  name: string;
  partNumber: string;
  quantity: number;
  costPerUnit: number;
  totalCost: number;
  supplier: string;
}

interface RepairEvent {
  id: string;
  timestamp: string;
  eventType: 'status_change' | 'part_added' | 'note_added' | 'test_performed' | 'payment_received';
  description: string;
  technicianId: string;
  technicianName: string;
  details?: any;
}

const RepairHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { startLoading, completeLoading, failLoading } = useLoadingJob();

  const [repairHistory, setRepairHistory] = useState<RepairHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [technicianFilter, setTechnicianFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedRepair, setSelectedRepair] = useState<RepairHistory | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Safely access devices context
  let devices: Device[] = [];
  try {
    const devicesContext = useDevices();
    devices = devicesContext?.devices || [];
  } catch (error) {
    console.warn('Devices context not available:', error);
  }

  // Load repair history
  useEffect(() => {
    loadRepairHistory();
  }, []);

  const loadRepairHistory = async () => {
    setLoading(true);
    try {
      // Get all completed/failed devices
      const completedDevices = devices.filter(d =>
        ['done', 'failed'].includes(d.status)
      );

      // Load additional repair data from database
      const repairHistoryData: RepairHistory[] = await Promise.all(
        completedDevices.map(async (device) => {
          // Load repair parts
          const { data: partsData } = await supabase
            .from('repair_parts')
            .select(`
              *,
              spare_part:spare_parts(name, part_number, selling_price)
            `)
            .eq('device_id', device.id);

          // Load technician info
          const technician = device.assignedTo ?
            await getTechnicianInfo(device.assignedTo) :
            { name: 'Unassigned', id: '' };

          // Calculate costs
          const partsCost = (partsData || []).reduce((sum, part) => sum + (part.total_cost || 0), 0);
          const laborCost = parseFloat(device.repairCost || '0') - partsCost;
          const totalCost = parseFloat(device.repairCost || '0') || 0;

          // Get repair notes from transitions
          const repairNotes = (device.transitions || [])
            .filter(t => t.notes)
            .map(t => t.notes);

          // Create timeline from transitions
          const timeline: RepairEvent[] = (device.transitions || []).map(transition => ({
            id: `transition-${transition.timestamp}`,
            timestamp: transition.timestamp,
            eventType: 'status_change',
            description: `Status changed to ${transition.toStatus}`,
            technicianId: technician.id,
            technicianName: technician.name,
            details: transition.notes
          }));

          return {
            id: `repair-${device.id}`,
            deviceId: device.id,
            device,
            technicianId: technician.id,
            technicianName: technician.name,
            startDate: device.createdAt,
            endDate: device.updatedAt,
            totalCost,
            laborCost: Math.max(0, laborCost),
            partsCost,
            status: device.status === 'done' ? 'completed' :
                   device.status === 'failed' ? 'failed' : 'cancelled',
            repairNotes,
            partsUsed: (partsData || []).map(part => ({
              id: part.id,
              name: part.spare_part?.name || 'Unknown Part',
              partNumber: part.spare_part?.part_number || '',
              quantity: part.quantity || 1,
              costPerUnit: part.cost_per_unit || 0,
              totalCost: part.total_cost || 0,
              supplier: part.supplier || 'Unknown'
            })),
            timeline
          };
        })
      );

      setRepairHistory(repairHistoryData);
    } catch (error) {
      console.error('Error loading repair history:', error);
      toast.error('Failed to load repair history');
    } finally {
      setLoading(false);
    }
  };

  const getTechnicianInfo = async (technicianId: string) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('id', technicianId)
        .single();

      return {
        id: technicianId,
        name: data?.full_name || data?.email || 'Unknown'
      };
    } catch {
      return { id: technicianId, name: 'Unknown' };
    }
  };

  // Filter repair history
  const filteredHistory = useMemo(() => {
    return repairHistory.filter(repair => {
      const matchesSearch =
        repair.device.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repair.device.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repair.device.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repair.device.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repair.technicianName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || repair.status === statusFilter;
      const matchesTechnician = technicianFilter === 'all' || repair.technicianId === technicianFilter;

      let matchesDate = true;
      if (dateFilter !== 'all') {
        const repairDate = new Date(repair.endDate || repair.startDate);
        const now = new Date();
        switch (dateFilter) {
          case 'today':
            matchesDate = repairDate.toDateString() === now.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = repairDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = repairDate >= monthAgo;
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesTechnician && matchesDate;
    });
  }, [repairHistory, searchQuery, statusFilter, technicianFilter, dateFilter]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalRepairs = filteredHistory.length;
    const totalRevenue = filteredHistory.reduce((sum, repair) => sum + repair.totalCost, 0);
    const averageRepairTime = filteredHistory.length > 0 ?
      filteredHistory.reduce((sum, repair) => {
        if (repair.startDate && repair.endDate) {
          const start = new Date(repair.startDate);
          const end = new Date(repair.endDate);
          return sum + (end.getTime() - start.getTime());
        }
        return sum;
      }, 0) / filteredHistory.length / (1000 * 60 * 60) : 0; // hours

    const successRate = filteredHistory.length > 0 ?
      (filteredHistory.filter(r => r.status === 'completed').length / filteredHistory.length) * 100 : 0;

    const averageRating = filteredHistory
      .filter(r => r.customerRating)
      .reduce((sum, r) => sum + (r.customerRating || 0), 0) /
      filteredHistory.filter(r => r.customerRating).length || 0;

    return {
      totalRepairs,
      totalRevenue,
      averageRepairTime: Math.round(averageRepairTime),
      successRate: Math.round(successRate),
      averageRating: Math.round(averageRating * 10) / 10
    };
  }, [filteredHistory]);

  // Export repair history
  const exportHistory = () => {
    const data = filteredHistory.map(repair => ({
      customerName: repair.device.customerName,
      device: `${repair.device.brand} ${repair.device.model}`,
      serialNumber: repair.device.serialNumber,
      technician: repair.technicianName,
      startDate: repair.startDate,
      endDate: repair.endDate,
      status: repair.status,
      totalCost: repair.totalCost,
      laborCost: repair.laborCost,
      partsCost: repair.partsCost,
      partsUsed: repair.partsUsed.map(p => `${p.name} (${p.quantity}x)`).join(', ')
    }));

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repair-history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Repair history exported successfully');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      case 'cancelled': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading repair history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold">Repair History</h1>
            <p className="text-gray-600">Complete repair documentation and tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <GlassButton
            onClick={exportHistory}
            variant="outline"
            icon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </GlassButton>
          <GlassButton
            onClick={() => navigate('/repair/analytics')}
            variant="outline"
            icon={<BarChart3 className="w-4 h-4" />}
          >
            Analytics
          </GlassButton>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Repairs</p>
              <p className="text-2xl font-bold text-blue-600">{summaryStats.totalRepairs}</p>
            </div>
            <History className="w-8 h-8 text-blue-500" />
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(summaryStats.totalRevenue)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-purple-600">{summaryStats.successRate}%</p>
            </div>
            <CheckCircle className="w-8 h-8 text-purple-500" />
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Repair Time</p>
              <p className="text-2xl font-bold text-orange-600">{summaryStats.averageRepairTime}h</p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Customer Rating</p>
              <p className="text-2xl font-bold text-yellow-600">
                {summaryStats.averageRating > 0 ? `${summaryStats.averageRating}⭐` : 'N/A'}
              </p>
            </div>
            <Star className="w-8 h-8 text-yellow-500" />
          </div>
        </GlassCard>
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search repairs..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <GlassSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </GlassSelect>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Technician</label>
            <GlassSelect value={technicianFilter} onChange={(e) => setTechnicianFilter(e.target.value)}>
              <option value="all">All Technicians</option>
              {Array.from(new Set(repairHistory.map(r => r.technicianId)))
                .filter(id => id)
                .map(id => {
                  const repair = repairHistory.find(r => r.technicianId === id);
                  return (
                    <option key={id} value={id}>{repair?.technicianName}</option>
                  );
                })}
            </GlassSelect>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Time Period</label>
            <GlassSelect value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </GlassSelect>
          </div>
        </div>
      </GlassCard>

      {/* Repair History List */}
      <div className="space-y-4">
        {filteredHistory.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No repair history found</h3>
            <p className="text-gray-600">
              {repairHistory.length === 0
                ? 'No completed repairs yet.'
                : 'Try adjusting your search filters.'
              }
            </p>
          </GlassCard>
        ) : (
          filteredHistory.map((repair) => (
            <GlassCard key={repair.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-gray-400" />
                      <span className="font-medium">
                        {repair.device.brand} {repair.device.model}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">•</span>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{repair.device.customerName}</span>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(repair.status)}`}>
                      {getStatusIcon(repair.status)}
                      {repair.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                    <div>
                      <span className="font-medium">Serial:</span> {repair.device.serialNumber}
                    </div>
                    <div>
                      <span className="font-medium">Technician:</span> {repair.technicianName}
                    </div>
                    <div>
                      <span className="font-medium">Started:</span> {new Date(repair.startDate).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Completed:</span> {repair.endDate ? new Date(repair.endDate).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="font-medium">{formatCurrency(repair.totalCost)}</span>
                      <span className="text-gray-500">(Labor: {formatCurrency(repair.laborCost)}, Parts: {formatCurrency(repair.partsCost)})</span>
                    </div>
                    {repair.partsUsed.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Package className="w-4 h-4 text-blue-500" />
                        <span>{repair.partsUsed.length} parts used</span>
                      </div>
                    )}
                  </div>

                  {repair.repairNotes.length > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">Repair Notes:</span>
                      </div>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {repair.repairNotes.slice(0, 2).map((note, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-gray-400 mt-1">•</span>
                            <span>{note}</span>
                          </li>
                        ))}
                        {repair.repairNotes.length > 2 && (
                          <li className="text-gray-500">...and {repair.repairNotes.length - 2} more notes</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <GlassButton
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRepair(repair);
                      setShowDetailModal(true);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Details
                  </GlassButton>
                  <GlassButton
                    variant="outline"
                    size="sm"
                    onClick={() => {/* Generate PDF report */}}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Report
                  </GlassButton>
                </div>
              </div>
            </GlassCard>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRepair && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Repair Details</h2>
                  <p className="text-blue-100">
                    {selectedRepair.device.brand} {selectedRepair.device.model} - {selectedRepair.device.serialNumber}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hover:bg-opacity-30"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[calc(90vh-100px)] overflow-y-auto">
              {/* Repair Timeline */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Repair Timeline</h3>
                <div className="space-y-3">
                  {selectedRepair.timeline.map((event, index) => (
                    <div key={event.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{event.description}</span>
                          <span className="text-sm text-gray-500">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          by {event.technicianName}
                        </div>
                        {event.details && (
                          <div className="text-sm text-gray-500 mt-1">{event.details}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Parts Used */}
              {selectedRepair.partsUsed.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Parts Used</h3>
                  <div className="space-y-2">
                    {selectedRepair.partsUsed.map((part) => (
                      <div key={part.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{part.name}</div>
                          <div className="text-sm text-gray-600">
                            Part #: {part.partNumber} • Supplier: {part.supplier}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{part.quantity}x {formatCurrency(part.costPerUnit)}</div>
                          <div className="text-sm text-gray-500">Total: {formatCurrency(part.totalCost)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cost Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(selectedRepair.laborCost)}</div>
                  <div className="text-sm text-gray-600">Labor Cost</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(selectedRepair.partsCost)}</div>
                  <div className="text-sm text-gray-600">Parts Cost</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{formatCurrency(selectedRepair.totalCost)}</div>
                  <div className="text-sm text-gray-600">Total Cost</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepairHistoryPage;
