# 🚀 Integration Settings - Complete Usage Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Database Setup](#database-setup)
3. [TypeScript API](#typescript-api)
4. [React Form Example](#react-form-example)
5. [Using Integrations](#using-integrations)
6. [Security Best Practices](#security-best-practices)

---

## 🎯 Overview

This integration system allows you to add ANY third-party service to your POS by storing credentials in the database. No more hardcoding API keys!

### Supported Integration Types:
- 📱 **SMS**: Twilio, Africa's Talking, etc.
- 📧 **Email**: SendGrid, Mailgun, SMTP, etc.
- 💳 **Payment**: Stripe, M-Pesa, PayPal, etc.
- 📊 **Analytics**: Google Analytics, Mixpanel, etc.
- 🚚 **Shipping**: Local delivery APIs, DHL, FedEx, etc.
- 🔗 **Custom**: Any API you want to integrate!

---

## 💾 Database Setup

### Step 1: Create the Table
Run this in your Neon database console:

```bash
CREATE-INTEGRATIONS-SETTINGS.sql
```

### Step 2: Add Example Data
Modify and run:

```bash
EXAMPLE-INTEGRATIONS-INSERT.sql
```

Replace `'YOUR_USER_ID'` with your actual user ID:
```sql
SELECT id FROM auth.users WHERE email = 'your@email.com';
```

---

## 🔧 TypeScript API

### 1. Create the API File

Create `src/lib/api/integrationsApi.ts`:

```typescript
import { supabase } from '@/lib/supabase';

export interface Integration {
  id: string;
  user_id: string;
  business_id?: string;
  integration_name: string;
  integration_type: string;
  provider_name?: string;
  is_enabled: boolean;
  is_active: boolean;
  is_test_mode: boolean;
  credentials: Record<string, any>;
  config: Record<string, any>;
  description?: string;
  environment: 'test' | 'production' | 'sandbox';
  last_used_at?: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Get all integrations
export async function getAllIntegrations(): Promise<Integration[]> {
  const { data, error } = await supabase
    .from('lats_pos_integrations_settings')
    .select('*')
    .order('integration_type', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Get integrations by type
export async function getIntegrationsByType(type: string): Promise<Integration[]> {
  const { data, error } = await supabase
    .from('lats_pos_integrations_settings')
    .select('*')
    .eq('integration_type', type)
    .order('integration_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Get specific integration
export async function getIntegration(integrationName: string): Promise<Integration | null> {
  const { data, error } = await supabase
    .from('lats_pos_integrations_settings')
    .select('*')
    .eq('integration_name', integrationName)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

// Get only enabled integrations
export async function getEnabledIntegrations(): Promise<Integration[]> {
  const { data, error } = await supabase
    .from('lats_pos_integrations_settings')
    .select('*')
    .eq('is_enabled', true)
    .eq('is_active', true)
    .order('integration_type', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Create new integration
export async function createIntegration(integration: Partial<Integration>): Promise<Integration> {
  const { data: userData } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('lats_pos_integrations_settings')
    .insert({
      ...integration,
      user_id: userData?.user?.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update integration
export async function updateIntegration(
  integrationName: string,
  updates: Partial<Integration>
): Promise<Integration> {
  const { data, error } = await supabase
    .from('lats_pos_integrations_settings')
    .update(updates)
    .eq('integration_name', integrationName)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete integration
export async function deleteIntegration(integrationName: string): Promise<void> {
  const { error } = await supabase
    .from('lats_pos_integrations_settings')
    .delete()
    .eq('integration_name', integrationName);

  if (error) throw error;
}

// Enable/Disable integration
export async function toggleIntegration(
  integrationName: string,
  enabled: boolean
): Promise<Integration> {
  return updateIntegration(integrationName, {
    is_enabled: enabled,
    is_active: enabled,
  });
}

// Update usage statistics
export async function updateUsageStats(
  integrationName: string,
  success: boolean
): Promise<void> {
  const integration = await getIntegration(integrationName);
  if (!integration) return;

  await updateIntegration(integrationName, {
    last_used_at: new Date().toISOString(),
    total_requests: integration.total_requests + 1,
    successful_requests: success 
      ? integration.successful_requests + 1 
      : integration.successful_requests,
    failed_requests: !success 
      ? integration.failed_requests + 1 
      : integration.failed_requests,
  });
}

// Get credentials for an integration
export async function getCredentials(integrationName: string): Promise<Record<string, any> | null> {
  const integration = await getIntegration(integrationName);
  if (!integration || !integration.is_enabled) return null;
  return integration.credentials;
}

// Update credentials only
export async function updateCredentials(
  integrationName: string,
  credentials: Record<string, any>
): Promise<void> {
  await updateIntegration(integrationName, { credentials });
}

// Test integration (helper function)
export async function testIntegration(integrationName: string): Promise<boolean> {
  const integration = await getIntegration(integrationName);
  if (!integration) throw new Error('Integration not found');
  
  // Add your test logic here based on integration type
  console.log(`Testing ${integrationName}...`);
  
  return true; // Return test result
}
```

---

## 🎨 React Form Example

### Integration Settings Form Component

Create `src/components/IntegrationSettingsForm.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { getIntegration, updateIntegration, createIntegration } from '@/lib/api/integrationsApi';

interface IntegrationFormProps {
  integrationName: string;
  integrationType: string;
  providerName: string;
}

export function IntegrationSettingsForm({ 
  integrationName, 
  integrationType,
  providerName 
}: IntegrationFormProps) {
  const [loading, setLoading] = useState(false);
  const [integration, setIntegration] = useState<any>(null);
  
  // SMS Gateway Example Fields
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [messagingServiceSid, setMessagingServiceSid] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isTestMode, setIsTestMode] = useState(true);

  useEffect(() => {
    loadIntegration();
  }, [integrationName]);

  const loadIntegration = async () => {
    try {
      const data = await getIntegration(integrationName);
      if (data) {
        setIntegration(data);
        setAccountSid(data.credentials?.account_sid || '');
        setAuthToken(data.credentials?.auth_token || '');
        setMessagingServiceSid(data.credentials?.messaging_service_sid || '');
        setIsEnabled(data.is_enabled);
        setIsTestMode(data.is_test_mode);
      }
    } catch (error) {
      console.error('Error loading integration:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const credentials = {
        account_sid: accountSid,
        auth_token: authToken,
        messaging_service_sid: messagingServiceSid,
      };

      const config = {
        default_sender: '+1234567890',
        max_retries: 3,
        timeout: 30000,
      };

      if (integration) {
        // Update existing
        await updateIntegration(integrationName, {
          credentials,
          config,
          is_enabled: isEnabled,
          is_test_mode: isTestMode,
          environment: isTestMode ? 'test' : 'production',
        });
      } else {
        // Create new
        await createIntegration({
          integration_name: integrationName,
          integration_type: integrationType,
          provider_name: providerName,
          credentials,
          config,
          is_enabled: isEnabled,
          is_test_mode: isTestMode,
          environment: isTestMode ? 'test' : 'production',
          description: `${providerName} integration`,
        });
      }

      alert('Integration saved successfully!');
      loadIntegration();
    } catch (error) {
      console.error('Error saving integration:', error);
      alert('Error saving integration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">
        {providerName} Settings
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
          <label className="font-medium">Enable Integration</label>
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            className="w-5 h-5"
          />
        </div>

        {/* Test Mode Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
          <label className="font-medium">Test Mode</label>
          <input
            type="checkbox"
            checked={isTestMode}
            onChange={(e) => setIsTestMode(e.target.checked)}
            className="w-5 h-5"
          />
        </div>

        {/* Account SID */}
        <div>
          <label className="block font-medium mb-2">Account SID</label>
          <input
            type="text"
            value={accountSid}
            onChange={(e) => setAccountSid(e.target.value)}
            className="w-full p-3 border rounded"
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            required
          />
        </div>

        {/* Auth Token */}
        <div>
          <label className="block font-medium mb-2">Auth Token</label>
          <input
            type="password"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            className="w-full p-3 border rounded"
            placeholder="Your auth token"
            required
          />
        </div>

        {/* Messaging Service SID */}
        <div>
          <label className="block font-medium mb-2">
            Messaging Service SID
          </label>
          <input
            type="text"
            value={messagingServiceSid}
            onChange={(e) => setMessagingServiceSid(e.target.value)}
            className="w-full p-3 border rounded"
            placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      {/* Status Display */}
      {integration && (
        <div className="mt-6 p-4 bg-gray-50 rounded">
          <h3 className="font-bold mb-2">Integration Status</h3>
          <div className="space-y-1 text-sm">
            <p>
              Status: {integration.is_enabled ? '✅ Enabled' : '❌ Disabled'}
            </p>
            <p>Environment: {integration.environment}</p>
            <p>Total Requests: {integration.total_requests}</p>
            <p>Success: {integration.successful_requests}</p>
            <p>Failed: {integration.failed_requests}</p>
            {integration.last_used_at && (
              <p>Last Used: {new Date(integration.last_used_at).toLocaleString()}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 🔌 Using Integrations in Your Code

### Example: Send SMS

```typescript
import { getCredentials, updateUsageStats } from '@/lib/api/integrationsApi';

export async function sendSMS(to: string, message: string) {
  try {
    // Get credentials
    const credentials = await getCredentials('SMS_GATEWAY');
    if (!credentials) {
      throw new Error('SMS Gateway not configured or disabled');
    }

    // Use credentials to send SMS (example with Twilio)
    const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + credentials.account_sid + '/Messages.json', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(credentials.account_sid + ':' + credentials.auth_token),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: credentials.messaging_service_sid,
        Body: message,
      }),
    });

    if (!response.ok) {
      throw new Error('SMS sending failed');
    }

    // Update success statistics
    await updateUsageStats('SMS_GATEWAY', true);
    
    return await response.json();
  } catch (error) {
    // Update failure statistics
    await updateUsageStats('SMS_GATEWAY', false);
    throw error;
  }
}
```

### Example: Process Payment

```typescript
import { getCredentials, updateUsageStats } from '@/lib/api/integrationsApi';

