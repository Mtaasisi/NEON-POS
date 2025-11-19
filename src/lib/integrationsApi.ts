/**
 * Integrations API
 * Manage all third-party integrations and API credentials
 */

import { supabase } from './supabaseClient';

export interface Integration {
  id?: string;
  user_id?: string;
  business_id?: string;
  integration_name: string;
  integration_type: 'sms' | 'email' | 'payment' | 'analytics' | 'shipping' | 'whatsapp' | 'ai' | 'custom' | 'social' | 'maps' | 'storage';
  provider_name?: string;
  is_enabled: boolean;
  is_active: boolean;
  is_test_mode: boolean;
  credentials: Record<string, any>;
  config: Record<string, any>;
  description?: string;
  webhook_url?: string;
  callback_url?: string;
  environment: 'test' | 'production' | 'sandbox';
  last_used_at?: string;
  total_requests?: number;
  successful_requests?: number;
  failed_requests?: number;
  metadata?: Record<string, any>;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface IntegrationTemplate {
  integration_name: string;
  integration_type: Integration['integration_type'];
  provider_name: string;
  icon: string;
  description: string;
  credentials_fields: {
    name: string;
    label: string;
    type: 'text' | 'password' | 'url' | 'number';
    required: boolean;
    placeholder?: string;
  }[];
  config_fields: {
    name: string;
    label: string;
    type: 'text' | 'password' | 'url' | 'number' | 'select' | 'checkbox';
    required: boolean;
    options?: { value: string; label: string }[];
    placeholder?: string;
  }[];
}

/**
 * Get all integrations
 */
export async function getAllIntegrations(): Promise<Integration[]> {
  const { data, error } = await supabase
    .from('lats_pos_integrations_settings')
    .select('*')
    .order('integration_type', { ascending: true })
    .order('integration_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get integrations by type
 */
export async function getIntegrationsByType(type: string): Promise<Integration[]> {
  const { data, error } = await supabase
    .from('lats_pos_integrations_settings')
    .select('*')
    .eq('integration_type', type)
    .order('integration_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get specific integration by name
 */
export async function getIntegration(integrationName: string): Promise<Integration | null> {
  const { data, error } = await supabase
    .from('lats_pos_integrations_settings')
    .select('*')
    .eq('integration_name', integrationName)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

/**
 * Get only enabled integrations
 */
export async function getEnabledIntegrations(): Promise<Integration[]> {
  const { data, error } = await supabase
    .from('lats_pos_integrations_settings')
    .select('*')
    .eq('is_enabled', true)
    .eq('is_active', true)
    .order('integration_type', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get credentials for a specific integration
 */
export async function getCredentials(integrationName: string): Promise<Record<string, any> | null> {
  const integration = await getIntegration(integrationName);
  if (!integration || !integration.is_enabled) return null;
  return integration.credentials;
}

/**
 * Create new integration
 */
export async function createIntegration(integration: Partial<Integration>): Promise<Integration> {
  const { data: userData } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('lats_pos_integrations_settings')
    .insert({
      ...integration,
      user_id: userData?.user?.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update integration
 */
export async function updateIntegration(
  integrationName: string,
  updates: Partial<Integration>
): Promise<Integration> {
  const { data, error } = await supabase
    .from('lats_pos_integrations_settings')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('integration_name', integrationName)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Upsert integration (create or update)
 */
export async function upsertIntegration(integration: Integration): Promise<Integration> {
  const { data: userData } = await supabase.auth.getUser();
  
  const userId = integration.user_id || userData?.user?.id;
  
  // Check if integration exists
  const existing = await getIntegration(integration.integration_name);
  
  if (existing) {
    // Update existing integration
    return await updateIntegration(integration.integration_name, {
      ...integration,
      user_id: userId,
    });
  } else {
    // Create new integration
    return await createIntegration({
      ...integration,
      user_id: userId,
    });
  }
}

/**
 * Delete integration
 */
export async function deleteIntegration(integrationName: string): Promise<void> {
  const { error } = await supabase
    .from('lats_pos_integrations_settings')
    .delete()
    .eq('integration_name', integrationName);

  if (error) throw error;
}

/**
 * Enable/Disable integration
 */
export async function toggleIntegration(integrationName: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('lats_pos_integrations_settings')
    .update({
      is_enabled: enabled,
      is_active: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq('integration_name', integrationName);

  if (error) throw error;
}

/**
 * Update usage statistics
 */
export async function updateIntegrationUsage(
  integrationName: string,
  success: boolean
): Promise<void> {
  const integration = await getIntegration(integrationName);
  if (!integration) return;

  const { error } = await supabase
    .from('lats_pos_integrations_settings')
    .update({
      last_used_at: new Date().toISOString(),
      total_requests: (integration.total_requests || 0) + 1,
      successful_requests: success 
        ? (integration.successful_requests || 0) + 1 
        : integration.successful_requests,
      failed_requests: !success 
        ? (integration.failed_requests || 0) + 1 
        : integration.failed_requests,
      updated_at: new Date().toISOString(),
    })
    .eq('integration_name', integrationName);

  if (error) throw error;
}

/**
 * Get integration templates with field definitions
 */
export function getIntegrationTemplates(): IntegrationTemplate[] {
  return [
    // SMS - MShastra (Mobishastra)
    {
      integration_name: 'SMS_GATEWAY',
      integration_type: 'sms',
      provider_name: 'MShastra',
      icon: 'Smartphone',
      description: 'Send SMS notifications and receipts via MShastra (Tanzania)',
      credentials_fields: [
        { name: 'api_key', label: 'API Username', type: 'text', required: true, placeholder: 'Your MShastra username' },
        { name: 'api_password', label: 'API Password', type: 'password', required: true, placeholder: 'Your MShastra password' },
        { name: 'sender_id', label: 'Sender ID', type: 'text', required: true, placeholder: 'LATS POS' },
      ],
      config_fields: [
        { name: 'api_url', label: 'API URL', type: 'url', required: true, placeholder: 'https://api.mshastra.com/sms' },
        { name: 'priority', label: 'Priority', type: 'select', required: false, options: [
          { value: 'High', label: 'High' },
          { value: 'Medium', label: 'Medium' },
          { value: 'Low', label: 'Low' }
        ]},
        { name: 'country_code', label: 'Country Code', type: 'text', required: false, placeholder: 'ALL' },
        { name: 'max_retries', label: 'Max Retries', type: 'number', required: false, placeholder: '3' },
        { name: 'timeout', label: 'Timeout (ms)', type: 'number', required: false, placeholder: '30000' },
      ],
    },
    // WhatsApp - Green API
    {
      integration_name: 'WHATSAPP_GATEWAY',
      integration_type: 'whatsapp',
      provider_name: 'Green API',
      icon: 'MessageCircle',
      description: 'Send WhatsApp messages, receipts, and media via Green API',
      credentials_fields: [
        { name: 'instance_id', label: 'Instance ID', type: 'text', required: true, placeholder: '7105284900' },
        { name: 'api_token', label: 'API Token', type: 'password', required: true, placeholder: 'Your Green API token' },
        { name: 'phone_number', label: 'WhatsApp Phone Number', type: 'text', required: false, placeholder: '+255712345678 (optional)' },
      ],
      config_fields: [
        { name: 'api_url', label: 'API URL / Host', type: 'url', required: true, placeholder: 'https://7105.api.greenapi.com' },
        { name: 'webhook_url', label: 'Webhook URL', type: 'url', required: false, placeholder: 'https://yourapp.com/api/whatsapp/webhook' },
        { name: 'webhook_token', label: 'Webhook Token', type: 'password', required: false, placeholder: 'Webhook verification token' },
        { name: 'link_preview', label: 'Enable Link Preview', type: 'checkbox', required: false },
        { name: 'mark_messages_read', label: 'Auto-mark Messages as Read', type: 'checkbox', required: false },
        { name: 'delay_send_ms', label: 'Delay Between Messages (ms)', type: 'number', required: false, placeholder: '1000' },
      ],
    },
    // Email - SendGrid
    {
      integration_name: 'EMAIL_SERVICE',
      integration_type: 'email',
      provider_name: 'SendGrid',
      icon: 'Mail',
      description: 'Send email receipts and notifications via SendGrid',
      credentials_fields: [
        { name: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'SG.xxxxxx' },
        { name: 'sender_email', label: 'Sender Email', type: 'text', required: true, placeholder: 'noreply@yourbusiness.com' },
        { name: 'sender_name', label: 'Sender Name', type: 'text', required: true, placeholder: 'LATS CHANCE' },
      ],
      config_fields: [
        { name: 'template_id', label: 'Default Template ID', type: 'text', required: false, placeholder: 'd-xxxxxxxxxxxxxxxx' },
        { name: 'enable_tracking', label: 'Enable Open Tracking', type: 'checkbox', required: false },
        { name: 'enable_click_tracking', label: 'Enable Click Tracking', type: 'checkbox', required: false },
        { name: 'max_retries', label: 'Max Retries', type: 'number', required: false, placeholder: '2' },
        { name: 'sandbox_mode', label: 'Sandbox Mode', type: 'checkbox', required: false },
      ],
    },
    // M-Pesa (Safaricom/Vodacom)
    {
      integration_name: 'MPESA_PAYMENT',
      integration_type: 'payment',
      provider_name: 'M-Pesa',
      icon: 'CreditCard',
      description: 'Accept M-Pesa mobile money payments (Safaricom/Vodacom)',
      credentials_fields: [
        { name: 'consumer_key', label: 'Consumer Key', type: 'password', required: true, placeholder: 'Your M-Pesa consumer key' },
        { name: 'consumer_secret', label: 'Consumer Secret', type: 'password', required: true, placeholder: 'Your M-Pesa consumer secret' },
        { name: 'business_short_code', label: 'Business Shortcode', type: 'text', required: true, placeholder: '174379' },
        { name: 'passkey', label: 'Lipa Na M-Pesa Passkey', type: 'password', required: true, placeholder: 'Your passkey' },
        { name: 'initiator_name', label: 'Initiator Name', type: 'text', required: false, placeholder: 'testapi' },
        { name: 'security_credential', label: 'Security Credential', type: 'password', required: false, placeholder: 'Encrypted password' },
      ],
      config_fields: [
        { name: 'transaction_type', label: 'Transaction Type', type: 'select', required: true, options: [
          { value: 'CustomerPayBillOnline', label: 'Pay Bill' },
          { value: 'CustomerBuyGoodsOnline', label: 'Buy Goods' }
        ]},
        { name: 'callback_url', label: 'Callback URL', type: 'url', required: true, placeholder: 'https://yourapp.com/api/mpesa/callback' },
        { name: 'timeout_url', label: 'Timeout URL', type: 'url', required: false, placeholder: 'https://yourapp.com/api/mpesa/timeout' },
        { name: 'result_url', label: 'Result URL', type: 'url', required: false, placeholder: 'https://yourapp.com/api/mpesa/result' },
        { name: 'enable_validation', label: 'Enable Validation', type: 'checkbox', required: false },
      ],
    },
    // Stripe
    {
      integration_name: 'STRIPE_PAYMENT',
      integration_type: 'payment',
      provider_name: 'Stripe',
      icon: 'CreditCard',
      description: 'Accept international card payments via Stripe',
      credentials_fields: [
        { name: 'publishable_key', label: 'Publishable Key', type: 'text', required: true, placeholder: 'pk_test_xxxxx or pk_live_xxxxx' },
        { name: 'secret_key', label: 'Secret Key', type: 'password', required: true, placeholder: 'sk_test_xxxxx or sk_live_xxxxx' },
        { name: 'webhook_secret', label: 'Webhook Secret', type: 'password', required: false, placeholder: 'whsec_xxxxx' },
      ],
      config_fields: [
        { name: 'currency', label: 'Default Currency', type: 'text', required: true, placeholder: 'usd' },
        { name: 'capture_method', label: 'Capture Method', type: 'select', required: false, options: [
          { value: 'automatic', label: 'Automatic' },
          { value: 'manual', label: 'Manual' }
        ]},
        { name: 'enable_saved_cards', label: 'Enable Saved Cards', type: 'checkbox', required: false },
        { name: 'statement_descriptor', label: 'Statement Descriptor', type: 'text', required: false, placeholder: 'LATS POS' },
      ],
    },
    // Google Analytics
    {
      integration_name: 'GOOGLE_ANALYTICS',
      integration_type: 'analytics',
      provider_name: 'Google Analytics',
      icon: 'BarChart',
      description: 'Track user behavior, sales analytics, and ecommerce data',
      credentials_fields: [
        { name: 'tracking_id', label: 'Tracking ID (UA)', type: 'text', required: false, placeholder: 'UA-XXXXXXXXX-X' },
        { name: 'measurement_id', label: 'Measurement ID (GA4)', type: 'text', required: true, placeholder: 'G-XXXXXXXXXX' },
        { name: 'api_secret', label: 'API Secret (for server events)', type: 'password', required: false, placeholder: 'Your API secret' },
      ],
      config_fields: [
        { name: 'enable_ecommerce', label: 'Enable Ecommerce Tracking', type: 'checkbox', required: false },
        { name: 'enable_enhanced_ecommerce', label: 'Enable Enhanced Ecommerce', type: 'checkbox', required: false },
        { name: 'anonymize_ip', label: 'Anonymize IP Addresses', type: 'checkbox', required: false },
        { name: 'debug_mode', label: 'Debug Mode', type: 'checkbox', required: false },
      ],
    },
    // Gemini AI
    {
      integration_name: 'GEMINI_AI',
      integration_type: 'ai',
      provider_name: 'Google Gemini',
      icon: 'Zap',
      description: 'AI-powered features, automation, and content generation',
      credentials_fields: [
        { name: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'AIzaSy...' },
      ],
      config_fields: [
        { name: 'model', label: 'Model', type: 'select', required: false, options: [
          { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Fast)' },
          { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Better Quality)' },
          { value: 'gemini-pro', label: 'Gemini Pro (Legacy)' }
        ]},
        { name: 'temperature', label: 'Temperature (0-1)', type: 'number', required: false, placeholder: '0.7' },
        { name: 'max_tokens', label: 'Max Output Tokens', type: 'number', required: false, placeholder: '1000' },
        { name: 'base_url', label: 'API Base URL', type: 'url', required: false, placeholder: 'https://generativelanguage.googleapis.com/v1beta/models' },
      ],
    },
    // Custom API
    {
      integration_name: 'CUSTOM_API',
      integration_type: 'custom',
      provider_name: 'Custom API',
      icon: 'Globe',
      description: 'Integrate any custom API service or third-party platform',
      credentials_fields: [
        { name: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'Your API key or token' },
        { name: 'api_secret', label: 'API Secret', type: 'password', required: false, placeholder: 'API secret (if required)' },
        { name: 'api_url', label: 'API Base URL', type: 'url', required: true, placeholder: 'https://api.example.com' },
        { name: 'username', label: 'Username', type: 'text', required: false, placeholder: 'Username (if required)' },
      ],
      config_fields: [
        { name: 'auth_type', label: 'Authentication Type', type: 'select', required: false, options: [
          { value: 'bearer', label: 'Bearer Token' },
          { value: 'basic', label: 'Basic Auth' },
          { value: 'api_key', label: 'API Key' },
          { value: 'custom', label: 'Custom' }
        ]},
        { name: 'timeout', label: 'Timeout (ms)', type: 'number', required: false, placeholder: '30000' },
        { name: 'max_retries', label: 'Max Retries', type: 'number', required: false, placeholder: '3' },
        { name: 'rate_limit', label: 'Rate Limit (req/min)', type: 'number', required: false, placeholder: '60' },
      ],
    },
    // Beem Africa Payment
    {
      integration_name: 'BEEM_PAYMENT',
      integration_type: 'payment',
      provider_name: 'Beem Africa',
      icon: 'CreditCard',
      description: 'Accept payments via Beem Africa (Tanzania, Kenya, Uganda)',
      credentials_fields: [
        { name: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'Your Beem API Key' },
        { name: 'secret_key', label: 'Secret Key', type: 'password', required: true, placeholder: 'Your Beem Secret Key' },
        { name: 'webhook_secret', label: 'Webhook Secret', type: 'password', required: false, placeholder: 'Webhook verification secret' },
      ],
      config_fields: [
        { name: 'api_url', label: 'API URL', type: 'url', required: true, placeholder: 'https://beem.africa/api' },
        { name: 'currency', label: 'Default Currency', type: 'select', required: true, options: [
          { value: 'TZS', label: 'TZS - Tanzanian Shilling' },
          { value: 'KES', label: 'KES - Kenyan Shilling' },
          { value: 'UGX', label: 'UGX - Ugandan Shilling' },
          { value: 'USD', label: 'USD - US Dollar' }
        ]},
        { name: 'callback_url', label: 'Callback URL', type: 'url', required: false, placeholder: 'https://yourapp.com/api/beem/callback' },
        { name: 'auto_return', label: 'Auto Return After Payment', type: 'checkbox', required: false },
        { name: 'checkout_timeout', label: 'Checkout Timeout (minutes)', type: 'number', required: false, placeholder: '30' },
      ],
    },
    // ZenoPay Payment
    {
      integration_name: 'ZENOPAY_PAYMENT',
      integration_type: 'payment',
      provider_name: 'ZenoPay',
      icon: 'CreditCard',
      description: 'Accept mobile money payments via ZenoPay with USSD popup',
      credentials_fields: [
        { name: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'Your ZenoPay API Key' },
        { name: 'merchant_id', label: 'Merchant ID', type: 'text', required: true, placeholder: 'Your ZenoPay Merchant ID' },
        { name: 'webhook_secret', label: 'Webhook Secret', type: 'password', required: false, placeholder: 'Webhook verification secret' },
      ],
      config_fields: [
        { name: 'api_url', label: 'API Base URL', type: 'url', required: true, placeholder: 'http://localhost:8000 (or production URL)' },
        { name: 'callback_url', label: 'Callback URL', type: 'url', required: false, placeholder: 'https://yourapp.com/api/zenopay/callback' },
        { name: 'enable_ussd_popup', label: 'Enable USSD Popup', type: 'checkbox', required: false },
        { name: 'ussd_timeout', label: 'USSD Popup Timeout (seconds)', type: 'number', required: false, placeholder: '300' },
        { name: 'retry_attempts', label: 'Retry Attempts', type: 'number', required: false, placeholder: '3' },
      ],
    },
    // Google Maps
    {
      integration_name: 'GOOGLE_MAPS',
      integration_type: 'maps',
      provider_name: 'Google Maps',
      icon: 'MapPin',
      description: 'Location services, maps, and geofencing for attendance tracking',
      credentials_fields: [
        { name: 'api_key', label: 'Google Maps API Key', type: 'password', required: true, placeholder: 'AIzaSy...' },
      ],
      config_fields: [
        { name: 'default_lat', label: 'Default Latitude', type: 'text', required: false, placeholder: '-6.7924' },
        { name: 'default_lng', label: 'Default Longitude', type: 'text', required: false, placeholder: '39.2083' },
        { name: 'default_zoom', label: 'Default Zoom Level', type: 'number', required: false, placeholder: '13' },
        { name: 'enable_geofencing', label: 'Enable Geofencing', type: 'checkbox', required: false },
        { name: 'geofence_radius', label: 'Geofence Radius (meters)', type: 'number', required: false, placeholder: '100' },
      ],
    },
    // Hostinger File Storage
    {
      integration_name: 'HOSTINGER_STORAGE',
      integration_type: 'storage',
      provider_name: 'Hostinger',
      icon: 'HardDrive',
      description: 'Cloud file storage for logos, images, and documents via Hostinger',
      credentials_fields: [
        { name: 'api_token', label: 'Hostinger API Token', type: 'password', required: true, placeholder: 'Your Hostinger API token' },
        { name: 'domain', label: 'Domain', type: 'text', required: true, placeholder: 'yourdomain.com' },
      ],
      config_fields: [
        { name: 'api_endpoint', label: 'API Endpoint', type: 'url', required: false, placeholder: 'https://api.hostinger.com/v1' },
        { name: 'default_path', label: 'Default Upload Path', type: 'text', required: false, placeholder: '/uploads' },
        { name: 'max_file_size', label: 'Max File Size (MB)', type: 'number', required: false, placeholder: '10' },
        { name: 'allowed_types', label: 'Allowed File Types', type: 'text', required: false, placeholder: 'jpg,png,pdf,doc' },
        { name: 'auto_optimize', label: 'Auto-Optimize Images', type: 'checkbox', required: false },
      ],
    },
  ];
}

