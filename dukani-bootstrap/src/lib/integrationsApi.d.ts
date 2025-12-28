/**
 * Integrations API
 * Manage all third-party integrations and API credentials
 */
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
        options?: {
            value: string;
            label: string;
        }[];
        placeholder?: string;
    }[];
}
/**
 * Get all integrations
 */
export declare function getAllIntegrations(): Promise<Integration[]>;
/**
 * Get integrations by type
 */
export declare function getIntegrationsByType(type: string): Promise<Integration[]>;
/**
 * Get specific integration by name
 */
export declare function getIntegration(integrationName: string): Promise<Integration | null>;
/**
 * Get only enabled integrations
 */
export declare function getEnabledIntegrations(): Promise<Integration[]>;
/**
 * Get credentials for a specific integration
 */
export declare function getCredentials(integrationName: string): Promise<Record<string, any> | null>;
/**
 * Create new integration
 */
export declare function createIntegration(integration: Partial<Integration>): Promise<Integration>;
/**
 * Update integration
 */
export declare function updateIntegration(integrationName: string, updates: Partial<Integration>): Promise<Integration>;
/**
 * Upsert integration (create or update)
 */
export declare function upsertIntegration(integration: Integration): Promise<Integration>;
/**
 * Delete integration
 */
export declare function deleteIntegration(integrationName: string): Promise<void>;
/**
 * Enable/Disable integration
 */
export declare function toggleIntegration(integrationName: string, enabled: boolean): Promise<void>;
/**
 * Update usage statistics
 */
export declare function updateIntegrationUsage(integrationName: string, success: boolean): Promise<void>;
/**
 * Get integration templates with field definitions
 */
export declare function getIntegrationTemplates(): IntegrationTemplate[];
//# sourceMappingURL=integrationsApi.d.ts.map