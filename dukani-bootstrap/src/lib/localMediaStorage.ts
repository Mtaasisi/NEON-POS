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

  // Track missing media to avoid repeated warnings
  private static readonly missingMediaCache = new Set<string>();

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
    const startTime = performance.now();
    console.log('🔍 [DEBUG] localMediaStorage.uploadMedia() called');
    try {
      console.log('📤 [DEBUG] Upload parameters:', { 
        name: file.name, 
        type: file.type, 
        size: file.size,
        sizeInMB: (file.size / 1024 / 1024).toFixed(2),
        folder,
        timestamp: new Date().toISOString()
      });

      // Validate file
      console.log('✅ [DEBUG] Validating file...');
      const validation = this.validateFile(file);
      console.log('✅ [DEBUG] Validation result:', validation);
      if (!validation.valid) {
        console.error('❌ [DEBUG] File validation failed:', validation.error);
        return { success: false, error: validation.error };
      }

      // Generate relative path
      console.log('📁 [DEBUG] Generating safe filename...');
      const relativePath = this.generateSafeFileName(file.name, folder);
      const fullPath = `${this.MEDIA_BASE_PATH}/${relativePath}`;
      console.log('📁 [DEBUG] Generated paths:', {
        relativePath,
        fullPath,
        storageKey: `${this.STORAGE_KEY_PREFIX}${relativePath}`
      });

      // Convert file to base64 for storage
      console.log('🔄 [DEBUG] Converting file to base64...');
      const base64Start = performance.now();
      const base64Data = await this.fileToBase64(file);
      const base64Duration = (performance.now() - base64Start).toFixed(2);
      console.log('🔄 [DEBUG] Base64 conversion completed in', base64Duration, 'ms');
      console.log('🔄 [DEBUG] Base64 data length:', base64Data.length, 'characters');
      
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

      console.log('💾 [DEBUG] Storing in localStorage...');
      console.log('💾 [DEBUG] Storage key:', storageKey);
      console.log('💾 [DEBUG] Media data size:', JSON.stringify(mediaData).length, 'characters');
      
      const storageStart = performance.now();
      localStorage.setItem(storageKey, JSON.stringify(mediaData));
      const storageDuration = (performance.now() - storageStart).toFixed(2);
      
      console.log('💾 [DEBUG] localStorage.setItem() completed in', storageDuration, 'ms');
      console.log('✅ [DEBUG] Media stored locally with key:', storageKey);
      
      // Check localStorage size
      let totalSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          totalSize += localStorage.getItem(key)?.length || 0;
        }
      }
      console.log('📊 [DEBUG] Total localStorage size:', (totalSize / 1024 / 1024).toFixed(2), 'MB');

      const totalDuration = (performance.now() - startTime).toFixed(2);
      console.log('✅ [DEBUG] uploadMedia() completed successfully in', totalDuration, 'ms');

      return {
        success: true,
        relativePath: relativePath,
        fullUrl: base64Data // For immediate display
      };

    } catch (error: any) {
      const duration = (performance.now() - startTime).toFixed(2);
      console.error('❌ [DEBUG] Local upload error after', duration, 'ms:', error);
      console.error('❌ [DEBUG] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return {
        success: false,
        error: error.message || 'Upload failed'
      };
    }
  }

  /**
   * Retrieve media from local storage
   */
  static getMedia(relativePath: string, silent: boolean = false): string | null {
    console.log('🔍 [DEBUG] localMediaStorage.getMedia() called', { relativePath, silent });
    try {
      const storageKey = `${this.STORAGE_KEY_PREFIX}${relativePath}`;
      console.log('🔑 [DEBUG] Storage key:', storageKey);
      
      const getItemStart = performance.now();
      const stored = localStorage.getItem(storageKey);
      const getItemDuration = (performance.now() - getItemStart).toFixed(2);
      console.log('📥 [DEBUG] localStorage.getItem() completed in', getItemDuration, 'ms');
      
      if (!stored) {
        // Only warn once per missing media file to avoid console spam
        if (!silent && !this.missingMediaCache.has(relativePath)) {
          this.missingMediaCache.add(relativePath);
          console.warn('⚠️ [DEBUG] Media not found in local storage:', relativePath);
          console.warn('⚠️ [DEBUG] Storage key:', storageKey);
        } else if (!silent) {
          console.log('ℹ️ [DEBUG] Media not found (already warned):', relativePath);
        }
        return null;
      }

      // Media found, remove from missing cache if it was there
      this.missingMediaCache.delete(relativePath);
      console.log('✅ [DEBUG] Media found in localStorage, parsing...');
      
      const parseStart = performance.now();
      const mediaData = JSON.parse(stored);
      const parseDuration = (performance.now() - parseStart).toFixed(2);
      console.log('✅ [DEBUG] JSON.parse() completed in', parseDuration, 'ms');
      console.log('📦 [DEBUG] Media data:', {
        fileName: mediaData.fileName,
        mimeType: mediaData.mimeType,
        size: mediaData.size,
        folder: mediaData.folder,
        base64Length: mediaData.base64?.length || 0
      });
      
      return mediaData.base64;
    } catch (error: any) {
      if (!silent) {
        console.error('❌ [DEBUG] Error retrieving media:', error);
        console.error('❌ [DEBUG] Error details:', {
          message: error.message,
          stack: error.stack,
          relativePath
        });
      }
      return null;
    }
  }

  /**
   * Get full URL for display (can be base64 or relative path)
   */
  static getMediaUrl(relativePath: string, silent: boolean = false): string {
    console.log('🔍 [DEBUG] localMediaStorage.getMediaUrl() called', { relativePath, silent });
    
    // First try to get from localStorage
    const base64 = this.getMedia(relativePath, silent);
    if (base64) {
      console.log('✅ [DEBUG] Found in localStorage, returning base64 URL');
      return base64;
    }

    // Fallback to relative path (for files actually in public folder)
    // Note: This may not exist, but we return it anyway for the error handler to deal with
    const fallbackUrl = `${this.MEDIA_BASE_PATH}/${relativePath}`;
    console.log('⚠️ [DEBUG] Not found in localStorage, returning fallback URL:', fallbackUrl);
    return fallbackUrl;
  }

  /**
   * Delete media from local storage
   */
  static deleteMedia(relativePath: string): LocalMediaUploadResult {
    console.log('🔍 [DEBUG] localMediaStorage.deleteMedia() called', { relativePath });
    try {
      const storageKey = `${this.STORAGE_KEY_PREFIX}${relativePath}`;
      console.log('🔑 [DEBUG] Storage key to delete:', storageKey);
      
      // Check if item exists before deleting
      const exists = localStorage.getItem(storageKey) !== null;
      console.log('🔍 [DEBUG] Item exists in localStorage:', exists);
      
      if (exists) {
        const deleteStart = performance.now();
        localStorage.removeItem(storageKey);
        const deleteDuration = (performance.now() - deleteStart).toFixed(2);
        console.log('🗑️ [DEBUG] localStorage.removeItem() completed in', deleteDuration, 'ms');
        console.log('✅ [DEBUG] Media deleted from local storage:', relativePath);
      } else {
        console.log('⚠️ [DEBUG] Item not found in localStorage, deletion skipped');
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('❌ [DEBUG] Delete error:', error);
      console.error('❌ [DEBUG] Error details:', {
        message: error.message,
        stack: error.stack,
        relativePath
      });
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

