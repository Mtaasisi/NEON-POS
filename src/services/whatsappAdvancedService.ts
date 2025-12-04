/**
 * WhatsApp Advanced Features Service
 * Handles all advanced functionality: campaigns, analytics, blacklist, media library, etc.
 */

import { supabase } from '../lib/supabaseClient';
import { localMediaStorage } from '../lib/localMediaStorage';
import {
  WhatsAppCampaign,
  CampaignMetrics,
  BlacklistEntry,
  MediaLibraryItem,
  ReplyTemplate,
  ABTest,
  ScheduledCampaign,
  CustomerSegment,
  APIHealth,
  FailedMessage,
  AnalyticsDashboard
} from '../types/whatsapp-advanced';

// ============================================
// Campaign Management
// ============================================

export const campaignService = {
  // Create new campaign
  async create(campaign: Partial<WhatsAppCampaign>): Promise<WhatsAppCampaign> {
    const { data, error } = await supabase
      .from('whatsapp_campaigns')
      .insert(campaign)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get all campaigns
  async getAll(limit = 50): Promise<WhatsAppCampaign[]> {
    const { data, error } = await supabase
      .from('whatsapp_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  },

  // Get single campaign
  async getById(id: string): Promise<WhatsAppCampaign | null> {
    const { data, error } = await supabase
      .from('whatsapp_campaigns')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return data;
  },

  // Update campaign
  async update(id: string, updates: Partial<WhatsAppCampaign>): Promise<void> {
    const { error } = await supabase
      .from('whatsapp_campaigns')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
  },

  // Delete campaign
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('whatsapp_campaigns')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Clone campaign
  async clone(id: string, newName: string): Promise<WhatsAppCampaign> {
    const original = await this.getById(id);
    if (!original) throw new Error('Campaign not found');
    
    const cloned = {
      ...original,
      id: undefined,
      name: newName,
      status: 'draft',
      sent_count: 0,
      success_count: 0,
      failed_count: 0,
      replied_count: 0,
      started_at: undefined,
      completed_at: undefined,
      duration_seconds: undefined,
      created_at: undefined,
      updated_at: undefined
    };
    
    return this.create(cloned);
  }
};

// ============================================
// Campaign Analytics
// ============================================

export const analyticsService = {
  // Get campaign metrics
  async getCampaignMetrics(campaignId: string): Promise<CampaignMetrics | null> {
    const { data, error } = await supabase
      .from('whatsapp_campaign_metrics')
      .select('*')
      .eq('campaign_id', campaignId)
      .single();
    
    if (error) return null;
    return data;
  },

  // Get analytics dashboard data
  async getDashboard(): Promise<AnalyticsDashboard> {
    // Get overview stats
    const { data: campaigns } = await supabase
      .from('whatsapp_campaigns')
      .select('*')
      .eq('status', 'completed');
    
    const overview = {
      total_campaigns: campaigns?.length || 0,
      total_sent: campaigns?.reduce((sum, c) => sum + c.sent_count, 0) || 0,
      total_success: campaigns?.reduce((sum, c) => sum + c.success_count, 0) || 0,
      total_failed: campaigns?.reduce((sum, c) => sum + c.failed_count, 0) || 0,
      avg_response_rate: 0,
      total_revenue: 0
    };
    
    if (overview.total_sent > 0) {
      const totalReplied = campaigns?.reduce((sum, c) => sum + c.replied_count, 0) || 0;
      overview.avg_response_rate = (totalReplied / overview.total_sent) * 100;
    }
    
    // Get recent campaigns
    const { data: recentCampaigns } = await supabase
      .from('whatsapp_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    return {
      overview,
      recent_campaigns: recentCampaigns || [],
      performance_over_time: [],
      top_performing_messages: [],
      engagement_by_time: []
    };
  },

  // Export campaign data
  async exportCampaign(campaignId: string): Promise<Blob> {
    const campaign = await campaignService.getById(campaignId);
    if (!campaign) throw new Error('Campaign not found');
    
    // Create CSV
    const headers = ['Name', 'Phone', 'Status', 'Sent At'];
    const rows = campaign.recipients_data?.map((r: any) => [
      r.name,
      r.phone,
      r.status,
      r.sent_at || ''
    ]) || [];
    
    const csv = [
      headers.join(','),
      ...rows.map((r: any[]) => r.join(','))
    ].join('\n');
    
    return new Blob([csv], { type: 'text/csv' });
  }
};

// ============================================
// Blacklist Management
// ============================================

export const blacklistService = {
  // Add to blacklist
  async add(phone: string, reason?: string, notes?: string): Promise<void> {
    const { error } = await supabase
      .from('whatsapp_blacklist')
      .insert({
        phone,
        reason,
        notes
      });
    
    if (error) throw error;
  },

  // Remove from blacklist
  async remove(phone: string): Promise<void> {
    const { error } = await supabase
      .from('whatsapp_blacklist')
      .delete()
      .eq('phone', phone);
    
    if (error) throw error;
  },

  // Check if blacklisted
  async isBlacklisted(phone: string): Promise<boolean> {
    const { data } = await supabase
      .from('whatsapp_blacklist')
      .select('id')
      .eq('phone', phone)
      .single();
    
    return !!data;
  },

  // Get all blacklisted
  async getAll(): Promise<BlacklistEntry[]> {
    const { data, error } = await supabase
      .from('whatsapp_blacklist')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Import from CSV
  async importFromCSV(phones: string[], reason: string): Promise<{ added: number; skipped: number }> {
    let added = 0;
    let skipped = 0;
    
    for (const phone of phones) {
      try {
        const exists = await this.isBlacklisted(phone);
        if (!exists) {
          await this.add(phone, reason);
          added++;
        } else {
          skipped++;
        }
      } catch {
        skipped++;
      }
    }
    
    return { added, skipped };
  }
};

// ============================================
// Media Library
// ============================================

export const mediaLibraryService = {
  // Upload media
  async upload(file: File, folder: string = 'General'): Promise<MediaLibraryItem> {
    console.log('📤 [MediaLibrary] Starting local upload:', { 
      fileName: file.name, 
      fileType: file.type, 
      fileSize: file.size,
      folder 
    });
    
    // Check for existing file with same name and size in the same folder
    console.log('🔍 Checking for duplicate files...');
    const { data: existingFiles, error: checkError } = await supabase
      .from('whatsapp_media_library')
      .select('*')
      .eq('file_name', file.name)
      .eq('folder', folder)
      .eq('file_size', file.size);
    
    if (checkError) {
      console.warn('⚠️  Could not check for duplicates:', checkError);
    } else if (existingFiles && existingFiles.length > 0) {
      console.log(`✅ Found existing file with same name, size, and folder. Returning existing record.`);
      console.log('   Existing file ID:', existingFiles[0].id);
      
      // Ensure the file URL is updated with current data from localStorage
      const storedUrl = localMediaStorage.getMediaUrl(existingFiles[0].file_url);
      return {
        ...existingFiles[0],
        file_url: storedUrl
      } as MediaLibraryItem;
    }
    
    // Upload to local storage instead of Supabase Storage
    console.log('📁 Uploading to local storage...');
    
    const uploadResult = await localMediaStorage.uploadMedia(file, folder);
    
    if (!uploadResult.success || !uploadResult.relativePath) {
      console.error('❌ Local storage upload error:', uploadResult.error);
      throw new Error(uploadResult.error || 'Failed to upload file to local storage');
    }
    
    console.log('✅ File uploaded to local storage:', uploadResult.relativePath);
    console.log('🔗 Relative path:', uploadResult.relativePath);
    
    // Store only the relative path in database (e.g., "General/image-123456.jpg")
    const relativePath = uploadResult.relativePath;
    
    console.log('💾 Saving to media library database...');
    
    const { data, error } = await supabase
      .from('whatsapp_media_library')
      .insert({
        name: file.name,
        file_name: file.name,
        file_url: relativePath, // Store only relative path
        file_type: file.type.startsWith('image') ? 'image' : 
                   file.type.startsWith('video') ? 'video' :
                   file.type.startsWith('audio') ? 'audio' : 'document',
        file_size: file.size,
        mime_type: file.type,
        folder
        // Omit tags field - let database handle it (will be NULL by default)
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Database insert error:', error);
      throw error;
    }
    
    console.log('✅ Media saved to library database:', data);
    
    // Return with full URL for immediate display
    return {
      ...data,
      file_url: uploadResult.fullUrl || localMediaStorage.getMediaUrl(relativePath)
    };
  },

  // Get all media
  async getAll(folder?: string): Promise<MediaLibraryItem[]> {
    let query = supabase
      .from('whatsapp_media_library')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (folder) {
      query = query.eq('folder', folder);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Convert relative paths to full URLs and ensure tags is always an array
    return (data || []).map(item => {
      // If file_url is a relative path, convert it to full URL
      const fullUrl = item.file_url.startsWith('data:') || 
                      item.file_url.startsWith('http://') || 
                      item.file_url.startsWith('https://') || 
                      item.file_url.startsWith('/media/')
                      ? item.file_url
                      : localMediaStorage.getMediaUrl(item.file_url);
      
      return {
        ...item,
        file_url: fullUrl,
        tags: item.tags || []
      };
    });
  },

  // Get folders
  async getFolders(): Promise<string[]> {
    const { data, error } = await supabase
      .from('whatsapp_media_library')
      .select('folder')
      .order('folder');
    
    if (error) throw error;
    
    const folders = [...new Set(data?.map(d => d.folder) || [])];
    return folders;
  },

  // Delete media
  async delete(id: string): Promise<void> {
    // First, get the media item to find its file path
    const { data: mediaItem } = await supabase
      .from('whatsapp_media_library')
      .select('file_url')
      .eq('id', id)
      .single();
    
    // Delete from local storage if it's a relative path
    if (mediaItem && !mediaItem.file_url.startsWith('http') && !mediaItem.file_url.startsWith('data:')) {
      localMediaStorage.deleteMedia(mediaItem.file_url);
    }
    
    // Delete from database
    const { error } = await supabase
      .from('whatsapp_media_library')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Update usage count
  async incrementUsage(id: string): Promise<void> {
    const { error } = await supabase.rpc('increment_media_usage', { media_id: id });
    if (error) console.warn('Could not increment usage:', error);
  }
};

// ============================================
// Reply Templates
// ============================================

export const replyTemplatesService = {
  // Get all templates
  async getAll(): Promise<ReplyTemplate[]> {
    const { data, error } = await supabase
      .from('whatsapp_reply_templates')
      .select('*')
      .order('category');
    
    if (error) throw error;
    return data || [];
  },

  // Create template
  async create(template: Partial<ReplyTemplate>): Promise<ReplyTemplate> {
    const { data, error } = await supabase
      .from('whatsapp_reply_templates')
      .insert(template)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update template
  async update(id: string, updates: Partial<ReplyTemplate>): Promise<void> {
    const { error } = await supabase
      .from('whatsapp_reply_templates')
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;
  },

  // Delete template
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('whatsapp_reply_templates')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Find matching template by keywords
  async findByKeywords(message: string): Promise<ReplyTemplate | null> {
    const { data } = await supabase
      .from('whatsapp_reply_templates')
      .select('*')
      .eq('auto_send', true);
    
    if (!data) return null;
    
    const lowerMessage = message.toLowerCase();
    for (const template of data) {
      if (template.keywords.some((kw: string) => lowerMessage.includes(kw.toLowerCase()))) {
        return template;
      }
    }
    
    return null;
  }
};

// ============================================
// API Health Monitor
// ============================================

export const apiHealthService = {
  // Check API health
  async check(): Promise<APIHealth> {
    try {
      const startTime = Date.now();
      
      // Make a test API call (implement based on your API)
      const response = await fetch('https://wasenderapi.com/api/status', {
        headers: {
          'Authorization': `Bearer YOUR_API_KEY` // Get from config
        }
      });
      
      const responseTime = Date.now() - startTime;
      const data = await response.json();
      
      const health: APIHealth = {
        id: crypto.randomUUID(),
        status: response.ok ? 'healthy' : 'degraded',
        response_time_ms: responseTime,
        rate_limit_remaining: data.rateLimit?.remaining || 0,
        rate_limit_total: data.rateLimit?.total || 0,
        credits_remaining: data.credits || 0,
        warnings: data.warnings || [],
        errors: data.errors || [],
        checked_at: new Date().toISOString()
      };
      
      // Save to database
      await supabase
        .from('whatsapp_api_health')
        .insert(health);
      
      return health;
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        status: 'down',
        response_time_ms: 0,
        rate_limit_remaining: 0,
        rate_limit_total: 0,
        credits_remaining: 0,
        warnings: [],
        errors: [String(error)],
        checked_at: new Date().toISOString()
      };
    }
  },

  // Get recent health checks
  async getRecent(limit = 10): Promise<APIHealth[]> {
    const { data, error } = await supabase
      .from('whatsapp_api_health')
      .select('*')
      .order('checked_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  }
};

// ============================================
// Failed Messages Queue
// ============================================

export const failedQueueService = {
  // Add failed message
  async add(failedMessage: Partial<FailedMessage>): Promise<void> {
    const { error } = await supabase
      .from('whatsapp_failed_queue')
      .insert({
        ...failedMessage,
        next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
      });
    
    if (error) throw error;
  },

  // Get messages ready for retry
  async getReadyForRetry(): Promise<FailedMessage[]> {
    const { data, error } = await supabase
      .from('whatsapp_failed_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('next_retry_at', new Date().toISOString())
      .lt('retry_count', supabase.rpc('get_max_retries'));
    
    if (error) throw error;
    return data || [];
  },

  // Update retry status
  async updateRetryStatus(id: string, success: boolean): Promise<void> {
    const { error } = await supabase
      .from('whatsapp_failed_queue')
      .update({
        status: success ? 'success' : 'pending',
        retry_count: supabase.rpc('increment_retry_count', { msg_id: id }),
        last_retry_at: new Date().toISOString(),
        next_retry_at: success ? null : new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
        resolved_at: success ? new Date().toISOString() : null
      })
      .eq('id', id);
    
    if (error) throw error;
  }
};

export default {
  campaign: campaignService,
  analytics: analyticsService,
  blacklist: blacklistService,
  mediaLibrary: mediaLibraryService,
  replyTemplates: replyTemplatesService,
  apiHealth: apiHealthService,
  failedQueue: failedQueueService
};

