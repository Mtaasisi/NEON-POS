import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import SearchBar from '../../shared/components/ui/SearchBar';
import { BackButton } from '../../shared/components/ui/BackButton';
import { 
  Users, Plus, Edit, Trash2, Eye, RefreshCw, Filter, Star, 
  Building, Globe, DollarSign, TrendingUp, Package, Tag, X,
  AlertCircle, Calendar, Phone
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  getAllSuppliers, 
  deleteSupplier,
  type Supplier 
} from '../../../lib/supplierApi';
import {
  getAllSupplierCategories,
  getAllSupplierTags,
  type SupplierCategory,
  type SupplierTag
} from '../../../lib/supplierCategoriesApi';
import {
  getExpiringDocuments
} from '../../../lib/supplierDocumentsApi';
import {
  getExpiringContracts
} from '../../../lib/supplierContractsApi';
import SupplierDetailModal from '../components/SupplierDetailModal';
import SupplierImportExportToolbar from '../components/SupplierImportExportToolbar';
import EnhancedAddSupplierModal from '../components/EnhancedAddSupplierModal';
import { extractProductCategories, getCategoryColor } from '../../../utils/supplierUtils';

interface EnhancedSupplierManagementPageProps {
  embedded?: boolean; // When true, hides the main header (for use in tabs)
}

