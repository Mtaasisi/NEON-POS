// Feature Toggle Types and Configuration

export interface FeatureToggle {
  key: string;
  name: string;
  description: string;
  module: string; // Module this feature belongs to
  category: 'core' | 'advanced' | 'experimental' | 'beta';
  defaultEnabled: boolean;
  productionOnly?: boolean; // Only show in production builds
  developmentOnly?: boolean; // Only show in development builds
  dependencies?: string[]; // Features that must be enabled for this to work
  requiresRestart?: boolean; // Requires app restart when toggled
}

export interface FeatureModule {
  key: string;
  name: string;
  description: string;
  icon?: string;
  color: string;
  features: string[]; // Feature keys that belong to this module
  defaultEnabled: boolean;
  category: 'core' | 'business' | 'communication' | 'advanced' | 'experimental';
}

export interface FeatureToggleState {
  [key: string]: boolean;
}

export interface ModuleToggleState {
  [key: string]: boolean;
}

// Define feature modules first
export const FEATURE_MODULES: FeatureModule[] = [
  {
    key: 'sales_pos',
    name: 'Sales & POS',
    description: 'Point of sale, transactions, and sales management',
    icon: 'ShoppingCart',
    color: 'bg-blue-500',
    features: ['loyalty_program', 'payment_processing'],
    defaultEnabled: true,
    category: 'core',
  },
  {
    key: 'inventory',
    name: 'Inventory Management',
    description: 'Stock tracking, inventory control, and warehouse management',
    icon: 'Package',
    color: 'bg-green-500',
    features: ['inventory_management', 'multi_branch', 'barcode_scanning'],
    defaultEnabled: true,
    category: 'core',
  },
  {
    key: 'customers',
    name: 'Customer Management',
    description: 'Customer database, portal, and relationship management',
    icon: 'Users',
    color: 'bg-purple-500',
    features: ['customer_portal'],
    defaultEnabled: true,
    category: 'core',
  },
  {
    key: 'communication',
    name: 'Communication',
    description: 'Messaging, notifications, and customer communication',
    icon: 'MessageCircle',
    color: 'bg-orange-500',
    features: ['whatsapp_integration'],
    defaultEnabled: true,
    category: 'core',
  },
  {
    key: 'analytics',
    name: 'Analytics & Reporting',
    description: 'Business intelligence and performance analytics',
    icon: 'BarChart2',
    color: 'bg-indigo-500',
    features: ['advanced_analytics'],
    defaultEnabled: false,
    category: 'business',
  },
  {
    key: 'automation',
    name: 'Automation',
    description: 'Workflow automation and bulk operations',
    icon: 'Repeat',
    color: 'bg-cyan-500',
    features: ['bulk_operations', 'advanced_workflow'],
    defaultEnabled: false,
    category: 'business',
  },
  {
    key: 'ai_features',
    name: 'AI & Intelligence',
    description: 'Artificial intelligence and smart features',
    icon: 'Brain',
    color: 'bg-pink-500',
    features: ['ai_assistant', 'predictive_pricing'],
    defaultEnabled: false,
    category: 'advanced',
  },
  {
    key: 'emerging_tech',
    name: 'Emerging Technology',
    description: 'Cutting-edge features and experimental technology',
    icon: 'Zap',
    color: 'bg-yellow-500',
    features: ['ar_try_on', 'voice_commands', 'blockchain_tracking'],
    defaultEnabled: false,
    category: 'experimental',
  },
  {
    key: 'business_models',
    name: 'Business Models',
    description: 'Advanced business model features',
    icon: 'DollarSign',
    color: 'bg-emerald-500',
    features: ['subscription_billing', 'marketplace_integration'],
    defaultEnabled: false,
    category: 'business',
  },
];

