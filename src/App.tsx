import React, { useEffect, useState, lazy, Suspense } from 'react';
// HMR Test - This comment should appear when you save
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BranchProvider } from './context/BranchContext';
import { DateRangeProvider } from './context/DateRangeContext';
import { DevicesProvider, useDevices } from './context/DevicesContext';
import { CustomersProvider, useCustomers } from './context/CustomersContext';
import { UserGoalsProvider } from './context/UserGoalsContext';
import { PaymentsProvider } from './context/PaymentsContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoadingProvider, useLoading } from './context/LoadingContext';
import { GeneralSettingsProvider } from './context/GeneralSettingsContext';
import { PaymentMethodsProvider } from './context/PaymentMethodsContext';
import { ErrorProvider } from './context/ErrorContext';
import { GlobalSearchProvider } from './context/GlobalSearchContext';
import ErrorManager from './components/ErrorManager';
import { Toaster } from 'react-hot-toast';
// Load branch debugging tools (makes them available in console)
import './lib/branchDataCleanup';
// Global error handler for catching all errors
import { globalErrorHandler } from './services/globalErrorHandler';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
// Storage cleanup utilities (available in console)
import './utils/clearErrorLogs';
// Emergency cleanup for storage quota issues
import './utils/emergencyCleanup';

// import BackgroundSelector from './features/settings/components/BackgroundSelector';
import GlobalLoadingProgress from './features/shared/components/ui/GlobalLoadingProgress';
import DynamicPageLoader from './features/shared/components/ui/DynamicPageLoader';
// Enhanced lazy component wrapper to handle primitive conversion errors
const createSafeLazyComponent = (importFunction: () => Promise<any>, componentName: string = 'Unknown') => {
  return lazy(() => {
    console.log(`🔄 Lazy loading component: ${componentName}`);
    return importFunction().catch((error) => {
      console.error(`❌ Lazy import error for ${componentName}:`, error);
      console.error('Error stack:', error.stack);
      console.error('Error message:', error.message);

      // Return a simple fallback component for any import error
      return {
        default: () => (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
            <div className="text-center max-w-md mx-auto p-6">
              <div className="text-red-600 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Component Loading Error</h3>
              <p className="text-gray-600 mb-4">There was an error loading {componentName}. Please refresh the page.</p>
              <div className="text-xs text-gray-500 mb-4">
                Error: {error.message}
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        )
      };
    });
  });
};

// Dynamic imports for all pages
const LoginPage = lazy(() => import('./features/shared/pages/LoginPage'));
const ConditionalDashboard = createSafeLazyComponent(() => import('./features/shared/components/ConditionalDashboard'), 'ConditionalDashboard');
const NewDevicePage = lazy(() => import('./features/devices/pages/NewDevicePage'));
const DevicesPage = createSafeLazyComponent(() => import('./features/devices/pages/DevicesPage'), 'DevicesPage');

const CustomersPage = lazy(() => import('./features/customers/pages/CustomersPage'));
const CustomerImportExportPage = lazy(() => import('./features/customers/pages/CustomerImportExportPage'));
const AppLayout = createSafeLazyComponent(() => import('./layout/AppLayout'), 'AppLayout');
import { ErrorBoundary } from './features/shared/components/ErrorBoundary';
import DynamicImportErrorBoundary from './features/shared/components/DynamicImportErrorBoundary';
import UrlValidatedRoute from './components/UrlValidatedRoute';
import NativeOnlyRoute from './components/NativeOnlyRoute';
import MobileOnlyRedirect from './components/MobileOnlyRedirect';
import DefaultRedirect from './components/DefaultRedirect';
import InlineLoader from './components/ui/InlineLoader';
const AdminSettingsPage = lazy(() => import('./features/admin/pages/AdminSettingsPage'));
const IntegrationsTestPage = lazy(() => import('./features/admin/pages/IntegrationsTestPage'));
const ErrorLogsPage = lazy(() => import('./features/admin/pages/ErrorLogsPage'));
const UserManagementPage = lazy(() => import('./features/users/pages/UserManagementPage'));
const EnhancedSupplierManagementPage = lazy(() => import('./features/settings/pages/EnhancedSupplierManagementPage'));
import { SuppliersProvider } from './context/SuppliersContext';
const SMSControlCenterPage = lazy(() => import('./features/sms/pages/SMSControlCenterPage'));
const WhatsAppInboxPage = lazy(() => import('./features/whatsapp/pages/WhatsAppInboxPage'));
const EnhancedPaymentManagementPage = lazy(() => import('./features/payments/pages/EnhancedPaymentManagementPage'));
const ExpensesPage = lazy(() => import('./features/payments/pages/ExpensesPage'));
const EmployeeManagementPage = lazy(() => import('./features/employees/pages/EmployeeManagementPage'));
const EmployeeAttendancePage = lazy(() => import('./features/employees/pages/EmployeeAttendancePage'));
const AttendanceManagementPage = lazy(() => import('./features/employees/pages/AttendanceManagementPage'));
const MyAttendancePage = lazy(() => import('./features/employees/pages/MyAttendancePage'));


const UnifiedAppointmentPage = lazy(() => import('./features/appointments/pages/UnifiedAppointmentPage'));
const RemindersPage = lazy(() => import('./features/reminders/pages/RemindersPage'));
const GlobalSearchPage = lazy(() => import('./features/shared/pages/GlobalSearchPage'));
const ProductAdGeneratorPage = lazy(() => import('./features/shared/pages/ProductAdGeneratorPage'));

// Special Orders and Installments
const SpecialOrdersPage = lazy(() => import('./features/special-orders/pages/SpecialOrdersPage'));
const InstallmentsPage = lazy(() => import('./features/installments/pages/InstallmentsPage'));

const CategoryManagementPage = lazy(() => import('./features/settings/pages/CategoryManagementPage'));
const StoreLocationManagementPage = lazy(() => import('./features/settings/pages/StoreLocationManagementPage'));
// DatabaseSetupPage merged into AdminSettingsPage Database tab
const ExcelTemplateDownloadPage = lazy(() => import('./features/lats/pages/ExcelTemplateDownloadPage'));

// Customer Portal Pages
const CustomerLoginPage = lazy(() => import('./features/customer-portal/pages/LoginPage'));
const CustomerSignupPage = lazy(() => import('./features/customer-portal/pages/SignupPage'));
const CustomerDashboardPage = lazy(() => import('./features/customer-portal/pages/DashboardPage'));
const CustomerProductsPage = lazy(() => import('./features/customer-portal/pages/ProductsPage'));
const CustomerProductDetailPage = lazy(() => import('./features/customer-portal/pages/ProductDetailPage'));
const CustomerProfilePage = lazy(() => import('./features/customer-portal/pages/ProfilePage'));
const CustomerOrdersPage = lazy(() => import('./features/customer-portal/pages/OrdersPage'));
const CustomerLoyaltyPage = lazy(() => import('./features/customer-portal/pages/LoyaltyPage'));

