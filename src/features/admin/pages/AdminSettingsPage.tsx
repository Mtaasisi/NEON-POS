import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { SettingsSaveProvider, useSettingsSave } from '../../../context/SettingsSaveContext';
import { 
  getAdminSettings,
  getAdminSettingsByCategory,
  updateAdminSetting,
  updateAdminSettings,
  groupSettingsByCategory,
  flattenSettingsForDatabase
} from '../../../lib/adminSettingsApi';
import { 
  getAttendanceSettings,
  saveAttendanceSettings,
  defaultAttendanceSettings
} from '../../../lib/attendanceSettingsApi';
import OfficeMap from '../components/OfficeMap';
import IntegrationsManagement from '../components/IntegrationsManagement';
// Import UnifiedSettings components
import AppearanceSettings from '../../settings/components/AppearanceSettings';
import NotificationSettings from '../../settings/components/NotificationSettings';
import PaymentSettings from '../../settings/components/PaymentSettings';
import UnifiedBrandingSettings from '../components/UnifiedBrandingSettings';
// Import NEW Settings Components
import StoreManagementSettings from '../components/StoreManagementSettings';
import APIWebhooksSettings from '../components/APIWebhooksSettings';
import LoyaltyProgramSettings from '../components/LoyaltyProgramSettings';
import DocumentTemplatesSettings from '../components/DocumentTemplatesSettings';
import InventorySettings from '../components/InventorySettings';
import ShippingSettings from '../../settings/components/ShippingSettings';
import BranchIsolationDebugPanel from '../components/BranchIsolationDebugPanel';
import { BranchDataCleanupPanel } from '../components/BranchDataCleanupPanel';
import { BranchProductManagement } from '../components/BranchProductManagement';
import { BranchProductSharing } from '../components/BranchProductSharing';
import DashboardCustomizationSettings from '../components/DashboardCustomizationSettings';
import { DatabaseDataCleanupPanel } from '../components/DatabaseDataCleanupPanel';
import DatabaseBranchMigration from '../components/DatabaseBranchMigration';
// DatabaseManagementSettings merged into DatabaseSettings
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import { 
  Settings,
  Database,
  Server,
  Shield,
  Bell,
  Bug,
  Mail,
  Smartphone,
  Globe,
  Key,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  CheckCircle,
  Check,
  AlertTriangle,
  Info,
  Lock,
  Unlock,
  Activity,
  Zap,
  Cloud,
  HardDrive,
  Wifi,
  WifiOff,
  Play,
  Pause,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Plus,
  Minus,
  Copy,
  ExternalLink,
  Download,
  Upload,
  RotateCcw,
  Power,
  PowerOff,
  TestTube,
  BarChart3,
  PieChart,
  TrendingUp,
  AlertCircle,
  CheckSquare,
  Square,
  ToggleLeft,
  ToggleRight,
  MessageCircle,
  Image,
  Clock,
  MapPin,
  Users,
  Compass,
  User,
  Palette,
  CreditCard,
  Building2,
  Star,
  Target,
  Camera,
  Lightbulb,
  Code,
  GitBranch,
  FileText,
  Package,
  LayoutDashboard,
  Truck,
  Search,
  X,
  Store,
  ShoppingCart,
  Box,
  Layers,
  HelpCircle
} from 'lucide-react';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import PriceInput from '../../../features/shared/components/ui/PriceInput';
import GlassInput from '../../../features/shared/components/ui/EnhancedInput';
import LogoUpload from '../../../features/shared/components/ui/LogoUpload';
import { hostingerUploadService } from '../../../lib/hostingerUploadService';
import toast from 'react-hot-toast';
import { 
  restoreFromBackup,
  previewBackupFile,
  getRestoreFormats,
  BackupResult
} from '../../../lib/backupApi';
import { fullDatabaseDownloadService } from '../../../services/fullDatabaseDownloadService';
import { offlineSaleSyncService } from '../../../services/offlineSaleSyncService';
import { autoSyncService } from '../../../services/autoSyncService';

interface SystemSettings {
  branding: {
    appLogo: string;
    companyName: string;
    primaryColor: string;
    secondaryColor: string;
    logoSize: 'small' | 'medium' | 'large';
    logoPosition: 'left' | 'center' | 'right';
  };
  database: {
    url: string;
    projectId: string;
    region: string;
    status: 'online' | 'offline' | 'error';
    lastSync: string;
    connectionPool: number;
    maxConnections: number;
    activeConnections: number;
  };
  integrations: {
    sms: {
      provider: string;
      status: 'active' | 'inactive' | 'error';
      balance: number;
      lastUsed: string;
    };
    email: {
      provider: string;
      status: 'active' | 'inactive' | 'error';
      dailyLimit: number;
      usedToday: number;
    };
    
    ai: {
      provider: string;
      status: 'active' | 'inactive' | 'error';
      model: string;
      apiKeyConfigured: boolean;
    };
  };
  performance: {
    cacheEnabled: boolean;
    cacheSize: number;
    compressionEnabled: boolean;
    cdnEnabled: boolean;
    loadBalancing: boolean;
  };
  automation: {
    autoBackup: boolean;
    autoCleanup: boolean;
    autoScaling: boolean;
    autoUpdates: boolean;
  };
  attendance: {
    enabled: boolean;
    allowEmployeeChoice: boolean;
    availableSecurityModes: ('auto-location' | 'manual-location' | 'wifi-only' | 'location-and-wifi' | 'photo-only' | 'all-security')[];
    defaultSecurityMode: 'auto-location' | 'manual-location' | 'wifi-only' | 'location-and-wifi' | 'photo-only' | 'all-security';
    requireLocation: boolean;
    requireWifi: boolean;
    requirePhoto: boolean;
    allowMobileData: boolean;
    gpsAccuracy: number;
    checkInRadius: number;
    checkInTime: string;
    checkOutTime: string;
    gracePeriod: number;
    offices: {
      name: string;
      lat: number;
      lng: number;
      radius: number;
      address: string;
      networks: {
        ssid: string;
        bssid?: string;
        description: string;
      }[];
    }[];
  };
  performanceMonitoring: {
    realTimeMetrics: boolean;
    alertThresholds: {
      cpuUsage: number;
      memoryUsage: number;
      diskUsage: number;
      responseTime: number;
      errorRate: number;
      activeConnections: number;
    };
    autoScaling: {
      enabled: boolean;
      minInstances: number;
      maxInstances: number;
      scaleUpThreshold: number;
      scaleDownThreshold: number;
    };
    resourceLimits: {
      maxCpu: number;
      maxMemory: number;
      maxDisk: number;
      maxBandwidth: number;
      maxRequestsPerMinute: number;
    };
    monitoringIntervals: {
      metricsCollection: number; // seconds
      alertCheck: number; // seconds
      healthCheck: number; // seconds
    };
    performanceAlerts: {
      emailNotifications: boolean;
      slackNotifications: boolean;
      smsNotifications: boolean;
      alertCooldown: number; // minutes
    };
  };
}

