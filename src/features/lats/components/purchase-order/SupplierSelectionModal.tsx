// SupplierSelectionModal component - For selecting suppliers in purchase orders
import React, { useState, useMemo } from 'react';
import {
  Search, Plus, User, Phone, Mail, MapPin, Building, Truck, 
  Star, Crown, Globe, CreditCard, Calendar, DollarSign,
  CheckCircle, XCircle, RefreshCw, AlertCircle, Factory,
  Store, Coins, Scale, Target, Activity, TrendingUp, Package
} from 'lucide-react';
import { extractProductCategories, getCategoryColor } from '../../../../utils/supplierUtils';
import { getCountryFlag, formatCountryDisplay } from '../../../../utils/countryFlags';
import EnhancedAddSupplierModal from '../../../settings/components/EnhancedAddSupplierModal';
import SupplierDetailModal from '../../../settings/components/SupplierDetailModal';
import SupplierForm from '../inventory/SupplierForm';
import GlassCard from '../../../shared/components/ui/GlassCard';
import GlassButton from '../../../shared/components/ui/GlassButton';
import { formatMoney, formatDate } from '../../lib/purchaseOrderUtils';
import { updateSupplier, type UpdateSupplierData } from '../../../../lib/supplierApi';
import { toast } from 'react-hot-toast';

interface Supplier {
  id: string;
  name: string;
  company_name?: string;
  contactPerson?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  wechat?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  payment_terms?: string;
  exchangeRates?: string;
  exchange_rate?: number;
  leadTimeDays?: number;
  preferred_currency?: string;
  currency?: string; // Legacy field, use preferred_currency
  isActive: boolean;
  is_active?: boolean;
  totalSpent?: number;
  ordersCount?: number;
  lastOrderDate?: string;
  rating?: number;
  description?: string;
  notes?: string;
}

interface SupplierSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSupplierSelect: (supplier: Supplier) => void;
  suppliers: Supplier[];
}