const EnhancedSupplierManagementPage: React.FC<EnhancedSupplierManagementPageProps> = ({ embedded = false }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Data state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<SupplierCategory[]>([]);
  const [tags, setTags] = useState<SupplierTag[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  
  // Notifications
  const [expiringContracts, setExpiringContracts] = useState<any[]>([]);
  const [expiringDocuments, setExpiringDocuments] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Load all data
  useEffect(() => {
    loadAllData();
  }, []);

  // Filter suppliers
  useEffect(() => {
    filterSuppliers();
  }, [suppliers, searchQuery, selectedCountry, selectedCategory, selectedTag, selectedPriority, minRating]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [
        suppliersData,
        categoriesData,
        tagsData,
        expiringContractsData,
        expiringDocsData
      ] = await Promise.all([
        getAllSuppliers(),
        getAllSupplierCategories(),
        getAllSupplierTags(),
        getExpiringContracts().catch(() => []),
        getExpiringDocuments().catch(() => [])
      ]);

      setSuppliers(suppliersData);
      setCategories(categoriesData);
      setTags(tagsData);
      setExpiringContracts(expiringContractsData);
      setExpiringDocuments(expiringDocsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const filterSuppliers = useCallback(() => {
    let filtered = suppliers;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(supplier =>
        supplier.name.toLowerCase().includes(query) ||
        supplier.company_name?.toLowerCase().includes(query) ||
        supplier.contact_person?.toLowerCase().includes(query) ||
        supplier.email?.toLowerCase().includes(query)
      );
    }

    // Country filter
    if (selectedCountry !== 'all') {
      filtered = filtered.filter(s => s.country === selectedCountry);
    }

    // Priority filter
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(s => (s as any).priority_level === selectedPriority);
    }

    // Rating filter
    if (minRating > 0) {
      filtered = filtered.filter(s => (s as any).average_rating >= minRating);
    }

    setFilteredSuppliers(filtered);
  }, [suppliers, searchQuery, selectedCountry, selectedPriority, minRating]);

  const handleDelete = async (id: string) => {
    if (!confirm('⚠️ Are you sure you want to delete this supplier? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteSupplier(id);
      toast.success('Supplier deleted successfully');
      loadAllData();
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      toast.error(error.message || 'Failed to delete supplier');
    }
  };

  const handleViewDetails = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailModal(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowDetailModal(false);
    setShowAddModal(true);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCountry('all');
    setSelectedCategory('all');
    setSelectedTag('all');
    setSelectedPriority('all');
    setMinRating(0);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedCountry !== 'all') count++;
    if (selectedCategory !== 'all') count++;
    if (selectedTag !== 'all') count++;
    if (selectedPriority !== 'all') count++;
    if (minRating > 0) count++;
    return count;
  };

  // Stats calculations
  const stats = {
    total: suppliers.length,
    active: suppliers.filter(s => s.is_active).length,
    premium: suppliers.filter(s => (s as any).priority_level === 'premium').length,
    avgRating: suppliers.length > 0 
      ? suppliers.reduce((sum, s) => sum + ((s as any).average_rating || 0), 0) / suppliers.length 
      : 0,
    expiringContracts: expiringContracts.length,
    expiringDocuments: expiringDocuments.length
  };

  const countries = Array.from(new Set(suppliers.map(s => s.country).filter(Boolean)));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading suppliers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100"}>
      {/* Header - Only show when not embedded */}
      {!embedded && (
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <BackButton onClick={() => navigate('/dashboard')} />
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">Enhanced Supplier Management</h1>
                    <p className="text-sm text-gray-600">Comprehensive supplier relationship management</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Notifications */}
                {(stats.expiringContracts > 0 || stats.expiringDocuments > 0) && (
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    title="Expiring items"
                  >
                    <AlertCircle size={20} />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {stats.expiringContracts + stats.expiringDocuments}
                    </span>
                  </button>
                )}

                {/* Import/Export */}
                <SupplierImportExportToolbar 
                  suppliers={suppliers} 
                  onImportComplete={loadAllData}
                />

                {/* Refresh */}
                <button
                  onClick={loadAllData}
                  className="px-4 py-2 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors inline-flex items-center gap-2 text-sm"
                >
                  <RefreshCw size={18} />
                  Refresh
                </button>

                {/* Add Supplier */}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2 text-sm"
                >
                  <Plus size={18} />
                  Add Supplier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={embedded ? "space-y-6" : "max-w-7xl mx-auto p-4 sm:p-6 space-y-6"}>
        {/* Compact Toolbar for Embedded Mode */}
        {embedded && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Notifications */}
              {(stats.expiringContracts > 0 || stats.expiringDocuments > 0) && (
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                  title="Expiring items"
                >
                  <AlertCircle size={20} />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {stats.expiringContracts + stats.expiringDocuments}
                  </span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Import/Export */}
              <SupplierImportExportToolbar 
                suppliers={suppliers} 
                onImportComplete={loadAllData}
              />

              {/* Refresh */}
              <button
                onClick={loadAllData}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors inline-flex items-center gap-2 text-sm"
              >
                <RefreshCw size={18} />
                Refresh
              </button>

              {/* Add Supplier */}
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2 text-sm"
              >
                <Plus size={18} />
                Add Supplier
              </button>
            </div>
          </div>
        )}

        {/* Notifications Panel */}
        {showNotifications && (stats.expiringContracts.length > 0 || stats.expiringDocuments.length > 0) && (
          <GlassCard className="p-4 bg-orange-50 border-orange-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold text-orange-900">Expiring Items</h3>
              </div>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-orange-600 hover:text-orange-800"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-2">
              {expiringContracts.slice(0, 3).map((contract: any) => (
                <div key={contract.contract_id} className="text-sm text-orange-800">
                  📄 Contract with {contract.supplier_name} expires in {contract.days_until_expiry} days
                </div>
              ))}
              {expiringDocuments.slice(0, 3).map((doc: any) => (
                <div key={doc.document_id} className="text-sm text-orange-800">
                  📋 {doc.document_type} for {doc.supplier_name} expires in {doc.days_until_expiry} days
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-xl font-semibold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Star className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Premium</p>
                <p className="text-xl font-semibold text-gray-900">{stats.premium}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Rating</p>
                <p className="text-xl font-semibold text-gray-900">{stats.avgRating.toFixed(1)}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Contracts</p>
                <p className="text-xl font-semibold text-gray-900">{stats.expiringContracts}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <Package className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Documents</p>
                <p className="text-xl font-semibold text-gray-900">{stats.expiringDocuments}</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Search & Filters */}
        <GlassCard className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
            <div className="flex-1 max-w-md">
              <SearchBar
                onSearch={setSearchQuery}
                placeholder="Search suppliers..."
                className="w-full"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  showFilters ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filters
                {getActiveFiltersCount() > 0 && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                    {getActiveFiltersCount()}
                  </span>
                )}
              </button>

              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  <Package className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  <Users className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Countries</option>
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Priorities</option>
                    <option value="premium">Premium</option>
                    <option value="standard">Standard</option>
                    <option value="budget">Budget</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Rating</label>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="0">All Ratings</option>
                    <option value="4">4+ Stars</option>
                    <option value="3">3+ Stars</option>
                    <option value="2">2+ Stars</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Suppliers Grid/List */}
        <GlassCard className="overflow-hidden">
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No suppliers found</h3>
              <p className="text-gray-600 mb-6">
                {getActiveFiltersCount() > 0
                  ? 'No suppliers match your current filters'
                  : 'Add your first supplier to get started'
                }
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus size={20} />
                Add Supplier
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSuppliers.map((supplier) => (
                <div 
                  key={supplier.id} 
                  className="border border-gray-200 rounded-xl p-6 bg-white hover:shadow-lg transition-all duration-200 cursor-pointer"
                  onClick={() => handleViewDetails(supplier)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {supplier.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                        {supplier.company_name && (
                          <p className="text-sm text-gray-600">{supplier.company_name}</p>
                        )}
                      </div>
                    </div>
                    {(supplier as any).is_favorite && (
                      <Star className="w-5 h-5 text-yellow-500 fill-current" />
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    {supplier.contact_person && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building className="w-4 h-4" />
                        {supplier.contact_person}
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        {supplier.phone}
                      </div>
                    )}
                    {supplier.country && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Globe className="w-4 h-4" />
                        {supplier.country}
                      </div>
                    )}
                  </div>

                  {/* Product Categories */}
                  {(() => {
                    const categories = extractProductCategories(supplier.notes);
                    return categories.length > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Package className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-xs font-medium text-gray-600">Products:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {categories.slice(0, 3).map((category, idx) => (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 text-xs font-medium rounded-md border ${getCategoryColor(category)}`}
                            >
                              {category}
                            </span>
                          ))}
                          {categories.length > 3 && (
                            <span className="px-2 py-0.5 text-xs text-gray-500 bg-gray-100 rounded-md border border-gray-200">
                              +{categories.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      {(supplier as any).average_rating > 0 && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded-full">
                          <Star className="w-3 h-3 fill-current" />
                          {(supplier as any).average_rating.toFixed(1)}
                        </span>
                      )}
                      {(supplier as any).priority_level && (
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          (supplier as any).priority_level === 'premium' 
                            ? 'bg-purple-100 text-purple-700'
                            : (supplier as any).priority_level === 'standard'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {(supplier as any).priority_level}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(supplier);
                        }}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(supplier.id);
                        }}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {/* List view implementation */}
              <div className="divide-y divide-gray-200">
                {filteredSuppliers.map((supplier) => (
                  <div 
                    key={supplier.id} 
                    className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleViewDetails(supplier)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                          {supplier.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{supplier.name}</div>
                          {supplier.company_name && (
                            <div className="text-sm text-gray-600">{supplier.company_name}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {supplier.country && (
                          <span className="text-sm text-gray-600">{supplier.country}</span>
                        )}
                        {(supplier as any).average_rating > 0 && (
                          <span className="flex items-center gap-1 text-sm">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            {(supplier as any).average_rating.toFixed(1)}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(supplier.id);
                          }}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Modals */}
      {showAddModal && (
        <EnhancedAddSupplierModal
          isOpen={showAddModal}
          supplier={editingSupplier}
          onClose={() => {
            setShowAddModal(false);
            setEditingSupplier(null);
          }}
          onSupplierCreated={() => {
            setShowAddModal(false);
            setEditingSupplier(null);
            loadAllData();
          }}
        />
      )}

      {showDetailModal && selectedSupplier && (
        <SupplierDetailModal
          supplier={selectedSupplier}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedSupplier(null);
          }}
          onUpdate={loadAllData}
          onEdit={handleEdit}
        />
      )}
    </div>
  );
};

export default EnhancedSupplierManagementPage;

