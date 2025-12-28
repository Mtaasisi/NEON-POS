/**
 * Background Removal Page - Bootstrap Version
 * Simplified background removal test page for bootstrap
 */

import React, { useState } from 'react';

const BackgroundRemovalPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setResult(null);
    }
  };

  const handleProcess = () => {
    if (!selectedFile) return;

    setProcessing(true);
    setResult(null);

    // Simulate background removal processing
    setTimeout(() => {
      setResult('Background removal completed! (This is a demo - actual processing would require a real API)');
      setProcessing(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Background Removal
          </h1>
          <p className="text-gray-600">
            Remove backgrounds from product images automatically
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Upload Image
          </h2>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="bg-removal-upload"
            />
            <label
              htmlFor="bg-removal-upload"
              className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Choose Image
            </label>
            <p className="text-gray-500 mt-2">Select a product image to remove background</p>
          </div>
        </div>

        {/* Preview and Result */}
        {(previewUrl || result) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Original Image */}
            {previewUrl && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Original Image</h3>
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={previewUrl}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                </div>
                <button
                  onClick={handleProcess}
                  disabled={processing}
                  className="w-full mt-4 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  {processing ? 'Processing...' : 'Remove Background'}
                </button>
              </div>
            )}

            {/* Result */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Result</h3>
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                {result ? (
                  <div className="text-center">
                    <div className="text-green-500 text-6xl mb-4">✅</div>
                    <p className="text-green-700 font-medium">{result}</p>
                  </div>
                ) : processing ? (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Processing image...</p>
                  </div>
                ) : (
                  <div className="text-center text-gray-400">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p>Processed image will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            🎯 How It Works
          </h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span>Upload a product image with a background</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>Click "Remove Background" to process</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>Wait for AI processing to complete</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">4.</span>
              <span>Download the image with transparent background</span>
            </li>
          </ul>
        </div>

        {/* Status */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-3">
            ✅ Feature Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-800">File Upload: Working</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-800">Image Preview: Enabled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-yellow-800">AI Processing: Demo Mode</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-blue-800">Real API: Available in Full Version</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackgroundRemovalPage;
