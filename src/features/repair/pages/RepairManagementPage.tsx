import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevices } from '../../../context/DevicesContext';
import { useAuth } from '../../../context/AuthContext';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import SearchBar from '../../shared/components/ui/SearchBar';
import GlassSelect from '../../shared/components/ui/GlassSelect';
import { BackButton } from '../../shared/components/ui/BackButton';
import StatusBadge from '../../shared/components/ui/StatusBadge';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
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
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Repairs</p>
              <p className="text-2xl font-bold text-blue-600">{stats?.activeRepairs || 0}</p>
            </div>
            <Wrench className="w-8 h-8 text-blue-500" />
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed Today</p>
              <p className="text-2xl font-bold text-green-600">{stats?.completedToday || 0}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Parts</p>
              <p className="text-2xl font-bold text-orange-600">{stats?.pendingParts || 0}</p>
            </div>
            <Package className="w-8 h-8 text-orange-500" />
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Repair Time</p>
              <p className="text-2xl font-bold text-purple-600">{stats?.averageRepairTime || 0}h</p>
            </div>
            <Clock className="w-8 h-8 text-purple-500" />
          </div>
        </GlassCard>
      </div>

      {/* Quick Actions */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassButton
            onClick={() => navigate('/devices/new')}
            className="flex items-center gap-2"
            icon={<Plus className="w-4 h-4" />}
          >
            New Repair Job
          </GlassButton>
          <GlassButton
            onClick={() => navigate('/lats/inventory-spare-parts')}
            variant="outline"
            className="flex items-center gap-2"
            icon={<Package className="w-4 h-4" />}
          >
            Manage Spare Parts
          </GlassButton>
          <GlassButton
            onClick={() => setViewMode('analytics')}
            variant="outline"
            className="flex items-center gap-2"
            icon={<BarChart3 className="w-4 h-4" />}
          >
            View Analytics
          </GlassButton>
        </div>
      </GlassCard>

      {/* Recent Devices */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Repair Jobs</h3>
          <GlassButton
            variant="outline"
            size="sm"
            onClick={() => navigate('/devices')}
          >
            View All
          </GlassButton>
        </div>
        <div className="space-y-3">
          {filteredDevices.slice(0, 5).map((device) => (
            <div key={device.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="font-medium">{device.customerName}</div>
                <div className="text-sm text-gray-600">
                  {device.brand} {device.model} • {device.serialNumber}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={device.status} />
                <GlassButton
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/devices/${device.id}`)}
                >
                  <Eye className="w-4 h-4" />
                </GlassButton>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );

  const renderTechnicians = () => (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">Technician Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {technicians.map((tech) => (
            <GlassCard key={tech.id} className="p-4">
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
            </GlassCard>
          ))}
        </div>
      </GlassCard>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Repair Status Distribution</h3>
          <div className="space-y-3">
            {Object.entries(statusDistribution).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusBadge status={status as DeviceStatus} />
                  <span className="text-sm capitalize">{status.replace('-', ' ')}</span>
                </div>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Revenue Stats */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Financial Overview</h3>
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
        </GlassCard>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold">Repair Management</h1>
            <p className="text-gray-600">Comprehensive repair operations dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <GlassButton
            variant="outline"
            onClick={() => navigate('/devices')}
            icon={<Smartphone className="w-4 h-4" />}
          >
            All Devices
          </GlassButton>
          <GlassButton
            onClick={() => navigate('/devices/new')}
            icon={<Plus className="w-4 h-4" />}
          >
            New Repair
          </GlassButton>
        </div>
      </div>

      {/* Navigation Tabs */}
      <GlassCard className="p-2">
        <div className="flex gap-1">
          {[
            { id: 'overview', label: 'Overview', icon: Wrench },
            { id: 'technicians', label: 'Technicians', icon: Users },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  viewMode === tab.id
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* Filters */}
      <GlassCard className="p-4">
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
      </GlassCard>

      {/* Content based on view mode */}
      {viewMode === 'overview' && renderOverview()}
      {viewMode === 'technicians' && renderTechnicians()}
      {viewMode === 'analytics' && renderAnalytics()}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading repair data...</span>
        </div>
      )}
    </div>
  );
};

export default RepairManagementPage;
