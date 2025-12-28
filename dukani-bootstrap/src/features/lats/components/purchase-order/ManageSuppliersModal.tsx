// ManageSuppliersModal component - For managing suppliers in purchase orders page
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, Plus, Phone, MapPin, Building, Truck, 
  Star, X, CheckCircle, Package, Info, Edit, Trash2, Mail, Globe
} from 'lucide-react';
import { extractProductCategories, getCategoryColor } from '../../../../utils/supplierUtils';
import { getCountryFlag } from '../../../../utils/countryFlags';
import EnhancedAddSupplierModal from '../../../settings/components/EnhancedAddSupplierModal';
import SupplierDetailModal from '../../../settings/components/SupplierDetailModal';
import SupplierForm from '../inventory/SupplierForm';
import { formatMoney, formatDate } from '../../lib/purchaseOrderUtils';
import { updateSupplier, deleteSupplier, type UpdateSupplierData } from '../../../../lib/supplierApi';
import { toast } from 'react-hot-toast';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';
import { useDialog } from '../../../shared/hooks/useDialog';

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

interface ManageSuppliersModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  onSupplierUpdate?: () => void;
}

const ManageSuppliersModal: React.FC<ManageSuppliersModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  onSupplierUpdate
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
  const { confirm } = useDialog();

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Additional scroll prevention for html element
  useEffect(() => {
    if (isOpen) {
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

  // Filter and sort suppliers
  const filteredAndSortedSuppliers = useMemo(() => {
    let filtered = suppliers.filter((supplier) => {
      const matchesSearch =
        !searchQuery ||
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCountry = !selectedCountry || supplier.country === selectedCountry;

      return matchesSearch && matchesCountry;
    });

    // Sort suppliers
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'orders':
          return (b.ordersCount || 0) - (a.ordersCount || 0);
        case 'recent':
          const dateA = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
          const dateB = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
          return dateB - dateA;
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [suppliers, searchQuery, selectedCountry, sortBy]);

  if (!isOpen) return null;

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowSupplierForm(true);
  };

  const handleDeleteSupplier = async (supplier: Supplier) => {
    const confirmed = await confirm(
      `Are you sure you want to delete "${supplier.name}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      await deleteSupplier(supplier.id);
      toast.success('Supplier deleted successfully');
      onSupplierUpdate?.();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('Failed to delete supplier');
    }
  };

  const handleSubmitSupplier = async (data: UpdateSupplierData) => {
    if (!editingSupplier) return;

    try {
      setIsSubmitting(true);
      await updateSupplier(editingSupplier.id, data);
      toast.success('Supplier updated successfully');
      setShowSupplierForm(false);
      setEditingSupplier(null);
      onSupplierUpdate?.();
    } catch (error) {
      console.error('Error updating supplier:', error);
      toast.error('Failed to update supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetails = (supplier: Supplier) => {
    setViewingSupplier(supplier);
    setShowDetailsModal(true);
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]"
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
      onClick={(e) => {
        // Only close if clicking directly on the backdrop, not on child modals
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
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
              <Building className="w-8 h-8 text-white" />
            </div>
            
            {/* Text */}
            <div>
              <h3 id="supplier-modal-title" className="text-2xl font-bold text-gray-900 mb-2">Manage Suppliers</h3>
              <p className="text-sm text-gray-600">View, edit, and manage your suppliers</p>
            </div>
          </div>
        </div>

        {/* Fixed Search Section */}
        <div className="p-6 pb-0 flex-shrink-0">
          <div className="flex gap-3 mb-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search suppliers by name, contact, phone, email..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>

            {/* Country Filter */}
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm bg-white min-w-[150px]"
            >
              <option value="">All Countries</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          {/* Results Count */}
          <div className="text-sm text-gray-600 mb-4">
            {filteredAndSortedSuppliers.length} of {suppliers.length} suppliers
          </div>
        </div>

        {/* Scrollable Suppliers Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedSuppliers.map((supplier) => (
              <div
                key={supplier.id}
                onClick={() => handleViewDetails(supplier)}
                className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-orange-400 hover:shadow-lg transition-all duration-200 flex flex-col cursor-pointer"
              >
                {/* Supplier Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-600 font-bold text-lg">
                      {supplier.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-900 text-sm truncate">{supplier.name}</h4>
                      {(supplier.isActive || supplier.is_active) && (
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    {(supplier.company_name || supplier.contactPerson || supplier.contact_person) && (
                      <p className="text-xs text-gray-600 truncate">
                        {supplier.company_name || supplier.contactPerson || supplier.contact_person}
                      </p>
                    )}
                  </div>
                </div>

                {/* Supplier Stats */}
                <div className="flex items-center justify-between text-xs text-gray-600 mb-3 pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    <span>Orders: <strong>{supplier.ordersCount || 0}</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    {supplier.country && (
                      <>
                        <span>{getCountryFlag(supplier.country)}</span>
                        <span className="font-semibold">{supplier.preferred_currency || supplier.currency || 'TZS'}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                {(supplier.phone || supplier.email) && (
                  <div className="space-y-1 text-xs">
                    {supplier.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-3 h-3" />
                        <span className="truncate">{supplier.phone}</span>
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{supplier.email}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredAndSortedSuppliers.length === 0 && (
            <div className="text-center py-12">
              <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No suppliers found</h3>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
          )}
        </div>

        {/* Footer with Add Button */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            onClick={() => setShowAddSupplierModal(true)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-colors font-semibold shadow-md hover:shadow-lg"
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
        onSuccess={() => {
          setShowAddSupplierModal(false);
          onSupplierUpdate?.();
        }}
      />

      {/* Supplier Details Modal - Higher z-index to appear above ManageSuppliers */}
      {viewingSupplier && showDetailsModal && (
        <div onClick={(e) => e.stopPropagation()}>
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
              onSupplierUpdate?.();
            }}
            onEdit={handleEditSupplier}
          />
        </div>
      )}

      {/* Supplier Edit Form Modal */}
      {showSupplierForm && editingSupplier && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[80]"
          onClick={(e) => e.stopPropagation()}
        >
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

export default ManageSuppliersModal;

