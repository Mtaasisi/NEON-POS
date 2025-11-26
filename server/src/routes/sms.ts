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
    
    const { 
      phone, 
      message, 
      apiUrl, 
      apiKey, 
      apiPassword, 
      senderId = 'INAUZWA',
      priority = 'High',
      countryCode = 'ALL',
      timeout = 30000,
      maxRetries = 3
    } = req.body;

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

    // ✅ FIX: Normalize phone number for MShastra (remove +, ensure 255XXXXXXXXX format)
    let normalizedPhone = phone;
    if (apiUrl.includes('mshastra.com')) {
      // Remove all non-numeric characters
      normalizedPhone = phone.replace(/\D/g, '');
      
      // Convert to MShastra format: 255XXXXXXXXX (12 digits)
      if (normalizedPhone.startsWith('0')) {
        // Local format: 0XXXXXXXXX -> 255XXXXXXXXX
        normalizedPhone = '255' + normalizedPhone.substring(1);
      } else if (normalizedPhone.startsWith('255')) {
        // Already in international format
        normalizedPhone = normalizedPhone;
      } else if (normalizedPhone.length === 9) {
        // 9 digits without country code -> add 255
        normalizedPhone = '255' + normalizedPhone;
      }
      
      // Validate: should be 12 digits starting with 255
      if (!/^255[67]\d{8}$/.test(normalizedPhone)) {
        console.error('❌ Invalid phone number format for MShastra:', phone, '->', normalizedPhone);
        return res.status(400).json({
          success: false,
          error: `Invalid phone number format. Expected: 255XXXXXXXXX (12 digits), got: ${normalizedPhone}`
        });
      }
    }

    console.log('📱 SMS Details:');
    console.log('   Original Phone:', phone);
    console.log('   Normalized Phone:', normalizedPhone);
    console.log('   Message:', message.substring(0, 50) + '...');
    console.log('   API URL:', apiUrl);
    console.log('   Sender ID:', senderId);

    // For testing purposes, if using a test phone number, simulate success
    if (normalizedPhone === '255700000000' || normalizedPhone.startsWith('255700')) {
      console.log('🧪 Test SMS - simulating success');
      return res.json({
        success: true,
        status: 200,
        data: {
          message: 'Test SMS simulated successfully',
          phone: normalizedPhone,
          test_mode: true
        }
      });
    }

    // Prepare SMS request based on provider (use normalized phone)
    const providerData = prepareSMSRequest(apiUrl, normalizedPhone, message, apiKey, apiPassword || apiKey, senderId, priority, countryCode);

    console.log('🌐 Sending to provider:');
    console.log('   URL:', providerData.url);
    console.log('   Method:', providerData.method);

    // Make the request to SMS provider with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(providerData.url, {
        method: providerData.method,
        headers: providerData.headers.reduce((acc, header) => {
          const [key, value] = header.split(': ');
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>),
        body: providerData.body || undefined,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const responseText = await response.text();
      console.log('📥 Full Provider Response:');
      console.log('   Status Code:', response.status);
      console.log('   Response Text:', responseText);
      console.log('   Response Length:', responseText.length);

      // Parse response based on provider
      const result = parseSMSResponse(apiUrl, responseText, response.status);
      
      console.log('📊 Parsed Result:', JSON.stringify(result, null, 2));

      return res.status(response.status).json({
        success: result.success,
        status: response.status,
        data: result.data,
        error: result.error || null
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Check if it was a timeout
      if (fetchError.name === 'AbortError' || controller.signal.aborted) {
        console.error('❌ SMS request timeout after', timeout, 'ms');
        return res.status(408).json({
          success: false,
          error: `SMS request timed out after ${timeout}ms`
        });
      }
      
      // Re-throw other errors
      throw fetchError;
    }

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
  senderId: string,
  priority: string = 'High',
  countryCode: string = 'ALL'
): {
  url: string;
  method: string;
  headers: string[];
  body: string;
} {
  // Detect provider based on URL
  if (apiUrl.includes('mshastra.com')) {
    // Mobishastra provider - uses GET request with query parameters
    // Note: MShastra expects phone number in format: 255XXXXXXXXX (no +, no spaces)
    const params = new URLSearchParams({
      user: apiKey,
      pwd: apiPassword,
      senderid: senderId,
      mobileno: phone, // Should already be normalized to 255XXXXXXXXX
      msgtext: message,
      priority: priority,
      CountryCode: countryCode
    });

    const fullUrl = `${apiUrl}?${params.toString()}`;
    console.log('🔗 MShastra API URL (without credentials):', 
      fullUrl.replace(/user=[^&]+/, 'user=***').replace(/pwd=[^&]+/, 'pwd=***'));

    return {
      url: fullUrl,
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
    const trimmedResponse = response.trim().toLowerCase();

    console.log('🔍 Parsing MShastra response:', trimmedResponse);

    // Check for success indicators (MShastra can return various success messages)
    const successPatterns = [
      'send successful',
      'success',
      '000',
      'message sent',
      'sms sent',
      'delivered',
      'sent successfully'
    ];
    
    const isSuccess = successPatterns.some(pattern => trimmedResponse.includes(pattern));
    
    if (isSuccess || httpCode === 200) {
      return {
        success: true,
        data: {
          message: 'SMS sent successfully',
          provider_response: response.trim(),
          status_code: httpCode === 200 ? '200' : '000',
          raw_response: response.trim()
        }
      };
    } else {
      // Handle error responses
      let errorMessage = 'SMS sending failed';
      const lowerResponse = trimmedResponse;
      
      if (lowerResponse.includes('invalid mobile') || lowerResponse.includes('invalid number')) {
        errorMessage = 'Invalid mobile number format';
      } else if (lowerResponse.includes('invalid password') || lowerResponse.includes('invalid user')) {
        errorMessage = 'Invalid API credentials (username or password)';
      } else if (lowerResponse.includes('no more credits') || lowerResponse.includes('insufficient')) {
        errorMessage = 'Insufficient account balance';
      } else if (lowerResponse.includes('blocked') || lowerResponse.includes('profile id blocked')) {
        errorMessage = 'Account is blocked';
      } else if (lowerResponse.includes('invalid sender')) {
        errorMessage = 'Invalid sender ID';
      } else if (lowerResponse.includes('timeout') || lowerResponse.includes('connection')) {
        errorMessage = 'Connection timeout or network error';
      }

      console.error('❌ MShastra error response:', response.trim());
      return {
        success: false,
        data: null,
        error: `${errorMessage}. Provider response: ${response.trim()}`
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