export async function processStripePayment(amount: number, currency: string) {
  try {
    const credentials = await getCredentials('STRIPE_PAYMENT');
    if (!credentials) {
      throw new Error('Stripe not configured');
    }

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.secret_key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: (amount * 100).toString(),
        currency,
        'automatic_payment_methods[enabled]': 'true',
      }),
    });

    await updateUsageStats('STRIPE_PAYMENT', response.ok);
    return await response.json();
  } catch (error) {
    await updateUsageStats('STRIPE_PAYMENT', false);
    throw error;
  }
}
```

---

## 🔒 Security Best Practices

### 1. **Encrypt Sensitive Data** (Recommended)

For production, consider encrypting credentials:

```typescript
// Use a library like crypto-js
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY!;

export function encryptCredentials(credentials: any): string {
  return CryptoJS.AES.encrypt(
    JSON.stringify(credentials),
    ENCRYPTION_KEY
  ).toString();
}

export function decryptCredentials(encrypted: string): any {
  const decrypted = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
  return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
}
```

### 2. **Use Environment Variables for Keys**

Never commit encryption keys or sensitive data to Git.

### 3. **Implement Access Controls**

The RLS policies ensure users can only see their own integrations.

### 4. **Use Test Mode First**

Always test with sandbox/test credentials before going live.

### 5. **Regular Credential Rotation**

Update credentials periodically for better security.

### 6. **Monitor Usage**

Track failed requests to detect potential issues or attacks.

---

## 🎉 You're All Set!

You can now integrate ANY service by:
1. Adding credentials through the settings form
2. Saving to the database
3. Using them in your code

No more hardcoded API keys! 🚀