// Test Pages
const TestImageUpload = lazy(() => import('./pages/TestImageUpload'));
const BackgroundRemovalPage = lazy(() => import('./pages/BackgroundRemovalPage'));
const UnifiedLoadingExample = lazy(() => import('./features/shared/components/examples/UnifiedLoadingExample'));
const PNGGenerationTest = lazy(() => import('./components/ui/PNGGenerationTest'));

// Mobile App Pages
const MobileLayout = lazy(() => import('./features/mobile/components/MobileLayout'));
const MobileDashboard = lazy(() => import('./features/mobile/pages/MobileDashboard'));
const MobilePOS = lazy(() => import('./features/mobile/pages/MobilePOS'));
const MobileInventory = lazy(() => import('./features/mobile/pages/MobileInventory'));
const MobileAddProduct = lazy(() => import('./features/mobile/pages/MobileAddProduct'));
const MobileClients = lazy(() => import('./features/mobile/pages/MobileClients'));
const MobileEditClient = lazy(() => import('./features/mobile/pages/MobileEditClient'));
const MobileMore = lazy(() => import('./features/mobile/pages/MobileMore'));
const MobileAnalytics = lazy(() => import('./features/mobile/pages/MobileAnalytics'));
const MobileProductDetail = lazy(() => import('./features/mobile/pages/MobileProductDetail'));
const MobileClientDetail = lazy(() => import('./features/mobile/pages/MobileClientDetail'));
const MobileSheetDemo = lazy(() => import('./features/mobile/pages/MobileSheetDemo'));

const LATSDashboardPage = lazy(() => import('./features/lats/pages/LATSDashboardPage'));
// SerialNumberManagerPage removed - replaced by IMEI Variant System
const PurchaseOrdersPage = lazy(() => import('./features/lats/pages/PurchaseOrdersPage'));
const POcreate = lazy(() => import('./features/lats/pages/POcreate'));
const PurchaseOrderDetailPage = lazy(() => import('./features/lats/pages/PurchaseOrderDetailPage'));
const TestSetPricingModal = lazy(() => import('./features/lats/pages/TestSetPricingModal'));
const InventorySparePartsPage = lazy(() => import('./features/lats/pages/InventorySparePartsPage'));
const StockTransferPage = lazy(() => import('./features/lats/pages/StockTransferPage'));

// Trade-In Module Pages
const TradeInManagementPage = lazy(() => import('./features/lats/pages/TradeInManagementPage'));
const TradeInTestPage = lazy(() => import('./features/lats/pages/TradeInTestPage'));

const SalesReportsPage = lazy(() => import('./features/lats/pages/SalesReportsPage'));
const ReportsPage = lazy(() => import('./features/admin/pages/ReportsPage'));
const LoyaltyManagementPage = lazy(() => import('./features/lats/pages/CustomerLoyaltyPage'));

// Purchase Orders Module Pages
const ShippedItemsPage = lazy(() => import('./features/lats/pages/ShippedItemsPage'));



const UnifiedInventoryPage = lazy(() => import('./features/lats/pages/UnifiedInventoryPage'));

const POSPage = createSafeLazyComponent(() => import('./features/lats/pages/POSPageOptimized'), 'POSPage');

const InventoryManagementPage = lazy(() => import('./features/lats/pages/InventoryManagementPage'));
const StorageRoomManagementPage = lazy(() => import('./features/lats/pages/StorageRoomManagementPage'));
const StorageRoomDetailPage = lazy(() => import('./features/lats/pages/StorageRoomDetailPage'));
const BluetoothPrinterPage = lazy(() => import('./pages/BluetoothPrinterPage'));

// Dashboard page - unified for all roles
const DashboardPage = lazy(() => import('./features/shared/pages/DashboardPage'));
const BulkSMSPage = lazy(() => import('./features/sms/pages/BulkSMSPage'));
const SMSLogsPage = lazy(() => import('./features/sms/pages/SMSLogsPage'));
const SMSSettingsPage = lazy(() => import('./features/sms/pages/SMSSettingsPage'));
const ScheduledMessagesPage = lazy(() => import('./features/sms/pages/ScheduledMessagesPage'));
const IntegrationSettingsPage = lazy(() => import('./features/settings/pages/IntegrationSettingsPage'));
const UserSettingsPage = lazy(() => import('./features/shared/pages/UserSettingsPage'));

import { initializeDatabaseCheck } from './lib/databaseUtils';
import { reminderService } from './lib/reminderService';
import { initializeCache } from './lib/offlineCache';
import { getPendingActions, clearPendingActions } from './lib/offlineSync';
import PreloadIndicator from './components/PreloadIndicator';
import BackgroundDataLoader from './components/BackgroundDataLoader';
import ProductPreloader from './components/ProductPreloader';
import InstallmentPreloader from './components/InstallmentPreloader';
import { POSSettingsDatabaseSetup } from './components/POSSettingsDatabaseSetup';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { StorageLocationPickerProvider } from './features/lats/components/storage/StorageLocationPickerProvider';


// Error fallback for dynamic imports
const DynamicImportErrorFallback = ({ error, retry }: { error: Error; retry: () => void }) => {
  // Check if this is a primitive conversion error
  const isPrimitiveConversionError = error.message.includes('Cannot convert object to primitive value');
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {isPrimitiveConversionError ? 'Component Loading Error' : 'Failed to load page'}
        </h3>
        <p className="text-gray-600 mb-4">
          {isPrimitiveConversionError 
            ? 'There was an error initializing this component. This is usually a temporary issue that can be resolved by refreshing the page.'
            : 'There was an error loading this page. This might be a temporary issue.'
          }
        </p>
        {isPrimitiveConversionError && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            💡 <strong>Tip:</strong> This error often occurs during development. Try refreshing the page or clearing your browser cache.
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={retry}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
};

// LoadingProgressWrapper component that can access the loading context
const LoadingProgressWrapper: React.FC = () => {
  const { isVisible, jobs, cancelJob } = useLoading();
  
  return (
    <GlobalLoadingProgress
      isVisible={isVisible}
      jobs={jobs}
      onCancel={cancelJob}
    />
  );
};

// Protected route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Add error boundary for React refresh issues
  const [hasError, setHasError] = useState(false);
  
  // Reset error state on mount
  useEffect(() => {
    setHasError(false);
  }, []);
  
  // Try to get auth context with error handling
  let isAuthenticated = false;
  let loading = true;
  
  try {
    const auth = useAuth();
    isAuthenticated = auth.isAuthenticated;
    loading = auth.loading;
  } catch (error) {
    // During hot reload, show minimal transparent loading
    return <InlineLoader fullscreen transparent message="Loading application..." />;
  }
  
  // Handle any errors during render
  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Error</h3>
          <p className="text-gray-600 mb-4">There was an issue with authentication. Please refresh the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
  
  // Show minimal loading state - transparent, non-blocking
  if (loading) {
    return <InlineLoader fullscreen transparent />;
  }
  
  // Handle authentication check
  try {
    if (!isAuthenticated) {
      localStorage.setItem('postLoginRedirect', window.location.pathname);
      return <Navigate to="/login" />;
    }
    
    return <>{children}</>;
  } catch (error) {
    console.error('ProtectedRoute error:', error);
    setHasError(true);
    return null;
  }
};

