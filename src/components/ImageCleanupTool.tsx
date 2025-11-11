/**
 * Image Cleanup Tool Component
 * 
 * Admin tool to identify and fix products with large base64 images
 * that cause HTTP 431 errors and performance issues.
 * 
 * Usage: Add this component to your admin dashboard
 */

import React, { useState } from 'react';
import { LargeImageCleanup } from '../utils/cleanupLargeImages';

interface CleanupStats {
  totalProducts: number;
  avgSizeKB: number;
  maxSizeKB: number;
  totalSizeMB: number;
}

export const ImageCleanupTool: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [stats, setStats] = useState<CleanupStats | null>(null);
  const [affectedProducts, setAffectedProducts] = useState<any[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<'placeholder' | 'compress'>('placeholder');
  const [csvExport, setCsvExport] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  const handleScan = async () => {
    setIsScanning(true);
    setMessage('');
    
    try {
      console.log('🔍 Scanning for large images...');
      const products = await LargeImageCleanup.scanProducts();
      
      setAffectedProducts(products);

      if (products.length > 0) {
        const totalSize = products.reduce((sum, p) => sum + p.imageSize, 0);
        const avgSize = Math.round(totalSize / products.length / 1024);
        const maxSize = Math.round(Math.max(...products.map(p => p.imageSize)) / 1024);
        const totalSizeMB = Math.round(totalSize / 1024 / 1024);

        setStats({
          totalProducts: products.length,
          avgSizeKB: avgSize,
          maxSizeKB: maxSize,
          totalSizeMB
        });

        // Generate CSV
        const csv = await LargeImageCleanup.exportToCsv(products);
        setCsvExport(csv);

        setMessage(`Found ${products.length} products with large images`);
      } else {
        setMessage('✅ No products with large images found!');
        setStats(null);
      }
    } catch (error) {
      console.error('Error scanning:', error);
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleCleanup = async () => {
    if (affectedProducts.length === 0) {
      setMessage('Please scan first to identify affected products');
      return;
    }

    const confirmed = window.confirm(
      `This will ${selectedStrategy === 'placeholder' ? 'replace' : 'compress'} images for ${affectedProducts.length} products. Continue?`
    );

    if (!confirmed) return;

    setIsCleaning(true);
    setMessage('');

    try {
      const productIds = affectedProducts.map(p => p.id);

      if (selectedStrategy === 'placeholder') {
        await LargeImageCleanup.replaceWithPlaceholders(productIds);
        setMessage(`✅ Replaced ${productIds.length} products with placeholders`);
      } else {
        await LargeImageCleanup.compressImages(productIds);
        setMessage(`✅ Compressed ${productIds.length} product images`);
      }

      // Re-scan to verify
      await handleScan();
    } catch (error) {
      console.error('Error cleaning up:', error);
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCleaning(false);
    }
  };

  const downloadCsv = () => {
    const blob = new Blob([csvExport], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `large-images-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        🖼️ Image Cleanup Tool
      </h2>

      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-yellow-800">
          <strong>⚠️ Warning:</strong> This tool identifies products with large base64 images 
          (&gt;10KB) that can cause HTTP 431 errors and slow performance.
        </p>
      </div>

      {/* Scan Section */}
      <div className="mb-6">
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isScanning ? '🔍 Scanning...' : '🔍 Scan Products'}
        </button>
      </div>

      {/* Stats Display */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <div className="text-2xl font-bold text-red-600">{stats.totalProducts}</div>
            <div className="text-sm text-red-800">Affected Products</div>
          </div>
          <div className="p-4 bg-orange-50 border border-orange-200 rounded">
            <div className="text-2xl font-bold text-orange-600">{stats.avgSizeKB}KB</div>
            <div className="text-sm text-orange-800">Average Size</div>
          </div>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <div className="text-2xl font-bold text-yellow-600">{stats.maxSizeKB}KB</div>
            <div className="text-sm text-yellow-800">Largest Image</div>
          </div>
          <div className="p-4 bg-purple-50 border border-purple-200 rounded">
            <div className="text-2xl font-bold text-purple-600">{stats.totalSizeMB}MB</div>
            <div className="text-sm text-purple-800">Total Wasted</div>
          </div>
        </div>
      )}

      {/* Products List */}
      {affectedProducts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Affected Products (Top 20)</h3>
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Product
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Size
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {affectedProducts.slice(0, 20).map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {product.name}
                      <div className="text-xs text-gray-500">{product.id}</div>
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-600">
                      {product.imageSizeKB}KB
                    </td>
                    <td className="px-4 py-2 text-center">
                      {product.hasLargeImage && (
                        <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-800 rounded mr-1">
                          Large Image
                        </span>
                      )}
                      {product.hasLargeThumbnail && (
                        <span className="inline-block px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                          Large Thumb
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {affectedProducts.length > 20 && (
            <p className="text-sm text-gray-600 mt-2">
              Showing 20 of {affectedProducts.length} products
            </p>
          )}
        </div>
      )}

      {/* Cleanup Section */}
      {affectedProducts.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded">
          <h3 className="text-lg font-semibold mb-3">Cleanup Options</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Strategy:
            </label>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="placeholder">Replace with Placeholders (Fast, Immediate)</option>
              <option value="compress">Compress Images (Slow, Preserves Images)</option>
            </select>
            <p className="text-xs text-gray-600 mt-1">
              {selectedStrategy === 'placeholder'
                ? 'Replaces images with SVG placeholders. Products will show generic images.'
                : 'Attempts to compress images to under 10KB. May take several minutes.'}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCleanup}
              disabled={isCleaning}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isCleaning ? '🔄 Cleaning...' : '✨ Apply Cleanup'}
            </button>

            {csvExport && (
              <button
                onClick={downloadCsv}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                📥 Download CSV Report
              </button>
            )}
          </div>
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded ${
          message.includes('❌') 
            ? 'bg-red-50 border border-red-200 text-red-800'
            : message.includes('✅')
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-blue-50 border border-blue-200 text-blue-800'
        }`}>
          {message}
        </div>
      )}

      {/* Help Section */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <h4 className="font-semibold text-blue-900 mb-2">ℹ️ How to Use:</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Click "Scan Products" to identify products with large images</li>
          <li>Review the affected products list</li>
          <li>Choose a cleanup strategy (placeholder or compress)</li>
          <li>Click "Apply Cleanup" to fix the issues</li>
          <li>Optionally download CSV report for manual review</li>
        </ol>
        <p className="text-xs text-blue-700 mt-3">
          <strong>Note:</strong> Always test in a development environment first. 
          Consider backing up your database before running cleanup on production data.
        </p>
      </div>
    </div>
  );
};

export default ImageCleanupTool;

