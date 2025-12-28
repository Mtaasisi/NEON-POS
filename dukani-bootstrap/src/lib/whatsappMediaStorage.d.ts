/**
 * WhatsApp Media Storage Service
 * Handles media uploads for WhatsApp messages using local storage
 */
export interface WhatsAppMediaUploadResult {
    success: boolean;
    url?: string;
    error?: string;
}
export declare class WhatsAppMediaStorageService {
    private static readonly MAX_FILE_SIZE;
    private static readonly ALLOWED_TYPES;
    private static readonly BASE_UPLOAD_PATH;
    private static readonly BASE_URL_PATH;
    /**
     * Check if we're in development mode
     */
    static isDevelopment(): boolean;
    /**
     * Validate file before upload
     */
    private static validateFile;
    /**
     * Generate safe filename for WhatsApp media
     */
    private static generateSafeFileName;
    /**
     * Convert file to base64 for development mode
     */
    static fileToBase64(file: File): Promise<string>;
    /**
     * Upload WhatsApp media file
     */
    static uploadMedia(file: File): Promise<WhatsAppMediaUploadResult>;
    /**
     * Delete WhatsApp media file
     */
    static deleteMedia(fileUrl: string): Promise<WhatsAppMediaUploadResult>;
    /**
     * Get media type category for WhatsApp
     */
    static getMediaType(mimeType: string): 'image' | 'video' | 'document';
}
export declare const whatsappMediaStorage: typeof WhatsAppMediaStorageService;
//# sourceMappingURL=whatsappMediaStorage.d.ts.map