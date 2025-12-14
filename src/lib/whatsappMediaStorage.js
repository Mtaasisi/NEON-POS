/**
 * WhatsApp Media Storage Service
 * Handles media uploads for WhatsApp messages using local storage
 */
export class WhatsAppMediaStorageService {
    static MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB for WhatsApp
    static ALLOWED_TYPES = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
        'video/mp4',
        'video/3gpp',
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    // Base path for storing WhatsApp media on the hosting server
    static BASE_UPLOAD_PATH = '/public/uploads/whatsapp-media';
    static BASE_URL_PATH = '/uploads/whatsapp-media';
    /**
     * Check if we're in development mode
     */
    static isDevelopment() {
        return import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    }
    /**
     * Validate file before upload
     */
    static validateFile(file) {
        if (!file) {
            return { valid: false, error: 'No file provided' };
        }
        if (!this.ALLOWED_TYPES.includes(file.type)) {
            return {
                valid: false,
                error: `Invalid file type. Allowed: images, videos, PDF, Excel files`
            };
        }
        if (file.size > this.MAX_FILE_SIZE) {
            return {
                valid: false,
                error: `File too large. Maximum size: ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`
            };
        }
        return { valid: true };
    }
    /**
     * Generate safe filename for WhatsApp media
     */
    static generateSafeFileName(originalName) {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const fileExtension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
        const baseName = originalName.split('.')[0].replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().substring(0, 20);
        return `whatsapp-${timestamp}-${baseName}-${randomId}.${fileExtension}`;
    }
    /**
     * Convert file to base64 for development mode
     */
    static async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }
    /**
     * Upload WhatsApp media file
     */
    static async uploadMedia(file) {
        try {
            console.log('\n╔═══════════════════════════════════════════════╗');
            console.log('║    📤 WHATSAPP MEDIA UPLOAD - CLIENT         ║');
            console.log('╚═══════════════════════════════════════════════╝');
            console.log('📁 [FILE] Details:');
            console.log('   • Name:', file.name);
            console.log('   • Type:', file.type);
            console.log('   • Size:', file.size, 'bytes', `(${(file.size / 1024 / 1024).toFixed(2)}MB)`);
            console.log('   • Last Modified:', new Date(file.lastModified).toISOString());
            // Validate file
            console.log('\n🔍 [VALIDATION] Checking file...');
            const validation = this.validateFile(file);
            if (!validation.valid) {
                console.error('❌ [VALIDATION FAILED]', validation.error);
                return { success: false, error: validation.error };
            }
            console.log('✅ [VALIDATION] File is valid');
            // Generate safe filename
            const safeFileName = this.generateSafeFileName(file.name);
            console.log('📝 [FILENAME] Generated safe name:', safeFileName);
            // Try to upload to WasenderAPI via proxy endpoint
            console.log('\n🚀 [UPLOAD] Preparing to upload via proxy...');
            const formData = new FormData();
            formData.append('file', file);
            console.log('📦 [FORMDATA] Created FormData with file');
            // Get API key from integration settings
            let apiKey = '';
            try {
                console.log('🔑 [AUTH] Fetching WhatsApp API key from integrations...');
                const { getIntegration } = await import('../lib/integrationsApi');
                const integration = await getIntegration('WHATSAPP_WASENDER');
                apiKey = integration?.credentials?.api_key || integration?.credentials?.bearer_token || '';
                if (apiKey) {
                    console.log('✅ [AUTH] API key found:', apiKey.substring(0, 10) + '...');
                }
                else {
                    console.warn('⚠️ [AUTH] No API key found in integration settings');
                }
            }
            catch (error) {
                console.warn('⚠️ [AUTH] Could not get WhatsApp API key from integrations:', error);
            }
            // Use the WhatsApp upload proxy endpoint (proxies to WasenderAPI)
            const uploadUrl = '/api/whatsapp/upload-media';
            console.log('\n📡 [REQUEST] Sending to server proxy:');
            console.log('   URL:', uploadUrl);
            console.log('   Method: POST');
            const headers = {};
            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }
            console.log('   Headers:', JSON.stringify(headers, null, 2));
            console.log('   Body: FormData with file');
            const fetchStart = Date.now();
            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: headers,
                body: formData
            });
            const fetchDuration = Date.now() - fetchStart;
            console.log(`\n📡 [RESPONSE] Received (${fetchDuration}ms):`);
            console.log('   Status:', response.status, response.statusText);
            console.log('   Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
            if (!response.ok) {
                const errorText = await response.text();
                console.error('\n❌ [ERROR] Upload failed with status:', response.status);
                console.error('   Error response:', errorText);
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                    console.error('   Parsed error:', JSON.stringify(errorData, null, 2));
                }
                catch (e) {
                    console.error('   (Could not parse as JSON)');
                }
                // If upload failed, try base64 as fallback (for development/testing)
                if (this.isDevelopment()) {
                    console.log('\n⚠️ [FALLBACK] Trying base64 for development mode...');
                    try {
                        const base64Url = await this.fileToBase64(file);
                        console.log('✅ [SUCCESS] Using base64 data URL as fallback');
                        console.log('   Data URL length:', base64Url.length);
                        console.log('───────────────────────────────────────────────\n');
                        return {
                            success: true,
                            url: base64Url
                        };
                    }
                    catch (error) {
                        console.error('❌ [FALLBACK FAILED] Base64 conversion also failed:', error);
                    }
                }
                console.log('───────────────────────────────────────────────\n');
                return {
                    success: false,
                    error: `Upload failed: ${response.status} ${response.statusText}. Please configure WhatsApp WasenderAPI in Admin Settings → Integrations.`
                };
            }
            const resultText = await response.text();
            console.log('📥 [RESPONSE] Body:', resultText.substring(0, 500));
            const result = JSON.parse(resultText);
            console.log('📋 [PARSED] Result:', JSON.stringify(result, null, 2));
            // WasenderAPI returns the media URL in different formats
            // Raw binary uploads return 'publicUrl', multipart uploads return 'url'
            const mediaUrl = result.publicUrl || result.url || result.data?.url || result.mediaUrl || result.data?.mediaUrl;
            if (!mediaUrl) {
                console.error('\n❌ [ERROR] No media URL in response');
                console.error('   Full response:', result);
                // If no URL in response, try base64 as fallback (for development/testing)
                if (this.isDevelopment()) {
                    console.log('\n⚠️ [FALLBACK] Trying base64 for development mode...');
                    try {
                        const base64Url = await this.fileToBase64(file);
                        console.log('✅ [SUCCESS] Using base64 data URL as fallback');
                        console.log('   Data URL length:', base64Url.length);
                        console.log('───────────────────────────────────────────────\n');
                        return {
                            success: true,
                            url: base64Url
                        };
                    }
                    catch (error) {
                        console.error('❌ [FALLBACK FAILED] Base64 conversion also failed:', error);
                    }
                }
                console.log('───────────────────────────────────────────────\n');
                return {
                    success: false,
                    error: result.error || result.message || 'No media URL returned from server'
                };
            }
            console.log('\n✅ [SUCCESS] Media uploaded successfully!');
            console.log('   Media URL:', mediaUrl);
            console.log('   URL type:', mediaUrl.startsWith('http') ? 'HTTP URL' : mediaUrl.startsWith('data:') ? 'Base64 Data URL' : 'Unknown');
            console.log('───────────────────────────────────────────────\n');
            return {
                success: true,
                url: mediaUrl
            };
        }
        catch (error) {
            console.error('\n❌ [EXCEPTION] Upload error:', error);
            console.error('   Error message:', error.message);
            console.error('   Stack trace:', error.stack);
            console.log('───────────────────────────────────────────────\n');
            return {
                success: false,
                error: error.message || 'Upload failed'
            };
        }
    }
    /**
     * Delete WhatsApp media file
     */
    static async deleteMedia(fileUrl) {
        try {
            // In development mode with base64, nothing to delete
            if (this.isDevelopment() && fileUrl.startsWith('data:')) {
                console.log('🗑️ Development mode: base64 data, nothing to delete');
                return { success: true };
            }
            console.log('🗑️ Deleting media from server:', fileUrl);
            // Note: WasenderAPI uploaded files are typically managed by their platform
            // For now, we just mark as successful since these are temporary URLs
            // If you need to implement actual deletion, add a delete endpoint to server/api.mjs
            console.log('⚠️ Media deletion not implemented for WasenderAPI uploads');
            console.log('   Files are temporary and will be cleaned up by the API provider');
            return { success: true };
        }
        catch (error) {
            console.error('❌ Delete error:', error);
            return {
                success: false,
                error: error.message || 'Delete failed'
            };
        }
    }
    /**
     * Get media type category for WhatsApp
     */
    static getMediaType(mimeType) {
        if (mimeType.startsWith('image/'))
            return 'image';
        if (mimeType.startsWith('video/'))
            return 'video';
        return 'document';
    }
}
export const whatsappMediaStorage = WhatsAppMediaStorageService;
//# sourceMappingURL=whatsappMediaStorage.js.map