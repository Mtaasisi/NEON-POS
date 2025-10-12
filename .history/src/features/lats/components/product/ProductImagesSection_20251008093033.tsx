import React, { useState } from 'react';
import { Camera, Info, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { SimpleImageUpload } from '../../../../components/SimpleImageUpload';

interface ProductImage {
  id?: string;
  image_url?: string;
  url?: string;
  thumbnail_url?: string;
  file_name?: string;
  fileName?: string;
  file_size?: number;
  fileSize?: number;
  is_primary?: boolean;
  isPrimary?: boolean;
  uploaded_by?: string;
  created_at?: string;
  uploadedAt?: string;
  mimeType?: string;
}

// Type for images array that can contain both objects and strings
type ProductImageOrString = ProductImage | string;

interface ProductImagesSectionProps {
  images?: ProductImageOrString[];
  setImages: (images: ProductImageOrString[]) => void;
  currentUser?: any;
  productId?: string;
}

const ProductImagesSection: React.FC<ProductImagesSectionProps> = ({
  images,
  setImages,
  currentUser,
  productId
}) => {
  const [showFormatInfo, setShowFormatInfo] = useState(false);
  const hasImages = Boolean(images && Array.isArray(images) && images.length > 0);

  // Generate a temporary product ID if none is provided
  const tempProductId = productId || `temp-product-${Date.now()}`;

  // Create a mock user object if currentUser is not available
  const userForUpload = currentUser || { id: 'anonymous', email: 'anonymous@example.com' };

  return (
    <div className="border-b border-gray-200 pb-6">
      {/* Modern Header with Gradient */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
            <Camera size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              Product Images
              {hasImages && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                  {images?.length || 0}
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-600">Upload high-quality product photos</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Format Info Button */}
          <button
            type="button"
            onClick={() => setShowFormatInfo(!showFormatInfo)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              showFormatInfo
                ? 'bg-blue-100 text-blue-700 shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Image format information"
          >
            <Info size={16} />
            <span className="hidden sm:inline">Formats</span>
          </button>
          
          {/* Image Quality Indicator */}
          {hasImages && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
              <CheckCircle2 size={16} />
              <span className="hidden sm:inline">Ready</span>
            </div>
          )}
        </div>
      </div>

      {/* SimpleImageUpload Component - Handles everything */}
      <SimpleImageUpload
        productId={tempProductId}
        userId={userForUpload.id}
        existingImages={images?.map((img) => {
          if (typeof img === 'string') {
            return {
              id: `string-${crypto.randomUUID()}`,
              url: img,
              image_url: img,
              fileName: 'Image',
              fileSize: 0,
              isPrimary: false,
              uploadedAt: new Date().toISOString()
            };
          }
          return {
            id: img.id || `img-${crypto.randomUUID()}`,
            url: img.url || img.image_url || '',
            image_url: img.image_url || img.url || '',
            thumbnail_url: img.thumbnail_url,
            fileName: img.fileName || img.file_name || 'Image',
            fileSize: img.fileSize || img.file_size || 0,
            isPrimary: img.isPrimary || img.is_primary || false,
            uploadedAt: img.uploadedAt || img.created_at || new Date().toISOString(),
            mimeType: img.mimeType
          };
        }) || []}
        onImagesChange={(uploadedImages) => {
          // Convert the uploaded images to the format expected by the form
          const convertedImages = uploadedImages.map((img) => ({
            id: img.id,
            url: img.url,
            image_url: img.url,
            thumbnail_url: img.thumbnailUrl,
            fileName: img.fileName,
            file_name: img.fileName,
            fileSize: img.fileSize,
            file_size: img.fileSize,
            isPrimary: img.isPrimary,
            is_primary: img.isPrimary,
            uploaded_by: userForUpload.id,
            uploadedAt: img.uploadedAt,
            created_at: img.uploadedAt,
            mimeType: img.mimeType
          }));
          setImages(convertedImages);
        }}
        maxFiles={10}
        className="w-full"
      />
      
      {/* Enhanced Format Information */}
      {showFormatInfo && (
        <div className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <ImageIcon size={16} className="text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-base font-bold text-blue-900 mb-1">
                Image Format Guide
              </h4>
              <p className="text-sm text-blue-700">
                Choose the right format for your product images
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            {/* WebP Format */}
            <div className="bg-white rounded-lg p-3 border border-blue-100 hover:border-blue-300 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold rounded-md shadow-sm">
                    <CheckCircle2 size={12} />
                    WebP
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">Best Choice</p>
                  <p className="text-xs text-gray-600">
                    Smaller file sizes with excellent quality. Perfect for product images. Up to 30% smaller than JPEG.
                  </p>
                </div>
              </div>
            </div>

            {/* PNG Format */}
            <div className="bg-white rounded-lg p-3 border border-green-100 hover:border-green-300 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center px-2.5 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-bold rounded-md shadow-sm">
                    PNG
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">For Transparency</p>
                  <p className="text-xs text-gray-600">
                    Supports transparent backgrounds. Ideal for logos, icons, and graphics with text.
                  </p>
                </div>
              </div>
            </div>

            {/* JPEG Format */}
            <div className="bg-white rounded-lg p-3 border border-orange-100 hover:border-orange-300 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center px-2.5 py-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-bold rounded-md shadow-sm">
                    JPEG
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">Universal Support</p>
                  <p className="text-xs text-gray-600">
                    Works everywhere. Good for photographs. Larger file sizes than WebP.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Best Practices */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-800">
                <p className="font-semibold mb-1">Best Practices:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Use high-resolution images (at least 1000x1000px)</li>
                  <li>Ensure good lighting and clear focus</li>
                  <li>Show product from multiple angles</li>
                  <li>Keep file sizes under 5MB per image</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      {!hasImages && !showFormatInfo && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-600 flex items-center gap-2">
            <Info size={14} className="text-gray-400" />
            <span>
              <strong>Tip:</strong> Add at least one image to make your product listing more attractive. You can drag & drop, paste (Ctrl+V), or click to upload.
            </span>
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductImagesSection;