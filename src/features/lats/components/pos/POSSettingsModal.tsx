import React, { useState, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { X, Save, Settings, Search } from 'lucide-react';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';
import { useAuth } from '../../../../context/AuthContext';
import { useTranslation } from '../../lib/i18n/useTranslation';
import GlassTabs from '../../../shared/components/ui/GlassTabs';

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
    const { t } = useTranslation(); // Use the translation hook
    
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
      { id: 'general', name: t('settings.general'), keywords: ['interface', 'theme', 'language', 'currency', 'display', 'barcode', 'scanner', 'security', 'passcode'], roles: ['admin'] },
      { id: 'pricing', name: t('settings.pricing'), keywords: ['pricing', 'discount', 'happy hour', 'bulk', 'loyalty', 'promotions'], roles: ['admin'] },
      { id: 'receipt', name: t('settings.receipt'), keywords: ['receipt', 'print', 'template', 'logo', 'format'], roles: ['admin', 'customer-care'] },
      { id: 'notifications', name: t('settings.notifications'), keywords: ['notifications', 'alerts', 'whatsapp', 'sms', 'email', 'invoice', 'send', 'auto', 'manual'], roles: ['admin', 'customer-care'] },
      { id: 'features', name: t('settings.features'), keywords: ['features', 'delivery', 'loyalty', 'customer', 'payment tracking', 'enable', 'disable'], roles: ['admin'] },
      { id: 'permissions', name: t('settings.permissions'), keywords: ['permissions', 'access', 'user', 'role', 'security', 'cashier', 'manager', 'admin'], roles: ['admin'] }
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
            console.log('[Settings] Checking generalSettingsRef:', !!generalSettingsRef.current);
            if (generalSettingsRef.current?.saveSettings) {
              console.log('[Settings] Calling generalSettingsRef.saveSettings()');
              return await generalSettingsRef.current.saveSettings();
            }
            break;
          case 'pricing':
            console.log('[Settings] Checking pricingSettingsRef:', !!pricingSettingsRef.current);
            if (pricingSettingsRef.current?.saveSettings) {
              console.log('[Settings] Calling pricingSettingsRef.saveSettings()');
              return await pricingSettingsRef.current.saveSettings();
            }
            break;
          case 'receipt':
            console.log('[Settings] Checking receiptSettingsRef:', !!receiptSettingsRef.current);
            if (receiptSettingsRef.current?.saveSettings) {
              console.log('[Settings] Calling receiptSettingsRef.saveSettings()');
              return await receiptSettingsRef.current.saveSettings();
            }
            break;
          case 'features':
            console.log('[Settings] Checking featuresSettingsRef:', !!featuresSettingsRef.current);
            if (featuresSettingsRef.current?.saveSettings) {
              console.log('[Settings] Calling featuresSettingsRef.saveSettings()');
              return await featuresSettingsRef.current.saveSettings();
            }
            break;
          case 'permissions':
            console.log('[Settings] Checking permissionsSettingsRef:', !!permissionsSettingsRef.current);
            if (permissionsSettingsRef.current?.saveSettings) {
              console.log('[Settings] Calling permissionsSettingsRef.saveSettings()');
              return await permissionsSettingsRef.current.saveSettings();
            }
            break;
          case 'notifications':
            console.log('[Settings] Checking notificationsSettingsRef:', !!notificationsSettingsRef.current);
            if (notificationsSettingsRef.current?.saveSettings) {
              console.log('[Settings] Calling notificationsSettingsRef.saveSettings()');
              return await notificationsSettingsRef.current.saveSettings();
            }
            break;
          default:
            console.error('[Settings] Unknown settings tab:', activeSettingsTab);
            toast.error(`Unknown settings tab: ${activeSettingsTab}`);
            return false;
        }

        // If we get here, no save function was found
        console.error('[Settings] No save function available for tab:', activeSettingsTab);
        throw new Error(`No save function available for ${activeSettingsTab} settings`);
      } catch (error) {
        console.error('[Settings] Save failed:', error);
        toast.error(`Failed to save ${activeSettingsTab} settings. Please try again.`);
        return false;
      } finally {
        console.log('[Settings] Setting isSavingSettings to false');
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
      <>
        {/* Backdrop */}
        <div 
          className="fixed bg-black/50"
          onClick={(e) => {
            // Only close if clicking the backdrop itself, not the modal content
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
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
          className="fixed flex items-center justify-center p-4"
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
            className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col"
            style={{ pointerEvents: 'auto' }}
          >
            {/* Fixed Header */}
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Settings className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{t('settings.posSettings')}</h3>
                    <p className="text-xs text-gray-500">{t('settings.configure')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder={t('settings.searchSettings')}
                      value={searchQuery}
                      onChange={(e) => {
                        console.log('[Settings] Search query changed:', e.target.value);
                        setSearchQuery(e.target.value);
                      }}
                      className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900 w-64"
                    />
                  </div>
                  <button
                    onClick={() => {
                      console.log('[Settings] Close button clicked');
                      onClose();
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Settings Tabs */}
              <div className="mt-6">
            {filteredTabs.length > 0 ? (
              <GlassTabs
                tabs={filteredTabs.map(tab => ({
                  id: tab.id,
                  label: tab.name
                }))}
                activeTab={activeSettingsTab}
                onTabChange={(tabId) => {
                  setActiveSettingsTab(tabId);
                  onTabChange?.(tabId);
                }}
                variant="modern"
                size="md"
              />
            ) : searchQuery ? (
              <div className="text-gray-500 text-sm py-2 text-center mt-2">
                {t('settings.noSettingsFound')} "{searchQuery}"
              </div>
            ) : null}
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
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

            {/* Fixed Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200 bg-white flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                console.log('[Settings] Cancel button clicked');
                onClose();
              }}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                console.log('[Settings] Save Settings button clicked');
                saveCurrentTabSettings();
              }}
              disabled={isSavingSettings}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSavingSettings ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {t('settings.saving')}
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {t('settings.saveSettings')}
                </>
              )}
            </button>
            </div>
          </div>
        </div>
      </>
    );
  }
);

POSSettingsModal.displayName = 'POSSettingsModal';

export default POSSettingsModal;
