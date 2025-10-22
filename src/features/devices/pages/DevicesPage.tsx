import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevices } from '../../../context/DevicesContext';
import { useAuth } from '../../../context/AuthContext';
import { Device, DeviceStatus } from '../../../types';
import GlassCard from '../../shared/components/ui/GlassCard';
import SearchBar from '../../shared/components/ui/SearchBar';
import GlassSelect from '../../shared/components/ui/GlassSelect';
import { BackButton } from '../../shared/components/ui/BackButton';
import StatusBadge from '../../shared/components/ui/StatusBadge';
import DeviceRepairDetailModal from '../components/DeviceRepairDetailModal';
import CBMCalculatorModal from '../../calculator/components/CBMCalculatorModal';
import { 
  Plus, 
  Smartphone,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Wrench,
  Eye,
  Edit,
  Grid,
  List,
  X,
  Settings,
  ChevronDown,
  ChevronUp,
  SortAsc,
  SortDesc,
  Filter,
  Calculator
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { updateDeviceInDb } from '../../../lib/deviceApi';
import { supabase } from '../../../lib/supabaseClient';

const DevicesPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  
  // Safely access devices context with error handling for HMR
  let devices: any[] = [];
  let loading = false;
  let deleteDevice: any = null;
  let addDevice: any = null;
  
  try {
    const devicesContext = useDevices();
    devices = devicesContext?.devices || [];
    loading = devicesContext?.loading || false;
    deleteDevice = devicesContext?.deleteDevice || null;
    addDevice = devicesContext?.addDevice || null;
  } catch (error) {
    // Silently handle - context may not be available during HMR
  }
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | 'all'>('all');
  const [technicianFilter, setTechnicianFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortBy, setSortBy] = useState<'createdAt' | 'expectedReturnDate' | 'status' | 'customerName'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  
  // Modal states for device actions
  const [showDeviceDetailModal, setShowDeviceDetailModal] = useState(false);
  const [showDeviceEditModal, setShowDeviceEditModal] = useState(false);
  const [selectedDeviceForDetail, setSelectedDeviceForDetail] = useState<string | null>(null);
  const [selectedDeviceForEdit, setSelectedDeviceForEdit] = useState<Device | null>(null);
  
  // CBM Calculator modal state
  const [showCbmCalculator, setShowCbmCalculator] = useState(false);

  // Fetch technicians and customers for filters
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        // Fetch technicians
        const { data: techData } = await supabase
          .from('users')
          .select('id, full_name, email')
          .eq('role', 'technician');
        setTechnicians(techData || []);

        // Fetch customers
        const { data: customerData } = await supabase
          .from('customers')
          .select('id, name, phone')
          .order('name');
        setCustomersList(customerData || []);
      } catch (error) {
        console.error('Error fetching filter data:', error);
      }
    };

    fetchFilterData();
  }, []);

  // Filter and sort devices
  const filteredDevices = useMemo(() => {
    const filtered = devices.filter(device => {
      // Search filter
      const searchMatch = searchQuery === '' || 
        device.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.phoneNumber.includes(searchQuery);

      // Status filter
      const statusMatch = statusFilter === 'all' || device.status === statusFilter;

      // Technician filter
      const technicianMatch = technicianFilter === 'all' || device.assignedTo === technicianFilter;

      // Customer filter
      const customerMatch = customerFilter === 'all' || device.customerId === customerFilter;

      // Date filter
      let dateMatch = true;
      if (dateFilter !== 'all') {
        const deviceDate = new Date(device.createdAt);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        switch (dateFilter) {
          case 'today':
            dateMatch = deviceDate >= today;
            break;
          case 'week':
            dateMatch = deviceDate >= weekAgo;
            break;
          case 'month':
            dateMatch = deviceDate >= monthAgo;
            break;
        }
      }

      return searchMatch && statusMatch && technicianMatch && customerMatch && dateMatch;
    });

    // Sort devices
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'expectedReturnDate':
          aValue = new Date(a.expectedReturnDate);
          bValue = new Date(b.expectedReturnDate);
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'customerName':
          aValue = a.customerName;
          bValue = b.customerName;
          break;
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [devices, searchQuery, statusFilter, technicianFilter, customerFilter, dateFilter, sortBy, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    const total = devices.length;
    const active = devices.filter(d => !['done', 'failed'].includes(d.status)).length;
    const overdue = devices.filter(d => {
      if (d.status === 'done' || d.status === 'failed') return false;
      if (!d.expectedReturnDate) return false;
      return new Date(d.expectedReturnDate) < new Date();
    }).length;
    const completed = devices.filter(d => d.status === 'done').length;
    const failed = devices.filter(d => d.status === 'failed').length;

    return { total, active, overdue, completed, failed };
  }, [devices]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTechnicianFilter('all');
    setCustomerFilter('all');
    setDateFilter('all');
  };


  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3498db]"></div>
          <span className="ml-3 text-gray-600 font-medium">Loading devices...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header - Modern Flat Design */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <BackButton to="/dashboard" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Device Management</h1>
            <p className="text-gray-600 mt-1">Manage all devices in the repair system</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setShowCbmCalculator(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors text-sm"
            title="CBM Calculator"
          >
            <Calculator size={18} />
            CBM
          </button>
          <button 
            onClick={() => navigate('/devices/new')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus size={18} />
            Add Device
          </button>
          {currentUser?.role === 'admin' && (
            <button 
              onClick={() => setShowTemplateManagerModal(true)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg font-medium bg-gray-600 text-white hover:bg-gray-700 transition-colors"
            >
              <Settings size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Statistics - Minimal Flat Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-blue-50 rounded-lg p-5 hover:bg-blue-100 transition-colors">
          <div className="flex items-center gap-3">
            <Smartphone className="w-7 h-7 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Devices</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-5 hover:bg-orange-100 transition-colors">
          <div className="flex items-center gap-3">
            <Wrench className="w-7 h-7 text-orange-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Active</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 rounded-lg p-5 hover:bg-red-100 transition-colors">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-7 h-7 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Overdue</p>
              <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-5 hover:bg-green-100 transition-colors">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-7 h-7 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-5 hover:bg-gray-100 transition-colors">
          <div className="flex items-center gap-3">
            <X className="w-7 h-7 text-gray-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Failed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
            </div>
          </div>
        </div>
      </div>


      {/* Search and Filters */}
      <GlassCard className="p-6">
        <div className="flex flex-col gap-4">
          {/* Main Search and Controls */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                onSearch={setSearchQuery}
                placeholder="Search devices by brand, model, serial number, or customer..."
                className="w-full"
                suggestions={devices.map(d => `${d.brand} ${d.model}`)}
                searchKey="device_search"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <GlassSelect
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'assigned', label: 'Assigned' },
                  { value: 'diagnosis-started', label: 'Diagnosis Started' },
                  { value: 'awaiting-parts', label: 'Awaiting Parts' },
                  { value: 'in-repair', label: 'In Repair' },
                  { value: 'reassembled-testing', label: 'Testing' },
                  { value: 'repair-complete', label: 'Repair Complete' },
                  { value: 'returned-to-customer-care', label: 'Returned to Care' },
                  { value: 'done', label: 'Done' },
                  { value: 'failed', label: 'Failed' }
                ]}
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as DeviceStatus | 'all')}
                placeholder="Filter by Status"
                className="min-w-[150px]"
              />
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showAdvancedFilters 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Filter size={16} />
                More Filters
                {showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {/* View Mode Toggle - Minimal */}
              <div className="flex rounded-lg bg-gray-100 p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'table'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600'
                  }`}
                >
                  <List size={16} />
                  Table
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600'
                  }`}
                >
                  <Grid size={16} />
                  Grid
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="pt-4 border-t border-gray-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <GlassSelect
                  options={[
                    { value: 'all', label: 'All Technicians' },
                    ...technicians.map(tech => ({ value: tech.id, label: tech.full_name }))
                  ]}
                  value={technicianFilter}
                  onChange={setTechnicianFilter}
                  placeholder="Filter by Technician"
                  className="w-full"
                />
                <GlassSelect
                  options={[
                    { value: 'all', label: 'All Customers' },
                    ...customersList.map(customer => ({ value: customer.id, label: customer.name }))
                  ]}
                  value={customerFilter}
                  onChange={setCustomerFilter}
                  placeholder="Filter by Customer"
                  className="w-full"
                />
                <GlassSelect
                  options={[
                    { value: 'all', label: 'All Time' },
                    { value: 'today', label: 'Today' },
                    { value: 'week', label: 'This Week' },
                    { value: 'month', label: 'This Month' }
                  ]}
                  value={dateFilter}
                  onChange={(value) => setDateFilter(value as any)}
                  placeholder="Filter by Date"
                  className="w-full"
                />
              </div>

              {/* Sort Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 font-medium">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3498db] focus:border-transparent bg-white"
                  >
                    <option value="createdAt">Date Created</option>
                    <option value="expectedReturnDate">Return Date</option>
                    <option value="status">Status</option>
                    <option value="customerName">Customer Name</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    {sortOrder === 'asc' ? <SortAsc size={18} /> : <SortDesc size={18} />}
                  </button>
                </div>

                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Devices List */}
      <GlassCard className="p-6">
        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Device</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Issue</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Return Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map((device) => (
                  <tr key={device.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#3498db]/10 rounded-lg flex items-center justify-center">
                          <Smartphone className="w-5 h-5 text-[#3498db]" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{device.brand} {device.model}</p>
                          {device.serialNumber && (
                            <p className="text-xs text-gray-500">S/N: {device.serialNumber}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{device.customerName}</p>
                        <p className="text-sm text-gray-500">{device.phoneNumber}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-700 truncate max-w-[250px]" title={device.issueDescription || device.issue}>
                        {device.issueDescription || device.issue || 'No description'}
                      </p>
                      {device.estimatedHours && (
                        <p className="text-xs text-gray-500 mt-1">Est: {device.estimatedHours}h</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={device.status} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-700">
                          {device.expectedReturnDate 
                            ? new Date(device.expectedReturnDate).toLocaleDateString()
                            : 'Not set'
                          }
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => {
                            setSelectedDeviceForDetail(device.id);
                            setShowDeviceDetailModal(true);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                          <Eye size={13} />
                          View
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedDeviceForEdit(device);
                            setShowDeviceEditModal(true);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-gray-600 text-white hover:bg-gray-700 transition-colors"
                        >
                          <Edit size={13} />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredDevices.map((device) => (
              <div key={device.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5 flex-1">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Smartphone className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{device.brand} {device.model}</h3>
                      <p className="text-xs text-gray-500 truncate">{device.serialNumber || 'No S/N'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Customer</span>
                    <span className="text-sm font-medium text-gray-900 truncate ml-2" title={device.customerName}>{device.customerName}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <StatusBadge status={device.status} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Issue</span>
                    <span className="text-xs text-gray-700 truncate ml-2 max-w-[150px]" title={device.issueDescription || device.issue}>
                      {device.issueDescription || device.issue || 'No description'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Return Date</span>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} className="text-gray-400" />
                      <span className="text-xs text-gray-700">
                        {device.expectedReturnDate 
                          ? new Date(device.expectedReturnDate).toLocaleDateString()
                          : 'Not set'
                        }
                      </span>
                    </div>
                  </div>
                  
                  {device.estimatedHours && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Estimated</span>
                      <span className="text-sm font-medium text-gray-900">{device.estimatedHours}h</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-1.5 pt-3 border-t border-gray-100">
                  <button 
                    onClick={() => {
                      setSelectedDeviceForDetail(device.id);
                      setShowDeviceDetailModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    <Eye size={13} />
                    View
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedDeviceForEdit(device);
                      setShowDeviceEditModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-gray-600 text-white hover:bg-gray-700 transition-colors"
                  >
                    <Edit size={13} />
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredDevices.length === 0 && (
          <div className="text-center py-8">
            <Smartphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No devices found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || statusFilter !== 'all' || technicianFilter !== 'all' || customerFilter !== 'all' || dateFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first device'
              }
            </p>
            {!searchQuery && statusFilter === 'all' && technicianFilter === 'all' && customerFilter === 'all' && dateFilter === 'all' && (
              <button 
                onClick={() => navigate('/devices/new')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors mx-auto"
              >
                <Plus size={18} />
                Add Your First Device
              </button>
            )}
          </div>
        )}
      </GlassCard>

      {/* Device Detail Modal */}
      {selectedDeviceForDetail && (
        <DeviceRepairDetailModal
          isOpen={showDeviceDetailModal}
          onClose={() => {
            setShowDeviceDetailModal(false);
            setSelectedDeviceForDetail(null);
          }}
          deviceId={selectedDeviceForDetail}
        />
      )}
      
      {/* Device Edit Modal */}
      {selectedDeviceForEdit && showDeviceEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Device</h3>
                <button
                  onClick={() => {
                    setShowDeviceEditModal(false);
                    setSelectedDeviceForEdit(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!selectedDeviceForEdit?.id) return;
                
                try {
                  await updateDeviceInDb(selectedDeviceForEdit.id, selectedDeviceForEdit);
                  toast.success('Device updated successfully');
                  setShowDeviceEditModal(false);
                  setSelectedDeviceForEdit(null);
                  // Refresh the devices list
                  window.location.reload();
                } catch (error) {
                  console.error('Error updating device:', error);
                  toast.error('Failed to update device');
                }
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand
                    </label>
                    <input
                      type="text"
                      value={selectedDeviceForEdit?.brand || ''}
                      onChange={(e) => selectedDeviceForEdit && setSelectedDeviceForEdit({
                        ...selectedDeviceForEdit,
                        brand: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model
                    </label>
                    <input
                      type="text"
                      value={selectedDeviceForEdit?.model || ''}
                      onChange={(e) => selectedDeviceForEdit && setSelectedDeviceForEdit({
                        ...selectedDeviceForEdit,
                        model: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Serial Number
                    </label>
                    <input
                      type="text"
                      value={selectedDeviceForEdit?.serialNumber || ''}
                      onChange={(e) => selectedDeviceForEdit && setSelectedDeviceForEdit({
                        ...selectedDeviceForEdit,
                        serialNumber: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Issue Description
                    </label>
                    <textarea
                      value={selectedDeviceForEdit?.issueDescription || ''}
                      onChange={(e) => selectedDeviceForEdit && setSelectedDeviceForEdit({
                        ...selectedDeviceForEdit,
                        issueDescription: e.target.value
                      })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={selectedDeviceForEdit?.status || ''}
                      onChange={(e) => selectedDeviceForEdit && setSelectedDeviceForEdit({
                        ...selectedDeviceForEdit,
                        status: e.target.value as DeviceStatus
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="assigned">Assigned</option>
                      <option value="diagnosis-started">Diagnosis Started</option>
                      <option value="awaiting-parts">Awaiting Parts</option>
                      <option value="parts-arrived">Parts Arrived</option>
                      <option value="in-repair">In Repair</option>
                      <option value="reassembled-testing">Reassembled Testing</option>
                      <option value="repair-complete">Repair Complete</option>
                      <option value="returned-to-customer-care">Returned to Customer Care</option>
                      <option value="done">Done</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeviceEditModal(false);
                      setSelectedDeviceForEdit(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CBM Calculator Modal */}
      <CBMCalculatorModal
        isOpen={showCbmCalculator}
        onClose={() => setShowCbmCalculator(false)}
      />
    </div>
  );
};

export { DevicesPage };
export default DevicesPage;