const SupplierSelectionModal: React.FC<SupplierSelectionModalProps> = ({
  isOpen,
  onClose,
  onSupplierSelect,
  suppliers
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'orders' | 'recent' | 'rating'>('name');
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Block body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);


  // Get unique countries from suppliers
  const countries = useMemo(() => {
    const countrySet = new Set(suppliers.map(s => s.country).filter(Boolean));
    return Array.from(countrySet).sort();
  }, [suppliers]);

  // Filter and sort suppliers (with "Lin" always pinned at the top)
  const filteredSuppliers = useMemo(() => {
    let filtered = suppliers.filter(supplier => {
      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          (supplier.name?.toLowerCase() || '').includes(query) ||
          (supplier.company_name?.toLowerCase() || '').includes(query) ||
          (supplier.contactPerson?.toLowerCase() || '').includes(query) ||
          (supplier.phone || '').includes(query) ||
          (supplier.email?.toLowerCase() || '').includes(query) ||
          (supplier.city?.toLowerCase() || '').includes(query) ||
          (supplier.country?.toLowerCase() || '').includes(query);
        
        if (!matchesSearch) return false;
      }

      // Filter by country
      if (selectedCountry && supplier.country !== selectedCountry) {
        return false;
      }

      return true;
    });

    // Sort suppliers with "Lin" always at the top
    filtered.sort((a, b) => {
      // Always pin "Lin" to the top
      const aIsLin = a.name?.toLowerCase() === 'lin';
      const bIsLin = b.name?.toLowerCase() === 'lin';
      
      if (aIsLin && !bIsLin) return -1;
      if (!aIsLin && bIsLin) return 1;
      
      // For other suppliers, use normal sorting
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'orders':
          return (b.ordersCount || 0) - (a.ordersCount || 0);
        case 'recent':
          const aDate = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
          const bDate = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
          return bDate - aDate;
        case 'rating':
          return Number(b.rating || 0) - Number(a.rating || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [suppliers, searchQuery, selectedCountry, sortBy]);



  const getSupplierRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-yellow-600';
    if (rating >= 3.0) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSupplierBadgeColor = (supplier: Supplier) => {
    if ((supplier.ordersCount || 0) >= 10) return 'bg-purple-100 text-purple-700';
    if (Number(supplier.rating || 0) >= 4.5) return 'bg-green-100 text-green-700';
    return 'bg-blue-100 text-blue-700';
  };

  const getSupplierBadgeText = (supplier: Supplier) => {
    if ((supplier.ordersCount || 0) >= 10) return 'Preferred';
    if (Number(supplier.rating || 0) >= 4.5) return 'Top Rated';
    return 'Supplier';
  };

  const handleSupplierCreated = (newSupplier: Supplier) => {
    setShowAddSupplierModal(false);
    // Automatically select the newly created supplier
    onSupplierSelect(newSupplier);
    onClose();
  };

  const handleEditSupplier = (supplier: any) => {
    // Convert to the format expected by SupplierForm
    const supplierForEdit = {
      id: supplier.id,
      name: supplier.name,
      company_name: supplier.company_name,
      contact_person: supplier.contact_person || supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      whatsapp: supplier.whatsapp,
      wechat: supplier.wechat,
      address: supplier.address,
      city: supplier.city,
      country: supplier.country,
      tax_id: supplier.tax_id,
      payment_terms: supplier.payment_terms,
      preferred_currency: supplier.preferred_currency,
      notes: supplier.notes,
      is_active: supplier.is_active ?? supplier.isActive,
      created_at: supplier.created_at || supplier.lastOrderDate || new Date().toISOString(),
      updated_at: supplier.updated_at || new Date().toISOString()
    };
    setEditingSupplier(supplierForEdit);
    setShowSupplierForm(true);
    setShowDetailsModal(false);
  };

  // Handle supplier update
  const handleSubmitSupplier = async (data: UpdateSupplierData) => {
    if (!editingSupplier) return;
    
    try {
      setIsSubmitting(true);
      const updatedSupplier = await updateSupplier(editingSupplier.id, data);
      
      toast.success('Supplier updated successfully!');
      setShowSupplierForm(false);
      setEditingSupplier(null);
      
      // Note: The parent component would need to refresh suppliers list
      // For now, we just close the modal
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update supplier';
      toast.error(errorMessage);
      console.error('Error updating supplier:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={onClose}
    >
      <GlassCard 
        className="w-full max-w-[95vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[95vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="p-2 sm:p-3 bg-orange-100 rounded-xl">
                <Truck className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-gray-800">Select Supplier</h2>
                <p className="text-xs sm:text-base text-gray-600 hidden sm:block">Choose a supplier for your purchase order</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Search and Filters */}
          <div className="p-4 sm:p-6 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search suppliers by name, contact, phone, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Country Filter */}
            <div>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Countries</option>
                {countries.map(country => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="name">Sort by Name</option>
                <option value="orders">Sort by Orders</option>
                <option value="recent">Sort by Recent</option>
                <option value="rating">Sort by Rating</option>
              </select>
            </div>
          </div>

          {/* Additional Filters */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {filteredSuppliers.length} of {suppliers.length} suppliers
            </div>
          </div>
        </div>

          {/* Suppliers List */}
          <div className="p-4 sm:p-6">
          {filteredSuppliers.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredSuppliers.map((supplier) => {
                const isLinSupplier = supplier.name?.toLowerCase() === 'lin';
                return (
                <div
                  key={supplier.id}
                  className={`p-4 rounded-xl hover:shadow-xl transition-all duration-300 ${
                    isLinSupplier 
                      ? 'bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 border-2 border-orange-200 shadow-lg'
                      : 'border border-gray-200 hover:border-orange-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg relative ${
                        isLinSupplier 
                          ? 'bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600'
                          : 'bg-gradient-to-br from-orange-500 to-amber-600'
                      }`}>
                        {supplier.name.charAt(0).toUpperCase()}
                        {isLinSupplier && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center bg-gradient-to-r from-green-400 to-emerald-500">
                            <Truck className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{supplier.name}</h3>
                        {supplier.company_name && supplier.company_name !== supplier.name && (
                          <p className="text-sm text-gray-600">{supplier.company_name}</p>
                        )}
                        {supplier.contactPerson && (
                          <p className="text-sm text-gray-600">{supplier.contactPerson}</p>
                        )}
                        {supplier.phone && (
                          <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                            <Phone className="w-3 h-3" />
                            {supplier.phone}
                          </div>
                        )}
                        {isLinSupplier && (supplier.country || supplier.preferred_currency) && (
                          <div className="flex items-center gap-2 mt-2">
                            {supplier.country && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 border border-orange-200">
                                {supplier.country}
                              </span>
                            )}
                            {(supplier.preferred_currency || supplier.currency) && (
                              <span className="flex items-center gap-1 text-xs text-gray-600 bg-white px-2 py-1 rounded-full border border-gray-200" title={`Currency set by supplier: ${supplier.preferred_currency || supplier.currency}`}>
                                <Coins className="w-3 h-3" />
                                {supplier.preferred_currency || supplier.currency}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isLinSupplier && (
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSupplierBadgeColor(supplier)}`}>
                        {getSupplierBadgeText(supplier)}
                      </span>
                      {supplier.rating && (
                        <div className="flex items-center gap-1">
                          <Star className={`w-4 h-4 fill-current ${getSupplierRatingColor(Number(supplier.rating))}`} />
                          <span className={`text-sm font-medium ${getSupplierRatingColor(Number(supplier.rating))}`}>
                            {Number(supplier.rating).toFixed(1)}
                          </span>
                        </div>
                          )}
                        </div>
                      )}
                      {isLinSupplier && (
                        <>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingSupplier(supplier);
                              setShowDetailsModal(true);
                            }}
                            className="p-2 text-orange-500 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-all duration-200" 
                            title="View supplier details"
                          >
                            <User className="w-5 h-5" />
                          </button>
                          <button 
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Remove from favorites"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-2 mb-3">
                    {supplier.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{supplier.phone}</span>
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{supplier.email}</span>
                      </div>
                    )}
                    {(supplier.city || supplier.country) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span className="flex items-center gap-1.5">
                          {supplier.country && (
                            <span className="text-base leading-none">{getCountryFlag(supplier.country)}</span>
                          )}
                          <span>
                            {supplier.city && supplier.country 
                              ? `${supplier.city}, ${supplier.country}` 
                              : supplier.city || supplier.country
                            }
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Supplier Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                    <div>
                      <div className="text-xs text-gray-500">Orders</div>
                      <div className="font-semibold text-gray-900">{supplier.ordersCount || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Currency</div>
                      <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                        {supplier.country && (
                          <span className="text-base leading-none">{getCountryFlag(supplier.country)}</span>
                        )}
                        <span>{supplier.preferred_currency || supplier.currency || 'TZS'}</span>
                      </div>
                    </div>
                    {supplier.totalSpent && (
                      <div className="col-span-2">
                        <div className="text-xs text-gray-500">Total Spent</div>
                        <div className="font-semibold text-green-600">{formatMoney(supplier.totalSpent, { 
                          code: supplier.preferred_currency || supplier.currency || 'TZS', 
                          name: supplier.preferred_currency || supplier.currency || 'TZS', 
                          symbol: supplier.preferred_currency || supplier.currency || 'TZS', 
                          flag: getCountryFlag(supplier.country) 
                        })}</div>
                      </div>
                    )}
                    {supplier.lastOrderDate && (
                      <div className="col-span-2">
                        <div className="text-xs text-gray-500">Last Order</div>
                        <div className="font-semibold text-gray-900">{formatDate(supplier.lastOrderDate)}</div>
                      </div>
                    )}
                    {supplier.exchangeRates && (
                      <div className="col-span-2">
                        <div className="text-xs text-gray-500">Exchange Rates</div>
                        <div className="font-semibold text-gray-900">{supplier.exchangeRates}</div>
                      </div>
                    )}
                    {supplier.leadTimeDays && (
                      <div className="col-span-2">
                        <div className="text-xs text-gray-500">Lead Time</div>
                        <div className="font-semibold text-gray-900">{supplier.leadTimeDays} days</div>
                      </div>
                    )}
                  </div>

                  {/* Product Categories */}
                  {(() => {
                    const categories = extractProductCategories(supplier.notes);
                    return categories.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Package className="w-3.5 h-3.5 text-purple-600" />
                          <span className="text-xs font-semibold text-gray-700">Deals with:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {categories.slice(0, 4).map((category, idx) => (
                            <span
                              key={idx}
                              className={`px-2 py-1 text-xs font-medium rounded-md border ${getCategoryColor(category)}`}
                            >
                              {category}
                            </span>
                          ))}
                          {categories.length > 4 && (
                            <span className="px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded-md border border-gray-200 font-medium">
                              +{categories.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-100 mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingSupplier(supplier);
                        setShowDetailsModal(true);
                      }}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium text-xs sm:text-sm flex items-center justify-center gap-2"
                    >
                      <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">View Details</span>
                      <span className="sm:hidden">Details</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSupplierSelect(supplier);
                      }}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Select Supplier</span>
                      <span className="sm:hidden">Select</span>
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <Building className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">No suppliers found</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 px-4">
                {searchQuery || selectedCountry 
                  ? "Try adjusting your search criteria or filters" 
                  : "No suppliers available in the system"
                }
              </p>
              <button
                onClick={() => setShowAddSupplierModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg hover:from-orange-600 hover:to-amber-700 transition-all font-medium text-sm flex items-center justify-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Add New Supplier
              </button>
            </div>
          )}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
          <div className="space-y-3 sm:space-y-4">
            <div className="text-xs sm:text-sm text-gray-600 text-center">
              {filteredSuppliers.length > 0 
                ? `Select a supplier to continue with your purchase order`
                : `No suppliers match your criteria`
              }
            </div>
            <button
              onClick={() => setShowAddSupplierModal(true)}
              className="w-full py-3 sm:py-4 px-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white text-base sm:text-lg font-semibold rounded-lg hover:from-orange-600 hover:to-amber-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
              Add New Supplier
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Add Supplier Modal */}
      <EnhancedAddSupplierModal
        isOpen={showAddSupplierModal}
        onClose={() => setShowAddSupplierModal(false)}
        onSupplierCreated={() => {
          // Note: Parent component should refresh suppliers list
          setShowAddSupplierModal(false);
        }}
      />

      {/* Supplier Details Modal */}
      {viewingSupplier && showDetailsModal && (
        <SupplierDetailModal
          supplier={{
            ...viewingSupplier,
            contact_person: viewingSupplier.contactPerson,
            is_active: viewingSupplier.isActive,
            created_at: viewingSupplier.lastOrderDate || new Date().toISOString(),
            updated_at: new Date().toISOString()
          }}
          onClose={() => {
            setShowDetailsModal(false);
            setViewingSupplier(null);
          }}
          onUpdate={() => {
            // Note: Parent component should refresh suppliers after update
          }}
          onEdit={handleEditSupplier}
        />
      )}

      {/* Supplier Edit Form Modal */}
      {showSupplierForm && editingSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <SupplierForm
              supplier={editingSupplier}
              onSubmit={handleSubmitSupplier}
              onCancel={() => {
                setShowSupplierForm(false);
                setEditingSupplier(null);
              }}
              loading={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierSelectionModal;
