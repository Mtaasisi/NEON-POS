/**
 * Improved Image Uploader
 * Easy image upload with preview, camera support, and drag-and-drop
 */

import React, { useState, useCallback, useRef } from 'react';
import { Upload, Camera, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface ImageUploaderProps {
  onUpload: (file: File) => Promise<string>;
  currentImage?: string;
  onRemove?: () => void;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUpload,
  currentImage,
  onRemove,
  accept = 'image/*',
  maxSizeMB = 5,
  className = '',
}) => {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  // Handle file selection
  const handleFileSelect = useCallback(
    async (file: File) => {
      setError(null);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxSizeMB) {
        setError(`File size must be less than ${maxSizeMB}MB`);
        return;
      }

      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload
      setIsUploading(true);
      try {
        await onUpload(file);
      } catch (err) {
        setError('Upload failed. Please try again.');
        setPreview(null);
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload, maxSizeMB]
  );

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // Handle file input
  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // Handle camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (err) {
      setError('Could not access camera');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob(blob => {
        if (blob) {
          const file = new File([blob], 'camera-photo.jpg', {
            type: 'image/jpeg',
          });
          handleFileSelect(file);
          stopCamera();
        }
      }, 'image/jpeg');
    }
  }, [handleFileSelect, stopCamera]);

  // Handle remove
  const handleRemove = useCallback(() => {
    setPreview(null);
    onRemove?.();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onRemove]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="max-w-full max-h-[80vh]"
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <button
                onClick={capturePhoto}
                className="px-6 py-3 bg-white text-black rounded-full font-medium"
              >
                Capture Photo
              </button>
              <button
                onClick={stopCamera}
                className="px-6 py-3 bg-gray-600 text-white rounded-full font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      {!preview ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="space-y-4">
            <div className="flex justify-center">
              <ImageIcon className="w-12 h-12 text-gray-400" />
            </div>

            <div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                Upload Product Image
              </p>
              <p className="text-sm text-gray-600">
                Drag and drop or click to browse
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Max size: {maxSizeMB}MB
              </p>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Browse Files
              </button>

              <button
                onClick={startCamera}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Camera className="w-4 h-4" />
                Use Camera
              </button>
            </div>
          </div>

          {isUploading && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-600">Uploading...</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Preview */
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg"
          />
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};

/**
 * Multiple Images Uploader
 */
interface MultiImageUploaderProps {
  images: string[];
  onAdd: (file: File) => Promise<string>;
  onRemove: (index: number) => void;
  maxImages?: number;
}

export const MultiImageUploader: React.FC<MultiImageUploaderProps> = ({
  images,
  onAdd,
  onRemove,
  maxImages = 5,
}) => {
  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-4">
      {/* Existing Images */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={image}
                alt={`Product ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                onClick={() => onRemove(index)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add More */}
      {canAddMore && (
        <ImageUploader
          onUpload={onAdd}
          className="max-w-md"
        />
      )}

      <p className="text-sm text-gray-600">
        {images.length} / {maxImages} images
      </p>
    </div>
  );
};