export const FEATURE_TOGGLES: FeatureToggle[] = [
  // Sales & POS Module
  {
    key: 'loyalty_program',
    name: 'Loyalty Program',
    description: 'Customer loyalty rewards and points system',
    module: 'sales_pos',
    category: 'core',
    defaultEnabled: true,
  },
  {
    key: 'payment_processing',
    name: 'Payment Processing',
    description: 'Credit card and mobile payment integration',
    module: 'sales_pos',
    category: 'core',
    defaultEnabled: true,
  },

  // Inventory Module
  {
    key: 'inventory_management',
    name: 'Advanced Inventory Management',
    description: 'Stock tracking, low stock alerts, and inventory reports',
    module: 'inventory',
    category: 'core',
    defaultEnabled: true,
  },
  {
    key: 'multi_branch',
    name: 'Multi-Branch Support',
    description: 'Support for multiple store locations and branch management',
    module: 'inventory',
    category: 'core',
    defaultEnabled: true,
  },
  {
    key: 'barcode_scanning',
    name: 'Barcode Scanning',
    description: 'Mobile barcode scanning for inventory and POS',
    module: 'inventory',
    category: 'advanced',
    defaultEnabled: false,
  },

  // Customer Management Module
  {
    key: 'customer_portal',
    name: 'Customer Portal',
    description: 'Self-service portal for customers to view orders and account',
    module: 'customers',
    category: 'core',
    defaultEnabled: true,
  },

  // Communication Module
  {
    key: 'whatsapp_integration',
    name: 'WhatsApp Integration',
    description: 'Automated WhatsApp messaging for orders and notifications',
    module: 'communication',
    category: 'core',
    defaultEnabled: true,
  },

  // Analytics Module
  {
    key: 'advanced_analytics',
    name: 'Advanced Analytics',
    description: 'Detailed business analytics and reporting dashboard',
    module: 'analytics',
    category: 'advanced',
    defaultEnabled: false,
  },

  // Automation Module
  {
    key: 'bulk_operations',
    name: 'Bulk Operations',
    description: 'Import/export products, customers, and inventory in bulk',
    module: 'automation',
    category: 'advanced',
    defaultEnabled: false,
  },
  {
    key: 'advanced_workflow',
    name: 'Advanced Workflow Automation',
    description: 'Customizable business process automation',
    module: 'automation',
    category: 'beta',
    defaultEnabled: false,
  },

  // AI Features Module
  {
    key: 'ai_assistant',
    name: 'AI Assistant',
    description: 'Gemini AI-powered customer support and product recommendations',
    module: 'ai_features',
    category: 'advanced',
    defaultEnabled: false,
  },
  {
    key: 'predictive_pricing',
    name: 'Predictive Pricing',
    description: 'AI-powered dynamic pricing suggestions',
    module: 'ai_features',
    category: 'experimental',
    defaultEnabled: false,
  },

  // Emerging Technology Module
  {
    key: 'ar_try_on',
    name: 'AR Try-On',
    description: 'Augmented reality product visualization (experimental)',
    module: 'emerging_tech',
    category: 'experimental',
    defaultEnabled: false,
    productionOnly: true,
  },
  {
    key: 'voice_commands',
    name: 'Voice Commands',
    description: 'Voice-activated POS and inventory management',
    module: 'emerging_tech',
    category: 'experimental',
    defaultEnabled: false,
  },
  {
    key: 'blockchain_tracking',
    name: 'Blockchain Tracking',
    description: 'Immutable product tracking using blockchain',
    module: 'emerging_tech',
    category: 'experimental',
    defaultEnabled: false,
    productionOnly: true,
  },

  // Business Models Module
  {
    key: 'subscription_billing',
    name: 'Subscription Billing',
    description: 'Recurring billing and subscription management',
    module: 'subscription_billing',
    category: 'beta',
    defaultEnabled: false,
  },
  {
    key: 'marketplace_integration',
    name: 'Marketplace Integration',
    description: 'Integration with external marketplaces (Amazon, eBay)',
    module: 'business_models',
    category: 'beta',
    defaultEnabled: false,
  },
];

export const MODULE_CATEGORIES = {
  core: {
    name: 'Core Modules',
    description: 'Essential modules required for basic operation',
    color: 'bg-green-500',
    priority: 1,
  },
  business: {
    name: 'Business Modules',
    description: 'Business operations and management features',
    color: 'bg-blue-500',
    priority: 2,
  },
  advanced: {
    name: 'Advanced Modules',
    description: 'Enhanced functionality for growing businesses',
    color: 'bg-indigo-500',
    priority: 3,
  },
  experimental: {
    name: 'Experimental Modules',
    description: 'Cutting-edge features that may be unstable',
    color: 'bg-orange-500',
    priority: 4,
  },
} as const;

export const FEATURE_CATEGORIES = {
  core: {
    name: 'Core Features',
    description: 'Essential features required for basic operation',
    color: 'bg-green-500',
  },
  advanced: {
    name: 'Advanced Features',
    description: 'Enhanced functionality for growing businesses',
    color: 'bg-blue-500',
  },
  experimental: {
    name: 'Experimental Features',
    description: 'Cutting-edge features that may be unstable',
    color: 'bg-orange-500',
  },
  beta: {
    name: 'Beta Features',
    description: 'Features in testing phase, use with caution',
    color: 'bg-purple-500',
  },
} as const;
