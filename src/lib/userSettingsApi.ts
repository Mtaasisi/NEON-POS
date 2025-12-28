import { supabase } from './supabaseClient';
import toast from 'react-hot-toast';

export interface UserSettings {
  displayName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  appLogo?: string;
  language?: string;
  timezone?: string;
  dateFormat?: string;
  theme?: 'light' | 'dark' | 'auto';
  notifications?: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
  privacy?: {
    profileVisibility: 'public' | 'private';
    showOnlineStatus: boolean;
    allowMessages: boolean;
  };
  preferences?: {
    autoSave: boolean;
    compactMode: boolean;
    showTutorials: boolean;
  };
  pos?: {
    defaultCurrency: string;
    taxRate: number;
    receiptHeader: string;
    receiptFooter: string;
    autoPrint: boolean;
    requireCustomerInfo: boolean;
    allowDiscounts: boolean;
    maxDiscountPercent: number;
    barcodeScanner: boolean;
    cashDrawer: boolean;
    paymentMethods: string[];
    defaultPaymentMethod: string;
    receiptNumbering: boolean;
    receiptPrefix: string;
    lowStockAlert: boolean;
    lowStockThreshold: number;
    inventoryTracking: boolean;
    returnPolicy: string;
    warrantyPeriod: number;
    warrantyUnit: 'days' | 'weeks' | 'months' | 'years';
  };
  delivery?: {
    enable_delivery: boolean;
    default_delivery_fee: number;
    free_delivery_threshold: number;
    max_delivery_distance: number;
    enable_delivery_areas: boolean;
    delivery_areas: string[];
    area_delivery_fees: Record<string, number>;
    area_delivery_times: Record<string, number>;
    enable_delivery_hours: boolean;
    delivery_start_time: string;
    delivery_end_time: string;
    enable_same_day_delivery: boolean;
    enable_next_day_delivery: boolean;
    delivery_time_slots: string[];
    notify_customer_on_delivery: boolean;
    notify_driver_on_assignment: boolean;
    enable_sms_notifications: boolean;
    enable_email_notifications: boolean;
    enable_driver_assignment: boolean;
    driver_commission: number;
    require_signature: boolean;
    enable_driver_tracking: boolean;
    enable_scheduled_delivery: boolean;
    enable_partial_delivery: boolean;
    require_advance_payment: boolean;
    advance_payment_percent: number;
  };
  dashboard?: {
    quickActions: {
      // Core Business Features
      devices: boolean;
      addDevice: boolean;
      customers: boolean;
      inventory: boolean;
      appointments: boolean;
      purchaseOrders: boolean;
      payments: boolean;
      adGenerator: boolean;
      pos: boolean;
      reports: boolean;
      employees: boolean;
      whatsapp: boolean;
      settings: boolean;
      search: boolean;
      loyalty: boolean;
      backup: boolean;
      
      // SMS & Communication Features
      sms: boolean;
      bulkSms: boolean;
      smsLogs: boolean;
      smsSettings: boolean;
      
      // Import/Export & Data Management
      excelImport: boolean;
      excelTemplates: boolean;
      productExport: boolean;
      customerImport: boolean;
      
      // Advanced System Features
      userManagement: boolean;
      databaseSetup: boolean;
      integrationSettings: boolean;
      integrationsTest: boolean;
      aiTraining: boolean;
      bluetoothPrinter: boolean;
      
      // Business Management
      categoryManagement: boolean;
      supplierManagement: boolean;
      storeLocations: boolean;
      
      // Advanced Analytics & Reports
      reminders: boolean;
      mobile: boolean;
      myAttendance: boolean;
    };
    widgets: {
      revenueTrendChart: boolean;
      deviceStatusChart: boolean;
      appointmentsTrendChart: boolean;
      stockLevelChart: boolean;
      performanceMetricsChart: boolean;
      customerActivityChart: boolean;
      salesFunnelChart: boolean;
      appointmentWidget: boolean;
      employeeWidget: boolean;
      notificationWidget: boolean;
      financialWidget: boolean;
      analyticsWidget: boolean;
      serviceWidget: boolean;
      customerInsightsWidget: boolean;
      systemHealthWidget: boolean;
      inventoryWidget: boolean;
      activityFeedWidget: boolean;
    };
    widgetSizes?: {
      [key: string]: 'small' | 'medium' | 'large';
    };
    widgetRowSpans?: {
      [key: string]: 'single' | 'double';
    };
    autoArrange?: boolean;
  };
}

