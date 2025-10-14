// Enhanced SMS Service with AI Integration
import { supabase } from '../lib/supabaseClient';
import geminiService from './geminiService';
import { updateIntegrationUsage } from '../lib/integrationsApi';

export interface SMSLog {
  id: string;
  recipient_phone: string;
  message: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  error_message?: string;
  sent_at?: string;
  sent_by?: string;
  created_at: string;
  device_id?: string;
  cost?: number;
}

export interface SMSTemplate {
  id: string;
  title: string;
  content: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  ai_optimized?: boolean;
}

export interface BulkSMSRequest {
  recipients: string[];
  message: string;
  template_id?: string;
  variables?: Record<string, string>;
  ai_enhanced?: boolean;
  personalization_data?: any;
  scheduled_for?: Date;
  created_by?: string;
}

export interface AISMSAnalysis {
  message_quality: number; // 0-1
  suggested_improvements: string[];
  personalization_suggestions: string[];
  optimal_send_time?: string;
  customer_segment_insights?: string;
}

class SMSService {
  private apiKey: string | null = null;
  private apiUrl: string | null = null;
  private apiPassword: string | null = null;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.initializationPromise = this.initializeService();
  }

  private async initializeService() {
    // Load SMS configuration from integrations
    try {
      console.log('🔧 Initializing SMS service from integrations...');
      
      // Get full integration (not just credentials) to access config
      const { getIntegration } = await import('../lib/integrationsApi');
      const integration = await getIntegration('SMS_GATEWAY');
      
      if (!integration || !integration.is_enabled) {
        console.warn('⚠️ SMS integration not configured. Please set up SMS in Admin Settings → Integrations');
        return;
      }

      // Set credentials from integrations (credentials field)
      this.apiKey = integration.credentials?.api_key || null;
      this.apiPassword = integration.credentials?.api_password || integration.credentials?.api_secret || null;
      
      // Set API URL from config field (not credentials)
      this.apiUrl = integration.config?.api_url || 'https://mshastra.com/sendurl.aspx'; // Correct MShastra URL
      
      console.log('✅ SMS credentials loaded from integrations');
      console.log('🔑 API Key:', this.apiKey ? '✅ Configured' : '❌ Missing');
      console.log('🌐 API URL:', this.apiUrl ? '✅ Configured' : '❌ Missing');
      console.log('🔐 Password:', this.apiPassword ? '✅ Configured' : '❌ Missing');
      
      if (!this.apiKey || !this.apiUrl) {
        console.warn('⚠️ SMS service not fully configured. SMS notifications will fail.');
        console.warn('💡 To configure SMS in Admin Settings → Integrations');
      } else {
        console.log('✅ SMS service initialized successfully');
      }
      
      this.initialized = true;
    } catch (error) {
      console.warn('❌ SMS service configuration error:', error);
      this.initialized = true; // Still mark as initialized to prevent infinite waiting
    }
  }

  /**
   * Ensure SMS service is initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized && this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  /**
   * Send SMS with AI enhancement
   */
  async sendSMS(phone: string, message: string, options?: { ai_enhanced?: boolean }): Promise<{ success: boolean; error?: string; log_id?: string }> {
    try {
      // Ensure service is initialized
      await this.ensureInitialized();
      
      // AI enhancement if requested
      let enhancedMessage = message;
      let ai_enhanced = false;
      let personalization_data = null;

      if (options?.ai_enhanced) {
        const aiResult = await this.enhanceMessageWithAI(message, phone);
        if (aiResult.success) {
          enhancedMessage = aiResult.enhanced_message;
          ai_enhanced = true;
          personalization_data = aiResult.personalization_data;
        }
      }

      // Send the SMS
      const result = await this.sendSMSToProvider(phone, enhancedMessage);
      
      // Track usage in integrations (non-blocking)
      updateIntegrationUsage('SMS_GATEWAY', result.success).catch(err => 
        console.warn('Could not update integration usage:', err)
      );
      
      // Log the SMS
      const logData: any = {
        recipient_phone: phone,
        message: enhancedMessage,
        status: result.success ? 'sent' : 'failed',
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      // Only include error_message if it exists
      if (result.error) {
        logData.error_message = result.error;
      }

      const { data: log, error: logError } = await supabase
        .from('sms_logs')
        .insert(logData)
        .select()
        .single();

      if (logError) {
        console.error('Error logging SMS:', logError);
      }

      return {
        success: result.success,
        error: result.error,
        log_id: log?.id
      };
    } catch (error) {
      console.error('SMS send error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send bulk SMS with AI personalization
   */
  async sendBulkSMS(request: BulkSMSRequest): Promise<{ success: boolean; sent: number; failed: number; errors: string[] }> {
    const results = {
      success: true,
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      // AI analysis of the bulk campaign
      if (request.ai_enhanced) {
        const analysis = await this.analyzeBulkCampaign(request);
        console.log('AI Campaign Analysis:', analysis);
      }

      // Process each recipient
      for (const recipient of request.recipients) {
        try {
          let personalizedMessage = request.message;

          // Apply personalization if data is provided
          if (request.personalization_data && request.personalization_data[recipient]) {
            const customerData = request.personalization_data[recipient];
            personalizedMessage = this.personalizeMessage(request.message, customerData);
          }

          // Send SMS
          const result = await this.sendSMS(recipient, personalizedMessage, {
            ai_enhanced: request.ai_enhanced
          });

          if (result.success) {
            results.sent++;
          } else {
            results.failed++;
            results.errors.push(`${recipient}: ${result.error}`);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          results.failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`${recipient}: ${errorMessage}`);
        }
      }

      return results;
    } catch (error) {
      console.error('Bulk SMS error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        sent: results.sent,
        failed: results.failed,
        errors: [...results.errors, errorMessage]
      };
    }
  }

  /**
   * Enhance message with AI
   */
  private async enhanceMessageWithAI(message: string, phone?: string): Promise<{
    success: boolean;
    enhanced_message: string;
    personalization_data?: any;
  }> {
    try {
      // Get customer data if phone is provided
      let customerData = null;
      if (phone) {
        const { data: customer } = await supabase
          .from('customers')
          .select('*')
          .eq('phone', phone)
          .single();
        customerData = customer;
      }

      const prompt = `Enhance this SMS message for a device repair and sales business:

Original Message: "${message}"
${customerData ? `Customer Data: ${JSON.stringify(customerData, null, 2)}` : ''}

Requirements:
- Keep the core message intact
- Improve clarity and professionalism
- Add personalization if customer data is available
- Ensure it's under 160 characters
- Make it more engaging and actionable
- Use appropriate tone (friendly but professional)

Return only the enhanced message, no explanations.`;

      const response = await geminiService.chat([{ role: 'user', content: prompt }]);
      
      if (response.success && response.data) {
        return {
          success: true,
          enhanced_message: response.data.trim(),
          personalization_data: customerData
        };
      }
    } catch (error) {
      console.error('AI enhancement error:', error);
    }

    return {
      success: false,
      enhanced_message: message
    };
  }

  /**
   * Analyze bulk SMS campaign with AI
   */
  private async analyzeBulkCampaign(request: BulkSMSRequest): Promise<AISMSAnalysis> {
    try {
      const prompt = `Analyze this bulk SMS campaign for a device repair and sales business:

Message: "${request.message}"
Recipients: ${request.recipients.length} customers
${request.personalization_data ? `Personalization: Enabled` : 'Personalization: Disabled'}

Please analyze and provide:
1. Message quality score (0-1)
2. Suggested improvements
3. Personalization suggestions
4. Optimal send time recommendations
5. Customer segment insights

Respond in JSON format:
{
  "message_quality": 0.8,
  "suggested_improvements": ["Add call-to-action", "Include business name"],
  "personalization_suggestions": ["Use customer name", "Reference loyalty level"],
  "optimal_send_time": "10:00 AM - 2:00 PM",
  "customer_segment_insights": "This message targets..."
}`;

      const response = await geminiService.chat([{ role: 'user', content: prompt }]);
      
      if (response.success && response.data) {
        try {
          return JSON.parse(response.data);
        } catch (parseError) {
          console.error('Failed to parse AI analysis:', parseError);
        }
      }
    } catch (error) {
      console.error('AI campaign analysis error:', error);
    }

    return {
      message_quality: 0.5,
      suggested_improvements: [],
      personalization_suggestions: []
    };
  }

  /**
   * Personalize message with customer data
   */
  private personalizeMessage(message: string, customerData: any): string {
    let personalized = message;
    
    // Replace placeholders with customer data
    if (customerData.name) {
      personalized = personalized.replace(/{name}/g, customerData.name);
    }
    if (customerData.loyaltyLevel) {
      personalized = personalized.replace(/{loyaltyLevel}/g, customerData.loyaltyLevel);
    }
    if (customerData.totalSpent) {
      personalized = personalized.replace(/{totalSpent}/g, customerData.totalSpent.toString());
    }
    if (customerData.points) {
      personalized = personalized.replace(/{points}/g, customerData.points.toString());
    }
    
    return personalized;
  }

  /**
   * Send SMS to provider via backend proxy (to avoid CORS issues)
   */
  private async sendSMSToProvider(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
    // Ensure service is initialized
    await this.ensureInitialized();
    
    console.log('🔍 DEBUG: sendSMSToProvider called with:', {
      phone,
      message: message.substring(0, 50) + '...',
      apiKey: this.apiKey ? '✅ Set' : '❌ Not Set',
      apiUrl: this.apiUrl ? '✅ Set' : '❌ Not Set',
      apiPassword: this.apiPassword ? '✅ Set' : '❌ Not Set',
      initialized: this.initialized
    });
    
    if (!this.apiKey || !this.apiUrl) {
      console.warn('📱 SMS Configuration Missing:');
      console.warn('   - sms_provider_api_key: ' + (this.apiKey ? '✅ Configured' : '❌ Missing'));
      console.warn('   - sms_api_url: ' + (this.apiUrl ? '✅ Configured' : '❌ Missing'));
      console.warn('   - sms_provider_password: ' + (this.apiPassword ? '✅ Configured' : '❌ Missing'));
      console.warn('');
      console.warn('📋 To configure SMS, run this SQL in your Neon database:');
      console.warn('');
      console.warn('   INSERT INTO settings (key, value, description, created_at, updated_at) VALUES');
      console.warn('   (\'sms_provider_api_key\', \'your_api_key\', \'SMS Provider API Key\', NOW(), NOW()),');
      console.warn('   (\'sms_api_url\', \'https://your-provider.com/api/send\', \'SMS API URL\', NOW(), NOW()),');
      console.warn('   (\'sms_provider_password\', \'your_password\', \'SMS Provider Password\', NOW(), NOW())');
      console.warn('   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();');
      console.warn('');
      console.warn('ℹ️  Until configured, SMS sending will be simulated (logged only, not actually sent).');
      return { success: false, error: 'SMS provider not configured. Messages will be logged but not sent. Check console for setup instructions.' };
    }

    try {
      // For testing purposes, if using a test phone number, simulate success
      if (phone === '255700000000' || phone.startsWith('255700')) {
        console.log('🧪 Test SMS - simulating success for phone:', phone);
        return { success: true };
      }

      // Use backend proxy to avoid CORS issues
      // In production, use environment variable; in development, use localhost
      const proxyUrl = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/api/sms-proxy`
        : 'http://localhost:8000/api/sms-proxy';
      
      console.log('📱 Sending SMS via MShastra backend proxy...');
      console.log('   Phone:', phone);
      console.log('   Message:', message.substring(0, 50) + '...');
      console.log('   Provider: MShastra');

      // Get fresh credentials from integrations for all fields
      const { getIntegration } = await import('../lib/integrationsApi');
      const integration = await getIntegration('SMS_GATEWAY');
      const senderId = integration?.credentials?.sender_id || 'LATS POS';
      const apiUrl = integration?.config?.api_url || this.apiUrl || 'https://mshastra.com/sendurl.aspx';
      const apiKey = integration?.credentials?.api_key || this.apiKey;
      const apiPassword = integration?.credentials?.api_password || this.apiPassword;

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone,
          message,
          apiUrl: apiUrl,
          apiKey: apiKey,
          apiPassword: apiPassword,
          senderId: senderId
        })
      });
      
      console.log('🔍 DEBUG: Request payload:', {
        phone,
        message: message.substring(0, 50) + '...',
        apiUrl: this.apiUrl,
        apiKey: this.apiKey,
        apiPassword: this.apiPassword,
        senderId: 'INAUZWA'
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ SMS sent successfully via proxy');
        return { success: true };
      } else {
        console.error('📱 SMS Provider Error via proxy:', result.error);
        return { success: false, error: result.error || 'SMS sending failed' };
      }
    } catch (error) {
      // Check if it's a connection refused error (expected when proxy server is down)
      const errorMessage = error instanceof Error ? error.message : 'Unknown network error';
      const isConnectionError = errorMessage.includes('Failed to fetch') || 
                               errorMessage.includes('ERR_CONNECTION_REFUSED') ||
                               errorMessage.includes('ECONNREFUSED');
      
      if (isConnectionError) {
        console.log('ℹ️  SMS proxy server not available - skipping SMS (expected in dev environment)');
        return { success: false, error: 'SMS proxy server not available' };
      }
      
      console.error('📱 SMS Network Error:', error);
      return { success: false, error: `Network error: ${errorMessage}` };
    }
  }

  /**
   * Get SMS logs with AI enhancement info
   */
  async getSMSLogs(filters?: { search?: string }): Promise<SMSLog[]> {
    try {
      let query = supabase
        .from('sms_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.or(`recipient_phone.ilike.%${filters.search}%,message.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching SMS logs:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching SMS logs:', error);
      return [];
    }
  }

  /**
   * Get SMS templates
   */
  async getTemplates(): Promise<SMSTemplate[]> {
    try {
      const { data } = await supabase
        .from('communication_templates')
        .select('*')
        .eq('template_type', 'sms')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      return data || [];
    } catch (error) {
      console.error('Error fetching templates:', error);
      return [];
    }
  }

  /**
   * Get SMS statistics
   */
  async getSMSStats(): Promise<{ total: number; sent: number; failed: number; pending: number; delivered: number; totalCost: number }> {
    try {
      const { data } = await supabase
        .from('sms_logs')
        .select('status, created_at');

      if (!data) return { total: 0, sent: 0, failed: 0, pending: 0, delivered: 0, totalCost: 0 };

      const stats = {
        total: data.length,
        sent: data.filter(log => log.status === 'sent').length,
        failed: data.filter(log => log.status === 'failed').length,
        pending: data.filter(log => log.status === 'pending').length,
        delivered: data.filter(log => log.status === 'delivered').length,
        totalCost: data.length * 15 // Assuming 15 TZS per SMS
      };

      return stats;
    } catch (error) {
      console.error('Error fetching SMS stats:', error);
      return { total: 0, sent: 0, failed: 0, pending: 0, delivered: 0, totalCost: 0 };
    }
  }

  /**
   * Resend failed SMS
   */
  async resendSMS(logId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the original SMS log
      const { data: log } = await supabase
        .from('sms_logs')
        .select('*')
        .eq('id', logId)
        .single();

      if (!log) {
        return { success: false, error: 'SMS log not found' };
      }

      // Resend the SMS
      const result = await this.sendSMS(log.recipient_phone, log.message);

      // Update the log
      await supabase
        .from('sms_logs')
        .update({
          status: result.success ? 'sent' : 'failed',
          error_message: result.error,
          sent_at: new Date().toISOString()
        })
        .eq('id', logId);

      return result;
    } catch (error) {
      console.error('Resend SMS error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Schedule SMS
   */
  async scheduleSMS(request: BulkSMSRequest & { scheduledFor: Date }): Promise<{ success: boolean; error?: string }> {
    try {
      const { data } = await supabase
        .from('scheduled_sms')
        .insert({
          recipients: request.recipients,
          message: request.message,
          template_id: request.template_id,
          variables: request.variables,
          ai_enhanced: request.ai_enhanced,
          personalization_data: request.personalization_data,
          scheduled_for: request.scheduledFor.toISOString(),
          created_by: request.created_by,
          status: 'pending'
        });

      return { success: true };
    } catch (error) {
      console.error('Schedule SMS error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Log manual SMS message
   */
  async logManualSMS(data: {
    deviceId: string;
    customerId: string;
    sentBy: string;
    message: string;
  }): Promise<boolean> {
    try {
      // Get customer phone number for logging
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('phone')
        .eq('id', data.customerId)
        .single();

      if (customerError) {
        console.error('Error fetching customer for SMS logging:', customerError);
        return false;
      }

      const { error } = await supabase
        .from('sms_logs')
        .insert({
          recipient_phone: customer?.phone || '',
          message: data.message,
          status: 'sent',
          sent_by: data.sentBy,
          device_id: data.deviceId,
          sent_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging manual SMS:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error logging manual SMS:', error);
      return false;
    }
  }

  /**
   * Send device received SMS notification
   */
  async sendDeviceReceivedSMS(
    phone: string,
    customerName: string,
    deviceBrand: string,
    deviceModel: string,
    deviceId: string,
    issueDescription: string,
    customerId: string
  ): Promise<{ success: boolean; error?: string; log_id?: string }> {
    try {
      // Create the SMS message using the device received template
      const message = `✅ Tumepokea Kimepokelewa!

Hellow Mtaasisi ${customerName},

Habari njema! ${deviceBrand} ${deviceModel} yako imepokelewa na sasa iko katika foleni ya ukarabati wa Inauzwa.

📋 Namba ya Kumbukumbu: #${deviceId}
📅 Tarehe ya Kupokea: ${new Date().toLocaleDateString('sw-TZ')}
🔧 Tatizo: ${issueDescription}

Subiri ujumbe kupitia SMS kikiwa tayari!

Asante kwa kumtumaini Inauzwa 🚀`;

      // Send the SMS using the existing sendSMS method
      const result = await this.sendSMS(phone, message, { ai_enhanced: false });

      // Log additional device-specific information if SMS was sent successfully
      if (result.success && result.log_id) {
        try {
          await supabase
            .from('sms_logs')
            .update({
              device_id: deviceId
            })
            .eq('id', result.log_id);
        } catch (updateError) {
          console.warn('Failed to update SMS log with device data:', updateError);
        }
      }

      return result;
    } catch (error) {
      console.error('Error sending device received SMS:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send device ready SMS notification
   */
  async sendDeviceReadySMS(
    phone: string,
    customerName: string,
    deviceBrand: string,
    deviceModel: string,
    deviceId: string,
    customerId: string
  ): Promise<{ success: boolean; error?: string; log_id?: string }> {
    try {
      // Create the SMS message using the device ready template
      const message = `🎉 Kifaa Chako Tayari!

Habari Mtaasisi ${customerName},

Habari njema! ${deviceBrand} ${deviceModel} yako imekamilika na tayari kuchukuliwa.

📋 Namba ya Kumbukumbu: #${deviceId}
✅ Tarehe ya Kukamilisha: ${new Date().toLocaleDateString('sw-TZ')}

Tafadhali uje kuchukua kifaa chako katika ofisi yetu ndani ya muda ili kuepuka usumbufu.

Asante kwa kumtumaini Inauzwa! 🚀`;

      // Send the SMS using the existing sendSMS method
      const result = await this.sendSMS(phone, message, { ai_enhanced: false });

      // Log additional device-specific information if SMS was sent successfully
      if (result.success && result.log_id) {
        try {
          await supabase
            .from('sms_logs')
            .update({
              device_id: deviceId
            })
            .eq('id', result.log_id);
        } catch (updateError) {
          console.warn('Failed to update SMS log with device data:', updateError);
        }
      }

      return result;
    } catch (error) {
      console.error('Error sending device ready SMS:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send template SMS with variables
   */
  async sendTemplateSMS(
    phone: string,
    templateId: string,
    variables: Record<string, string>,
    customerId?: string
  ): Promise<{ success: boolean; error?: string; log_id?: string }> {
    try {
      // Get template from database
      const { data: template, error: templateError } = await supabase
        .from('sms_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError || !template) {
        return { success: false, error: 'Template not found' };
      }

      // Replace variables in template content
      let message = template.content;
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{${key}}`;
        message = message.replace(new RegExp(placeholder, 'g'), value);
      });

      // Send the SMS using the existing sendSMS method
      const result = await this.sendSMS(phone, message, { ai_enhanced: false });

      // Log additional template information if SMS was sent successfully
      if (result.success && result.log_id) {
        try {
          // Note: personalization_data field is not available in current schema
          // Template information is already included in the message content
          console.log('Template SMS sent successfully:', {
            template_id: templateId,
            template_name: template.name,
            variables,
            customer_id: customerId
          });
        } catch (updateError) {
          console.warn('Failed to log template SMS data:', updateError);
        }
      }

      return result;
    } catch (error) {
      console.error('Error sending template SMS:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }
}

// Create singleton instance
const smsService = new SMSService();

// Export the logManualSMS function
const logManualSMS = async (data: {
  deviceId: string;
  customerId: string;
  sentBy: string;
  message: string;
}): Promise<boolean> => {
  return smsService.logManualSMS(data);
};

export { smsService, logManualSMS }; 