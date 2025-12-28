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
  },

  // Cancel campaign
  async cancel(id: string): Promise<void> {
    const campaign = await this.getById(id);
    if (!campaign) throw new Error('Campaign not found');
    
    // Only cancel if campaign is pending, sending, or active
    if (['pending', 'sending', 'draft', 'active'].includes(campaign.status)) {
      await this.update(id, { 
        status: 'stopped',
        completed_at: new Date().toISOString()
      });
    } else {
      throw new Error(`Cannot cancel campaign with status: ${campaign.status}`);
    }
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
    const startTime = performance.now();
    console.log('🔍 [DEBUG] mediaLibrary.upload() called');
    console.log('📤 [DEBUG] Upload parameters:', { 
      fileName: file.name, 
      fileType: file.type, 
      fileSize: file.size,
      sizeInMB: (file.size / 1024 / 1024).toFixed(2),
      folder,
      timestamp: new Date().toISOString()
    });
    
    // Check for existing file with same name and size in the same folder
    console.log('🔍 [DEBUG] Checking for duplicate files in database...');
    const duplicateCheckStart = performance.now();
    const { data: existingFiles, error: checkError } = await supabase
      .from('whatsapp_media_library')
      .select('*')
      .eq('file_name', file.name)
      .eq('folder', folder)
      .eq('file_size', file.size);
    const duplicateCheckDuration = (performance.now() - duplicateCheckStart).toFixed(2);
    
    console.log('🔍 [DEBUG] Duplicate check completed in', duplicateCheckDuration, 'ms');
    console.log('🔍 [DEBUG] Duplicate check result:', {
      found: existingFiles?.length || 0,
      error: checkError?.message || null
    });
    
    if (checkError) {
      console.warn('⚠️ [DEBUG] Could not check for duplicates:', checkError);
      console.warn('⚠️ [DEBUG] Error details:', {
        message: checkError.message,
        code: checkError.code,
        details: checkError.details
      });
    } else if (existingFiles && existingFiles.length > 0) {
      console.log(`✅ [DEBUG] Found ${existingFiles.length} existing file(s) with same name, size, and folder`);
      console.log('📄 [DEBUG] Existing file details:', {
        id: existingFiles[0].id,
        name: existingFiles[0].name,
        file_type: existingFiles[0].file_type,
        file_url: existingFiles[0].file_url,
        folder: existingFiles[0].folder,
        created_at: existingFiles[0].created_at
      });
      
      // Ensure the file URL is updated with current data from localStorage
      console.log('🔗 [DEBUG] Getting URL from localStorage for existing file...');
      const storedUrl = localMediaStorage.getMediaUrl(existingFiles[0].file_url);
      console.log('🔗 [DEBUG] Retrieved URL:', storedUrl?.substring(0, 50) + '...');
      
      const duration = (performance.now() - startTime).toFixed(2);
      console.log('✅ [DEBUG] upload() completed (existing file) in', duration, 'ms');
      return {
        ...existingFiles[0],
        file_url: storedUrl
      } as MediaLibraryItem;
    }
    
    // Upload to local storage instead of Supabase Storage
    console.log('📁 [DEBUG] No duplicates found, proceeding with upload to local storage...');
    const storageUploadStart = performance.now();
    const uploadResult = await localMediaStorage.uploadMedia(file, folder);
    const storageUploadDuration = (performance.now() - storageUploadStart).toFixed(2);
    
    console.log('📁 [DEBUG] Local storage upload completed in', storageUploadDuration, 'ms');
    console.log('📁 [DEBUG] Upload result:', {
      success: uploadResult.success,
      relativePath: uploadResult.relativePath,
      fullUrl_preview: uploadResult.fullUrl?.substring(0, 50) + '...',
      error: uploadResult.error || null
    });
    
    if (!uploadResult.success || !uploadResult.relativePath) {
      console.error('❌ [DEBUG] Local storage upload failed:', {
        success: uploadResult.success,
        error: uploadResult.error,
        relativePath: uploadResult.relativePath
      });
      throw new Error(uploadResult.error || 'Failed to upload file to local storage');
    }
    
    console.log('✅ [DEBUG] File uploaded to local storage successfully');
    console.log('🔗 [DEBUG] Relative path:', uploadResult.relativePath);
    
    // Store only the relative path in database (e.g., "General/image-123456.jpg")
    const storedPath = uploadResult.relativePath;
    
    console.log('💾 [DEBUG] Saving to media library database...');
    const dbInsertStart = performance.now();
    const fileType = file.type.startsWith('image') ? 'image' : 
                     file.type.startsWith('video') ? 'video' :
                     file.type.startsWith('audio') ? 'audio' : 'document';
    
    console.log('💾 [DEBUG] Database insert data:', {
      name: file.name,
      file_name: file.name,
      file_url: storedPath,
      file_type: fileType,
      file_size: file.size,
      mime_type: file.type,
      folder
    });
    
    const { data, error } = await supabase
      .from('whatsapp_media_library')
      .insert({
        name: file.name,
        file_name: file.name,
        file_url: storedPath, // Store only relative path
        file_type: fileType,
        file_size: file.size,
        mime_type: file.type,
        folder
      })
      .select()
      .single();
    
    const dbInsertDuration = (performance.now() - dbInsertStart).toFixed(2);
    console.log('💾 [DEBUG] Database insert completed in', dbInsertDuration, 'ms');
    
    if (error) {
      console.error('❌ [DEBUG] Database insert error:', error);
      console.error('❌ [DEBUG] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
    
    console.log('✅ [DEBUG] Media saved to library database successfully');
    console.log('📦 [DEBUG] Saved media item:', {
      id: data.id,
      name: data.name,
      file_type: data.file_type,
      file_url: data.file_url,
      folder: data.folder,
      created_at: data.created_at
    });
    
    // Return with full URL for immediate display
    const finalUrl = uploadResult.fullUrl || localMediaStorage.getMediaUrl(storedPath);
    console.log('🔗 [DEBUG] Final URL for display:', finalUrl?.substring(0, 50) + '...');
    
    const totalDuration = (performance.now() - startTime).toFixed(2);
    console.log('✅ [DEBUG] upload() completed successfully in', totalDuration, 'ms');
    
    return {
      ...data,
      file_url: finalUrl
    };
  },

  // Get all media
  async getAll(folder?: string): Promise<MediaLibraryItem[]> {
    const startTime = performance.now();
    console.log('🔍 [DEBUG] mediaLibrary.getAll() called');
    console.log('📥 [DEBUG] Parameters:', { folder: folder || 'all folders' });
    
    let query = supabase
      .from('whatsapp_media_library')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (folder) {
      console.log('📁 [DEBUG] Filtering by folder:', folder);
      query = query.eq('folder', folder);
    }
    
    const dbQueryStart = performance.now();
    const { data, error } = await query;
    const dbQueryDuration = (performance.now() - dbQueryStart).toFixed(2);
    
    console.log('📊 [DEBUG] Database query completed in', dbQueryDuration, 'ms');
    console.log('📊 [DEBUG] Query result:', {
      itemCount: data?.length || 0,
      error: error?.message || null
    });
    
    if (error) {
      console.error('❌ [DEBUG] Database query error:', error);
      console.error('❌ [DEBUG] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      throw error;
    }
    
    console.log('🔄 [DEBUG] Converting relative paths to full URLs...');
    const urlConversionStart = performance.now();
    
    // Convert relative paths to full URLs and ensure tags is always an array
    const result = (data || []).map((item, index) => {
      // If file_url is a relative path, convert it to full URL
      // Use silent mode to avoid console spam for missing media
      const isFullUrl = item.file_url.startsWith('data:') || 
                        item.file_url.startsWith('http://') || 
                        item.file_url.startsWith('https://') || 
                        item.file_url.startsWith('/media/');
      
      const fullUrl = isFullUrl
        ? item.file_url
        : localMediaStorage.getMediaUrl(item.file_url, true); // silent mode
      
      if (index < 3) {
        console.log('🔗 [DEBUG] URL conversion for item', index + 1, ':', {
          original: item.file_url?.substring(0, 50) + '...',
          converted: fullUrl?.substring(0, 50) + '...',
          isFullUrl,
          file_type: item.file_type
        });
      }
      
      return {
        ...item,
        file_url: fullUrl,
        tags: item.tags || []
      };
    });
    
    const urlConversionDuration = (performance.now() - urlConversionStart).toFixed(2);
    console.log('🔄 [DEBUG] URL conversion completed in', urlConversionDuration, 'ms');
    
    const totalDuration = (performance.now() - startTime).toFixed(2);
    console.log('✅ [DEBUG] getAll() completed in', totalDuration, 'ms, returning', result.length, 'items');
    
    return result;
  },

  // Get folders
  async getFolders(): Promise<string[]> {
    console.log('🔍 [DEBUG] mediaLibrary.getFolders() called');
    const startTime = performance.now();
    
    const { data, error } = await supabase
      .from('whatsapp_media_library')
      .select('folder')
      .order('folder');
    
    const duration = (performance.now() - startTime).toFixed(2);
    console.log('📊 [DEBUG] Folders query completed in', duration, 'ms');
    
    if (error) {
      console.error('❌ [DEBUG] Folders query error:', error);
      throw error;
    }
    
    const folders = [...new Set(data?.map(d => d.folder) || [])];
    console.log('📁 [DEBUG] Found folders:', folders);
    console.log('✅ [DEBUG] getFolders() completed, returning', folders.length, 'folders');
    
    return folders;
  },

  // Delete media
  async delete(id: string): Promise<void> {
    const startTime = performance.now();
    console.log('🔍 [DEBUG] mediaLibrary.delete() called');
    console.log('🗑️ [DEBUG] Delete parameters:', { id });
    
    // First, get the media item to find its file path
    console.log('📥 [DEBUG] Fetching media item from database...');
    const { data: mediaItem, error: fetchError } = await supabase
      .from('whatsapp_media_library')
      .select('file_url, file_type, name')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('❌ [DEBUG] Error fetching media item:', fetchError);
      throw fetchError;
    }
    
    console.log('📄 [DEBUG] Media item to delete:', {
      id,
      name: mediaItem?.name,
      file_url: mediaItem?.file_url,
      file_type: mediaItem?.file_type
    });
    
    // Delete from local storage if it's a relative path
    if (mediaItem && !mediaItem.file_url.startsWith('http') && !mediaItem.file_url.startsWith('data:')) {
      console.log('🗑️ [DEBUG] Deleting from local storage...');
      const deleteResult = localMediaStorage.deleteMedia(mediaItem.file_url);
      console.log('🗑️ [DEBUG] Local storage delete result:', deleteResult);
    } else {
      console.log('ℹ️ [DEBUG] Skipping local storage delete (external URL or data URL)');
    }
    
    // Delete from database
    console.log('🗑️ [DEBUG] Deleting from database...');
    const { error } = await supabase
      .from('whatsapp_media_library')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('❌ [DEBUG] Database delete error:', error);
      console.error('❌ [DEBUG] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      throw error;
    }
    
    const duration = (performance.now() - startTime).toFixed(2);
    console.log('✅ [DEBUG] delete() completed successfully in', duration, 'ms');
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

