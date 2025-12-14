import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  X, User, Building, Phone, Mail, MapPin, DollarSign, Star, 
  MessageCircle, Briefcase, CreditCard, Package, Edit, Trash2, CheckCircle
} from 'lucide-react';
import { extractProductCategories, getCategoryColor } from '../../../utils/supplierUtils';
import SupplierOrderHistoryTab from './SupplierOrderHistoryTab';
import { Supplier, deleteSupplier } from '../../../lib/supplierApi';
import GlassTabs from '../../shared/components/ui/GlassTabs';
import { toast } from 'react-hot-toast';

interface SupplierDetailModalProps {
  supplier: Supplier;
  onClose: () => void;
  onUpdate?: () => void;
  onEdit?: (supplier: Supplier) => void;
  onSupplierSelect?: (supplier: Supplier) => void;
}

type TabId = 'overview' | 'orders';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const SupplierDetailModal: React.FC<SupplierDetailModalProps> = ({
  supplier,
  onClose,
  onUpdate,
  onEdit,
  onSupplierSelect
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const contentRef = React.useRef<HTMLDivElement>(null);

  const handleDelete = async () => {
    if (!confirm(`⚠️ Are you sure you want to delete "${supplier.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteSupplier(supplier.id);
      toast.success('Supplier deleted successfully');
      onClose();
      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      toast.error(error.message || 'Failed to delete supplier');
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(supplier);
    } else {
      toast.error('Edit functionality not available');
    }
  };

  const handleSelectSupplier = () => {
    if (onSupplierSelect) {
      onSupplierSelect(supplier);
      onClose();
    } else {
      // Fallback: navigate to PO create page with supplier pre-selected
    navigate(`/lats/purchase-order/create?supplierId=${supplier.id}`);
    toast.success(`Creating purchase order for ${supplier.name}`);
    onClose();
    }
  };

  // Block body scroll when modal is open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: <User size={16} /> },
    { id: 'orders', label: 'Orders', icon: <Briefcase size={16} /> }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <SupplierOverviewTab supplier={supplier} />;
      case 'orders':
        return <SupplierOrderHistoryTab supplierId={supplier.id} supplierName={supplier.name} />;
      default:
        return null;
    }
  };

  return createPortal(
    <div 
      className="fixed bg-black/60 flex items-center justify-center p-4 z-[99999]" 
      style={{ top: 0, left: 0, right: 0, bottom: 0 }}
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="supplier-detail-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
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
              <h3 id="supplier-detail-modal-title" className="text-2xl font-bold text-gray-900 mb-2">
                {supplier.name}
              </h3>
              <p className="text-sm text-gray-600">{supplier.company_name || 'Supplier Details'}</p>
            </div>
          </div>
        </div>

        {/* Modern Tab Navigation */}
        <div className="px-6 pt-4 pb-0 bg-white flex-shrink-0">
          <GlassTabs
            tabs={tabs.map(tab => ({
              id: tab.id,
              label: tab.label,
              icon: tab.icon,
              badge: tab.badge
            }))}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as TabId)}
            variant="modern"
            size="sm"
          />
        </div>

        {/* Scrollable Content */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto px-6 py-4"
          style={{ minHeight: 0 }}
        >
          {renderTabContent()}
        </div>

        {/* Fixed Action Buttons Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSelectSupplier}
              className="flex-1 px-6 py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl text-lg flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Select Supplier
            </button>
            <button
              type="button"
              onClick={handleEdit}
              className="px-6 py-3.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl text-lg flex items-center justify-center gap-2"
            >
              <Edit className="w-5 h-5" />
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-6 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl text-lg flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Delete
            </button>
        </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Overview Tab Component
const SupplierOverviewTab: React.FC<{ supplier: Supplier }> = ({ supplier }) => {
  const supplierExtended = supplier as any;
  const [viewingQR, setViewingQR] = useState<{ type: 'wechat' | 'alipay'; url: string } | null>(null);
  const categories = extractProductCategories(supplier.notes);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border-2 border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="w-5 h-5 text-orange-600" />
            <span className="text-xs font-semibold text-orange-700">Orders</span>
          </div>
          <div className="text-2xl font-bold text-orange-900">
            {supplierExtended.total_orders || supplierExtended.ordersCount || 0}
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-green-600" />
            <span className="text-xs font-semibold text-green-700">Rating</span>
          </div>
          <div className="text-2xl font-bold text-green-900">
            {supplierExtended.average_rating || supplier.rating ? Number(supplierExtended.average_rating || supplier.rating).toFixed(1) : '0.0'}
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700">Currency</span>
          </div>
          <div className="text-lg font-bold text-blue-900">
            {supplier.preferred_currency || supplier.currency || 'TZS'}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
      {/* Contact Information */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="w-5 h-5 text-orange-600" />
              <h4 className="text-base font-bold text-gray-900">Contact Information</h4>
        </div>
            <div className="space-y-3">
          {supplier.contact_person && (
            <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">{supplier.contact_person}</span>
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">{supplier.phone}</span>
            </div>
          )}
          {supplier.email && (
            <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">{supplier.email}</span>
            </div>
          )}
          {supplier.whatsapp && (
            <div className="flex items-center gap-3">
                  <MessageCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-900">{supplier.whatsapp}</span>
            </div>
          )}
          {supplierExtended.wechat && (
            <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-[#09B83E] rounded flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="white">
                  <path d="M8.5 6c-2.8 0-5 1.9-5 4.3 0 1.4.7 2.6 1.8 3.4l-.5 1.5 1.7-.9c.6.2 1.3.3 2 .3 2.8 0 5-1.9 5-4.3S11.3 6 8.5 6zm-1 5.8c-.4 0-.8-.3-.8-.8s.3-.8.8-.8.8.3.8.8-.4.8-.8.8zm2.5 0c-.4 0-.8-.3-.8-.8s.3-.8.8-.8.8.3.8.8-.4.8-.8.8z"/>
                  <path d="M15.5 11c-.3 0-.5 0-.8.1 0 .1 0 .3 0 .4 0 2.9-2.6 5.2-5.7 5.2-.4 0-.7 0-1.1-.1 1 1.3 2.8 2.2 4.9 2.2.5 0 1-.1 1.5-.2l1.3.7-.4-1.2c.9-.6 1.5-1.6 1.5-2.7 0-1.8-1.5-3.4-3.2-4.4z"/>
                </svg>
              </div>
                  <span className="text-sm font-medium text-gray-900">{supplierExtended.wechat}</span>
              </div>
              )}
              {supplier.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <span className="text-sm font-medium text-gray-900">{supplier.address}</span>
            </div>
          )}
              {(supplier.city || supplier.country) && !supplier.address && (
            <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {supplier.city && supplier.country ? `${supplier.city}, ${supplier.country}` : supplier.city || supplier.country}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Methods (China Suppliers) */}
          {supplier.country === 'China' && (supplierExtended.wechat_qr_code || supplierExtended.alipay_qr_code) && (
            <div className="bg-white border-2 border-orange-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-orange-600" />
                <h4 className="text-base font-bold text-gray-900">Payment Methods</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {supplierExtended.wechat_qr_code && (
                  <div 
                    onClick={() => setViewingQR({ type: 'wechat', url: supplierExtended.wechat_qr_code })}
                    className="cursor-pointer bg-green-50 rounded-lg p-3 border-2 border-green-200 hover:border-green-400 transition-all"
                  >
                    <div className="text-xs font-semibold text-green-700 mb-2">WeChat Pay</div>
                    <img src={supplierExtended.wechat_qr_code} alt="WeChat QR" className="w-full h-24 object-contain rounded" />
                  </div>
                )}
                {supplierExtended.alipay_qr_code && (
                  <div 
                    onClick={() => setViewingQR({ type: 'alipay', url: supplierExtended.alipay_qr_code })}
                    className="cursor-pointer bg-blue-50 rounded-lg p-3 border-2 border-blue-200 hover:border-blue-400 transition-all"
                  >
                    <div className="text-xs font-semibold text-blue-700 mb-2">Alipay</div>
                    <img src={supplierExtended.alipay_qr_code} alt="Alipay QR" className="w-full h-24 object-contain rounded" />
            </div>
          )}
              </div>
            </div>
          )}

          {/* Product Categories */}
          {categories.length > 0 && (
            <div className="bg-white border-2 border-purple-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-purple-600" />
                <h4 className="text-base font-bold text-gray-900">Product Categories</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((category, idx) => (
                  <span
                    key={idx}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-lg border ${getCategoryColor(category)}`}
                >
                    {category}
                  </span>
                ))}
              </div>
            </div>
          )}
      </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Business Information */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building className="w-5 h-5 text-orange-600" />
              <h4 className="text-base font-bold text-gray-900">Business Information</h4>
            </div>
            <div className="space-y-3">
              {supplier.company_name && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Company Name</div>
                  <div className="text-sm font-semibold text-gray-900">{supplier.company_name}</div>
                  </div>
                    )}
              {supplier.country && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Country</div>
                  <div className="text-sm font-semibold text-gray-900">{supplier.country}</div>
                  </div>
              )}
              {supplier.preferred_currency && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Currency</div>
                  <div className="text-sm font-semibold text-gray-900">{supplier.preferred_currency}</div>
                </div>
              )}
              {supplier.payment_terms && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Payment Terms</div>
                  <div className="text-sm font-semibold text-gray-900">{supplier.payment_terms}</div>
                </div>
              )}
              {supplier.tax_id && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Tax ID</div>
                  <div className="text-sm font-semibold text-gray-900">{supplier.tax_id}</div>
              </div>
            )}
              {supplier.exchange_rate && supplier.preferred_currency && supplier.preferred_currency !== 'TZS' && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Exchange Rate</div>
                  <div className="text-sm font-semibold text-gray-900">
                    1 {supplier.preferred_currency} = {supplier.exchange_rate} TZS
                  </div>
                </div>
              )}
              {(supplierExtended.leadTimeDays || supplierExtended.lead_time_days) && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Lead Time</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {supplierExtended.leadTimeDays || supplierExtended.lead_time_days} days
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bank Account Details (China Suppliers) */}
          {supplier.country === 'China' && supplierExtended.bank_account_details && (
            <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-orange-600" />
                <h4 className="text-base font-bold text-gray-900">Bank Account Details</h4>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                    {supplierExtended.bank_account_details}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* QR Code Modal */}
        {viewingQR && (
          <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100000] p-4"
            onClick={() => setViewingQR(null)}
          >
            <div 
            className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setViewingQR(null)}
              className="absolute -top-3 -right-3 w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all flex items-center justify-center"
              >
              <X className="w-5 h-5" />
              </button>
              <div className="text-center mb-4">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                viewingQR.type === 'wechat' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                <span className="font-bold text-sm">
                  {viewingQR.type === 'wechat' ? 'WeChat Pay QR Code' : 'Alipay QR Code'}
                </span>
              </div>
            </div>
              <div className={`p-6 rounded-xl ${
                viewingQR.type === 'wechat' 
                  ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-300' 
                  : 'bg-gradient-to-br from-blue-50 to-cyan-100 border-2 border-blue-300'
              }`}>
                <img 
                  src={viewingQR.url} 
                  alt={`${viewingQR.type === 'wechat' ? 'WeChat' : 'Alipay'} QR Code`}
                  className="w-full h-auto rounded-lg shadow-lg"
                />
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Note: SupplierOrderHistoryTab and SupplierFinancialTab are now imported from separate files

export default SupplierDetailModal;

