import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevices } from '../../../context/DevicesContext';
import { useAuth } from '../../../context/AuthContext';
import { Device, DeviceStatus } from '../../../types';
import SearchBar from '../../shared/components/ui/SearchBar';
import GlassSelect from '../../shared/components/ui/GlassSelect';
import { BackButton } from '../../shared/components/ui/BackButton';
import StatusBadge from '../../shared/components/ui/StatusBadge';
import DeviceRepairDetailModal from '../components/DeviceRepairDetailModal';
import CBMCalculatorModal from '../../calculator/components/CBMCalculatorModal';
import ProblemTemplateManager from '../components/ProblemTemplateManager';
import AddDeviceModal from '../components/AddDeviceModal';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import CustomerTooltip from '../../lats/components/pos/CustomerTooltip';
import { 
  Plus, 
  Smartphone,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Wrench,
  Eye,
  Edit,
  X,
  Settings,
  ChevronDown,
  ChevronUp,
  SortAsc,
  SortDesc,
  Filter,
  Calculator,
  Search,
  Package,
  User,
  Clock,
  DollarSign,
  Copy,
  Trash2,
  Printer,
  ArrowRightLeft
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { updateDeviceInDb } from '../../../lib/deviceApi';
import { supabase } from '../../../lib/supabaseClient';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import { formatPhoneForDisplay } from '../../../utils/phoneNumberCleaner';

const DevicesPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { startLoading, completeLoading, failLoading } = useLoadingJob();
  
  
  // Safely access devices context with error handling for HMR
  let devices: any[] = [];
  let loading = false;
  let deleteDevice: any = null;
  let addDevice: any = null;
  let updateDeviceStatus: any = null;
  
  try {
    const devicesContext = useDevices();
    devices = devicesContext?.devices || [];
    loading = devicesContext?.loading || false;
    deleteDevice = devicesContext?.deleteDevice || null;
    addDevice = devicesContext?.addDevice || null;
    updateDeviceStatus = devicesContext?.updateDeviceStatus || null;
  } catch (error) {
    // Silently handle - context may not be available during HMR
  }
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | 'all'>('all');
  const [technicianFilter, setTechnicianFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
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
  
  // Template Manager modal state
  const [showTemplateManagerModal, setShowTemplateManagerModal] = useState(false);
  
  // Add Device modal state
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  
  // Expanded cards state for grid view
  const [expandedDevices, setExpandedDevices] = useState<Set<string>>(new Set());
  
  // Loading state for status updates
  const [updatingStatus, setUpdatingStatus] = useState<{deviceId: string, status: DeviceStatus} | null>(null);
  
  // Customer tooltip state
  const [showCustomerTooltips, setShowCustomerTooltips] = useState<Record<string, boolean>>({});
  const customerBadgeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // Helper function to extract brand from model if brand is Unknown or missing
  const getDisplayBrand = (device: Device): string => {
    if (device.brand && device.brand !== 'Unknown' && device.brand.trim() !== '') {
      return device.brand;
    }
    
    // Extract brand from model name
    const modelLower = (device.model || '').toLowerCase();
    if (modelLower.includes('iphone') || modelLower.includes('ipad') || modelLower.includes('macbook') || modelLower.includes('imac') || modelLower.includes('watch') || modelLower.includes('airpods')) {
      return 'Apple';
    } else if (modelLower.includes('samsung') || modelLower.includes('galaxy')) {
      return 'Samsung';
    } else if (modelLower.includes('google') || modelLower.includes('pixel')) {
      return 'Google';
    } else if (modelLower.includes('huawei')) {
      return 'Huawei';
    } else if (modelLower.includes('xiaomi') || modelLower.includes('redmi') || modelLower.includes('poco')) {
      return 'Xiaomi';
    } else if (modelLower.includes('oneplus')) {
      return 'OnePlus';
    } else if (modelLower.includes('sony') || modelLower.includes('xperia')) {
      return 'Sony';
    } else if (modelLower.includes('lg')) {
      return 'LG';
    } else if (modelLower.includes('motorola')) {
      return 'Motorola';
    } else if (modelLower.includes('nokia')) {
      return 'Nokia';
    } else if (modelLower.includes('microsoft') || modelLower.includes('surface')) {
      return 'Microsoft';
    } else if (modelLower.includes('hp')) {
      return 'HP';
    } else if (modelLower.includes('dell')) {
      return 'Dell';
    } else if (modelLower.includes('lenovo')) {
      return 'Lenovo';
    }
    
    return device.brand || '';
  };
  
  // Helper function to get available status transitions based on current status
  const getAvailableStatusTransitions = (device: Device): Array<{status: DeviceStatus, label: string, icon: React.ReactNode, color: string}> => {
    const { status } = device;
    const role = currentUser?.role || 'customer-care';
    
    const statusTransitions: Record<DeviceStatus, Array<{status: DeviceStatus, label: string, icon: React.ReactNode, color: string}>> = {
      'assigned': [
        { status: 'diagnosis-started', label: 'Start Diagnosis', icon: <Wrench className="w-4 h-4" />, color: 'bg-blue-600 hover:bg-blue-700' }
      ],
      'diagnosis-started': [
        { status: 'awaiting-parts', label: 'Awaiting Parts', icon: <Package className="w-4 h-4" />, color: 'bg-yellow-600 hover:bg-yellow-700' },
        { status: 'in-repair', label: 'Start Repair', icon: <Wrench className="w-4 h-4" />, color: 'bg-purple-600 hover:bg-purple-700' }
      ],
      'awaiting-parts': [
        { status: 'parts-arrived', label: 'Parts Arrived', icon: <Package className="w-4 h-4" />, color: 'bg-green-600 hover:bg-green-700' }
      ],
      'parts-arrived': [
        { status: 'in-repair', label: 'Start Repair', icon: <Wrench className="w-4 h-4" />, color: 'bg-purple-600 hover:bg-purple-700' }
      ],
      'in-repair': [
        { status: 'reassembled-testing', label: 'Testing', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-cyan-600 hover:bg-cyan-700' }
      ],
      'reassembled-testing': [
        { status: 'repair-complete', label: 'Repair Complete', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-emerald-600 hover:bg-emerald-700' }
      ],
      'repair-complete': [
        { status: 'returned-to-customer-care', label: 'Give to Customer', icon: <User className="w-4 h-4" />, color: 'bg-teal-600 hover:bg-teal-700' }
      ],
      'returned-to-customer-care': [
        { status: 'done', label: 'Return to Customer', icon: <User className="w-4 h-4" />, color: 'bg-gray-600 hover:bg-gray-700' }
      ],
      'done': [],
      'failed': role === 'admin' || role === 'customer-care' 
        ? [{ status: 'done', label: 'Return to Customer', icon: <User className="w-4 h-4" />, color: 'bg-gray-600 hover:bg-gray-700' }]
        : [{ status: 'returned-to-customer-care', label: 'Send to Customer Care', icon: <User className="w-4 h-4" />, color: 'bg-teal-600 hover:bg-teal-700' }]
    };
    
    return statusTransitions[status] || [];
  };
  
  // Handle status update
  const handleStatusUpdate = async (deviceId: string, newStatus: DeviceStatus) => {
    if (!updateDeviceStatus) {
      toast.error('Status update function not available');
      return;
    }
    
    // Set loading state
    setUpdatingStatus({ deviceId, status: newStatus });
    
    try {
      const success = await updateDeviceStatus(deviceId, newStatus, '');
      if (success) {
        toast.success(`Device status updated to ${newStatus.replace(/-/g, ' ')}`);
      } else {
        toast.error('Failed to update device status');
      }
    } catch (error) {
      console.error('Error updating device status:', error);
      toast.error('Failed to update device status');
    } finally {
      // Clear loading state after a short delay to show the update
      setTimeout(() => {
        setUpdatingStatus(null);
      }, 500);
    }
  };

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
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center h-64">
          <LoadingSpinner size="lg" color="blue" />
          <p className="mt-4 text-gray-600 font-medium">Loading devices...</p>
        </div>
      </div>
    );
  }

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
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              
              {/* Text */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Device Management</h1>
                <p className="text-sm text-gray-600">Manage all devices in the repair system</p>
              </div>
            </div>

            {/* Back Button */}
            <BackButton to="/dashboard" label="" className="!w-12 !h-12 !p-0 !rounded-full !bg-blue-600 hover:!bg-blue-700 !shadow-lg flex items-center justify-center" iconClassName="text-white" />
          </div>
        </div>

        {/* Action Bar - Enhanced Design */}
        <div className="px-8 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/50 flex-shrink-0">
          <div className="flex gap-3 flex-wrap items-center">
            <button 
              onClick={() => setShowAddDeviceModal(true)}
              className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:from-blue-600 hover:to-blue-700"
            >
              <Plus size={18} />
              <span>Add Device</span>
            </button>
            <button 
              onClick={() => setShowCbmCalculator(true)}
              className="flex items-center gap-2 px-4 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:from-green-600 hover:to-green-700"
              title="CBM Calculator"
            >
              <Calculator size={18} />
              <span>CBM Calculator</span>
            </button>
            {(currentUser?.permissions?.includes('all') || currentUser?.permissions?.includes('edit_settings') || currentUser?.role === 'admin') && (
              <button 
                onClick={() => setShowTemplateManagerModal(true)}
                className="flex items-center gap-2 px-4 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg hover:from-gray-600 hover:to-gray-700"
              >
                <Settings size={18} />
                <span>Settings</span>
              </button>
            )}
          </div>
        </div>

        {/* Statistics Section */}
        <div className="p-6 pb-0 flex-shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Total Devices</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 hover:bg-orange-100 hover:border-orange-300 transition-all shadow-sm hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Active</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 hover:bg-red-100 hover:border-red-300 transition-all shadow-sm hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Overdue</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 hover:bg-green-100 hover:border-green-300 transition-all shadow-sm hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-5 hover:bg-gray-100 hover:border-gray-300 transition-all shadow-sm hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <X className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Failed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters Section */}
        <div className="p-6 pb-0 flex-shrink-0 border-t border-gray-100 bg-white">
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 shadow-sm">
            <div className="flex flex-col gap-4">
              {/* Main Search and Controls */}
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search devices by brand, model, serial number, or customer..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 bg-white font-medium"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
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
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${
                      showAdvancedFilters 
                        ? 'bg-blue-50 text-blue-600 border-blue-200' 
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Filter size={16} />
                    More Filters
                    {showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
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
                      <span className="text-sm font-semibold text-gray-700">Sort by:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-4 py-2.5 border-2 border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white font-medium"
                      >
                        <option value="createdAt">Date Created</option>
                        <option value="expectedReturnDate">Return Date</option>
                        <option value="status">Status</option>
                        <option value="customerName">Customer Name</option>
                      </select>
                      <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors border-2 border-gray-200"
                        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                      >
                        {sortOrder === 'asc' ? <SortAsc size={18} /> : <SortDesc size={18} />}
                      </button>
                    </div>

                    <button
                      onClick={clearFilters}
                      className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors border-2 border-gray-200"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Devices List */}
        <div className="flex-1 overflow-y-auto px-6 py-6 border-t border-gray-100">
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden">
          <div className="space-y-4 p-6">
            {filteredDevices.map((device) => {
              const isExpanded = expandedDevices.has(device.id);
              const toggleExpanded = () => {
                setExpandedDevices(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has(device.id)) {
                    newSet.delete(device.id);
                  } else {
                    newSet.add(device.id);
                  }
                  return newSet;
                });
              };
              
              const getStatusBadgeColor = (status: DeviceStatus) => {
                switch (status) {
                  case 'done':
                    return 'bg-gradient-to-r from-green-500 to-green-600';
                  case 'failed':
                    return 'bg-gradient-to-r from-red-500 to-red-600';
                  case 'repair-complete':
                    return 'bg-gradient-to-r from-emerald-500 to-emerald-600';
                  case 'in-repair':
                  case 'diagnosis-started':
                    return 'bg-gradient-to-r from-blue-500 to-blue-600';
                  case 'assigned':
                    return 'bg-gradient-to-r from-amber-500 to-amber-600';
                  default:
                    return 'bg-gradient-to-r from-gray-500 to-gray-600';
                }
              };
              
              const getStatusLabel = (status: DeviceStatus) => {
                switch (status) {
                  case 'done': return 'Done';
                  case 'failed': return 'Failed';
                  case 'repair-complete': return 'Complete';
                  case 'in-repair': return 'Repairing';
                  case 'diagnosis-started': return 'Diagnosis';
                  case 'assigned': return 'Assigned';
                  default: return status.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                }
              };

              return (
                <div 
                  key={device.id} 
                  className="relative border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 w-full border-blue-500 shadow-xl"
                >
                  <div className="flex items-start justify-between p-6 cursor-pointer" onClick={toggleExpanded}>
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 relative">
                        <Smartphone className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <h3 className="text-2xl font-bold text-gray-900 truncate">
                            {getDisplayBrand(device)} {device.model}
                          </h3>
                          <div className={`inline-flex items-center justify-center p-1.5 sm:p-2 rounded-full border-2 border-white shadow-lg z-30 min-w-[3.5rem] sm:min-w-[4rem] min-h-[2rem] sm:min-h-[2.5rem] transition-all duration-300 ${getStatusBadgeColor(device.status)}`}>
                            <span className="text-xs sm:text-sm font-bold text-white whitespace-nowrap px-1">
                              {getStatusLabel(device.status)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap mb-3">
                          <div 
                            ref={(el) => {
                              customerBadgeRefs.current[device.id] = el;
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (device.customerId && device.customerName) {
                                setShowCustomerTooltips(prev => ({
                                  ...prev,
                                  [device.id]: !prev[device.id]
                                }));
                              }
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0 cursor-pointer hover:bg-blue-100 transition-colors"
                          >
                            <User className="w-5 h-5" />
                            <span className="text-base font-semibold truncate max-w-[200px]" title={device.customerName}>
                              {device.customerName || 'No Customer'}
                            </span>
                          </div>
                          
                          {/* Customer Tooltip */}
                          {device.customerId && device.customerName && customerBadgeRefs.current[device.id] && (
                            <CustomerTooltip
                              customer={{
                                id: device.customerId,
                                name: device.customerName,
                                phone: device.phoneNumber,
                                email: device.customerEmail,
                                points: device.customerTotalSpent ? Math.floor(device.customerTotalSpent / 100) : 0,
                                totalSpent: device.customerTotalSpent || 0,
                                loyaltyLevel: device.customerLoyaltyLevel,
                                lastVisit: device.customerLastVisit
                              }}
                              anchorRef={{ current: customerBadgeRefs.current[device.id] }}
                              isOpen={showCustomerTooltips[device.id] || false}
                              onClose={() => setShowCustomerTooltips(prev => {
                                const newState = { ...prev };
                                delete newState[device.id];
                                return newState;
                              })}
                              formatCurrency={(amount) => `TSh ${amount.toLocaleString()}`}
                              formatDate={(dateString) => {
                                if (!dateString) return 'N/A';
                                try {
                                  return new Date(dateString).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  });
                                } catch {
                                  return dateString;
                                }
                              }}
                            />
                          )}
                          {device.serialNumber && (
                            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200">
                              <div className="flex items-center gap-2">
                                <Package className="w-5 h-5 text-purple-600" />
                                <span className="text-base font-semibold text-purple-700">{device.serialNumber}</span>
                              </div>
                            </div>
                          )}
                          {device.expectedReturnDate && (
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 text-green-700 border border-green-200">
                              <Calendar className="w-5 h-5" />
                              <span className="text-base font-semibold">
                                {new Date(device.expectedReturnDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex flex-col items-end gap-2">
                      <div className="text-right">
                        <span className="text-3xl font-bold text-gray-900 leading-tight">
                          {device.repairCost 
                            ? `TSh ${parseFloat(String(device.repairCost)).toLocaleString()}`
                            : 'No price set'
                          }
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 bg-gray-100 hover:bg-gray-200">
                        <ChevronDown className={`text-gray-600 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <>
                      <div className="mt-5 pt-5 border-t-2 border-gray-200 relative">
                        <div className="absolute top-0 left-0 right-0 flex items-center justify-center -mt-3">
                          <span className="bg-white px-5 py-1.5 text-xs text-gray-500 font-semibold uppercase tracking-wider rounded-full border border-gray-200 shadow-sm">
                            Device Details
                          </span>
                        </div>
                      </div>
                      
                      <div className="px-6 pb-6 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                          <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                              <Calendar className="w-5 h-5 text-blue-600" />
                              <h4 className="text-sm font-semibold text-gray-500 uppercase">Return Date</h4>
                            </div>
                            <p className="text-lg font-bold text-gray-900">
                              {device.expectedReturnDate 
                                ? new Date(device.expectedReturnDate).toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                  })
                                : 'Not set'
                              }
                            </p>
                          </div>
                          
                          <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                              <Wrench className="w-5 h-5 text-purple-600" />
                              <h4 className="text-sm font-semibold text-gray-500 uppercase">Issue</h4>
                            </div>
                            <p className="text-lg font-bold text-gray-900">
                              {device.issueDescription || device.issue || 'No issue description'}
                            </p>
                          </div>
                          
                          {device.assignedToName && (
                            <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
                              <div className="flex items-center gap-3 mb-2">
                                <User className="w-5 h-5 text-green-600" />
                                <h4 className="text-sm font-semibold text-gray-500 uppercase">Technician</h4>
                              </div>
                              <p className="text-lg font-bold text-gray-900">
                                {device.assignedToName}
                              </p>
                            </div>
                          )}
                          
                          {device.estimatedHours && (
                            <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
                              <div className="flex items-center gap-3 mb-2">
                                <Clock className="w-5 h-5 text-orange-600" />
                                <h4 className="text-sm font-semibold text-gray-500 uppercase">Estimated Hours</h4>
                              </div>
                              <p className="text-lg font-bold text-gray-900">
                                {device.estimatedHours}h
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-6 pt-6 border-t-2 border-gray-200">
                          <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                            Status Updates
                          </h4>
                          {(() => {
                            const availableTransitions = getAvailableStatusTransitions(device);
                            
                            if (availableTransitions.length === 0) {
                              return (
                                <div className="text-center py-4 text-gray-500">
                                  <p className="text-sm">No status updates available for this device</p>
                                  <p className="text-xs mt-1">Current status: <span className="font-semibold">{device.status.replace(/-/g, ' ')}</span></p>
                                </div>
                              );
                            }
                            
                            return (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {availableTransitions.map((transition) => {
                                  const isUpdating = updatingStatus?.deviceId === device.id && updatingStatus?.status === transition.status;
                                  return (
                                    <button
                                      key={transition.status}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusUpdate(device.id, transition.status);
                                      }}
                                      disabled={isUpdating || !!updatingStatus}
                                      className={`flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${transition.color}`}
                                    >
                                      {isUpdating ? (
                                        <>
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                          <span>Updating...</span>
                                        </>
                                      ) : (
                                        <>
                                          {transition.icon}
                                          {transition.label}
                                        </>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {filteredDevices.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Smartphone className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No devices found</h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || statusFilter !== 'all' || technicianFilter !== 'all' || customerFilter !== 'all' || dateFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by adding your first device'
                  }
                </p>
                {!searchQuery && statusFilter === 'all' && technicianFilter === 'all' && customerFilter === 'all' && dateFilter === 'all' && (
                  <button 
                    onClick={() => setShowAddDeviceModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Your First Device</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden relative">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setShowDeviceEditModal(false);
                setSelectedDeviceForEdit(null);
              }}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon Header - Fixed */}
            <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
              <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
                {/* Icon */}
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <Smartphone className="w-8 h-8 text-white" />
                </div>
                
                {/* Text */}
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Edit Device</h3>
                  <p className="text-sm text-gray-600">
                    Update device information
                  </p>
                </div>
              </div>
            </div>

            {/* Form - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              
              <form id="device-edit-form" onSubmit={async (e) => {
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
                
              </form>
            </div>

            {/* Action Buttons - Fixed Footer */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 flex-shrink-0 bg-white px-6 pb-6">
              <button
                type="button"
                onClick={() => {
                  setShowDeviceEditModal(false);
                  setSelectedDeviceForEdit(null);
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="device-edit-form"
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CBM Calculator Modal */}
      <CBMCalculatorModal
        isOpen={showCbmCalculator}
        onClose={() => setShowCbmCalculator(false)}
      />

      {/* Add Device Modal */}
      <AddDeviceModal
        isOpen={showAddDeviceModal}
        onClose={() => setShowAddDeviceModal(false)}
        onDeviceCreated={() => {
          setShowAddDeviceModal(false);
          // Refresh devices list if needed
        }}
      />

      {/* Template Manager Modal */}
      {showTemplateManagerModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowTemplateManagerModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Problem Template Manager</h2>
              <button
                onClick={() => setShowTemplateManagerModal(false)}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <ProblemTemplateManager />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { DevicesPage };
export default DevicesPage;
