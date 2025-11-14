import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, User, Building, Phone, Mail, MapPin, DollarSign, Star, 
  FileText, MessageCircle, Award, Calendar, Globe, Briefcase, CreditCard, Package, ChevronDown, Edit, Trash2, Plus, ShoppingCart
} from 'lucide-react';
import { extractProductCategories, getCategoryColor } from '../../../utils/supplierUtils';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import SupplierDocumentsTab from './SupplierDocumentsTab';
import SupplierCommunicationTab from './SupplierCommunicationTab';
import SupplierRatingTab from './SupplierRatingTab';
import SupplierContractTab from './SupplierContractTab';
import SupplierOrderHistoryTab from './SupplierOrderHistoryTab';
import SupplierFinancialTab from './SupplierFinancialTab';
import { Supplier, deleteSupplier } from '../../../lib/supplierApi';
import { toast } from 'react-hot-toast';

interface SupplierDetailModalProps {
  supplier: Supplier;
  onClose: () => void;
  onUpdate?: () => void;
  onEdit?: (supplier: Supplier) => void;
}

type TabId = 'overview' | 'documents' | 'communications' | 'ratings' | 'contracts' | 'orders' | 'financial';

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
  onEdit
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isScrolled, setIsScrolled] = useState(false);
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

  const handleCreatePO = () => {
    // Navigate to PO create page with supplier pre-selected
    navigate(`/lats/purchase-order/create?supplierId=${supplier.id}`);
    toast.success(`Creating purchase order for ${supplier.name}`);
    onClose();
  };

  // Detect scroll for shadow effect
  React.useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLDivElement;
      setIsScrolled(target.scrollTop > 20);
    };

    const contentEl = contentRef.current;
    if (contentEl) {
      contentEl.addEventListener('scroll', handleScroll);
      return () => contentEl.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: <User size={16} /> },
    { id: 'documents', label: 'Documents', icon: <FileText size={16} /> },
    { id: 'communications', label: 'Communications', icon: <MessageCircle size={16} /> },
    { id: 'ratings', label: 'Ratings', icon: <Star size={16} /> },
    { id: 'contracts', label: 'Contracts', icon: <Award size={16} /> },
    { id: 'orders', label: 'Orders', icon: <Briefcase size={16} /> },
    { id: 'financial', label: 'Financial', icon: <DollarSign size={16} /> }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <SupplierOverviewTab supplier={supplier} />;
      case 'documents':
        return <SupplierDocumentsTab supplierId={supplier.id} supplierName={supplier.name} />;
      case 'communications':
        return <SupplierCommunicationTab supplierId={supplier.id} supplierName={supplier.name} />;
      case 'ratings':
        return <SupplierRatingTab supplierId={supplier.id} supplierName={supplier.name} />;
      case 'contracts':
        return <SupplierContractTab supplierId={supplier.id} supplierName={supplier.name} />;
      case 'orders':
        return <SupplierOrderHistoryTab supplierId={supplier.id} supplierName={supplier.name} />;
      case 'financial':
        return <SupplierFinancialTab supplier={supplier} onUpdate={onUpdate} />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Backdrop - respects sidebar and topbar */}
      <div 
        className="fixed bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        style={{
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0,
          zIndex: 35
        }}
      />
      
      {/* Modal Container */}
      <div 
        className="fixed flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
        style={{
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0,
          zIndex: 50,
          pointerEvents: 'none'
        }}
      >
        <div 
          className="relative bg-white rounded-lg sm:rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col my-2 sm:my-4 animate-scale-in"
          onClick={(e) => e.stopPropagation()}
          style={{ pointerEvents: 'auto' }}
        >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 animate-slide-up">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">{supplier.name}</h2>
                {supplier.country && (
                  <span className="text-sm px-2 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                    {supplier.country}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-500">{supplier.company_name || 'Supplier Details'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Create PO Button */}
            <button
              onClick={handleCreatePO}
              className="p-2.5 bg-orange-500/90 hover:bg-orange-600 text-white rounded-lg shadow-lg backdrop-blur-sm transition-all duration-200 transform hover:scale-105 hidden sm:flex items-center gap-2"
              title="Create purchase order with this supplier"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Create PO</span>
            </button>
            {/* Create PO Button (Mobile - Icon only) */}
            <button
              onClick={handleCreatePO}
              className="p-2.5 bg-orange-500/90 hover:bg-orange-600 text-white rounded-lg shadow-lg backdrop-blur-sm transition-all duration-200 transform hover:scale-105 flex sm:hidden"
              title="Create purchase order"
            >
              <ShoppingCart className="w-5 h-5" />
            </button>
            {/* Edit Button */}
            <button
              onClick={handleEdit}
              className="p-2.5 bg-blue-500/90 hover:bg-blue-600 text-white rounded-lg shadow-lg backdrop-blur-sm transition-all duration-200 transform hover:scale-105 hidden sm:flex items-center gap-2"
              title="Edit supplier"
            >
              <Edit className="w-4 h-4" />
              <span className="text-sm font-medium">Edit</span>
            </button>
            {/* Edit Button (Mobile - Icon only) */}
            <button
              onClick={handleEdit}
              className="p-2.5 bg-blue-500/90 hover:bg-blue-600 text-white rounded-lg shadow-lg backdrop-blur-sm transition-all duration-200 transform hover:scale-105 flex sm:hidden"
              title="Edit supplier"
            >
              <Edit className="w-5 h-5" />
            </button>
            {/* Delete Button */}
            <button
              onClick={handleDelete}
              className="p-2.5 bg-red-500/90 hover:bg-red-600 text-white rounded-lg shadow-lg backdrop-blur-sm transition-all duration-200 transform hover:scale-105 hidden sm:flex items-center gap-2"
              title="Delete supplier"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-medium">Delete</span>
            </button>
            {/* Delete Button (Mobile - Icon only) */}
            <button
              onClick={handleDelete}
              className="p-2.5 bg-red-500/90 hover:bg-red-600 text-white rounded-lg shadow-lg backdrop-blur-sm transition-all duration-200 transform hover:scale-105 flex sm:hidden"
              title="Delete supplier"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            {/* Close Button */}
          <button
            onClick={onClose}
              className="p-2.5 bg-gray-500/90 hover:bg-gray-600 text-white rounded-full shadow-lg backdrop-blur-sm transition-all duration-200 transform hover:scale-110"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-white">
          <div className="flex w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-fit py-2 sm:py-3 px-3 sm:px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                {tab.badge && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                    {tab.badge}
                  </span>
                )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 scroll-smooth p-4 sm:p-6"
          style={{ minHeight: 0 }}
        >
          {renderTabContent()}
        </div>
        </div>
      </div>
    </>
  );
};

