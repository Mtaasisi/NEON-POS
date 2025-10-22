// Import the main Supabase client and use it for uploads
import { supabase } from './supabaseClient';
import { LocalProductImageStorageService } from './localProductImageStorage';
import { EnhancedImageUploadService } from './enhancedImageUpload';

// Use the main Supabase client for uploads to ensure proper authentication
const uploadSupabase = supabase;

export interface UploadedImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isPrimary: boolean;
  uploadedAt: string;
}

export interface UploadResult {
  success: boolean;
  image?: UploadedImage;
  error?: string;
}

export class ImageUploadService {
  // Development mode storage for temporary images
  private static devImageStorage: Map<string, UploadedImage[]> = new Map();
  
  // Cache for product images to reduce API calls
  private static imageCache = new Map<string, { images: UploadedImage[]; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_TYPES = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif'
  ];

  /**
   * Convert PNG with transparent background to white background
   */
  private static async convertPngToWhiteBackground(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Create canvas with image dimensions
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // Fill with white background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw the image on top of white background
          ctx.drawImage(img, 0, 0);
          
          // Convert canvas to blob
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to convert canvas to blob'));
              return;
            }
            
            // Create a new file from the blob
            const newFile = new File([blob], file.name, {
              type: 'image/png',
              lastModified: Date.now()
            });
            
