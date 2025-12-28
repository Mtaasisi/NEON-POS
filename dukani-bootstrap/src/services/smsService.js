// Enhanced SMS Service with AI Integration
import { supabase } from '../lib/supabaseClient';
import geminiService from './geminiService';
import { updateIntegrationUsage } from '../lib/integrationsApi';
class SMSService {
    apiKey = null;
    apiUrl = null;
    apiPassword = null;
    initialized = false;
    initializationPromise = null;
    static hasWarnedAboutConfig = false;
    constructor() {
        this.initializationPromise = this.initializeService();
    }
    async initializeService() {
        // Load SMS configuration from integrations
        try {
            // Use debug level for initialization message to reduce console noise
            console.debug('🔧 Initializing SMS service from integrations...');
            // Get full integration (not just credentials) to access config
            // Add timeout to prevent blocking app startup
            const { getIntegration } = await import('../lib/integrationsApi');
            // Wrap in a timeout promise to prevent blocking
            const timeoutMs = 15000; // 15 second timeout for initialization
            const integrationPromise = getIntegration('SMS_GATEWAY');
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('SMS initialization timeout')), timeoutMs));
            const integration = await Promise.race([integrationPromise, timeoutPromise]);
            if (!integration || !integration.is_enabled) {
                console.debug('ℹ️ SMS integration not configured. SMS features will be disabled until configured in Admin Settings → Integrations');
                this.initialized = true;
                return;
            }
            // Set credentials from integrations (credentials field)
            this.apiKey = integration.credentials?.api_key || null;
            this.apiPassword = integration.credentials?.api_password || integration.credentials?.api_secret || null;
            // Set API URL from config field (not credentials)
            this.apiUrl = integration.config?.api_url || 'https://mshastra.com/sendurl.aspx'; // Correct MShastra URL
            console.debug('✅ SMS credentials loaded from integrations');
            console.debug('🔑 API Key:', this.apiKey ? '✅ Configured' : '❌ Missing');
            console.debug('🌐 API URL:', this.apiUrl ? '✅ Configured' : '❌ Missing');
            console.debug('🔐 Password:', this.apiPassword ? '✅ Configured' : '❌ Missing');
            if (!this.apiKey || !this.apiUrl) {
                console.debug('ℹ️ SMS service not fully configured. SMS notifications will fail until configured in Admin Settings → Integrations');
            }
            else {
                console.debug('✅ SMS service initialized successfully');
            }
            this.initialized = true;
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            // Check if it's a timeout error
            if (errorMsg.includes('timeout')) {
                // Use debug level for timeout - this is expected during cold starts
                console.debug('ℹ️ SMS service initialization timed out (normal during cold starts) - will retry on first use');
            }
            else {
                // Only warn for actual errors, not timeouts
                console.warn('❌ SMS service configuration error:', errorMsg);
            }
            // Mark as initialized anyway to prevent blocking
            // The service will retry when actually needed
            this.initialized = true;
        }
    }
    /**
     * Ensure SMS service is initialized before use
     */
    async ensureInitialized() {
        if (!this.initialized && this.initializationPromise) {
            await this.initializationPromise;
        }
    }
    /**
     * Send SMS with AI enhancement
     */
    async sendSMS(phone, message, options) {
        try {
            // Ensure service is initialized
            await this.ensureInitialized();
            // AI enhancement if requested
            let enhancedMessage = message;
            let ai_enhanced = false;
            let personalization_data = null;
            if (options?.ai_enhanced) {
                const aiResult = await this.enhanceMessageWithAI(message, phone);
                if (aiResult.success) {
                    enhancedMessage = aiResult.enhanced_message;
                    ai_enhanced = true;
                    personalization_data = aiResult.personalization_data;
                }
            }
            // Send the SMS
            const result = await this.sendSMSToProvider(phone, enhancedMessage);
            // Track usage in integrations (non-blocking)
            updateIntegrationUsage('SMS_GATEWAY', result.success).catch(err => console.warn('Could not update integration usage:', err));
            // Log the SMS
            const logData = {
                recipient_phone: phone,
                message: enhancedMessage,
                status: result.success ? 'sent' : 'failed',
                sent_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            };
            // Only include error_message if it exists
            if (result.error) {
                logData.error_message = result.error;
            }
            const { data: log, error: logError } = await supabase
                .from('sms_logs')
                .insert(logData)
                .select()
                .single();
            if (logError) {
                console.error('Error logging SMS:', logError);
            }
            return {
                success: result.success,
                error: result.error,
                log_id: log?.id
            };
        }
        catch (error) {
            console.error('SMS send error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return { success: false, error: errorMessage };
        }
    }
    /**
     * Send bulk SMS with AI personalization
     */
    async sendBulkSMS(request) {
        const results = {
            success: true,
            sent: 0,
            failed: 0,
            errors: []
        };
        try {
            // AI analysis of the bulk campaign
            if (request.ai_enhanced) {
                const analysis = await this.analyzeBulkCampaign(request);
                console.log('AI Campaign Analysis:', analysis);
            }
            // Process each recipient
            for (const recipient of request.recipients) {
                try {
                    let personalizedMessage = request.message;
                    // Apply personalization if data is provided
                    if (request.personalization_data && request.personalization_data[recipient]) {
                        const customerData = request.personalization_data[recipient];
                        personalizedMessage = this.personalizeMessage(request.message, customerData);
                    }
                    // Send SMS
                    const result = await this.sendSMS(recipient, personalizedMessage, {
                        ai_enhanced: request.ai_enhanced
                    });
                    if (result.success) {
                        results.sent++;
                    }
                    else {
                        results.failed++;
                        results.errors.push(`${recipient}: ${result.error}`);
                    }
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                catch (error) {
                    results.failed++;
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    results.errors.push(`${recipient}: ${errorMessage}`);
                }
            }
            return results;
        }
        catch (error) {
            console.error('Bulk SMS error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return {
                success: false,
                sent: results.sent,
                failed: results.failed,
                errors: [...results.errors, errorMessage]
            };
        }
    }
    /**
     * Enhance message with AI
     */
    async enhanceMessageWithAI(message, phone) {
        try {
            // Get customer data if phone is provided
            let customerData = null;
            if (phone) {
                const { data: customer } = await supabase
                    .from('customers')
                    .select('*')
                    .eq('phone', phone)
                    .single();
                customerData = customer;
            }
            const prompt = `Enhance this SMS message for a device repair and sales business:

Original Message: "${message}"
${customerData ? `Customer Data: ${JSON.stringify(customerData, null, 2)}` : ''}

Requirements:
- Keep the core message intact
- Improve clarity and professionalism
- Add personalization if customer data is available
- Ensure it's under 160 characters
- Make it more engaging and actionable
- Use appropriate tone (friendly but professional)

Return only the enhanced message, no explanations.`;
            const response = await geminiService.chat([{ role: 'user', content: prompt }]);
            if (response.success && response.data) {
                return {
                    success: true,
                    enhanced_message: response.data.trim(),
                    personalization_data: customerData
                };
            }
        }
        catch (error) {
            console.error('AI enhancement error:', error);
        }
        return {
            success: false,
            enhanced_message: message
        };
    }
    /**
     * Analyze bulk SMS campaign with AI
     */
    async analyzeBulkCampaign(request) {
        try {
            const prompt = `Analyze this bulk SMS campaign for a device repair and sales business:

Message: "${request.message}"
Recipients: ${request.recipients.length} customers
${request.personalization_data ? `Personalization: Enabled` : 'Personalization: Disabled'}

Please analyze and provide:
1. Message quality score (0-1)
2. Suggested improvements
3. Personalization suggestions
4. Optimal send time recommendations
5. Customer segment insights

Respond in JSON format:
{
  "message_quality": 0.8,
  "suggested_improvements": ["Add call-to-action", "Include business name"],
  "personalization_suggestions": ["Use customer name", "Reference loyalty level"],
  "optimal_send_time": "10:00 AM - 2:00 PM",
  "customer_segment_insights": "This message targets..."
}`;
            const response = await geminiService.chat([{ role: 'user', content: prompt }]);
            if (response.success && response.data) {
                try {
                    return JSON.parse(response.data);
                }
                catch (parseError) {
                    console.error('Failed to parse AI analysis:', parseError);
                }
            }
        }
        catch (error) {
            console.error('AI campaign analysis error:', error);
        }
        return {
            message_quality: 0.5,
            suggested_improvements: [],
            personalization_suggestions: []
        };
    }
    /**
     * Personalize message with customer data
     */
    personalizeMessage(message, customerData) {
        let personalized = message;
        // Replace placeholders with customer data
        if (customerData.name) {
            personalized = personalized.replace(/{name}/g, customerData.name);
        }
        if (customerData.loyaltyLevel) {
            personalized = personalized.replace(/{loyaltyLevel}/g, customerData.loyaltyLevel);
        }
        if (customerData.totalSpent) {
            personalized = personalized.replace(/{totalSpent}/g, customerData.totalSpent.toString());
        }
        if (customerData.points) {
            personalized = personalized.replace(/{points}/g, customerData.points.toString());
        }
        return personalized;
    }
    /**
     * Send SMS to provider via backend proxy (to avoid CORS issues)
     */
    async sendSMSToProvider(phone, message) {
        // Ensure service is initialized
        await this.ensureInitialized();
        // ✅ ENHANCED: Quick health check before using cache
        const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
        if (isDevelopment && typeof window !== 'undefined') {
            const serverUnavailableKey = 'sms_proxy_server_unavailable';
            const serverUnavailable = localStorage.getItem(serverUnavailableKey);
            const lastCheck = serverUnavailable ? parseInt(serverUnavailable, 10) : 0;
            const timeSinceLastCheck = Date.now() - lastCheck;
            // If cache exists and is recent, do a quick health check first
            if (serverUnavailable && timeSinceLastCheck < 300000) {
                try {
                    // Quick health check with short timeout (2 seconds for more reliability)
                    const healthCheckUrl = 'http://localhost:8000/health';
                    const healthController = new AbortController();
                    const healthTimeout = setTimeout(() => healthController.abort(), 2000);
                    try {
                        const healthResponse = await fetch(healthCheckUrl, {
                            method: 'GET',
                            signal: healthController.signal,
                            // Add mode to handle CORS if needed
                            mode: 'cors',
                            cache: 'no-cache'
                        });
                        clearTimeout(healthTimeout);
                        if (healthResponse.ok) {
                            // Server is back online! Clear the cache
                            localStorage.removeItem(serverUnavailableKey);
                            console.log('✅ SMS proxy server is back online - cache cleared');
                            // Continue with SMS send attempt
                        }
                        else {
                            // Server responded but with error, still use cache
                            console.warn('⚠️ Health check returned non-OK status:', healthResponse.status);
                            return { success: false, error: 'SMS proxy server not running' };
                        }
                    }
                    catch (healthError) {
                        clearTimeout(healthTimeout);
                        // Check if it's a network error or timeout
                        const isNetworkError = healthError.name === 'AbortError' ||
                            healthError.message?.includes('Failed to fetch') ||
                            healthError.message?.includes('ERR_CONNECTION_REFUSED') ||
                            healthError.message?.includes('ECONNREFUSED') ||
                            healthError.message?.includes('NetworkError');
                        if (isNetworkError) {
                            // Network error means server is likely down - use cache
                            console.warn('⚠️ Health check failed - server appears to be down');
                            return { success: false, error: 'SMS proxy server not running' };
                        }
                        else {
                            // Other error - might be CORS or other issue, but server might be up
                            // Clear cache and try anyway
                            console.warn('⚠️ Health check had non-network error, clearing cache and trying anyway');
                            localStorage.removeItem(serverUnavailableKey);
                        }
                    }
                }
                catch (checkError) {
                    // Health check itself failed - be lenient and try anyway
                    console.warn('⚠️ Health check setup failed, trying SMS send anyway');
                    // Don't return early - let it try to send
                }
            }
        }
        // Only log debug info in development mode
        if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
            console.debug('🔍 SMS send attempt:', {
                phone,
                message: message.substring(0, 50) + '...',
                apiKey: this.apiKey ? '✅ Set' : '❌ Not Set',
                apiUrl: this.apiUrl ? '✅ Set' : '❌ Not Set',
                initialized: this.initialized
            });
        }
        if (!this.apiKey || !this.apiUrl) {
            // Only warn in development mode - suppress in production to avoid console noise
            if (!SMSService.hasWarnedAboutConfig && (import.meta.env.DEV || import.meta.env.MODE === 'development')) {
                console.warn('⚠️ SMS provider not configured. Configure SMS Gateway in Admin Settings → Integrations. Until configured, SMS sending will be simulated (logged only, not actually sent).');
                SMSService.hasWarnedAboutConfig = true;
            }
            return { success: false, error: 'SMS provider not configured. Messages will be logged but not sent. Configure SMS Gateway in Admin Settings → Integrations.' };
        }
        try {
            // For testing purposes, if using a test phone number, simulate success
            if (phone === '255700000000' || phone.startsWith('255700')) {
                console.log('🧪 Test SMS - simulating success for phone:', phone);
                return { success: true };
            }
            // Use backend proxy to avoid CORS issues
            // In production, use environment variable or current origin; in development, use localhost
            const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
            const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD;
            // Determine proxy URL based on environment
            let proxyUrl;
            if (import.meta.env.VITE_API_URL) {
                // Use explicit API URL if set
                proxyUrl = `${import.meta.env.VITE_API_URL}/api/sms-proxy`;
            }
            else if (isProduction && typeof window !== 'undefined') {
                // In production, use current origin if no explicit API URL is set
                proxyUrl = `${window.location.origin}/api/sms-proxy`;
            }
            else {
                // Development fallback to localhost
                proxyUrl = 'http://localhost:8000/api/sms-proxy';
            }
            const isLocalhostProxy = proxyUrl.includes('localhost') || proxyUrl.includes('127.0.0.1');
            // Note: Cache check is now done earlier with health check, so we proceed directly to the request
            // Only log in development mode
            if (isDevelopment) {
                console.debug('📱 SMS proxy URL:', proxyUrl);
                if (isLocalhostProxy) {
                    console.debug('ℹ️ Using localhost proxy - if server is not running, SMS will be skipped gracefully');
                    // Add helpful message about the expected error
                    console.debug('💡 Note: If you see "ERR_CONNECTION_REFUSED" in console, the SMS proxy server is not running. This is expected in development and SMS will be skipped.');
                }
            }
            // Get fresh credentials from integrations for all fields
            const { getIntegration } = await import('../lib/integrationsApi');
            const integration = await getIntegration('SMS_GATEWAY');
            const senderId = integration?.credentials?.sender_id || 'LATS POS';
            const apiUrl = integration?.config?.api_url || this.apiUrl || 'https://mshastra.com/sendurl.aspx';
            const apiKey = integration?.credentials?.api_key || this.apiKey;
            const apiPassword = integration?.credentials?.api_password || this.apiPassword;
            // Get config values (priority, country_code, timeout, max_retries)
            const priority = integration?.config?.priority || 'High';
            const countryCode = integration?.config?.country_code || 'ALL';
            const timeout = integration?.config?.timeout || 30000;
            const maxRetries = integration?.config?.max_retries || 3;
            let response;
            try {
                // ✅ FIX: Add shorter timeout for localhost in development to fail fast
                const timeoutMs = isLocalhostProxy && isDevelopment ? 2000 : 5000; // 2s for localhost, 5s for production
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
                try {
                    // ✅ FIX: Wrap fetch in Promise to better handle connection errors
                    // Use a wrapper that catches network errors before they propagate
                    const fetchPromise = fetch(proxyUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            phone,
                            message,
                            apiUrl: apiUrl,
                            apiKey: apiKey,
                            apiPassword: apiPassword,
                            senderId: senderId,
                            priority: priority,
                            countryCode: countryCode,
                            timeout: timeout,
                            maxRetries: maxRetries
                        }),
                        signal: controller.signal
                    }).catch((fetchError) => {
                        // Catch network errors immediately
                        // Note: Browser will still log the error, but we handle it gracefully
                        const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
                        const errorName = fetchError instanceof Error ? fetchError.name : '';
                        const isConnectionError = errorName === 'TypeError' ||
                            errorMessage.includes('Failed to fetch') ||
                            errorMessage.includes('ERR_CONNECTION_REFUSED') ||
                            errorMessage.includes('ECONNREFUSED') ||
                            errorMessage.includes('NetworkError') ||
                            errorMessage.includes('network') ||
                            errorMessage.includes('fetch');
                        if (isConnectionError) {
                            // Immediately cache the failure to prevent future attempts
                            if (isDevelopment && isLocalhostProxy && typeof window !== 'undefined') {
                                localStorage.setItem('sms_proxy_server_unavailable', Date.now().toString());
                            }
                            // Return a rejected promise with a specific error we can catch
                            return Promise.reject(new Error('SMS_PROXY_CONNECTION_ERROR'));
                        }
                        // Re-throw other errors
                        throw fetchError;
                    });
                    response = await Promise.race([
                        fetchPromise,
                        // Add a timeout promise that rejects with a specific error
                        new Promise((_, reject) => {
                            setTimeout(() => reject(new Error('SMS proxy timeout')), timeoutMs);
                        })
                    ]);
                    clearTimeout(timeoutId);
                }
                catch (fetchError) {
                    clearTimeout(timeoutId);
                    // Check if it was aborted due to timeout
                    if (fetchError.name === 'AbortError' || controller.signal.aborted || fetchError.message === 'SMS proxy timeout') {
                        // Timeout likely means connection refused or server not responding
                        // Don't log - this is expected when proxy server is not running
                        return { success: false, error: 'SMS proxy server not running' };
                    }
                    // ✅ FIX: Handle connection errors silently
                    const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
                    if (errorMessage === 'SMS_PROXY_CONNECTION_ERROR' ||
                        errorMessage.includes('Failed to fetch') ||
                        errorMessage.includes('ERR_CONNECTION_REFUSED') ||
                        errorMessage.includes('ECONNREFUSED') ||
                        errorMessage.includes('NetworkError')) {
                        // Mark server as unavailable in development to avoid repeated attempts
                        // Use localStorage for persistence across page refreshes
                        if (isDevelopment && isLocalhostProxy && typeof window !== 'undefined') {
                            localStorage.setItem('sms_proxy_server_unavailable', Date.now().toString());
                        }
                        // Silently handle - SMS proxy server not running is expected in some environments
                        // Don't log - browser already logged the network error
                        return { success: false, error: 'SMS proxy server not running' };
                    }
                    // Re-throw if it's not a connection error
                    throw fetchError;
                }
            }
            catch (fetchError) {
                // Fallback catch for any other errors
                const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
                const isConnectionError = errorMessage === 'SMS_PROXY_CONNECTION_ERROR' ||
                    errorMessage.includes('Failed to fetch') ||
                    errorMessage.includes('ERR_CONNECTION_REFUSED') ||
                    errorMessage.includes('ECONNREFUSED') ||
                    errorMessage.includes('NetworkError') ||
                    errorMessage.includes('network');
                if (isConnectionError) {
                    // Mark server as unavailable in development to avoid repeated attempts
                    if (isDevelopment && isLocalhostProxy && typeof window !== 'undefined') {
                        sessionStorage.setItem('sms_proxy_server_unavailable', Date.now().toString());
                    }
                    // Don't log - browser already logged the network error
                    return { success: false, error: 'SMS proxy server not running' };
                }
                throw fetchError;
            }
            // Only log in development mode
            if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
                console.log('🔍 DEBUG: Request payload:', {
                    phone,
                    message: message.substring(0, 50) + '...',
                    apiUrl: this.apiUrl,
                    apiKey: this.apiKey ? '✅ Set' : '❌ Not Set',
                    apiPassword: this.apiPassword ? '✅ Set' : '❌ Not Set',
                    senderId: senderId
                });
            }
            const result = await response.json();
            if (result.success) {
                // Clear the "server unavailable" cache since we successfully connected
                if (isDevelopment && isLocalhostProxy && typeof window !== 'undefined') {
                    localStorage.removeItem('sms_proxy_server_unavailable');
                }
                console.log('✅ SMS sent successfully via proxy');
                return { success: true };
            }
            else {
                console.error('📱 SMS Provider Error via proxy:', result.error);
                return { success: false, error: result.error || 'SMS sending failed' };
            }
        }
        catch (error) {
            // Check if it's a connection refused error (expected when proxy server is down)
            // Fetch errors can be TypeError (connection refused) or other network errors
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorString = String(error);
            const errorName = error instanceof Error ? error.name : '';
            const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
            const isConnectionError = errorMessage === 'SMS_PROXY_CONNECTION_ERROR' ||
                errorName === 'AbortError' ||
                errorName === 'TypeError' ||
                errorMessage.includes('Failed to fetch') ||
                errorMessage.includes('ERR_CONNECTION_REFUSED') ||
                errorMessage.includes('ECONNREFUSED') ||
                errorMessage.includes('NetworkError') ||
                errorMessage.includes('network') ||
                errorMessage.includes('fetch') ||
                errorString.includes('ERR_CONNECTION_REFUSED') ||
                errorString.includes('ECONNREFUSED') ||
                (error instanceof TypeError);
            if (isConnectionError) {
                // Mark server as unavailable in development to avoid repeated attempts
                if (isDevelopment && isLocalhostProxy && typeof window !== 'undefined') {
                    sessionStorage.setItem('sms_proxy_server_unavailable', Date.now().toString());
                }
                // ✅ FIX: Silently handle connection errors - SMS proxy server may not be running
                // Don't log as error - this is expected when proxy server isn't running
                // Note: Browser will still show network error in console (this is expected browser behavior)
                // The error is caught and handled gracefully, so it won't affect the sale process
                // We suppress our own logging to avoid duplicate error messages
                return { success: false, error: 'SMS proxy server not running' };
            }
            // Only log actual SMS provider errors, not connection errors
            if (isDevelopment) {
                console.warn('⚠️ SMS error (non-connection):', errorMessage);
            }
            return { success: false, error: `SMS error: ${errorMessage}` };
        }
    }
    /**
     * Get SMS logs with AI enhancement info
     */
    async getSMSLogs(filters) {
        try {
            let query = supabase
                .from('sms_logs')
                .select('*')
                .order('created_at', { ascending: false });
            if (filters?.search) {
                query = query.or(`recipient_phone.ilike.%${filters.search}%,message.ilike.%${filters.search}%`);
            }
            const { data, error } = await query;
            if (error) {
                console.error('Error fetching SMS logs:', error);
                return [];
            }
            return data || [];
        }
        catch (error) {
            console.error('Error fetching SMS logs:', error);
            return [];
        }
    }
    /**
     * Get SMS templates
     */
    async getTemplates() {
        try {
            const { data } = await supabase
                .from('communication_templates')
                .select('*')
                .eq('template_type', 'sms')
                .eq('is_active', true)
                .order('created_at', { ascending: false });
            return data || [];
        }
        catch (error) {
            console.error('Error fetching templates:', error);
            return [];
        }
    }
    /**
     * Get SMS statistics
     */
    async getSMSStats() {
        try {
            const { data } = await supabase
                .from('sms_logs')
                .select('status, created_at');
            if (!data)
                return { total: 0, sent: 0, failed: 0, pending: 0, delivered: 0, totalCost: 0 };
            const stats = {
                total: data.length,
                sent: data.filter(log => log.status === 'sent').length,
                failed: data.filter(log => log.status === 'failed').length,
                pending: data.filter(log => log.status === 'pending').length,
                delivered: data.filter(log => log.status === 'delivered').length,
                totalCost: data.length * 15 // Assuming 15 TZS per SMS
            };
            return stats;
        }
        catch (error) {
            console.error('Error fetching SMS stats:', error);
            return { total: 0, sent: 0, failed: 0, pending: 0, delivered: 0, totalCost: 0 };
        }
    }
    /**
     * Resend failed SMS
     */
    async resendSMS(logId) {
        try {
            // Get the original SMS log
            const { data: log } = await supabase
                .from('sms_logs')
                .select('*')
                .eq('id', logId)
                .single();
            if (!log) {
                return { success: false, error: 'SMS log not found' };
            }
            // ✅ FIX: Force check server availability before resending
            // This ensures we check if the server is available even if cache says it's not
            await this.checkServerAvailability();
            // Resend the SMS
            const result = await this.sendSMS(log.recipient_phone, log.message);
            // Update the log
            await supabase
                .from('sms_logs')
                .update({
                status: result.success ? 'sent' : 'failed',
                error_message: result.error,
                sent_at: new Date().toISOString()
            })
                .eq('id', logId);
            return result;
        }
        catch (error) {
            console.error('Resend SMS error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return { success: false, error: errorMessage };
        }
    }
    /**
     * Schedule SMS
     */
    async scheduleSMS(request) {
        try {
            const { data } = await supabase
                .from('scheduled_sms')
                .insert({
                recipients: request.recipients,
                message: request.message,
                template_id: request.template_id,
                variables: request.variables,
                ai_enhanced: request.ai_enhanced,
                personalization_data: request.personalization_data,
                scheduled_for: request.scheduledFor.toISOString(),
                created_by: request.created_by,
                status: 'pending'
            });
            return { success: true };
        }
        catch (error) {
            console.error('Schedule SMS error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return { success: false, error: errorMessage };
        }
    }
    /**
     * Log manual SMS message
     */
    async logManualSMS(data) {
        try {
            // Get customer phone number for logging
            const { data: customer, error: customerError } = await supabase
                .from('customers')
                .select('phone')
                .eq('id', data.customerId)
                .single();
            if (customerError) {
                console.error('Error fetching customer for SMS logging:', customerError);
                return false;
            }
            const { error } = await supabase
                .from('sms_logs')
                .insert({
                recipient_phone: customer?.phone || '',
                message: data.message,
                status: 'sent',
                sent_by: data.sentBy,
                device_id: data.deviceId,
                sent_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            });
            if (error) {
                console.error('Error logging manual SMS:', error);
                return false;
            }
            return true;
        }
        catch (error) {
            console.error('Error logging manual SMS:', error);
            return false;
        }
    }
    /**
     * Send device received SMS notification
     */
    async sendDeviceReceivedSMS(phone, customerName, deviceBrand, deviceModel, deviceId, issueDescription, customerId) {
        try {
            // Create the SMS message using the device received template
            const message = `✅ Tumepokea Kimepokelewa!

Hellow Mtaasisi ${customerName},

Habari njema! ${deviceBrand} ${deviceModel} yako imepokelewa na sasa iko katika foleni ya ukarabati wa Inauzwa.

📋 Namba ya Kumbukumbu: #${deviceId}
📅 Tarehe ya Kupokea: ${new Date().toLocaleDateString('sw-TZ')}
🔧 Tatizo: ${issueDescription}

Subiri ujumbe kupitia SMS kikiwa tayari!

Asante kwa kumtumaini Inauzwa 🚀`;
            // Send the SMS using the existing sendSMS method
            const result = await this.sendSMS(phone, message, { ai_enhanced: false });
            // Log additional device-specific information if SMS was sent successfully
            if (result.success && result.log_id) {
                try {
                    await supabase
                        .from('sms_logs')
                        .update({
                        device_id: deviceId
                    })
                        .eq('id', result.log_id);
                }
                catch (updateError) {
                    console.warn('Failed to update SMS log with device data:', updateError);
                }
            }
            return result;
        }
        catch (error) {
            console.error('Error sending device received SMS:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return { success: false, error: errorMessage };
        }
    }
    /**
     * Send device ready SMS notification
     */
    async sendDeviceReadySMS(phone, customerName, deviceBrand, deviceModel, deviceId, customerId) {
        try {
            // Create the SMS message using the device ready template
            const message = `🎉 Kifaa Chako Tayari!

Habari Mtaasisi ${customerName},

Habari njema! ${deviceBrand} ${deviceModel} yako imekamilika na tayari kuchukuliwa.

📋 Namba ya Kumbukumbu: #${deviceId}
✅ Tarehe ya Kukamilisha: ${new Date().toLocaleDateString('sw-TZ')}

Tafadhali uje kuchukua kifaa chako katika ofisi yetu ndani ya muda ili kuepuka usumbufu.

Asante kwa kumtumaini Inauzwa! 🚀`;
            // Send the SMS using the existing sendSMS method
            const result = await this.sendSMS(phone, message, { ai_enhanced: false });
            // Log additional device-specific information if SMS was sent successfully
            if (result.success && result.log_id) {
                try {
                    await supabase
                        .from('sms_logs')
                        .update({
                        device_id: deviceId
                    })
                        .eq('id', result.log_id);
                }
                catch (updateError) {
                    console.warn('Failed to update SMS log with device data:', updateError);
                }
            }
            return result;
        }
        catch (error) {
            console.error('Error sending device ready SMS:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return { success: false, error: errorMessage };
        }
    }
    /**
     * Send template SMS with variables
     */
    async sendTemplateSMS(phone, templateId, variables, customerId) {
        try {
            // Get template from database
            const { data: template, error: templateError } = await supabase
                .from('sms_templates')
                .select('*')
                .eq('id', templateId)
                .single();
            if (templateError || !template) {
                return { success: false, error: 'Template not found' };
            }
            // Replace variables in template content
            let message = template.content;
            Object.entries(variables).forEach(([key, value]) => {
                const placeholder = `{${key}}`;
                message = message.replace(new RegExp(placeholder, 'g'), value);
            });
            // Send the SMS using the existing sendSMS method
            const result = await this.sendSMS(phone, message, { ai_enhanced: false });
            // Log additional template information if SMS was sent successfully
            if (result.success && result.log_id) {
                try {
                    // Note: personalization_data field is not available in current schema
                    // Template information is already included in the message content
                    console.log('Template SMS sent successfully:', {
                        template_id: templateId,
                        template_name: template.name,
                        variables,
                        customer_id: customerId
                    });
                }
                catch (updateError) {
                    console.warn('Failed to log template SMS data:', updateError);
                }
            }
            return result;
        }
        catch (error) {
            console.error('Error sending template SMS:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return { success: false, error: errorMessage };
        }
    }
    /**
     * Clear SMS proxy server cache
     * Useful when you know the server is running but cache says it's not
     */
    clearServerCache() {
        if (typeof window !== 'undefined') {
            const serverUnavailableKey = 'sms_proxy_server_unavailable';
            localStorage.removeItem(serverUnavailableKey);
            console.log('✅ SMS proxy server cache cleared');
        }
    }
    /**
     * Check if SMS proxy server is available
     */
    async checkServerAvailability() {
        try {
            const healthCheckUrl = 'http://localhost:8000/health';
            const healthController = new AbortController();
            const healthTimeout = setTimeout(() => healthController.abort(), 2000);
            try {
                const healthResponse = await fetch(healthCheckUrl, {
                    method: 'GET',
                    signal: healthController.signal,
                    mode: 'cors',
                    cache: 'no-cache'
                });
                clearTimeout(healthTimeout);
                if (healthResponse.ok) {
                    // Server is available - clear any cache
                    this.clearServerCache();
                    return true;
                }
                return false;
            }
            catch (healthError) {
                clearTimeout(healthTimeout);
                return false;
            }
        }
        catch (error) {
            return false;
        }
    }
}
// Create singleton instance
const smsService = new SMSService();
// Export the logManualSMS function
const logManualSMS = async (data) => {
    return smsService.logManualSMS(data);
};
export { smsService, logManualSMS };
//# sourceMappingURL=smsService.js.map