// Overview Tab Component
const SupplierOverviewTab: React.FC<{ supplier: Supplier }> = ({ supplier }) => {
  const supplierExtended = supplier as any;
  const [viewingQR, setViewingQR] = useState<{ type: 'wechat' | 'alipay'; url: string } | null>(null);
  const [isPaymentExpanded, setIsPaymentExpanded] = useState(false);

  return (
    <div className="space-y-6">
      {/* Quick Stats - Full Width */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-medium text-blue-700 uppercase">Orders</span>
          </div>
          <div className="text-3xl font-bold text-blue-900">
            {supplierExtended.total_orders || 0}
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-green-600" />
            <span className="text-xs font-medium text-green-700 uppercase">Rating</span>
          </div>
          <div className="text-3xl font-bold text-green-900">
            {supplierExtended.average_rating ? Number(supplierExtended.average_rating).toFixed(1) : '0.0'}
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            <span className="text-xs font-medium text-purple-700 uppercase">On-Time</span>
          </div>
          <div className="text-3xl font-bold text-purple-900">
            {supplierExtended.on_time_delivery_rate ? Number(supplierExtended.on_time_delivery_rate).toFixed(0) : '0'}%
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-5 h-5 text-orange-600" />
            <span className="text-xs font-medium text-orange-700 uppercase">Response</span>
          </div>
          <div className="text-2xl font-bold text-orange-900">
            {supplierExtended.response_time_hours ? Number(supplierExtended.response_time_hours).toFixed(1) : '0'}h
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">

      {/* Contact Information */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
          <Phone className="w-5 h-5 text-blue-600" />
          <h4 className="text-base font-semibold text-gray-800">Contact Information</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {supplier.contact_person && (
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-600">Contact Person</div>
                <div className="font-medium text-gray-900">{supplier.contact_person}</div>
              </div>
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-600">Phone</div>
                <div className="font-medium text-gray-900">{supplier.phone}</div>
              </div>
            </div>
          )}
          {supplier.email && (
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-600">Email</div>
                <div className="font-medium text-gray-900">{supplier.email}</div>
              </div>
            </div>
          )}
          {supplier.whatsapp && (
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-sm text-gray-600">WhatsApp</div>
                <div className="font-medium text-gray-900">{supplier.whatsapp}</div>
              </div>
            </div>
          )}
          {supplierExtended.wechat && (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-[#09B83E] rounded flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="white">
                  <path d="M8.5 6c-2.8 0-5 1.9-5 4.3 0 1.4.7 2.6 1.8 3.4l-.5 1.5 1.7-.9c.6.2 1.3.3 2 .3 2.8 0 5-1.9 5-4.3S11.3 6 8.5 6zm-1 5.8c-.4 0-.8-.3-.8-.8s.3-.8.8-.8.8.3.8.8-.4.8-.8.8zm2.5 0c-.4 0-.8-.3-.8-.8s.3-.8.8-.8.8.3.8.8-.4.8-.8.8z"/>
                  <path d="M15.5 11c-.3 0-.5 0-.8.1 0 .1 0 .3 0 .4 0 2.9-2.6 5.2-5.7 5.2-.4 0-.7 0-1.1-.1 1 1.3 2.8 2.2 4.9 2.2.5 0 1-.1 1.5-.2l1.3.7-.4-1.2c.9-.6 1.5-1.6 1.5-2.7 0-1.8-1.5-3.4-3.2-4.4z"/>
                </svg>
              </div>
              <div>
                <div className="text-sm text-gray-600">WeChat ID</div>
                <div className="font-medium text-gray-900">{supplierExtended.wechat}</div>
              </div>
            </div>
          )}
          {supplier.city && (
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-600">City</div>
                <div className="font-medium text-gray-900">{supplier.city}</div>
              </div>
            </div>
          )}
          {supplier.address && (
            <div className="flex items-center gap-3">
              <Building className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-600">Address</div>
                <div className="font-medium text-gray-900">{supplier.address}</div>
              </div>
            </div>
          )}
          {supplierExtended.website_url && (
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-600">Website</div>
                <a 
                  href={supplierExtended.website_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline"
                >
                  {supplierExtended.website_url}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Information (Chinese Suppliers) */}
      {supplier.country === 'China' && (
        supplierExtended.wechat_qr_code || 
        supplierExtended.alipay_qr_code || 
        supplierExtended.bank_account_details || 
        supplier.wechat
      ) && (
        <>
        <div className="bg-gradient-to-br from-red-50 via-pink-50 to-orange-50 border-2 border-red-200 rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => setIsPaymentExpanded(!isPaymentExpanded)}
            className="w-full flex items-center gap-2 p-6 hover:bg-red-100/50 transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <h4 className="text-base font-bold text-gray-800">Payment Methods</h4>
            <span className="ml-auto text-xs bg-gradient-to-r from-red-600 to-red-700 text-white px-3 py-1.5 rounded-full font-bold shadow-sm">
              🇨🇳 China
            </span>
            <ChevronDown 
              className={`w-5 h-5 text-red-600 transition-transform duration-300 flex-shrink-0 ${
                isPaymentExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
          
          {isPaymentExpanded && (
          <div className="px-6 pb-6 pt-2 border-t-2 border-red-200 animate-slide-down">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* WeChat Pay QR Code */}
            {supplierExtended.wechat_qr_code && (
              <div className="bg-white rounded-xl p-4 border-2 border-green-200 hover:border-green-400 transition-all shadow-sm hover:shadow-md">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 bg-[#09B83E] rounded-lg flex items-center justify-center shadow-sm">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="white">
                      <path d="M8.5 6c-2.8 0-5 1.9-5 4.3 0 1.4.7 2.6 1.8 3.4l-.5 1.5 1.7-.9c.6.2 1.3.3 2 .3 2.8 0 5-1.9 5-4.3S11.3 6 8.5 6zm-1 5.8c-.4 0-.8-.3-.8-.8s.3-.8.8-.8.8.3.8.8-.4.8-.8.8zm2.5 0c-.4 0-.8-.3-.8-.8s.3-.8.8-.8.8.3.8.8-.4.8-.8.8z"/>
                      <path d="M15.5 11c-.3 0-.5 0-.8.1 0 .1 0 .3 0 .4 0 2.9-2.6 5.2-5.7 5.2-.4 0-.7 0-1.1-.1 1 1.3 2.8 2.2 4.9 2.2.5 0 1-.1 1.5-.2l1.3.7-.4-1.2c.9-.6 1.5-1.6 1.5-2.7 0-1.8-1.5-3.4-3.2-4.4z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h5 className="text-sm font-bold text-gray-800">WeChat Pay</h5>
                    {supplier.wechat && (
                      <p className="text-xs text-green-600 font-medium">{supplier.wechat}</p>
                    )}
                  </div>
                </div>
                <div 
                  onClick={() => setViewingQR({ type: 'wechat', url: supplierExtended.wechat_qr_code })}
                  className="relative bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border-2 border-green-200 cursor-pointer hover:scale-105 transition-transform group"
                >
                  <img 
                    src={supplierExtended.wechat_qr_code} 
                    alt="WeChat QR" 
                    className="w-full h-32 object-contain rounded"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg flex items-center justify-center transition-all">
                    <div className="opacity-0 group-hover:opacity-100 bg-white/95 rounded-full p-2 shadow-lg transition-opacity">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-center text-green-700 font-semibold mt-2">📱 Click to enlarge</p>
              </div>
            )}

            {/* Alipay QR Code */}
            {supplierExtended.alipay_qr_code && (
              <div className="bg-white rounded-xl p-4 border-2 border-blue-200 hover:border-blue-400 transition-all shadow-sm hover:shadow-md">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 bg-[#1677FF] rounded-lg flex items-center justify-center shadow-sm">
                    <span className="text-white text-sm font-bold">支</span>
                  </div>
                  <div className="flex-1">
                    <h5 className="text-sm font-bold text-gray-800">Alipay</h5>
                    <p className="text-xs text-blue-600 font-medium">Available</p>
                  </div>
                </div>
                <div 
                  onClick={() => setViewingQR({ type: 'alipay', url: supplierExtended.alipay_qr_code })}
                  className="relative bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-3 border-2 border-blue-200 cursor-pointer hover:scale-105 transition-transform group"
                >
                  <img 
                    src={supplierExtended.alipay_qr_code} 
                    alt="Alipay QR" 
                    className="w-full h-32 object-contain rounded"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg flex items-center justify-center transition-all">
                    <div className="opacity-0 group-hover:opacity-100 bg-white/95 rounded-full p-2 shadow-lg transition-opacity">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-center text-blue-700 font-semibold mt-2">📱 Click to enlarge</p>
              </div>
            )}

            {/* Bank Account Details */}
            {supplierExtended.bank_account_details && (
              <div className="md:col-span-2 bg-white rounded-xl p-4 border-2 border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center shadow-sm">
                    <DollarSign className="w-4 h-4 text-white" />
                  </div>
                  <h5 className="text-sm font-bold text-gray-800">Bank Transfer Details</h5>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-lg p-4 border-2 border-gray-200">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                    {supplierExtended.bank_account_details}
                  </pre>
                </div>
              </div>
            )}
          </div>
          </div>
          )}
        </div>

        {/* QR Code Modal */}
        {viewingQR && (
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={() => setViewingQR(null)}
          >
            <div 
              className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setViewingQR(null)}
                className="absolute -top-3 -right-3 w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all flex items-center justify-center group"
              >
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              </button>
              
              <div className="text-center mb-4">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                  viewingQR.type === 'wechat' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {viewingQR.type === 'wechat' ? (
                    <>
                      <div className="w-5 h-5 bg-[#09B83E] rounded flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="white">
                          <path d="M8.5 6c-2.8 0-5 1.9-5 4.3 0 1.4.7 2.6 1.8 3.4l-.5 1.5 1.7-.9c.6.2 1.3.3 2 .3 2.8 0 5-1.9 5-4.3S11.3 6 8.5 6zm-1 5.8c-.4 0-.8-.3-.8-.8s.3-.8.8-.8.8.3.8.8-.4.8-.8.8zm2.5 0c-.4 0-.8-.3-.8-.8s.3-.8.8-.8.8.3.8.8-.4.8-.8.8z"/>
                          <path d="M15.5 11c-.3 0-.5 0-.8.1 0 .1 0 .3 0 .4 0 2.9-2.6 5.2-5.7 5.2-.4 0-.7 0-1.1-.1 1 1.3 2.8 2.2 4.9 2.2.5 0 1-.1 1.5-.2l1.3.7-.4-1.2c.9-.6 1.5-1.6 1.5-2.7 0-1.8-1.5-3.4-3.2-4.4z"/>
                        </svg>
                      </div>
                      <span className="font-bold text-sm">WeChat Pay QR Code</span>
                    </>
                  ) : (
                    <>
                      <div className="w-5 h-5 bg-[#1677FF] rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">支</span>
                      </div>
                      <span className="font-bold text-sm">Alipay QR Code</span>
                    </>
                  )}
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
              
              <p className="text-center text-sm text-gray-600 mt-4 font-medium">
                📱 Scan this code to make payment
              </p>
            </div>
          </div>
        )}
        </>
      )}

      {/* Additional Notes */}
      {(() => {
        // Extract additional notes (excluding product categories and payment info)
        let additionalNotes = supplier.notes || '';
        
        // Remove product categories section
        additionalNotes = additionalNotes.replace(/Product Categories:.*?(\n\n|$)/s, '');
        
        // Remove payment information section
        additionalNotes = additionalNotes.replace(/Payment Information:.*?$/s, '');
        
        // Trim whitespace
        additionalNotes = additionalNotes.trim();
        
        return additionalNotes && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
              <FileText className="w-5 h-5 text-gray-600" />
              <h4 className="text-base font-semibold text-gray-800">Additional Notes</h4>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{additionalNotes}</p>
            </div>
          </div>
        );
      })()}
      </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Business Information */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
            <Building className="w-5 h-5 text-indigo-600" />
            <h4 className="text-base font-semibold text-gray-800">Business Info</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {supplier.company_name && (
              <div className="flex items-center gap-3">
                <Building className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-600">Company</div>
                  <div className="font-medium text-gray-900">{supplier.company_name}</div>
                </div>
              </div>
            )}
            {supplier.country && (
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="text-sm text-gray-600">Country</div>
                  <div className="font-medium text-gray-900">{supplier.country}</div>
                </div>
              </div>
            )}
            {supplier.preferred_currency && (
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-green-500" />
                <div>
                  <div className="text-sm text-gray-600">Currency</div>
                  <div className="font-medium text-gray-900">{supplier.preferred_currency}</div>
                </div>
              </div>
            )}
            {supplier.tax_id && (
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-purple-500" />
                <div>
                  <div className="text-sm text-gray-600">Tax ID</div>
                  <div className="font-medium text-gray-900">{supplier.tax_id}</div>
                </div>
              </div>
            )}
            {supplier.payment_terms && (
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-orange-500" />
                <div>
                  <div className="text-sm text-gray-600">Payment Terms</div>
                  <div className="font-medium text-gray-900">{supplier.payment_terms}</div>
                </div>
              </div>
            )}
            {supplierExtended.priority_level && (
              <div className="flex items-center gap-3">
                <Star className={`w-5 h-5 ${
                  supplierExtended.priority_level === 'premium' 
                    ? 'text-yellow-500 fill-current'
                    : 'text-gray-400'
                }`} />
                <div>
                  <div className="text-sm text-gray-600">Priority Level</div>
                  <div className="font-medium text-gray-900 capitalize flex items-center gap-1">
                    {supplierExtended.priority_level}
                    {supplierExtended.priority_level === 'premium' && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">VIP</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Products & Specialization */}
        {(() => {
          const categories = extractProductCategories(supplier.notes);
          return categories.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-purple-200">
                <Package className="w-6 h-6 text-purple-600" />
                <h4 className="text-base font-semibold text-gray-800">Products & Specialization</h4>
                <span className="ml-auto text-xs bg-purple-600 text-white px-3 py-1 rounded-full font-semibold">
                  {categories.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((category, idx) => (
                  <span
                    key={idx}
                    className={`px-3 py-2 text-sm font-semibold rounded-lg border-2 shadow-sm hover:shadow-md transition-shadow ${getCategoryColor(category)}`}
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}
        </div>
      </div>
    </div>
  );
};

// Note: SupplierOrderHistoryTab and SupplierFinancialTab are now imported from separate files

export default SupplierDetailModal;

