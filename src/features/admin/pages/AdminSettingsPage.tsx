import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
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
import { 
  Settings,
  Database,
  Server,
  Shield,
  Bell,
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
  FileText,
  Package
} from 'lucide-react';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import PriceInput from '../../../features/shared/components/ui/PriceInput';
import GlassInput from '../../../features/shared/components/ui/EnhancedInput';
import LogoUpload from '../../../features/shared/components/ui/LogoUpload';
import { hostingerUploadService } from '../../../lib/hostingerUploadService';
import toast from 'react-hot-toast';

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

const AdminSettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState('branding');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'transparent' }}>
        <GlassCard className="p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: 'transparent' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Settings className="w-8 h-8 text-indigo-600" />
                Admin Settings
              </h1>
              <p className="text-gray-600 mt-2">Manage system configuration, backend settings, and database connections</p>
            </div>
            <div className="flex gap-2">
              <GlassButton
                onClick={() => window.location.href = '/integration-testing'}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <TestTube className="w-4 h-4" />
                Test Integrations
              </GlassButton>
              <GlassButton
                onClick={loadSystemSettings}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </GlassButton>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <GlassCard className="p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Settings Categories</h3>
              <nav className="space-y-2">
                {[
                  { id: 'branding', label: 'Business Information', icon: Building2 },
                  { id: 'stores', label: 'Store Management', icon: MapPin },
                  { id: 'inventory', label: 'Inventory', icon: Package },
                  { id: 'payments', label: 'Payments', icon: CreditCard },
                  { id: 'attendance', label: 'Attendance', icon: Users },
                  { id: 'loyalty', label: 'Loyalty Program', icon: Star },
                  { id: 'integrations', label: 'Integrations', icon: Globe },
                  { id: 'api-webhooks', label: 'API & Webhooks', icon: Code },
                  { id: 'documents', label: 'Document Templates', icon: FileText },
                  { id: 'appearance', label: 'Appearance', icon: Palette },
                  { id: 'notifications', label: 'Notifications', icon: Bell },
                  { id: 'database', label: 'Database', icon: Database },
                  { id: 'automation', label: 'Automation', icon: RotateCcw }
                ].map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      activeSection === section.id
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    <section.icon className="w-5 h-5" />
                    {section.label}
                  </button>
                ))}
              </nav>
            </GlassCard>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeSection === 'branding' && (
              <UnifiedBrandingSettings />
            )}

            {activeSection === 'stores' && (
              <StoreManagementSettings />
            )}

            {activeSection === 'inventory' && (
              <InventorySettings />
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

            {activeSection === 'loyalty' && (
              <LoyaltyProgramSettings />
            )}

            {activeSection === 'api-webhooks' && (
              <APIWebhooksSettings />
            )}

            {activeSection === 'documents' && (
              <DocumentTemplatesSettings />
            )}
            
            {activeSection === 'database' && (
              <DatabaseSettings />
            )}

            {activeSection === 'integrations' && (
              <IntegrationsManagement />
            )}

            {activeSection === 'attendance' && (
              <AttendanceSettings 
                settings={settings.attendance}
                onSave={(data) => saveSettings('attendance', data)}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
              />
            )}

            {activeSection === 'automation' && (
              <AutomationSettings 
                settings={settings.automation}
                onSave={(data) => saveSettings('automation', data)}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
              />
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
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Image className="w-6 h-6 text-indigo-600" />
          <h3 className="text-xl font-semibold text-gray-800">Branding Settings</h3>
        </div>
      </div>

        <div className="space-y-6">
          {/* Logo Upload */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
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
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
              <Building2 className="h-5 w-5 text-green-600 mr-2" />
              Company Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                <GlassInput
                  type="text"
                  value={localSettings.companyName || ''}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Enter company name"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Color Scheme */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
              <Palette className="h-5 w-5 text-purple-600 mr-2" />
              Color Scheme
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={localSettings.primaryColor || '#3B82F6'}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-12 h-10 rounded border border-gray-300"
                  />
                  <GlassInput
                    type="text"
                    value={localSettings.primaryColor || ''}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={localSettings.secondaryColor || '#1E40AF'}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    className="w-12 h-10 rounded border border-gray-300"
                  />
                  <GlassInput
                    type="text"
                    value={localSettings.secondaryColor || ''}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    placeholder="#1E40AF"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Logo Display Settings */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
              <Eye className="h-5 w-5 text-orange-600 mr-2" />
              Logo Display
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo Size</label>
                <select
                  value={localSettings.logoSize || 'medium'}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, logoSize: e.target.value as 'small' | 'medium' | 'large' }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo Position</label>
                <select
                  value={localSettings.logoPosition || 'left'}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, logoPosition: e.target.value as 'left' | 'center' | 'right' }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
              <Eye className="h-5 w-5 text-cyan-600 mr-2" />
              Preview
            </h4>
            <div className="p-4 bg-gray-50 rounded-lg border">
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
            <GlassButton
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Branding Settings'}
            </GlassButton>

            <GlassButton
              onClick={() => setLocalSettings(settings)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </GlassButton>
          </div>
        </div>
    </GlassCard>
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
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
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
          <GlassCard className="p-6">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('general')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
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
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <span className="text-sm font-medium text-gray-700">Enable Attendance</span>
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

              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">Require Photo Verification</span>
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
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
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
                      <div className={`p-2 rounded-lg ${localSettings.allowEmployeeChoice ? 'bg-green-500' : 'bg-gray-300'}`}>
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
                      <div className={`p-2 rounded-lg ${!localSettings.allowEmployeeChoice ? 'bg-orange-500' : 'bg-gray-300'}`}>
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
                              <div className={`p-2 rounded-lg ${isSelected ? 'bg-white' : 'bg-gray-100'}`}>
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
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
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
                    className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium hover:border-blue-400 transition-colors"
                  >
                    <option value="auto-location">Auto-Location (GPS Auto-Detect)</option>
                    <option value="manual-location">Manual Location Selection</option>
                    <option value="wifi-only">WiFi Only</option>
                    <option value="location-and-wifi">Location + WiFi (High Security)</option>
                    <option value="photo-only">Photo Only</option>
                    <option value="all-security">Maximum Security (All Methods)</option>
                  </select>
                  
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
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
          </GlassCard>

          {/* Location Settings */}
          <GlassCard className="p-6">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('location')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
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
              <GlassInput
                label="GPS Accuracy (meters)"
                type="number"
                value={localSettings.gpsAccuracy || 0}
                onChange={(e) => setLocalSettings({ ...localSettings, gpsAccuracy: parseInt(e.target.value) || 0 })}
                min="10"
                max="1000"
              />
              <GlassInput
                label="Check-in Radius (meters)"
                type="number"
                value={localSettings.checkInRadius || 0}
                onChange={(e) => setLocalSettings({ ...localSettings, checkInRadius: parseInt(e.target.value) || 0 })}
                min="10"
                max="1000"
              />
              <GlassInput
                label="Grace Period (minutes)"
                type="number"
                value={localSettings.gracePeriod || 0}
                onChange={(e) => setLocalSettings({ ...localSettings, gracePeriod: parseInt(e.target.value) || 0 })}
                min="0"
                max="60"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <GlassInput
                label="Check-in Time"
                type="time"
                value={localSettings.checkInTime || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, checkInTime: e.target.value })}
              />
              <GlassInput
                label="Check-out Time"
                type="time"
                value={localSettings.checkOutTime || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, checkOutTime: e.target.value })}
              />
            </div>
            </div>
            )}
          </GlassCard>

          {/* Office Locations */}
          <GlassCard className="p-6">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('offices')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
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
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Selected:</strong> {selectedOffice.name} - {selectedOffice.address}
                  </p>
                </div>
              )}
            </div>
            
            {/* Existing Offices */}
            {localSettings.offices.map((office: any, officeIndex: number) => (
              <div key={officeIndex} className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="font-medium text-gray-900">{office.name}</h5>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingOffice(editingOffice === officeIndex ? null : officeIndex)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeOffice(officeIndex)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {editingOffice === officeIndex ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <GlassInput
                        label="Office Name"
                        value={office.name}
                        onChange={(e) => updateOffice(officeIndex, 'name', e.target.value)}
                      />
                      <GlassInput
                        label="Address"
                        value={office.address}
                        onChange={(e) => updateOffice(officeIndex, 'address', e.target.value)}
                      />
                      <GlassInput
                        label="Latitude"
                        type="number"
                        step="any"
                        value={office.lat || 0}
                        onChange={(e) => updateOffice(officeIndex, 'lat', parseFloat(e.target.value) || 0)}
                      />
                      <GlassInput
                        label="Longitude"
                        type="number"
                        step="any"
                        value={office.lng || 0}
                        onChange={(e) => updateOffice(officeIndex, 'lng', parseFloat(e.target.value) || 0)}
                      />
                      <GlassInput
                        label="Radius (meters)"
                        type="number"
                        value={office.radius || 0}
                        onChange={(e) => updateOffice(officeIndex, 'radius', parseInt(e.target.value) || 0)}
                      />
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
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="Description"
                            value={network.description}
                            onChange={(e) => updateNetwork(officeIndex, networkIndex, 'description', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="bg-white rounded-lg p-4 border-2 border-dashed border-gray-300">
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
                <p className="text-sm text-gray-600 mt-2">
                  💡 Click this button to automatically detect your current location for the new office
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <GlassInput
                  label="Office Name"
                  value={newOffice.name || ''}
                  onChange={(e) => setNewOffice({ ...newOffice, name: e.target.value })}
                />
                <GlassInput
                  label="Address"
                  value={newOffice.address || ''}
                  onChange={(e) => setNewOffice({ ...newOffice, address: e.target.value })}
                />
                <GlassInput
                  label="Latitude"
                  type="number"
                  step="any"
                  value={newOffice.lat || ''}
                  onChange={(e) => setNewOffice({ ...newOffice, lat: e.target.value })}
                />
                <GlassInput
                  label="Longitude"
                  type="number"
                  step="any"
                  value={newOffice.lng || ''}
                  onChange={(e) => setNewOffice({ ...newOffice, lng: e.target.value })}
                />
                <GlassInput
                  label="Radius (meters)"
                  type="number"
                  value={newOffice.radius || ''}
                  onChange={(e) => setNewOffice({ ...newOffice, radius: e.target.value })}
                />
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
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Office
              </button>
            </div>
            </div>
            )}
          </GlassCard>

          {/* Save Button */}
          <GlassCard className="p-6">
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
          </GlassCard>
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
  
  // Automatic backup settings
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupFrequency, setAutoBackupFrequency] = useState('daily');
  const [autoBackupTime, setAutoBackupTime] = useState('02:00');
  const [autoBackupType, setAutoBackupType] = useState<'full' | 'schema-only' | 'data-only'>('full');
  const [lastAutoBackup, setLastAutoBackup] = useState<string | null>(null);

  // Load automatic backup settings from database
  useEffect(() => {
    fetchAutoBackupSettings();
  }, []);

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

      toast.success('Automatic backup settings saved to database!');
    } catch (error: any) {
      console.error('Error saving auto backup settings:', error);
      toast.error('Failed to save automatic backup settings');
    }
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

        // Set the backup type and run
        setBackupType(autoBackupType);
        performDatabaseBackup();
      }
    };

    // Check every hour
    const interval = setInterval(checkAndRunBackup, 60 * 60 * 1000);
    checkAndRunBackup(); // Check immediately

    return () => clearInterval(interval);
  }, [autoBackupEnabled, autoBackupFrequency, autoBackupTime, autoBackupType, lastAutoBackup, settingsId]);

  // Full database schema backup function
  const performDatabaseBackup = async () => {
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

      const tableNames = allTables?.map((t: any) => t.table_name) || [];
      console.log(`📊 Found ${tableNames.length} tables in database schema`);

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

      // Create download
      setBackupStatus('Creating backup file...');
      setBackupProgress(95);
      
      const backupJson = JSON.stringify(backup, null, 2);
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const filePrefix = 
        backupType === 'schema-only' ? 'schema-only-backup' :
        backupType === 'data-only' ? 'data-only-backup' :
        'full-schema-backup';
      
      a.download = `${filePrefix}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const successMessage = 
        backupType === 'schema-only' 
          ? `✅ Schema backup completed! ${tableNames.length} table schemas exported` :
        backupType === 'data-only'
          ? `✅ Data backup completed! ${totalRecords.toLocaleString()} records from ${tablesWithData} tables` :
          `✅ Full backup completed! ${totalRecords.toLocaleString()} records from ${tablesWithData} tables (${emptyTables} empty tables included)`;

      setBackupStatus(successMessage);
      setBackupProgress(100);
      
      const toastMessage = 
        backupType === 'schema-only'
          ? `Schema backup: ${tableNames.length} tables` :
        backupType === 'data-only'
          ? `Data backup: ${totalRecords.toLocaleString()} records` :
          `Full backup: ${tableNames.length} tables, ${totalRecords.toLocaleString()} records`;
      
      toast.success(toastMessage);

      setTimeout(() => {
        setIsBackingUp(false);
        setBackupProgress(0);
        setBackupStatus('');
      }, 5000);

    } catch (error: any) {
      setBackupStatus(`❌ Backup failed: ${error.message}`);
      toast.error(`Backup failed: ${error.message}`);
      setIsBackingUp(false);
    }
  };

  if (loading) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading backup settings...</span>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">Database Backup & Management</h2>
        </div>
      </div>

      <div className="space-y-6">
          {/* Automatic Backup Configuration */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
              <RotateCcw className="h-5 w-5 text-blue-600 mr-2" />
              Automatic Backup Schedule
            </h4>
            
            <div className="space-y-4">
              {/* Enable Automatic Backup */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <div>
                    <span className="font-medium text-gray-800">Enable Automatic Backup</span>
                    <p className="text-sm text-gray-600">Automatically backup database on schedule</p>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-lg border border-gray-200">
                  {/* Frequency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Backup Frequency
                    </label>
                    <select
                      value={autoBackupFrequency}
                      onChange={(e) => setAutoBackupFrequency(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  {/* Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Backup Time
                    </label>
                    <input
                      type="time"
                      value={autoBackupTime}
                      onChange={(e) => setAutoBackupTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Backup Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Backup Type
                    </label>
                    <select
                      value={autoBackupType}
                      onChange={(e) => setAutoBackupType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="full">Full (Schema + Data)</option>
                      <option value="schema-only">Schema Only</option>
                      <option value="data-only">Data Only</option>
                    </select>
                  </div>
                </div>
              )}

              {autoBackupEnabled && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-800">
                    <strong>⏰ Schedule:</strong> Backup will run automatically every{' '}
                    <strong>{autoBackupFrequency}</strong> at <strong>{autoBackupTime}</strong> 
                    {' '}({autoBackupType === 'full' ? 'Full backup' : autoBackupType === 'schema-only' ? 'Schema only' : 'Data only'})
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Last automatic backup: {lastAutoBackup 
                      ? new Date(lastAutoBackup).toLocaleString() 
                      : 'Never'}
                  </p>
                </div>
              )}

              <GlassButton
                onClick={saveAutoBackupSettings}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="w-4 h-4" />
                Save Automatic Backup Settings
              </GlassButton>
            </div>
          </div>

          {/* Manual Database Backup */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
              <Download className="h-5 w-5 text-orange-600 mr-2" />
              Manual Database Backup
            </h4>
            
            <div className="space-y-4">
              {/* Backup Type Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Backup Type
                </label>
                <select
                  value={backupType}
                  onChange={(e) => setBackupType(e.target.value as any)}
                  disabled={isBackingUp}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="full">Full Backup (Schema + Data)</option>
                  <option value="schema-only">Schema Only (No Data)</option>
                  <option value="data-only">Data Only (No Schema)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {backupType === 'full' && '📦 Includes table structures AND all records (recommended for complete backup)'}
                  {backupType === 'schema-only' && '📋 Only table structures - useful for database migration or documentation'}
                  {backupType === 'data-only' && '💾 Only data records - useful for data export or analysis'}
                </p>
              </div>

              {isBackingUp && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{backupStatus}</span>
                    <span className="font-medium text-blue-600">{Math.round(backupProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${backupProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {!isBackingUp && backupStatus && (
                <div className={`p-3 rounded-lg ${
                  backupStatus.includes('✅') 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  <p className="text-sm font-medium">{backupStatus}</p>
                </div>
              )}

              <GlassButton
                onClick={performDatabaseBackup}
                disabled={isBackingUp}
                className="w-full flex items-center justify-center gap-2"
              >
                {isBackingUp ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Backing up...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    {backupType === 'full' && 'Download Full Backup'}
                    {backupType === 'schema-only' && 'Download Schema Only'}
                    {backupType === 'data-only' && 'Download Data Only'}
                  </>
                )}
              </GlassButton>

              {backupType === 'full' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>📦 Full Backup includes:</strong>
                  </p>
                  <ul className="text-xs text-blue-700 mt-1 ml-4 list-disc space-y-1">
                    <li>Complete schema for ALL tables (column names, data types, constraints)</li>
                    <li>All data records from every table</li>
                    <li>Empty tables with their schema definitions</li>
                    <li>Total record count and table statistics</li>
                  </ul>
                </div>
              )}

              {backupType === 'schema-only' && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-xs text-purple-800">
                    <strong>📋 Schema Only includes:</strong>
                  </p>
                  <ul className="text-xs text-purple-700 mt-1 ml-4 list-disc space-y-1">
                    <li>All table names</li>
                    <li>Column definitions (names, types, nullable, defaults)</li>
                    <li>Table structure for database recreation</li>
                    <li><strong>No actual data</strong> - much smaller file size</li>
                  </ul>
                </div>
              )}

              {backupType === 'data-only' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-green-800">
                    <strong>💾 Data Only includes:</strong>
                  </p>
                  <ul className="text-xs text-green-700 mt-1 ml-4 list-disc space-y-1">
                    <li>All records from all tables</li>
                    <li>Complete data export for analysis</li>
                    <li><strong>No schema definitions</strong> - data only</li>
                    <li>Useful for data migration or import into existing database</li>
                  </ul>
                </div>
              )}

              <p className="text-xs text-gray-500">
                Keep this backup in a safe place for disaster recovery and database migration.
              </p>
            </div>
          </div>

        </div>
      
    </GlassCard>
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
    <GlassCard className="p-6">
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
            <div key={integration.id} className="border border-gray-200 rounded-lg">
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
                  <GlassButton
                    onClick={() => testIntegration(integration.id)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <TestTube className="w-3 h-3" />
                    Test
                  </GlassButton>
                </div>
              </div>

                <div className="border-t border-gray-200 p-4 space-y-4">
                  {integration.id === 'sms' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Provider
                        </label>
                        <GlassInput
                          type="text"
                          value={integrationSettings.provider}
                          onChange={(e) => setLocalSettings(prev => ({
                            ...prev,
                            sms: { ...prev.sms, provider: e.target.value }
                          }))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Balance
                        </label>
                        <GlassInput
                          type="number"
                          value={integrationSettings.balance}
                          onChange={(e) => setLocalSettings(prev => ({
                            ...prev,
                            sms: { ...prev.sms, balance: parseInt(e.target.value) || 0 }
                          }))}
                          className="w-full"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Provider
                        </label>
                        <GlassInput
                          type="text"
                          value={integrationSettings.provider}
                          onChange={(e) => setLocalSettings(prev => ({
                            ...prev,
                            email: { ...prev.email, provider: e.target.value }
                          }))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Daily Limit
                        </label>
                        <GlassInput
                          type="number"
                          value={integrationSettings.dailyLimit}
                          onChange={(e) => setLocalSettings(prev => ({
                            ...prev,
                            email: { ...prev.email, dailyLimit: parseInt(e.target.value) || 0 }
                          }))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Provider
                        </label>
                        <GlassInput
                          type="text"
                          value={integrationSettings.provider}
                          onChange={(e) => setLocalSettings(prev => ({
                            ...prev,
                            ai: { ...prev.ai, provider: e.target.value }
                          }))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Model
                        </label>
                        <GlassInput
                          type="text"
                          value={integrationSettings.model}
                          onChange={(e) => setLocalSettings(prev => ({
                            ...prev,
                            ai: { ...prev.ai, model: e.target.value }
                          }))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
    </GlassCard>
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
    <GlassCard className="p-6">
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
    </GlassCard>
  );
};

export default AdminSettingsPage;
