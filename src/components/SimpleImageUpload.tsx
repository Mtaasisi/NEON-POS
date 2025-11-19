import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, X, Star, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import imageCompression from 'browser-image-compression';

export interface SimpleUploadedImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  fileName: string;
  fileSize: number;
  isPrimary: boolean;
  uploadedAt: string;
}

interface SimpleImageUploadProps {
  productId: string;
  userId: string;
  existingImages?: any[];
  onImagesChange: (images: SimpleUploadedImage[]) => void;
  maxImages?: number;
  bucket?: string;
  className?: string;
}

export const SimpleImageUpload: React.FC<SimpleImageUploadProps> = ({
  productId,
  userId,
  existingImages = [],
  onImagesChange,
  maxImages = 5,
  bucket = 'product-images',
  className = ''
}) => {
  const [images, setImages] = useState<SimpleUploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize images from existingImages prop
  useEffect(() => {
    if (existingImages && existingImages.length > 0) {
      const mappedImages: SimpleUploadedImage[] = existingImages.map((img, index) => ({
        id: img.id || `existing-${index}`,
        url: img.image_url || img.url || '',
        thumbnailUrl: img.thumbnail_url || img.thumbnailUrl || img.image_url || img.url || '',
        fileName: img.file_name || img.fileName || `image-${index}.jpg`,
        fileSize: img.file_size || img.fileSize || 0,
        isPrimary: img.is_primary || img.isPrimary || index === 0,
        uploadedAt: img.created_at || img.uploadedAt || new Date().toISOString()
      }));
      setImages(mappedImages);
    }
  }, []);

  const compressImage = async (file: File): Promise<File> => {
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/webp'
      };
      
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.error('Error compressing image:', error);
      return file;
    }
  };

  const uploadToSupabase = async (file: File): Promise<SimpleUploadedImage | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      setUploadProgress(prev => ({ ...prev, [file.name]: 10 }));

      // Compress the image
      const compressedFile = await compressImage(file);
      setUploadProgress(prev => ({ ...prev, [file.name]: 30 }));

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      setUploadProgress(prev => ({ ...prev, [file.name]: 70 }));

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

      return {
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        url: publicUrl,
        thumbnailUrl: publicUrl,
        fileName: file.name,
        fileSize: compressedFile.size,
        isPrimary: images.length === 0,
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
      }, 1000);
    }
  };

  const handleFileSelect = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || uploading) return;

    const filesArray = Array.from(selectedFiles);
    const remainingSlots = maxImages - images.length;
    const filesToUpload = filesArray.slice(0, remainingSlots);

    if (filesToUpload.length === 0) {
      alert(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = filesToUpload.map(file => uploadToSupabase(file));
      const uploadedImages = await Promise.all(uploadPromises);
      
      const successfulUploads = uploadedImages.filter((img): img is SimpleUploadedImage => img !== null);
      
      if (successfulUploads.length > 0) {
        const newImages = [...images, ...successfulUploads];
        setImages(newImages);
        onImagesChange(newImages);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      setUploading(false);
    }
  }, [images, maxImages, uploading, onImagesChange]);

  const removeImage = async (index: number) => {
    const imageToRemove = images[index];
    
    // Try to delete from Supabase if it has a URL
    if (imageToRemove.url) {
      try {
        // Extract file path from URL
        const urlParts = imageToRemove.url.split('/');
        const bucketIndex = urlParts.indexOf(bucket);
        if (bucketIndex !== -1) {
          const filePath = urlParts.slice(bucketIndex + 1).join('/');
          await supabase.storage.from(bucket).remove([filePath]);
        }
      } catch (error) {
        console.error('Error deleting image from storage:', error);
      }
    }

    const newImages = images.filter((_, i) => i !== index);
    
    // If we removed the primary image, make the first image primary
    if (imageToRemove.isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }
    
    setImages(newImages);
    onImagesChange(newImages);
  };

  const setPrimaryImage = (index: number) => {
    if (index === images.findIndex(img => img.isPrimary)) return;
    
    const newImages = images.map((img, i) => ({
      ...img,
      isPrimary: i === index
    }));
    
    setImages(newImages);
    onImagesChange(newImages);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      {images.length < maxImages && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-sm text-gray-600 mb-2">
            {uploading ? 'Uploading...' : 'Drag and drop images here, or click to select'}
          </p>
          <p className="text-xs text-gray-500">
            Supports: JPG, PNG, GIF (Max {maxImages} images)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            disabled={uploading}
          />
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div key={image.id} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                <img
                  src={image.thumbnailUrl || image.url}
                  alt={image.fileName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = image.url;
                  }}
                />
              </div>
              
              {/* Upload Progress Overlay */}
              {uploadProgress[image.fileName] !== undefined && uploadProgress[image.fileName] < 100 && (
                <div className="absolute inset-0 bg-black bg-opacity-70 rounded-lg flex flex-col items-center justify-center">
                  <div className="text-white text-xs mb-2">Uploading...</div>
                  <div className="w-3/4 bg-gray-600 rounded-full h-1.5">
                    <div 
                      className="bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress[image.fileName]}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {/* Hover Overlay with Actions */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg">
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!image.isPrimary && (
                    <button
                      onClick={() => setPrimaryImage(index)}
                      className="p-1.5 bg-white rounded-full shadow-sm hover:bg-yellow-50 transition-colors"
                      title="Set as primary"
                      disabled={uploading}
                    >
                      <Star size={14} className="text-yellow-500" />
                    </button>
                  )}
                  <button
                    onClick={() => removeImage(index)}
                    className="p-1.5 bg-white rounded-full shadow-sm hover:bg-red-50 transition-colors"
                    title="Remove image"
                    disabled={uploading}
                  >
                    <X size={14} className="text-red-500" />
                  </button>
                </div>
                
                {/* Primary Badge */}
                {image.isPrimary && (
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="px-2 py-1 bg-yellow-500 text-white text-xs rounded-full flex items-center gap-1 shadow-lg">
                      <Star size={12} fill="white" />
                      Primary
                    </div>
                  </div>
                )}
              </div>

              {/* Always visible primary indicator */}
              {image.isPrimary && (
                <div className="absolute bottom-2 left-2">
                  <div className="px-2 py-0.5 bg-yellow-500 text-white text-xs rounded-full flex items-center gap-1">
                    <Star size={10} fill="white" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Count */}
      {images.length > 0 && (
        <p className="text-sm text-gray-500 text-center">
          {images.length} of {maxImages} images uploaded
        </p>
      )}
    </div>
  );
};

