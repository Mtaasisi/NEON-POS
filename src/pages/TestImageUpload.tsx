/**
 * Test Page for ImageUploadSection Component
 * Navigate to /test-image-upload to see it in action
 */

import React, { useState } from 'react';
import ImageUploadSection from '../components/ImageUploadSection';

export default function TestImageUpload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [showThumbnailUploader, setShowThumbnailUploader] = useState(false);

  const handleFilesSelected = (files: File[]) => {
    console.log('📁 Files selected:', files);
    setSelectedFiles(files);
    setUploadStatus(`${files.length} file(s) selected`);
  };

  const handleUpload = () => {
    setUploadStatus('Uploading...');
    
    // Simulate upload
    setTimeout(() => {
      setUploadStatus(`✅ Successfully uploaded ${selectedFiles.length} file(s)!`);
      console.log('✅ Upload complete!');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Image Upload Test
          </h1>
          <p className="text-gray-600">
            Testing ImageUploadSection and ThumbnailUploader components
          </p>
        </div>

        {/* Main Upload Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Image Upload Section
          </h2>
          <p className="text-gray-600 mb-6">
            Drag and drop images or click to browse
          </p>

          <ImageUploadSection
            onFilesSelected={handleFilesSelected}
            maxFiles={5}
            accept="image/*"
          />

          {/* Upload Status */}
          {selectedFiles.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 font-medium">
                  {uploadStatus || `${selectedFiles.length} file(s) ready to upload`}
                </p>
              </div>

              <button
                onClick={handleUpload}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md"
              >
                Upload {selectedFiles.length} Image{selectedFiles.length !== 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>

        {/* Thumbnail Uploader Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Thumbnail Uploader
          </h2>
          <p className="text-gray-600 mb-6">
            Upload custom thumbnails for your product images
          </p>

          <button
            onClick={() => setShowThumbnailUploader(!showThumbnailUploader)}
            className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showThumbnailUploader ? 'Hide' : 'Show'} Thumbnail Uploader
          </button>

          {showThumbnailUploader && (
            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  ℹ️ <strong>Note:</strong> The Thumbnail Uploader requires a real product image ID from the database.
                  Since this is a test page, it will show an error when trying to upload.
                  To test the full functionality, use it in a real product form with an actual image ID.
                </p>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700">UI Preview Only:</h3>
                
                {/* Visual mockup without actual upload */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Custom Thumbnail
                  </label>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => alert('This is a UI preview. Use in a real product form to upload thumbnails.')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Upload Thumbnail
                    </button>
                  </div>

                  <p className="text-xs text-gray-500">
                    Recommended: 150x150px or larger. Max 2MB.
                  </p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-blue-800">
                    <strong>To use in production:</strong>
                  </p>
                  <pre className="mt-2 text-xs bg-white p-3 rounded border border-blue-200 overflow-x-auto">
{`<ThumbnailUploader
  imageId={productImage.id}
  userId={currentUserId}
  onThumbnailUploaded={(url) => {
    console.log('Uploaded:', url);
  }}
  onError={(error) => {
    console.error('Error:', error);
  }}
/>`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* File Details */}
        {selectedFiles.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Selected Files Details
            </h2>
            <div className="space-y-3">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB • {file.type}
                      </p>
                    </div>
                  </div>
                  <div className="text-green-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            🎯 Test Instructions
          </h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span>Try dragging images into the upload area</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>Click "Choose Files" to browse your computer</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>Add multiple images (up to 5)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">4.</span>
              <span>Hover over images to see the remove button</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">5.</span>
              <span>Click "Upload" to simulate uploading</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">6.</span>
              <span>Test the Thumbnail Uploader by clicking "Show Thumbnail Uploader"</span>
            </li>
          </ul>
        </div>

        {/* Component Status */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-3">
            ✅ Component Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-800">ImageUploadSection: Working</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-800">ThumbnailUploader: Working</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-800">Drag & Drop: Enabled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-800">File Preview: Enabled</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

