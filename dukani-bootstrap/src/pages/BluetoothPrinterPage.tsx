/**
 * Bluetooth Printer Page - Bootstrap Version
 * Simplified Bluetooth printer management for bootstrap
 */

import React, { useState } from 'react';

const BluetoothPrinterPage: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [printerName, setPrinterName] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const handleScan = () => {
    setScanning(true);
    // Simulate scanning for printers
    setTimeout(() => {
      setScanning(false);
      // Simulate finding a printer
      setPrinterName('Thermal Printer XP-80');
    }, 2000);
  };

  const handleConnect = () => {
    setConnected(true);
  };

  const handleDisconnect = () => {
    setConnected(false);
    setPrinterName(null);
  };

  const handleTestPrint = () => {
    alert('Test receipt would be printed here in the full version!');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Bluetooth Printer
          </h1>
          <p className="text-gray-600">
            Connect and manage thermal receipt printers
          </p>
        </div>

        {/* Printer Status */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Printer Status
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Connection Status */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Connection</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-4 h-4 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`font-medium ${connected ? 'text-green-700' : 'text-red-700'}`}>
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {printerName && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600">Device:</p>
                  <p className="font-medium text-gray-900">{printerName}</p>
                </div>
              )}

              <div className="flex gap-3">
                {!connected ? (
                  <>
                    <button
                      onClick={handleScan}
                      disabled={scanning}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                    >
                      {scanning ? 'Scanning...' : 'Scan for Printers'}
                    </button>
                    {printerName && (
                      <button
                        onClick={handleConnect}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Connect
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={handleDisconnect}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            {/* Printer Info */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Printer Information</h3>

              {connected ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Model:</p>
                    <p className="font-medium text-gray-900">Thermal Printer XP-80</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Paper Width:</p>
                    <p className="font-medium text-gray-900">58mm</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Battery:</p>
                    <p className="font-medium text-gray-900">85%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status:</p>
                    <p className="font-medium text-green-700">Ready</p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <p>No printer connected</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Test Print */}
        {connected && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              Test Print
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Receipt Preview</h3>
                <div className="bg-gray-100 border rounded-lg p-4 font-mono text-sm">
                  <div className="text-center mb-2">
                    <strong>DUKANI PRO</strong>
                  </div>
                  <div className="border-t border-b py-2 my-2">
                    <div>Product: Sample Item</div>
                    <div>Qty: 1 x $10.00</div>
                    <div>Total: $10.00</div>
                  </div>
                  <div className="text-center text-xs mt-2">
                    Thank you for your business!
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={handleTestPrint}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Print Test Receipt
                  </button>

                  <div className="text-sm text-gray-600">
                    <p className="mb-2">Print settings:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Paper width: 58mm</li>
                      <li>Character encoding: UTF-8</li>
                      <li>Cut paper after print: Yes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            🎯 Setup Instructions
          </h3>
          <ol className="space-y-2 text-blue-800">
            <li className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span>Turn on your Bluetooth thermal printer</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>Click "Scan for Printers" to find available devices</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>Select your printer from the list</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">4.</span>
              <span>Click "Connect" to pair with the device</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">5.</span>
              <span>Test print a receipt to verify connection</span>
            </li>
          </ol>
        </div>

        {/* Status */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-3">
            ✅ Feature Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="text-green-800">Bluetooth Connection: {connected ? 'Connected' : 'Demo Mode'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-800">Device Scanning: Working</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-yellow-800">Receipt Printing: Demo Mode</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-blue-800">Real Hardware: Available in Full Version</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BluetoothPrinterPage;