/**
 * Load user settings with improved error handling
 */
export const loadUserSettings = async (userId: string): Promise<UserSettings | null> => {
  try {
    // Import unified settings service dynamically
    const { unifiedSettingsService } = await import('./unifiedSettingsService');

    // Load user preferences from unified settings
    const userPrefs = await unifiedSettingsService.getSettingsByCategory('user', 'user_preferences', userId);

    // Load dashboard settings from unified settings (stored in preferences)
    const dashboardSettings = await unifiedSettingsService.getSettingsByCategory('user', 'user_preferences', userId);

    // Return user settings in the expected format
    return {
      id: `user-${userId}`,
      user_id: userId,
      theme: userPrefs.theme?.value || 'light',
      language: userPrefs.language?.value || 'en',
      currency: userPrefs.currency?.value || 'TZS',
      timezone: userPrefs.timezone?.value || 'Africa/Dar_es_Salaam',
      date_format: userPrefs.date_format?.value || 'DD/MM/YYYY',
      time_format: userPrefs.time_format?.value || '24',
      sound_enabled: userPrefs.sound_enabled?.value !== false,
      notifications_enabled: userPrefs.notifications_enabled?.value !== false,
      auto_save: userPrefs.auto_save?.value !== false,
      compact_view: userPrefs.compact_view?.value || false,
      show_tooltips: userPrefs.show_tooltips?.value !== false,
      keyboard_shortcuts: userPrefs.keyboard_shortcuts?.value !== false,
      // Load dashboard settings
      dashboard: dashboardSettings.preferences?.value?.dashboard || getDefaultUserSettings(userId)?.dashboard,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as UserSettings;
  } catch (error) {
    console.error('❌ Error loading user settings:', error);
    return getDefaultUserSettings(userId);
  }
}

export const loadUserSettings_old = async (userId: string): Promise<UserSettings | null> => {
  let retries = 0;
  const maxRetries = 3;
  
  while (retries < maxRetries) {
    try {
      // Skip old user_settings table check - using unified settings now
      return getDefaultUserSettings(userId);

      if (tableError) {
        // Table doesn't exist or RLS is blocking access
        console.log('⚠️ User settings table not accessible:', tableError.message);
        
        // Try to create the table if it doesn't exist
        if (tableError.code === '42P01') { // Table doesn't exist
          console.log('📋 User settings table not found, please run the database setup script');
          console.log('📋 You can run: create-user-settings-final.sql in your Supabase SQL editor');
          return null;
        } else if (tableError.code === '42710') { // Trigger already exists
          console.log('⚠️ Trigger conflict detected, this is expected and can be ignored');
          // Continue with the operation as the table exists
        } else if (tableError.code === '42601') { // Syntax error
          console.log('⚠️ SQL syntax error detected, please run the final setup script');
          console.log('📋 You can run: create-user-settings-final.sql in your Supabase SQL editor');
          return null;
        } else if (tableError.code === '42P10') { // Constraint error
          console.log('⚠️ Constraint error detected - duplicate user_id found');
          console.log('📋 You can run: fix-user-settings-existing.sql to fix existing data');
          return null;
        } else if (tableError.code === '23505') { // Unique violation
          console.log('⚠️ Unique constraint violation - duplicate user_id found');
          console.log('📋 You can run: fix-user-settings-existing.sql to fix existing data');
          return null;
        } else {
          // RLS or other permission issue
          console.log('🔒 User settings table access blocked by RLS or permissions');
          console.log('📋 Error details:', tableError.message);
          return null;
        }
      }

      // Skip old user_settings query - using unified settings now
      return getDefaultUserSettings(userId);

      if (error) {
        // If it's a 406 error, retry after a short delay
        if (error.code === '406' || error.message?.includes('406')) {
          console.log(`⚠️ 406 error on attempt ${retries + 1}, retrying...`);
          retries++;
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            continue;
          }
        }
        
        // If no rows found, return null (will trigger default creation)
        if (error.code === 'PGRST116') {
          console.log('📝 No user settings found for user, will create defaults');
          return null;
        }
        
        throw error;
      }

      return data?.settings || null;
      
    } catch (retryError: any) {
      if (retries >= maxRetries - 1) {
        console.error('Error loading user settings:', retryError);
        
        // Don't show error toast for 406 errors as they're expected in some cases
        if (!retryError.message?.includes('406')) {
          console.log('User settings not available, using defaults');
        }
        return null;
      }
      retries++;
      await new Promise(resolve => setTimeout(resolve, 1000 * retries));
    }
  }
  
  return null;
};

