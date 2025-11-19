/**
 * Example Usage of ImageUploadSection Component
 */

import React, { useState } from 'react';
import ImageUploadSection from './ImageUploadSection';

export const ImageUploadExample = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleFilesSelected = (files: File[]) => {
    console.log('Files selected:', files);
    setUploadedFiles(files);
    
    // Here you can upload the files to your server
    // Example: uploadToServer(files);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Product Image Upload</h1>
      
      <ImageUploadSection
        onFilesSelected={handleFilesSelected}
        maxFiles={5}
        accept="image/*"
        className="mb-6"
      />

      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3">Ready to Upload:</h2>
          <ul className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <li key={index} className="text-sm text-gray-600">
                • {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </li>
            ))}
          </ul>
          
          <button
            onClick={() => {
              // Your upload logic here
              console.log('Uploading files:', uploadedFiles);
            }}
            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
          >
            Upload {uploadedFiles.length} Image{uploadedFiles.length !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
};

// Example in Product Form
export const ProductFormWithUpload = () => {
  const [productData, setProductData] = useState({
    name: '',
    price: '',
    images: [] as File[]
  });

  return (
    <form className="space-y-6 max-w-2xl mx-auto p-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Product Name
        </label>
        <input
          type="text"
          value={productData.name}
          onChange={(e) => setProductData({ ...productData, name: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          placeholder="Enter product name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Price
        </label>
        <input
          type="number"
          value={productData.price}
          onChange={(e) => setProductData({ ...productData, price: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          placeholder="0.00"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Product Images
        </label>
        <ImageUploadSection
          onFilesSelected={(files) => setProductData({ ...productData, images: files })}
          maxFiles={5}
        />
      </div>

      <button
        type="submit"
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
      >
        Create Product
      </button>
    </form>
  );
};

export default ImageUploadExample;

