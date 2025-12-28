/**
 * PNG Generation Test Component
 * Standalone test page to verify PNG generation functionality
 */

import React, { useState } from 'react';
import ShareReceiptModal from './ShareReceiptModal';
import { Download, Image as ImageIcon, CheckCircle, XCircle } from 'lucide-react';

const PNGGenerationTest: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testResults, setTestResults] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error';
    message: string;
    error?: string;
  }>({
    status: 'idle',
    message: 'Ready to test PNG generation'
  });

  // Generate a simple data URL for placeholder images (avoids external URL connection issues)
  const generatePlaceholderImage = (text: string): string => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Background
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, 100, 100);
        // Border
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 100, 100);
        // Text
        ctx.fillStyle = '#666';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 50, 50);
        return canvas.toDataURL('image/png');
      }
    } catch (error) {
      console.warn('Failed to generate placeholder image:', error);
    }
    // Fallback to a minimal transparent PNG data URL
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  };

  // Sample receipt data for testing (using data URLs instead of external URLs)
  const sampleReceiptData = {
    receiptNumber: `TEST-${Date.now()}`,
    amount: 250000,
    subtotal: 230000,
    tax: 20000,
    discount: 0,
    paymentMethod: {
      name: 'Cash',
      description: 'Cash Payment',
      icon: '💵'
    },
    customerName: 'John Doe',
    customerPhone: '+255 123 456 789',
    customerEmail: 'john.doe@example.com',
    customerCity: 'Dar es Salaam',
    sellerName: 'Test Cashier',
    items: [
      {
        productName: 'iPhone 15 Pro',
        variantName: '256GB Natural Titanium',
        quantity: 1,
        unitPrice: 150000,
        totalPrice: 150000,
        image: generatePlaceholderImage('iPhone'),
        selectedSerialNumbers: [
          {
            id: '1',
            serial_number: 'SN123456789',
            imei: 'IMEI987654321'
          }
        ]
      },
      {
        productName: 'Samsung Galaxy S24',
        variantName: '128GB Phantom Black',
        quantity: 1,
        unitPrice: 80000,
        totalPrice: 80000,
        image: generatePlaceholderImage('Samsung')
      },
      {
        productName: 'AirPods Pro',
        variantName: '2nd Generation',
        quantity: 1,
        unitPrice: 50000,
        totalPrice: 50000,
        image: generatePlaceholderImage('AirPods')
      }
    ]
  };

  const handleTestPNG = async () => {
    setTestResults({
      status: 'testing',
      message: 'Opening receipt modal...'
    });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setTestResults({
      status: 'idle',
      message: 'Test completed. Check console for details.'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <ImageIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">PNG Generation Test</h1>
              <p className="text-gray-600 mt-1">Test the receipt PNG generation functionality</p>
            </div>
          </div>

          {/* Test Status */}
          <div className={`mt-6 p-4 rounded-lg border-2 ${
            testResults.status === 'success' 
              ? 'bg-green-50 border-green-200' 
              : testResults.status === 'error'
              ? 'bg-red-50 border-red-200'
              : testResults.status === 'testing'
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              {testResults.status === 'success' && (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
              {testResults.status === 'error' && (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              {testResults.status === 'testing' && (
                <div className="w-5 h-5 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
              )}
              <div>
                <p className={`font-semibold ${
                  testResults.status === 'success' 
                    ? 'text-green-800' 
                    : testResults.status === 'error'
                    ? 'text-red-800'
                    : testResults.status === 'testing'
                    ? 'text-yellow-800'
                    : 'text-gray-800'
                }`}>
                  {testResults.message}
                </p>
                {testResults.error && (
                  <p className="text-sm text-red-600 mt-1">{testResults.error}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Test Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Click the "Open Test Receipt" button below</li>
            <li>Wait for the receipt modal to open and fully render</li>
            <li>Click the "Download PNG" button in the modal</li>
            <li>Check your browser console (F12) for detailed logs</li>
            <li>Verify that the PNG file downloads successfully</li>
            <li>Check the downloaded PNG file to ensure it looks correct</li>
          </ol>
        </div>

        {/* Sample Receipt Data Preview */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Sample Receipt Data</h2>
          <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-gray-700">
              {JSON.stringify(sampleReceiptData, null, 2)}
            </pre>
          </div>
        </div>

        {/* Test Button */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <button
            onClick={handleTestPNG}
            disabled={isModalOpen}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            <Download className="w-6 h-6" />
            {isModalOpen ? 'Modal is Open - Test PNG Generation' : 'Open Test Receipt'}
          </button>
          
          {isModalOpen && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Modal is open!</strong> Now click the "Download PNG" button in the modal to test PNG generation.
                <br />
                <span className="text-xs mt-2 block">
                  💡 Tip: Open browser console (F12) to see detailed generation logs
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Console Log Guide */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">What to Look For in Console</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span><strong>Converting images to base64 for PNG...</strong> - Image conversion started</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span><strong>Preview dimensions: [width]x[height]</strong> - Element dimensions detected</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span><strong>Starting html2canvas with options...</strong> - Canvas generation started</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span><strong>Canvas generated successfully</strong> - PNG created successfully</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span><strong>PNG generated successfully</strong> - File ready for download</span>
            </div>
            <div className="flex items-start gap-2 mt-4">
              <span className="text-red-600 font-bold">✗</span>
              <span>If you see errors, they will be logged with detailed information</span>
            </div>
          </div>
        </div>
      </div>

      {/* Share Receipt Modal */}
      <ShareReceiptModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        receiptData={sampleReceiptData}
      />
    </div>
  );
};

export default PNGGenerationTest;