/**
 * Save user settings with improved error handling
 */
export const saveUserSettings = async (
  userId: string,
  settings: UserSettings,
  section?: string
): Promise<boolean> => {
  try {
    // Import unified settings service dynamically
    const { unifiedSettingsService } = await import('./unifiedSettingsService');

    // Save individual user preference settings
    const preferenceUpdates = [
      unifiedSettingsService.setSetting('user', 'user_preferences', 'theme', settings.theme, 'string', userId),
      unifiedSettingsService.setSetting('user', 'user_preferences', 'language', settings.language, 'string', userId),
      unifiedSettingsService.setSetting('user', 'user_preferences', 'currency', settings.currency, 'string', userId),
      unifiedSettingsService.setSetting('user', 'user_preferences', 'timezone', settings.timezone, 'string', userId),
      unifiedSettingsService.setSetting('user', 'user_preferences', 'date_format', settings.date_format, 'string', userId),
      unifiedSettingsService.setSetting('user', 'user_preferences', 'time_format', settings.time_format, 'string', userId),
      unifiedSettingsService.setSetting('user', 'user_preferences', 'sound_enabled', settings.sound_enabled, 'boolean', userId),
      unifiedSettingsService.setSetting('user', 'user_preferences', 'notifications_enabled', settings.notifications_enabled, 'boolean', userId),
      unifiedSettingsService.setSetting('user', 'user_preferences', 'auto_save', settings.auto_save, 'boolean', userId),
      unifiedSettingsService.setSetting('user', 'user_preferences', 'compact_view', settings.compact_view, 'boolean', userId),
      unifiedSettingsService.setSetting('user', 'user_preferences', 'show_tooltips', settings.show_tooltips, 'boolean', userId),
      unifiedSettingsService.setSetting('user', 'user_preferences', 'keyboard_shortcuts', settings.keyboard_shortcuts, 'boolean', userId)
    ];

    // Save dashboard settings if provided (stored in preferences)
    let dashboardUpdate = Promise.resolve(true);
    if (settings.dashboard) {
      // Load current preferences and merge dashboard settings
      const currentPrefs = await unifiedSettingsService.getSettingsByCategory('user', 'user_preferences', userId);
      const updatedPrefs = {
        ...currentPrefs,
        dashboard: settings.dashboard
      };
      dashboardUpdate = unifiedSettingsService.setSetting('user', 'user_preferences', 'preferences', updatedPrefs, 'json', userId);
    }

    const allUpdates = [...preferenceUpdates, dashboardUpdate];
    const results = await Promise.all(allUpdates);
    return results.every(result => result);

    } catch (error) {
      console.error('Error saving user settings:', error);
      return false;
    }
};

/**
 * Create default user settings if none exist
 */
