// WhatsApp Service using WasenderAPI
import { supabase } from '../lib/supabaseClient';
import { updateIntegrationUsage } from '../lib/integrationsApi';
class WhatsAppService {
    apiKey = null;
    apiUrl = 'https://wasenderapi.com/api';
    sessionId = null;
    initialized = false;
    initializationPromise = null;
    static hasWarnedAboutConfig = false;
    constructor() {
        this.initializationPromise = this.initializeService();
    }
    async initializeService() {
        try {
            console.debug('🔧 Initializing WhatsApp service from integrations...');
            const timeoutMs = 15000;
            const { getIntegration } = await import('../lib/integrationsApi');
            const integrationPromise = getIntegration('WHATSAPP_WASENDER');
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('WhatsApp initialization timeout')), timeoutMs));
            const integration = await Promise.race([integrationPromise, timeoutPromise]);
            if (!integration || !integration.is_enabled) {
                console.debug('ℹ️ WhatsApp integration not configured. WhatsApp features will be disabled until configured in Admin Settings → Integrations');
                this.initialized = true;
                return;
            }
            // Set credentials from integrations
            this.apiKey = integration.credentials?.api_key || integration.credentials?.bearer_token || null;
            this.sessionId = integration.credentials?.session_id || integration.credentials?.whatsapp_session || null;
            // Set API URL from config
            this.apiUrl = integration.config?.api_url || 'https://wasenderapi.com/api';
            console.debug('✅ WhatsApp credentials loaded from integrations');
            console.debug('🔑 API Key:', this.apiKey ? '✅ Configured' : '❌ Missing');
            console.debug('📱 Session ID:', this.sessionId ? '✅ Configured' : '❌ Missing');
            console.debug('🌐 API URL:', this.apiUrl ? '✅ Configured' : '❌ Missing');
            if (!this.apiKey || !this.sessionId) {
                console.debug('ℹ️ WhatsApp service not fully configured. WhatsApp sending will fail until configured in Admin Settings → Integrations');
            }
            else {
                console.debug('✅ WhatsApp service initialized successfully');
            }
            this.initialized = true;
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            if (errorMsg.includes('timeout')) {
                console.debug('ℹ️ WhatsApp service initialization timed out (normal during cold starts) - will retry on first use');
            }
            else {
                console.warn('❌ WhatsApp service configuration error:', errorMsg);
            }
            this.initialized = true;
        }
    }
    async ensureInitialized() {
        if (!this.initialized && this.initializationPromise) {
            await this.initializationPromise;
        }
    }
    /**
     * Send WhatsApp text message
     */
    async sendMessage(phone, message, options) {
        try {
            await this.ensureInitialized();
            if (!this.apiKey || !this.sessionId) {
                if (!WhatsAppService.hasWarnedAboutConfig && (import.meta.env.DEV || import.meta.env.MODE === 'development')) {
                    console.warn('⚠️ WhatsApp provider not configured. Configure WhatsApp WasenderAPI in Admin Settings → Integrations.');
                    WhatsAppService.hasWarnedAboutConfig = true;
                }
                return {
                    success: false,
                    error: 'WhatsApp provider not configured. Configure WhatsApp WasenderAPI in Admin Settings → Integrations.'
                };
            }
            // Validate and format phone number
            const validation = this.validatePhoneNumberSync(phone);
            if (!validation.valid) {
                console.error('❌ Phone validation failed:', validation.error);
                return {
                    success: false,
                    error: `Invalid phone number: ${validation.error}`
                };
            }
            const formattedPhone = validation.formatted;
            // Determine message type
            const messageType = options?.message_type || 'text';
            let result;
            switch (messageType) {
                case 'text':
                    result = await this.sendTextMessage(formattedPhone, message, options);
                    break;
                case 'image':
                    result = await this.sendImageMessage(formattedPhone, message, options);
                    break;
                case 'video':
                    result = await this.sendVideoMessage(formattedPhone, message, options);
                    break;
                case 'document':
                    result = await this.sendDocumentMessage(formattedPhone, message, options);
                    break;
                case 'audio':
                    result = await this.sendAudioMessage(formattedPhone, message, options);
                    break;
                case 'location':
                    result = await this.sendLocationMessage(formattedPhone, options);
                    break;
                case 'contact':
                    result = await this.sendContactMessage(formattedPhone, options);
                    break;
                case 'poll':
                    result = await this.sendPollMessage(formattedPhone, options);
                    break;
                default:
                    result = await this.sendTextMessage(formattedPhone, message, options);
            }
            // Track usage in integrations (non-blocking)
            updateIntegrationUsage('WHATSAPP_WASENDER', result.success).catch(err => console.warn('Could not update integration usage:', err));
            // Log the WhatsApp message
            const logData = {
                recipient_phone: formattedPhone,
                message: message || options?.caption || '',
                message_type: messageType,
                status: result.success ? 'sent' : 'failed',
                sent_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                message_id: result.message_id,
                media_url: options?.media_url,
                session_id: options?.session_id || null // Track which session was used
            };
            if (result.error) {
                logData.error_message = result.error;
            }
            const { data: log, error: logError } = await supabase
                .from('whatsapp_logs')
                .insert(logData)
                .select()
                .single();
            if (logError) {
                console.error('Error logging WhatsApp message:', logError);
            }
            return {
                success: result.success,
                error: result.error,
                log_id: log?.id,
                message_id: result.message_id
            };
        }
        catch (error) {
            console.error('WhatsApp send error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return { success: false, error: errorMessage };
        }
    }
    /**
     * Retry helper with exponential backoff for rate limiting
     */
    async retryWithBackoff(fn, maxRetries = 3, initialDelay = 5000, context = 'API call') {
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error;
                // Check if it's a rate limit error (429)
                const isRateLimitError = error.status === 429 ||
                    error.statusCode === 429 ||
                    (error.message && (error.message.includes('429') ||
                        error.message.includes('rate limit') ||
                        error.message.includes('too many') ||
                        error.message.includes('account protection')));
                // Don't retry for non-rate-limit errors
                if (!isRateLimitError || attempt >= maxRetries) {
                    throw error;
                }
                // Calculate exponential backoff delay: 5s, 10s, 20s, 40s...
                const delay = initialDelay * Math.pow(2, attempt);
                const jitter = Math.random() * 1000; // Add 0-1s random jitter
                const totalDelay = delay + jitter;
                console.warn(`⚠️ Rate limit hit for ${context}. Retry ${attempt + 1}/${maxRetries} after ${(totalDelay / 1000).toFixed(1)}s...`);
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, totalDelay));
            }
        }
        throw lastError;
    }
    /**
     * Send text message with retry logic
     */
    async sendTextMessage(phone, message, options) {
        // Format phone number for WasenderAPI (needs to be in international format)
        // WasenderAPI expects phone in format: 255XXXXXXXXX (country code + number, no +)
        const formattedPhone = phone.startsWith('+') ? phone.substring(1) : phone;
        try {
            // Use retry logic with exponential backoff
            return await this.retryWithBackoff(async () => {
                // WasenderAPI uses /api/send-message endpoint
                const url = `${this.apiUrl}/send-message`;
                const payload = {
                    session: this.sessionId,
                    to: formattedPhone,
                    text: message
                };
                // Add quoted message if replying (WasenderAPI format)
                if (options?.quoted_message_id) {
                    payload.quotedMessageId = options.quoted_message_id;
                }
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    let errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
                    let errorType = 'unknown';
                    // Provide more helpful error messages for common issues
                    if (errorMessage.includes('JID does not exist') || errorMessage.includes('not_on_whatsapp')) {
                        errorType = 'not_on_whatsapp';
                        // Extract the phone that was attempted
                        const attemptedPhone = formattedPhone;
                        const countryCode = attemptedPhone.substring(0, 3);
                        const mobilePrefix = attemptedPhone.length >= 5 ? attemptedPhone.substring(3, 5) : '';
                        // Build more specific error based on country code
                        let specificReasons = [];
                        if (countryCode === '255') {
                            // Tanzania-specific validation
                            const validPrefixes = ['71', '72', '73', '74', '75', '76', '77', '78', '65', '68', '69', '62', '61'];
                            if (!validPrefixes.includes(mobilePrefix)) {
                                specificReasons.push(`• Invalid mobile prefix "${mobilePrefix}" - Tanzania uses: ${validPrefixes.slice(0, 5).join(', ')}, etc.`);
                            }
                            specificReasons.push(`• Number not registered on WhatsApp`);
                            specificReasons.push(`• Landline number (WhatsApp only works on mobile)`);
                            specificReasons.push(`• Inactive or deactivated number`);
                        }
                        else {
                            specificReasons.push(`• Number not registered on WhatsApp`);
                            specificReasons.push(`• Wrong country code (sent: ${countryCode})`);
                            specificReasons.push(`• Number format incorrect`);
                            specificReasons.push(`• Inactive or deactivated number`);
                        }
                        errorMessage = `Phone: ${attemptedPhone}\n` +
                            `Status: Not on WhatsApp ❌\n\n` +
                            `Possible reasons:\n${specificReasons.join('\n')}\n\n` +
                            `💡 Tips:\n` +
                            `• Verify the number is correct\n` +
                            `• Check it's a mobile number (not landline)\n` +
                            `• Confirm WhatsApp is installed and active\n` +
                            `• For Tanzania: Use prefixes 71X-78X, 65X, 68X, 69X`;
                    }
                    else if (errorMessage.includes('rate limit') || errorMessage.includes('too many') || errorMessage.includes('account protection')) {
                        errorType = 'rate_limit';
                        errorMessage = `⚠️ Rate limit exceeded. ${errorMessage}`;
                    }
                    else if (response.status === 422) {
                        errorType = 'invalid_format';
                        errorMessage = `❌ Invalid request: ${errorMessage}.\n\nPhone sent: ${formattedPhone}\nCheck format: [CountryCode][Number] without +, spaces, or dashes`;
                    }
                    else if (response.status === 401 || response.status === 403) {
                        errorType = 'authentication';
                        errorMessage = `🔐 Authentication error: ${errorMessage}.\nCheck your API key and session ID in Admin Settings → Integrations`;
                    }
                    console.error('❌ WhatsApp API error:', {
                        errorType: errorType,
                        originalPhone: phone,
                        formattedPhone: formattedPhone,
                        status: response.status,
                        error: errorMessage,
                        fullErrorData: errorData
                    });
                    // Throw error with status and type for retry logic
                    const error = new Error(errorMessage);
                    error.status = response.status;
                    error.statusCode = response.status;
                    error.errorType = errorType;
                    throw error;
                }
                const data = await response.json();
                return {
                    success: true,
                    message_id: data.messageId || data.id
                };
            }, 3, 5000, `sendTextMessage(${formattedPhone})`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Network error';
            console.error('❌ WhatsApp send exception:', errorMessage);
            return { success: false, error: errorMessage };
        }
    }
    /**
     * Generic media message sender with retry logic
     */
    async sendMediaMessage(phone, mediaType, caption, options) {
        const formattedPhone = phone.startsWith('+') ? phone.substring(1) : phone;
        try {
            if (!options?.media_url) {
                return { success: false, error: `Media URL is required for ${mediaType} messages` };
            }
            return await this.retryWithBackoff(async () => {
                const url = `${this.apiUrl}/send-message`;
                const finalCaption = caption || options.caption || '';
                const payload = {
                    session: this.sessionId,
                    to: formattedPhone
                };
                // Set media URL based on type
                switch (mediaType) {
                    case 'image':
                        payload.imageUrl = options.media_url;
                        break;
                    case 'video':
                        payload.videoUrl = options.media_url;
                        break;
                    case 'document':
                        payload.documentUrl = options.media_url;
                        break;
                    case 'audio':
                        payload.audioUrl = options.media_url;
                        break;
                }
                // Add text/caption if provided
                if (finalCaption) {
                    payload.text = finalCaption;
                }
                // Add viewOnce option if specified (for image/video)
                if (options.viewOnce && (mediaType === 'image' || mediaType === 'video')) {
                    payload.viewOnce = true;
                }
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
                    const error = new Error(errorMessage);
                    error.status = response.status;
                    error.statusCode = response.status;
                    throw error;
                }
                const data = await response.json();
                return {
                    success: true,
                    message_id: data.messageId || data.id
                };
            }, 3, 5000, `send${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}(${formattedPhone})`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Network error';
            console.error(`❌ WhatsApp ${mediaType} send exception:`, errorMessage);
            return { success: false, error: errorMessage };
        }
    }
    /**
     * Send image message
     */
    async sendImageMessage(phone, caption, options) {
        return this.sendMediaMessage(phone, 'image', caption, options);
    }
    /**
     * Send video message
     */
    async sendVideoMessage(phone, caption, options) {
        return this.sendMediaMessage(phone, 'video', caption, options);
    }
    /**
     * Send document message
     */
    async sendDocumentMessage(phone, caption, options) {
        return this.sendMediaMessage(phone, 'document', caption, options);
    }
    /**
     * Send audio message
     */
    async sendAudioMessage(phone, caption, options) {
        return this.sendMediaMessage(phone, 'audio', caption, options);
    }
    /**
     * Send location message
     */
    async sendLocationMessage(phone, options) {
        const formattedPhone = phone.startsWith('+') ? phone.substring(1) : phone;
        try {
            if (!options?.location) {
                return { success: false, error: 'Location data is required for location messages' };
            }
            return await this.retryWithBackoff(async () => {
                const url = `${this.apiUrl}/send-message`;
                const payload = {
                    session: this.sessionId,
                    to: formattedPhone,
                    location: {
                        latitude: options.location.latitude,
                        longitude: options.location.longitude,
                        name: options.location.name || '',
                        address: options.location.address || ''
                    }
                };
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
                    const error = new Error(errorMessage);
                    error.status = response.status;
                    error.statusCode = response.status;
                    throw error;
                }
                const data = await response.json();
                return {
                    success: true,
                    message_id: data.messageId || data.id
                };
            }, 3, 5000, `sendLocation(${formattedPhone})`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Network error';
            console.error('❌ WhatsApp location send exception:', errorMessage);
            return { success: false, error: errorMessage };
        }
    }
    /**
     * Send contact card message
     */
    async sendContactMessage(phone, options) {
        const formattedPhone = phone.startsWith('+') ? phone.substring(1) : phone;
        try {
            if (!options?.contact) {
                return { success: false, error: 'Contact data is required for contact messages' };
            }
            return await this.retryWithBackoff(async () => {
                const url = `${this.apiUrl}/send-message`;
                const payload = {
                    session: this.sessionId,
                    to: formattedPhone,
                    contact: {
                        name: options.contact.name,
                        phone: options.contact.phone
                    }
                };
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
                    const error = new Error(errorMessage);
                    error.status = response.status;
                    error.statusCode = response.status;
                    throw error;
                }
                const data = await response.json();
                return {
                    success: true,
                    message_id: data.messageId || data.id
                };
            }, 3, 5000, `sendContact(${formattedPhone})`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Network error';
            console.error('❌ WhatsApp contact send exception:', errorMessage);
            return { success: false, error: errorMessage };
        }
    }
    /**
     * Send poll message
     */
    async sendPollMessage(phone, options) {
        const formattedPhone = phone.startsWith('+') ? phone.substring(1) : phone;
        try {
            if (!options?.pollName || !options?.pollOptions || options.pollOptions.length < 2) {
                return { success: false, error: 'Poll name and at least 2 options are required for poll messages' };
            }
            return await this.retryWithBackoff(async () => {
                const url = `${this.apiUrl}/send-message`;
                // WasenderAPI expects poll as a nested object with 'question' and 'multiSelect'
                const payload = {
                    session: this.sessionId,
                    to: formattedPhone,
                    poll: {
                        question: options.pollName,
                        options: options.pollOptions,
                        multiSelect: options.allowMultipleAnswers || false
                    }
                };
                console.log('📤 Sending poll message with payload:', JSON.stringify(payload, null, 2));
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('❌ Poll message failed:', {
                        status: response.status,
                        statusText: response.statusText,
                        errorData: errorData,
                        sentPayload: payload
                    });
                    // More detailed error message
                    let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
                    if (errorData.message) {
                        errorMsg = errorData.message;
                    }
                    if (errorData.errors) {
                        const errorDetails = JSON.stringify(errorData.errors);
                        errorMsg += ` - ${errorDetails}`;
                    }
                    const error = new Error(errorMsg);
                    error.status = response.status;
                    error.statusCode = response.status;
                    throw error;
                }
                const data = await response.json();
                console.log('✅ Poll message sent successfully:', data);
                return {
                    success: true,
                    message_id: data.messageId || data.id
                };
            }, 3, 5000, `sendPoll(${formattedPhone})`);
        }
        catch (error) {
            console.error('❌ Poll message exception:', error);
            const errorMessage = error instanceof Error ? error.message : 'Network error';
            return { success: false, error: errorMessage };
        }
    }
    /**
     * Format phone number for WhatsApp (remove + and ensure proper format)
     */
    formatPhoneNumber(phone) {
        if (!phone || typeof phone !== 'string') {
            throw new Error('Invalid phone number: Phone number is required');
        }
        // Remove all non-digit characters except +
        let cleaned = phone.replace(/[^\d+]/g, '');
        // Remove + if present
        cleaned = cleaned.replace(/^\+/, '');
        // Validate that we have some digits
        if (!cleaned || cleaned.length < 9) {
            throw new Error(`Invalid phone number: Too short (${cleaned.length} digits)`);
        }
        // If starts with 0, replace with country code (Tanzania: 255)
        if (cleaned.startsWith('0')) {
            cleaned = '255' + cleaned.substring(1);
        }
        // If doesn't start with country code, assume Tanzania (255)
        // But only if it looks like a local number (9-10 digits)
        if (!cleaned.match(/^[1-9]\d{10,14}$/) && cleaned.length >= 9 && cleaned.length <= 10) {
            cleaned = '255' + cleaned;
        }
        // Final validation: phone should be 10-15 digits (international format)
        if (cleaned.length < 10 || cleaned.length > 15) {
            throw new Error(`Invalid phone number format: ${phone} (cleaned: ${cleaned}, ${cleaned.length} digits)`);
        }
        // Additional validation for Tanzania numbers (255)
        if (cleaned.startsWith('255')) {
            // Tanzania mobile numbers should be 12 digits total (255 + 9 digits)
            if (cleaned.length !== 12) {
                throw new Error(`Invalid Tanzania number length: ${cleaned} (expected 12 digits, got ${cleaned.length})`);
            }
            // Check for valid Tanzania mobile prefixes
            const mobilePrefix = cleaned.substring(3, 5); // Get XX from 255XX
            const validPrefixes = ['71', '72', '73', '74', '75', '76', '77', '78', '65', '68', '69', '62', '61'];
            if (!validPrefixes.includes(mobilePrefix)) {
                console.warn(`⚠️ Unusual Tanzania mobile prefix: ${mobilePrefix} (number: ${cleaned}). Valid prefixes: ${validPrefixes.join(', ')}`);
                console.warn(`   This number may not be registered on WhatsApp or may be a landline.`);
            }
        }
        return cleaned;
    }
    /**
     * Validate phone number before sending (public method)
     */
    async validatePhoneNumber(phone) {
        try {
            const formatted = this.formatPhoneNumber(phone);
            // Additional validation: Check if it looks like a valid international number
            if (!formatted.match(/^[1-9]\d{9,14}$/)) {
                return {
                    valid: false,
                    error: `Phone number doesn't match international format: ${formatted}`
                };
            }
            return { valid: true, formatted };
        }
        catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Invalid phone number format'
            };
        }
    }
    /**
     * Validate phone number before sending (private helper)
     */
    validatePhoneNumberSync(phone) {
        try {
            const formatted = this.formatPhoneNumber(phone);
            // Additional validation: Check if it looks like a valid international number
            if (!formatted.match(/^[1-9]\d{9,14}$/)) {
                return {
                    valid: false,
                    error: `Phone number doesn't match international format: ${formatted}`
                };
            }
            return { valid: true, formatted };
        }
        catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Invalid phone number format'
            };
        }
    }
    /**
     * Get WhatsApp logs
     */
    async getWhatsAppLogs(filters) {
        try {
            let query = supabase
                .from('whatsapp_logs')
                .select('*')
                .order('created_at', { ascending: false });
            if (filters?.search) {
                query = query.or(`recipient_phone.ilike.%${filters.search}%,message.ilike.%${filters.search}%`);
            }
            if (filters?.status) {
                query = query.eq('status', filters.status);
            }
            const { data, error } = await query;
            if (error) {
                console.error('Error fetching WhatsApp logs:', error);
                return [];
            }
            return data || [];
        }
        catch (error) {
            console.error('Error fetching WhatsApp logs:', error);
            return [];
        }
    }
    /**
     * Get WhatsApp statistics
     */
    async getWhatsAppStats() {
        try {
            const { data } = await supabase
                .from('whatsapp_logs')
                .select('status');
            if (!data)
                return { total: 0, sent: 0, failed: 0, pending: 0, delivered: 0, read: 0 };
            return {
                total: data.length,
                sent: data.filter(log => log.status === 'sent').length,
                failed: data.filter(log => log.status === 'failed').length,
                pending: data.filter(log => log.status === 'pending').length,
                delivered: data.filter(log => log.status === 'delivered').length,
                read: data.filter(log => log.status === 'read').length,
            };
        }
        catch (error) {
            console.error('Error fetching WhatsApp stats:', error);
            return { total: 0, sent: 0, failed: 0, pending: 0, delivered: 0, read: 0 };
        }
    }
    /**
     * Configure webhook URL for receiving WhatsApp events
     * @param webhookUrl - Your server's webhook endpoint URL (e.g., https://yourdomain.com/api/whatsapp/webhook)
     * @param events - Array of events to subscribe to
     */
    async configureWebhook(webhookUrl, events = [
        'messages.received',
        'messages.upsert',
        'messages.update',
        'messages.reaction',
        'session.status',
        'call.received',
        'poll.results'
    ]) {
        try {
            await this.ensureInitialized();
            if (!this.sessionId) {
                return { success: false, error: 'Session ID not configured' };
            }
            // Update session with webhook configuration
            // This is done via PUT /api/whatsapp-sessions/{session}
            const url = `${this.apiUrl}/whatsapp-sessions/${this.sessionId}`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    webhook_url: webhookUrl,
                    webhook_events: events,
                    webhook_enabled: true
                })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    success: false,
                    error: errorData.message || `HTTP ${response.status}: ${response.statusText}`
                };
            }
            const data = await response.json();
            console.log('✅ Webhook configured successfully:', webhookUrl);
            return { success: true };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to configure webhook';
            return { success: false, error: errorMessage };
        }
    }
    /**
     * Get incoming messages (received from customers)
     */
    async getIncomingMessages(filters) {
        try {
            let query = supabase
                .from('whatsapp_incoming_messages')
                .select('*, customers(name, phone, whatsapp)')
                .order('created_at', { ascending: false });
            if (filters?.customer_id) {
                query = query.eq('customer_id', filters.customer_id);
            }
            if (filters?.unread_only) {
                query = query.eq('is_read', false);
            }
            if (filters?.limit) {
                query = query.limit(filters.limit);
            }
            const { data, error } = await query;
            if (error) {
                console.error('Error fetching incoming messages:', error);
                return [];
            }
            return data || [];
        }
        catch (error) {
            console.error('Error fetching incoming messages:', error);
            return [];
        }
    }
    /**
     * Mark incoming message as read
     */
    async markMessageAsRead(messageId) {
        try {
            const { error } = await supabase
                .from('whatsapp_incoming_messages')
                .update({ is_read: true })
                .eq('id', messageId);
            return !error;
        }
        catch (error) {
            console.error('Error marking message as read:', error);
            return false;
        }
    }
    /**
     * Send presence update (typing indicator)
     * @param phone - Phone number to send presence to
     * @param state - Presence state: 'composing' (typing), 'paused', 'available'
     */
    async sendPresenceUpdate(phone, state = 'composing') {
        try {
            await this.ensureInitialized();
            if (!this.apiKey || !this.sessionId) {
                return { success: false, error: 'WhatsApp not configured' };
            }
            const formattedPhone = phone.startsWith('+') ? phone.substring(1) : phone;
            const response = await fetch(`${this.apiUrl}/send-presence-update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    session: this.sessionId,
                    to: formattedPhone,
                    state: state
                })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    success: false,
                    error: errorData.message || `HTTP ${response.status}: ${response.statusText}`
                };
            }
            return { success: true };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Network error';
            return { success: false, error: errorMessage };
        }
    }
    /**
     * Check if a phone number is on WhatsApp
     */
    async isOnWhatsApp(phone) {
        try {
            await this.ensureInitialized();
            if (!this.apiKey) {
                return { exists: false, error: 'API key not configured' };
            }
            const formattedPhone = this.formatPhoneNumber(phone);
            const url = `${this.apiUrl}/on-whatsapp/${formattedPhone}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            if (!response.ok) {
                return { exists: false, error: `HTTP ${response.status}` };
            }
            const data = await response.json();
            return { exists: data.exists || false };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Network error';
            return { exists: false, error: errorMessage };
        }
    }
    /**
     * Get message delivery status
     */
    async getMessageStatus(messageId) {
        try {
            await this.ensureInitialized();
            if (!this.apiKey) {
                return { error: 'API key not configured' };
            }
            const url = `${this.apiUrl}/messages/${messageId}/info`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            if (!response.ok) {
                return { error: `HTTP ${response.status}` };
            }
            const data = await response.json();
            return data;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Network error';
            return { error: errorMessage };
        }
    }
}
// Create singleton instance
const whatsappService = new WhatsAppService();
export default whatsappService;
//# sourceMappingURL=whatsappService.js.map