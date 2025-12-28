export interface SMSLog {
    id: string;
    recipient_phone: string;
    message: string;
    status: 'sent' | 'delivered' | 'failed' | 'pending';
    error_message?: string;
    sent_at?: string;
    sent_by?: string;
    created_at: string;
    device_id?: string;
    cost?: number;
}
export interface SMSTemplate {
    id: string;
    title: string;
    content: string;
    variables: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
    ai_optimized?: boolean;
}
export interface BulkSMSRequest {
    recipients: string[];
    message: string;
    template_id?: string;
    variables?: Record<string, string>;
    ai_enhanced?: boolean;
    personalization_data?: any;
    scheduled_for?: Date;
    created_by?: string;
}
export interface AISMSAnalysis {
    message_quality: number;
    suggested_improvements: string[];
    personalization_suggestions: string[];
    optimal_send_time?: string;
    customer_segment_insights?: string;
}
declare class SMSService {
    private apiKey;
    private apiUrl;
    private apiPassword;
    private initialized;
    private initializationPromise;
    private static hasWarnedAboutConfig;
    constructor();
    private initializeService;
    /**
     * Ensure SMS service is initialized before use
     */
    private ensureInitialized;
    /**
     * Send SMS with AI enhancement
     */
    sendSMS(phone: string, message: string, options?: {
        ai_enhanced?: boolean;
    }): Promise<{
        success: boolean;
        error?: string;
        log_id?: string;
    }>;
    /**
     * Send bulk SMS with AI personalization
     */
    sendBulkSMS(request: BulkSMSRequest): Promise<{
        success: boolean;
        sent: number;
        failed: number;
        errors: string[];
    }>;
    /**
     * Enhance message with AI
     */
    private enhanceMessageWithAI;
    /**
     * Analyze bulk SMS campaign with AI
     */
    private analyzeBulkCampaign;
    /**
     * Personalize message with customer data
     */
    private personalizeMessage;
    /**
     * Send SMS to provider via backend proxy (to avoid CORS issues)
     */
    private sendSMSToProvider;
    /**
     * Get SMS logs with AI enhancement info
     */
    getSMSLogs(filters?: {
        search?: string;
    }): Promise<SMSLog[]>;
    /**
     * Get SMS templates
     */
    getTemplates(): Promise<SMSTemplate[]>;
    /**
     * Get SMS statistics
     */
    getSMSStats(): Promise<{
        total: number;
        sent: number;
        failed: number;
        pending: number;
        delivered: number;
        totalCost: number;
    }>;
    /**
     * Resend failed SMS
     */
    resendSMS(logId: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Schedule SMS
     */
    scheduleSMS(request: BulkSMSRequest & {
        scheduledFor: Date;
    }): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Log manual SMS message
     */
    logManualSMS(data: {
        deviceId: string;
        customerId: string;
        sentBy: string;
        message: string;
    }): Promise<boolean>;
    /**
     * Send device received SMS notification
     */
    sendDeviceReceivedSMS(phone: string, customerName: string, deviceBrand: string, deviceModel: string, deviceId: string, issueDescription: string, customerId: string): Promise<{
        success: boolean;
        error?: string;
        log_id?: string;
    }>;
    /**
     * Send device ready SMS notification
     */
    sendDeviceReadySMS(phone: string, customerName: string, deviceBrand: string, deviceModel: string, deviceId: string, customerId: string): Promise<{
        success: boolean;
        error?: string;
        log_id?: string;
    }>;
    /**
     * Send template SMS with variables
     */
    sendTemplateSMS(phone: string, templateId: string, variables: Record<string, string>, customerId?: string): Promise<{
        success: boolean;
        error?: string;
        log_id?: string;
    }>;
    /**
     * Clear SMS proxy server cache
     * Useful when you know the server is running but cache says it's not
     */
    clearServerCache(): void;
    /**
     * Check if SMS proxy server is available
     */
    checkServerAvailability(): Promise<boolean>;
}
declare const smsService: SMSService;
declare const logManualSMS: (data: {
    deviceId: string;
    customerId: string;
    sentBy: string;
    message: string;
}) => Promise<boolean>;
export { smsService, logManualSMS };
//# sourceMappingURL=smsService.d.ts.map