/**
 * Test Page for Image Upload - Bootstrap Version
 * Simplified test page for image upload functionality
 */

import React, { useState } from 'react';

export default function TestImageUpload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string>('');

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

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    handleFilesSelected(files);
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
            Testing image upload functionality in bootstrap
          </p>
        </div>

        {/* Main Upload Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Image Upload Section
          </h2>
          <p className="text-gray-600 mb-6">
            Select images using the file input below
          </p>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Choose Files
            </label>
            <p className="text-gray-500 mt-2">or drag and drop images here</p>
          </div>

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
              <span>Click "Choose Files" to select images</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>Select multiple images (up to 5)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>Click "Upload" to simulate uploading</span>
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
              <span className="text-green-800">File Input: Working</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-800">File Preview: Enabled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-800">Multiple Files: Supported</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-800">Upload Simulation: Working</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
