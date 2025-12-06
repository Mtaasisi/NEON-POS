/**
 * Image Storage Service
 * Handles image file storage in the public/images folder
 * 
 * Images are stored as physical files in public/images/
 * Database stores only the filename (e.g., "food1.jpg")
 * When rendering, construct full path: /images/food1.jpg
 */

export interface ImageUploadResult {
  success: boolean;
  filename?: string;
  path?: string; // e.g., "images/food1.jpg"
  error?: string;
}

export class ImageStorageService {
  private static readonly IMAGES_BASE_PATH = '/images';
  private static readonly MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB for WhatsApp
  private static readonly ALLOWED_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ];

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
        error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF'
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
  private static generateSafeFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const fileExtension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    const baseName = originalName
      .split('.')[0]
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toLowerCase()
      .substring(0, 50);
    
    return `${baseName}-${timestamp}-${randomId}.${fileExtension}`;
  }

  /**
   * Upload image file to public/images folder via API
   */
  static async uploadImage(file: File): Promise<ImageUploadResult> {
    try {
      console.log('📤 Uploading image to /images folder:', {
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
      const filename = this.generateSafeFileName(file.name);
      const path = `images/${filename}`;

      // Upload via API endpoint
      const formData = new FormData();
      formData.append('image', file);
      formData.append('filename', filename);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log('✅ Image uploaded successfully:', path);
      
      return {
        success: true,
        filename: filename,
        path: path
      };

    } catch (error: any) {
      console.error('❌ Image upload error:', error);
      return {
        success: false,
        error: error.message || 'Upload failed'
      };
    }
  }

  /**
   * Get full URL for an image from its filename or path
   */
  static getImageUrl(filenameOrPath: string): string {
    // If already a full path starting with /images, return as is
    if (filenameOrPath.startsWith('/images/')) {
      return filenameOrPath;
    }

    // If it's just a filename, construct the path
    if (!filenameOrPath.includes('/')) {
      return `${this.IMAGES_BASE_PATH}/${filenameOrPath}`;
    }

    // If it's a relative path like "images/food1.jpg", add leading slash
    if (filenameOrPath.startsWith('images/')) {
      return `/${filenameOrPath}`;
    }

    // Default: assume it's a filename
    return `${this.IMAGES_BASE_PATH}/${filenameOrPath}`;
  }

  /**
   * Delete image file via API
   */
  static async deleteImage(filename: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/delete-image', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Delete failed');
      }

      console.log('✅ Image deleted successfully:', filename);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Image delete error:', error);
      return {
        success: false,
        error: error.message || 'Delete failed'
      };
    }
  }
}

export const imageStorage = ImageStorageService;
