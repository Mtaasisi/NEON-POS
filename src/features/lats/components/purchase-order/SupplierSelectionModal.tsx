// SupplierSelectionModal component - For selecting suppliers in purchase orders
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, Plus, Phone, MapPin, Building, Truck, 
  Star, X, CheckCircle, Package, Info
} from 'lucide-react';
import { extractProductCategories, getCategoryColor } from '../../../../utils/supplierUtils';
import { getCountryFlag } from '../../../../utils/countryFlags';
import EnhancedAddSupplierModal from '../../../settings/components/EnhancedAddSupplierModal';
import SupplierDetailModal from '../../../settings/components/SupplierDetailModal';
import SupplierForm from '../inventory/SupplierForm';
import { formatMoney, formatDate } from '../../lib/purchaseOrderUtils';
import { updateSupplier, type UpdateSupplierData } from '../../../../lib/supplierApi';
import { toast } from 'react-hot-toast';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';

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

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Additional scroll prevention for html element
  useEffect(() => {
    if (isOpen) {
      // Prevent scrolling on html element as well
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';

    return () => {
        document.documentElement.style.overflow = originalHtmlOverflow;
    };
    }
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

  return createPortal(
    <div 
      className="fixed bg-black/60 flex items-center justify-center p-4 z-[99999]" 
      style={{ 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        overflow: 'hidden',
        overscrollBehavior: 'none'
      }}
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="supplier-modal-title"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
      onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header - Fixed */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center shadow-lg">
              <Truck className="w-8 h-8 text-white" />
              </div>
            
            {/* Text */}
              <div>
              <h3 id="supplier-modal-title" className="text-2xl font-bold text-gray-900 mb-2">Select Supplier</h3>
              <p className="text-sm text-gray-600">Choose a supplier for your purchase order</p>
            </div>
          </div>
        </div>

        {/* Fixed Search Section */}
        <div className="p-6 pb-0 flex-shrink-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search suppliers by name, contact, phone, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                />
              </div>
            </div>

            {/* Country Filter */}
            <div>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full px-3 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              >
                <option value="">All Countries</option>
                {countries.map(country => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-sm text-gray-500 mb-4">
              {filteredSuppliers.length} of {suppliers.length} suppliers
          </div>
        </div>

        {/* Scrollable Suppliers List Section */}
        <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
          {filteredSuppliers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
              {filteredSuppliers.map((supplier) => {
                const isLinSupplier = supplier.name?.toLowerCase() === 'lin';
                const categories = extractProductCategories(supplier.notes);
                
                return (
                <div
                  key={supplier.id}
                    className={`border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer relative ${
                    isLinSupplier 
                        ? 'border-orange-400 shadow-lg' 
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSupplierSelect(supplier);
                    }}
                >
                    {/* Info Icon Button - Top Right Corner */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingSupplier(supplier);
                        setShowDetailsModal(true);
                      }}
                      className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-orange-500 text-gray-600 hover:text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md z-10"
                      title="View supplier details"
                    >
                      <Info className="w-4 h-4" />
                    </button>

                    <div className="p-4 flex flex-col h-full">
                      {/* Header with Avatar and Name - Left Aligned */}
                      <div className="flex items-center gap-3 mb-4">
                        {/* Avatar */}
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0 ${
                        isLinSupplier 
                          ? 'bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600'
                          : 'bg-gradient-to-br from-orange-500 to-amber-600'
                      }`}>
                        {supplier.name.charAt(0).toUpperCase()}
                        </div>
                        
                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-gray-900 truncate">
                              {supplier.name}
                            </h3>
                        {isLinSupplier && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm flex-shrink-0">
                                <CheckCircle className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          {supplier.company_name && supplier.company_name !== supplier.name && (
                            <p className="text-xs text-gray-600 truncate mt-1">{supplier.company_name}</p>
                          )}
                        </div>
                      </div>

                      {/* Empty space for flex-1 */}
                      <div className="space-y-2 mb-4 flex-1"></div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-4 pt-3 border-t border-gray-100">
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">Orders</div>
                          <div className="font-bold text-gray-900 text-sm">{supplier.ordersCount || 0}</div>
                    </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">Currency</div>
                          <div className="font-bold text-gray-900 text-sm flex items-center justify-center gap-1">
                        {supplier.country && (
                              <span>{getCountryFlag(supplier.country)}</span>
                        )}
                        <span>{supplier.preferred_currency || supplier.currency || 'TZS'}</span>
                      </div>
                        </div>
                      </div>

                      {/* Action Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSupplierSelect(supplier);
                      }}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg font-semibold text-sm flex items-center justify-center gap-2 mt-auto"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Select
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg font-medium">No suppliers found</p>
              <p className="text-sm text-gray-500 mt-2">
                {searchQuery || selectedCountry 
                  ? "Try adjusting your search criteria" 
                  : "No suppliers available"
                }
              </p>
            </div>
          )}
        </div>

        {/* Fixed Action Buttons Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
            <button
            type="button"
              onClick={() => setShowAddSupplierModal(true)}
            className="w-full px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-amber-700 transition-all shadow-lg hover:shadow-xl text-lg flex items-center justify-center gap-2"
            >
            <Plus className="w-5 h-5" />
              Add New Supplier
            </button>
          </div>
        </div>

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
          onSupplierSelect={(supplier) => {
            onSupplierSelect(supplier);
            setShowDetailsModal(false);
            setViewingSupplier(null);
          }}
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
    </div>,
    document.body
  );
};

export default SupplierSelectionModal;
