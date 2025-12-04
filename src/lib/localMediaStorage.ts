/**
 * Local Media Storage Service
 * Handles media file storage in the local build instead of external services
 */

export interface LocalMediaUploadResult {
  success: boolean;
  relativePath?: string;
  error?: string;
  fullUrl?: string;
}

export class LocalMediaStorageService {
  private static readonly MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB for WhatsApp
  private static readonly ALLOWED_TYPES = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/3gpp',
    'video/webm',
    'audio/mpeg',
    'audio/ogg',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  // Base path for media in public folder
  private static readonly MEDIA_BASE_PATH = '/media/whatsapp';
  private static readonly STORAGE_KEY_PREFIX = 'local-media:';

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
        error: `Invalid file type. Allowed: images, videos, audio, PDF, Excel files` 
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
   * Generate safe filename
   */
  private static generateSafeFileName(originalName: string, folder: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const fileExtension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    const baseName = originalName.split('.')[0]
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toLowerCase()
      .substring(0, 30);
    
    return `${folder}/${baseName}-${timestamp}-${randomId}.${fileExtension}`;
  }

  /**
   * Convert file to base64 data URL for local storage
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
   * Upload media file to local storage (localStorage for web app)
   * In production build, these will be stored in browser's localStorage
   * For actual deployment with persistent files, you'd need a backend endpoint
   */
  static async uploadMedia(file: File, folder: string = 'General'): Promise<LocalMediaUploadResult> {
    try {
      console.log('📤 Uploading media locally:', { 
        name: file.name, 
        type: file.type, 
        size: file.size,
        folder 
      });

      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Generate relative path
      const relativePath = this.generateSafeFileName(file.name, folder);
      const fullPath = `${this.MEDIA_BASE_PATH}/${relativePath}`;

      console.log('📁 Generated path:', fullPath);

      // Convert file to base64 for storage
      const base64Data = await this.fileToBase64(file);
      
      // Store in localStorage with full metadata
      const storageKey = `${this.STORAGE_KEY_PREFIX}${relativePath}`;
      const mediaData = {
        base64: base64Data,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        folder
      };

      localStorage.setItem(storageKey, JSON.stringify(mediaData));
      console.log('✅ Media stored locally with key:', storageKey);

      return {
        success: true,
        relativePath: relativePath,
        fullUrl: base64Data // For immediate display
      };

    } catch (error: any) {
      console.error('❌ Local upload error:', error);
      return {
        success: false,
        error: error.message || 'Upload failed'
      };
    }
  }

  /**
   * Retrieve media from local storage
   */
  static getMedia(relativePath: string): string | null {
    try {
      const storageKey = `${this.STORAGE_KEY_PREFIX}${relativePath}`;
      const stored = localStorage.getItem(storageKey);
      
      if (!stored) {
        console.warn('⚠️ Media not found in local storage:', relativePath);
        return null;
      }

      const mediaData = JSON.parse(stored);
      return mediaData.base64;
    } catch (error) {
      console.error('❌ Error retrieving media:', error);
      return null;
    }
  }

  /**
   * Get full URL for display (can be base64 or relative path)
   */
  static getMediaUrl(relativePath: string): string {
    // First try to get from localStorage
    const base64 = this.getMedia(relativePath);
    if (base64) {
      return base64;
    }

    // Fallback to relative path (for files actually in public folder)
    return `${this.MEDIA_BASE_PATH}/${relativePath}`;
  }

  /**
   * Delete media from local storage
   */
  static deleteMedia(relativePath: string): LocalMediaUploadResult {
    try {
      const storageKey = `${this.STORAGE_KEY_PREFIX}${relativePath}`;
      localStorage.removeItem(storageKey);
      console.log('🗑️ Media deleted from local storage:', relativePath);
      
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
   * Get all stored media keys
   */
  static getAllMediaKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.STORAGE_KEY_PREFIX)) {
        keys.push(key.replace(this.STORAGE_KEY_PREFIX, ''));
      }
    }
    return keys;
  }

  /**
   * Get media type category
   */
  static getMediaType(mimeType: string): 'image' | 'video' | 'document' | 'audio' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  }

  /**
   * Export all media data (for backup/migration)
   */
  static exportAllMedia(): { [key: string]: any } {
    const allMedia: { [key: string]: any } = {};
    const keys = this.getAllMediaKeys();
    
    keys.forEach(key => {
      const storageKey = `${this.STORAGE_KEY_PREFIX}${key}`;
      const data = localStorage.getItem(storageKey);
      if (data) {
        allMedia[key] = JSON.parse(data);
      }
    });
    
    return allMedia;
  }

  /**
   * Import media data (for restore/migration)
   */
  static importMedia(mediaData: { [key: string]: any }): number {
    let imported = 0;
    
    Object.entries(mediaData).forEach(([key, data]) => {
      try {
        const storageKey = `${this.STORAGE_KEY_PREFIX}${key}`;
        localStorage.setItem(storageKey, JSON.stringify(data));
        imported++;
      } catch (error) {
        console.error('Failed to import media:', key, error);
      }
    });
    
    console.log(`✅ Imported ${imported} media files`);
    return imported;
  }

  /**
   * Clear all media from local storage
   */
  static clearAllMedia(): number {
    const keys = this.getAllMediaKeys();
    keys.forEach(key => {
      const storageKey = `${this.STORAGE_KEY_PREFIX}${key}`;
      localStorage.removeItem(storageKey);
    });
    
    console.log(`🗑️ Cleared ${keys.length} media files from local storage`);
    return keys.length;
  }
}

export const localMediaStorage = LocalMediaStorageService;

