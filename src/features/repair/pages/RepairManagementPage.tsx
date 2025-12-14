import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevices } from '../../../context/DevicesContext';
import { useAuth } from '../../../context/AuthContext';
import GlassTabs from '../../shared/components/ui/GlassTabs';
import SearchBar from '../../shared/components/ui/SearchBar';
import GlassSelect from '../../shared/components/ui/GlassSelect';
import { BackButton } from '../../shared/components/ui/BackButton';
import StatusBadge from '../../shared/components/ui/StatusBadge';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  DollarSign,
  Package,
  BarChart3,
  Settings,
  Eye,
  Edit,
  Smartphone,
  Timer,
  Target,
  Award
} from 'lucide-react';
import { Device, DeviceStatus } from '../../../types';
import { formatCurrency } from '../../../lib/customerApi';
import { supabase } from '../../../lib/supabaseClient';

interface RepairStats {
  totalDevices: number;
  activeRepairs: number;
  completedToday: number;
  pendingParts: number;
  averageRepairTime: number;
  totalRevenue: number;
  technicianWorkload: { [key: string]: number };
}

interface Technician {
  id: string;
  name: string;
  activeRepairs: number;
  completedToday: number;
  efficiency: number;
}

const RepairManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { startLoading, completeLoading, failLoading } = useLoadingJob();

  // Safely access devices context
  let devices: Device[] = [];
  let loading = false;
  let updateDeviceStatus: any = null;

  try {
    const devicesContext = useDevices();
    devices = devicesContext?.devices || [];
    loading = devicesContext?.loading || false;
    updateDeviceStatus = devicesContext?.updateDeviceStatus || null;
  } catch (error) {
    console.warn('Devices context not available:', error);
  }

  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | 'all'>('all');
  const [technicianFilter, setTechnicianFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [viewMode, setViewMode] = useState<'overview' | 'technicians' | 'analytics'>('overview');
  const [stats, setStats] = useState<RepairStats | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  // 🚀 OPTIMIZED: Batch load technicians and stats with improved performance
  useEffect(() => {
    const loadData = async () => {
      try {
        if (import.meta.env.MODE === 'development') {
          console.log('🔄 [RepairManagement] Starting optimized data load...');
        }

        // Load technicians and device stats in parallel
        const [techResult, deviceStatsResult] = await Promise.all([
          supabase
            .from('users')
            .select('id, full_name, email')
            .eq('role', 'technician'),
          // Batch calculate device statistics
          Promise.resolve().then(() => {
            const totalDevices = devices.length;
            const activeRepairs = devices.filter(d => !['done', 'failed'].includes(d.status)).length;
            const completedToday = devices.filter(d =>
              d.status === 'done' &&
              new Date(d.updatedAt).toDateString() === new Date().toDateString()
            ).length;
            const pendingParts = devices.filter(d => d.status === 'waiting_parts').length;

            return {
              totalDevices,
              activeRepairs,
              completedToday,
              pendingParts,
              averageRepairTime: 0, // Calculate this separately if needed
              totalRevenue: 0, // Calculate from actual repair costs
              technicianWorkload: {}
            };
          })
        ]);

        const { data: techData, error: techError } = techResult;

        if (techError) {
          console.error('❌ Failed to load technicians:', techError);
        }

        if (techData) {
          // 🚀 OPTIMIZED: Calculate technician stats in memory instead of individual queries
          const technicianStats = techData.map((tech) => {
            const activeRepairs = devices.filter(d =>
              d.assignedTo === tech.id &&
              !['done', 'failed'].includes(d.status)
            ).length;

              const completedToday = devices.filter(d =>
                d.assignedTo === tech.id &&
                d.status === 'done' &&
                new Date(d.updatedAt).toDateString() === new Date().toDateString()
              ).length;

              return {
                id: tech.id,
                name: tech.full_name || tech.email,
                activeRepairs,
                completedToday,
                efficiency: calculateTechnicianEfficiency(tech.id)
              };
            })
          );
          setTechnicians(technicianStats);
        }

        // Calculate repair statistics
        const repairStats: RepairStats = {
          totalDevices: devices.length,
          activeRepairs: devices.filter(d => !['done', 'failed'].includes(d.status)).length,
          completedToday: devices.filter(d =>
            d.status === 'done' &&
            new Date(d.updatedAt).toDateString() === new Date().toDateString()
          ).length,
          pendingParts: devices.filter(d => d.status === 'awaiting-parts').length,
          averageRepairTime: calculateAverageRepairTime(),
          totalRevenue: calculateTotalRevenue(),
          technicianWorkload: calculateTechnicianWorkload()
        };

        setStats(repairStats);
      } catch (error) {
        console.error('Error loading repair management data:', error);
      }
    };

    if (!loading) {
      loadData();
    }
  }, [devices, loading]);

  // Helper functions for calculations
  const calculateTechnicianEfficiency = (technicianId: string): number => {
    const techDevices = devices.filter(d => d.assignedTo === technicianId);
    const completed = techDevices.filter(d => d.status === 'done').length;
    const total = techDevices.length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const calculateAverageRepairTime = (): number => {
    const completedDevices = devices.filter(d => d.status === 'done' && d.transitions);
    if (completedDevices.length === 0) return 0;

    const totalTime = completedDevices.reduce((sum, device) => {
      if (device.transitions && device.transitions.length > 0) {
        const startTime = new Date(device.transitions[0].timestamp);
        const endTime = new Date(device.transitions[device.transitions.length - 1].timestamp);
        return sum + (endTime.getTime() - startTime.getTime());
      }
      return sum;
    }, 0);

    return Math.round((totalTime / completedDevices.length) / (1000 * 60 * 60)); // hours
  };

  const calculateTotalRevenue = (): number => {
    return devices
      .filter(d => d.status === 'done')
      .reduce((sum, device) => {
        const repairCost = parseFloat(device.repairCost || '0') || 0;
        return sum + repairCost;
      }, 0);
  };

  const calculateTechnicianWorkload = (): { [key: string]: number } => {
    const workload: { [key: string]: number } = {};
    devices
      .filter(d => !['done', 'failed'].includes(d.status))
      .forEach(device => {
        if (device.assignedTo) {
          workload[device.assignedTo] = (workload[device.assignedTo] || 0) + 1;
        }
      });
    return workload;
  };

  // Filter devices based on search and filters
  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      const matchesSearch =
        device.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.issueDescription.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
      const matchesTechnician = technicianFilter === 'all' || device.assignedTo === technicianFilter;

      let matchesDate = true;
      if (dateFilter !== 'all') {
        const deviceDate = new Date(device.createdAt);
        const today = new Date();
        switch (dateFilter) {
          case 'today':
            matchesDate = deviceDate.toDateString() === today.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = deviceDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = deviceDate >= monthAgo;
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesTechnician && matchesDate;
    });
  }, [devices, searchQuery, statusFilter, technicianFilter, dateFilter]);

  // Status distribution for analytics
  const statusDistribution = useMemo(() => {
    const distribution: { [key in DeviceStatus]: number } = {
      'assigned': 0,
      'diagnosis-started': 0,
      'awaiting-parts': 0,
      'parts-arrived': 0,
      'in-repair': 0,
      'reassembled-testing': 0,
      'repair-complete': 0,
      'returned-to-customer-care': 0,
      'done': 0,
      'failed': 0
    };

    devices.forEach(device => {
      distribution[device.status]++;
    });

    return distribution;
  }, [devices]);

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600">Active Repairs</p>
              <p className="text-2xl font-bold text-blue-600">{stats?.activeRepairs || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <Wrench className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 hover:bg-green-100 hover:border-green-300 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600">Completed Today</p>
              <p className="text-2xl font-bold text-green-600">{stats?.completedToday || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 hover:bg-orange-100 hover:border-orange-300 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600">Pending Parts</p>
              <p className="text-2xl font-bold text-orange-600">{stats?.pendingParts || 0}</p>
            </div>
            <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-5 hover:bg-purple-100 hover:border-purple-300 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600">Avg Repair Time</p>
              <p className="text-2xl font-bold text-purple-600">{stats?.averageRepairTime || 0}h</p>
            </div>
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/devices/new')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-4 h-4" />
            New Repair Job
          </button>
          <button
            onClick={() => navigate('/lats/inventory-spare-parts')}
            className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-300 rounded-xl font-semibold transition-all"
          >
            <Package className="w-4 h-4" />
            Manage Spare Parts
          </button>
          <button
            onClick={() => setViewMode('analytics')}
            className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-300 rounded-xl font-semibold transition-all"
          >
            <BarChart3 className="w-4 h-4" />
            View Analytics
          </button>
        </div>
      </div>

      {/* Recent Devices */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Recent Repair Jobs</h3>
          <button
            onClick={() => navigate('/devices')}
            className="px-4 py-2 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-300 rounded-xl font-semibold text-sm transition-all"
          >
            View All
          </button>
        </div>
        <div className="space-y-3">
          {filteredDevices.slice(0, 5).map((device) => (
            <div key={device.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{device.customerName}</div>
                <div className="text-sm text-gray-600">
                  {device.brand} {device.model} • {device.serialNumber}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={device.status} />
                <button
                  onClick={() => navigate(`/devices/${device.id}`)}
                  className="p-2 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-300 rounded-lg transition-all"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTechnicians = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold mb-4">Technician Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {technicians.map((tech) => (
            <div key={tech.id} className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">{tech.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{tech.efficiency}%</div>
                  <div className="text-xs text-gray-500">Efficiency</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Active Repairs:</span>
                  <span className="font-medium">{tech.activeRepairs}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Completed Today:</span>
                  <span className="font-medium text-green-600">{tech.completedToday}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-4">Repair Status Distribution</h3>
          <div className="space-y-3">
            {Object.entries(statusDistribution).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusBadge status={status as DeviceStatus} />
                  <span className="text-sm font-medium capitalize">{status.replace('-', ' ')}</span>
                </div>
                <span className="font-bold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Stats */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-4">Financial Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                <span>Total Revenue</span>
              </div>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(stats?.totalRevenue || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <span>Avg Repair Time</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">
                {stats?.averageRepairTime || 0} hours
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Wrapper Container - Single rounded container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Fixed Header Section */}
        <div className="p-8 border-b border-gray-200 flex-shrink-0">
      <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Icon */}
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <Wrench className="w-8 h-8 text-white" />
              </div>
              
              {/* Text */}
          <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Repair Management</h1>
                <p className="text-sm text-gray-600">
                  Comprehensive repair operations dashboard
                </p>
          </div>
        </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
            onClick={() => navigate('/devices')}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-300 rounded-xl font-semibold transition-all"
          >
                <Smartphone className="w-4 h-4" />
            All Devices
              </button>
              <button
            onClick={() => navigate('/devices/new')}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
          >
              <Plus className="w-4 h-4" />
            New Repair
            </button>
          </div>
        </div>
      </div>

        {/* Action Bar - Tab Navigation */}
        <div className="px-8 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/50 flex-shrink-0">
      <GlassTabs
        tabs={[
          { id: 'overview', label: 'Overview', icon: <Wrench className="w-5 h-5" /> },
          { id: 'technicians', label: 'Technicians', icon: <Users className="w-5 h-5" /> },
          { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> }
        ]}
        activeTab={viewMode}
        onTabChange={(tabId) => setViewMode(tabId as any)}
        variant="modern"
        size="md"
      />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
      {/* Filters */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search devices..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <GlassSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as DeviceStatus | 'all')}>
              <option value="all">All Statuses</option>
              <option value="assigned">Assigned</option>
              <option value="diagnosis-started">Diagnosis Started</option>
              <option value="awaiting-parts">Awaiting Parts</option>
              <option value="parts-arrived">Parts Arrived</option>
              <option value="in-repair">In Repair</option>
              <option value="reassembled-testing">Testing</option>
              <option value="repair-complete">Repair Complete</option>
              <option value="returned-to-customer-care">Ready for Pickup</option>
              <option value="done">Completed</option>
              <option value="failed">Failed</option>
            </GlassSelect>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Technician</label>
            <GlassSelect value={technicianFilter} onChange={(e) => setTechnicianFilter(e.target.value)}>
              <option value="all">All Technicians</option>
              {technicians.map(tech => (
                <option key={tech.id} value={tech.id}>{tech.name}</option>
              ))}
            </GlassSelect>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Time Period</label>
            <GlassSelect value={dateFilter} onChange={(e) => setDateFilter(e.target.value as any)}>
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </GlassSelect>
          </div>
        </div>
          </div>

      {/* Content based on view mode */}
      {viewMode === 'overview' && renderOverview()}
      {viewMode === 'technicians' && renderTechnicians()}
      {viewMode === 'analytics' && renderAnalytics()}

      {/* Loading State */}
      {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner size="lg" color="blue" />
              <span className="mt-4 text-gray-600 font-medium">Loading repair data...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RepairManagementPage;
