/**
 * Simple Integration Settings - Guaranteed to Work!
 * No fancy styling, just functional inputs
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const SimpleIntegrationSettings: React.FC = () => {
  // Separate states for each field (simpler than nested objects)
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsProvider, setSmsProvider] = useState('mshastra');
  const [smsApiKey, setSmsApiKey] = useState('');
  const [smsSenderId, setSmsSenderId] = useState('LATS POS');

  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappInstance, setWhatsappInstance] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');

  const [mpesaEnabled, setMpesaEnabled] = useState(false);
  const [mpesaShortcode, setMpesaShortcode] = useState('');
  const [mpesaKey, setMpesaKey] = useState('');
  const [mpesaSecret, setMpesaSecret] = useState('');
  const [mpesaPasskey, setMpesaPasskey] = useState('');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('integration_settings')
        .select('*');

      if (error) {
        console.error('Load error:', error);
        return;
      }

      if (data) {
        data.forEach((setting: any) => {
          const config = setting.config || {};
          
          switch (setting.integration_type) {
            case 'sms':
              setSmsEnabled(setting.is_enabled || false);
              setSmsProvider(setting.provider || 'mshastra');
              setSmsApiKey(config.apiKey || '');
              setSmsSenderId(config.senderId || 'LATS POS');
              break;
            case 'whatsapp':
              setWhatsappEnabled(setting.is_enabled || false);
              setWhatsappInstance(config.instanceId || '');
              setWhatsappToken(config.apiToken || '');
              break;
            case 'mpesa':
              setMpesaEnabled(setting.is_enabled || false);
              setMpesaShortcode(config.businessShortcode || '');
              setMpesaKey(config.consumerKey || '');
              setMpesaSecret(config.consumerSecret || '');
              setMpesaPasskey(config.passkey || '');
              break;
          }
        });
      }
    } catch (error) {
      console.error('Load settings error:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage('');

    try {
      // Save SMS settings
      await supabase.from('integration_settings').upsert({
        integration_type: 'sms',
        is_enabled: smsEnabled,
        provider: smsProvider,
        config: {
          apiKey: smsApiKey,
          senderId: smsSenderId
        },
        status: smsEnabled ? 'active' : 'inactive',
        updated_at: new Date().toISOString()
      }, { onConflict: 'integration_type' });

      // Save WhatsApp settings
      await supabase.from('integration_settings').upsert({
        integration_type: 'whatsapp',
        is_enabled: whatsappEnabled,
        provider: 'greenapi',
        config: {
          instanceId: whatsappInstance,
          apiToken: whatsappToken
        },
        status: whatsappEnabled ? 'active' : 'inactive',
        updated_at: new Date().toISOString()
      }, { onConflict: 'integration_type' });

      // Save M-Pesa settings
      await supabase.from('integration_settings').upsert({
        integration_type: 'mpesa',
        is_enabled: mpesaEnabled,
        provider: 'vodacom',
        config: {
          businessShortcode: mpesaShortcode,
          consumerKey: mpesaKey,
          consumerSecret: mpesaSecret,
          passkey: mpesaPasskey
        },
        status: mpesaEnabled ? 'active' : 'inactive',
        updated_at: new Date().toISOString()
      }, { onConflict: 'integration_type' });

      setMessage('✅ Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage('❌ Error saving: ' + error.message);
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box' as 'border-box'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '500',
    fontSize: '14px',
    color: '#374151'
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '10px 24px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    width: '100%',
    marginTop: '16px'
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
        Integration Settings
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '24px' }}>
        Configure your SMS, WhatsApp, and Mobile Money integrations
      </p>

      {message && (
        <div style={{
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px',
          backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2',
          color: message.includes('✅') ? '#065f46' : '#991b1b',
          border: `1px solid ${message.includes('✅') ? '#6ee7b7' : '#fca5a5'}`
        }}>
          {message}
        </div>
      )}

      {/* SMS Integration */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
          📱 SMS Integration
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={smsEnabled}
              onChange={(e) => setSmsEnabled(e.target.checked)}
              style={{ marginRight: '8px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: '500' }}>Enable SMS Integration</span>
          </label>
        </div>

        {smsEnabled && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>SMS Provider</label>
              <select
                value={smsProvider}
                onChange={(e) => setSmsProvider(e.target.value)}
                style={inputStyle}
              >
                <option value="mshastra">MShastra (Tanzania)</option>
                <option value="africastalking">Africa's Talking</option>
                <option value="twilio">Twilio</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>API Key *</label>
              <input
                type="text"
                value={smsApiKey}
                onChange={(e) => setSmsApiKey(e.target.value)}
                placeholder="Enter your SMS API key"
                style={inputStyle}
              />
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Current: {smsApiKey || '(not set)'}
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Sender ID</label>
              <input
                type="text"
                value={smsSenderId}
                onChange={(e) => setSmsSenderId(e.target.value)}
                placeholder="e.g., LATS POS"
                style={inputStyle}
              />
            </div>
          </>
        )}
      </div>

      {/* WhatsApp Integration */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
          💬 WhatsApp Integration
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={whatsappEnabled}
              onChange={(e) => setWhatsappEnabled(e.target.checked)}
              style={{ marginRight: '8px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: '500' }}>Enable WhatsApp Integration</span>
          </label>
        </div>

        {whatsappEnabled && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Instance ID *</label>
              <input
                type="text"
                value={whatsappInstance}
                onChange={(e) => setWhatsappInstance(e.target.value)}
                placeholder="Your Green API Instance ID"
                style={inputStyle}
              />
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Current: {whatsappInstance || '(not set)'}
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>API Token *</label>
              <input
                type="text"
                value={whatsappToken}
                onChange={(e) => setWhatsappToken(e.target.value)}
                placeholder="Your Green API Token"
                style={inputStyle}
              />
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Current: {whatsappToken ? whatsappToken.substring(0, 10) + '...' : '(not set)'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* M-Pesa Integration */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
          💳 M-Pesa Integration
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={mpesaEnabled}
              onChange={(e) => setMpesaEnabled(e.target.checked)}
              style={{ marginRight: '8px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: '500' }}>Enable M-Pesa Payments</span>
          </label>
        </div>

        {mpesaEnabled && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Business Shortcode *</label>
              <input
                type="text"
                value={mpesaShortcode}
                onChange={(e) => setMpesaShortcode(e.target.value)}
                placeholder="e.g., 174379"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Consumer Key *</label>
              <input
                type="text"
                value={mpesaKey}
                onChange={(e) => setMpesaKey(e.target.value)}
                placeholder="Consumer Key from Daraja"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Consumer Secret *</label>
              <input
                type="text"
                value={mpesaSecret}
                onChange={(e) => setMpesaSecret(e.target.value)}
                placeholder="Consumer Secret from Daraja"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Passkey *</label>
              <input
                type="text"
                value={mpesaPasskey}
                onChange={(e) => setMpesaPasskey(e.target.value)}
                placeholder="Lipa Na M-Pesa Online Passkey"
                style={inputStyle}
              />
            </div>
          </>
        )}
      </div>

      {/* Save Button */}
      <div style={cardStyle}>
        <button
          onClick={saveSettings}
          disabled={saving}
          style={{
            ...buttonStyle,
            opacity: saving ? 0.7 : 1,
            cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? '💾 Saving...' : '💾 Save All Settings'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
          Settings are saved to database and loaded automatically by services
        </p>
      </div>

      {/* Debug Info */}
      <div style={{ ...cardStyle, backgroundColor: '#f9fafb' }}>
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: '500', marginBottom: '8px' }}>
            🔍 Debug Information
          </summary>
          <pre style={{ fontSize: '11px', overflow: 'auto', padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
{JSON.stringify({
  sms: { enabled: smsEnabled, provider: smsProvider, apiKey: smsApiKey ? '***' : '(not set)' },
  whatsapp: { enabled: whatsappEnabled, instanceId: whatsappInstance ? '***' : '(not set)' },
  mpesa: { enabled: mpesaEnabled, shortcode: mpesaShortcode ? '***' : '(not set)' }
}, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
};

export default SimpleIntegrationSettings;