// Role-based protected route component (now supports permissions too!)
const RoleProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  allowedRoles: string[];
  requiredPermissions?: string[]; // Optional permission check
}> = ({ children, allowedRoles, requiredPermissions }) => {
  // Ensure allowedRoles is always an array to prevent primitive conversion errors
  const safeAllowedRoles = Array.isArray(allowedRoles) ? allowedRoles.map(role => String(role)) : [];
  
  // Add error boundary for React refresh issues
  const [hasError, setHasError] = useState(false);
  
  // Reset error state on mount
  useEffect(() => {
    setHasError(false);
  }, []);
  
  // Safely get auth context with error handling
  let authContext;
  try {
    authContext = useAuth();
  } catch (error) {
    console.error('Auth context error in RoleProtectedRoute:', error);
    // Auth context error occurred
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Error</h3>
          <p className="text-gray-600 mb-4">There was an issue with authentication. Please refresh the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
  
  const { isAuthenticated, loading, currentUser } = authContext;
  
  // Handle any errors during render
  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Error</h3>
          <p className="text-gray-600 mb-4">There was an issue with role verification. Please refresh the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
  
  // Show minimal loading state - transparent, non-blocking
  if (loading) {
    return <InlineLoader fullscreen transparent />;
  }
  
  // Handle role-based access control
  try {
    if (!isAuthenticated) {
      localStorage.setItem('postLoginRedirect', window.location.pathname);
      return <Navigate to="/login" />;
    }
    
    // Ensure currentUser has a valid role before checking
    const userRole = currentUser?.role ? String(currentUser.role) : null;
    
    // Check if user has required permissions (if specified)
    let hasRequiredPermissions = true;
    if (requiredPermissions && requiredPermissions.length > 0) {
      // Check if user has 'all' permission (admin)
      if (currentUser.permissions?.includes('all')) {
        hasRequiredPermissions = true;
      } else {
        // Check if user has at least one of the required permissions
        hasRequiredPermissions = requiredPermissions.some(permission => 
          currentUser.permissions?.includes(permission)
        );
      }
    }
    
    // User must have either the right role OR the right permissions
    const hasRoleAccess = userRole && safeAllowedRoles.includes(userRole);
    const hasAccess = hasRoleAccess || hasRequiredPermissions;
    
    if (!currentUser || !hasAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
            <p className="text-sm text-gray-500 mb-4">
              {!hasRoleAccess && 'Required role: ' + safeAllowedRoles.join(', ')}
              {requiredPermissions && requiredPermissions.length > 0 && ' or permission: ' + requiredPermissions.join(', ')}
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
    
    return <>{children}</>;
  } catch (error) {
    console.error('RoleProtectedRoute error:', error);
    setHasError(true);
    return null;
  }
};

// AppContent component that handles the sync logic and routes
const AppContent: React.FC<{ isOnline: boolean; isSyncing: boolean }> = ({ isOnline, isSyncing }) => {
  // Access context hooks with error handling
  let customersContext: any;
  let devicesContext: any;
  
  try {
    customersContext = useCustomers();
  } catch (error) {
    // Silently handle HMR context errors
  }
  
  try {
    devicesContext = useDevices();
  } catch (error) {
    // Silently handle HMR context errors
  }
  
  // Enable keyboard shortcuts (moved here to have access to router context)
  useKeyboardShortcuts();

  // Initialize database check on app startup
  useEffect(() => {
    initializeDatabaseCheck().catch(console.error);
  }, []);


  // Handle offline sync - start auto-sync for pending sales
  // ⚠️ CRITICAL FIX: Prevent multiple initializations that cause boot loops
  useEffect(() => {
    console.log('🔵 [DEBUG] App: useEffect for initialization triggered');
    
    let isInitialized = false;
    let initTimeout: NodeJS.Timeout | null = null;
    
    async function initializeOfflineSync() {
      console.log('🔵 [DEBUG] App: initializeOfflineSync called, isInitialized:', isInitialized);
      // Prevent multiple initializations
      if (isInitialized) {
        console.log('⏭️ [DEBUG] App: Already initialized, skipping offline sync');
        return;
      }
      
      try {
        console.log('🔵 [DEBUG] App: Importing offlineSaleSyncService');
        const { offlineSaleSyncService } = await import('./services/offlineSaleSyncService');
        // Start automatic background sync
        offlineSaleSyncService.startAutoSync();
        console.log('✅ [App] Offline sale sync service started');
        
        // Also sync immediately if online (with delay to prevent blocking)
        if (navigator.onLine) {
          console.log('🔵 [DEBUG] App: Online, scheduling sync in 2 seconds');
          setTimeout(() => {
            console.log('🔵 [DEBUG] App: Executing pending sales sync');
            offlineSaleSyncService.syncAllPendingSales().catch((err) => {
              console.warn('⚠️ [DEBUG] App: Initial sync failed:', err);
            });
          }, 2000); // Delay to prevent blocking initial load
        } else {
          console.log('🔵 [DEBUG] App: Offline, skipping sync');
        }
      } catch (error) {
        console.error('❌ [DEBUG] App: Failed to initialize offline sync:', error);
      }
    }
    
    // Initialize database auto-sync
    async function initializeDatabaseAutoSync() {
      console.log('🔵 [DEBUG] App: initializeDatabaseAutoSync called, isInitialized:', isInitialized);
      // Prevent multiple initializations
      if (isInitialized) {
        console.log('⏭️ [DEBUG] App: Already initialized, skipping database auto-sync');
        return;
      }
      
      try {
        console.log('🔵 [DEBUG] App: Importing autoSyncService and fullDatabaseDownloadService');
        const { autoSyncService } = await import('./services/autoSyncService');
        const { fullDatabaseDownloadService } = await import('./services/fullDatabaseDownloadService');
        
        // Check if database is downloaded
        const isDownloaded = fullDatabaseDownloadService.isDownloaded();
        console.log('🔵 [DEBUG] App: Database download status:', {
          isDownloaded,
          isOnline: navigator.onLine
        });
        
        if (isDownloaded && navigator.onLine) {
          // Start auto sync if database is downloaded and online
          autoSyncService.startAutoSync();
          console.log('✅ [App] Database auto-sync service started');
        } else if (isDownloaded) {
          console.log('ℹ️ [App] Database downloaded but offline - auto-sync will start when online');
        } else {
          console.log('ℹ️ [App] No database downloaded - auto-sync disabled');
        }
      } catch (error) {
        console.error('❌ [DEBUG] App: Failed to initialize database auto-sync:', error);
      }
    }
    
    // ⚠️ CRITICAL: Defer initialization to prevent blocking and boot loops
    console.log('🔵 [DEBUG] App: Scheduling initialization in 1 second');
    initTimeout = setTimeout(() => {
      console.log('🔵 [DEBUG] App: Executing initialization now');
      initializeOfflineSync();
      initializeDatabaseAutoSync();
      isInitialized = true;
      console.log('🔵 [DEBUG] App: Initialization complete');
    }, 1000); // Delay to ensure app is fully loaded
    
    return () => {
      console.log('🔵 [DEBUG] App: Cleanup function called');
      // Clear timeout if component unmounts before initialization
      if (initTimeout) {
        console.log('🔵 [DEBUG] App: Clearing initialization timeout');
        clearTimeout(initTimeout);
      }
      // Cleanup: stop auto-sync on unmount
      console.log('🔵 [DEBUG] App: Stopping auto-sync services');
      import('./services/offlineSaleSyncService').then(({ offlineSaleSyncService }) => {
        offlineSaleSyncService.stopAutoSync();
        console.log('🔵 [DEBUG] App: Offline sync stopped');
      }).catch((err) => {
        console.warn('⚠️ [DEBUG] App: Failed to stop offline sync:', err);
      });
      
      import('./services/autoSyncService').then(({ autoSyncService }) => {
        autoSyncService.stopAutoSync();
        console.log('🔵 [DEBUG] App: Database auto-sync stopped');
      }).catch((err) => {
        console.warn('⚠️ [DEBUG] App: Failed to stop database auto-sync:', err);
      });
    };
  }, []); // Empty deps - only run once on mount

  // Handle offline sync (legacy - keeping for backward compatibility)
  useEffect(() => {
    async function syncPending() {
      try {
        // Only proceed if context functions are available
        if (!customersContext?.addCustomer || !devicesContext?.assignToTechnician || !devicesContext?.updateDeviceStatus) {
          // Silently skip sync when context functions not ready (during HMR)
          return;
        }
        
        const actions = await getPendingActions();
        for (const action of actions) {
          try {
            if (action.type === 'submitData') {
              // Skip this action if backend API is not available
              try {
                await fetch('/api/endpoint', { method: 'POST', body: JSON.stringify(action.payload) });
              } catch (apiError) {
                console.warn('API endpoint not available, skipping submitData action');
                continue;
              }
            } else if (action.type === 'createCustomerFromSearch') {
              await customersContext.addCustomer(action.payload);
            } else if (action.type === 'adjustPoints') {
              const { operation, pointsToAdjust, reason, customerId } = action.payload;
              const adjustment = operation === 'add' ? Math.abs(pointsToAdjust) : -Math.abs(pointsToAdjust);
              
              // Use the proper customer update function instead of direct Supabase calls
              if (customersContext?.updateCustomer) {
                // Fetch current customer to get current points
                const currentCustomer = customersContext.customers.find((c: any) => c.id === customerId);
                if (currentCustomer) {
                  const newPoints = (currentCustomer.points || 0) + adjustment;
                  await customersContext.updateCustomer(customerId, { points: newPoints });
                  
                  // Add a note about the points adjustment
                  if (customersContext.addNote) {
                    await customersContext.addNote(customerId, `${operation === 'add' ? 'Added' : 'Subtracted'} ${Math.abs(pointsToAdjust)} points - ${reason}`);
                  }
                }
              }
            } else if (action.type === 'assignTechnician') {
              const { deviceId, selectedTechId } = action.payload;
              await devicesContext.assignToTechnician(deviceId, selectedTechId, '');
            } else if (action.type === 'markDeviceFailed') {
              const { deviceId, remark } = action.payload;
              await devicesContext.updateDeviceStatus(deviceId, 'failed', remark || '');
            }
          } catch (actionError) {
            console.error('Error syncing action:', actionError);
            // Continue with other actions even if one fails
          }
        }
        if (actions.length > 0) {
          await clearPendingActions();
        }
      } catch (error) {
        console.error('Error during offline sync:', error);
        // Don't throw - let the app continue
      }
    }

    if (isOnline) {
      syncPending();
    }
  }, [isOnline, customersContext, devicesContext]);

  return (
    <>
      {!isOnline && (
        <div style={{ background: '#f87171', color: 'white', padding: '8px', textAlign: 'center' }}>
          You are offline. Changes will be saved and synced when you are back online.
        </div>
      )}
      {isOnline && isSyncing && (
        <div style={{ background: '#fbbf24', color: 'black', padding: '8px', textAlign: 'center' }}>
          Syncing your offline changes...
        </div>
      )}
      
      <Routes>
        <Route path="/login" element={
          <Suspense fallback={<DynamicPageLoader />}>
            <LoginPage />
          </Suspense>
        } />
        
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<DynamicPageLoader />}>
                <AppLayout />
              </Suspense>
            </ProtectedRoute>
          }
        >
          <Route index element={<DefaultRedirect />} />
          <Route path="/dashboard" element={
            <Suspense fallback={<DynamicPageLoader />}>
              <ConditionalDashboard />
            </Suspense>
          } />

          {/* Alternative Dashboard Views - Previously Unlinked */}
          <Route path="/dashboard/admin" element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<DynamicPageLoader />}>
                <DashboardPage />
              </Suspense>
            </RoleProtectedRoute>
          } />
          {/* Old role-specific dashboard routes removed - now using unified dashboard at /dashboard */}

          {/* Product Ad Generator */}
          <Route path="/ad-generator" element={
            <ErrorBoundary fallback={DynamicImportErrorFallback}>
              <RoleProtectedRoute allowedRoles={['admin']}>
                <Suspense fallback={<DynamicPageLoader />}>
                  <ProductAdGeneratorPage />
                </Suspense>
              </RoleProtectedRoute>
            </ErrorBoundary>
          } />

          <Route path="/devices" element={
            <ErrorBoundary fallback={DynamicImportErrorFallback}>
              <RoleProtectedRoute allowedRoles={['admin', 'customer-care', 'technician']}>
                <Suspense fallback={<DynamicPageLoader />}>
                  <DevicesPage />
                </Suspense>
              </RoleProtectedRoute>
            </ErrorBoundary>
          } />
          <Route path="/devices/new" element={
            <RoleProtectedRoute allowedRoles={['admin', 'customer-care']}>
              <Suspense fallback={<DynamicPageLoader />}>
                <NewDevicePage />
              </Suspense>
            </RoleProtectedRoute>
          } />

        <Route path="/category-management" element={<RoleProtectedRoute allowedRoles={['admin']}><Suspense fallback={<DynamicPageLoader />}><CategoryManagementPage /></Suspense></RoleProtectedRoute>} />
                  <Route path="/supplier-management" element={<RoleProtectedRoute allowedRoles={['admin']}><Suspense fallback={<DynamicPageLoader />}><EnhancedSupplierManagementPage /></Suspense></RoleProtectedRoute>} />
        <Route path="/store-locations" element={
          <RoleProtectedRoute allowedRoles={['admin']}>
            <Suspense fallback={<DynamicPageLoader />}>
              <StoreLocationManagementPage />
            </Suspense>
          </RoleProtectedRoute>
        } />
        {/* Unified Customer Import/Export Page */}
        <Route path="/customers/import" element={
          <RoleProtectedRoute allowedRoles={['admin']}>
            <Suspense fallback={<DynamicPageLoader />}>
              <CustomerImportExportPage />
            </Suspense>
          </RoleProtectedRoute>
        } />
        <Route path="/excel-import" element={
          <RoleProtectedRoute allowedRoles={['admin']}>
            <Suspense fallback={<DynamicPageLoader />}>
              <CustomerImportExportPage />
            </Suspense>
          </RoleProtectedRoute>
        } />
        <Route path="/customers/update" element={
          <RoleProtectedRoute allowedRoles={['admin']}>
            <Suspense fallback={<DynamicPageLoader />}>
              <CustomerImportExportPage />
            </Suspense>
          </RoleProtectedRoute>
        } />
        <Route path="/excel-templates" element={
          <RoleProtectedRoute allowedRoles={['admin']}>
            <Suspense fallback={<DynamicPageLoader />}>
              <ExcelTemplateDownloadPage />
            </Suspense>
          </RoleProtectedRoute>
        } />

          <Route path="/customers" element={
            <RoleProtectedRoute allowedRoles={['admin', 'customer-care']}>
              <ErrorBoundary fallback={DynamicImportErrorFallback}>
                <Suspense fallback={<DynamicPageLoader />}>
                  <CustomersPage />
                </Suspense>
              </ErrorBoundary>
            </RoleProtectedRoute>
          } />


          {/* User Settings - Available to all authenticated users */}
          <Route path="/settings" element={<Suspense fallback={<DynamicPageLoader />}><UserSettingsPage /></Suspense>} />
          
          {/* SMS Module Routes - Now Complete */}
          <Route path="/sms" element={<RoleProtectedRoute allowedRoles={['admin', 'customer-care']}><Suspense fallback={<DynamicPageLoader />}><SMSControlCenterPage /></Suspense></RoleProtectedRoute>} />
          <Route path="/sms/bulk" element={
            <RoleProtectedRoute allowedRoles={['admin', 'customer-care']}>
              <Suspense fallback={<DynamicPageLoader />}>
                <BulkSMSPage />
              </Suspense>
            </RoleProtectedRoute>
          } />
          <Route path="/sms/logs" element={
            <RoleProtectedRoute allowedRoles={['admin', 'customer-care']}>
              <Suspense fallback={<DynamicPageLoader />}>
                <SMSLogsPage />
              </Suspense>
            </RoleProtectedRoute>
          } />
          <Route path="/sms/settings" element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<DynamicPageLoader />}>
                <SMSSettingsPage />
              </Suspense>
            </RoleProtectedRoute>
          } />
          <Route path="/sms/scheduled" element={
            <RoleProtectedRoute allowedRoles={['admin', 'customer-care']}>
              <Suspense fallback={<DynamicPageLoader />}>
                <ScheduledMessagesPage />
              </Suspense>
            </RoleProtectedRoute>
          } />
          
          {/* WhatsApp Module Routes */}
          <Route path="/whatsapp/inbox" element={
            <RoleProtectedRoute allowedRoles={['admin', 'customer-care']}>
              <Suspense fallback={<DynamicPageLoader />}>
                <WhatsAppInboxPage />
              </Suspense>
            </RoleProtectedRoute>
          } />
          
          <Route path="/admin-settings" element={<RoleProtectedRoute allowedRoles={['admin']}><Suspense fallback={<DynamicPageLoader />}><AdminSettingsPage /></Suspense></RoleProtectedRoute>} />
          <Route path="/integration-settings" element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<DynamicPageLoader />}>
                <IntegrationSettingsPage />
              </Suspense>
            </RoleProtectedRoute>
          } />
          <Route path="/integrations-test" element={<RoleProtectedRoute allowedRoles={['admin']}><Suspense fallback={<DynamicPageLoader />}><IntegrationsTestPage /></Suspense></RoleProtectedRoute>} />
          <Route path="/admin/error-logs" element={<RoleProtectedRoute allowedRoles={['admin']}><Suspense fallback={<DynamicPageLoader />}><ErrorLogsPage /></Suspense></RoleProtectedRoute>} />
          <Route path="/users" element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<DynamicPageLoader />}>
                <UserManagementPage />
              </Suspense>
            </RoleProtectedRoute>
          } />
          {/* Payment Management - Single consolidated page */}
          <Route path="/payments" element={<RoleProtectedRoute allowedRoles={['admin']}><Suspense fallback={<DynamicPageLoader />}><EnhancedPaymentManagementPage /></Suspense></RoleProtectedRoute>} />
          
          {/* Expenses Management - Redirect to payments page with transactions tab */}
          <Route path="/expenses" element={<Navigate to="/payments?tab=transactions" replace />} />
          
          {/* Appointment Management Routes */}
          <Route path="/appointments" element={<RoleProtectedRoute allowedRoles={['admin', 'customer-care', 'technician']}><Suspense fallback={<DynamicPageLoader />}><UnifiedAppointmentPage /></Suspense></RoleProtectedRoute>} />
          
          {/* Reminders Routes */}
          <Route path="/reminders" element={<RoleProtectedRoute allowedRoles={['admin', 'customer-care', 'technician']}><Suspense fallback={<DynamicPageLoader />}><RemindersPage /></Suspense></RoleProtectedRoute>} />
          
          {/* Special Orders & Installments Routes */}
          <Route path="/special-orders" element={<RoleProtectedRoute allowedRoles={['admin', 'sales', 'manager', 'customer-care']}><Suspense fallback={<DynamicPageLoader />}><SpecialOrdersPage /></Suspense></RoleProtectedRoute>} />
          <Route path="/installments" element={<RoleProtectedRoute allowedRoles={['admin', 'sales', 'manager', 'customer-care']}><Suspense fallback={<DynamicPageLoader />}><InstallmentsPage /></Suspense></RoleProtectedRoute>} />
          
          
          {/* Employee Management Routes */}
          <Route path="/employees" element={<RoleProtectedRoute allowedRoles={['admin', 'manager']}><Suspense fallback={<DynamicPageLoader />}><EmployeeManagementPage /></Suspense></RoleProtectedRoute>} />
          <Route path="/my-attendance" element={<Suspense fallback={<DynamicPageLoader />}><MyAttendancePage /></Suspense>} />
          
          {/* Redirect old attendance routes to employees page with appropriate tab */}
          <Route path="/employees/attendance" element={<Navigate to="/employees?tab=attendance" replace />} />
          <Route path="/employees/attendance-management" element={<Navigate to="/employees?tab=attendance-setup" replace />} />
          <Route path="/attendance" element={<Navigate to="/employees?tab=attendance" replace />} />
          
          {/* Calendar View Routes */}

          
          {/* LATS Module Routes */}
          <Route path="/lats" element={<RoleProtectedRoute allowedRoles={['admin']}><Suspense fallback={<DynamicPageLoader />}><LATSDashboardPage /></Suspense></RoleProtectedRoute>} />
          {/* /lats/serial-manager route removed - replaced by IMEI Variant System */}
          
          {/* POS Route */}
          <Route path="/pos" element={
            <ErrorBoundary fallback={DynamicImportErrorFallback}>
              <RoleProtectedRoute allowedRoles={['admin', 'customer-care']}>
                <Suspense fallback={<DynamicPageLoader />}>
                  <POSPage />
                </Suspense>
              </RoleProtectedRoute>
            </ErrorBoundary>
          } />

          {/* Primary Unified Inventory Route */}
          <Route path="/lats/unified-inventory" element={<RoleProtectedRoute allowedRoles={['admin']}><DynamicImportErrorBoundary><Suspense fallback={<DynamicPageLoader />}><UnifiedInventoryPage /></Suspense></DynamicImportErrorBoundary></RoleProtectedRoute>} />
          
          {/* Inventory Management Route */}
          <Route path="/lats/inventory-management" element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<DynamicPageLoader />}>
                <InventoryManagementPage />
              </Suspense>
            </RoleProtectedRoute>
          } />
          
          {/* Storage Room Management Route */}
          <Route path="/lats/storage-rooms" element={<RoleProtectedRoute allowedRoles={['admin']}><Suspense fallback={<DynamicPageLoader />}><StorageRoomManagementPage /></Suspense></RoleProtectedRoute>} />
          
          {/* Storage Room Detail Route */}
          <Route path="/lats/storage-rooms/:id" element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<DynamicPageLoader />}>
                <StorageRoomDetailPage />
              </Suspense>
            </RoleProtectedRoute>
          } />
          
          {/* Redirect old inventory routes to unified inventory */}
          <Route path="/lats/inventory" element={<Navigate to="/lats/unified-inventory" replace />} />
          <Route path="/lats/products" element={<Navigate to="/lats/unified-inventory" replace />} />
          
          {/* Keep product detail route for individual product views */}
          

          <Route path="/lats/sales-reports" element={<RoleProtectedRoute allowedRoles={['admin', 'customer-care']}><Suspense fallback={<DynamicPageLoader />}><SalesReportsPage /></Suspense></RoleProtectedRoute>} />
          <Route path="/admin/reports" element={<RoleProtectedRoute allowedRoles={['admin', 'manager']}><Suspense fallback={<DynamicPageLoader />}><ReportsPage /></Suspense></RoleProtectedRoute>} />
          <Route path="/lats/loyalty" element={<RoleProtectedRoute allowedRoles={['admin']}><Suspense fallback={<DynamicPageLoader />}><LoyaltyManagementPage /></Suspense></RoleProtectedRoute>} />

          <Route path="/lats/purchase-orders" element={<RoleProtectedRoute allowedRoles={['admin']}><Suspense fallback={<DynamicPageLoader />}><PurchaseOrdersPage /></Suspense></RoleProtectedRoute>} />
          <Route path="/lats/purchase-order/create" element={<RoleProtectedRoute allowedRoles={['admin']}><Suspense fallback={<DynamicPageLoader />}><POcreate /></Suspense></RoleProtectedRoute>} />
          <Route path="/lats/purchase-orders/:id" element={<RoleProtectedRoute allowedRoles={['admin']}><Suspense fallback={<DynamicPageLoader />}><PurchaseOrderDetailPage /></Suspense></RoleProtectedRoute>} />
          <Route path="/lats/purchase-orders/:id/edit" element={<RoleProtectedRoute allowedRoles={['admin']}><Suspense fallback={<DynamicPageLoader />}><PurchaseOrderDetailPage editMode={true} /></Suspense></RoleProtectedRoute>} />
          
          {/* Test Modals */}
          <Route path="/test/set-pricing-modal" element={<RoleProtectedRoute allowedRoles={['admin']}><Suspense fallback={<DynamicPageLoader />}><TestSetPricingModal /></Suspense></RoleProtectedRoute>} />
          
          <Route path="/lats/purchase-orders/shipped-items" element={<RoleProtectedRoute allowedRoles={['admin']}><Suspense fallback={<DynamicPageLoader />}><ShippedItemsPage /></Suspense></RoleProtectedRoute>} />
          <Route path="/lats/purchase-orders/suppliers" element={<RoleProtectedRoute allowedRoles={['admin']}><Suspense fallback={<DynamicPageLoader />}><EnhancedSupplierManagementPage /></Suspense></RoleProtectedRoute>} />
          
          {/* Stock Transfer Route */}
          <Route path="/lats/stock-transfers" element={<RoleProtectedRoute allowedRoles={['admin']}><Suspense fallback={<DynamicPageLoader />}><StockTransferPage /></Suspense></RoleProtectedRoute>} />

          <Route path="/lats/spare-parts" element={
            <UrlValidatedRoute enableImageUrlValidation={true} enableUrlLogging={false}>
              <RoleProtectedRoute allowedRoles={['admin', 'technician']}>
                <Suspense fallback={<DynamicPageLoader />}>
                  <InventorySparePartsPage />
                </Suspense>
              </RoleProtectedRoute>
            </UrlValidatedRoute>
          } />
          
          {/* Trade-In Module Routes */}
          <Route path="/lats/trade-in/management" element={<RoleProtectedRoute allowedRoles={['admin']}><Suspense fallback={<DynamicPageLoader />}><TradeInManagementPage /></Suspense></RoleProtectedRoute>} />
          <Route path="/lats/trade-in/create" element={<RoleProtectedRoute allowedRoles={['admin']}><Suspense fallback={<DynamicPageLoader />}><TradeInTestPage /></Suspense></RoleProtectedRoute>} />

        {/* Bluetooth Printer Management Route */}
        <Route path="/bluetooth-printer" element={<RoleProtectedRoute allowedRoles={['admin', 'customer-care']}><Suspense fallback={<DynamicPageLoader />}><BluetoothPrinterPage /></Suspense></RoleProtectedRoute>} />
          
          {/* Global Search Route - Now using modal instead */}
          {/* <Route path="/search" element={
            <Suspense fallback={<DynamicPageLoader />}>
              <GlobalSearchPage />
            </Suspense>
          } /> */}
        </Route>

        {/* Full-page routes (outside AppLayout) */}
        
        {/* Customer Portal Routes - Public Access */}
        <Route path="/customer-portal/login" element={
          <Suspense fallback={<DynamicPageLoader />}>
            <CustomerLoginPage />
          </Suspense>
        } />
        
        <Route path="/customer-portal/signup" element={
          <Suspense fallback={<DynamicPageLoader />}>
            <CustomerSignupPage />
          </Suspense>
        } />
        
        <Route path="/customer-portal/dashboard" element={
          <Suspense fallback={<DynamicPageLoader />}>
            <CustomerDashboardPage />
          </Suspense>
        } />
        
        <Route path="/customer-portal/products" element={
          <Suspense fallback={<DynamicPageLoader />}>
            <CustomerProductsPage />
          </Suspense>
        } />
        
        <Route path="/customer-portal/products/:id" element={
          <Suspense fallback={<DynamicPageLoader />}>
            <CustomerProductDetailPage />
          </Suspense>
        } />
        
        <Route path="/customer-portal/profile" element={
          <Suspense fallback={<DynamicPageLoader />}>
            <CustomerProfilePage />
          </Suspense>
        } />
        
        <Route path="/customer-portal/orders" element={
          <Suspense fallback={<DynamicPageLoader />}>
            <CustomerOrdersPage />
          </Suspense>
        } />
        
        <Route path="/customer-portal/loyalty" element={
          <Suspense fallback={<DynamicPageLoader />}>
            <CustomerLoyaltyPage />
          </Suspense>
        } />
        
        {/* Mobile App Routes - APK Only */}
        <Route path="/mobile" element={
          <NativeOnlyRoute>
              <Suspense fallback={<DynamicPageLoader />}>
                <MobileLayout />
              </Suspense>
          </NativeOnlyRoute>
        }>
          <Route index element={<Navigate to="/mobile/dashboard" replace />} />
          <Route path="dashboard" element={
            <Suspense fallback={<DynamicPageLoader />}>
              <MobileDashboard />
            </Suspense>
          } />
          <Route path="pos" element={
            <Suspense fallback={<DynamicPageLoader />}>
              <MobilePOS />
            </Suspense>
          } />
          <Route path="inventory" element={
            <Suspense fallback={<DynamicPageLoader />}>
              <MobileInventory />
            </Suspense>
          } />
          <Route path="inventory/add" element={
            <Suspense fallback={<DynamicPageLoader />}>
              <MobileAddProduct />
            </Suspense>
          } />
          <Route path="inventory/:productId" element={
            <Suspense fallback={<DynamicPageLoader />}>
              <MobileProductDetail />
            </Suspense>
          } />
          <Route path="clients" element={
            <Suspense fallback={<DynamicPageLoader />}>
              <MobileClients />
            </Suspense>
          } />
          <Route path="clients/:clientId" element={
            <Suspense fallback={<DynamicPageLoader />}>
              <MobileClientDetail />
            </Suspense>
          } />
          <Route path="clients/:clientId/edit" element={
            <Suspense fallback={<DynamicPageLoader />}>
              <MobileEditClient />
            </Suspense>
          } />
          <Route path="more" element={
            <Suspense fallback={<DynamicPageLoader />}>
              <MobileMore />
            </Suspense>
          } />
          <Route path="analytics" element={
            <Suspense fallback={<DynamicPageLoader />}>
              <MobileAnalytics />
            </Suspense>
          } />
          <Route path="sheet-demo" element={
            <Suspense fallback={<DynamicPageLoader />}>
              <MobileSheetDemo />
            </Suspense>
          } />
        </Route>
        
        {/* Test Pages */}
        <Route path="/test-image-upload" element={
          <Suspense fallback={<DynamicPageLoader />}>
            <TestImageUpload />
          </Suspense>
        } />
        
        <Route path="/background-removal" element={
          <Suspense fallback={<DynamicPageLoader />}>
            <BackgroundRemovalPage />
          </Suspense>
        } />
        
        <Route path="/test-loading" element={
          <Suspense fallback={<DynamicPageLoader />}>
            <UnifiedLoadingExample />
          </Suspense>
        } />
        
        <Route path="/test-png-generation" element={
          <Suspense fallback={<DynamicPageLoader />}>
            <PNGGenerationTest />
          </Suspense>
        } />
        
        <Route path="*" element={<DefaultRedirect />} />
      </Routes>
    </>
  );
};