            resolve(newFile);
          }, 'image/png', 0.95);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Upload a single image to hosting storage
   */
  static async uploadImage(
    file: File,
    productId: string,
    userId: string | null,
    isPrimary: boolean = false
  ): Promise<UploadResult> {
    try {
      console.log('🔍 DEBUG: ImageUploadService.uploadImage called');
      console.log('🔍 DEBUG: Parameters:', { productId, userId, isPrimary });
      console.log('🔍 DEBUG: File info:', { name: file.name, size: file.size, type: file.type });

      // Convert PNG to white background if needed
      let processedFile = file;
      if (file.type === 'image/png') {
        console.log('🎨 Converting PNG transparent background to white...');
        try {
          processedFile = await this.convertPngToWhiteBackground(file);
          console.log('✅ PNG background converted to white successfully');
        } catch (error) {
          console.warn('⚠️ Failed to convert PNG background, using original file:', error);
          // Continue with original file if conversion fails
        }
      }

      // Validate inputs
      if (!file) {
        console.error('❌ DEBUG: No file provided');
        return { success: false, error: 'No file provided' };
      }
      if (!productId) {
        console.error('❌ DEBUG: Product ID is required');
        return { success: false, error: 'Product ID is required' };
      }
      if (!userId) {
        console.error('❌ DEBUG: User ID is required');
        return { success: false, error: 'User ID is required' };
      }

      console.log('✅ DEBUG: Input validation passed');

      // Validate file (use processedFile for validation)
      const validationResult = this.validateFile(processedFile);
      if (!validationResult.valid) {
        console.error('❌ DEBUG: File validation failed:', validationResult.error);
        return { success: false, error: validationResult.error };
      }

      console.log('✅ DEBUG: File validation passed');

      // Check authentication - FLEXIBLE for Neon direct mode
      console.log('🔍 DEBUG: Checking authentication...');
      let authenticatedUserId: string | null = userId && userId !== 'system' ? userId : null; // Use the userId parameter if provided
      try {
        const { data: { user }, error: authError } = await uploadSupabase.auth.getUser();
        if (user && !authError) {
          authenticatedUserId = user.id;
          console.log('✅ Using Supabase user:', authenticatedUserId);
        } else {
          // Fallback to localStorage user (Neon direct mode)
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            // Only use valid UUIDs, not string "system"
            authenticatedUserId = parsedUser.id && parsedUser.id !== 'system' ? parsedUser.id : null;
            console.log('✅ Using localStorage user:', authenticatedUserId);
          } else {
            console.log('✅ Using null for system user (no auth)');
          }
        }
      } catch (e) {
        console.log('⚠️ Auth check failed, using null for system user');
      }

      console.log('✅ DEBUG: Authentication successful, user:', authenticatedUserId);

      // Use the local storage service for hosting storage
      console.log('🚀 Using local storage service for product images');
      
      // Get product name for the upload (we'll use a placeholder if not available)
      const productName = 'product'; // This will be overridden by the actual product name
      
      // Use the local storage service
      const result = await LocalProductImageStorageService.uploadProductImage(
        processedFile,
        productName,
        productId,
        isPrimary ? 'main' : 'gallery'
      );
      
      if (!result.success) {
        console.error('❌ Local storage upload failed:', result.error);
        return { success: false, error: result.error };
      }
      
      // Handle temporary product IDs (don't create database records yet)
      if (productId.startsWith('temp-product-') || productId.startsWith('test-product-') || productId.startsWith('temp-sparepart-')) {
        console.log('📝 DEBUG: Uploading to storage only for temporary product:', productId);
        
        const uploadedImage: UploadedImage = {
          id: `temp-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`,
          url: result.url || '',
          fileName: file.name,
          fileSize: processedFile.size,
          mimeType: processedFile.type,
          isPrimary: isPrimary,
          uploadedAt: new Date().toISOString()
        };

        // Store in development mode storage for later retrieval
        if (!this.devImageStorage.has(productId)) {
          this.devImageStorage.set(productId, []);
        }
        this.devImageStorage.get(productId)!.push(uploadedImage);

        console.log('✅ DEBUG: Image uploaded to storage (temporary):', uploadedImage);
        console.log('📦 DEBUG: Stored in dev storage for product:', productId);
        return {
          success: true,
          image: uploadedImage
        };
      }

      // For real products, the database record is already created by the PHP handler
      console.log('✅ DEBUG: Image uploaded successfully via local storage');
      
      // Get the uploaded image data from the database
      const images = await this.getProductImages(productId);
      const uploadedImage = images.find(img => img.fileName === file.name) || {
        id: `temp-${Date.now()}`,
        url: result.url || '',
        fileName: file.name,
        fileSize: processedFile.size,
        mimeType: processedFile.type,
        isPrimary: isPrimary,
        uploadedAt: new Date().toISOString()
      };

      return {
        success: true,
        image: uploadedImage
      };

    } catch (error) {
      console.error('❌ DEBUG: Upload error:', error);
      console.error('❌ DEBUG: Error type:', typeof error);
      console.error('❌ DEBUG: Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ DEBUG: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Upload multiple images
   */
  static async uploadMultipleImages(
    files: File[],
    productId: string,
    userId: string
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isPrimary = i === 0; // First image is primary
      
      console.log(`📤 Uploading image ${i + 1}/${files.length}: ${file.name}`);
      
      const result = await this.uploadImage(file, productId, userId, isPrimary);
      results.push(result);
      
      if (!result.success) {
        console.error(`❌ Failed to upload ${file.name}:`, result.error);
      }
    }
    
    return results;
  }

  /**
   * Delete an image
   */
  static async deleteImage(imageId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Use the local storage service to delete the image
      const result = await LocalProductImageStorageService.deleteProductImage(imageId);
      
      if (!result.success) {
        console.error('❌ Delete failed:', result.error);
        return { success: false, error: result.error };
      }

      console.log('✅ Image deleted successfully:', imageId);
      return { success: true };

    } catch (error) {
      console.error('❌ Delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update product images from temporary product ID to real product ID
   * Since temporary products don't create database records, we need to create them now
   */
  static async updateProductImages(tempProductId: string, realProductId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Updating product images from temp ID to real ID:', { tempProductId, realProductId });
      
      // Get the current user
      const { data: { user }, error: userError } = await uploadSupabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ Failed to get authenticated user:', userError);
        return { success: false, error: 'Authentication required' };
      }

      // Check if we have development mode images stored in both services
      const devImages = this.devImageStorage.get(tempProductId);
      const enhancedDevImages = EnhancedImageUploadService.getDevImages(tempProductId);
      
      console.log('🔍 ImageUploadService: Checking dev storage for:', tempProductId);
      console.log('🔍 ImageUploadService: All dev storage keys:', Array.from(this.devImageStorage.keys()));
      console.log('🔍 ImageUploadService: Dev storage size:', this.devImageStorage.size);
      console.log('🔍 ImageUploadService: Regular service images:', devImages?.length || 0);
      console.log('🔍 ImageUploadService: Enhanced service images:', enhancedDevImages?.length || 0);
      
      const allDevImages = [...(devImages || []), ...(enhancedDevImages || [])];
      
      if (allDevImages.length > 0) {
        console.log('🛠️ Found development mode images:', allDevImages.length);
        console.log('🛠️ Regular service images:', devImages?.length || 0);
        console.log('🛠️ Enhanced service images:', enhancedDevImages?.length || 0);
        
        // Create database records for development mode images
        const imageRecords = allDevImages.map((img, index) => ({
          product_id: realProductId,
          image_url: img.url,
          file_name: img.fileName,
          file_size: img.fileSize,
          is_primary: index === 0, // First image is primary
          uploaded_by: user.id
        }));

        // Insert all image records
        const { data: insertedImages, error: insertError } = await uploadSupabase
          .from('product_images')
          .insert(imageRecords)
          .select();

        if (insertError) {
          console.error('❌ Failed to insert development mode image records:', insertError);
          return { success: false, error: insertError.message };
        }

        console.log('✅ Successfully created development mode image records:', { 
          tempProductId, 
          realProductId, 
          createdCount: insertedImages?.length || 0 
        });

        // Clean up development storage from both services
        this.devImageStorage.delete(tempProductId);
        EnhancedImageUploadService.clearDevImages(tempProductId);

        // Clear cache for the real product ID since images were updated
        this.clearImageCache(realProductId);

        return { success: true };
      }
      
      // If no development mode images found, check if we're in development mode
      // and try to find images in the form data or recent uploads
      console.log('🔍 No development mode images found, checking for recent uploads...');
      
      // Since temporary products don't create database records, we need to create them now
      // The images are already uploaded to storage with the temporary product ID in the path
      // We'll create database records pointing to those storage files
      
      // List files in storage for the temporary product
      // Temporary images are stored in the 'temp/' directory with filenames like '1755242708996_wmsxec3ekz.png'
      const { data: storageFiles, error: storageError } = await uploadSupabase.storage
        .from('product-images')
        .list('temp', {
          limit: 100,
          offset: 0
        });
      
      if (storageError) {
        console.error('❌ Failed to list storage files:', storageError);
        return { success: false, error: storageError.message };
      }
      
      if (!storageFiles || storageFiles.length === 0) {
        console.log('📝 No storage files found in temp directory');
        return { success: true }; // No images to process
      }
      
      console.log('🔍 Found storage files in temp directory:', storageFiles);
      
      // Filter files that match the timestamp pattern from the temporary product ID
      // The tempProductId format is 'temp-product-1755242684294' where 1755242684294 is the timestamp
      const tempTimestamp = tempProductId.replace('temp-product-', '');
      console.log('🔍 Looking for files with timestamp:', tempTimestamp);
      
      // Create database records for each image
      const imageRecords = [];
      let primaryImageSet = false;
      let foundMatchingFiles = false;
      
      for (const file of storageFiles) {
        // Skip non-image files
        if (!file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          continue;
        }
        
        // Check if this file was uploaded during the same session
        // Files are named like 'product_1755242708996_xxx.png' where the second part is the timestamp
        const fileNameParts = file.name.split('_');
        if (fileNameParts.length < 2) {
          console.log('📝 Skipping file with invalid format:', file.name);
          continue;
        }
        
        const fileTimestamp = fileNameParts[1]; // Get the timestamp part
        if (fileTimestamp !== tempTimestamp) {
          console.log('📝 Skipping file with different timestamp:', file.name, 'expected:', tempTimestamp, 'got:', fileTimestamp);
          continue;
        }
        
        console.log('✅ Found matching file:', file.name);
        foundMatchingFiles = true;
        
        // Generate the storage path
        const storagePath = `temp/${file.name}`;
        
        // Get public URL for the file
        const { data: urlData } = uploadSupabase.storage
          .from('product-images')
          .getPublicUrl(storagePath);
        
        // Create database record
        const imageRecord = {
          product_id: realProductId,
          image_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.metadata?.size || 0,
          is_primary: !primaryImageSet, // First matching image is primary
          uploaded_by: user.id
        };
        
        if (!primaryImageSet) {
          primaryImageSet = true;
        }
        
        imageRecords.push(imageRecord);
      }
      
      if (!foundMatchingFiles) {
        console.log('📝 No matching files found for timestamp:', tempTimestamp);
        console.log('🔍 This might be a development mode issue where images were not properly stored');
        console.log('🔍 Available files:', storageFiles.map((f: { name: string }) => f.name));
        
        // In development mode, if no matching files found, we might need to handle this differently
        // For now, we'll return success to avoid blocking product creation
        return { success: true };
      }
      
      if (imageRecords.length === 0) {
        console.log('📝 No valid image files found');
        return { success: true };
      }
      
      // Insert all image records
      const { data: insertedImages, error: insertError } = await uploadSupabase
        .from('product_images')
        .insert(imageRecords)
        .select();
      
      if (insertError) {
        console.error('❌ Failed to insert image records:', insertError);
        return { success: false, error: insertError.message };
      }
      
      console.log('✅ Successfully created image records:', { 
        tempProductId, 
        realProductId, 
        createdCount: insertedImages?.length || 0 
      });
      
      // Clear cache for the real product ID since images were updated
      this.clearImageCache(realProductId);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating product images:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get images for a product
   */
  static async getProductImages(productId: string): Promise<UploadedImage[]> {
    try {
      // Check if productId is a temporary ID and get from development storage
      if (productId.startsWith('temp-product-') || productId.startsWith('test-product-') || productId.startsWith('temp-sparepart-')) {
        console.log('📝 Getting images from development storage for temporary product:', productId);
        // Import the EnhancedImageUploadService to access development storage
        const { EnhancedImageUploadService } = await import('./enhancedImageUpload');
        const devImages = EnhancedImageUploadService.getDevImages(productId);
        console.log('📦 Development storage images for product:', productId, 'count:', devImages.length);
        return devImages;
      }

      // Check cache first
      const cached = this.imageCache.get(productId);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
        console.log('📦 Returning cached images for product:', productId);
        return cached.images;
      }

      // Use the local storage service to get images
      const localImages = await LocalProductImageStorageService.getProductImages(productId);
      
      // Convert to UploadedImage format
      const images = localImages.map(img => ({
        id: img.id,
        url: img.url,
        thumbnailUrl: img.thumbnailUrl,
        fileName: img.fileName,
        fileSize: img.fileSize,
        mimeType: img.mimeType,
        isPrimary: img.isPrimary,
        uploadedAt: img.uploadedAt
      }));

      // Cache the result
      this.imageCache.set(productId, {
        images,
        timestamp: Date.now()
      });

      console.log('📦 Cached images for product:', productId, 'count:', images.length);
      return images;

    } catch (error) {
      console.error('❌ Get images error:', error);
      return [];
    }
  }

  /**
   * Clear cache for a specific product (call this when images are updated)
   */
  static clearImageCache(productId?: string): void {
    if (productId) {
      this.imageCache.delete(productId);
      console.log('🗑️ Cleared image cache for product:', productId);
    } else {
      this.imageCache.clear();
      console.log('🗑️ Cleared all image cache');
    }
  }

  /**
   * Validate file before upload
   */
  private static validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size ${(() => {
          const formatted = (file.size / 1024 / 1024).toFixed(2);
          return formatted.replace(/\.00$/, '').replace(/\.0$/, '');
        })()}MB exceeds limit of ${(() => {
          const formatted = (this.MAX_FILE_SIZE / 1024 / 1024).toFixed(2);
          return formatted.replace(/\.00$/, '').replace(/\.0$/, '');
        })()}MB`
      };
    }

    // Check file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed. Allowed types: ${this.ALLOWED_TYPES.join(', ')}`
      };
    }

    // Check if file is actually an image
    if (!file.type.startsWith('image/')) {
      return {
        valid: false,
        error: 'File must be an image'
      };
    }

    return { valid: true };
  }

  /**
   * Get user-friendly error message
   */
  private static getErrorMessage(error: any): string {
    const message = error.message || 'Unknown error';
    const statusCode = error.statusCode || error.status;
    
    console.error('🔍 DEBUG: Error details:', {
      message,
      statusCode,
      error: error.error,
      details: error.details,
      name: error.name
    });
    
    // Handle specific error cases
    if (statusCode === 400) {
      if (message.includes('duplicate')) {
        return 'File with this name already exists. Please rename the file.';
      }
      if (message.includes('size')) {
        return 'File size is too large. Please use a smaller image.';
      }
      if (message.includes('type') || message.includes('mime')) {
        return 'File type not supported. Please use JPEG, PNG, or WebP.';
      }
      if (message.includes('bucket')) {
        return 'Storage bucket not found. Please contact support.';
      }
      return `Upload failed (400): ${message}`;
    }
    
    if (statusCode === 401) {
      return 'Authentication failed. Please log in again.';
    }
    
    if (statusCode === 403) {
      return 'Permission denied. Please check your account access.';
    }
    
    if (statusCode === 404) {
      return 'Storage bucket not found. Please contact support.';
    }
    
    if (statusCode === 413) {
      return 'File size is too large. Please use a smaller image.';
    }
    
    // Generic error handling
    if (message.includes('permission')) {
      return 'Permission denied. Please check your account access.';
    }
    
    if (message.includes('bucket')) {
      return 'Storage bucket not found. Please contact support.';
    }
    
    return `Upload failed: ${message}`;
  }
}
