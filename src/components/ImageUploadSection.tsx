/**
 * Image Upload Section Component
 * Beautiful drag-and-drop image uploader with package icon
 */

import React, { useState, useRef } from 'react';

interface ImageUploadSectionProps {
  onFilesSelected?: (files: File[]) => void;
  maxFiles?: number;
  accept?: string;
  className?: string;
}

export const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({
  onFilesSelected,
  maxFiles = 5,
  accept = 'image/*',
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    const limitedFiles = files.slice(0, maxFiles - selectedFiles.length);
    const newFiles = [...selectedFiles, ...limitedFiles];
    setSelectedFiles(newFiles);
    onFilesSelected?.(newFiles);
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesSelected?.(newFiles);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={className}>
      {selectedFiles.length === 0 ? (
        // Empty State - Upload Section
        <div
          onClick={openFileDialog}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            w-full h-64 flex flex-col items-center justify-center
            border-2 border-dashed rounded-xl cursor-pointer
            transition-all duration-200 ease-in-out
            ${isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
            }
          `}
        >
          {/* Package Icon */}
          <div className={`
            transition-all duration-200
            ${isDragging ? 'text-blue-500 scale-110' : 'text-gray-400'}
          `}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-20 h-20"
            >
              <path d="M16.5 9.4 7.55 4.24"></path>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.29 7 12 12 20.71 7"></polyline>
              <line x1="12" x2="12" y1="22" y2="12"></line>
            </svg>
          </div>

          {/* Upload Text */}
          <div className="mt-6 text-center">
            <p className={`
              text-lg font-semibold transition-colors
              ${isDragging ? 'text-blue-600' : 'text-gray-700'}
            `}>
              {isDragging ? 'Drop images here' : 'Upload Images'}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Drag and drop or click to browse
            </p>
            <p className="mt-1 text-xs text-gray-400">
              PNG, JPG, WebP up to 10MB (Max {maxFiles} files)
            </p>
          </div>

          {/* Upload Button */}
          <button
            type="button"
            className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Choose Files
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept}
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      ) : (
        // Files Selected - Preview Grid
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              Selected Images ({selectedFiles.length}/{maxFiles})
            </h3>
            <button
              onClick={() => {
                setSelectedFiles([]);
                onFilesSelected?.([]);
              }}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear All
            </button>
          </div>

          {/* Image Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 border-2 border-gray-200">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* File Name */}
                <p className="mt-1 text-xs text-gray-600 truncate">
                  {file.name}
                </p>

                {/* Remove Button */}
                <button
                  onClick={() => removeFile(index)}
                  className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Add More Button */}
            {selectedFiles.length < maxFiles && (
              <div
                onClick={openFileDialog}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <p className="mt-2 text-xs text-gray-500 font-medium">Add More</p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept}
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
};

export default ImageUploadSection;