function _clearAllIndexedDB() {
  const databases = ['clean-app-cache', 'clean-app-offline-sync', 'user-goals', 'offline-cache', 'pending-actions'];
  databases.forEach(dbName => {
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = () => console.log(`Deleted database: ${dbName}`);
    request.onerror = () => console.error(`Error deleting database: ${dbName}`);
  });
}

// Function to clear all IndexedDB databases and reset the app
function clearAllDatabases() {
  try {
    _clearAllIndexedDB();
    // Also clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    console.log('All databases and storage cleared');
  } catch (error) {
    console.error('Error clearing databases:', error);
  }
}

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, _setIsSyncing] = useState(false);

  // --- Initialize Global Error Handler ---
  useEffect(() => {
    globalErrorHandler.init();
    console.log('✅ Global error handler initialized');
    
    return () => {
      globalErrorHandler.cleanup();
    };
  }, []);

  // --- Global scroll position persistence ---
  useEffect(() => {
    // Restore scroll position on mount
    const saved = sessionStorage.getItem(`scroll-pos-${window.location.pathname}`);
    if (saved) {
      window.scrollTo(0, parseInt(saved, 10));
    }
    // Save scroll position on unload
    const saveScroll = () => {
      sessionStorage.setItem(`scroll-pos-${window.location.pathname}`, String(window.scrollY));
    };
    window.addEventListener('beforeunload', saveScroll);
    // Save on route change (popstate)
    window.addEventListener('popstate', saveScroll);
    return () => {
      window.removeEventListener('beforeunload', saveScroll);
      window.removeEventListener('popstate', saveScroll);
      saveScroll(); // Save on component unmount
    };
  }, []);
  // --- End global scroll position persistence ---

  // Start reminder service
  useEffect(() => {
    reminderService.start();
    return () => {
      reminderService.stop();
    };
  }, []);

  // Initialize cache
  useEffect(() => {
    initializeCache();
  }, []);

  // Apply font size from localStorage on app load
  useEffect(() => {
    const applyFontSize = (size: 'tiny' | 'extra-small' | 'small' | 'medium' | 'large') => {
      const root = document.documentElement;
      switch (size) {
        case 'tiny':
          root.style.fontSize = '11px'; // Polished: More readable than 10px
          break;
        case 'extra-small':
          root.style.fontSize = '12px';
          break;
        case 'small':
          root.style.fontSize = '14px';
          break;
        case 'medium':
          root.style.fontSize = '16px';
          break;
        case 'large':
          root.style.fontSize = '18px';
          break;
      }
    };

    const savedFontSize = localStorage.getItem('fontSize') as 'tiny' | 'extra-small' | 'small' | 'medium' | 'large' | null;
    if (savedFontSize) {
      applyFontSize(savedFontSize);
    } else {
      // Default to medium if no preference saved
      applyFontSize('medium');
    }
  }, []);

  // Global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Check if it's a primitive conversion error
      if (event.reason && event.reason.message && 
          event.reason.message.includes('Cannot convert object to primitive value')) {
        console.warn('Primitive conversion error caught globally, preventing crash');
        event.preventDefault(); // Prevent the error from crashing the app
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Suppress browser extension errors in console
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;

    // Helper function to check if error is from extension
    const isExtensionError = (message: string, source?: string, stack?: string): boolean => {
      const text = `${message} ${source || ''} ${stack || ''}`.toLowerCase();
      return !!(
        text.includes('extension context invalidated') ||
        text.includes('chrome-extension://') ||
        text.includes('moz-extension://') ||
        text.includes('content.js') ||
        text.includes('extension context') ||
        (source && (
          source.includes('chrome-extension://') ||
          source.includes('moz-extension://') ||
          source.includes('content.js')
        ))
      );
    };

    // Helper function to check if error is WhatsApp integration not configured
    const isWhatsAppConfigError = (message: string): boolean => {
      const text = message.toLowerCase();
      return !!(
        text.includes('whatsapp integration not configured') ||
        (text.includes('[whatsapp]') && text.includes('not configured'))
      );
    };

    console.error = (...args: any[]) => {
      const message = args.join(' ');
      // Check error object if present
      const errorObj = args.find(arg => arg instanceof Error);
      const stack = errorObj?.stack || '';
      
      // Filter out extension-related errors
      if (isExtensionError(message, undefined, stack)) {
        // Silently ignore extension errors
        return;
      }

      // Filter out WhatsApp integration configuration errors (shown in UI instead)
      if (isWhatsAppConfigError(message)) {
        // Silently ignore - shown in UI instead
        return;
      }

      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      // Check error object if present
      const errorObj = args.find(arg => arg instanceof Error);
      const stack = errorObj?.stack || '';
      
      // Filter out extension-related warnings
      if (isExtensionError(message, undefined, stack)) {
        // Silently ignore extension warnings
        return;
      }
      originalWarn.apply(console, args);
    };

    // Also suppress uncaught errors from browser extensions
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.message || '';
      const errorSource = event.filename || '';
      const errorStack = event.error?.stack || '';
      
      if (isExtensionError(errorMessage, errorSource, errorStack)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.toString() || '';
      const errorStack = event.reason?.stack || '';
      
      if (isExtensionError(reason, undefined, errorStack)) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    // Use capture phase to catch errors early
    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
    };
  }, []);

  // Make clearAllDatabases available globally for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).clearAllDatabases = clearAllDatabases;
      (window as any).clearAllIndexedDB = _clearAllIndexedDB;
    }
  }, []);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (navigator.onLine) {
      // Initial sync when online
    }
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get the base path from environment variable (matches Vite base config)
  // Default to empty string for root domain deployment (routes already have /lats/ prefix)
  const basename = import.meta.env.VITE_ROUTER_BASENAME !== undefined 
    ? import.meta.env.VITE_ROUTER_BASENAME 
    : '';

  return (
    <GlobalErrorBoundary>
      <BrowserRouter basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider>
          <AuthProvider>
            <GlobalSearchProvider>
              <BranchProvider>
                <DateRangeProvider>
                  <ErrorProvider>
                  {/* <RepairProvider> */}
                  <DevicesProvider>
                  <CustomersProvider>
                    <UserGoalsProvider>
                      <PaymentsProvider>
                        <PaymentMethodsProvider>
                          <LoadingProvider>
                          <GeneralSettingsProvider>
                              <SuppliersProvider>
                                <POSSettingsDatabaseSetup>
                                  <StorageLocationPickerProvider>
                                    <MobileOnlyRedirect>
                                      <AppContent 
                                        isOnline={isOnline} 
                                        isSyncing={isSyncing} 
                                      />
                                      <LoadingProgressWrapper />
                                      <BackgroundDataLoader />
                                      <ProductPreloader />
                                      <InstallmentPreloader />
                                      <PreloadIndicator />
                                      <ErrorManager />
                                    </MobileOnlyRedirect>
                                  </StorageLocationPickerProvider>
                                </POSSettingsDatabaseSetup>
                            </SuppliersProvider>
                        </GeneralSettingsProvider>
                        </LoadingProvider>
                      </PaymentMethodsProvider>
                    </PaymentsProvider>
                  </UserGoalsProvider>
                </CustomersProvider>
                </DevicesProvider>
                {/* </RepairProvider> */}
                </ErrorProvider>
              </DateRangeProvider>
            </BranchProvider>
          </GlobalSearchProvider>
        </AuthProvider>
      </ThemeProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </BrowserRouter>
    </GlobalErrorBoundary>
  );
}

export default App;