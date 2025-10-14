import React, { useState, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import GlassCard from '../../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../../features/shared/components/ui/GlassButton';
import { X, Save, Settings, Search } from 'lucide-react';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';
import { useAuth } from '../../../../context/AuthContext';

// Import settings tabs - NEW SIMPLIFIED STRUCTURE (6 tabs now)
import GeneralSettingsTab from './GeneralSettingsTab';
import DynamicPricingSimplifiedTab from './DynamicPricingSimplifiedTab';
import ImprovedReceiptSettings from './ImprovedReceiptSettings';
import FeaturesTab from './FeaturesTab';
import UserPermissionsSimplifiedTab from './UserPermissionsSimplifiedTab';
import NotificationsSettingsTab from './NotificationsSettingsTab';

// Import hooks - Simplified (REMOVED - not needed, tabs manage their own settings)
// import { 
//   useGeneralSettings,
//   useReceiptSettings,
// } from '../../../../hooks/usePOSSettings';

interface POSSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export interface POSSettingsModalRef {
  saveCurrentTabSettings: () => Promise<boolean>;
}

const POSSettingsModal = forwardRef<POSSettingsModalRef, POSSettingsModalProps>(
  ({ isOpen, onClose, activeTab, onTabChange }, ref) => {
    const { currentUser } = useAuth();
    const userRole = currentUser?.role || 'customer-care';
    const isAdmin = userRole === 'admin';
    
    const [activeSettingsTab, setActiveSettingsTab] = useState(activeTab || (isAdmin ? 'general' : 'receipt'));
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Sync internal state with prop when it changes
    React.useEffect(() => {
      if (activeTab && activeTab !== activeSettingsTab) {
        setActiveSettingsTab(activeTab);
      }
    }, [activeTab, activeSettingsTab]);

    // Settings refs to access current settings from tabs
    const generalSettingsRef = useRef<any>(null);
    const pricingSettingsRef = useRef<any>(null);
    const receiptSettingsRef = useRef<any>(null);
    const featuresSettingsRef = useRef<any>(null);
    const permissionsSettingsRef = useRef<any>(null);
    const notificationsSettingsRef = useRef<any>(null);

    // Settings tabs data - 6 TABS (memoized to prevent recreating on every render)
    // Role-based filtering: customer-care only sees receipts and notifications
    const allSettingsTabs = useMemo(() => [
      { id: 'general', name: '🏪 General', keywords: ['interface', 'theme', 'language', 'currency', 'display', 'barcode', 'scanner', 'security', 'passcode'], roles: ['admin'] },
      { id: 'pricing', name: '💰 Pricing & Discounts', keywords: ['pricing', 'discount', 'happy hour', 'bulk', 'loyalty', 'promotions'], roles: ['admin'] },
      { id: 'receipt', name: '🧾 Receipts', keywords: ['receipt', 'print', 'template', 'logo', 'format'], roles: ['admin', 'customer-care'] },
      { id: 'notifications', name: '📢 Notifications', keywords: ['notifications', 'alerts', 'whatsapp', 'sms', 'email', 'invoice', 'send', 'auto', 'manual'], roles: ['admin', 'customer-care'] },
      { id: 'features', name: '📦 Features', keywords: ['features', 'delivery', 'loyalty', 'customer', 'payment tracking', 'enable', 'disable'], roles: ['admin'] },
      { id: 'permissions', name: '👥 Users & Permissions', keywords: ['permissions', 'access', 'user', 'role', 'security', 'cashier', 'manager', 'admin'], roles: ['admin'] }
    ], []);
    
    // Filter tabs based on user role
    const settingsTabs = useMemo(() => {
      return allSettingsTabs.filter(tab => tab.roles.includes(userRole));
    }, [allSettingsTabs, userRole]);

    // Filter tabs based on search query
    const filteredTabs = useMemo(() => {
      if (!searchQuery.trim()) {
        return settingsTabs;
      }
      
      const query = searchQuery.toLowerCase();
      const filtered = settingsTabs.filter(tab =>
        tab.name.toLowerCase().includes(query) ||
        tab.keywords.some(keyword => keyword.includes(query))
      );
      
      return filtered;
    }, [searchQuery, settingsTabs]);

    // Function to save current active tab settings
    const saveCurrentTabSettings = async () => {
      setIsSavingSettings(true);
      
      try {
        // Simplified save function - tabs handle their own saving
        switch (activeSettingsTab) {
          case 'general':
            console.log('  - Checking generalSettingsRef:', !!generalSettingsRef.current);
            if (generalSettingsRef.current?.saveSettings) {
              console.log('  ✅ Calling generalSettingsRef.saveSettings()');
              return await generalSettingsRef.current.saveSettings();
            }
            break;
          case 'pricing':
            console.log('  - Checking pricingSettingsRef:', !!pricingSettingsRef.current);
            if (pricingSettingsRef.current?.saveSettings) {
              console.log('  ✅ Calling pricingSettingsRef.saveSettings()');
              return await pricingSettingsRef.current.saveSettings();
            }
            break;
          case 'receipt':
            console.log('  - Checking receiptSettingsRef:', !!receiptSettingsRef.current);
            if (receiptSettingsRef.current?.saveSettings) {
              console.log('  ✅ Calling receiptSettingsRef.saveSettings()');
              return await receiptSettingsRef.current.saveSettings();
            }
            break;
          case 'features':
            console.log('  - Checking featuresSettingsRef:', !!featuresSettingsRef.current);
            if (featuresSettingsRef.current?.saveSettings) {
              console.log('  ✅ Calling featuresSettingsRef.saveSettings()');
              return await featuresSettingsRef.current.saveSettings();
            }
            break;
          case 'permissions':
            console.log('  - Checking permissionsSettingsRef:', !!permissionsSettingsRef.current);
            if (permissionsSettingsRef.current?.saveSettings) {
              console.log('  ✅ Calling permissionsSettingsRef.saveSettings()');
              return await permissionsSettingsRef.current.saveSettings();
            }
            break;
          case 'notifications':
            console.log('  - Checking notificationsSettingsRef:', !!notificationsSettingsRef.current);
            if (notificationsSettingsRef.current?.saveSettings) {
              console.log('  ✅ Calling notificationsSettingsRef.saveSettings()');
              return await notificationsSettingsRef.current.saveSettings();
            }
            break;
          default:
            console.error('  ❌ Unknown settings tab:', activeSettingsTab);
            toast.error(`Unknown settings tab: ${activeSettingsTab}`);
            return false;
        }

        // If we get here, no save function was found
        console.error('  ❌ No save function available for tab:', activeSettingsTab);
        throw new Error(`No save function available for ${activeSettingsTab} settings`);
      } catch (error) {
        console.error('  ❌ Save failed:', error);
        toast.error(`Failed to save ${activeSettingsTab} settings. Please try again.`);
        return false;
      } finally {
        console.log('  - Setting isSavingSettings to false');
        setIsSavingSettings(false);
      }
    };

    // Expose save function to parent component
    useImperativeHandle(ref, () => ({
      saveCurrentTabSettings
    }));

    // Prevent body scroll when modal is open
    useBodyScrollLock(isOpen);

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <GlassCard className="w-full max-w-6xl p-8 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">POS Settings</h2>
            </div>
            <div className="flex items-center gap-3">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search settings..."
                  value={searchQuery}
                  onChange={(e) => {
                    console.log('🔍 Search query changed:', e.target.value);
                    setSearchQuery(e.target.value);
                  }}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                />
              </div>
              <button
                onClick={() => {
                  console.log('❌ Close button clicked');
                  onClose();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Settings Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
            {filteredTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSettingsTab(tab.id);
                  onTabChange?.(tab.id);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeSettingsTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.name}
              </button>
            ))}
            
            {filteredTabs.length === 0 && searchQuery && (
              <div className="text-gray-500 text-sm py-2">
                No settings found matching "{searchQuery}"
              </div>
            )}
          </div>

          {/* Settings Content */}
          <div className="min-h-[400px]">
            {/* ============================================ */}
            {/* UPDATED STRUCTURE - 6 TABS */}
            {/* ============================================ */}
            
            {/* 1. General Settings Tab */}
            {activeSettingsTab === 'general' && (
              <GeneralSettingsTab ref={generalSettingsRef} />
            )}

            {/* 2. Pricing & Discounts Tab (Simplified) */}
            {activeSettingsTab === 'pricing' && (
              <DynamicPricingSimplifiedTab ref={pricingSettingsRef} />
            )}

            {/* 3. Receipt Settings Tab */}
            {activeSettingsTab === 'receipt' && (
              <ImprovedReceiptSettings ref={receiptSettingsRef} />
            )}

            {/* 4. Notifications Tab (NEW) */}
            {activeSettingsTab === 'notifications' && (
              <NotificationsSettingsTab ref={notificationsSettingsRef} />
            )}

            {/* 5. Features Toggle Tab */}
            {activeSettingsTab === 'features' && (
              <FeaturesTab ref={featuresSettingsRef} />
            )}

            {/* 6. User Permissions Tab (Simplified) */}
            {activeSettingsTab === 'permissions' && (
              <UserPermissionsSimplifiedTab ref={permissionsSettingsRef} />
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-4 mt-6 pt-6 border-t border-gray-200">
            <GlassButton
              onClick={() => {
                console.log('🔙 Cancel button clicked');
                onClose();
              }}
              variant="secondary"
              className="flex-1 py-3 text-lg font-semibold"
            >
              Cancel
            </GlassButton>
            <GlassButton
              onClick={() => {
                console.log('💾 Save Settings button clicked');
                saveCurrentTabSettings();
              }}
              disabled={isSavingSettings}
              className="flex-1 py-3 text-lg font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
            >
              {isSavingSettings ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="w-5 h-5" />
                  Save Settings
                </div>
              )}
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    );
  }
);

POSSettingsModal.displayName = 'POSSettingsModal';

export default POSSettingsModal;
