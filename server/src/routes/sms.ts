/**
 * SMS Proxy Route
 * Handles SMS sending through third-party providers
 */

import express from 'express';

const router = express.Router();

/**
 * Send SMS via provider
 */
router.post('/sms-proxy', async (req, res) => {
  try {
    console.log('📥 SMS Proxy Request received');
    
    const { phone, message, apiUrl, apiKey, apiPassword, senderId = 'INAUZWA' } = req.body;

    // Validate required fields
    if (!phone || !message || !apiUrl || !apiKey) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: phone, message, apiUrl, apiKey'
      });
    }

    // Additional validation for null/empty values
    if (!apiKey || apiKey === 'null' || apiKey === '') {
      console.error('❌ API Key is null or empty');
      return res.status(400).json({
        success: false,
        error: 'SMS API Key is not configured. Please configure SMS settings first.'
      });
    }

    if (!apiUrl || apiUrl === 'null' || apiUrl === '') {
      console.error('❌ API URL is null or empty');
      return res.status(400).json({
        success: false,
        error: 'SMS API URL is not configured. Please configure SMS settings first.'
      });
    }

    console.log('📱 SMS Details:');
    console.log('   Phone:', phone);
    console.log('   Message:', message.substring(0, 50) + '...');
    console.log('   API URL:', apiUrl);
    console.log('   Sender ID:', senderId);

    // For testing purposes, if using a test phone number, simulate success
    if (phone === '255700000000' || phone.startsWith('255700')) {
      console.log('🧪 Test SMS - simulating success');
      return res.json({
        success: true,
        status: 200,
        data: {
          message: 'Test SMS simulated successfully',
          phone: phone,
          test_mode: true
        }
      });
    }

    // Prepare SMS request based on provider
    const providerData = prepareSMSRequest(apiUrl, phone, message, apiKey, apiPassword || apiKey, senderId);

    console.log('🌐 Sending to provider:');
    console.log('   URL:', providerData.url);
    console.log('   Method:', providerData.method);

    // Make the request to SMS provider
    const response = await fetch(providerData.url, {
      method: providerData.method,
      headers: providerData.headers.reduce((acc, header) => {
        const [key, value] = header.split(': ');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>),
      body: providerData.body || undefined
    });

    const responseText = await response.text();
    console.log('✅ Provider Response:', responseText.substring(0, 200));

    // Parse response based on provider
    const result = parseSMSResponse(apiUrl, responseText, response.status);

    return res.status(response.status).json({
      success: result.success,
      status: response.status,
      data: result.data,
      error: result.error || null
    });

  } catch (error) {
    console.error('❌ SMS Proxy Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * Prepare SMS request data based on the provider
 */
function prepareSMSRequest(
  apiUrl: string,
  phone: string,
  message: string,
  apiKey: string,
  apiPassword: string,
  senderId: string
): {
  url: string;
  method: string;
  headers: string[];
  body: string;
} {
  // Detect provider based on URL
  if (apiUrl.includes('mshastra.com')) {
    // Mobishastra provider - uses GET request with query parameters
    const params = new URLSearchParams({
      user: apiKey,
      pwd: apiPassword,
      senderid: senderId,
      mobileno: phone,
      msgtext: message,
      priority: 'High',
      CountryCode: 'ALL'
    });

    return {
      url: `${apiUrl}?${params.toString()}`,
      method: 'GET',
      headers: ['User-Agent: INAUZWA-SMS-Proxy/1.0'],
      body: ''
    };
  } else if (apiUrl.includes('smstanzania.com')) {
    // SMS Tanzania provider
    return {
      url: apiUrl,
      method: 'POST',
      headers: [
        'Content-Type: application/json',
        `Authorization: Bearer ${apiKey}`,
        'User-Agent: INAUZWA-SMS-Proxy/1.0'
      ],
      body: JSON.stringify({
        to: phone,
        message: message,
        sender_id: senderId
      })
    };
  } else if (apiUrl.includes('bulksms.com')) {
    // BulkSMS provider
    return {
      url: apiUrl,
      method: 'POST',
      headers: [
        'Content-Type: application/json',
        `Authorization: Bearer ${apiKey}`,
        'User-Agent: INAUZWA-SMS-Proxy/1.0'
      ],
      body: JSON.stringify({
        to: phone,
        message: message,
        sender_id: senderId
      })
    };
  } else {
    // Generic provider (default format)
    return {
      url: apiUrl,
      method: 'POST',
      headers: [
        'Content-Type: application/json',
        `Authorization: Bearer ${apiKey}`,
        'User-Agent: INAUZWA-SMS-Proxy/1.0'
      ],
      body: JSON.stringify({
        phone: phone,
        message: message,
        sender_id: senderId
      })
    };
  }
}

/**
 * Parse SMS response based on the provider
 */
function parseSMSResponse(
  apiUrl: string,
  response: string,
  httpCode: number
): {
  success: boolean;
  data: any;
  error?: string;
} {
  // Detect provider based on URL
  if (apiUrl.includes('mshastra.com')) {
    // Mobishastra returns simple text responses
    const trimmedResponse = response.trim();

    // Check for success indicators
    if (trimmedResponse.includes('Send Successful') || trimmedResponse.includes('000')) {
      return {
        success: true,
        data: {
          message: 'SMS sent successfully',
          provider_response: trimmedResponse,
          status_code: '000'
        }
      };
    } else {
      // Handle error responses
      let errorMessage = 'SMS sending failed';
      if (trimmedResponse.includes('Invalid Mobile No')) {
        errorMessage = 'Invalid mobile number';
      } else if (trimmedResponse.includes('Invalid Password')) {
        errorMessage = 'Invalid API credentials';
      } else if (trimmedResponse.includes('No More Credits')) {
        errorMessage = 'Insufficient account balance';
      } else if (trimmedResponse.includes('Profile Id Blocked')) {
        errorMessage = 'Account is blocked';
      }

      return {
        success: false,
        data: null,
        error: `${errorMessage}: ${trimmedResponse}`
      };
    }
  } else {
    // For JSON-based providers
    try {
      const responseData = JSON.parse(response);
      
      if (httpCode >= 200 && httpCode < 300) {
        return {
          success: true,
          data: responseData
        };
      } else {
        return {
          success: false,
          data: responseData,
          error: 'SMS sending failed'
        };
      }
    } catch (parseError) {
      // If response is not JSON, treat as raw text
      if (httpCode >= 200 && httpCode < 300) {
        return {
          success: true,
          data: { rawResponse: response }
        };
      } else {
        return {
          success: false,
          data: { rawResponse: response },
          error: 'SMS sending failed'
        };
      }
    }
  }
}

export default router;