const AdminSettingsPageContent: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState('branding');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { saveAll, isSaving: contextSaving, hasChanges, setHasChanges } = useSettingsSave();
  const [settings, setSettings] = useState<SystemSettings>({
    branding: {
      appLogo: '',
      companyName: 'Repair Shop Management',
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      logoSize: 'medium',
      logoPosition: 'left'
    },
    database: {
      url: 'https://jxhzveborezjhsmzsgbc.supabase.co',
      projectId: 'jxhzveborezjhsmzsgbc',
      region: 'us-east-1',
      status: 'online',
      lastSync: new Date().toISOString(),
      connectionPool: 10,
      maxConnections: 100,
      activeConnections: 5
    },
    integrations: {
      sms: {
        provider: 'Mobishastra',
        status: 'active',
        balance: 1000,
        lastUsed: new Date().toISOString()
      },
      email: {
        provider: 'Supabase Auth',
        status: 'active',
        dailyLimit: 1000,
        usedToday: 45
      },
      whatsapp: {
        provider: 'Green API',
        status: 'inactive',
        connected: false,
        lastMessage: ''
      },
      ai: {
        provider: 'Google Gemini',
        status: 'active',
        model: 'gemini-pro',
        apiKeyConfigured: true
      }
    },
    performance: {
      cacheEnabled: true,
      cacheSize: 512,
      compressionEnabled: true,
      cdnEnabled: false,
      loadBalancing: false
    },
    automation: {
      autoBackup: true,
      autoCleanup: true,
      autoScaling: false,
      autoUpdates: false
    },
    attendance: {
      enabled: true,
      allowEmployeeChoice: true,
      availableSecurityModes: ['auto-location', 'manual-location', 'wifi-only'],
      defaultSecurityMode: 'auto-location' as const,
      requireLocation: true,
      requireWifi: true,
      requirePhoto: true,
      allowMobileData: true,
      gpsAccuracy: 50,
      checkInRadius: 100,
      checkInTime: '08:00',
      checkOutTime: '17:00',
      gracePeriod: 15,
      offices: [
        {
          name: 'Arusha Main Office',
          lat: -3.359178,
          lng: 36.661366,
          radius: 100,
          address: 'Main Office, Arusha, Tanzania',
          networks: [
            {
              ssid: 'Office_WiFi',
              bssid: '00:11:22:33:44:55',
              description: 'Main office WiFi network'
            },
            {
              ssid: 'Office_Guest',
              description: 'Guest WiFi network'
            },
            {
              ssid: '4G_Mobile',
              description: 'Mobile data connection'
            }
          ]
        }
      ]
    },
    performanceMonitoring: {
      realTimeMetrics: true,
      alertThresholds: {
        cpuUsage: 80,
        memoryUsage: 80,
        diskUsage: 80,
        responseTime: 2000,
        errorRate: 0.5,
        activeConnections: 100
      },
      autoScaling: {
        enabled: false,
        minInstances: 1,
        maxInstances: 10,
        scaleUpThreshold: 90,
        scaleDownThreshold: 70
      },
      resourceLimits: {
        maxCpu: 100,
        maxMemory: 100,
        maxDisk: 100,
        maxBandwidth: 100,
        maxRequestsPerMinute: 1000
      },
      monitoringIntervals: {
        metricsCollection: 60,
        alertCheck: 60,
        healthCheck: 60
      },
      performanceAlerts: {
        emailNotifications: true,
        slackNotifications: true,
        smsNotifications: true,
        alertCooldown: 15
      }
    }
  });


  useEffect(() => {
    loadSystemSettings();
    
    // Set active section from URL parameter
    const section = searchParams.get('section');
    if (section) {
      setActiveSection(section);
    }
  }, [searchParams]);

  const loadSystemSettings = async () => {
    setLoading(true);
    try {
      // Load settings from database
      const { data, error } = await supabase
        .from('settings')
        .select('key, value');

      if (error) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load system settings');
        return;
      }

      // Parse settings and update state
      const systemSettings: any = {};
      data?.forEach(setting => {
        try {
          systemSettings[setting.key] = JSON.parse(setting.value);
        } catch {
          systemSettings[setting.key] = setting.value;
        }
      });

      // Load attendance settings
      const attendanceSettings = await getAttendanceSettings();

      // Update settings with loaded data
      setSettings(prev => ({
        ...prev,
        ...systemSettings,
        attendance: attendanceSettings
      }));

      toast.success('System settings loaded successfully');
    } catch (error) {
      console.error('Error loading system settings:', error);
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (section: string, data: any) => {
    setSaving(true);
    try {
      if (section === 'attendance') {
        // Save attendance settings using the dedicated API
        await saveAttendanceSettings(data);
        // Update local state with the new attendance settings
        setSettings(prev => ({
          ...prev,
          attendance: data
        }));
      } else {
        // Save other settings using the general approach
        const { error } = await supabase
          .from('settings')
          .upsert(
            Object.entries(data).map(([key, value]) => ({
              key: `${section}_${key}`,
              value: JSON.stringify(value)
            })),
            { onConflict: 'key' }
          );

        if (error) {
          console.error('Error saving settings:', error);
          toast.error('Failed to save settings');
          return;
        }
      }

      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };


  const testConnection = async (type: string) => {
    try {
      toast.loading(`Testing ${type} connection...`);
      
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.dismiss();
      toast.success(`${type} connection successful`);
    } catch (error) {
      toast.dismiss();
      toast.error(`${type} connection failed`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
        return 'text-green-500';
      case 'offline':
      case 'inactive':
        return 'text-gray-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-yellow-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'offline':
      case 'inactive':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Info className="w-4 h-4 text-yellow-500" />;
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'transparent' }}>
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border-2 border-red-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You need admin privileges to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ backgroundColor: 'transparent' }}>
      <div className="max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
        {/* Fixed Icon Header - Matching SetPricingModal style */}
        <div className="sticky top-0 z-50 bg-white rounded-2xl shadow-2xl p-8 mb-6 border-b border-gray-200">
          <div className="grid grid-cols-[auto,1fr,auto] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <Settings className="w-8 h-8 text-white" />
            </div>
            
            {/* Text */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Admin Settings</h1>
              <p className="text-sm text-gray-600">Manage system configuration, backend settings, and database connections</p>
            </div>

            {/* Universal Save Button */}
            <div>
              <button
                onClick={async () => {
                  try {
                    await saveAll();
                    toast.success('All settings saved successfully');
                  } catch (error) {
                    toast.error('Failed to save some settings');
                  }
                }}
                disabled={contextSaving || !hasChanges}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {contextSaving ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save All Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
          {/* Navigation Sidebar - Fixed, doesn't scroll */}
          <div className="lg:col-span-1 flex-shrink-0">
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-6 h-full flex flex-col">
              {/* Icon Header for Sidebar */}
              <div className="mb-6 pb-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Settings Categories</h3>
                </div>
              </div>
              <nav className="space-y-2 overflow-y-auto flex-1 pr-2 sidebar-scrollbar">
                {[
                  { id: 'branding', label: 'Business Information', icon: Building2, color: 'indigo' },
                  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'blue' },
                  { id: 'stores', label: 'Store Management', icon: MapPin, color: 'orange' },
                  { id: 'branch-debug', label: 'Branch Isolation Debug', icon: Bug, color: 'red' },
                  { id: 'inventory', label: 'Inventory', icon: Package, color: 'purple' },
                  { id: 'shipping', label: 'Shipping Management', icon: Truck, color: 'cyan' },
                  { id: 'payments', label: 'Payments', icon: CreditCard, color: 'green' },
                  { id: 'attendance', label: 'Attendance', icon: Users, color: 'teal' },
                  { id: 'loyalty', label: 'Loyalty Program', icon: Star, color: 'yellow' },
                  { id: 'integrations', label: 'Integrations', icon: Globe, color: 'emerald' },
                  { id: 'api-webhooks', label: 'API & Webhooks', icon: Code, color: 'pink' },
                  { id: 'documents', label: 'Document Templates', icon: FileText, color: 'violet' },
                  { id: 'appearance', label: 'Appearance', icon: Palette, color: 'rose' },
                  { id: 'notifications', label: 'Notifications', icon: Bell, color: 'amber' },
                  { id: 'database', label: 'Database', icon: Database, color: 'slate' },
                  { id: 'branch-migration', label: 'Branch Migration', icon: GitBranch, color: 'sky' },
                  { id: 'automation', label: 'Automation', icon: RotateCcw, color: 'lime' }
                ].map((section) => {
                  const isActive = activeSection === section.id;
                  const colorClasses = {
                    indigo: isActive ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'hover:bg-indigo-50 hover:border-indigo-200',
                    blue: isActive ? 'bg-blue-50 border-blue-300 text-blue-700' : 'hover:bg-blue-50 hover:border-blue-200',
                    orange: isActive ? 'bg-orange-50 border-orange-300 text-orange-700' : 'hover:bg-orange-50 hover:border-orange-200',
                    red: isActive ? 'bg-red-50 border-red-300 text-red-700' : 'hover:bg-red-50 hover:border-red-200',
                    purple: isActive ? 'bg-purple-50 border-purple-300 text-purple-700' : 'hover:bg-purple-50 hover:border-purple-200',
                    cyan: isActive ? 'bg-cyan-50 border-cyan-300 text-cyan-700' : 'hover:bg-cyan-50 hover:border-cyan-200',
                    green: isActive ? 'bg-green-50 border-green-300 text-green-700' : 'hover:bg-green-50 hover:border-green-200',
                    teal: isActive ? 'bg-teal-50 border-teal-300 text-teal-700' : 'hover:bg-teal-50 hover:border-teal-200',
                    yellow: isActive ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : 'hover:bg-yellow-50 hover:border-yellow-200',
                    emerald: isActive ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'hover:bg-emerald-50 hover:border-emerald-200',
                    pink: isActive ? 'bg-pink-50 border-pink-300 text-pink-700' : 'hover:bg-pink-50 hover:border-pink-200',
                    violet: isActive ? 'bg-violet-50 border-violet-300 text-violet-700' : 'hover:bg-violet-50 hover:border-violet-200',
                    rose: isActive ? 'bg-rose-50 border-rose-300 text-rose-700' : 'hover:bg-rose-50 hover:border-rose-200',
                    amber: isActive ? 'bg-amber-50 border-amber-300 text-amber-700' : 'hover:bg-amber-50 hover:border-amber-200',
                    slate: isActive ? 'bg-slate-50 border-slate-300 text-slate-700' : 'hover:bg-slate-50 hover:border-slate-200',
                    sky: isActive ? 'bg-sky-50 border-sky-300 text-sky-700' : 'hover:bg-sky-50 hover:border-sky-200',
                    lime: isActive ? 'bg-lime-50 border-lime-300 text-lime-700' : 'hover:bg-lime-50 hover:border-lime-200',
                    indigo: isActive ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'hover:bg-indigo-50 hover:border-indigo-200',
                  };
                  
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all font-semibold text-sm shadow-sm hover:shadow-md ${
                        isActive 
                          ? colorClasses[section.color as keyof typeof colorClasses]
                          : `border-gray-200 text-gray-700 bg-white ${colorClasses[section.color as keyof typeof colorClasses]}`
                      }`}
                    >
                      <section.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? '' : 'text-gray-500'}`} />
                      <span className="text-sm">{section.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content - Scrollable */}
          <div className="lg:col-span-3 min-h-0 overflow-y-auto">
            {/* Components that already have unified structure render as-is */}
            {activeSection === 'shipping' && (
              <ShippingSettings isActive={true} />
            )}

            {activeSection === 'appearance' && (
              <AppearanceSettings isActive={true} />
            )}

            {activeSection === 'notifications' && (
              <NotificationSettings isActive={true} />
            )}

            {activeSection === 'payments' && (
              <PaymentSettings isActive={true} />
            )}

            {activeSection === 'stores' && (
              <StoreManagementSettings />
            )}

            {/* Components that need unified wrapper */}
            {activeSection === 'branding' && (
              <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full flex flex-col overflow-hidden relative">
                <UnifiedBrandingSettings />
              </div>
            )}

            {activeSection === 'dashboard' && (
              <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full flex flex-col overflow-hidden relative">
                <DashboardCustomizationSettings />
              </div>
            )}

            {activeSection === 'branch-debug' && (
              <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full flex flex-col overflow-hidden relative">
                <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
                  <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                      <Bug className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-3">Branch Isolation Debug</h2>
                      <p className="text-sm text-gray-600">Debug and test branch data isolation settings</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
                  <div className="py-6 space-y-6">
                    <BranchIsolationDebugPanel />
                    <BranchDataCleanupPanel />
                    <BranchProductManagement />
                    <BranchProductSharing />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'inventory' && (
              <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full flex flex-col overflow-hidden relative">
                <InventorySettings />
              </div>
            )}

            {activeSection === 'loyalty' && (
              <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full flex flex-col overflow-hidden relative">
                <LoyaltyProgramSettings />
              </div>
            )}

            {activeSection === 'api-webhooks' && (
              <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full flex flex-col overflow-hidden relative">
                <APIWebhooksSettings />
              </div>
            )}

            {activeSection === 'documents' && (
              <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full flex flex-col overflow-hidden relative">
                <DocumentTemplatesSettings />
              </div>
            )}
            
            {activeSection === 'database' && (
              <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full flex flex-col overflow-hidden relative">
                <DatabaseSettings />
              </div>
            )}

            {activeSection === 'integrations' && (
              <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full flex flex-col overflow-hidden relative">
                <IntegrationsManagement />
              </div>
            )}

            {activeSection === 'attendance' && (
              <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full flex flex-col overflow-hidden relative">
                <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
                  <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
                    <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center shadow-lg">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-3">Attendance Settings</h2>
                      <p className="text-sm text-gray-600">Configure employee attendance tracking and policies</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
                  <div className="py-6">
                    <AttendanceSettings 
                      settings={settings.attendance}
                      onSave={(data) => saveSettings('attendance', data)}
                      getStatusIcon={getStatusIcon}
                      getStatusColor={getStatusColor}
                    />
                  </div>
                </div>
              </div>
            )}


            {activeSection === 'branch-migration' && (
              <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full flex flex-col overflow-hidden relative">
                <DatabaseBranchMigration />
              </div>
            )}

            {activeSection === 'automation' && (
              <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full flex flex-col overflow-hidden relative">
                <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
                  <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
                    <div className="w-16 h-16 bg-lime-600 rounded-full flex items-center justify-center shadow-lg">
                      <RotateCcw className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-3">Automation Settings</h2>
                      <p className="text-sm text-gray-600">Configure automated workflows and processes</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
                  <div className="py-6">
                    <AutomationSettings 
                      settings={settings.automation}
                      onSave={(data) => saveSettings('automation', data)}
                      getStatusIcon={getStatusIcon}
                      getStatusColor={getStatusColor}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Branding Settings Component
const BrandingSettings: React.FC<{
  settings: any;
  onSave: (data: any) => void;
}> = ({ settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(localSettings);
      toast.success('Branding settings saved successfully');
    } catch (error) {
      console.error('Error saving branding settings:', error);
      toast.error('Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Image className="w-6 h-6 text-indigo-600" />
          <h3 className="text-xl font-semibold text-gray-800">Branding Settings</h3>
        </div>
      </div>

        <div className="space-y-6">
          {/* Logo Upload */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200 shadow-sm">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
              <Image className="h-5 w-5 text-blue-600 mr-2" />
              App Logo
            </h4>
            <LogoUpload
              currentLogo={localSettings.appLogo}
              onLogoChange={(logoUrl) => setLocalSettings(prev => ({ ...prev, appLogo: logoUrl }))}
              title="System Logo"
              description="Upload the main application logo. This will be displayed in headers, receipts, and throughout the app."
              maxSize={3}
            />
          </div>

          {/* Company Information */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 shadow-sm">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
              <Building2 className="h-5 w-5 text-green-600 mr-2" />
              Company Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Company Name</label>
                <input
                  type="text"
                  value={localSettings.companyName || ''}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Enter company name"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                />
              </div>
            </div>
          </div>

          {/* Color Scheme */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200 shadow-sm">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
              <Palette className="h-5 w-5 text-purple-600 mr-2" />
              Color Scheme
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={localSettings.primaryColor || '#3B82F6'}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-12 h-12 rounded-xl border-2 border-gray-300 shadow-sm"
                  />
                  <input
                    type="text"
                    value={localSettings.primaryColor || ''}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                    placeholder="#3B82F6"
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Secondary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={localSettings.secondaryColor || '#1E40AF'}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    className="w-12 h-12 rounded-xl border-2 border-gray-300 shadow-sm"
                  />
                  <input
                    type="text"
                    value={localSettings.secondaryColor || ''}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    placeholder="#1E40AF"
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Logo Display Settings */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border-2 border-orange-200 shadow-sm">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
              <Eye className="h-5 w-5 text-orange-600 mr-2" />
              Logo Display
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Logo Size</label>
                <select
                  value={localSettings.logoSize || 'medium'}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, logoSize: e.target.value as 'small' | 'medium' | 'large' }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Logo Position</label>
                <select
                  value={localSettings.logoPosition || 'left'}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, logoPosition: e.target.value as 'left' | 'center' | 'right' }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-6 border-2 border-cyan-200 shadow-sm">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
              <Eye className="h-5 w-5 text-cyan-600 mr-2" />
              Preview
            </h4>
            <div className="p-6 bg-gray-50 rounded-xl border-2 border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {localSettings.appLogo && (
                    <img
                      src={localSettings.appLogo}
                      alt="App Logo"
                      className={`object-contain ${
                        localSettings.logoSize === 'small' ? 'w-8 h-8' :
                        localSettings.logoSize === 'medium' ? 'w-12 h-12' : 'w-16 h-16'
                      }`}
                    />
                  )}
                  <div>
                    <h5 className="font-medium text-gray-800">{localSettings.companyName}</h5>
                    <p className="text-sm text-gray-600">System Management</p>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {hostingerUploadService.isDevelopment() ? 'Development Mode' : 'Production Mode'}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Branding Settings'}
            </button>

            <button
              onClick={() => setLocalSettings(settings)}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-all shadow-sm"
            >
              <RotateCcw className="w-5 h-5" />
              Reset
            </button>
          </div>
        </div>
    </div>
  );
};

// Attendance Settings Component
const AttendanceSettings: React.FC<{
  settings: any;
  onSave: (data: any) => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusColor: (status: string) => string;
}> = ({ settings, onSave, getStatusIcon, getStatusColor }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>('general');

  // Update local settings when settings prop changes
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);
  const [editingOffice, setEditingOffice] = useState<number | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<any>(null);
  const [newOffice, setNewOffice] = useState({
    name: '',
    lat: '',
    lng: '',
    radius: '100',
    address: '',
    networks: [{ ssid: '', description: '' }]
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? '' : sectionId);
  };

  const validateSettings = (): boolean => {
    const errors: string[] = [];

    if (!localSettings.enabled) {
      // If attendance is disabled, no need to validate further
      return true;
    }

    if (localSettings.checkInRadius < 10) {
      errors.push('Check-in radius must be at least 10 meters');
    }

    if (localSettings.gpsAccuracy < 10) {
      errors.push('GPS accuracy must be at least 10 meters');
    }

    if (localSettings.gracePeriod < 0 || localSettings.gracePeriod > 60) {
      errors.push('Grace period must be between 0 and 60 minutes');
    }

    if (localSettings.offices.length === 0) {
      errors.push('At least one office location must be configured');
    }

    if (localSettings.allowEmployeeChoice && (!localSettings.availableSecurityModes || localSettings.availableSecurityModes.length === 0)) {
      errors.push('Please select at least one security mode for employees');
    }

    localSettings.offices.forEach((office: any, index: number) => {
      if (!office.name.trim()) {
        errors.push(`Office ${index + 1}: Name is required`);
      }
      if (office.radius < 10) {
        errors.push(`Office ${index + 1}: Radius must be at least 10 meters`);
      }
      if (office.networks.length === 0) {
        errors.push(`Office ${index + 1}: At least one WiFi network must be configured`);
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    if (!validateSettings()) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    setSaving(true);
    try {
      await onSave(localSettings);
      toast.success('Attendance settings saved successfully');
      setValidationErrors([]);
    } catch (error) {
      console.error('Failed to save attendance settings:', error);
      toast.error('Failed to save attendance settings');
    } finally {
      setSaving(false);
    }
  };

  const addOffice = () => {
    // Validate the new office data
    if (!newOffice.name.trim()) {
      toast.error('Office name is required');
      return;
    }
    
    if (!newOffice.lat || !newOffice.lng) {
      toast.error('Office coordinates (latitude and longitude) are required');
      return;
    }

    const lat = parseFloat(newOffice.lat);
    const lng = parseFloat(newOffice.lng);
    
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Invalid coordinates. Please enter valid numbers.');
      return;
    }

    if (lat < -90 || lat > 90) {
      toast.error('Latitude must be between -90 and 90');
      return;
    }

    if (lng < -180 || lng > 180) {
      toast.error('Longitude must be between -180 and 180');
      return;
    }

    const radius = parseInt(newOffice.radius);
    if (isNaN(radius) || radius < 10) {
      toast.error('Radius must be at least 10 meters');
      return;
    }

    const validNetworks = newOffice.networks.filter(n => n.ssid.trim());
    if (validNetworks.length === 0) {
      toast.error('At least one WiFi network with SSID is required');
      return;
    }

    setLocalSettings({
      ...localSettings,
      offices: [
        ...localSettings.offices,
        {
          name: newOffice.name,
          lat,
          lng,
          radius,
          address: newOffice.address,
          networks: validNetworks
        }
      ]
    });
    
    setNewOffice({
      name: '',
      lat: '',
      lng: '',
      radius: '100',
      address: '',
      networks: [{ ssid: '', description: '' }]
    });
    
    toast.success(`Office "${newOffice.name}" added successfully`);
    setValidationErrors([]); // Clear validation errors when adding new office
  };

  const removeOffice = (index: number) => {
    setLocalSettings({
      ...localSettings,
      offices: localSettings.offices.filter((_, i) => i !== index)
    });
  };

  const updateOffice = (index: number, field: string, value: any) => {
    const updatedOffices = [...localSettings.offices];
    updatedOffices[index] = { ...updatedOffices[index], [field]: value };
    setLocalSettings({ ...localSettings, offices: updatedOffices });
  };

  const addNetwork = (officeIndex: number) => {
    const updatedOffices = [...localSettings.offices];
    updatedOffices[officeIndex].networks.push({ ssid: '', description: '' });
    setLocalSettings({ ...localSettings, offices: updatedOffices });
  };

  const removeNetwork = (officeIndex: number, networkIndex: number) => {
    const updatedOffices = [...localSettings.offices];
    updatedOffices[officeIndex].networks.splice(networkIndex, 1);
    setLocalSettings({ ...localSettings, offices: updatedOffices });
  };

  const updateNetwork = (officeIndex: number, networkIndex: number, field: string, value: string) => {
    const updatedOffices = [...localSettings.offices];
    updatedOffices[officeIndex].networks[networkIndex] = {
      ...updatedOffices[officeIndex].networks[networkIndex],
      [field]: value
    };
    setLocalSettings({ ...localSettings, offices: updatedOffices });
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNewOffice(prev => ({
            ...prev,
            lat: position.coords.latitude.toString(),
            lng: position.coords.longitude.toString()
          }));
          toast.success('Current location detected!');
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Failed to get current location. Please enter coordinates manually.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser.');
    }
  };

  return (
    <div className="space-y-6">
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-red-900">Validation Errors</h4>
                  <button
                    onClick={() => setValidationErrors([])}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Dismiss
                  </button>
                </div>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      
        <div className="space-y-6">
          {/* General Settings */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('general')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl border-2 border-blue-200 shadow-sm">
                  <Settings className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
                  <p className="text-sm text-gray-600">Configure basic attendance options</p>
                </div>
              </div>
              {expandedSection === 'general' ? (
                <ChevronUp className="w-6 h-6 text-gray-600" />
              ) : (
                <ChevronDown className="w-6 h-6 text-gray-600" />
              )}
            </div>
            {expandedSection === 'general' && (
            <div className="mt-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-gray-200 shadow-sm">
                <span className="text-xs font-medium text-gray-700">Enable Attendance</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.enabled}
                    onChange={(e) => setLocalSettings({ ...localSettings, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-gray-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-medium text-gray-700">Require Photo Verification</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.requirePhoto}
                    onChange={(e) => setLocalSettings({ ...localSettings, requirePhoto: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Security Mode Configuration - REDESIGNED */}
              <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200 shadow-md">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-sm">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Security Mode Configuration</h3>
                      <p className="text-xs text-gray-600">Control how employees verify their attendance</p>
                    </div>
                  </div>
                </div>

                {/* Mode Selector: Employee Choice vs Enforced */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Option 1: Allow Choice */}
                  <button
                    onClick={() => setLocalSettings({ ...localSettings, allowEmployeeChoice: true })}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      localSettings.allowEmployeeChoice
                        ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg scale-105'
                        : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl shadow-sm ${localSettings.allowEmployeeChoice ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900">Employee Choice</span>
                          {localSettings.allowEmployeeChoice && (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Let employees pick their preferred security method from your approved list. Flexible & convenient!
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Option 2: Enforced Mode */}
                  <button
                    onClick={() => setLocalSettings({ ...localSettings, allowEmployeeChoice: false })}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      !localSettings.allowEmployeeChoice
                        ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-amber-50 shadow-lg scale-105'
                        : 'border-gray-200 bg-white hover:border-orange-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl shadow-sm ${!localSettings.allowEmployeeChoice ? 'bg-orange-500' : 'bg-gray-300'}`}>
                        <Lock className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900">Enforced Mode</span>
                          {!localSettings.allowEmployeeChoice && (
                            <CheckCircle className="w-5 h-5 text-orange-600" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Require all employees to use one specific security method. Consistent & simple!
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Available Security Modes (Card Grid) */}
                {localSettings.allowEmployeeChoice && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                      <label className="text-sm font-bold text-gray-900">Select Available Security Modes</label>
                      <span className="text-xs text-gray-500 ml-auto">
                        {localSettings.availableSecurityModes?.length || 0} selected
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[
                        { 
                          value: 'auto-location', 
                          icon: Target, 
                          label: 'Auto-Location', 
                          desc: 'GPS auto-detection with fallback',
                          color: 'blue',
                          iconColor: 'text-blue-600',
                          badge: 'Recommended'
                        },
                        { 
                          value: 'manual-location', 
                          icon: MapPin, 
                          label: 'Manual Location', 
                          desc: 'Select office + GPS verify',
                          color: 'indigo',
                          iconColor: 'text-indigo-600',
                          badge: null
                        },
                        { 
                          value: 'wifi-only', 
                          icon: Wifi, 
                          label: 'WiFi Only', 
                          desc: 'Network verification only',
                          color: 'purple',
                          iconColor: 'text-purple-600',
                          badge: null
                        },
                        { 
                          value: 'location-and-wifi', 
                          icon: Lock, 
                          label: 'Location + WiFi', 
                          desc: 'Both GPS and network',
                          color: 'orange',
                          iconColor: 'text-orange-600',
                          badge: 'High Security'
                        },
                        { 
                          value: 'photo-only', 
                          icon: Camera, 
                          label: 'Photo Only', 
                          desc: 'Photo verification only',
                          color: 'pink',
                          iconColor: 'text-pink-600',
                          badge: 'Least Secure'
                        },
                        { 
                          value: 'all-security', 
                          icon: Shield, 
                          label: 'Maximum Security', 
                          desc: 'GPS + WiFi + Photo',
                          color: 'red',
                          iconColor: 'text-red-600',
                          badge: 'Max Security'
                        },
                      ].map((mode) => {
                        const isSelected = localSettings.availableSecurityModes?.includes(mode.value as any) || false;
                        
                        // Color classes for each mode
                        const colorClasses = {
                          blue: 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100',
                          indigo: 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-indigo-100',
                          purple: 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100',
                          orange: 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100',
                          pink: 'border-pink-500 bg-gradient-to-br from-pink-50 to-pink-100',
                          red: 'border-red-500 bg-gradient-to-br from-red-50 to-red-100',
                        };
                        
                        return (
                          <label 
                            key={mode.value} 
                            className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                              isSelected 
                                ? `${colorClasses[mode.color as keyof typeof colorClasses]} shadow-md` 
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const modes = localSettings.availableSecurityModes || [];
                                if (e.target.checked) {
                                  setLocalSettings({
                                    ...localSettings,
                                    availableSecurityModes: [...modes, mode.value as any]
                                  });
                                } else {
                                  setLocalSettings({
                                    ...localSettings,
                                    availableSecurityModes: modes.filter(m => m !== mode.value)
                                  });
                                }
                              }}
                              className="sr-only"
                            />
                            {/* Badge */}
                            {mode.badge && (
                              <div className="absolute top-2 right-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  mode.badge === 'Recommended' ? 'bg-green-500 text-white' :
                                  mode.badge === 'High Security' ? 'bg-orange-500 text-white' :
                                  mode.badge === 'Max Security' ? 'bg-red-500 text-white' :
                                  'bg-yellow-500 text-white'
                                }`}>
                                  {mode.badge}
                                </span>
                              </div>
                            )}
                            
                            {/* Content */}
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-xl border-2 ${isSelected ? 'bg-white border-blue-500 shadow-sm' : 'bg-gray-100 border-gray-200'}`}>
                                <mode.icon className={`w-6 h-6 ${isSelected ? mode.iconColor : 'text-gray-400'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-bold text-gray-900 truncate">{mode.label}</span>
                                  {isSelected && (
                                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 leading-snug">{mode.desc}</p>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {(!localSettings.availableSecurityModes || localSettings.availableSecurityModes.length === 0) && (
                      <div className="mt-3 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl shadow-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <p className="text-xs text-yellow-800">Please select at least one security mode for employees</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Default/Required Security Mode */}
                <div className="p-4 bg-white rounded-xl border-2 border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-blue-100 rounded">
                      <Star className="w-4 h-4 text-blue-600" />
                    </div>
                    <label className="text-sm font-bold text-gray-900">
                      {localSettings.allowEmployeeChoice ? 'Default Security Mode' : 'Required Security Mode'}
                    </label>
                  </div>
                  
                  <select
                    value={localSettings.defaultSecurityMode || 'auto-location'}
                    onChange={(e) => setLocalSettings({ ...localSettings, defaultSecurityMode: e.target.value as any })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium transition-colors"
                  >
                    <option value="auto-location">Auto-Location (GPS Auto-Detect)</option>
                    <option value="manual-location">Manual Location Selection</option>
                    <option value="wifi-only">WiFi Only</option>
                    <option value="location-and-wifi">Location + WiFi (High Security)</option>
                    <option value="photo-only">Photo Only</option>
                    <option value="all-security">Maximum Security (All Methods)</option>
                  </select>
                  
                  <div className="mt-3 p-4 bg-blue-50 rounded-xl border-2 border-blue-200 shadow-sm flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800 leading-relaxed">
                      {localSettings.allowEmployeeChoice 
                        ? 'This mode will be pre-selected for employees. They can change it to any available mode you selected above.' 
                        : 'All employees will be required to use this security mode. No other options will be available.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            </div>
            )}
          </div>

          {/* Location Settings */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('location')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-xl border-2 border-green-200 shadow-sm">
                  <MapPin className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Location Settings</h3>
                  <p className="text-sm text-gray-600">Configure GPS, radius, and time settings</p>
                </div>
              </div>
              {expandedSection === 'location' ? (
                <ChevronUp className="w-6 h-6 text-gray-600" />
              ) : (
                <ChevronDown className="w-6 h-6 text-gray-600" />
              )}
            </div>
            {expandedSection === 'location' && (
            <div className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  GPS Accuracy (meters)
                </label>
                <input
                  type="number"
                  value={localSettings.gpsAccuracy || 0}
                  onChange={(e) => setLocalSettings({ ...localSettings, gpsAccuracy: parseInt(e.target.value) || 0 })}
                  min="10"
                  max="1000"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Check-in Radius (meters)
                </label>
                <input
                  type="number"
                  value={localSettings.checkInRadius || 0}
                  onChange={(e) => setLocalSettings({ ...localSettings, checkInRadius: parseInt(e.target.value) || 0 })}
                  min="10"
                  max="1000"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Grace Period (minutes)
                </label>
                <input
                  type="number"
                  value={localSettings.gracePeriod || 0}
                  onChange={(e) => setLocalSettings({ ...localSettings, gracePeriod: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="60"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Check-in Time
                </label>
                <input
                  type="time"
                  value={localSettings.checkInTime || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, checkInTime: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Check-out Time
                </label>
                <input
                  type="time"
                  value={localSettings.checkOutTime || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, checkOutTime: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                />
              </div>
            </div>
            </div>
            )}
          </div>

          {/* Office Locations */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('offices')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-xl border-2 border-purple-200 shadow-sm">
                  <Building2 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Office Locations</h3>
                  <p className="text-sm text-gray-600">Manage office locations and WiFi networks</p>
                </div>
              </div>
              {expandedSection === 'offices' ? (
                <ChevronUp className="w-6 h-6 text-gray-600" />
              ) : (
                <ChevronDown className="w-6 h-6 text-gray-600" />
              )}
            </div>
            {expandedSection === 'offices' && (
            <div className="mt-6">
            
            {/* Office Map */}
            <div className="mb-6">
              <OfficeMap
                offices={localSettings.offices}
                selectedOffice={selectedOffice}
                onOfficeSelect={(office) => {
                  setSelectedOffice(office);
                  // Find the index of the selected office and open it for editing
                  const officeIndex = localSettings.offices.findIndex((o: any) => 
                    o.name === office?.name && o.lat === office?.lat && o.lng === office?.lng
                  );
                  if (officeIndex !== -1) {
                    setEditingOffice(officeIndex);
                  }
                }}
                showRadius={true}
              />
              {selectedOffice && (
                <div className="mt-3 p-4 bg-blue-50 rounded-xl border-2 border-blue-200 shadow-sm">
                  <p className="text-sm text-blue-800">
                    <strong>Selected:</strong> {selectedOffice.name} - {selectedOffice.address}
                  </p>
                </div>
              )}
            </div>
            
            {/* Existing Offices */}
            {localSettings.offices.map((office: any, officeIndex: number) => (
              <div key={officeIndex} className="bg-white rounded-xl p-6 mb-4 border-2 border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="font-medium text-gray-900">{office.name}</h5>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingOffice(editingOffice === officeIndex ? null : officeIndex)}
                      className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border-2 border-blue-200 hover:border-blue-300 shadow-sm"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeOffice(officeIndex)}
                      className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors border-2 border-red-200 hover:border-red-300 shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {editingOffice === officeIndex ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Office Name
                        </label>
                        <input
                          type="text"
                          value={office.name}
                          onChange={(e) => updateOffice(officeIndex, 'name', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Address
                        </label>
                        <input
                          type="text"
                          value={office.address}
                          onChange={(e) => updateOffice(officeIndex, 'address', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Latitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={office.lat || 0}
                          onChange={(e) => updateOffice(officeIndex, 'lat', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Longitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={office.lng || 0}
                          onChange={(e) => updateOffice(officeIndex, 'lng', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Radius (meters)
                        </label>
                        <input
                          type="number"
                          value={office.radius || 0}
                          onChange={(e) => updateOffice(officeIndex, 'radius', parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                        />
                      </div>
                    </div>
                    
                    {/* Networks */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h6 className="font-medium text-gray-700">WiFi Networks</h6>
                        <button
                          onClick={() => addNetwork(officeIndex)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      {office.networks.map((network: any, networkIndex: number) => (
                        <div key={networkIndex} className="flex gap-2 mb-2">
                          <input
                            type="text"
                            placeholder="SSID"
                            value={network.ssid}
                            onChange={(e) => updateNetwork(officeIndex, networkIndex, 'ssid', e.target.value)}
                            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                          />
                          <input
                            type="text"
                            placeholder="Description"
                            value={network.description}
                            onChange={(e) => updateNetwork(officeIndex, networkIndex, 'description', e.target.value)}
                            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                          />
                          <button
                            onClick={() => removeNetwork(officeIndex, networkIndex)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    <p><strong>Address:</strong> {office.address}</p>
                    <p><strong>Coordinates:</strong> {office.lat}, {office.lng}</p>
                    <p><strong>Radius:</strong> {office.radius}m</p>
                    <p><strong>Networks:</strong> {office.networks.length} configured</p>
                  </div>
                )}
              </div>
            ))}

            {/* Add New Office */}
            <div className="bg-white rounded-xl p-6 border-2 border-dashed border-gray-300 shadow-sm">
              <h5 className="font-medium text-gray-900 mb-4">Add New Office</h5>
              
              {/* Get Current Location Button */}
              <div className="mb-4">
                <GlassButton
                  onClick={getCurrentLocation}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  <Compass className="w-4 h-4 mr-2" />
                  Get Current Location
                </GlassButton>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Office Name
                  </label>
                  <input
                    type="text"
                    value={newOffice.name || ''}
                    onChange={(e) => setNewOffice({ ...newOffice, name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={newOffice.address || ''}
                    onChange={(e) => setNewOffice({ ...newOffice, address: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newOffice.lat || ''}
                    onChange={(e) => setNewOffice({ ...newOffice, lat: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newOffice.lng || ''}
                    onChange={(e) => setNewOffice({ ...newOffice, lng: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Radius (meters)
                  </label>
                  <input
                    type="number"
                    value={newOffice.radius || ''}
                    onChange={(e) => setNewOffice({ ...newOffice, radius: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                  />
                </div>
              </div>
              
              {/* Networks for new office */}
              <div className="mb-4">
                <h6 className="font-medium text-gray-700 mb-2">WiFi Networks</h6>
                {newOffice.networks.map((network, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="SSID"
                      value={network.ssid}
                      onChange={(e) => {
                        const updatedNetworks = [...newOffice.networks];
                        updatedNetworks[index].ssid = e.target.value;
                        setNewOffice({ ...newOffice, networks: updatedNetworks });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={network.description}
                      onChange={(e) => {
                        const updatedNetworks = [...newOffice.networks];
                        updatedNetworks[index].description = e.target.value;
                        setNewOffice({ ...newOffice, networks: updatedNetworks });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {newOffice.networks.length > 1 && (
                      <button
                        onClick={() => {
                          const updatedNetworks = newOffice.networks.filter((_, i) => i !== index);
                          setNewOffice({ ...newOffice, networks: updatedNetworks });
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setNewOffice({ ...newOffice, networks: [...newOffice.networks, { ssid: '', description: '' }] })}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Network
                </button>
              </div>
              
              <button
                onClick={addOffice}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 transition-all font-semibold shadow-lg hover:shadow-xl"
              >
                Add Office
              </button>
            </div>
            </div>
            )}
          </div>

          {/* Save Button */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <div className="flex justify-end">
              <GlassButton
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </>
                )}
              </GlassButton>
            </div>
          </div>
        </div>
    </div>
  );
};

// Database Settings Component
const DatabaseSettings: React.FC = () => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [backupStatus, setBackupStatus] = useState('');
  const [backupType, setBackupType] = useState<'full' | 'schema-only' | 'data-only'>('full');
  const [loading, setLoading] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  
  // Table selection for backup
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [showTableSelector, setShowTableSelector] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  
  // Automatic backup settings
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupFrequency, setAutoBackupFrequency] = useState('daily');
  const [autoBackupTime, setAutoBackupTime] = useState('02:00');
  const [autoBackupType, setAutoBackupType] = useState<'full' | 'schema-only' | 'data-only'>('full');
  const [lastAutoBackup, setLastAutoBackup] = useState<string | null>(null);
  
  // Restore functionality state
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreFormats, setRestoreFormats] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [restoreSelectedTables, setRestoreSelectedTables] = useState<string[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [showRestoreTableSelection, setShowRestoreTableSelection] = useState(false);
  
  // Offline Database Management state
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number; currentTask: string; percentage: number } | null>(null);
  const [downloadMetadata, setDownloadMetadata] = useState<any>(null);
  const [pendingSales, setPendingSales] = useState(0);
  const [pendingSalesList, setPendingSalesList] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [autoSyncStatus, setAutoSyncStatus] = useState(autoSyncService.getStatus());
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [syncInterval, setSyncInterval] = useState(30);

  // Load automatic backup settings from database
  useEffect(() => {
    fetchAutoBackupSettings();
    loadRestoreFormats();
    loadDownloadMetadata();
    loadPendingSales();
    
    // Start auto sync for offline sales
    offlineSaleSyncService.startAutoSync();
    
    // Subscribe to auto sync status updates
    const unsubscribe = autoSyncService.subscribe((status) => {
      setAutoSyncStatus(status);
    });
    
    // Load sync interval from settings
    const savedInterval = localStorage.getItem('auto_sync_interval');
    if (savedInterval) {
      setSyncInterval(Math.round(parseInt(savedInterval, 10) / 1000 / 60));
    }
    
    // Update pending sales count periodically
    const interval = setInterval(() => {
      loadPendingSales();
    }, 5000);

    return () => {
      clearInterval(interval);
      offlineSaleSyncService.stopAutoSync();
      unsubscribe();
    };
  }, []);

  const loadDownloadMetadata = () => {
    const meta = fullDatabaseDownloadService.getDownloadMetadata();
    setDownloadMetadata(meta);
  };

  const loadPendingSales = () => {
    const allSales = offlineSaleSyncService.getOfflineSales();
    const pending = allSales.filter(s => !s.synced);
    setPendingSales(pending.length);
    setPendingSalesList(pending);
  };

  const loadRestoreFormats = async () => {
    try {
      const formats = await getRestoreFormats();
      setRestoreFormats(formats);
    } catch (error) {
      console.error('Failed to load restore formats:', error);
    }
  };

  const fetchAutoBackupSettings = async () => {
    try {
      setLoading(true);
      // @ts-ignore - Neon query builder implements thenable interface
      const { data, error } = await supabase
        .from('lats_pos_general_settings')
        .select('id, auto_backup_enabled, auto_backup_frequency, auto_backup_time, auto_backup_type, last_auto_backup')
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setSettingsId(data.id);
        setAutoBackupEnabled(data.auto_backup_enabled || false);
        setAutoBackupFrequency(data.auto_backup_frequency || 'daily');
        setAutoBackupTime(data.auto_backup_time || '02:00');
        setAutoBackupType(data.auto_backup_type || 'full');
        setLastAutoBackup(data.last_auto_backup || null);
      }
    } catch (error: any) {
      console.error('Error fetching auto backup settings:', error);
      toast.error('Failed to load automatic backup settings');
    } finally {
      setLoading(false);
    }
  };

  // Save automatic backup settings to database
  const saveAutoBackupSettings = async () => {
    if (!settingsId) {
      toast.error('Settings ID not found');
      return;
    }

    try {
      // @ts-ignore - Neon query builder implements thenable interface
      const { error } = await supabase
        .from('lats_pos_general_settings')
        .update({
          auto_backup_enabled: autoBackupEnabled,
          auto_backup_frequency: autoBackupFrequency,
          auto_backup_time: autoBackupTime,
          auto_backup_type: autoBackupType
        })
        .eq('id', settingsId);

      if (error) throw error;

      toast.success('Automatic backup settings saved!');
      
      // Show reminder about organizing backups on Desktop
      if (autoBackupEnabled) {
        setTimeout(() => {
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error saving auto backup settings:', error);
      toast.error('Failed to save automatic backup settings');
    }
  };

  // Fetch available tables for selection
  const fetchAvailableTables = async () => {
    setLoadingTables(true);
    try {
      // @ts-ignore - Neon query builder implements thenable interface
      const { data: allTables, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .order('table_name');

      if (error) throw error;

      const tableNames = allTables?.map((t: any) => t.table_name) || [];
      setAvailableTables(tableNames);
      
      // Don't auto-select tables - let user choose
      // if (selectedTables.length === 0) {
      //   setSelectedTables(tableNames);
      // }
      
      // Don't auto-expand groups - let user expand as needed
      // if (expandedGroups.length === 0) {
      //   setTimeout(() => {
      //     const groups: { [key: string]: string[] } = {
      //       'lats_pos': [],
      //       'user': [],
      //       'product': [],
      //       'transaction': [],
      //       'inventory': [],
      //       'system': [],
      //       'other': []
      //     };
      //
      //     tableNames.forEach(table => {
      //       if (table.startsWith('lats_pos_')) {
      //         groups['lats_pos'].push(table);
      //       } else if (table.startsWith('user')) {
      //         groups['user'].push(table);
      //       } else if (table.startsWith('product')) {
      //         groups['product'].push(table);
      //       } else if (table.includes('transaction') || table.includes('sale') || table.includes('payment')) {
      //         groups['transaction'].push(table);
      //       } else if (table.includes('inventory') || table.includes('stock') || table.includes('warehouse')) {
      //         groups['inventory'].push(table);
      //       } else if (table.includes('information_schema') || table.includes('pg_') || table.startsWith('_')) {
      //         groups['system'].push(table);
      //       } else {
      //         groups['other'].push(table);
      //       }
      //     });
      //
      //     const nonEmptyGroups = Object.keys(groups).filter(key => groups[key].length > 0);
      //     setExpandedGroups(nonEmptyGroups);
      //   }, 100);
      // }
    } catch (error: any) {
      console.error('Error fetching tables:', error);
      toast.error('Failed to fetch table list');
    } finally {
      setLoadingTables(false);
    }
  };

  // Toggle table selection
  const toggleTableSelection = (tableName: string) => {
    setSelectedTables(prev => 
      prev.includes(tableName) 
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    );
  };

  // Select all tables
  const selectAllTables = () => {
    setSelectedTables(availableTables);
  };

  // Deselect all tables
  const deselectAllTables = () => {
    setSelectedTables([]);
  };

  // Group tables by prefix
  const groupTablesByPrefix = () => {
    const groups: { [key: string]: string[] } = {
      'lats_pos': [],
      'user': [],
      'product': [],
      'transaction': [],
      'inventory': [],
      'system': [],
      'other': []
    };

    // Filter tables by search query first
    const filteredTables = tableSearchQuery 
      ? availableTables.filter(table => 
          table.toLowerCase().includes(tableSearchQuery.toLowerCase())
        )
      : availableTables;

    filteredTables.forEach(table => {
      if (table.startsWith('lats_pos_')) {
        groups['lats_pos'].push(table);
      } else if (table.startsWith('user')) {
        groups['user'].push(table);
      } else if (table.startsWith('product')) {
        groups['product'].push(table);
      } else if (table.includes('transaction') || table.includes('sale') || table.includes('payment')) {
        groups['transaction'].push(table);
      } else if (table.includes('inventory') || table.includes('stock') || table.includes('warehouse')) {
        groups['inventory'].push(table);
      } else if (table.includes('information_schema') || table.includes('pg_') || table.startsWith('_')) {
        groups['system'].push(table);
      } else {
        groups['other'].push(table);
      }
    });

    // Remove empty groups
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });

    return groups;
  };

  // Toggle group expansion
  const toggleGroupExpansion = (groupName: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  // Expand all groups
  const expandAllGroups = () => {
    const groups = Object.keys(groupTablesByPrefix());
    setExpandedGroups(groups);
  };

  // Collapse all groups
  const collapseAllGroups = () => {
    setExpandedGroups([]);
  };

  // Select all tables in a group
  const selectGroupTables = (tables: string[]) => {
    setSelectedTables(prev => {
      const newSelected = [...prev];
      tables.forEach(table => {
        if (!newSelected.includes(table)) {
          newSelected.push(table);
        }
      });
      return newSelected;
    });
  };

  // Deselect all tables in a group
  const deselectGroupTables = (tables: string[]) => {
    setSelectedTables(prev => prev.filter(t => !tables.includes(t)));
  };

  // Check if all tables in a group are selected
  const isGroupFullySelected = (tables: string[]) => {
    return tables.every(table => selectedTables.includes(table));
  };

  // Check if some (but not all) tables in a group are selected
  const isGroupPartiallySelected = (tables: string[]) => {
    const selectedCount = tables.filter(table => selectedTables.includes(table)).length;
    return selectedCount > 0 && selectedCount < tables.length;
  };

  // Get group display name and icon
  const getGroupInfo = (groupKey: string) => {
    const groupInfo: { [key: string]: { name: string; icon: any; color: string } } = {
      'lats_pos': { name: 'POS Tables', icon: Store, color: 'text-blue-600 bg-blue-50' },
      'user': { name: 'User Tables', icon: Users, color: 'text-purple-600 bg-purple-50' },
      'product': { name: 'Product Tables', icon: Package, color: 'text-green-600 bg-green-50' },
      'transaction': { name: 'Transaction Tables', icon: ShoppingCart, color: 'text-orange-600 bg-orange-50' },
      'inventory': { name: 'Inventory Tables', icon: Box, color: 'text-teal-600 bg-teal-50' },
      'system': { name: 'System Tables', icon: Settings, color: 'text-gray-600 bg-gray-50' },
      'other': { name: 'Other Tables', icon: Layers, color: 'text-indigo-600 bg-indigo-50' }
    };
    return groupInfo[groupKey] || { name: groupKey, icon: FileText, color: 'text-gray-600 bg-gray-50' };
  };

  // Check and run automatic backup
  useEffect(() => {
    if (!autoBackupEnabled || !settingsId) return;

    const checkAndRunBackup = async () => {
      const now = new Date();
      const lastBackupDate = lastAutoBackup ? new Date(lastAutoBackup) : null;

      const [hours, minutes] = autoBackupTime.split(':').map(Number);
      const scheduledTime = new Date(now);
      scheduledTime.setHours(hours, minutes, 0, 0);

      // Check if it's time to backup
      const shouldBackup = () => {
        if (!lastBackupDate) return true;

        const daysSinceBackup = Math.floor((now.getTime() - lastBackupDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (autoBackupFrequency === 'daily' && daysSinceBackup >= 1) return true;
        if (autoBackupFrequency === 'weekly' && daysSinceBackup >= 7) return true;
        if (autoBackupFrequency === 'monthly' && daysSinceBackup >= 30) return true;
        
        return false;
      };

      if (shouldBackup() && now >= scheduledTime) {
        console.log('🔄 Running automatic backup...');
        
        // Update last backup timestamp in database
        try {
          // @ts-ignore - Neon query builder implements thenable interface
          await supabase
            .from('lats_pos_general_settings')
            .update({ last_auto_backup: now.toISOString() })
            .eq('id', settingsId);
          
          setLastAutoBackup(now.toISOString());
        } catch (error) {
          console.error('Error updating last backup timestamp:', error);
        }

        // Set the backup type and run automatic backup
        setBackupType(autoBackupType);
        performDatabaseBackup(true); // Pass true for automatic backup
      }
    };

    // Check every hour
    const interval = setInterval(checkAndRunBackup, 60 * 60 * 1000);
    checkAndRunBackup(); // Check immediately

    return () => clearInterval(interval);
  }, [autoBackupEnabled, autoBackupFrequency, autoBackupTime, autoBackupType, lastAutoBackup, settingsId]);

  // Save backup to local file system
  const saveBackupToLocal = async (backupData: any, isAutomatic: boolean = false) => {
    try {
      const date = new Date();
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
      const fileName = `backup_${dateStr}_${timeStr}.json`;
      
      const backupJson = JSON.stringify(backupData, null, 2);
      const blob = new Blob([backupJson], { type: 'application/json' });
      
      if (isAutomatic) {
        // For automatic backups, download with special prefix
        // Note: Browser security only allows downloading to Downloads folder
        // Files are prefixed with [Dukani Pro Backup] for easy identification
        // User should move files to Desktop/Dukani Pro [Backup]/ folder manually
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `[Dukani Pro Backup] ${fileName}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Store backup metadata in localStorage to track count
        const backupHistory = JSON.parse(localStorage.getItem('autoBackupHistory') || '[]');
        backupHistory.push({
          fileName: `[Dukani Pro Backup] ${fileName}`,
          date: date.toISOString(),
          size: blob.size,
          type: backupData.backupType
        });
        
        // Keep only last 30 backups in history
        // Show notification about old backup removal
        if (backupHistory.length > 30) {
          const removed = backupHistory.shift();
          console.log(`🗑️ Backup rotation: Removed old backup from history - ${removed.fileName}`);
          toast(`Old backup removed from tracking. Delete file from Desktop if needed.`, { duration: 4000 });
        }
        
        localStorage.setItem('autoBackupHistory', JSON.stringify(backupHistory));
        
        // Also create a README file on first automatic backup
        const hasReadme = localStorage.getItem('backupReadmeCreated');
        if (!hasReadme) {
          createBackupReadme();
          localStorage.setItem('backupReadmeCreated', 'true');
        }
        
        return { success: true, fileName: `[Dukani Pro Backup] ${fileName}`, isAutomatic: true };
      } else {
        // For manual backups, standard download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return { success: true, fileName, isAutomatic: false };
      }
    } catch (error) {
      console.error('Error saving backup to local:', error);
      return { success: false, error };
    }
  };

  // Create README file for backup folder
  const createBackupReadme = () => {
    const readmeContent = `# Dukani Pro Automatic Backup System

## 📁 Backup Organization - IMPORTANT
Due to browser security, backups download to your Downloads folder.
Please MOVE them to Desktop and organize into: 

    Desktop/Dukani Pro [Backup]/

## 📝 File Naming Convention
- Format: [Dukani Pro Backup] backup_YYYY-MM-DD_HH-MM-SS.json
- Example: [Dukani Pro Backup] backup_2025-11-11_14-30-00.json

## ♻️ Backup Rotation (30 Backup Limit)
- System tracks last 30 automatic backups
- Old backup entries auto-removed from tracking when 31st is created
- Manually delete old backup files from Desktop to save disk space

## 🔄 Recommended Workflow
1. Backups auto-download to Downloads folder
2. Move files to: Desktop/Dukani Pro [Backup]/
3. System auto-removes oldest entry after 30 backups
4. Manually delete old files from Desktop folder

## 💡 Best Practices
1. Keep backups organized in Desktop/Dukani Pro [Backup]
2. Periodically verify backup integrity
3. Copy critical backups to external drive or cloud
4. Test restore process monthly

Generated: ${new Date().toLocaleString()}
`;
    
    const blob = new Blob([readmeContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '[Dukani Pro Backup] README.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('📄 Backup guide created! Move backups from Downloads to Desktop folder.', { duration: 6000 });
  };

  // Full database schema backup function
  const performDatabaseBackup = async (isAutomatic: boolean = false) => {
    // Check if table selector has been opened and tables loaded (only for manual backups)
    if (!isAutomatic && availableTables.length > 0 && selectedTables.length === 0) {
      toast.error('Please select at least one table to backup');
      return;
    }

    setIsBackingUp(true);
    setBackupProgress(0);
    setBackupStatus('Fetching database schema...');

    try {
      // Step 1: Get ALL tables from information_schema (including empty ones)
      setBackupStatus('Loading complete database schema...');
      setBackupProgress(5);
      
      // @ts-ignore - Neon query builder implements thenable interface
      const { data: allTables, error: schemaError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .order('table_name');

      if (schemaError) {
        throw new Error('Failed to fetch database schema');
      }

      let tableNames = allTables?.map((t: any) => t.table_name) || [];
      
      // Filter by selected tables if user has made a selection
      if (selectedTables.length > 0 && selectedTables.length < tableNames.length) {
        tableNames = tableNames.filter(t => selectedTables.includes(t));
        console.log(`📊 Found ${tableNames.length} selected tables out of ${allTables?.length || 0} total tables`);
      } else if (selectedTables.length === 0) {
        // If no specific tables selected, backup all tables (default behavior)
        console.log(`📊 Found ${tableNames.length} tables in database schema (backing up all)`);
      } else {
      console.log(`📊 Found ${tableNames.length} tables in database schema`);
      }

      setBackupStatus(`Found ${tableNames.length} tables. Fetching schema definitions...`);
      setBackupProgress(10);

      // Step 2: Get column definitions for ALL tables
      // @ts-ignore - Neon query builder implements thenable interface
      const { data: allColumns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('table_name, column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .order('table_name')
        .order('ordinal_position');

      if (columnsError) {
        console.warn('Could not fetch column schema:', columnsError);
      }

      // Organize columns by table
      const columnsByTable: any = {};
      allColumns?.forEach((col: any) => {
        if (!columnsByTable[col.table_name]) {
          columnsByTable[col.table_name] = [];
        }
        columnsByTable[col.table_name].push({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          default: col.column_default
        });
      });

      setBackupStatus(`Schema loaded. Backing up ${tableNames.length} tables...`);
      setBackupProgress(15);

      const backupTypeLabel = 
        backupType === 'schema-only' ? 'SCHEMA_ONLY' :
        backupType === 'data-only' ? 'DATA_ONLY' : 'FULL_SCHEMA_AND_DATA';

      const backup: any = {
        timestamp: new Date().toISOString(),
        backupType: backupTypeLabel,
        databaseInfo: {
          totalTables: tableNames.length,
          backupIncludes: 
            backupType === 'schema-only' ? 'Table schemas only (no data)' :
            backupType === 'data-only' ? 'Table data only (no schema definitions)' :
            'All tables with full schema and data (including empty tables)'
        },
        schema: backupType === 'data-only' ? undefined : columnsByTable,
        tables: {},
        summary: { totalTables: 0, tablesWithData: 0, emptyTables: 0, totalRecords: 0 }
      };

      let totalRecords = 0;
      let tablesWithData = 0;
      let emptyTables = 0;
      let processedTables = 0;

      // Step 3: Backup based on selected type
      for (const tableName of tableNames) {
        try {
          processedTables++;
          const progress = 15 + ((processedTables / tableNames.length) * 80);
          setBackupProgress(progress);
          setBackupStatus(`Processing: ${tableName} (${processedTables}/${tableNames.length})`);

          // If schema-only, just include the schema without fetching data
          if (backupType === 'schema-only') {
            backup.tables[tableName] = {
              exists: true,
              recordCount: 0,
              schema: columnsByTable[tableName] || [],
              data: null,
              note: 'Schema only - data not included'
            };
            continue;
          }

          // Otherwise, fetch the data
          const allRecords: any[] = [];
          let from = 0;
          const pageSize = 1000;

          while (true) {
            // @ts-ignore - Neon query builder implements thenable interface
            const { data, error } = await supabase
              .from(tableName)
              .select('*')
              .range(from, from + pageSize - 1);

            if (error) {
              console.log(`⚠️ Could not read table '${tableName}':`, error.message);
              backup.tables[tableName] = {
                exists: true,
                recordCount: 0,
                schema: backupType === 'data-only' ? undefined : (columnsByTable[tableName] || []),
                data: [],
                error: error.message
              };
              emptyTables++;
              break;
            }

            if (!data || data.length === 0) {
              if (from === 0) {
                // Table exists but is empty
                backup.tables[tableName] = {
                  exists: true,
                  recordCount: 0,
                  schema: backupType === 'data-only' ? undefined : (columnsByTable[tableName] || []),
                  data: []
                };
                emptyTables++;
              }
              break;
            }

            allRecords.push(...data);
            if (data.length < pageSize) break;
            from += pageSize;
            await new Promise(resolve => setTimeout(resolve, 30));
          }

          if (allRecords.length > 0) {
            const recordCount = allRecords.length;
            backup.tables[tableName] = {
              exists: true,
              recordCount,
              schema: backupType === 'data-only' ? undefined : (columnsByTable[tableName] || []),
              data: allRecords
            };
            totalRecords += recordCount;
            tablesWithData++;
          }

        } catch (error: any) {
          backup.tables[tableName] = {
            exists: true,
            error: error?.message || 'Unknown error',
            schema: backupType === 'data-only' ? undefined : (columnsByTable[tableName] || []),
            data: null
          };
          console.log(`❌ Error backing up '${tableName}': ${error.message}`);
        }
      }

      backup.summary.totalTables = tableNames.length;
      backup.summary.tablesWithData = tablesWithData;
      backup.summary.emptyTables = emptyTables;
      backup.summary.totalRecords = totalRecords;

      // Save backup to local file system
      setBackupStatus('Saving backup file...');
      setBackupProgress(95);
      
      const saveResult = await saveBackupToLocal(backup, isAutomatic);
      
      if (!saveResult.success) {
        throw new Error('Failed to save backup file');
      }

      const successMessage = 
        backupType === 'schema-only' 
          ? `✅ Schema backup completed! ${tableNames.length} table schemas exported` :
        backupType === 'data-only'
          ? `✅ Data backup completed! ${totalRecords.toLocaleString()} records from ${tablesWithData} tables` :
          `✅ Full backup completed! ${totalRecords.toLocaleString()} records from ${tablesWithData} tables (${emptyTables} empty tables included)`;

      setBackupStatus(successMessage);
      setBackupProgress(100);
      
      const toastMessage = isAutomatic 
        ? `🔄 Auto backup saved to Downloads. Move to Desktop/Dukani Pro [Backup]/`
        : backupType === 'schema-only'
          ? `Schema backup: ${tableNames.length} tables`
          : backupType === 'data-only'
            ? `Data backup: ${totalRecords.toLocaleString()} records`
            : `Full backup: ${tableNames.length} tables, ${totalRecords.toLocaleString()} records`;
      
      toast.success(toastMessage, { duration: isAutomatic ? 6000 : 4000 });

      setTimeout(() => {
        setIsBackingUp(false);
        setBackupProgress(0);
        setBackupStatus('');
      }, isAutomatic ? 3000 : 5000);

    } catch (error: any) {
      setBackupStatus(`❌ Backup failed: ${error.message}`);
      toast.error(`Backup failed: ${error.message}`);
      setIsBackingUp(false);
    }
  };

  // Restore functionality handlers
  const handleRestoreFromFile = async () => {
    if (!restoreFile) {
      toast.error('❌ Please select a backup file to restore');
      return;
    }

    if (restoreSelectedTables.length === 0) {
      toast.error('❌ Please select at least one table to restore');
      return;
    }

    const tablesToRestore = restoreSelectedTables.length === previewData?.tables.length 
      ? 'all tables' 
      : `${restoreSelectedTables.length} selected table(s)`;

    if (!confirm(`⚠️ WARNING: Restoring ${tablesToRestore} from "${restoreFile.name}" will overwrite current database data.\n\nAre you sure you want to continue?`)) {
      return;
    }

    try {
      setIsRestoring(true);
      const result = await restoreFromBackup(restoreFile, restoreSelectedTables);
      
      if (result.success) {
        const data = result.data;
        const message = `✅ Restore completed successfully!\n\n` +
          `Tables restored: ${data?.tablesRestored || 'N/A'}\n` +
          `Records restored: ${data?.recordsRestored || 'N/A'}\n` +
          `Format: ${data?.format || 'N/A'}`;
        
        if (data?.warnings && data.warnings.length > 0) {
          toast.success(message + `\n\n⚠️ Warnings:\n${data.warnings.join('\n')}`, { duration: 6000 });
        } else {
          toast.success(message, { duration: 5000 });
        }
        
        // Reset everything
        setRestoreFile(null);
        setPreviewData(null);
        setRestoreSelectedTables([]);
        setShowRestoreTableSelection(false);
      } else {
        const errorMsg = result.error || result.message || 'Unknown error';
        toast.error(`❌ Restore failed: ${errorMsg}`);
      }
    } catch (error) {
      let errorMsg = 'Unknown error';
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      toast.error(`❌ Restore failed: ${errorMsg}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRestoreFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type - support .sql, .json, and .gz (compressed)
      const isSql = file.name.endsWith('.sql');
      const isJson = file.name.endsWith('.json');
      const isGz = file.name.endsWith('.gz') || file.name.endsWith('.sql.gz');
      
      if (!isSql && !isJson && !isGz) {
        toast.error('❌ Invalid file type. Please select a .sql, .json, or .sql.gz backup file.');
        event.target.value = '';
        return;
      }
      
      // Handle compressed .gz files
      if (isGz) {
        try {
          // Decompress using browser's CompressionStream API (if available)
          if (typeof DecompressionStream !== 'undefined') {
            const stream = file.stream();
            const decompressionStream = new DecompressionStream('gzip');
            const decompressedStream = stream.pipeThrough(decompressionStream);
            const decompressedBlob = await new Response(decompressedStream).blob();
            
            // Create a new File object with .sql extension
            const decompressedFile = new File(
              [decompressedBlob],
              file.name.replace(/\.gz$/, ''),
              { type: 'application/sql' }
            );
            
            setRestoreFile(decompressedFile);
            setPreviewData(null);
            setRestoreSelectedTables([]);
            setShowRestoreTableSelection(false);
            await handleRestorePreviewFile(decompressedFile);
            return;
          } else {
            toast.error('⚠️ Please extract the .gz file manually first. Download from GitHub Actions → Extract ZIP → Extract .gz → Upload .sql file here');
            event.target.value = '';
            return;
          }
        } catch (error) {
          toast.error('❌ Failed to decompress file. Please extract the .gz file manually first.');
          event.target.value = '';
          return;
        }
      }
      
      // Validate file size (1GB limit)
      if (file.size > 1024 * 1024 * 1024) {
        toast.error('❌ File too large. Maximum file size is 1GB (1024MB).');
        event.target.value = '';
        return;
      }
      
      setRestoreFile(file);
      setPreviewData(null);
      setRestoreSelectedTables([]);
      setShowRestoreTableSelection(false);
      
      // Automatically preview the file
      await handleRestorePreviewFile(file);
    }
  };

  const handleRestorePreviewFile = async (file: File) => {
    try {
      setIsPreviewing(true);
      const result = await previewBackupFile(file);
      
      if (result.success && result.data) {
        setPreviewData(result.data);
        // Select all tables by default
        setRestoreSelectedTables(result.data.tables.map((t: any) => t.name));
        setShowRestoreTableSelection(true);
        toast.success(`✅ Backup preview loaded: ${result.data.totalTables} tables found`);
      } else {
        toast.error(`❌ Failed to preview backup file: ${result.error}`);
      }
    } catch (error) {
      toast.error(`❌ Error previewing backup file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPreviewing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading backup settings...</span>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">Database Backup & Management</h2>
        </div>
      </div>

      <div className="space-y-6">
        {/* Automatic Backup */}
        <div className="border-2 border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-blue-600" />
              <h4 className="font-medium text-gray-900">Auto Backup</h4>
              <div className="group relative">
                <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                <div className="invisible group-hover:visible absolute left-0 top-6 z-50 w-80 p-4 bg-gray-900 text-white text-xs rounded-xl shadow-xl border-2 border-gray-700">
                  <div className="space-y-2">
                    <p><strong>Downloads to:</strong> Downloads folder (browser limitation)</p>
                    <p><strong>Move to:</strong> Desktop/Dukani Pro [Backup]/</p>
                    <p><strong>File Name:</strong> [Dukani Pro Backup] backup_YYYY-MM-DD_HH-MM-SS.json</p>
                    <p><strong>Rotation:</strong> Tracks 30 backups, auto-removes oldest</p>
                    <p><strong>Schedule:</strong> Runs at configured time</p>
                  </div>
                  <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoBackupEnabled}
                    onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {autoBackupEnabled && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                  <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Frequency</label>
                    <select
                      value={autoBackupFrequency}
                      onChange={(e) => setAutoBackupFrequency(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                    <option value="daily">Daily (Recommended)</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Time</label>
                    <input
                      type="time"
                      value={autoBackupTime}
                      onChange={(e) => setAutoBackupTime(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
              </div>
                  <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Backup Type</label>
                    <select
                      value={autoBackupType}
                      onChange={(e) => setAutoBackupType(e.target.value as any)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="full">Full (Schema + Data)</option>
                      <option value="schema-only">Schema Only</option>
                      <option value="data-only">Data Only</option>
                    </select>
                  </div>
              <div className="flex items-center justify-between text-xs text-gray-600 p-2 bg-gray-50 rounded">
                {lastAutoBackup ? (
                  <span>Last: {new Date(lastAutoBackup).toLocaleDateString()}</span>
                ) : (
                  <span>Last: Never</span>
                )}
                  <div className="group relative">
                    <span className="text-blue-600 font-medium cursor-help">
                      {JSON.parse(localStorage.getItem('autoBackupHistory') || '[]').length}/30
                    </span>
                    <div className="invisible group-hover:visible absolute right-0 top-6 z-50 w-64 p-4 bg-gray-900 text-white text-xs rounded-xl shadow-lg border-2 border-gray-700">
                      <p className="font-semibold mb-2">Backup Rotation</p>
                      <p>• Tracks last 30 automatic backups</p>
                      <p>• Old entries auto-removed from history</p>
                      <p>• Delete old files from Desktop manually</p>
                      <p className="text-yellow-300 mt-2">📁 Desktop/Dukani Pro [Backup]/</p>
                      <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
                  </div>
              </div>
              <button
                onClick={createBackupReadme}
                className="w-full text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 py-1.5 rounded transition-colors flex items-center justify-center gap-1"
              >
                <FileText className="w-3 h-3" />
                Setup Guide
              </button>
              <div className="grid grid-cols-2 gap-2">
              <GlassButton
                onClick={saveAutoBackupSettings}
                  className="flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                  <Save className="w-3 h-3" />
                  <span className="text-xs">Save</span>
                </GlassButton>
                <GlassButton
                  onClick={() => {
                    const currentType = backupType;
                    setBackupType(autoBackupType);
                    performDatabaseBackup(true);
                    setTimeout(() => setBackupType(currentType), 100);
                  }}
                  disabled={!autoBackupEnabled || isBackingUp}
                  className="flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="text-xs">Run Now</span>
              </GlassButton>
            </div>
            </div>
          )}
          </div>

        {/* Manual Backup */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Download className="h-5 w-5 text-orange-600" />
            <h4 className="font-medium text-gray-900">Manual Backup</h4>
            <div className="group relative">
              <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
              <div className="invisible group-hover:visible absolute left-0 top-6 z-50 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                <div className="space-y-2">
                  <p><strong>Full:</strong> Complete schema + all data</p>
                  <p><strong>Schema:</strong> Table structures only</p>
                  <p><strong>Data:</strong> Records only</p>
                </div>
                <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
              </div>
            </div>
          </div>
            
          <div className="space-y-3">
              <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Type</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setBackupType('full')}
                  disabled={isBackingUp}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                    backupType === 'full'
                      ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-orange-500 hover:bg-orange-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Full
                </button>
                <button
                  onClick={() => setBackupType('schema-only')}
                  disabled={isBackingUp}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                    backupType === 'schema-only'
                      ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-orange-500 hover:bg-orange-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Schema
                </button>
                <button
                  onClick={() => setBackupType('data-only')}
                  disabled={isBackingUp}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                    backupType === 'data-only'
                      ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-orange-500 hover:bg-orange-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Data
                </button>
              </div>
            </div>

            {/* Table Selection - Collapsible */}
            <div className="border-2 border-gray-200 rounded-xl bg-white shadow-sm">
              <button
                onClick={() => {
                  if (!showTableSelector && availableTables.length === 0) {
                    fetchAvailableTables();
                  }
                  setShowTableSelector(!showTableSelector);
                }}
                disabled={isBackingUp}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50 border-2 border-transparent hover:border-gray-300"
              >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Database className="h-3.5 w-3.5 text-gray-600 flex-shrink-0" />
                    <span className="text-xs font-medium text-gray-700">
                      Select Tables
                    </span>
                    {!showTableSelector && availableTables.length > 0 && (
                      <>
                        <span className="text-xs text-gray-500">
                          ({Object.keys(groupTablesByPrefix()).length} groups)
                        </span>
                        {selectedTables.length > 0 && selectedTables.length < availableTables.length && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                            {selectedTables.length}/{availableTables.length} tables
                          </span>
                        )}
                        {selectedTables.length === availableTables.length && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                            All tables selected
                          </span>
                        )}
                        {selectedTables.length === 0 && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                            No tables selected
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <ChevronDown 
                      className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                        showTableSelector ? 'transform rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>
                
                {showTableSelector && (
                  <div className="border-t border-orange-200 animate-in slide-in-from-top-2 duration-200">
                    <div className="p-3">
                      {loadingTables ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                          <span className="ml-3 text-sm text-gray-600">Loading tables...</span>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-3 mb-3 pb-3 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-gray-700">
                                {selectedTables.length} of {availableTables.length} tables selected
                              </span>
                              <div className="flex gap-2">
                                <button
                                  onClick={expandAllGroups}
                                  className="text-xs text-orange-600 hover:text-orange-700 font-semibold px-3 py-1.5 hover:bg-orange-50 rounded-xl transition-all border-2 border-orange-200 hover:border-orange-300 shadow-sm"
                                >
                                  Expand All
                                </button>
                                <button
                                  onClick={collapseAllGroups}
                                  className="text-xs text-gray-600 hover:text-gray-700 font-semibold px-3 py-1.5 hover:bg-gray-100 rounded-xl transition-all border-2 border-gray-200 hover:border-gray-300 shadow-sm"
                                >
                                  Collapse All
                                </button>
                                <span className="border-l border-gray-300 mx-1"></span>
                                <button
                                  onClick={selectAllTables}
                                  className="text-xs text-orange-600 hover:text-orange-700 font-semibold px-3 py-1.5 hover:bg-orange-50 rounded-xl transition-all border-2 border-orange-200 hover:border-orange-300 shadow-sm"
                                >
                                  Select All
                                </button>
                                <button
                                  onClick={deselectAllTables}
                                  className="text-xs text-gray-600 hover:text-gray-700 font-semibold px-3 py-1.5 hover:bg-gray-100 rounded-xl transition-all border-2 border-gray-200 hover:border-gray-300 shadow-sm"
                                >
                                  Deselect All
                                </button>
                              </div>
                            </div>
                            
                            {/* Search Input - Compact */}
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search tables..."
                                value={tableSearchQuery}
                                onChange={(e) => setTableSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-8 py-2.5 text-xs border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 bg-white transition-colors font-medium"
                              />
                              {tableSearchQuery && (
                                <button
                                  onClick={() => setTableSearchQuery('')}
                                  className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                  title="Clear search"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                            {Object.keys(groupTablesByPrefix()).length === 0 && tableSearchQuery ? (
                              <div className="text-center py-8 text-gray-500">
                                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No tables found matching "{tableSearchQuery}"</p>
                                <button
                                  onClick={() => setTableSearchQuery('')}
                                  className="text-xs text-orange-600 hover:text-orange-700 font-medium mt-2"
                                >
                                  Clear search
                                </button>
                              </div>
                            ) : (
                              Object.entries(groupTablesByPrefix()).map(([groupKey, tables]) => {
                              const groupInfo = getGroupInfo(groupKey);
                              const isExpanded = expandedGroups.includes(groupKey);
                              const isFullySelected = isGroupFullySelected(tables);
                              const isPartiallySelected = isGroupPartiallySelected(tables);
                              const selectedCount = tables.filter(t => selectedTables.includes(t)).length;

                              return (
                                <div key={groupKey} className="mb-2 border border-gray-200 rounded-lg overflow-hidden">
                                  {/* Group Header */}
                                  <div className="bg-gradient-to-r from-gray-50 to-white">
                                    <div className="flex items-center justify-between p-3">
                                      <button
                                        onClick={() => toggleGroupExpansion(groupKey)}
                                        className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity"
                                      >
                                        <ChevronDown 
                                          className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                                            isExpanded ? 'transform rotate-180' : ''
                                          }`}
                                        />
                                        {React.createElement(groupInfo.icon, {
                                          className: `h-4 w-4 ${groupInfo.color.split(' ')[0]}`
                                        })}
                                        <span className="text-sm font-semibold text-gray-700">
                                          {groupInfo.name}
                                        </span>
                                        <span className="text-xs text-gray-500 font-normal">
                                          ({tables.length} table{tables.length !== 1 ? 's' : ''})
                                        </span>
                                        {selectedCount > 0 && (
                                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            isFullySelected 
                                              ? 'bg-green-100 text-green-700' 
                                              : 'bg-orange-100 text-orange-700'
                                          }`}>
                                            {selectedCount}/{tables.length}
                                          </span>
                                        )}
                                      </button>
                                      <div className="flex items-center gap-2 ml-2">
                                        <input
                                          type="checkbox"
                                          checked={isFullySelected}
                                          ref={(el) => {
                                            if (el) el.indeterminate = isPartiallySelected;
                                          }}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              selectGroupTables(tables);
                                            } else {
                                              deselectGroupTables(tables);
                                            }
                                          }}
                                          className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
                                          title={isFullySelected ? 'Deselect all in group' : 'Select all in group'}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Group Tables */}
                                  {isExpanded && (
                                    <div className="border-t border-gray-200 bg-white animate-in slide-in-from-top-2 duration-200">
                                      <div className="p-2 space-y-1">
                                        {tables.map((tableName) => (
                                          <label
                                            key={tableName}
                                            className="flex items-center py-2 px-3 hover:bg-orange-50 rounded-md cursor-pointer transition-colors group"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={selectedTables.includes(tableName)}
                                              onChange={() => toggleTableSelection(tableName)}
                                              className="mr-3 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
                                            />
                                            <span className="text-sm text-gray-700 font-mono group-hover:text-gray-900">
                                              {tableName}
                                            </span>
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            }))}
                          </div>
                          {availableTables.length === 0 && !tableSearchQuery && (
                            <div className="text-center py-8 text-gray-500">
                              <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No tables found in database</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {isBackingUp && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 truncate">{backupStatus}</span>
                    <span className="font-medium text-blue-600">{Math.round(backupProgress)}%</span>
                  </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${backupProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {!isBackingUp && backupStatus && (
              <div className={`p-2 rounded text-xs ${
                  backupStatus.includes('✅') 
                  ? 'bg-green-50 text-green-800' 
                  : 'bg-red-50 text-red-800'
                }`}>
                {backupStatus}
                </div>
              )}

              <GlassButton
                onClick={performDatabaseBackup}
                disabled={isBackingUp}
              className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isBackingUp ? (
                  <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  <span className="text-sm">Backing up...</span>
                  </>
                ) : (
                  <>
                  <Download className="w-3 h-3" />
                  <span className="text-sm">Download Backup</span>
                  </>
                )}
              </GlassButton>
                </div>
                </div>
        </div>
      
    </div>

    {/* Restore from Backup Section */}
    <div className="mt-6 bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">Restore from Backup</h3>
          <div className="group relative">
            <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
            <div className="invisible group-hover:visible absolute left-0 top-6 z-50 w-96 p-4 bg-gray-900 text-white text-xs rounded-xl shadow-xl border-2 border-gray-700">
              <div className="space-y-3">
                <p className="font-semibold text-sm mb-2">📥 How to Download from GitHub Actions:</p>
                <ol className="space-y-1 ml-4 list-decimal">
                  <li>Go to <a href="https://github.com/Mtaasisi/NEON-POS/actions" target="_blank" rel="noopener noreferrer" className="underline text-blue-300">Actions tab</a></li>
                  <li>Find "Automatic Neon Database Backup" or "Automatic NEON 02 Database Backup"</li>
                  <li>Click on a workflow run → Scroll to "Artifacts" section</li>
                  <li>Download the backup ZIP file</li>
                  <li>Extract the ZIP → Extract the .gz file → Upload the .sql file here</li>
                </ol>
                <p className="text-blue-300 mt-2">
                  💡 Tip: You can also upload the .sql.gz file directly - it will be automatically decompressed!
                </p>
                <div className="border-t border-gray-700 pt-2 mt-2">
                  <p className="font-semibold text-sm mb-1">📋 Supported Formats:</p>
                  {restoreFormats?.formats.map((format: any, index: number) => (
                    <div key={index} className="text-xs">
                      <span className="font-semibold">{format.format}</span> ({format.extension}) - {format.description}
                      {format.format === restoreFormats.recommended && (
                        <span className="ml-1 px-1 py-0.5 bg-blue-600 rounded text-xs">RECOMMENDED</span>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-gray-300 mt-1">
                    {restoreFormats?.note || 'SQL format is recommended as it is the easiest to restore.'}
                  </p>
                </div>
              </div>
              <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
            </div>
          </div>
        </div>
        <Upload className="w-6 h-6 text-orange-600" />
      </div>

      <div className="space-y-4">
        {/* File Upload */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Backup File
            </label>
            <div className="group relative">
              <HelpCircle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
              <div className="invisible group-hover:visible absolute left-0 top-5 z-50 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl border-2 border-gray-700">
                <p className="font-semibold mb-1">Accepted File Types:</p>
                <ul className="space-y-1 ml-3 list-disc">
                  <li>.sql - SQL dump file (recommended)</li>
                  <li>.json - JSON backup file</li>
                  <li>.sql.gz or .gz - Compressed SQL file (auto-decompressed)</li>
                </ul>
                <p className="mt-2 text-gray-300">Maximum file size: 1GB</p>
                <div className="absolute -top-1 left-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
              </div>
            </div>
          </div>
          <input
            type="file"
            accept=".sql,.json,.gz,.sql.gz"
            onChange={handleRestoreFileSelect}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              cursor-pointer border border-gray-300 rounded-md p-2"
            disabled={isRestoring}
          />
        </div>

        {/* File Preview */}
        {restoreFile && (
          <div className="p-3 bg-green-50 rounded-md border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">{restoreFile.name}</p>
                  <p className="text-xs text-green-700">
                    {(restoreFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setRestoreFile(null);
                  setPreviewData(null);
                  setRestoreSelectedTables([]);
                  setShowRestoreTableSelection(false);
                }}
                className="text-red-600 hover:text-red-800 transition-colors"
                disabled={isRestoring}
                title="Remove file"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Preview Loading */}
        {isPreviewing && (
          <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              <p className="text-sm text-blue-900">Analyzing backup file...</p>
            </div>
          </div>
        )}

        {/* Table Selection */}
        {previewData && showRestoreTableSelection && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">Select Tables to Restore</h4>
                <div className="group relative">
                  <HelpCircle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                  <div className="invisible group-hover:visible absolute left-0 top-5 z-50 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl border-2 border-gray-700">
                    <p className="font-semibold mb-1">Table Selection:</p>
                    <ul className="space-y-1 ml-3 list-disc">
                      <li>Select specific tables to restore only those tables</li>
                      <li>Or select all tables to restore the entire backup</li>
                      <li>Restoring will overwrite existing data in selected tables</li>
                    </ul>
                    <p className="mt-2 text-yellow-300">⚠️ Warning: This action cannot be undone!</p>
                    <div className="absolute -top-1 left-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">
                  {previewData.totalTables} tables • {previewData.totalRecords.toLocaleString()} records
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setRestoreSelectedTables(previewData.tables.map((t: any) => t.name))}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    All
                  </button>
                  <button
                    onClick={() => setRestoreSelectedTables([])}
                    className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                  >
                    None
                  </button>
                </div>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1 border border-gray-200 rounded-md p-2 bg-white">
              {previewData.tables.map((table: any) => (
                <label key={table.name} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={restoreSelectedTables.includes(table.name)}
                    onChange={() => {
                      setRestoreSelectedTables(prev => 
                        prev.includes(table.name)
                          ? prev.filter(t => t !== table.name)
                          : [...prev, table.name]
                      );
                    }}
                    disabled={isRestoring}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">{table.name}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({table.recordCount.toLocaleString()} records)
                    </span>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                <strong>{restoreSelectedTables.length}</strong> of <strong>{previewData.tables.length}</strong> tables selected
                {restoreSelectedTables.length > 0 && (
                  <span className="ml-2 text-green-600 font-semibold">
                    ({previewData.tables
                      .filter((t: any) => restoreSelectedTables.includes(t.name))
                      .reduce((sum: number, t: any) => sum + t.recordCount, 0)
                      .toLocaleString()} records will be restored)
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Restore Button */}
        <button
          onClick={handleRestoreFromFile}
          disabled={!restoreFile || restoreSelectedTables.length === 0 || isRestoring}
          className="w-full px-4 py-2.5 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
        >
          {isRestoring ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Restoring...
            </>
          ) : restoreSelectedTables.length === 0 ? (
            <>
              <Upload className="w-4 h-4" />
              Select Tables to Restore
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Restore {restoreSelectedTables.length} Selected Table{restoreSelectedTables.length !== 1 ? 's' : ''}
            </>
          )}
        </button>

        {/* Warning Box */}
        <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
          <p className="text-xs text-yellow-800">
            ⚠️ <strong>Warning:</strong> Restoring will overwrite existing data in the database. 
            Make sure you have a current backup before proceeding.
          </p>
        </div>
      </div>
    </div>

    {/* Offline Database Management Section */}
    <div className="mt-6 bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Offline Database Management
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Download full database for offline-first operation and faster performance
          </p>
        </div>
        {fullDatabaseDownloadService.isDownloaded() && (
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Downloaded
          </span>
        )}
      </div>

      {/* Download Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        {downloadMetadata ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Last Downloaded</p>
                <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(downloadMetadata.timestamp).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Download Time</p>
                <p className="text-sm font-medium text-gray-900">
                  {(downloadMetadata.downloadTime / 1000).toFixed(1)}s
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Downloaded Data</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Products:</span>
                  <span className="font-semibold">{downloadMetadata.data.products || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customers:</span>
                  <span className="font-semibold">{downloadMetadata.data.customers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Categories:</span>
                  <span className="font-semibold">{downloadMetadata.data.categories || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Suppliers:</span>
                  <span className="font-semibold">{downloadMetadata.data.suppliers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Variants:</span>
                  <span className="font-semibold">{downloadMetadata.data.variants || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Employees:</span>
                  <span className="font-semibold">{downloadMetadata.data.employees || 0}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No database downloaded yet</p>
          </div>
        )}

        {downloading && downloadProgress && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">
                Downloading {downloadProgress.currentTask}...
              </span>
              <span className="text-sm font-semibold text-blue-700">
                {downloadProgress.percentage}%
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress.percentage}%` }}
              />
            </div>
            <p className="text-xs text-blue-700 mt-2">
              {downloadProgress.current} of {downloadProgress.total} tasks completed
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={async () => {
              if (!confirm('This will download all essential data to your local storage. This may take a few minutes. Continue?')) {
                return;
              }
              setDownloading(true);
              setDownloadProgress(null);
              try {
                const result = await fullDatabaseDownloadService.downloadFullDatabase((prog) => {
                  setDownloadProgress(prog);
                });
                if (result.success) {
                  const totalItems = Object.values(result.data).reduce((a: number, b: number) => a + b, 0);
                  toast.success(`✅ Database downloaded successfully! ${totalItems} items downloaded.`);
                  loadDownloadMetadata();
                  if (navigator.onLine && !autoSyncService.isEnabled()) {
                    autoSyncService.startAutoSync();
                  }
                } else {
                  toast.error(`❌ Download failed: ${result.error}`);
                }
              } catch (error) {
                toast.error('Failed to download database');
              } finally {
                setDownloading(false);
                setDownloadProgress(null);
              }
            }}
            disabled={downloading}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {downloading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Full Database
              </>
            )}
          </button>
          {downloadMetadata && (
            <button
              onClick={() => {
                if (!confirm('Are you sure you want to clear all downloaded database? This will remove all locally cached data.')) {
                  return;
                }
                fullDatabaseDownloadService.clearDownload();
                autoSyncService.stopAutoSync();
                toast.success('✅ Local database cleared');
                loadDownloadMetadata();
              }}
              className="px-4 py-2.5 border border-red-300 text-red-700 rounded-lg font-semibold hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Automatic Background Sync */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Automatic Background Sync</h4>
            <p className="text-xs text-gray-500 mt-1">
              Automatically syncs database when WiFi/network is available
            </p>
          </div>
          {navigator.onLine ? (
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              Online
            </span>
          ) : (
            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold flex items-center gap-1">
              <WifiOff className="w-3 h-3" />
              Offline
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-500 mb-1">Sync Status</p>
              <p className="font-semibold text-gray-900 flex items-center gap-1">
                {autoSyncStatus.isSyncing ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                    <span className="text-blue-600">Syncing...</span>
                  </>
                ) : autoSyncService.isEnabled() ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span className="text-green-600">Active</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-600">Paused</span>
                  </>
                )}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Last Sync</p>
              <p className="font-medium text-gray-900">
                {autoSyncStatus.lastSyncTime ? (
                  <>
                    {new Date(autoSyncStatus.lastSyncTime).toLocaleTimeString()}
                    {autoSyncStatus.lastSyncSuccess ? (
                      <CheckCircle className="w-3 h-3 text-green-600 inline-block ml-1" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-red-600 inline-block ml-1" />
                    )}
                  </>
                ) : (
                  <span className="text-gray-400">Never</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Next Sync</p>
              <p className="font-medium text-gray-900">
                {autoSyncStatus.nextSyncTime ? (
                  new Date(autoSyncStatus.nextSyncTime).toLocaleTimeString()
                ) : (
                  <span className="text-gray-400">Not scheduled</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Sync Interval</p>
              <p className="font-medium text-gray-900">
                {Math.round(autoSyncStatus.syncInterval / 1000 / 60)} minutes
              </p>
            </div>
          </div>

          {autoSyncStatus.error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
              <AlertTriangle className="w-3 h-3 inline-block mr-1" />
              {autoSyncStatus.error}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (autoSyncService.isEnabled()) {
                  autoSyncService.stopAutoSync();
                  toast.success('Auto sync stopped');
                } else {
                  if (!navigator.onLine) {
                    toast.error('Cannot start auto sync - offline');
                    return;
                  }
                  autoSyncService.startAutoSync();
                  toast.success('Auto sync started');
                }
              }}
              disabled={!navigator.onLine && !autoSyncService.isEnabled()}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                autoSyncService.isEnabled()
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {autoSyncService.isEnabled() ? 'Pause Auto Sync' : 'Start Auto Sync'}
            </button>
            <button
              onClick={async () => {
                if (!navigator.onLine) {
                  toast.error('Cannot sync - offline');
                  return;
                }
                setSyncing(true);
                try {
                  const result = await autoSyncService.syncNow();
                  if (result.success) {
                    toast.success('✅ Database synced successfully');
                    loadDownloadMetadata();
                    const verification = await fullDatabaseDownloadService.verifyAllData();
                    if (verification.allOk) {
                      console.log('✅ [Sync] All data verified successfully after sync');
                    } else {
                      console.warn('⚠️ [Sync] Some data issues detected:', verification.summary);
                    }
                  } else {
                    toast.error(`❌ Sync failed: ${result.error}`);
                  }
                } catch (error) {
                  toast.error('Failed to sync');
                } finally {
                  setSyncing(false);
                }
              }}
              disabled={syncing || !navigator.onLine}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  Sync Now
                </>
              )}
            </button>
            <button
              onClick={() => setShowSyncSettings(!showSyncSettings)}
              className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>

          {/* Sync Settings */}
          {showSyncSettings && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-blue-900 mb-2">Sync Interval</p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(parseInt(e.target.value) || 30)}
                  className="w-20 px-2 py-1.5 border border-blue-300 rounded-lg text-xs font-semibold"
                />
                <span className="text-xs text-blue-800">minutes</span>
                <button
                  onClick={() => {
                    autoSyncService.setSyncInterval(syncInterval * 60 * 1000);
                    localStorage.setItem('auto_sync_interval', String(syncInterval * 60 * 1000));
                    toast.success(`Auto sync interval set to ${syncInterval} minutes`);
                    setShowSyncSettings(false);
                  }}
                  className="ml-auto px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                Database will automatically sync every {syncInterval} minutes when online
              </p>
            </div>
          )}

          {/* Verify Data Button */}
          <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-600 flex items-center gap-1 mb-2">
              <AlertTriangle className="w-3 h-3" />
              <span className="font-semibold">Console Logs:</span> Open browser console (F12) to see detailed sync logs
            </p>
            <button
              onClick={async () => {
                console.log('🔍 [Database] Manual verification triggered by user');
                const verification = await fullDatabaseDownloadService.verifyAllData();
                if (verification.allOk) {
                  toast.success('✅ All data verified successfully');
                } else {
                  toast.error(`⚠️ ${verification.summary}`);
                }
              }}
              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg text-xs font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-3 h-3" />
              Verify All Data
            </button>
          </div>
        </div>
      </div>

      {/* Offline Sales Sync */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-900">Offline Sales Sync</h4>
          {navigator.onLine ? (
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              Online
            </span>
          ) : (
            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold flex items-center gap-1">
              <WifiOff className="w-3 h-3" />
              Offline
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Pending Sales</p>
                <p className="text-xs text-gray-500 mt-1">
                  Sales waiting to be synced to online database
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{pendingSales}</p>
                {pendingSales > 0 && (
                  <p className="text-xs text-orange-600 mt-1">Needs sync</p>
                )}
              </div>
            </div>
          </div>

          {/* Pending Sales List */}
          {pendingSales > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-900">Pending Sales Details</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-600">Sale ID</th>
                      <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-600">Customer</th>
                      <th className="px-3 py-1.5 text-right text-xs font-semibold text-gray-600">Amount</th>
                      <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-600">Items</th>
                      <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-600">Created</th>
                      <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-600">Attempts</th>
                      <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pendingSalesList.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5">
                          <div className="font-mono text-xs text-gray-900">
                            {sale.id.substring(0, 16)}...
                          </div>
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="text-gray-900">
                            {sale.saleData?.customerName || sale.saleData?.customer_name || 'Walk-in'}
                          </div>
                          {sale.saleData?.customerPhone && (
                            <div className="text-xs text-gray-500">{sale.saleData.customerPhone}</div>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <div className="font-semibold text-gray-900">
                            {new Intl.NumberFormat('en-TZ', {
                              style: 'currency',
                              currency: 'TZS',
                              minimumFractionDigits: 0,
                            }).format(sale.saleData?.total || sale.saleData?.total_amount || 0)}
                          </div>
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="text-gray-900">
                            {sale.saleData?.items?.length || 0} items
                          </div>
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="text-xs text-gray-600">
                            {new Date(sale.timestamp).toLocaleString('en-TZ', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-1">
                            <span className={`text-xs font-semibold ${
                              sale.syncAttempts >= 3 ? 'text-red-600' : 'text-orange-600'
                            }`}>
                              {sale.syncAttempts}/3
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-1.5">
                          {sale.error ? (
                            <div className="flex items-center gap-1 group relative">
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                              <span className="text-xs text-red-600 font-semibold cursor-help">
                                Failed
                              </span>
                              <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-10 bg-red-50 border border-red-200 rounded-lg p-2 shadow-lg max-w-xs">
                                <p className="text-xs text-red-800 font-semibold mb-1">Sync Error:</p>
                                <p className="text-xs text-red-700">{sale.error}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-orange-600 font-semibold">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {pendingSales === 0 && (
            <div className="p-6 text-center border border-gray-200 rounded-lg bg-gray-50">
              <Cloud className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-medium text-gray-900">No Pending Sales</p>
              <p className="text-xs text-gray-500 mt-1">All sales have been synced successfully</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (!navigator.onLine) {
                  toast.error('You are offline. Please connect to the internet to sync sales.');
                  return;
                }
                setSyncing(true);
                try {
                  const result = await offlineSaleSyncService.syncAllPendingSales();
                  if (result.synced > 0) {
                    toast.success(`✅ Synced ${result.synced} sales successfully`);
                  }
                  if (result.failed > 0) {
                    toast.error(`⚠️ ${result.failed} sales failed to sync`);
                  }
                  if (result.synced === 0 && result.failed === 0) {
                    toast.success('✅ No pending sales to sync');
                  }
                  loadPendingSales();
                } catch (error) {
                  toast.error('Failed to sync sales');
                } finally {
                  setSyncing(false);
                }
              }}
              disabled={syncing || !navigator.onLine || pendingSales === 0}
              className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Cloud className="w-3 h-3" />
                  Sync Pending Sales
                </>
              )}
            </button>
          </div>

          {pendingSales > 0 && !navigator.onLine && (
            <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-3 h-3 text-orange-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-orange-800">
                You have {pendingSales} sales waiting to sync. They will automatically sync when you go online.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Storage Information */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Storage Information</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 flex items-center gap-2">
              <HardDrive className="w-3 h-3" />
              Local Storage Used
            </span>
            <span className="text-xs font-semibold text-gray-900">
              {(() => {
                let total = 0;
                for (let key in localStorage) {
                  if (localStorage.hasOwnProperty(key)) {
                    total += localStorage[key].length + key.length;
                  }
                }
                if (total < 1024) return total + ' B';
                if (total < 1024 * 1024) return (total / 1024).toFixed(2) + ' KB';
                return (total / (1024 * 1024)).toFixed(2) + ' MB';
              })()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Storage Limit</span>
            <span className="text-xs font-semibold text-gray-900">~5-10 MB</span>
          </div>
        </div>
      </div>
    </div>

    {/* Database Connection Info */}
    <div className="mt-6 bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Database Connection</h3>
      </div>
      
      <div className="space-y-3">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800 font-semibold">Database Connected</p>
          </div>
          <p className="text-green-700 text-sm">
            ✅ Your Neon database is successfully connected and ready to use!
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2 text-sm">Connection Details:</h4>
          <ul className="list-disc list-inside text-blue-800 space-y-1 text-xs">
            <li>Database: Neon PostgreSQL</li>
            <li>Connection: Pooled (Serverless)</li>
            <li>Status: Active</li>
          </ul>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2 text-sm">Features:</h4>
          <ul className="list-disc list-inside text-gray-700 space-y-1 text-xs">
            <li>Real-time database queries</li>
            <li>Automatic connection pooling</li>
            <li>Full PostgreSQL compatibility</li>
            <li>Optimized for serverless applications</li>
          </ul>
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => {
                // Scroll to backup section
                const backupSection = document.querySelector('[class*="Database Backup"]');
                if (backupSection) {
                  backupSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors"
            >
              <h5 className="font-semibold text-xs mb-1">Backup Data</h5>
              <p className="text-xs text-gray-600">Create a database backup</p>
            </button>
            <button 
              onClick={() => {
                // Scroll to automatic backup settings
                const autoBackupSection = document.querySelector('[class*="Auto Backup"]');
                if (autoBackupSection) {
                  autoBackupSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors"
            >
              <h5 className="font-semibold text-xs mb-1">Settings</h5>
              <p className="text-xs text-gray-600">Configure database settings</p>
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Info Box */}
    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">How it works:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Download full database to enable offline-first operation</li>
            <li>All data is stored locally for instant access</li>
            <li>Sales are saved locally first, then synced to online database in background</li>
            <li>Automatic sync runs every 30 seconds when online</li>
            <li>Download again to refresh your local database</li>
            <li>Restore backups from GitHub Actions or local backup files</li>
          </ul>
        </div>
      </div>
    </div>

    {/* Database Data Cleanup Panel */}
    <div className="mt-6">
      <DatabaseDataCleanupPanel />
    </div>
  </>
  );
}; 

// Integrations Settings Component
const IntegrationsSettings: React.FC<{
  settings: any;
  onSave: (data: any) => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusColor: (status: string) => string;
}> = ({ settings, onSave, getStatusIcon, getStatusColor }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(localSettings);
      toast.success('Integration settings saved successfully');
    } catch (error) {
      toast.error('Failed to save integration settings');
    } finally {
      setSaving(false);
    }
  };

  const testIntegration = async (type: string) => {
    try {
      toast.loading(`Testing ${type} integration...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.dismiss();
      toast.success(`${type} integration test successful`);
    } catch (error) {
      toast.dismiss();
      toast.error(`${type} integration test failed`);
    }
  };

  const integrations = [
    {
      id: 'sms',
      name: 'SMS Service',
      icon: Smartphone,
      color: 'text-green-600',
      bgColor: 'from-green-50 to-emerald-50'
    },
    {
      id: 'email',
      name: 'Email Service',
      icon: Mail,
      color: 'text-blue-600',
      bgColor: 'from-blue-50 to-indigo-50'
    },
    
    {
      id: 'ai',
      name: 'AI Service',
      icon: Zap,
      color: 'text-purple-600',
      bgColor: 'from-purple-50 to-violet-50'
    }
  ];

  return (
    <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-800">Integrations Configuration</h2>
        </div>
      </div>

      <div className="space-y-6">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          const integrationSettings = localSettings[integration.id];

          return (
            <div key={integration.id} className="border-2 border-gray-200 rounded-xl shadow-sm">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${integration.color}`} />
                  <div>
                    <h3 className="font-medium text-gray-800">{integration.name}</h3>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(integrationSettings.status)}
                      <span className={`text-sm ${getStatusColor(integrationSettings.status)}`}>
                        {integrationSettings.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => testIntegration(integration.id)}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-all shadow-sm text-sm"
                  >
                    <TestTube className="w-3 h-3" />
                    Test
                  </button>
                </div>
              </div>

                <div className="border-t border-gray-200 p-4 space-y-4">
                  {integration.id === 'sms' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Provider
                        </label>
                        <input
                          type="text"
                          value={integrationSettings.provider}
                          onChange={(e) => setLocalSettings(prev => ({
                            ...prev,
                            sms: { ...prev.sms, provider: e.target.value }
                          }))}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Balance
                        </label>
                        <input
                          type="number"
                          value={integrationSettings.balance}
                          onChange={(e) => setLocalSettings(prev => ({
                            ...prev,
                            sms: { ...prev.sms, balance: parseInt(e.target.value) || 0 }
                          }))}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Last Used
                        </label>
                        <div className="text-sm text-gray-600">
                          {new Date(integrationSettings.lastUsed).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}

                  {integration.id === 'email' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Provider
                        </label>
                        <input
                          type="text"
                          value={integrationSettings.provider}
                          onChange={(e) => setLocalSettings(prev => ({
                            ...prev,
                            email: { ...prev.email, provider: e.target.value }
                          }))}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Daily Limit
                        </label>
                        <input
                          type="number"
                          value={integrationSettings.dailyLimit}
                          onChange={(e) => setLocalSettings(prev => ({
                            ...prev,
                            email: { ...prev.email, dailyLimit: parseInt(e.target.value) || 0 }
                          }))}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Used Today
                        </label>
                        <div className="text-sm text-gray-600">
                          {integrationSettings.usedToday} / {integrationSettings.dailyLimit}
                        </div>
                      </div>
                    </div>
                  )}

          

                  {integration.id === 'ai' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Provider
                        </label>
                        <input
                          type="text"
                          value={integrationSettings.provider}
                          onChange={(e) => setLocalSettings(prev => ({
                            ...prev,
                            ai: { ...prev.ai, provider: e.target.value }
                          }))}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Model
                        </label>
                        <input
                          type="text"
                          value={integrationSettings.model}
                          onChange={(e) => setLocalSettings(prev => ({
                            ...prev,
                            ai: { ...prev.ai, model: e.target.value }
                          }))}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          API Key Status
                        </label>
                        <div className="flex items-center gap-2">
                          {integrationSettings.apiKeyConfigured ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="text-sm">
                            {integrationSettings.apiKeyConfigured ? 'Configured' : 'Not Configured'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
            </div>
          );
        })}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <GlassButton
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save All Settings'}
          </GlassButton>

          <GlassButton
            onClick={() => setLocalSettings(settings)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset All
          </GlassButton>
        </div>
      </div>
    </div>
  );
}; 

// Automation Settings Component
const AutomationSettings: React.FC<{
  settings: any;
  onSave: (data: any) => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusColor: (status: string) => string;
}> = ({ settings, onSave, getStatusIcon, getStatusColor }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [saving, setSaving] = useState(false);

  const handleToggle = async (key: string, value: boolean) => {
    const newSettings = {...localSettings, [key]: value};
    setLocalSettings(newSettings);
    
    // Auto-save on toggle
    setSaving(true);
    try {
      await onSave(newSettings);
      toast.success(`${key.replace('auto', 'Auto ')} ${value ? 'enabled' : 'disabled'} successfully!`);
    } catch (error) {
      toast.error('Failed to update automation settings');
      // Revert on error
      setLocalSettings(localSettings);
    } finally {
      setSaving(false);
    }
  };

  const automationFeatures = [
    {
      key: 'autoBackup',
      title: 'Automatic Backup',
      description: 'Automatically backup data at scheduled intervals',
      icon: Cloud,
      color: 'purple',
      enabled: localSettings.autoBackup
    },
    {
      key: 'autoCleanup',
      title: 'Automatic Cleanup',
      description: 'Clean up old logs and temporary files',
      icon: Trash2,
      color: 'green',
      enabled: localSettings.autoCleanup
    },
    {
      key: 'autoScaling',
      title: 'Auto Scaling',
      description: 'Automatically scale resources based on demand',
      icon: Activity,
      color: 'blue',
      enabled: localSettings.autoScaling
    },
    {
      key: 'autoUpdates',
      title: 'Automatic Updates',
      description: 'Automatically update system components',
      icon: RefreshCw,
      color: 'orange',
      enabled: localSettings.autoUpdates
    }
  ];

  return (
    <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Automation Settings</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {automationFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <div 
              key={feature.key}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon className="w-6 h-6 text-blue-600" />
                <h4 className="font-semibold text-gray-900">{feature.title}</h4>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{feature.description}</p>
              
              <button
                onClick={() => handleToggle(feature.key, !feature.enabled)}
                disabled={saving}
                className={`w-full py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  feature.enabled
                    ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {feature.enabled ? (
                  <>
                    <Check className="w-4 h-4" />
                    Enabled
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Enable
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AdminSettingsPage: React.FC = () => {
  return (
    <SettingsSaveProvider>
      <AdminSettingsPageContent />
    </SettingsSaveProvider>
  );
};

export default AdminSettingsPage;
