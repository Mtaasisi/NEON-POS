/**
 * Advanced WhatsApp Features - TypeScript Types
 */

// Campaign Analytics
export interface WhatsAppCampaign {
  id: string;
  name: string;
  message: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'document' | 'audio';
  
  total_recipients: number;
  recipients_data?: any;
  
  sent_count: number;
  success_count: number;
  failed_count: number;
  replied_count: number;
  
  settings?: CampaignSettings;
  
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  
  status: 'draft' | 'pending' | 'sending' | 'completed' | 'failed' | 'paused';
  
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignSettings {
  usePersonalization: boolean;
  randomDelay: boolean;
  minDelay: number;
  maxDelay: number;
  usePresence: boolean;
  messageVariation: boolean;
  respectBusinessHours: boolean;
  pauseOnFailure: boolean;
  varyPresenceType: boolean;
  batchMode: boolean;
  batchSize?: number;
  batchBreak?: number;
  maxPerHour: number;
  dailyLimit: number;
}

export interface CampaignMetrics {
  id: string;
  campaign_id: string;
  
  total_sent: number;
  total_delivered: number;
  total_read: number;
  total_replied: number;
  total_failed: number;
  
  avg_response_time_seconds?: number;
  first_reply_at?: string;
  last_reply_at?: string;
  
  conversions: number;
  revenue: number;
  
  total_clicks: number;
  unique_clicks: number;
  
  open_rate: number;
  response_rate: number;
  conversion_rate: number;
  
  calculated_at: string;
}

// Blacklist Management
export interface BlacklistEntry {
  id: string;
  phone: string;
  reason?: string;
  opted_out_at: string;
  customer_id?: string;
  notes?: string;
  added_by?: string;
  created_at: string;
}

// Media Library
export interface MediaLibraryItem {
  id: string;
  name: string;
  file_name: string;
  file_url: string;
  file_type: 'image' | 'video' | 'document' | 'audio';
  file_size: number;
  mime_type: string;
  
  folder: string;
  tags: string[];
  
  usage_count: number;
  last_used_at?: string;
  
  width?: number;
  height?: number;
  duration?: number;
  thumbnail_url?: string;
  
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

// Smart Reply Templates
export interface ReplyTemplate {
  id: string;
  name: string;
  category: string;
  keywords: string[];
  message: string;
  media_id?: string;
  auto_send: boolean;
  usage_count: number;
  last_used_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// A/B Testing
export interface ABTest {
  id: string;
  name: string;
  variants: ABTestVariant[];
  test_size: number;
  metric: 'response_rate' | 'conversion_rate' | 'click_rate';
  winner_variant?: string;
  results?: any;
  status: 'draft' | 'testing' | 'completed';
  test_started_at?: string;
  test_completed_at?: string;
  winner_sent_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ABTestVariant {
  id: string;
  name: string;
  message: string;
  media_url?: string;
  recipients: string[];
  sent: number;
  delivered: number;
  replied: number;
  conversions: number;
  score: number;
}

// Scheduled Campaigns
export interface ScheduledCampaign {
  id: string;
  campaign_id: string;
  schedule_type: 'once' | 'recurring_daily' | 'recurring_weekly' | 'drip';
  scheduled_for: string;
  timezone: string;
  recurrence_pattern?: any;
  drip_sequence?: DripMessage[];
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  executed_at?: string;
  created_by?: string;
  created_at: string;
}

export interface DripMessage {
  delay: number; // seconds
  message: string;
  media_url?: string;
}

// Customer Segments
export interface CustomerSegment {
  id: string;
  name: string;
  description?: string;
  filters: SegmentFilters;
  customer_count: number;
  last_calculated_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SegmentFilters {
  tags?: string[];
  last_purchase_days?: number;
  total_orders?: { min?: number; max?: number };
  total_spent?: { min?: number; max?: number };
  engagement_level?: 'high' | 'medium' | 'low';
}

// API Health
export interface APIHealth {
  id: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time_ms: number;
  rate_limit_remaining: number;
  rate_limit_total: number;
  credits_remaining: number;
  warnings?: string[];
  errors?: string[];
  checked_at: string;
}

// Failed Messages Queue
export interface FailedMessage {
  id: string;
  campaign_id?: string;
  recipient_phone: string;
  recipient_name?: string;
  message: string;
  media_url?: string;
  error_message?: string;
  error_code?: string;
  failed_at: string;
  retry_count: number;
  max_retries: number;
  next_retry_at?: string;
  last_retry_at?: string;
  status: 'pending' | 'retrying' | 'success' | 'abandoned';
  resolved_at?: string;
  created_at: string;
}

// Analytics Dashboard Data
export interface AnalyticsDashboard {
  overview: {
    total_campaigns: number;
    total_sent: number;
    total_success: number;
    total_failed: number;
    avg_response_rate: number;
    total_revenue: number;
  };
  
  recent_campaigns: WhatsAppCampaign[];
  
  performance_over_time: {
    date: string;
    sent: number;
    replied: number;
    conversions: number;
  }[];
  
  top_performing_messages: {
    campaign_name: string;
    response_rate: number;
    conversions: number;
  }[];
  
  engagement_by_time: {
    hour: number;
    avg_response_rate: number;
  }[];
}

// Export formats
export interface CampaignExport {
  campaign_name: string;
  recipients: {
    name: string;
    phone: string;
    status: string;
    sent_at?: string;
    delivered_at?: string;
    replied_at?: string;
  }[];
}