export const createDefaultUserSettings = async (userId: string): Promise<boolean> => {
  try {
    const defaultSettings: UserSettings = {
      language: 'en',
      timezone: 'Africa/Dar_es_Salaam',
      dateFormat: 'DD/MM/YYYY',
      theme: 'auto',
      notifications: {
        email: true,
        sms: false,
        push: true,
        inApp: true
      },
      privacy: {
        profileVisibility: 'public',
        showOnlineStatus: true,
        allowMessages: true
      },
      preferences: {
        autoSave: true,
        compactMode: false,
        showTutorials: true
      },
      pos: {
        defaultCurrency: 'TZS',
        taxRate: 18,
        receiptHeader: 'Repair Shop\nManagement System',
        receiptFooter: 'Thank you for your business!\nVisit us again.',
        autoPrint: false,
        requireCustomerInfo: true,
        allowDiscounts: true,
        maxDiscountPercent: 20,
        barcodeScanner: true,
        cashDrawer: false,
        paymentMethods: ['cash', 'mpesa', 'card'],
        defaultPaymentMethod: 'cash',
        receiptNumbering: true,
        receiptPrefix: 'RS',
        lowStockAlert: true,
        lowStockThreshold: 5,
        inventoryTracking: true,
        returnPolicy: '7 days return policy',
        warrantyPeriod: 3,
        warrantyUnit: 'months'
      },
      dashboard: {
        quickActions: {
          // Core Business Features
          devices: true,
          addDevice: true,
          customers: true,
          inventory: true,
          appointments: true,
          purchaseOrders: true,
          payments: true,
          adGenerator: true,
          pos: true,
          reports: true,
          employees: true,
          whatsapp: true,
          settings: true,
          search: true,
          loyalty: true,
          backup: true,
          
          // SMS & Communication Features
          sms: true,
          bulkSms: true,
          smsLogs: true,
          smsSettings: true,
          
          // Import/Export & Data Management
          excelImport: true,
          excelTemplates: true,
          productExport: true,
          customerImport: true,
          
          // Advanced System Features
          userManagement: true,
          databaseSetup: true,
          integrationSettings: true,
          integrationsTest: true,
          aiTraining: true,
          bluetoothPrinter: true,
          
          // Business Management
          categoryManagement: true,
          supplierManagement: true,
          storeLocations: true,
          
          // Advanced Analytics & Reports
          reminders: true,
          mobile: true,
          myAttendance: true
        },
        widgets: {
          revenueTrendChart: true,
          deviceStatusChart: true,
          appointmentsTrendChart: true,
          stockLevelChart: true,
          performanceMetricsChart: true,
          customerActivityChart: true,
          salesFunnelChart: true,
          appointmentWidget: true,
          employeeWidget: true,
          notificationWidget: true,
          financialWidget: true,
          analyticsWidget: true,
          serviceWidget: true,
          customerInsightsWidget: true,
          systemHealthWidget: true,
          inventoryWidget: true,
          activityFeedWidget: true
        }
      }
    };

    return await saveUserSettings(userId, defaultSettings);
  } catch (error) {
    console.error('Error creating default user settings:', error);
    return false;
  }
};

/**
 * Get default user settings object
 */
export const getDefaultUserSettings = (userId: string): UserSettings => {
  return {
    id: `user-${userId}`,
    user_id: userId,
    theme: 'light',
    language: 'en',
    currency: 'TZS',
    timezone: 'Africa/Dar_es_Salaam',
    date_format: 'DD/MM/YYYY',
    time_format: '24',
    sound_enabled: true,
    notifications_enabled: true,
    auto_save: true,
    compact_view: false,
    show_tooltips: true,
    keyboard_shortcuts: true,
    dashboard: {
      quickActions: {
        // Core Business Features - Only 6 enabled by default
        devices: true,
        addDevice: true,
        customers: true,
        inventory: true,
        appointments: true,
        purchaseOrders: true,
        payments: false,
        adGenerator: false,
        pos: false,
        reports: false,
        employees: false,
        whatsapp: false,
        settings: false,
        search: false,
        loyalty: false,
        backup: false,

        // SMS & Communication Features
        sms: false,
        bulkSms: false,
        smsLogs: false,
        smsSettings: false,

        // Import/Export & Data Management
        excelImport: false,
        excelTemplates: false,
        productExport: false,
        customerImport: false,

        // Advanced System Features
        userManagement: false,
        databaseSetup: false,
        integrationSettings: false,
        integrationsTest: false,
        aiTraining: false,
        bluetoothPrinter: false,

        // Business Management
        categoryManagement: false,
        supplierManagement: false,
        storeLocations: false,

        // Advanced Analytics & Reports
        reminders: false,
        mobile: false,
        myAttendance: false
      },
      widgets: {
        revenueTrendChart: true,
        deviceStatusChart: true,
        appointmentsTrendChart: true,
        stockLevelChart: true,
        performanceMetricsChart: true,
        customerActivityChart: true,
        salesFunnelChart: true,
        purchaseOrderChart: true,
        appointmentWidget: true,
        employeeWidget: true,
        notificationWidget: true,
        financialWidget: true,
        analyticsWidget: true,
        serviceWidget: true,
        reminderWidget: true,
        customerInsightsWidget: true,
        systemHealthWidget: true,
        inventoryWidget: true,
        activityFeedWidget: true,
        purchaseOrderWidget: true,
        chatWidget: true,
        salesWidget: true,
        topProductsWidget: true,
        expensesWidget: true,
        staffPerformanceWidget: true,
        paymentMethodsChart: true,
        salesByCategoryChart: true,
        profitMarginChart: true
      }
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};
