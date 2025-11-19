import React, { useState, useCallback } from 'react';
import { Upload, Download, X, Loader2, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

const BackgroundRemovalPage: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string>('');

  const API_URL = 'http://localhost:5001/api/remove-background';

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFileName(file.name);
      
      // Create preview of original image
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalImage(e.target?.result as string);
        setProcessedImage(null); // Reset processed image
      };
      reader.readAsDataURL(file);

      // Process the image
      processImage(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']
    },
    maxFiles: 1,
    multiple: false
  });

  const processImage = async (file: File) => {
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process image');
      }

      // Convert response to blob and create object URL
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setProcessedImage(url);
      
      toast.success('Background removed successfully!');
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Failed to remove background. Make sure the API is running.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (processedImage) {
      const link = document.createElement('a');
      link.href = processedImage;
      link.download = fileName.replace(/\.[^/.]+$/, '') + '_no_bg.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Image downloaded!');
    }
  };

  const clearImages = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setFileName('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-3 rounded-xl shadow-lg">
              <ImageIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Background Removal Tool
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Upload an image and automatically remove its background in seconds
          </p>
          <div className="mt-2 flex items-center justify-center gap-2 text-sm text-purple-600 font-medium">
            <span className="bg-purple-100 px-3 py-1 rounded-full">✨ Enhanced Quality Mode</span>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">🎯 Precision AI</span>
          </div>
        </div>

        {/* Upload Area */}
        {!originalImage && (
          <div className="max-w-2xl mx-auto mb-8">
            <div
              {...getRootProps()}
              className={`
                border-3 border-dashed rounded-2xl p-12 text-center cursor-pointer
                transition-all duration-300 bg-white shadow-lg hover:shadow-xl
                ${isDragActive 
                  ? 'border-purple-500 bg-purple-50 scale-105' 
                  : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/50'
                }
              `}
            >
              <input {...getInputProps()} />
              <Upload className="w-16 h-16 mx-auto mb-4 text-purple-500" />
              <p className="text-xl font-semibold text-gray-700 mb-2">
                {isDragActive ? 'Drop your image here' : 'Drag & drop an image here'}
              </p>
              <p className="text-gray-500 mb-4">or</p>
              <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg">
                Browse Files
              </button>
              <p className="text-sm text-gray-400 mt-4">
                Supports: PNG, JPG, JPEG, GIF, WEBP, BMP
              </p>
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                <div>
                  <p className="text-lg font-semibold text-gray-700">Processing your image...</p>
                  <p className="text-sm text-gray-500">This may take a few seconds</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {originalImage && (
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              {processedImage && (
                <button
                  onClick={downloadImage}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 transition-all shadow-md hover:shadow-lg"
                >
                  <Download className="w-5 h-5" />
                  Download Result
                </button>
              )}
              <button
                onClick={clearImages}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg font-medium hover:from-red-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg"
              >
                <Trash2 className="w-5 h-5" />
                Clear & Upload New
              </button>
            </div>

            {/* Image Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Original Image */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-700">Original Image</h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    Before
                  </span>
                </div>
                <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden">
                  <img
                    src={originalImage}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="mt-3 text-sm text-gray-500 truncate">{fileName}</p>
              </div>

              {/* Processed Image */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-700">Processed Image</h3>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    After
                  </span>
                </div>
                <div className="relative aspect-square rounded-xl overflow-hidden">
                  {/* Checkered background to show transparency */}
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `
                        linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
                        linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
                        linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)
                      `,
                      backgroundSize: '20px 20px',
                      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                    }}
                  />
                  {processedImage ? (
                    <img
                      src={processedImage}
                      alt="Processed"
                      className="relative w-full h-full object-contain"
                    />
                  ) : (
                    <div className="relative flex items-center justify-center h-full">
                      <div className="text-center">
                        <Loader2 className="w-12 h-12 mx-auto text-purple-500 animate-spin mb-3" />
                        <p className="text-gray-500">Processing...</p>
                      </div>
                    </div>
                  )}
                </div>
                {processedImage && (
                  <p className="mt-3 text-sm text-green-600 font-medium">
                    ✓ Background removed
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!originalImage && !isProcessing && (
          <div className="max-w-4xl mx-auto mt-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-md text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-purple-600">1</span>
                </div>
                <h3 className="font-semibold text-gray-700 mb-2">Upload Image</h3>
                <p className="text-sm text-gray-500">
                  Drag & drop or click to upload your image
                </p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-md text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">2</span>
                </div>
                <h3 className="font-semibold text-gray-700 mb-2">Auto Processing</h3>
                <p className="text-sm text-gray-500">
                  Advanced AI precisely removes background while preserving all subject details
                </p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-md text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-600">3</span>
                </div>
                <h3 className="font-semibold text-gray-700 mb-2">Download Result</h3>
                <p className="text-sm text-gray-500">
                  Download your image with transparent background
                </p>
              </div>
            </div>
          </div>
        )}

        {/* API Status Notice */}
        <div className="max-w-4xl mx-auto mt-8 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
          <p className="text-sm text-purple-800">
            <strong>✨ Enhanced Quality Features:</strong>
          </p>
          <ul className="text-sm text-purple-700 mt-2 space-y-1 ml-4">
            <li>• Alpha matting for perfect edges</li>
            <li>• Advanced AI model (isnet-general-use)</li>
            <li>• Preserves all subject details</li>
            <li>• Edge refinement post-processing</li>
          </ul>
          <p className="text-xs text-purple-600 mt-3">
            <strong>Note:</strong> First use downloads enhanced AI model (~47MB). Run: <code className="bg-purple-200 px-2 py-1 rounded">python3 bg-removal-api.py</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default BackgroundRemovalPage;

