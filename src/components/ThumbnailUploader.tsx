/**
 * Manual Thumbnail Uploader
 * Allows users to upload their own custom thumbnails for product images
 */

import React, { useState, useRef } from 'react';
import { UnifiedImageService } from '../lib/unifiedImageService';

interface ThumbnailUploaderProps {
  imageId: string;
  currentThumbnailUrl?: string;
  userId: string;
  onThumbnailUploaded?: (thumbnailUrl: string) => void;
  onError?: (error: string) => void;
}

export const ThumbnailUploader: React.FC<ThumbnailUploaderProps> = ({
  imageId,
  currentThumbnailUrl,
  userId,
  onThumbnailUploaded,
  onError
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentThumbnailUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      onError?.('Please select a valid image file (JPG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size (max 2MB for thumbnails)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      onError?.('Thumbnail file too large. Maximum size is 2MB');
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload thumbnail
    setUploading(true);
    try {
      const result = await UnifiedImageService.uploadThumbnail(file, imageId, userId);
      
      if (result.success && result.thumbnailUrl) {
        console.log('✅ Thumbnail uploaded successfully:', result.thumbnailUrl);
        onThumbnailUploaded?.(result.thumbnailUrl);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Failed to upload thumbnail:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to upload thumbnail');
      // Revert preview on error
      setPreview(currentThumbnailUrl || null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Custom Thumbnail
      </label>
      
      <div className="flex items-center gap-3">
        {/* Thumbnail Preview */}
        {preview && (
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
            <img
              src={preview}
              alt="Thumbnail preview"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`
            px-4 py-2 rounded-lg text-sm font-medium transition-colors
            ${uploading 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          {uploading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Uploading...
            </span>
          ) : (
            preview ? 'Change Thumbnail' : 'Upload Thumbnail'
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={uploading}
        />
      </div>

      <p className="text-xs text-gray-500">
        Recommended: 150x150px or larger. Max 2MB.
      </p>
    </div>
  );
};

export default ThumbnailUploader;

