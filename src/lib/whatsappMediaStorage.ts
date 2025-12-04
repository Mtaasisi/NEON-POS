/**
 * WhatsApp Media Storage Service
 * Handles media uploads for WhatsApp messages using local storage
 */

export interface WhatsAppMediaUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class WhatsAppMediaStorageService {
  private static readonly MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB for WhatsApp
  private static readonly ALLOWED_TYPES = [
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
  private static readonly BASE_UPLOAD_PATH = '/public/uploads/whatsapp-media';
  private static readonly BASE_URL_PATH = '/uploads/whatsapp-media';

  /**
   * Check if we're in development mode
   */
  static isDevelopment(): boolean {
    return import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  }

  /**
   * Validate file before upload
   */
  private static validateFile(file: File): { valid: boolean; error?: string } {
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
  private static generateSafeFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    const baseName = originalName.split('.')[0].replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().substring(0, 20);
    
    return `whatsapp-${timestamp}-${baseName}-${randomId}.${fileExtension}`;
  }

  /**
   * Convert file to base64 for development mode
   */
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Upload WhatsApp media file
   */
  static async uploadMedia(file: File): Promise<WhatsAppMediaUploadResult> {
    try {
      console.log('📤 Uploading WhatsApp media:', { 
        name: file.name, 
        type: file.type, 
        size: file.size 
      });

      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Generate safe filename
      const safeFileName = this.generateSafeFileName(file.name);
      
      // In development mode, use base64
      if (this.isDevelopment()) {
        console.log('🔧 Development mode: Using base64 data URL');
        try {
          const base64Url = await this.fileToBase64(file);
          console.log('✅ Media converted to base64 successfully');
          
          return {
            success: true,
            url: base64Url
          };
        } catch (error: any) {
          console.error('❌ Failed to convert to base64:', error);
          return {
            success: false,
            error: 'Failed to process media file in development mode'
          };
        }
      }

      // Production mode: Upload via Node.js server API (proxies to WasenderAPI)
      console.log('🚀 Production mode: Uploading to server API');
      
      const formData = new FormData();
      formData.append('file', file);

      // Use the existing Node.js server upload endpoint
      const uploadUrl = '/api/upload';
      console.log('📡 Uploading to:', uploadUrl);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      console.log('📡 Upload response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Upload failed:', errorText);
        return {
          success: false,
          error: `Upload failed: ${response.status} ${response.statusText} - ${errorText}`
        };
      }

      const result = await response.json();
      console.log('📡 Upload result:', result);

      // WasenderAPI returns the media URL in different formats
      const mediaUrl = result.url || result.data?.url || result.mediaUrl;
      
      if (!mediaUrl) {
        console.error('❌ No media URL in response:', result);
        return { 
          success: false, 
          error: result.error || result.message || 'No media URL returned from server' 
        };
      }

      console.log('✅ Media uploaded successfully:', mediaUrl);
      
      return {
        success: true,
        url: mediaUrl
      };

    } catch (error: any) {
      console.error('❌ Upload error:', error);
      return {
        success: false,
        error: error.message || 'Upload failed'
      };
    }
  }

  /**
   * Delete WhatsApp media file
   */
  static async deleteMedia(fileUrl: string): Promise<WhatsAppMediaUploadResult> {
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

    } catch (error: any) {
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
  static getMediaType(mimeType: string): 'image' | 'video' | 'document' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'document';
  }
}

export const whatsappMediaStorage = WhatsAppMediaStorageService;

