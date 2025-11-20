import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import { PageErrorBoundary } from '../../../features/shared/components/PageErrorBoundary';
import PageHeader from '../components/ui/PageHeader';
import { 
  Package, MapPin, Plus, 
  Building, Tag, Truck, Layers, ArrowRightLeft
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Import tab components
import CategoriesTab from '../components/inventory-management/CategoriesTab';
import EnhancedSupplierManagementPage from '../../settings/pages/EnhancedSupplierManagementPage';
import StoreLocationsTab from '../components/inventory-management/StoreLocationsTab';
import StorageRoomManagementPage from './StorageRoomManagementPage';
import SpecificationsTab from '../components/inventory-management/SpecificationsTab';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import AddProductModal from '../components/product/AddProductModal';

type TabType = 'categories' | 'suppliers' | 'store-locations' | 'storage-room' | 'specifications';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  description: string;
}

const TAB_CONFIGS: TabConfig[] = [
  {
    id: 'categories',
    label: 'Categories',
    icon: Tag,
    color: 'green',
    description: 'Organize products into categories'
  },
  {
    id: 'suppliers',
    label: 'Suppliers',
    icon: Truck,
    color: 'purple',
    description: 'Manage suppliers and vendor relationships'
  },
  {
    id: 'store-locations',
    label: 'Store Locations',
    icon: MapPin,
    color: 'orange',
    description: 'Manage store locations and branches'
  },
  {
    id: 'storage-room',
    label: 'Storage Room',
    icon: Building,
    color: 'indigo',
    description: 'Manage storage rooms and capacity'
  },
  {
    id: 'specifications',
    label: 'Specifications',
    icon: Layers,
    color: 'blue',
    description: 'Manage product specifications and attributes'
  }
];

// Color mapping for tab styles (Tailwind JIT compatible)
const TAB_STYLES: Record<string, { active: string; hover: string }> = {
  green: { active: 'bg-green-500 text-white shadow-lg', hover: 'text-green-600 hover:bg-green-50' },
  purple: { active: 'bg-purple-500 text-white shadow-lg', hover: 'text-purple-600 hover:bg-purple-50' },
  orange: { active: 'bg-orange-500 text-white shadow-lg', hover: 'text-orange-600 hover:bg-orange-50' },
  indigo: { active: 'bg-indigo-500 text-white shadow-lg', hover: 'text-indigo-600 hover:bg-indigo-50' },
  blue: { active: 'bg-blue-500 text-white shadow-lg', hover: 'text-blue-600 hover:bg-blue-50' }
};

const InventoryManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('categories');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // Check user permissions and handle URL parameters
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // Check if user has inventory management permissions
    // Now checks user.permissions array first, then falls back to role
    const hasAccess = currentUser.permissions?.includes('all') || 
                      currentUser.permissions?.includes('view_inventory') ||
                      currentUser.permissions?.includes('edit_settings') ||
                      ['admin', 'customer-care'].includes(currentUser.role);
    
    if (!hasAccess) {
      navigate('/dashboard');
      return;
    }

    // Handle URL parameter for tab selection
    const storageRoomParam = searchParams.get('storage-room');
    const shelvesParam = searchParams.get('shelves'); // backward compatibility
    if (storageRoomParam || shelvesParam) {
      setActiveTab('storage-room');
    }
  }, [currentUser, navigate, searchParams]);

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'categories':
        return <CategoriesTab />;
      case 'suppliers':
        return <EnhancedSupplierManagementPage embedded={true} />;
      case 'store-locations':
        return <StoreLocationsTab />;
      case 'storage-room':
        return <StorageRoomManagementPage />;
      case 'specifications':
        return <SpecificationsTab />;
      default:
        return <CategoriesTab />;
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <PageErrorBoundary pageName="Inventory Management" showDetails={true}>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <PageHeader
          title="Inventory Management"
          subtitle="Manage brands, categories, suppliers, and system settings"
          actions={
            <div className="flex flex-wrap gap-3">
              <GlassButton
                onClick={() => navigate('/lats/unified-inventory')}
                variant="secondary"
                icon={<Package size={18} />}
              >
                Back to Inventory
              </GlassButton>
              <GlassButton
                onClick={() => navigate('/lats/stock-transfers')}
                variant="secondary"
                icon={<ArrowRightLeft size={18} />}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
              >
                Stock Transfers
              </GlassButton>
              <GlassButton
                onClick={() => setShowAddProductModal(true)}
                icon={<Plus size={18} />}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white"
              >
                Add Product
              </GlassButton>
            </div>
          }
        />

        {/* Tab Navigation */}
        <GlassCard className="p-2">
          <div className="flex flex-wrap gap-1">
            {TAB_CONFIGS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const styles = TAB_STYLES[tab.color];
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    isActive
                      ? styles.active
                      : `text-gray-600 ${styles.hover}`
                  }`}
                  title={tab.description}
                >
                  <Icon size={18} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </GlassCard>

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {renderTabContent()}
        </div>
      </div>

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        onProductCreated={() => {
          setShowAddProductModal(false);
          toast.success('Product created successfully');
        }}
      />
    </PageErrorBoundary>
  );
};

export default InventoryManagementPage;
