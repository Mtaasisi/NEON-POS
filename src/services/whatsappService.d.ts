export interface WhatsAppLog {
    id: string;
    recipient_phone: string;
    message: string;
    message_type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'location' | 'contact' | 'poll';
    status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending';
    error_message?: string;
    sent_at?: string;
    sent_by?: string;
    created_at: string;
    device_id?: string;
    customer_id?: string;
    message_id?: string;
    media_url?: string;
}
export interface WhatsAppMessageOptions {
    message_type?: 'text' | 'image' | 'video' | 'document' | 'audio' | 'location' | 'contact' | 'poll';
    media_url?: string;
    caption?: string;
    location?: {
        latitude: number;
        longitude: number;
        name?: string;
        address?: string;
    };
    contact?: {
        name: string;
        phone: string;
    };
    pollName?: string;
    pollOptions?: string[];
    allowMultipleAnswers?: boolean;
    quoted_message_id?: string;
    viewOnce?: boolean;
    session_id?: number;
    wasender_session_id?: number;
}
declare class WhatsAppService {
    private apiKey;
    private apiUrl;
    private sessionId;
    private initialized;
    private initializationPromise;
    private static hasWarnedAboutConfig;
    constructor();
    private initializeService;
    private ensureInitialized;
    /**
     * Send WhatsApp text message
     */
    sendMessage(phone: string, message: string, options?: WhatsAppMessageOptions): Promise<{
        success: boolean;
        error?: string;
        log_id?: string;
        message_id?: string;
    }>;
    /**
     * Send text message
     */
    private sendTextMessage;
    /**
     * Send image message
     */
    private sendImageMessage;
    /**
     * Send video message
     */
    private sendVideoMessage;
    /**
     * Send document message
     */
    private sendDocumentMessage;
    /**
     * Send audio message
     */
    private sendAudioMessage;
    /**
     * Send location message
     */
    private sendLocationMessage;
    /**
     * Send contact card message
     */
    private sendContactMessage;
    /**
     * Send poll message
     */
    private sendPollMessage;
    /**
     * Format phone number for WhatsApp (remove + and ensure proper format)
     */
    private formatPhoneNumber;
    /**
     * Get WhatsApp logs
     */
    getWhatsAppLogs(filters?: {
        search?: string;
        status?: string;
    }): Promise<WhatsAppLog[]>;
    /**
     * Get WhatsApp statistics
     */
    getWhatsAppStats(): Promise<{
        total: number;
        sent: number;
        failed: number;
        pending: number;
        delivered: number;
        read: number;
    }>;
    /**
     * Configure webhook URL for receiving WhatsApp events
     * @param webhookUrl - Your server's webhook endpoint URL (e.g., https://yourdomain.com/api/whatsapp/webhook)
     * @param events - Array of events to subscribe to
     */
    configureWebhook(webhookUrl: string, events?: string[]): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Get incoming messages (received from customers)
     */
    getIncomingMessages(filters?: {
        customer_id?: string;
        unread_only?: boolean;
        limit?: number;
    }): Promise<any[]>;
    /**
     * Mark incoming message as read
     */
    markMessageAsRead(messageId: string): Promise<boolean>;
    /**
     * Send presence update (typing indicator)
     * @param phone - Phone number to send presence to
     * @param state - Presence state: 'composing' (typing), 'paused', 'available'
     */
    sendPresenceUpdate(phone: string, state?: 'composing' | 'paused' | 'available'): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Check if a phone number is on WhatsApp
     */
    isOnWhatsApp(phone: string): Promise<{
        exists: boolean;
        error?: string;
    }>;
    /**
     * Get message delivery status
     */
    getMessageStatus(messageId: string): Promise<any>;
}
declare const whatsappService: WhatsAppService;
export default whatsappService;
//# sourceMappingURL=whatsappService.d.ts.map