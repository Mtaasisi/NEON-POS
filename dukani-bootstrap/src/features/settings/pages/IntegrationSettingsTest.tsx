/**
 * Simple Integration Settings Test Page
 * Use this to verify inputs are working
 */

import React, { useState } from 'react';
import { Save } from 'lucide-react';

const IntegrationSettingsTest: React.FC = () => {
  const [smsApiKey, setSmsApiKey] = useState('');
  const [whatsappInstance, setWhatsappInstance] = useState('');
  const [mpesaKey, setMpesaKey] = useState('');

  const handleSave = () => {
    console.log('SMS API Key:', smsApiKey);
    console.log('WhatsApp Instance:', whatsappInstance);
    console.log('M-Pesa Key:', mpesaKey);
    alert('Settings logged to console! Check browser console (F12).');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Integration Settings Test</h1>
        
        {/* SMS Test */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            SMS API Key (Test)
          </label>
          <input
            type="text"
            value={smsApiKey}
            onChange={(e) => {
              console.log('SMS input changed:', e.target.value);
              setSmsApiKey(e.target.value);
            }}
            placeholder="Type something here..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Current value: {smsApiKey || '(empty)'}
          </p>
        </div>

        {/* WhatsApp Test */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            WhatsApp Instance ID (Test)
          </label>
          <input
            type="text"
            value={whatsappInstance}
            onChange={(e) => {
              console.log('WhatsApp input changed:', e.target.value);
              setWhatsappInstance(e.target.value);
            }}
            placeholder="Type something here..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Current value: {whatsappInstance || '(empty)'}
          </p>
        </div>

        {/* M-Pesa Test */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            M-Pesa Consumer Key (Test)
          </label>
          <input
            type="text"
            value={mpesaKey}
            onChange={(e) => {
              console.log('M-Pesa input changed:', e.target.value);
              setMpesaKey(e.target.value);
            }}
            placeholder="Type something here..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Current value: {mpesaKey || '(empty)'}
          </p>
        </div>

        {/* Test Button */}
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />
          Test Save (Check Console)
        </button>

        {/* Debug Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          <pre className="text-xs text-gray-600 whitespace-pre-wrap">
{JSON.stringify({
  smsApiKey,
  whatsappInstance,
  mpesaKey,
  inputsWorking: !!(smsApiKey || whatsappInstance || mpesaKey)
}, null, 2)}
          </pre>
        </div>

      </div>
    </div>
  );
};

export default IntegrationSettingsTest;

