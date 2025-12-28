/**
 * Trade-In Photo Upload Component
 * Allows uploading multiple device condition photos
 */

import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Image as ImageIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DevicePhoto } from '../../types/tradeIn';

interface TradeInPhotoUploadProps {
  photos: DevicePhoto[];
  onPhotosChange: (photos: DevicePhoto[]) => void;
  maxPhotos?: number;
}

export const TradeInPhotoUpload: React.FC<TradeInPhotoUploadProps> = ({
  photos,
  onPhotosChange,
  maxPhotos = 10,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (fileArray.length === 0) {
      toast.error('Please select image files');
      return;
    }

    if (photos.length + fileArray.length > maxPhotos) {
      toast.error(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    const newPhotos: DevicePhoto[] = [];

    fileArray.forEach((file) => {
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          newPhotos.push({
            url: result,
            caption: '',
            timestamp: new Date().toISOString(),
          });

          // When all files are processed, update photos
          if (newPhotos.length === fileArray.length) {
            onPhotosChange([...photos, ...newPhotos]);
            toast.success(`Added ${newPhotos.length} photo(s)`);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  }, [photos, maxPhotos, onPhotosChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
    toast.success('Photo removed');
  };

  const updateCaption = (index: number, caption: string) => {
    const newPhotos = [...photos];
    newPhotos[index] = { ...newPhotos[index], caption };
    onPhotosChange(newPhotos);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {photos.length < maxPhotos && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />

          <div className="space-y-3">
            <div className="flex justify-center">
              <ImageIcon className="w-12 h-12 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                Upload Device Photos
              </p>
              <p className="text-xs text-gray-600">
                Drag and drop or click to browse ({photos.length}/{maxPhotos})
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Upload className="w-4 h-4" />
                Browse Files
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo, index) => (
            <div key={index} className="relative group bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm">
              <img
                src={photo.url}
                alt={`Device photo ${index + 1}`}
                className="w-full h-48 object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="p-3">
                <input
                  type="text"
                  value={photo.caption || ''}
                  onChange={(e) => updateCaption(index, e.target.value)}
                  placeholder="Add caption (optional)"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

