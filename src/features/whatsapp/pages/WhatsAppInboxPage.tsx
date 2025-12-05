/**
 * WhatsApp Inbox Page
 * Displays incoming WhatsApp messages from customers via WasenderAPI
 * 
 * Features:
 * - Real-time message reception via webhooks (stored in whatsapp_incoming_messages table)
 * - Reply to messages with quoted message support (WasenderAPI feature)
 * - Check if number is on WhatsApp before sending (WasenderAPI API)
 * - Auto-link messages to customers by phone number
 * - Mark messages as read/unread
 * - Filter by status (all/unread/need reply)
 * - Search conversations
 * - Media support (images, videos, documents, audio)
 * 
 * API Documentation: https://wasenderapi.com/api-docs
 * Service Implementation: src/services/whatsappService.ts
 * Database Schema: migrations/create_whatsapp_webhook_tables.sql
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { 
  MessageCircle, Send, CheckCheck, RefreshCw, User, Search, ChevronDown, X, Clock, Eye, 
  Image as ImageIcon, Phone, Users, Upload, HelpCircle, Trash2, Filter, Save, FolderOpen, 
  Database, Star, UserPlus, MessageSquare, TrendingUp, BarChart3, Download, History, Award, 
  AlertCircle, Activity, Zap, UserX, FileText, Video, Music, MapPin, Gift, ThumbsUp, Calendar, 
  RotateCcw, Lock, Settings, Edit3, FileCheck, Plus, Smile, Code, Hash, AtSign, Paperclip, 
  Type, Keyboard, Sparkles, Minimize2, Smartphone 
} from 'lucide-react';
import whatsappService from '../../../services/whatsappService';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../../shared/components/ui/BackButton';
import { useAuth } from '../../../context/AuthContext';
import { findCustomerByPhoneMatch, phonesMatch } from '../../../utils/phoneMatching';
import whatsappAdvancedService from '../../../services/whatsappAdvancedService';
import type { WhatsAppCampaign, BlacklistEntry } from '../../../types/whatsapp-advanced';
import BulkStep1Enhanced from '../components/BulkStep1Enhanced';
import CampaignHistoryModal from '../components/CampaignHistoryModal';
import BlacklistManagementModal from '../components/BlacklistManagementModal';
import MediaLibraryModal from '../components/MediaLibraryModal';
import WhatsAppSessionModal from '../components/WhatsAppSessionModal';
import CampaignManagementModal from '../components/CampaignManagementModal';
import { errorExporter } from '../../../utils/errorExporter';
import { createCampaignInDB, updateCampaignProgress, finalizeCampaign, getCurrentCampaignId, resetCampaignTracking } from '../utils/campaignSaver';
import { getAllTemplates, saveTemplate, deleteTemplate, getTemplate, incrementTemplateUse, type CampaignTemplate } from '../utils/campaignTemplates';
import { personalizeMessage as enhancedPersonalize, getAvailableVariables } from '../utils/personalization';
import { createRetryableError, shouldRetry, incrementRetry, getRetryQueue, type RetryableError } from '../utils/smartRetry';
import { scheduleCampaign, getAllScheduled, getPendingCampaigns, updateScheduledStatus, type ScheduledCampaign } from '../utils/scheduledCampaigns';

interface IncomingMessage {
  id: string;
  message_id: string;
  from_phone: string;
  customer_id?: string;
  message_text: string;
  message_type: string;
  media_url?: string;
  is_read: boolean;
  replied: boolean;
  replied_at?: string;
  received_at: string;
  created_at: string;
  raw_data?: any; // Full webhook payload from WasenderAPI
  customers?: {
    name: string;
    phone: string;
    whatsapp?: string;
  };
}

// Export for use in child components
export interface Conversation {
  phone: string;
  customer_id?: string;
  customer_name?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  messages: ConversationMessage[];
}

export interface ConversationMessage {
  id: string;
  type: 'sent' | 'received';
  message: string;
  message_type: string;
  media_url?: string;
  timestamp: string;
  status?: string;
  is_read?: boolean;
}

export default function WhatsAppInboxPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<IncomingMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'unreplied'>('all');
  const [selectedMessage, setSelectedMessage] = useState<IncomingMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [quickReplyText, setQuickReplyText] = useState<{[phone: string]: string}>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);
  
  // New message compose state
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composePhone, setComposePhone] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composing, setComposing] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  
  // Bulk message state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStep, setBulkStep] = useState(1); // 1: Recipients, 2: Message, 3: Review, 4: Sending
  const [bulkMessage, setBulkMessage] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  
  // Anti-ban settings - Comprehensive protection
  const [usePersonalization, setUsePersonalization] = useState(true);
  const [randomDelay, setRandomDelay] = useState(true);
  const [minDelay, setMinDelay] = useState(3);
  const [maxDelay, setMaxDelay] = useState(8);
  const [usePresence, setUsePresence] = useState(false); // Disabled by default due to API limitations
  const [dailyLimit, setDailyLimit] = useState(100);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  
  // Advanced anti-ban features
  const [batchSize, setBatchSize] = useState(20); // Send in batches
  const [batchDelay, setBatchDelay] = useState(60); // Seconds between batches
  const [varyMessageLength, setVaryMessageLength] = useState(true); // Add slight variations
  const [respectQuietHours, setRespectQuietHours] = useState(true); // Don't send 10PM-8AM
  const [maxPerHour, setMaxPerHour] = useState(30); // Hourly rate limit
  const [skipRecentlyContacted, setSkipRecentlyContacted] = useState(true); // Skip if messaged in last 6h
  const [useInvisibleChars, setUseInvisibleChars] = useState(true); // Add invisible Unicode characters
  const [useEmojiVariation, setUseEmojiVariation] = useState(true); // Rotate similar emojis
  
  // Advanced Features Modals
  const [showCampaignHistory, setShowCampaignHistory] = useState(false);
  const [showCampaignManagement, setShowCampaignManagement] = useState(false);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState('');
  
  // Active Session Management
  const [activeSession, setActiveSession] = useState<any>(null);
  const [loadingActiveSession, setLoadingActiveSession] = useState(true);
  const [sessionDiagnostic, setSessionDiagnostic] = useState<any>(null);
  
  // BulkStep1Enhanced state variables
  const [csvRecipients, setCsvRecipients] = useState<Array<{ phone: string; name: string }>>([]);
  const [savedLists, setSavedLists] = useState<any[]>([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [showCsvTooltip, setShowCsvTooltip] = useState(false);
  const [showImportSection, setShowImportSection] = useState(false);
  const [showCsvPreviewModal, setShowCsvPreviewModal] = useState(false);
  const [showSaveListModal, setShowSaveListModal] = useState(false);
  const [showCustomerImport, setShowCustomerImport] = useState(false);
  const [bulkMedia, setBulkMedia] = useState<any>(null);
  const [bulkMediaType, setBulkMediaType] = useState<string>('');
  const [bulkMediaPreview, setBulkMediaPreview] = useState<string>('');
  const [bulkMediaCaption, setBulkMediaCaption] = useState<string>('');
  const [bulkMessageType, setBulkMessageType] = useState<'text' | 'image' | 'video' | 'document' | 'audio' | 'sticker' | 'location' | 'contact' | 'poll'>('text');
  const [viewOnce, setViewOnce] = useState(false);
  
  // Poll message state
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [allowMultiSelect, setAllowMultiSelect] = useState(false);
  
  // Location message state
  const [locationLat, setLocationLat] = useState('');
  const [locationLng, setLocationLng] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  
  // Message composer enhancements
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showVariablesMenu, setShowVariablesMenu] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const messageTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  
  // Draft management
  const [hasDraft, setHasDraft] = useState(false);
  
  // Cloud/Browser mode and minimize state
  const [sendingMode, setSendingMode] = useState<'browser' | 'cloud'>('browser');
  const [isMinimized, setIsMinimized] = useState(false);
  const [cloudCampaignId, setCloudCampaignId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [scheduledSend, setScheduledSend] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  
  // Pause/Stop/Resume controls with persistent state
  const [isPaused, setIsPaused] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [sentPhones, setSentPhones] = useState<string[]>([]);
  const [pausedCampaignState, setPausedCampaignState] = useState<any>(null);
  const [isMinimizedExpanded, setIsMinimizedExpanded] = useState(false);
  
  // Enhanced tracking for analytics and reporting
  const [failedMessages, setFailedMessages] = useState<Array<{phone: string, name: string, error: string, errorType?: string, timestamp: string}>>([]);
  const [campaignStartTime, setCampaignStartTime] = useState<number | null>(null);
  const [pauseTimestamp, setPauseTimestamp] = useState<string | null>(null);
  const [campaignTimeline, setCampaignTimeline] = useState<Array<{event: string, time: string, details?: string}>>([]);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [showProgressDetails, setShowProgressDetails] = useState(false);
  const [showFailedDetails, setShowFailedDetails] = useState(false);
  const [editingBeforeResume, setEditingBeforeResume] = useState(false);
  
  // Sound and notifications
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Campaign Templates
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  
  // Scheduled Campaigns
  const [showScheduledModal, setShowScheduledModal] = useState(false);
  const [scheduledCampaigns, setScheduledCampaigns] = useState<ScheduledCampaign[]>([]);
  
  // Retry Queue
  const [retryQueue, setRetryQueue] = useState<RetryableError[]>([]);

  // Play sound notification
  const playSound = (type: 'pause' | 'complete' | 'error' | 'resume') => {
    if (!soundEnabled) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different frequencies for different events
      const frequencies = {
        pause: [400, 300],
        complete: [500, 600, 700],
        error: [300, 200],
        resume: [300, 400, 500]
      };
      
      const freqs = frequencies[type];
      let time = audioContext.currentTime;
      
      freqs.forEach((freq, i) => {
        oscillator.frequency.setValueAtTime(freq, time);
        gainNode.gain.setValueAtTime(0.3, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        time += 0.15;
      });
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(time);
    } catch (error) {
      console.warn('Could not play sound:', error);
    }
  };

  // Send browser notification
  const sendBrowserNotification = (title: string, body: string, icon?: string) => {
    if (!notificationsEnabled) return;
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: icon || '/whatsapp-icon.svg',
        badge: '/whatsapp-icon.svg'
      });
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        toast.success('Browser notifications enabled!');
      }
    }
  };

  // Calculate estimated time remaining
  const calculateEstimatedTime = (sent: number, total: number, startTime: number) => {
    if (sent === 0 || !startTime) return null;
    
    const elapsed = Date.now() - startTime;
    const rate = sent / (elapsed / 1000); // messages per second
    const remaining = total - sent;
    const estimatedSeconds = remaining / rate;
    
    return Math.round(estimatedSeconds);
  };

  // Format time duration
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  // Export recipients to CSV
  const exportToCSV = (data: Array<{phone: string, name: string}>, filename: string) => {
    const csv = [
      'Phone,Name',
      ...data.map(r => `${r.phone},${r.name}`)
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`Exported ${data.length} recipients to ${filename}`);
  };

  // Export sent recipients
  const exportSentRecipients = () => {
    const data = sentPhones.map(phone => {
      const conv = conversations.find(c => c.phone === phone);
      return {
        phone,
        name: conv?.customer_name || 'Unknown'
      };
    });
    exportToCSV(data, `sent-recipients-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Export pending recipients
  const exportPendingRecipients = () => {
    const pending = selectedRecipients.filter(phone => !sentPhones.includes(phone));
    const data = pending.map(phone => {
      const conv = conversations.find(c => c.phone === phone);
      return {
        phone,
        name: conv?.customer_name || 'Unknown'
      };
    });
    exportToCSV(data, `pending-recipients-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Export failed recipients
  const exportFailedRecipients = () => {
    const data = failedMessages.map(f => ({
      phone: f.phone,
      name: f.name
    }));
    exportToCSV(data, `failed-recipients-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Add event to timeline
  const addTimelineEvent = (event: string, details?: string) => {
    setCampaignTimeline(prev => [...prev, {
      event,
      time: new Date().toISOString(),
      details
    }]);
  };

  // Save campaign state to localStorage for pause/resume functionality
  const saveCampaignState = (state: any) => {
    try {
      localStorage.setItem('whatsapp_bulk_campaign_paused', JSON.stringify({
        ...state,
        timestamp: new Date().toISOString(),
        pauseTimestamp: new Date().toISOString(),
        failedMessages: failedMessages,
        campaignTimeline: campaignTimeline,
        campaignStartTime: campaignStartTime
      }));
      console.log('💾 Campaign state saved to localStorage');
    } catch (error) {
      console.error('Failed to save campaign state:', error);
    }
  };

  // Load paused campaign state from localStorage
  const loadPausedCampaignState = () => {
    try {
      const saved = localStorage.getItem('whatsapp_bulk_campaign_paused');
      if (saved) {
        const state = JSON.parse(saved);
        console.log('📂 Loaded paused campaign from localStorage:', state);
        
        // Restore additional tracking data
        if (state.failedMessages) setFailedMessages(state.failedMessages);
        if (state.campaignTimeline) setCampaignTimeline(state.campaignTimeline);
        if (state.campaignStartTime) setCampaignStartTime(state.campaignStartTime);
        if (state.pauseTimestamp) setPauseTimestamp(state.pauseTimestamp);
        
        return state;
      }
    } catch (error) {
      console.error('Failed to load paused campaign:', error);
    }
    return null;
  };

  // Clear paused campaign state
  const clearPausedCampaignState = () => {
    try {
      localStorage.removeItem('whatsapp_bulk_campaign_paused');
      setPausedCampaignState(null);
      setSentPhones([]);
      setIsPaused(false);
      setIsStopped(false);
      setFailedMessages([]);
      setCampaignTimeline([]);
      setCampaignStartTime(null);
      setPauseTimestamp(null);
      setEstimatedTimeRemaining(null);
      console.log('🗑️ Cleared paused campaign state');
    } catch (error) {
      console.error('Failed to clear paused campaign:', error);
    }
  };

  // Retry failed messages
  const retryFailedMessages = async () => {
    if (failedMessages.length === 0) {
      toast.error('No failed messages to retry');
      return;
    }

    const confirmRetry = window.confirm(
      `Retry ${failedMessages.length} failed message${failedMessages.length > 1 ? 's' : ''}?\n\n` +
      `This will attempt to resend to all failed recipients.`
    );

    if (!confirmRetry) return;

    console.log(`🔄 Retrying ${failedMessages.length} failed messages...`);
    addTimelineEvent('Retry Started', `${failedMessages.length} failed messages`);
    
    // Set up retry with failed phones as recipients
    const failedPhones = failedMessages.map(f => f.phone);
    setSelectedRecipients(failedPhones);
    
    // Clear failed messages list
    setFailedMessages([]);
    
    // Reset progress
    setBulkProgress({ current: 0, total: failedPhones.length, success: 0, failed: 0 });
    
    toast.loading(`Retrying ${failedPhones.length} messages...`, { duration: 3000 });
    
    // Start sending
    setTimeout(() => {
      sendBulkMessages(false); // false = not resuming, starting fresh retry
    }, 1000);
  };

  // Add all failed contacts to blacklist
  const addFailedToBlacklist = async () => {
    if (failedMessages.length === 0) {
      toast.error('No failed messages to add to blacklist');
      return;
    }

    const confirm = window.confirm(
      `⚠️ Add ${failedMessages.length} Failed Contact${failedMessages.length !== 1 ? 's' : ''} to Blacklist?\n\n` +
      `This will prevent future campaigns from including these numbers.\n\n` +
      `Failed contacts will be blacklisted with their error reason.`
    );

    if (!confirm) return;

    toast.loading('Adding failed contacts to blacklist...');

    let added = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const failed of failedMessages) {
      try {
        // Check if already blacklisted
        const alreadyBlacklisted = blacklist.some(b => b.phone === failed.phone);
        
        if (alreadyBlacklisted) {
          skipped++;
          console.log(`⏭️ Skipped ${failed.phone} - already in blacklist`);
        } else {
          // Add to blacklist with error reason
          await whatsappAdvancedService.blacklist.add(
            failed.phone,
            `Campaign failure: ${failed.error}`,
            `Auto-added from campaign "${campaignName || 'Unnamed'}" on ${new Date(failed.timestamp).toLocaleString()}. Contact: ${failed.name}`
          );
          added++;
          console.log(`✅ Added ${failed.phone} to blacklist: ${failed.error}`);
        }
      } catch (error) {
        console.error(`Error adding ${failed.phone} to blacklist:`, error);
        errors.push(failed.phone);
      }
    }

    // Reload blacklist
    await loadBlacklist();

    // Clear failed messages list
    setFailedMessages([]);

    // Show results
    if (added > 0) {
      toast.success(
        `✅ Added ${added} contact${added !== 1 ? 's' : ''} to blacklist` +
        (skipped > 0 ? ` (${skipped} already blacklisted)` : ''),
        { duration: 5000 }
      );
    } else if (skipped > 0) {
      toast('All failed contacts were already blacklisted', { icon: 'ℹ️', duration: 4000 });
    }

    if (errors.length > 0) {
      toast.error(`Failed to blacklist ${errors.length} contact(s)`, { duration: 4000 });
    }
  };

  // Load anti-ban settings from database
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/antiban-settings', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to load settings from database');
        }
        
        const settings = await response.json();
        
        // Restore anti-ban settings from database
        setUsePersonalization(settings.usePersonalization ?? true);
        setRandomDelay(settings.randomDelay ?? true);
        setMinDelay(settings.minDelay || 3);
        setMaxDelay(settings.maxDelay || 8);
        setUsePresence(settings.usePresence ?? false);
        setBatchSize(settings.batchSize || 20);
        setBatchDelay(settings.batchDelay || 60);
        setMaxPerHour(settings.maxPerHour || 30);
        setDailyLimit(settings.dailyLimit || 100);
        setSkipRecentlyContacted(settings.skipRecentlyContacted ?? true);
        setRespectQuietHours(settings.respectQuietHours ?? true);
        setUseInvisibleChars(settings.useInvisibleChars ?? true);
        setUseEmojiVariation(settings.useEmojiVariation ?? true);
        setVaryMessageLength(settings.varyMessageLength ?? true);
        
        console.log('⚙️ Anti-ban settings loaded from database');
      } catch (error) {
        console.error('Failed to load anti-ban settings from database:', error);
        // Fallback to localStorage if database fails
        try {
          const savedSettings = localStorage.getItem('whatsapp_antiban_settings');
          if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            setUsePersonalization(settings.usePersonalization ?? true);
            setRandomDelay(settings.randomDelay ?? true);
            setMinDelay(settings.minDelay || 3);
            setMaxDelay(settings.maxDelay || 8);
            setUsePresence(settings.usePresence ?? false);
            setBatchSize(settings.batchSize || 20);
            setBatchDelay(settings.batchDelay || 60);
            setMaxPerHour(settings.maxPerHour || 30);
            setDailyLimit(settings.dailyLimit || 100);
            setSkipRecentlyContacted(settings.skipRecentlyContacted ?? true);
            setRespectQuietHours(settings.respectQuietHours ?? true);
            setUseInvisibleChars(settings.useInvisibleChars ?? true);
            setUseEmojiVariation(settings.useEmojiVariation ?? true);
            setVaryMessageLength(settings.varyMessageLength ?? true);
            console.log('⚙️ Anti-ban settings loaded from localStorage (fallback)');
          }
        } catch (localError) {
          console.error('Failed to load from localStorage fallback:', localError);
        }
      }
    };
    
    loadSettings();
    
    // Check for paused campaign on mount
    const paused = loadPausedCampaignState();
    if (paused) {
      setPausedCampaignState(paused);
      setSentPhones(paused.sentPhones || []);
      
      // Check if campaign is old (24h+)
      const pausedTime = new Date(paused.pauseTimestamp || paused.timestamp).getTime();
      const hoursSincePaused = (Date.now() - pausedTime) / (1000 * 60 * 60);
      
      if (hoursSincePaused > 24) {
        toast.error(`⚠️ Campaign paused ${Math.floor(hoursSincePaused)} hours ago. Recipients list may be outdated.`, {
          duration: 10000
        });
      } else {
        toast('You have a paused campaign. Click "Resume Campaign" to continue.', {
          duration: 8000,
          icon: '⏸️'
        });
      }
    }
  }, []);
  
  // Keyboard shortcuts for bulk sending
  useEffect(() => {
    if (!showBulkModal || bulkStep !== 4) return;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Space or P - Pause/Resume
      if (e.code === 'Space' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (bulkSending && !isPaused && !isStopped) {
          console.log('⏸️ Keyboard shortcut: Pause (Space/P)');
          setIsPaused(true);
          toast('Pausing... Please wait for current message to complete', { icon: '⏸️' });
        }
      }
      
      // S - Stop
      if ((e.key === 's' || e.key === 'S') && bulkSending) {
        e.preventDefault();
        console.log('🛑 Keyboard shortcut: Stop (S)');
        if (window.confirm('Are you sure you want to stop the campaign?')) {
          setIsStopped(true);
          toast('Stopping... Please wait for current message to complete', { icon: '🛑' });
        }
      }
      
      // Escape - Close modal (only if not sending)
      if (e.key === 'Escape' && !bulkSending) {
        e.preventDefault();
        console.log('❌ Keyboard shortcut: Close (Esc)');
        setShowBulkModal(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showBulkModal, bulkStep, bulkSending, isPaused, isStopped]);
  
  // Load customers for compose modal and check for draft
  useEffect(() => {
    async function initializeData() {
      try {
        await Promise.all([
          loadCustomers(),
          loadCampaigns(),
          loadBlacklist(),
          loadActiveSession(),
          loadSessionDiagnostic()
        ]);
        
        // Check if draft exists
        const draftExists = localStorage.getItem('whatsapp_bulk_draft');
        if (draftExists) {
          setHasDraft(true);
          console.log('💾 Draft available');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize WhatsApp Inbox';
        console.error('Error initializing WhatsApp Inbox:', error);
        setInitError(errorMessage);
        toast.error('Failed to load some data. Please refresh the page.');
      }
    }
    
    initializeData();
  }, [currentUser]);
  
  // Load campaign history
  async function loadCampaigns() {
    try {
      const data = await whatsappAdvancedService.campaign.getAll(20);
      setCampaigns(data);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  }
  
  // Load templates
  function loadTemplates() {
    const loaded = getAllTemplates();
    setTemplates(loaded);
  }
  
  // Load scheduled campaigns
  function loadScheduledCampaigns() {
    const loaded = getAllScheduled();
    setScheduledCampaigns(loaded);
  }
  
  // Check for pending scheduled campaigns
  useEffect(() => {
    loadTemplates();
    loadScheduledCampaigns();
    
    // Check every minute for scheduled campaigns ready to run
    const interval = setInterval(() => {
      const pending = getPendingCampaigns();
      if (pending.length > 0 && !bulkSending) {
        const nextCampaign = pending[0];
        const confirm = window.confirm(
          `Scheduled campaign "${nextCampaign.name}" is ready to run.\n\n` +
          `Start now?`
        );
        if (confirm) {
          // Load campaign data and start
          setCampaignName(nextCampaign.name);
          setBulkMessage(nextCampaign.message);
          setBulkMessageType(nextCampaign.messageType);
          setSelectedRecipients(nextCampaign.selectedRecipients);
          Object.entries(nextCampaign.settings).forEach(([key, value]) => {
            // Apply settings
            if (key === 'usePersonalization') setUsePersonalization(value);
            if (key === 'randomDelay') setRandomDelay(value);
            if (key === 'minDelay') setMinDelay(value);
            if (key === 'maxDelay') setMaxDelay(value);
            // Add more settings as needed
          });
          updateScheduledStatus(nextCampaign.id, 'running', new Date().toISOString());
          setShowBulkModal(true);
          setBulkStep(4);
          setTimeout(() => sendBulkMessages(false), 500);
        }
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [bulkSending]);
  
  // Load blacklist
  async function loadBlacklist() {
    try {
      const data = await whatsappAdvancedService.blacklist.getAll();
      setBlacklist(data);
    } catch (error) {
      console.error('Error loading blacklist:', error);
    }
  }
  
  // Load active WhatsApp session
  async function loadActiveSession() {
    if (!currentUser?.id) {
      setLoadingActiveSession(false);
      return;
    }
    
    try {
      setLoadingActiveSession(true);
      const response = await fetch(`/api/whatsapp-sessions/get-active?user_id=${currentUser.id}`);
      const data = await response.json();
      
      if (data.success && data.active_session) {
        setActiveSession(data.active_session);
        console.log('✅ Active WhatsApp session loaded:', data.active_session.name);
        
        // Show warning if session is not connected
        if (data.warning) {
          console.warn('⚠️', data.warning);
        }
      } else {
        setActiveSession(null);
        console.log('ℹ️ No active WhatsApp session');
      }
    } catch (error) {
      console.error('Error loading active session:', error);
      setActiveSession(null);
    } finally {
      setLoadingActiveSession(false);
    }
  }
  
  // Load session diagnostic
  async function loadSessionDiagnostic() {
    try {
      const response = await fetch('/api/whatsapp-sessions/check-integration');
      const data = await response.json();
      
      if (data.success) {
        setSessionDiagnostic(data);
        console.log('📊 Session Diagnostic:', data);
        
        // Log what's being used
        if (data.status === 'using_integration_credentials') {
          console.warn('⚠️ Using OLD integration credentials (not database sessions)');
          console.log('   Session ID from integrations:', data.integration?.session_id);
        }
      }
    } catch (error) {
      console.error('Error loading session diagnostic:', error);
    }
  }
  
  // Set active WhatsApp session
  async function setActiveWhatsAppSession(sessionId: number) {
    if (!currentUser?.id) return;
    
    try {
      const response = await fetch('/api/whatsapp-sessions/set-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          session_id: sessionId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await loadActiveSession(); // Reload to get full session details
        toast.success(data.message || 'Active session updated');
      } else {
        toast.error(data.error || 'Failed to update active session');
      }
    } catch (error) {
      console.error('Error setting active session:', error);
      toast.error('Failed to update active session');
    }
  }

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showAttachMenu && !target.closest('.attach-menu-container')) {
        setShowAttachMenu(false);
      }
      if (showVariablesMenu && !target.closest('.variables-menu-container')) {
        setShowVariablesMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAttachMenu, showVariablesMenu]);

  // Load messages with proper error handling
  // This component receives messages from WasenderAPI webhooks
  // The webhooks are configured in Admin Settings → Integrations → WhatsApp
  // Webhook events: messages.received, messages.upsert (for incoming messages)
  useEffect(() => {
    async function initializeMessages() {
      try {
        await loadMessages();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load messages';
        console.error('Error loading messages:', error);
        setInitError(errorMessage);
        toast.error('Failed to load messages. Please refresh the page.');
      }
    }
    
    initializeMessages();
    
    // Set up real-time subscription for instant updates
    // When webhook receives new message, it's stored in whatsapp_incoming_messages
    // This subscription listens to database changes for real-time UI updates
    const subscription = supabase
      .channel('whatsapp_incoming')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_incoming_messages'
        },
        () => {
          // New message received via webhook - reload messages
          loadMessages().catch(err => {
            console.error('Error reloading messages:', err);
          });
        }
      )
      .subscribe();
    
    // Also refresh every 2 minutes as backup (reduced from 30s for better performance)
    const interval = setInterval(() => {
      loadMessages().catch(err => {
        console.error('Error in periodic message refresh:', err);
      });
    }, 120000); // 2 minutes instead of 30 seconds
    
    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [filter]);
  
  async function loadCustomers() {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, whatsapp')
        .order('name');
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  }

  async function loadMessages() {
    try {
      setRefreshing(true);
      
      // Load both incoming and outgoing messages to build conversation history
      // 1. Load incoming messages (received from customers)
      const { data: incomingData, error: incomingError } = await supabase
        .from('whatsapp_incoming_messages')
        .select(`
          *,
          customers (
            name,
            phone,
            whatsapp
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (incomingError) {
        console.error('Database error (incoming):', incomingError);
        throw incomingError;
      }

      // 2. Load outgoing messages (sent by business)
      const { data: outgoingData, error: outgoingError } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (outgoingError) {
        console.error('Database error (outgoing):', outgoingError);
        throw outgoingError;
      }

      // 3. Load all customers to match phone numbers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, phone, whatsapp');

      const customersMap = new Map<string, any>();
      (customersData || []).forEach((customer: any) => {
        // Store by both phone and whatsapp number (normalized)
        if (customer.phone) {
          const normalizedPhone = customer.phone.replace(/[^\d+]/g, '');
          customersMap.set(normalizedPhone, customer);
        }
        if (customer.whatsapp) {
          const normalizedWhatsapp = customer.whatsapp.replace(/[^\d+]/g, '');
          customersMap.set(normalizedWhatsapp, customer);
        }
      });

      // Helper function to find customer by phone
      const findCustomerByPhone = (phone: string) => {
        const normalized = phone.replace(/[^\d+]/g, '');
        let customer = customersMap.get(normalized);
        
        // Try without + prefix
        if (!customer && normalized.startsWith('+')) {
          customer = customersMap.get(normalized.substring(1));
        }
        
        // Try with + prefix
        if (!customer && !normalized.startsWith('+')) {
          customer = customersMap.get('+' + normalized);
        }
        
        return customer;
      };

      // 4. Build conversations by grouping messages by phone number
      const conversationsMap = new Map<string, Conversation>();

      // Process incoming messages
      (incomingData || []).forEach((msg: any) => {
        const phone = msg.from_phone;
        if (!conversationsMap.has(phone)) {
          // Get customer info from incoming message or lookup
          let customer = msg.customers;
          if (!customer) {
            customer = findCustomerByPhone(phone);
          }
          
          conversationsMap.set(phone, {
            phone,
            customer_id: msg.customer_id || customer?.id,
            customer_name: customer?.name || 'Unknown',
            last_message: msg.message_text,
            last_message_time: msg.created_at,
            unread_count: msg.is_read ? 0 : 1,
            messages: []
          });
        }

        const conversation = conversationsMap.get(phone)!;
        
        // Update customer info if we have better data
        if (msg.customers && conversation.customer_name === 'Unknown') {
          conversation.customer_id = msg.customer_id;
          conversation.customer_name = msg.customers.name;
        }
        
        conversation.messages.push({
          id: msg.id,
          type: 'received',
          message: msg.message_text,
          message_type: msg.message_type,
          media_url: msg.media_url,
          timestamp: msg.created_at,
          is_read: msg.is_read
        });

        if (!msg.is_read) {
          conversation.unread_count++;
        }
      });

      // Process outgoing messages
      (outgoingData || []).forEach((log: any) => {
        const phone = log.recipient_phone;
        if (!conversationsMap.has(phone)) {
          // Lookup customer by phone number
          const customer = findCustomerByPhone(phone);
          
          conversationsMap.set(phone, {
            phone,
            customer_id: customer?.id,
            customer_name: customer?.name || 'Unknown',
            last_message: log.message,
            last_message_time: log.created_at,
            unread_count: 0,
            messages: []
          });
        }

        const conversation = conversationsMap.get(phone)!;
        
        // Update customer info if not set and we found a customer
        if (conversation.customer_name === 'Unknown') {
          const customer = findCustomerByPhone(phone);
          if (customer) {
            conversation.customer_id = customer.id;
            conversation.customer_name = customer.name;
          }
        }
        
        conversation.messages.push({
          id: log.id,
          type: 'sent',
          message: log.message,
          message_type: log.message_type,
          media_url: log.media_url,
          timestamp: log.created_at,
          status: log.status
        });
      });

      // Sort messages within each conversation by timestamp
      conversationsMap.forEach(conversation => {
        conversation.messages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // Update last message info from the most recent message
        if (conversation.messages.length > 0) {
          const lastMsg = conversation.messages[conversation.messages.length - 1];
          conversation.last_message = lastMsg.message;
          conversation.last_message_time = lastMsg.timestamp;
        }
      });

      // Convert to array and sort by last message time
      let conversationsArray = Array.from(conversationsMap.values());
      conversationsArray.sort((a, b) => 
        new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      );

      // Apply filters
      if (filter === 'unread') {
        conversationsArray = conversationsArray.filter(c => c.unread_count > 0);
      } else if (filter === 'unreplied') {
        conversationsArray = conversationsArray.filter(c => {
          const lastMsg = c.messages[c.messages.length - 1];
          return lastMsg?.type === 'received';
        });
      }

      setConversations(conversationsArray);
      setMessages(incomingData || []);
      
      // Show success message on first load
      if (loading && conversationsArray.length > 0) {
        toast.success(`Loaded ${conversationsArray.length} conversations`);
      }
    } catch (error: any) {
      console.error('Error loading messages:', error);
      
      // Check if it's a connection error
      if (error.message?.includes('Failed to fetch') || error.message?.includes('network')) {
        toast.error('Network error. Check your connection.');
      } else if (error.message?.includes('not found')) {
        toast.error('WhatsApp inbox table not found. Run database migration.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function markAsRead(messageId: string) {
    try {
      await supabase
        .from('whatsapp_incoming_messages')
        .update({ is_read: true })
        .eq('id', messageId);

      loadMessages();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }
  
  async function markConversationAsRead(conversation: Conversation) {
    try {
      // Mark all unread messages in this conversation as read
      const unreadMessageIds = conversation.messages
        .filter(m => m.type === 'received' && m.is_read === false)
        .map(m => m.id);
      
      if (unreadMessageIds.length > 0) {
        await supabase
          .from('whatsapp_incoming_messages')
          .update({ is_read: true })
          .in('id', unreadMessageIds);

        loadMessages();
        toast.success('Marked as read');
      }
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }

  async function sendReply(message: IncomingMessage) {
    if (!replyText.trim()) return;

    setSending(true);
    try {
      console.log('💬 Attempting to send WhatsApp reply to:', message.from_phone);
      
      // Send reply with quoted message (WasenderAPI quoted message feature)
      // Using same approach as CustomerDetailModal - send directly without pre-check
      const result = await whatsappService.sendMessage(
        message.from_phone,
        replyText,
        { 
          quoted_message_id: message.message_id,
          session_id: activeSession?.id || undefined
        }
      );

      console.log('💬 WhatsApp Service Result:', result);

      if (result.success) {
        toast.success('✅ Reply sent successfully!');
        
        // Mark as replied in database
        await supabase
          .from('whatsapp_incoming_messages')
          .update({ 
            replied: true, 
            replied_at: new Date().toISOString() 
          })
          .eq('id', message.id);

        setReplyText('');
        setSelectedMessage(null);
        loadMessages();
      } else {
        toast.error(result.error || 'Failed to send reply');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply. Please try again.');
    } finally {
      setSending(false);
    }
  }
  
  async function sendQuickReply(conversation: Conversation) {
    const messageText = quickReplyText[conversation.phone];
    if (!messageText?.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSending(true);
    try {
      console.log('💬 Attempting to send quick reply to:', conversation.phone);
      
      // Send message directly
      const result = await whatsappService.sendMessage(conversation.phone, messageText, {
        session_id: activeSession?.id || undefined
      });

      console.log('💬 WhatsApp Service Result:', result);

      if (result.success) {
        toast.success('✅ Message sent successfully!');
        
        // Clear input for this conversation
        setQuickReplyText(prev => ({
          ...prev,
          [conversation.phone]: ''
        }));
        
        // Log to customer communications if customer is linked
        if (conversation.customer_id) {
          try {
            await supabase
              .from('customer_communications')
              .insert({
                customer_id: conversation.customer_id,
                type: 'whatsapp',
                message: messageText,
                phone_number: conversation.phone,
                status: 'sent',
                sent_by: currentUser?.id,
                sent_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
              });
          } catch (commEx) {
            console.warn('⚠️ Could not log to customer_communications:', commEx);
          }
        }
        
        // Reload to show new message in history
        loadMessages();
      } else {
        toast.error(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending quick reply:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  }
  
  async function sendNewMessage() {
    if (!composeMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    
    // Use same phone selection logic as CustomerDetailModal
    const phoneNumber = selectedCustomer?.whatsapp || selectedCustomer?.phone || composePhone;
    if (!phoneNumber) {
      toast.error('Please select a customer or enter a phone number');
      return;
    }

    setComposing(true);
    try {
      console.log('💬 Attempting to send WhatsApp to:', phoneNumber);
      
      // Send message directly without pre-check (same as CustomerDetailModal)
      const result = await whatsappService.sendMessage(phoneNumber, composeMessage, {
        session_id: activeSession?.id || undefined
      });
      
      console.log('💬 WhatsApp Service Result:', result);

      if (result.success) {
        toast.success('✅ Message sent successfully!');
        
        // Log to customer communications if customer is selected (same as CustomerDetailModal)
        if (selectedCustomer) {
          try {
            await supabase
              .from('customer_communications')
              .insert({
                customer_id: selectedCustomer.id,
                type: 'whatsapp',
                message: composeMessage,
                phone_number: phoneNumber,
                status: 'sent',
                sent_by: currentUser?.id,
                sent_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
              });
            console.log('✅ WhatsApp message logged to customer_communications table');
          } catch (commEx) {
            console.warn('⚠️ Could not log to customer_communications table:', commEx);
          }
        }
        
        // Reset form
        setComposeMessage('');
        setComposePhone('');
        setSelectedCustomer(null);
        setShowComposeModal(false);
        
        // Reload messages (might appear if customer replies)
        loadMessages();
      } else {
        toast.error(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setComposing(false);
    }
  }
  
  async function sendBulkMessages(resuming: boolean = false) {
    if (!bulkMessage.trim() && bulkMessageType === 'text') {
      toast.error('Please enter a message');
      return;
    }
    
    if (selectedRecipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }
    
    // CRITICAL: If resuming, ensure we have sentPhones from paused campaign
    // This handles race conditions where React state might not have updated yet
    if (resuming && pausedCampaignState && sentPhones.length === 0 && pausedCampaignState.sentPhones?.length > 0) {
      console.log('⚠️ State race condition detected! Using sentPhones from pausedCampaignState directly');
      setSentPhones(pausedCampaignState.sentPhones);
      // Wait a bit for state to update
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Check quiet hours (10 PM - 8 AM)
    if (respectQuietHours) {
      const currentHour = new Date().getHours();
      if (currentHour >= 22 || currentHour < 8) {
        toast.error('Cannot send during quiet hours (10 PM - 8 AM). Disable "Respect Quiet Hours" to override.', { duration: 5000 });
        setBulkStep(3); // Go back to review
        return;
      }
    }
    
    // Validate phone numbers before sending (only if not resuming)
    let recipientsToSend = [...selectedRecipients];
    if (!resuming) {
      console.log('📋 Validating phone numbers...');
      toast.loading('Validating phone numbers...', { id: 'phone-validation' });
      
      const validatedPhones: string[] = [];
      const invalidPhones: Array<{ phone: string; reason: string }> = [];
      
      for (const phone of recipientsToSend) {
        // Validate phone format
        const validation = await whatsappService.validatePhoneNumber(phone);
        
        if (!validation.valid) {
          console.warn(`❌ Invalid phone: ${phone} - ${validation.error}`);
          invalidPhones.push({ 
            phone, 
            reason: validation.error || 'Invalid format' 
          });
        } else {
          validatedPhones.push(phone);
        }
      }
      
      toast.dismiss('phone-validation');
      
      // Report validation results
      if (invalidPhones.length > 0) {
        const errorMsg = `${invalidPhones.length} invalid phone number${invalidPhones.length > 1 ? 's' : ''} found:\n` +
          invalidPhones.slice(0, 5).map(p => `• ${p.phone}: ${p.reason}`).join('\n') +
          (invalidPhones.length > 5 ? `\n...and ${invalidPhones.length - 5} more` : '');
        
        console.error('❌ Invalid phone numbers:', invalidPhones);
        
        const continueAnyway = window.confirm(
          `⚠️ Phone Number Validation Failed\n\n${errorMsg}\n\n` +
          `Valid numbers: ${validatedPhones.length}/${recipientsToSend.length}\n\n` +
          `Continue with valid numbers only?`
        );
        
        if (!continueAnyway) {
          setBulkStep(3);
          return;
        }
        
        toast.warning(`Sending to ${validatedPhones.length} valid numbers (skipped ${invalidPhones.length} invalid)`, { 
          duration: 5000 
        });
      } else {
        toast.success('All phone numbers validated ✓', { duration: 2000 });
      }
      
      recipientsToSend = validatedPhones;
    }
    
    // Filter out recently contacted numbers
    if (skipRecentlyContacted && !resuming) {
      const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
      const filtered = recipientsToSend.filter(phone => {
        const conv = conversations.find(c => c.phone === phone);
        if (!conv) return true;
        const lastMsg = conv.messages[conv.messages.length - 1];
        if (!lastMsg || lastMsg.type !== 'sent') return true;
        return new Date(lastMsg.timestamp).getTime() < sixHoursAgo;
      });
      
      const skipped = recipientsToSend.length - filtered.length;
      if (skipped > 0) {
        toast(`Skipped ${skipped} recently contacted numbers (within 6h)`, { duration: 4000, icon: 'ℹ️' });
        recipientsToSend = filtered;
      }
    }
    
    // If resuming, filter out already sent phones
    let alreadySentCount = 0;
    if (resuming) {
      if (sentPhones.length === 0) {
        console.warn('⚠️ WARNING: Resuming but sentPhones is empty! This may cause duplicate sends.');
        toast.error('Warning: Cannot find sent history. Campaign may send duplicates.', { duration: 6000 });
      } else {
        alreadySentCount = sentPhones.length;
        const beforeFilter = recipientsToSend.length;
        recipientsToSend = recipientsToSend.filter(phone => !sentPhones.includes(phone));
        console.log(`📤 Resuming campaign:`);
        console.log(`   - Already sent: ${alreadySentCount} phones`);
        console.log(`   - Total recipients: ${beforeFilter}`);
        console.log(`   - After filtering: ${recipientsToSend.length} remaining`);
        console.log(`   - Filtered out: ${beforeFilter - recipientsToSend.length} phones`);
        toast(`Resuming: ${recipientsToSend.length} messages remaining (${alreadySentCount} already sent)`, { duration: 5000, icon: '▶️' });
      }
    }
    
    if (recipientsToSend.length === 0) {
      toast.error('All recipients were filtered out or already sent. Adjust your settings.');
      setBulkStep(3);
      return;
    }
    
    // Check daily limit
    if (recipientsToSend.length > dailyLimit) {
      toast.error(`Daily limit is ${dailyLimit} messages. Current: ${recipientsToSend.length}. Increase limit or reduce recipients.`);
      setBulkStep(3);
      return;
    }
    
    // Check hourly limit
    const estimatedHours = Math.ceil(recipientsToSend.length / maxPerHour);
    if (estimatedHours > 3 && !resuming) {
      const confirmSend = window.confirm(
        `This will take approximately ${estimatedHours} hours to send at ${maxPerHour} messages/hour.\n\n` +
        `This is to prevent spam detection. Continue?`
      );
      if (!confirmSend) {
        setBulkStep(3);
        return;
      }
    }

    // Store original total for progress tracking (before removing sent ones)
    const originalTotal = selectedRecipients.length;
    
    setBulkSending(true);
    setIsPaused(false);
    setIsStopped(false);
    setBulkProgress({ 
      current: alreadySentCount, 
      total: originalTotal, 
      success: sentPhones.filter(p => selectedRecipients.includes(p)).length, 
      failed: 0 
    });
    
    // Track campaign start time (only if starting fresh)
    if (!resuming) {
      const startTime = Date.now();
      setCampaignStartTime(startTime);
      addTimelineEvent('Campaign Started', `${selectedRecipients.length} recipients`);
      
      // Create campaign in database for incremental saving
      try {
        const campaignId = await createCampaignInDB({
          name: campaignName || `Campaign ${new Date().toLocaleDateString()}`,
          message: bulkMessage,
          messageType: bulkMessageType,
          selectedRecipients,
          sentPhones,
          bulkProgress: {
            current: alreadySentCount,
            total: originalTotal,
            success: sentPhones.filter(p => selectedRecipients.includes(p)).length,
            failed: 0
          },
          failedMessages: [],
          campaignStartTime: startTime,
          settings: {
            usePersonalization,
            randomDelay,
            minDelay,
            maxDelay,
            usePresence,
            batchSize,
            batchDelay,
            maxPerHour,
            dailyLimit,
            skipRecentlyContacted,
            respectQuietHours,
            useInvisibleChars,
            useEmojiVariation,
            varyMessageLength
          },
          conversations: conversations.map(c => ({ phone: c.phone, customer_name: c.customer_name }))
        });
        if (campaignId) {
          console.log(`✅ Campaign created in DB: ${campaignId}`);
        }
      } catch (error) {
        console.error('Failed to create campaign in DB:', error);
      }
      
      // Request notification permission if not already set
      if (notificationsEnabled && Notification.permission === 'default') {
        requestNotificationPermission();
      }
    } else {
      addTimelineEvent('Campaign Resumed', `${recipientsToSend.length} remaining`);
      playSound('resume');
      sendBrowserNotification('Campaign Resumed', `Continuing with ${recipientsToSend.length} messages`);
    }

    try {
      console.log('\n╔═══════════════════════════════════════════════════════════════╗');
      console.log('║         📤 BULK WHATSAPP SEND - BROWSER MODE START          ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝');
      console.log(`📊 Campaign Summary:`);
      console.log(`   • Total Recipients: ${recipientsToSend.length}`);
      console.log(`   • Message Type: ${bulkMessageType}`);
      console.log(`   • Has Media: ${!!bulkMedia}`);
      console.log(`\n🛡️  Anti-Ban Protection Settings:`);
      console.log(`   • Personalization: ${usePersonalization ? '✓ ENABLED' : '✗ DISABLED'}`);
      console.log(`   • Random Delays: ${randomDelay ? '✓ ENABLED' : '✗ DISABLED'}`);
      console.log(`   • Delay Range: ${minDelay}s - ${maxDelay}s`);
      console.log(`   • Batch Size: ${batchSize} messages`);
      console.log(`   • Batch Delay: ${batchDelay}s`);
      console.log(`   • Skip Recently Contacted: ${skipRecentlyContacted ? '✓ ENABLED' : '✗ DISABLED'}`);
      console.log(`   • Respect Quiet Hours: ${respectQuietHours ? '✓ ENABLED' : '✗ DISABLED'}`);
      console.log(`   • Use Presence (Typing): ${usePresence ? '✓ ENABLED' : '✗ DISABLED'}`);
      console.log(`   • Invisible Chars: ${useInvisibleChars ? '✓ ENABLED' : '✗ DISABLED'}`);
      console.log(`   • Emoji Variation: ${useEmojiVariation ? '✓ ENABLED' : '✗ DISABLED'}`);
      console.log(`   • Vary Message Length: ${varyMessageLength ? '✓ ENABLED' : '✗ DISABLED'}`);
      console.log(`\n⏱️  Rate Limits:`);
      console.log(`   • Max per Hour: ${maxPerHour} messages`);
      console.log(`   • Daily Limit: ${dailyLimit} messages`);
      console.log(`\n📝 Message Preview:`);
      console.log(`   "${bulkMessage.substring(0, 100)}${bulkMessage.length > 100 ? '...' : ''}"`);
      console.log(`\n───────────────────────────────────────────────────────────────\n`);
      
      // Handle media upload - Use WasenderAPI upload for sending
      let mediaDataUrl = '';
      if (bulkMedia && bulkMedia instanceof File && ['image', 'video', 'document', 'audio'].includes(bulkMessageType)) {
        try {
          console.log('📤 Uploading media file to WasenderAPI for sending...');
          toast.loading('Preparing media...', { id: 'bulk-media-upload' });
          
          // For WhatsApp sending, we need to upload to WasenderAPI to get a public URL
          // (Base64 data URLs don't work with WasenderAPI send-message endpoint)
          const { WhatsAppMediaStorageService } = await import('../../../lib/whatsappMediaStorage');
          const uploadResult = await WhatsAppMediaStorageService.uploadMedia(bulkMedia);
          
          if (!uploadResult.success || !uploadResult.url) {
            throw new Error(uploadResult.error || 'Failed to upload media');
          }
          
          mediaDataUrl = uploadResult.url;
          console.log('✅ Media ready for sending:', mediaDataUrl.substring(0, 100) + '...');
          toast.success('Media ready!', { id: 'bulk-media-upload' });
          
        } catch (error: any) {
          console.error('❌ Media preparation failed:', error);
          toast.error(`Media preparation failed: ${error.message}. Please try a smaller file or use Media Library.`, { 
            id: 'bulk-media-upload',
            duration: 5000 
          });
          
          setBulkSending(false);
          setBulkStep(2); // Go back to compose
          return;
        }
      } else if (typeof bulkMedia === 'string') {
        // Media from library - check if it's base64 or URL
        if (bulkMedia.startsWith('data:')) {
          // Base64 data URL - need to convert to File and upload to WasenderAPI
          console.log('📤 Converting base64 media to file for WasenderAPI...');
          toast.loading('Preparing media from library...', { id: 'bulk-media-upload' });
          
          try {
            // Convert base64 to Blob then File
            const response = await fetch(bulkMedia);
            const blob = await response.blob();
            const fileName = `library-media-${Date.now()}.${blob.type.split('/')[1] || 'jpg'}`;
            const file = new File([blob], fileName, { type: blob.type });
            
            // Upload to WasenderAPI
            const { WhatsAppMediaStorageService } = await import('../../../lib/whatsappMediaStorage');
            const uploadResult = await WhatsAppMediaStorageService.uploadMedia(file);
            
            if (!uploadResult.success || !uploadResult.url) {
              throw new Error(uploadResult.error || 'Failed to prepare media from library');
            }
            
            mediaDataUrl = uploadResult.url;
            console.log('✅ Library media converted and ready:', mediaDataUrl.substring(0, 100) + '...');
            toast.success('Media ready!', { id: 'bulk-media-upload' });
          } catch (error: any) {
            console.error('❌ Failed to convert library media:', error);
            toast.error(`Failed to prepare library media: ${error.message}`, { 
              id: 'bulk-media-upload',
              duration: 5000 
            });
            
            setBulkSending(false);
            setBulkStep(2);
            return;
          }
        } else {
          // Already a URL (http/https)
          mediaDataUrl = bulkMedia;
          console.log('✅ Using media URL from library:', mediaDataUrl);
        }
      }
      
      let successCount = 0;
      let failCount = 0;
      let skippedCount = 0;
      let messagesThisHour = 0;
      let hourStartTime = Date.now();

      // Send messages sequentially with COMPREHENSIVE anti-ban protection
      for (let i = 0; i < recipientsToSend.length; i++) {
        // Check for stop signal
        if (isStopped) {
          console.log('🛑 STOP signal received. Stopping campaign...');
          toast.error('Campaign stopped by user', { duration: 4000 });
          clearPausedCampaignState();
          break;
        }
        
        // Check for pause signal
        if (isPaused) {
          console.log('⏸️ PAUSE signal received. Saving state...');
          addTimelineEvent('Campaign Paused', `${alreadySentCount + i}/${selectedRecipients.length} sent`);
          setPauseTimestamp(new Date().toISOString());
          
          const campaignState = {
            sentPhones: [...sentPhones],
            selectedRecipients: [...selectedRecipients],
            bulkMessage,
            bulkMessageType,
            bulkMedia,
            mediaDataUrl,
            bulkProgress: { 
              current: alreadySentCount + i, 
              total: selectedRecipients.length, 
              success: successCount, 
              failed: failCount 
            },
            // Save all campaign settings
            usePersonalization,
            randomDelay,
            minDelay,
            maxDelay,
            usePresence,
            batchSize,
            batchDelay,
            maxPerHour,
            dailyLimit,
            skipRecentlyContacted,
            respectQuietHours,
            useInvisibleChars,
            useEmojiVariation,
            varyMessageLength,
            viewOnce,
            pollQuestion,
            pollOptions,
            allowMultiSelect,
            locationLat,
            locationLng,
            locationName,
            locationAddress
          };
          saveCampaignState(campaignState);
          
          playSound('pause');
          sendBrowserNotification('Campaign Paused', `Progress saved: ${alreadySentCount + i}/${selectedRecipients.length} sent`);
          toast.success('Campaign paused. Progress saved!', { duration: 5000 });
          setBulkSending(false);
          return; // Exit the function
        }
        
        const phone = recipientsToSend[i];
        const conversation = conversations.find(c => c.phone === phone);
        
        // Check hourly limit
        const hourElapsed = (Date.now() - hourStartTime) / (1000 * 60 * 60);
        if (hourElapsed >= 1) {
          // Reset hourly counter
          messagesThisHour = 0;
          hourStartTime = Date.now();
        }
        
        if (messagesThisHour >= maxPerHour) {
          // Wait until next hour
          const waitTime = 3600 - (Date.now() - hourStartTime) / 1000;
          if (waitTime > 0) {
            console.log(`⏳ Hourly limit reached (${maxPerHour}). Waiting ${Math.ceil(waitTime / 60)} minutes...`);
            toast(`Rate limit: Pausing for ${Math.ceil(waitTime / 60)} minutes`, { duration: 5000, icon: '⏸️' });
            await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
            messagesThisHour = 0;
            hourStartTime = Date.now();
          }
        }
        
        // Batch break - Take longer break every N messages
        if (i > 0 && i % batchSize === 0) {
          console.log(`📊 Batch ${Math.floor(i / batchSize)} complete. Taking ${batchDelay}s break...`);
          toast(`Batch break: Waiting ${batchDelay}s (sent ${i}/${recipientsToSend.length})`, { duration: 3000, icon: '☕' });
          await new Promise(resolve => setTimeout(resolve, batchDelay * 1000));
        }
        
        try {
          const startTime = Date.now();
          console.log(`\n📤 [${i + 1}/${recipientsToSend.length}] Sending to: ${phone}`);
          console.log(`   Customer: ${conversation?.customer_name || 'Unknown'}`);
          console.log(`   Batch: ${Math.floor(i / batchSize) + 1} | Messages this hour: ${messagesThisHour}`);
          
          // Update progress - show attempt position
          setBulkProgress(prev => ({ 
            ...prev, 
            current: alreadySentCount + i + 1 
          }));
          
          // Personalize message (replace all variables)
          let personalizedMessage = bulkMessage;
          if (usePersonalization) {
            const now = new Date();
            const greetingHour = now.getHours();
            const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 18 ? 'Good afternoon' : 'Good evening';
            
            console.log(`   🎨 Personalizing message...`);
            // Replace all variables
            personalizedMessage = personalizedMessage
              .replace(/\{name\}/gi, conversation?.customer_name || 'Customer')
              .replace(/\{phone\}/gi, phone)
              .replace(/\{date\}/gi, now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))
              .replace(/\{time\}/gi, now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
              .replace(/\{day\}/gi, now.toLocaleDateString('en-US', { weekday: 'long' }))
              .replace(/\{month\}/gi, now.toLocaleDateString('en-US', { month: 'long' }))
              .replace(/\{greeting\}/gi, greeting)
              .replace(/\{company\}/gi, 'Dukani Pro'); // You can make this dynamic later
          }
          
          // Apply advanced message uniqueness techniques
          const uniquenessApplied = [];
          
          // 1. Add invisible Unicode characters (makes hash unique)
          if (useInvisibleChars) {
            personalizedMessage = addInvisibleVariation(personalizedMessage, i);
            uniquenessApplied.push('Invisible chars');
          }
          
          // 2. Rotate emoji variants (same meaning, different emoji)
          if (useEmojiVariation) {
            personalizedMessage = varyEmojis(personalizedMessage, i);
            uniquenessApplied.push('Emoji variation');
          }
          
          // 3. Add slight variations to message length
          if (varyMessageLength && Math.random() > 0.5) {
            const variations = [' ', '.', '!', '😊'];
            const randomVariation = variations[Math.floor(Math.random() * variations.length)];
            if (!personalizedMessage.endsWith(randomVariation) && !personalizedMessage.endsWith('.') && !personalizedMessage.endsWith('!')) {
              personalizedMessage = personalizedMessage.trim() + randomVariation;
              uniquenessApplied.push('Length variation');
            }
          }
          
          if (uniquenessApplied.length > 0) {
            console.log(`   🎭 Uniqueness applied: ${uniquenessApplied.join(', ')}`);
          }
          
          // Send "typing..." presence before message (more human-like)
          if (usePresence) {
            try {
              console.log(`   ⌨️  Sending typing presence...`);
              // Send presence update using WhatsApp service (includes session ID)
              await whatsappService.sendPresenceUpdate(phone, 'composing');
              
              // Wait 1-2 seconds (simulating typing)
              const typingDelay = 1000 + Math.random() * 1000;
              console.log(`   ⏳ Simulating typing for ${(typingDelay / 1000).toFixed(1)}s...`);
              await new Promise(resolve => setTimeout(resolve, typingDelay));
            } catch (err) {
              // Ignore presence errors - not critical
              console.debug('   ⚠️  Presence update skipped:', err);
            }
          }
          
          // Send message based on message type
          console.log(`   💬 Message type: ${bulkMessageType}`);
          console.log(`   📝 Final message: "${personalizedMessage.substring(0, 80)}${personalizedMessage.length > 80 ? '...' : ''}"`);
          let result;
          
          if (bulkMessageType === 'text') {
            // Text message
            console.log(`   📨 Sending text message...`);
            result = await whatsappService.sendMessage(phone, personalizedMessage, {
              session_id: activeSession?.id || undefined
            });
          } else if (bulkMessageType === 'image' && mediaDataUrl) {
            // Validate URL before sending (accept http://, https://, or data: URLs)
            if (!mediaDataUrl.startsWith('http://') && 
                !mediaDataUrl.startsWith('https://') && 
                !mediaDataUrl.startsWith('data:')) {
              console.error('❌ Invalid image URL (missing protocol):', mediaDataUrl);
              result = { success: false, error: 'Invalid image URL: Must start with http://, https://, or data:' };
            } else {
              // Image message with caption (base64 or URL)
              console.log(`   📨 Sending image with caption (ViewOnce: ${viewOnce})...`);
              console.log(`   🖼️  Media URL: ${mediaDataUrl.substring(0, 60)}...`);
              result = await whatsappService.sendMessage(phone, personalizedMessage, {
                media_url: mediaDataUrl,
                message_type: 'image',
                caption: personalizedMessage,
                viewOnce: viewOnce,
                session_id: activeSession?.id || undefined
              });
            }
          } else if (bulkMessageType === 'video' && mediaDataUrl) {
            // Validate URL before sending (accept http://, https://, or data: URLs)
            if (!mediaDataUrl.startsWith('http://') && 
                !mediaDataUrl.startsWith('https://') && 
                !mediaDataUrl.startsWith('data:')) {
              console.error('❌ Invalid video URL (missing protocol):', mediaDataUrl);
              result = { success: false, error: 'Invalid video URL: Must start with http://, https://, or data:' };
            } else {
              // Video message with caption (base64 or URL)
              result = await whatsappService.sendMessage(phone, personalizedMessage, {
                media_url: mediaDataUrl,
                message_type: 'video',
                caption: personalizedMessage,
                viewOnce: viewOnce,
                session_id: activeSession?.id || undefined
              });
            }
          } else if (bulkMessageType === 'document' && mediaDataUrl) {
            // Validate URL before sending (accept http://, https://, or data: URLs)
            if (!mediaDataUrl.startsWith('http://') && 
                !mediaDataUrl.startsWith('https://') && 
                !mediaDataUrl.startsWith('data:')) {
              console.error('❌ Invalid document URL (missing protocol):', mediaDataUrl);
              result = { success: false, error: 'Invalid document URL: Must start with http://, https://, or data:' };
            } else {
              // Document message (base64 or URL)
              result = await whatsappService.sendMessage(phone, personalizedMessage, {
                media_url: mediaDataUrl,
                message_type: 'document',
                caption: personalizedMessage,
                session_id: activeSession?.id || undefined
              });
            }
          } else if (bulkMessageType === 'audio' && mediaDataUrl) {
            // Validate URL before sending (accept http://, https://, or data: URLs)
            if (!mediaDataUrl.startsWith('http://') && 
                !mediaDataUrl.startsWith('https://') && 
                !mediaDataUrl.startsWith('data:')) {
              console.error('❌ Invalid audio URL (missing protocol):', mediaDataUrl);
              result = { success: false, error: 'Invalid audio URL: Must start with http://, https://, or data:' };
            } else {
              // Audio message (base64 or URL)
              result = await whatsappService.sendMessage(phone, '', {
                media_url: mediaDataUrl,
                message_type: 'audio',
                session_id: activeSession?.id || undefined
              });
            }
          } else if (bulkMessageType === 'location') {
            // Location message
            result = await whatsappService.sendMessage(phone, '', {
              message_type: 'location',
              location: {
                latitude: parseFloat(locationLat),
                longitude: parseFloat(locationLng),
                name: locationName,
                address: locationAddress
              },
              session_id: activeSession?.id || undefined
            });
          } else if (bulkMessageType === 'poll' && pollQuestion && pollOptions.filter(o => o.trim()).length >= 2) {
            // Poll message
            result = await whatsappService.sendMessage(phone, '', {
              message_type: 'poll',
              pollName: pollQuestion,
              pollOptions: pollOptions.filter(o => o.trim()),
              allowMultipleAnswers: allowMultiSelect,
              session_id: activeSession?.id || undefined
            });
          } else {
            // Fallback to text
            result = await whatsappService.sendMessage(phone, personalizedMessage, {
              session_id: activeSession?.id || undefined
            });
          }
          
          const sendDuration = Date.now() - startTime;
          
          if (result.success) {
            successCount++;
            messagesThisHour++; // Increment hourly counter
            
            // Add to sent phones list for pause/resume functionality
            const newSentPhones = [...sentPhones, phone];
            setSentPhones(newSentPhones);
            
            // IMPORTANT: Remove from selectedRecipients in real-time to keep only pending
            setSelectedRecipients(prev => prev.filter(p => p !== phone));
            
            console.log(`   ✅ SUCCESS (${sendDuration}ms)`);
            console.log(`   📊 Progress: ${alreadySentCount + i + 1}/${originalTotal} | Success: ${successCount} | Failed: ${failCount}`);
            console.log(`   📊 Stats: ${successCount} sent | ${failCount} failed | ${messagesThisHour} this hour`);
            console.log(`   📝 Saved to sentPhones (now ${newSentPhones.length} total)`);
            console.log(`   🗑️ Removed from queue - ${selectedRecipients.length - 1} pending remaining`);
            
            // Save progress to localStorage after each successful send
            const campaignState = {
              sentPhones: newSentPhones,
              selectedRecipients: [...selectedRecipients],
              bulkMessage,
              bulkMessageType,
              bulkMedia,
              mediaDataUrl,
              bulkProgress: { 
                current: alreadySentCount + i + 1, 
                total: selectedRecipients.length, 
                success: successCount, 
                failed: failCount 
              },
              usePersonalization,
              randomDelay,
              minDelay,
              maxDelay,
              usePresence,
              batchSize,
              batchDelay,
              maxPerHour,
              dailyLimit,
              skipRecentlyContacted,
              respectQuietHours,
              useInvisibleChars,
              useEmojiVariation,
              varyMessageLength,
              viewOnce,
              pollQuestion,
              pollOptions,
              allowMultiSelect,
              locationLat,
              locationLng,
              locationName,
              locationAddress
            };
            saveCampaignState(campaignState);
            
            // Update campaign progress in database (incremental saving)
            const campaignId = getCurrentCampaignId();
            if (campaignId) {
              updateCampaignProgress(campaignId, {
                name: campaignName || `Campaign ${new Date().toLocaleDateString()}`,
                message: bulkMessage,
                messageType: bulkMessageType,
                selectedRecipients,
                sentPhones: newSentPhones,
                bulkProgress: {
                  current: alreadySentCount + i + 1,
                  total: originalTotal,
                  success: successCount,
                  failed: failCount
                },
                failedMessages,
                campaignStartTime,
                settings: {
                  usePersonalization,
                  randomDelay,
                  minDelay,
                  maxDelay,
                  usePresence,
                  batchSize,
                  batchDelay,
                  maxPerHour,
                  dailyLimit,
                  skipRecentlyContacted,
                  respectQuietHours,
                  useInvisibleChars,
                  useEmojiVariation,
                  varyMessageLength
                },
                conversations: conversations.map(c => ({ phone: c.phone, customer_name: c.customer_name }))
              });
            }
            
            // Log to customer communications if customer is linked
            if (conversation?.customer_id) {
              try {
                await supabase
                  .from('customer_communications')
                  .insert({
                    customer_id: conversation.customer_id,
                    type: 'whatsapp',
                    message: personalizedMessage,
                    phone_number: phone,
                    status: 'sent',
                    sent_by: currentUser?.id,
                    sent_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                  });
              } catch (commEx) {
                console.warn('⚠️ Could not log to customer_communications:', commEx);
              }
            }
          } else {
            failCount++;
            
            // Extract specific error type for better tracking
            const errorMsg = result.error || 'Unknown error';
            const isJIDError = errorMsg.includes('JID does not exist') || errorMsg.includes('not on WhatsApp') || errorMsg.includes('not registered');
            const isFormatError = errorMsg.includes('Invalid') || errorMsg.includes('format');
            const isRateLimitError = errorMsg.includes('rate limit') || errorMsg.includes('too many');
            
            // Track failed message with details and error categorization
            const failedMsg = {
              phone,
              name: conversation?.customer_name || 'Unknown',
              error: errorMsg,
              errorType: isJIDError ? 'not_on_whatsapp' : isFormatError ? 'invalid_format' : isRateLimitError ? 'rate_limit' : 'other',
              timestamp: new Date().toISOString()
            };
            setFailedMessages(prev => [...prev, failedMsg]);
            
            // IMPORTANT: Remove failed recipient from queue as well (already attempted)
            setSelectedRecipients(prev => prev.filter(p => p !== phone));
            
            // Log with more context
            console.error(`   ❌ FAILED (${sendDuration}ms):`);
            console.error(`      Error Type: ${failedMsg.errorType}`);
            console.error(`      Phone: ${phone}`);
            console.error(`      Message: ${errorMsg}`);
            console.log(`   📊 Progress: ${alreadySentCount + i + 1}/${originalTotal} | Success: ${successCount} | Failed: ${failCount}`);
            console.log(`   📊 Stats: ${successCount} sent | ${failCount} failed | ${messagesThisHour} this hour`);
            console.log(`   🗑️ Removed from queue - ${selectedRecipients.length - 1} truly pending remaining`);
            
            // Provide actionable suggestions for common errors
            if (isJIDError) {
              console.warn(`   💡 SUGGESTION: Phone ${phone} may have:`);
              console.warn(`      • Wrong country code (check if it starts with correct code)`);
              console.warn(`      • Not registered on WhatsApp`);
              console.warn(`      • Been deactivated`);
            } else if (isFormatError) {
              console.warn(`   💡 SUGGESTION: Fix phone format to: CountryCode+Number`);
              console.warn(`      Example: 255712345678 (Tanzania)`);
              console.warn(`      Remove: spaces, dashes, parentheses, + symbol`);
            }
          }
          
          // Update progress with all counts - CRITICAL for accurate display
          if (campaignStartTime) {
            const estimated = calculateEstimatedTime(successCount + failCount, originalTotal, campaignStartTime);
            setEstimatedTimeRemaining(estimated);
          }
          
          // Update ALL progress metrics together to keep them synchronized
          setBulkProgress({
            current: alreadySentCount + i + 1,
            total: originalTotal,
            success: successCount,
            failed: failCount
          });
          
          // Verification: Success + Failed should equal Current (attempted so far)
          const attempted = alreadySentCount + i + 1;
          const accounted = successCount + failCount;
          if (attempted !== accounted) {
            console.warn(`⚠️ COUNT MISMATCH: Attempted ${attempted} but only ${accounted} accounted for (${successCount} success + ${failCount} failed)`);
            console.warn(`   Missing: ${attempted - accounted} messages`);
          }
          
          // Send progress notifications at milestones
          if (notificationsEnabled) {
            const progress = ((alreadySentCount + i + 1) / selectedRecipients.length) * 100;
            if ([25, 50, 75].includes(Math.floor(progress)) && Math.floor(progress) !== Math.floor(((alreadySentCount + i) / selectedRecipients.length) * 100)) {
              sendBrowserNotification(
                `${Math.floor(progress)}% Complete`,
                `${alreadySentCount + i + 1}/${selectedRecipients.length} messages sent`
              );
            }
          }
          
          // Smart delay between messages (COMPREHENSIVE anti-ban)
          if (i < recipientsToSend.length - 1) {
            let delayMs = minDelay * 1000;
            
            if (randomDelay) {
              // Random delay between min and max seconds
              const randomSeconds = minDelay + Math.random() * (maxDelay - minDelay);
              delayMs = randomSeconds * 1000;
              
              // Add extra random variation (10-30% more) occasionally for unpredictability
              if (Math.random() > 0.7) {
                delayMs += Math.random() * delayMs * 0.3;
              }
            }
            
            // Increase delay slightly every 10 messages (gradual slowdown = more human)
            const slowdownFactor = 1 + (Math.floor(i / 10) * 0.1);
            const originalDelay = delayMs;
            delayMs *= slowdownFactor;
            
            console.log(`   ⏱️  Delay: ${(delayMs / 1000).toFixed(1)}s (base: ${(originalDelay / 1000).toFixed(1)}s, slowdown: ${slowdownFactor.toFixed(2)}x)`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } catch (error) {
          const sendDuration = Date.now() - startTime;
          failCount++;
          
          // Track the exception as a failed message
          const failedMsg = {
            phone,
            name: conversation?.customer_name || 'Unknown',
            error: error instanceof Error ? error.message : 'Unknown exception',
            errorType: 'other' as const,
            timestamp: new Date().toISOString()
          };
          setFailedMessages(prev => [...prev, failedMsg]);
          
          // Remove from queue
          setSelectedRecipients(prev => prev.filter(p => p !== phone));
          
          console.error(`   ❌ EXCEPTION (${sendDuration}ms):`, error);
          console.error(`   🐛 Error details:`, error);
          console.log(`   🗑️ Removed from queue - ${selectedRecipients.length - 1} pending remaining`);
          
          // Update progress with all counts
          setBulkProgress({
            current: alreadySentCount + i + 1,
            total: originalTotal,
            success: successCount,
            failed: failCount
          });
        }
      }

      // Show final results with detailed stats
      const totalProcessed = recipientsToSend.length;
      const totalSkipped = selectedRecipients.length - recipientsToSend.length;
      
      // Add completion to timeline
      addTimelineEvent('Campaign Completed', `${successCount} sent, ${failCount} failed`);
      
      // Play completion sound
      if (successCount > 0 && failCount === 0) {
        playSound('complete');
      } else if (failCount > 0) {
        playSound('error');
      }
      
      // Send completion notification
      if (notificationsEnabled) {
        if (successCount === totalProcessed && totalProcessed > 0) {
          sendBrowserNotification(
            '✅ Campaign Complete!',
            `All ${successCount} messages sent successfully!`
          );
        } else {
          sendBrowserNotification(
            '📊 Campaign Complete',
            `${successCount} sent, ${failCount} failed`
          );
        }
      }
      
      if (successCount === totalProcessed && totalProcessed > 0) {
        toast.success(`✅ All ${successCount} messages sent successfully! ${totalSkipped > 0 ? `(${totalSkipped} skipped)` : ''}`, { duration: 5000 });
      } else if (successCount > 0) {
        toast.success(`✅ ${successCount} sent, ${failCount} failed${totalSkipped > 0 ? `, ${totalSkipped} skipped` : ''}`, { duration: 5000 });
      } else {
        toast.error(`❌ All ${failCount} messages failed${totalSkipped > 0 ? ` (${totalSkipped} skipped)` : ''}`);
      }
      
      console.log('\n╔═══════════════════════════════════════════════════════════════╗');
      console.log('║          📊 BULK WHATSAPP SEND - FINAL RESULTS              ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝');
      console.log(`✅ Successfully Sent: ${successCount}/${totalProcessed} (${Math.round(successCount/totalProcessed*100)}%)`);
      console.log(`❌ Failed: ${failCount}/${totalProcessed} (${Math.round(failCount/totalProcessed*100)}%)`);
      console.log(`⏭️  Skipped (Anti-ban): ${totalSkipped}`);
      console.log(`📊 Total Processed: ${totalProcessed}`);
      console.log(`📊 Total Selected: ${selectedRecipients.length}`);
      
      // Finalize campaign in database
      const campaignId = getCurrentCampaignId();
      if (campaignId) {
        const isSuccess = failCount === 0 || successCount > failCount;
        await finalizeCampaign(campaignId, {
          name: campaignName || `Campaign ${new Date().toLocaleDateString()}`,
          message: bulkMessage,
          messageType: bulkMessageType,
          selectedRecipients,
          sentPhones,
          bulkProgress: {
            current: alreadySentCount + totalProcessed,
            total: originalTotal,
            success: successCount,
            failed: failCount
          },
          failedMessages,
          campaignStartTime,
          settings: {
            usePersonalization,
            randomDelay,
            minDelay,
            maxDelay,
            usePresence,
            batchSize,
            batchDelay,
            maxPerHour,
            dailyLimit,
            skipRecentlyContacted,
            respectQuietHours,
            useInvisibleChars,
            useEmojiVariation,
            varyMessageLength
          },
          conversations: conversations.map(c => ({ phone: c.phone, customer_name: c.customer_name }))
        }, isSuccess);
        console.log(`✅ Campaign finalized in database`);
      }
      
      // Categorize and display failed messages by error type
      if (failedMessages.length > 0) {
        console.log(`\n❌ FAILURE ANALYSIS (${failedMessages.length} failed):`);
        
        const errorCategories = {
          not_on_whatsapp: failedMessages.filter((m: any) => m.errorType === 'not_on_whatsapp'),
          invalid_format: failedMessages.filter((m: any) => m.errorType === 'invalid_format'),
          rate_limit: failedMessages.filter((m: any) => m.errorType === 'rate_limit'),
          other: failedMessages.filter((m: any) => m.errorType === 'other')
        };
        
        if (errorCategories.not_on_whatsapp.length > 0) {
          console.log(`\n📱 NOT ON WHATSAPP (${errorCategories.not_on_whatsapp.length}):`);
          console.log(`   These numbers may have wrong country codes or aren't registered:`);
          errorCategories.not_on_whatsapp.slice(0, 5).forEach((m: any) => {
            console.log(`   • ${m.phone} (${m.name})`);
          });
          if (errorCategories.not_on_whatsapp.length > 5) {
            console.log(`   ... and ${errorCategories.not_on_whatsapp.length - 5} more`);
          }
          console.log(`   💡 TIP: Verify country codes and check if numbers are active on WhatsApp`);
        }
        
        if (errorCategories.invalid_format.length > 0) {
          console.log(`\n🔢 INVALID FORMAT (${errorCategories.invalid_format.length}):`);
          console.log(`   These numbers have formatting issues:`);
          errorCategories.invalid_format.slice(0, 5).forEach((m: any) => {
            console.log(`   • ${m.phone} (${m.name})`);
          });
          if (errorCategories.invalid_format.length > 5) {
            console.log(`   ... and ${errorCategories.invalid_format.length - 5} more`);
          }
          console.log(`   💡 TIP: Use format: CountryCode+Number (e.g., 255712345678)`);
        }
        
        if (errorCategories.rate_limit.length > 0) {
          console.log(`\n⏱️ RATE LIMIT (${errorCategories.rate_limit.length}):`);
          console.log(`   These failed due to API rate limiting`);
          console.log(`   💡 TIP: Increase delays or reduce batch size in anti-ban settings`);
        }
        
        if (errorCategories.other.length > 0) {
          console.log(`\n❓ OTHER ERRORS (${errorCategories.other.length}):`);
          errorCategories.other.slice(0, 3).forEach((m: any) => {
            console.log(`   • ${m.phone}: ${m.error.substring(0, 60)}...`);
          });
        }
      }
      
      console.log(`\n───────────────────────────────────────────────────────────────\n`);
      
      // Clear draft on successful completion
      if (successCount > 0) {
        clearDraft();
        console.log('🗑️ Draft cleared after successful send');
      }
      
      // Clear paused campaign state on completion
      clearPausedCampaignState();
      console.log('🗑️ Cleared paused campaign state after completion');
      
      // Reload messages to show new sent messages in history
      loadMessages();
      
      // Don't close modal - let user review results and close manually
      // setBulkStep stays at 4 to show completion screen
    } catch (error) {
      console.error('\n❌ [CRITICAL ERROR] Bulk send failed:');
      console.error('Error details:', error);
      console.error('Stack trace:', error);
      toast.error('Bulk send failed. Please try again.');
      setBulkStep(3); // Go back to review step on error
    } finally {
      setBulkSending(false);
      console.log('🏁 Bulk send process finished\n');
    }
  }
  
  // Helper to get API key for presence updates
  async function getApiKey(): Promise<string> {
    try {
      const { getIntegration } = await import('../../../lib/integrationsApi');
      const integration = await getIntegration('WHATSAPP_WASENDER');
      return integration?.credentials?.api_key || integration?.credentials?.bearer_token || '';
    } catch {
      return '';
    }
  }

  // Cloud campaign submission
  async function submitCloudCampaign() {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║     ☁️  BULK WHATSAPP - CLOUD MODE SUBMISSION START         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    
    if (!bulkMessage.trim() && bulkMessageType === 'text') {
      console.error('❌ [VALIDATION ERROR] Message is empty');
      toast.error('Please enter a message');
      return;
    }
    
    if (selectedRecipients.length === 0) {
      console.error('❌ [VALIDATION ERROR] No recipients selected');
      toast.error('Please select at least one recipient');
      return;
    }

    try {
      console.log('📋 [PREP] Preparing campaign data...');
      console.log(`   • Recipients: ${selectedRecipients.length}`);
      console.log(`   • Campaign Name: ${campaignName || 'Auto-generated'}`);
      console.log(`   • Message Type: ${bulkMessageType}`);
      console.log(`   • Has Media: ${!!bulkMedia}`);
      
      // Prepare recipients with names
      const recipientsWithNames = selectedRecipients.map(phone => {
        const conversation = conversations.find(c => c.phone === phone);
        return {
          phone,
          name: conversation?.customer_name || 'Customer'
        };
      });

      console.log(`   • Recipients prepared: ${recipientsWithNames.length}`);

      // Upload media if needed (simplified - you may need to implement actual upload)
      let mediaUrl = bulkMedia;
      
      const payload = {
        userId: currentUser?.id,
        name: campaignName || `Campaign ${new Date().toLocaleDateString()}`,
        message: bulkMessage,
        recipients: recipientsWithNames,
        settings: {
          use_personalization: usePersonalization,
          random_delay: randomDelay,
          min_delay: minDelay,
          max_delay: maxDelay,
          use_presence: usePresence
        },
        mediaUrl: mediaUrl,
        mediaType: bulkMediaType !== 'text' ? bulkMediaType : undefined
      };

      console.log('📤 [API] Sending campaign to cloud backend...');
      console.log('   Endpoint: POST /api/bulk-whatsapp/create');
      console.log('   Payload:', {
        ...payload,
        message: payload.message.substring(0, 50) + '...',
        recipients: `${payload.recipients.length} recipients`
      });
      
      // Call backend API to create campaign
      const response = await fetch('/api/bulk-whatsapp/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log(`📥 [RESPONSE] Status: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log('   Response data:', data);
      
      if (data.success) {
        console.log('✅ [SUCCESS] Campaign created successfully');
        console.log(`   Campaign ID: ${data.campaignId}`);
        
        setCloudCampaignId(data.campaignId);
        setBulkStep(4);
        toast.success('✅ Campaign submitted to cloud! Processing in background...');
        
        // Start polling for progress
        console.log('🔄 [POLLING] Starting progress monitoring...');
        startCloudCampaignPolling(data.campaignId);
      } else {
        console.error('❌ [ERROR] Campaign creation failed:', data.error);
        throw new Error(data.error || 'Failed to create campaign');
      }
    } catch (error) {
      console.error('❌ [EXCEPTION] Error submitting cloud campaign:', error);
      console.error('Stack trace:', error);
      toast.error('Failed to submit campaign to cloud');
    }
    
    console.log('───────────────────────────────────────────────────────────────\n');
  }

  // Poll cloud campaign progress
  function startCloudCampaignPolling(campaignId: string) {
    console.log(`\n🔄 [POLLING] Starting progress monitoring for campaign: ${campaignId}`);
    console.log('   Poll interval: 3 seconds');
    
    // Clear any existing interval
    if (pollingInterval) {
      console.log('   Clearing existing polling interval');
      clearInterval(pollingInterval);
    }

    let pollCount = 0;
    // Poll every 3 seconds
    const interval = setInterval(async () => {
      pollCount++;
      try {
        console.log(`\n📊 [POLL #${pollCount}] Fetching campaign status...`);
        const response = await fetch(`/api/bulk-whatsapp/status/${campaignId}`);
        const data = await response.json();
        
        console.log(`   Status: ${response.status}`);
        console.log(`   Success: ${data.success}`);
        
        if (data.success && data.campaign) {
          const campaign = data.campaign;
          
          console.log(`   Campaign Status: ${campaign.status}`);
          console.log(`   Progress: ${campaign.progress.current}/${campaign.progress.total}`);
          console.log(`   Success: ${campaign.progress.success} | Failed: ${campaign.progress.failed}`);
          
          // Update progress
          setBulkProgress({
            current: campaign.progress.current,
            total: campaign.progress.total,
            success: campaign.progress.success,
            failed: campaign.progress.failed
          });
          
          // If completed, stop polling
          if (campaign.status === 'completed' || campaign.status === 'failed') {
            console.log(`\n🏁 [POLLING] Campaign finished with status: ${campaign.status}`);
            console.log(`   Total polls: ${pollCount}`);
            console.log(`   Final results: ${campaign.progress.success} sent, ${campaign.progress.failed} failed`);
            console.log(`   Stopping polling...\n`);
            
            clearInterval(interval);
            setPollingInterval(null);
            
            if (campaign.status === 'completed') {
              toast.success(`✅ Campaign complete! ${campaign.progress.success} sent, ${campaign.progress.failed} failed`);
            } else {
              toast.error('Campaign failed');
            }
          }
        }
      } catch (error) {
        console.error(`❌ [POLL ERROR] Error on poll #${pollCount}:`, error);
      }
    }, 3000);
    
    setPollingInterval(interval);
    console.log('✅ [POLLING] Polling interval started\n');
  }

  // Pause cloud campaign
  async function pauseCloudCampaign() {
    if (!cloudCampaignId) {
      console.error('❌ [PAUSE] No campaign ID available');
      return;
    }
    
    console.log(`\n⏸️ [PAUSE] Pausing cloud campaign: ${cloudCampaignId}`);
    
    try {
      const response = await fetch(`/api/bulk-whatsapp/pause/${cloudCampaignId}`, {
        method: 'POST'
      });
      
      console.log(`   Response status: ${response.status}`);
      
      if (response.ok) {
        console.log('✅ [SUCCESS] Campaign paused');
        toast.success('Campaign paused');
      } else {
        console.error('❌ [ERROR] Failed to pause campaign:', response.statusText);
      }
    } catch (error) {
      console.error('❌ [EXCEPTION] Error pausing campaign:', error);
      toast.error('Failed to pause campaign');
    }
  }

  // Resume cloud campaign
  async function resumeCloudCampaign() {
    if (!cloudCampaignId) {
      console.error('❌ [RESUME] No campaign ID available');
      return;
    }
    
    console.log(`\n▶️ [RESUME] Resuming cloud campaign: ${cloudCampaignId}`);
    
    try {
      const response = await fetch(`/api/bulk-whatsapp/resume/${cloudCampaignId}`, {
        method: 'POST'
      });
      
      console.log(`   Response status: ${response.status}`);
      
      if (response.ok) {
        console.log('✅ [SUCCESS] Campaign resumed');
        toast.success('Campaign resumed');
      } else {
        console.error('❌ [ERROR] Failed to resume campaign:', response.statusText);
      }
    } catch (error) {
      console.error('Error resuming campaign:', error);
      toast.error('Failed to resume campaign');
    }
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const unreadCount = conversations.reduce((sum, c) => sum + c.unread_count, 0);
  const unrepliedCount = conversations.filter(c => {
    const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
    return lastMsg?.type === 'received';
  }).length;
  
  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv => {
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        conv.last_message?.toLowerCase().includes(search) ||
        conv.phone?.toLowerCase().includes(search) ||
        conv.customer_name?.toLowerCase().includes(search)
      );
    }
    return true;
  });
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      // Today - show time only
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } else if (diffInHours < 48) {
      // Yesterday
      return 'Yesterday ' + date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } else if (diffInHours < 168) {
      // This week - show day name
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } else {
      // Older - show full date
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  // Helper functions for enhanced Step 1
  const getEngagementScore = (conversation: Conversation): { level: string; color: string; score: number } => {
    const messageCount = conversation.messages.length;
    const hasReplied = conversation.messages.filter(m => m.type === 'received').length;
    const replyRate = messageCount > 0 ? (hasReplied / messageCount) * 100 : 0;
    
    let score = 0;
    score += Math.min(messageCount * 2, 30); // Up to 30 points
    score += Math.min(hasReplied * 10, 50); // Up to 50 points
    score += Math.min(replyRate, 20); // Up to 20 points
    
    if (score >= 70) return { level: 'High', color: 'green', score };
    if (score >= 40) return { level: 'Medium', color: 'yellow', score };
    return { level: 'Low', color: 'gray', score };
  };
  
  const isPhoneBlacklisted = (phone: string): boolean => {
    return blacklist.some(b => b.phone === phone);
  };
  
  const isValidPhone = (phone: string): boolean => {
    const cleaned = phone.replace(/[^\d+]/g, '');
    return cleaned.length >= 10 && /^\+?\d{10,15}$/.test(cleaned);
  };
  
  // BulkStep1Enhanced helper functions
  const applyQuickFilter = (filter: string) => {
    setActiveQuickFilter(filter);
    // Apply filter logic based on filter type
    if (filter === 'all') {
      setSelectedRecipients(conversations.map(c => c.phone));
    } else if (filter === 'high-engagement') {
      const highEngagement = conversations.filter(c => getEngagementScore(c).level === 'High');
      setSelectedRecipients(highEngagement.map(c => c.phone));
    } else if (filter === 'recent') {
      const recent = conversations.slice(0, 10);
      setSelectedRecipients(recent.map(c => c.phone));
    } else if (filter === 'unread') {
      const unread = conversations.filter(c => c.unread_count > 0);
      setSelectedRecipients(unread.map(c => c.phone));
    }
  };
  
  const clearQuickFilter = () => {
    setActiveQuickFilter(null);
    setSelectedRecipients([]);
  };
  
  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setCsvFile(file);
    setCsvUploading(true);
    
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const recipients: Array<{ phone: string; name: string }> = [];
      
      // Parse CSV (assuming format: name,phone or phone,name)
      lines.slice(1).forEach(line => { // Skip header
        const [col1, col2] = line.split(',').map(s => s.trim());
        if (col1 && col2) {
          // Try to detect which column is phone
          const isCol1Phone = /^\+?\d{10,15}$/.test(col1.replace(/[^\d+]/g, ''));
          const phone = isCol1Phone ? col1 : col2;
          const name = isCol1Phone ? col2 : col1;
          
          if (isValidPhone(phone)) {
            recipients.push({ phone, name });
          }
        }
      });
      
      setCsvRecipients(recipients);
      setSelectedRecipients(recipients.map(r => r.phone));
      toast.success(`Imported ${recipients.length} recipients from CSV`);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error('Failed to parse CSV file');
    } finally {
      setCsvUploading(false);
    }
  };
  
  // Handle media upload for bulk messages
  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file size (max 16MB for WhatsApp)
    const maxSize = 16 * 1024 * 1024; // 16MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 16MB');
      return;
    }
    
    try {
      toast.loading('Uploading media...', { id: 'media-upload' });
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setBulkMediaPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        setBulkMediaType('image');
        setBulkMessageType('image');
      } else if (file.type.startsWith('video/')) {
        setBulkMediaType('video');
        setBulkMessageType('video');
      } else if (file.type.startsWith('audio/')) {
        setBulkMediaType('audio');
        setBulkMessageType('audio');
      } else {
        setBulkMediaType('document');
        setBulkMessageType('document');
      }
      
      // Store file for upload when sending (will upload to WasenderAPI per recipient)
      // This avoids uploading the same file multiple times
      setBulkMedia(file);
      
      toast.success('Media ready to send!', { id: 'media-upload' });
    } catch (error) {
      console.error('Error uploading media:', error);
      toast.error('Failed to upload media', { id: 'media-upload' });
    }
  };
  
  const clearCsvImport = () => {
    setCsvFile(null);
    setCsvRecipients([]);
    setSelectedRecipients([]);
  };
  
  const loadRecipientList = async (listId: string) => {
    try {
      // Load saved recipient list from database
      const { data, error } = await supabase
        .from('whatsapp_recipient_lists')
        .select('*')
        .eq('id', listId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setSelectedRecipients(data.recipients || []);
        setCampaignName(data.name);
        toast.success(`Loaded list: ${data.name}`);
      }
    } catch (error) {
      console.error('Error loading recipient list:', error);
      toast.error('Failed to load recipient list');
    }
  };
  
  const loadAllCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('phone, whatsapp');
      
      if (error) throw error;
      
      const phones: string[] = [];
      data?.forEach((customer: any) => {
        // Only add customers that have a phone or whatsapp number
        if (customer.whatsapp) phones.push(customer.whatsapp);
        else if (customer.phone) phones.push(customer.phone);
      });
      
      setSelectedRecipients(phones);
      toast.success(`Loaded ${phones.length} customers with phone numbers`);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Failed to load customers');
    }
  };

  // Insert variable into message at cursor position
  const insertVariable = (variable: string) => {
    const textarea = messageTextareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = bulkMessage;
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    const newText = before + variable + after;
    setBulkMessage(newText);
    
    // Set cursor position after inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
    
    setShowVariablesMenu(false);
  };
  
  // Quick action to change message type and close attach menu
  const quickChangeMessageType = (type: typeof bulkMessageType) => {
    setBulkMessageType(type);
    setShowAttachMenu(false);
    toast.success(`Switched to ${type} message`);
  };
  
  // Add invisible characters to make each message unique (advanced anti-ban)
  const addInvisibleVariation = (text: string, index: number): string => {
    // Invisible Unicode characters that don't affect display
    const invisibleChars = [
      '\u200B', // Zero-width space
      '\u200C', // Zero-width non-joiner
      '\u200D', // Zero-width joiner
      '\uFEFF', // Zero-width no-break space
    ];
    
    // Select invisible char based on message index (cycles through them)
    const charIndex = index % invisibleChars.length;
    const invisibleChar = invisibleChars[charIndex];
    
    // Add 1-3 invisible characters at random positions
    const numChars = 1 + (index % 3); // 1, 2, or 3 chars
    let modifiedText = text;
    
    for (let i = 0; i < numChars; i++) {
      // Insert at random word boundary
      const words = modifiedText.split(' ');
      if (words.length > 1) {
        const insertPos = Math.floor(Math.random() * (words.length - 1)) + 1;
        words.splice(insertPos, 0, invisibleChar);
        modifiedText = words.join(' ');
      } else {
        // If single word, add at end
        modifiedText += invisibleChar;
      }
    }
    
    return modifiedText;
  };
  
  // Rotate emoji variants to make messages unique
  const varyEmojis = (text: string, index: number): string => {
    // Emoji groups with similar meanings (rotate through them)
    const emojiGroups: { [key: string]: string[] } = {
      '👍': ['👍', '👌', '✌️', '🤙', '🤝'],
      '😊': ['😊', '😃', '🙂', '😄', '😁'],
      '❤️': ['❤️', '💚', '💙', '💜', '🧡'],
      '🎉': ['🎉', '🎊', '🥳', '🎈', '✨'],
      '🔥': ['🔥', '💥', '⚡', '✨', '💫'],
      '😍': ['😍', '🤩', '😻', '💖', '💕'],
      '💯': ['💯', '✅', '👏', '🏆', '⭐'],
      '🎁': ['🎁', '🎀', '🛍️', '💝', '🎊'],
    };
    
    let modifiedText = text;
    
    // Find and replace emojis with variants
    for (const [baseEmoji, variants] of Object.entries(emojiGroups)) {
      if (modifiedText.includes(baseEmoji)) {
        // Select variant based on message index
        const variantIndex = index % variants.length;
        const replacement = variants[variantIndex];
        // Replace first occurrence only
        modifiedText = modifiedText.replace(baseEmoji, replacement);
      }
    }
    
    return modifiedText;
  };
  
  // Save draft to localStorage
  const saveDraft = () => {
    try {
      const draft = {
        // Step 1
        selectedRecipients,
        campaignName,
        // Step 2
        bulkStep,
        bulkMessage,
        bulkMessageType,
        bulkMedia: typeof bulkMedia === 'string' ? bulkMedia : null, // Only save URLs, not File objects
        bulkMediaType,
        bulkMediaPreview,
        viewOnce,
        pollQuestion,
        pollOptions,
        allowMultiSelect,
        locationLat,
        locationLng,
        locationName,
        locationAddress,
        // Settings
        usePersonalization,
        randomDelay,
        minDelay,
        maxDelay,
        batchSize,
        batchDelay,
        maxPerHour,
        dailyLimit,
        skipRecentlyContacted,
        respectQuietHours,
        useInvisibleChars,
        useEmojiVariation,
        varyMessageLength,
        // Metadata
        savedAt: new Date().toISOString(),
      };
      
      localStorage.setItem('whatsapp_bulk_draft', JSON.stringify(draft));
      setHasDraft(true);
      console.log('💾 Draft saved');
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  };
  
  // Load draft from localStorage
  const loadDraft = () => {
    try {
      const draftJson = localStorage.getItem('whatsapp_bulk_draft');
      if (!draftJson) {
        setHasDraft(false);
        return false;
      }
      
      const draft = JSON.parse(draftJson);
      
      // Restore state
      setSelectedRecipients(draft.selectedRecipients || []);
      setCampaignName(draft.campaignName || '');
      setBulkStep(draft.bulkStep || 1);
      setBulkMessage(draft.bulkMessage || '');
      setBulkMessageType(draft.bulkMessageType || 'text');
      setBulkMedia(draft.bulkMedia || null);
      setBulkMediaType(draft.bulkMediaType || '');
      setBulkMediaPreview(draft.bulkMediaPreview || '');
      setViewOnce(draft.viewOnce || false);
      setPollQuestion(draft.pollQuestion || '');
      setPollOptions(draft.pollOptions || ['', '']);
      setAllowMultiSelect(draft.allowMultiSelect || false);
      setLocationLat(draft.locationLat || '');
      setLocationLng(draft.locationLng || '');
      setLocationName(draft.locationName || '');
      setLocationAddress(draft.locationAddress || '');
      setUsePersonalization(draft.usePersonalization ?? true);
      setRandomDelay(draft.randomDelay ?? true);
      setMinDelay(draft.minDelay || 3);
      setMaxDelay(draft.maxDelay || 8);
      setBatchSize(draft.batchSize || 20);
      setBatchDelay(draft.batchDelay || 60);
      setMaxPerHour(draft.maxPerHour || 30);
      setDailyLimit(draft.dailyLimit || 100);
      setSkipRecentlyContacted(draft.skipRecentlyContacted ?? true);
      setRespectQuietHours(draft.respectQuietHours ?? true);
      setUseInvisibleChars(draft.useInvisibleChars ?? true);
      setUseEmojiVariation(draft.useEmojiVariation ?? true);
      setVaryMessageLength(draft.varyMessageLength ?? true);
      
      setHasDraft(true);
      console.log('📂 Draft loaded from:', draft.savedAt);
      toast.success('Draft restored! Continue where you left off.');
      return true;
    } catch (error) {
      console.error('Failed to load draft:', error);
      setHasDraft(false);
      return false;
    }
  };
  
  // Clear draft from localStorage
  const clearDraft = () => {
    try {
      localStorage.removeItem('whatsapp_bulk_draft');
      setHasDraft(false);
      toast.success('Draft cleared');
      console.log('🗑️ Draft cleared');
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  };
  
  // Auto-save anti-ban settings to database when they change
  useEffect(() => {
    const saveSettings = async () => {
      try {
        const settings = {
          usePersonalization,
          randomDelay,
          minDelay,
          maxDelay,
          usePresence,
          batchSize,
          batchDelay,
          maxPerHour,
          dailyLimit,
          skipRecentlyContacted,
          respectQuietHours,
          useInvisibleChars,
          useEmojiVariation,
          varyMessageLength,
        };
        
        const response = await fetch('/api/antiban-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings),
        });
        
        if (!response.ok) {
          throw new Error('Failed to save settings to database');
        }
        
        console.log('⚙️ Anti-ban settings saved to database');
        
        // Also save to localStorage as backup
        localStorage.setItem('whatsapp_antiban_settings', JSON.stringify({
          ...settings,
          savedAt: new Date().toISOString(),
        }));
      } catch (error) {
        console.error('Failed to save anti-ban settings to database:', error);
        // Fallback to localStorage only if database fails
        try {
          const settings = {
            usePersonalization,
            randomDelay,
            minDelay,
            maxDelay,
            usePresence,
            batchSize,
            batchDelay,
            maxPerHour,
            dailyLimit,
            skipRecentlyContacted,
            respectQuietHours,
            useInvisibleChars,
            useEmojiVariation,
            varyMessageLength,
            savedAt: new Date().toISOString(),
          };
          localStorage.setItem('whatsapp_antiban_settings', JSON.stringify(settings));
          console.log('⚙️ Anti-ban settings saved to localStorage (fallback)');
        } catch (localError) {
          console.error('Failed to save to localStorage fallback:', localError);
        }
      }
    };
    
    // Debounce saves to avoid too frequent API calls
    const timeoutId = setTimeout(() => {
      saveSettings();
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [
    usePersonalization, randomDelay, minDelay, maxDelay, usePresence,
    batchSize, batchDelay, maxPerHour, dailyLimit,
    skipRecentlyContacted, respectQuietHours, useInvisibleChars,
    useEmojiVariation, varyMessageLength
  ]);
  
  // Auto-save draft when key state changes
  useEffect(() => {
    if (showBulkModal && (selectedRecipients.length > 0 || bulkMessage.trim() || campaignName.trim())) {
      // Debounce saves to avoid too frequent writes
      const timeoutId = setTimeout(() => {
        saveDraft();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [showBulkModal, selectedRecipients, bulkMessage, bulkMessageType, campaignName, bulkStep, pollQuestion, locationLat, locationLng]);
  
  // Render message with WhatsApp formatting
  const renderWhatsAppFormatting = (text: string) => {
    // Replace all variables first
    let formattedText = text;
    if (usePersonalization && selectedRecipients.length > 0) {
      const firstConv = conversations.find(c => c.phone === selectedRecipients[0]);
      const now = new Date();
      const greetingHour = now.getHours();
      const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 18 ? 'Good afternoon' : 'Good evening';
      
      formattedText = formattedText
        .replace(/\{name\}/gi, firstConv?.customer_name || 'Customer')
        .replace(/\{phone\}/gi, selectedRecipients[0] || 'Phone')
        .replace(/\{date\}/gi, now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))
        .replace(/\{time\}/gi, now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
        .replace(/\{greeting\}/gi, greeting)
        .replace(/\{day\}/gi, now.toLocaleDateString('en-US', { weekday: 'long' }))
        .replace(/\{month\}/gi, now.toLocaleDateString('en-US', { month: 'long' }))
        .replace(/\{company\}/gi, 'Dukani Pro');
    }
    
    // Convert WhatsApp formatting to HTML
    const parts = [];
    let currentIndex = 0;
    
    // Bold: *text*
    formattedText = formattedText.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
    
    // Italic: _text_
    formattedText = formattedText.replace(/_([^_]+)_/g, '<em>$1</em>');
    
    // Strikethrough: ~text~
    formattedText = formattedText.replace(/~([^~]+)~/g, '<del>$1</del>');
    
    // Monospace: ```text```
    formattedText = formattedText.replace(/```([^`]+)```/g, '<code class="bg-gray-200 px-1 rounded">$1</code>');
    
    return formattedText;
  };

  // Show error state if initialization failed
  if (initError) {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load WhatsApp Inbox</h2>
          <p className="text-gray-600 mb-6 text-center max-w-md">{initError}</p>
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={() => {
                const error = new Error(initError);
                errorExporter.exportError(error, {
                  severity: 'critical',
                  module: 'WhatsAppInboxPage',
                  function: 'initialization',
                  operation: 'page_load',
                  context: {
                    filter,
                    currentUser: currentUser?.id,
                  },
                  autoDownload: true,
                });
                toast.success('Error details downloaded!');
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Error Details
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Helper function to render minimized campaign panel
  const renderMinimizedPanel = () => {
    if (!isMinimized || !showBulkModal) return null;
    
    const isSending = bulkSending || bulkProgress.total > 0;
    const successRate = bulkProgress.success + bulkProgress.failed > 0 
      ? Math.round((bulkProgress.success / (bulkProgress.success + bulkProgress.failed)) * 100) 
      : 0;
    
    return (
      <div 
        className="fixed bottom-4 right-4 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
        style={{ 
          zIndex: 999999,
          width: '280px'
        }}
      >
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center shadow-lg">
                {isSending ? (
                  <Send className="w-4 h-4 text-white" />
                ) : (
                  <Users className="w-4 h-4 text-white" />
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {isSending ? 'Campaign Active' : 'Bulk Campaign'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimizedExpanded(!isMinimizedExpanded)}
                className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                title={isMinimizedExpanded ? 'Collapse' : 'Expand details'}
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${isMinimizedExpanded ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={() => {
                  setIsMinimized(false);
                  toast.success('Expanded to full view');
                }}
                className="w-7 h-7 flex items-center justify-center bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full transition-colors"
                title="Expand to full modal"
              >
                <Eye className="w-4 h-4" />
              </button>
              {!isSending && (
                <button
                  onClick={() => {
                    if (window.confirm('Close campaign?')) {
                      setIsMinimized(false);
                      setShowBulkModal(false);
                      setBulkStep(1);
                      setSelectedRecipients([]);
                      setBulkMessage('');
                    }
                  }}
                  className="w-7 h-7 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className={`p-3 space-y-3 text-xs bg-white ${isMinimizedExpanded ? 'overflow-y-auto' : ''}`} 
               style={{ maxHeight: isMinimizedExpanded ? '500px' : 'auto' }}>
            {/* Progress */}
            {isSending && (
              <div className="space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span className="font-medium">Progress</span>
                  <span className="font-semibold text-gray-900">{bulkProgress.current}/{bulkProgress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-300"
                    style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-center text-xs text-gray-600">
                  {bulkProgress.total > 0 ? Math.round((bulkProgress.current / bulkProgress.total) * 100) : 0}% Complete
                </p>
              </div>
            )}

            {/* Stats */}
            {(bulkProgress.success > 0 || bulkProgress.failed > 0) && (
              <div className="flex gap-2 text-xs">
                <div className="flex-1 bg-green-50 border border-green-200 p-2 rounded-xl">
                  <div className="text-gray-600 mb-1">Success</div>
                  <div className="font-bold text-green-600 text-lg">{bulkProgress.success}</div>
                </div>
                <div className="flex-1 bg-red-50 border border-red-200 p-2 rounded-xl">
                  <div className="text-gray-600 mb-1">Failed</div>
                  <div className="font-bold text-red-600 text-lg">{bulkProgress.failed}</div>
                </div>
              </div>
            )}

            {/* Expanded Details */}
            {isMinimizedExpanded && (
              <>
                {/* Campaign Stats */}
                {(bulkProgress.success > 0 || bulkProgress.failed > 0) && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                    <h4 className="font-semibold text-gray-900 mb-2 text-xs">Campaign Statistics</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-600">Success Rate</p>
                        <p className="font-bold text-purple-600">
                          {bulkProgress.success + bulkProgress.failed > 0 
                            ? Math.round((bulkProgress.success / (bulkProgress.success + bulkProgress.failed)) * 100) 
                            : 0}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Remaining</p>
                        <p className="font-bold text-orange-600">
                          {bulkProgress.total - bulkProgress.current}
                        </p>
                      </div>
                      {estimatedTimeRemaining && (
                        <div className="col-span-2">
                          <p className="text-gray-600">Est. Time Left</p>
                          <p className="font-bold text-blue-600">{formatDuration(estimatedTimeRemaining)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {campaignTimeline.length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <h4 className="font-semibold text-gray-900 mb-2 text-xs flex items-center gap-1">
                      <History className="w-3 h-3" />
                      Recent Activity
                    </h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {[...campaignTimeline].reverse().slice(0, 3).map((event, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{event.event}</p>
                            {event.details && (
                              <p className="text-gray-600 text-[10px]">{event.details}</p>
                            )}
                            <p className="text-gray-500 text-[10px]">
                              {new Date(event.time).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Recipients */}
                {sentPhones.length > 0 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                    <h4 className="font-semibold text-gray-900 mb-2 text-xs flex items-center gap-1">
                      <CheckCheck className="w-3 h-3" />
                      Recently Sent ({sentPhones.length})
                    </h4>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {sentPhones.slice(-3).reverse().map(phone => {
                        const conv = conversations.find(c => c.phone === phone);
                        return (
                          <div key={phone} className="text-xs text-gray-700 flex items-center gap-2 bg-white p-1.5 rounded">
                            <CheckCheck className="w-2.5 h-2.5 text-green-500 flex-shrink-0" />
                            <span className="font-medium truncate">{conv?.customer_name || 'Unknown'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Failed Messages */}
                {failedMessages.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <h4 className="font-semibold text-gray-900 mb-2 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Failed ({failedMessages.length})
                    </h4>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {failedMessages.slice(0, 3).map((failed, idx) => (
                        <div key={idx} className="bg-white p-1.5 rounded text-[10px]">
                          <p className="font-medium text-gray-900">{failed.name}</p>
                          <p className="text-red-600 truncate">❌ {failed.error}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Export Actions */}
                {!bulkSending && (bulkProgress.success > 0 || failedMessages.length > 0) && (
                  <div className="pt-2 border-t border-gray-200 space-y-1">
                    <p className="text-[10px] font-semibold text-gray-700 mb-1">Export Data</p>
                    {sentPhones.length > 0 && (
                      <button
                        onClick={exportSentRecipients}
                        className="w-full px-2 py-1.5 bg-green-600 text-white text-[10px] font-medium rounded-lg hover:bg-green-700 flex items-center justify-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Export Sent ({sentPhones.length})
                      </button>
                    )}
                    {failedMessages.length > 0 && (
                      <>
                        <button
                          onClick={exportFailedRecipients}
                          className="w-full px-2 py-1.5 bg-red-600 text-white text-[10px] font-medium rounded-lg hover:bg-red-700 flex items-center justify-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          Export Failed ({failedMessages.length})
                        </button>
                        <button
                          onClick={addFailedToBlacklist}
                          className="w-full px-2 py-1.5 bg-gray-800 text-white text-[10px] font-medium rounded-lg hover:bg-gray-900 flex items-center justify-center gap-1"
                        >
                          <UserX className="w-3 h-3" />
                          Blacklist Failed
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Controls */}
            {isSending ? (
              <div className="space-y-2 pt-2 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsPaused(true);
                    toast('Pausing...');
                  }}
                  disabled={isPaused || isStopped}
                  className="w-full px-3 py-2 bg-yellow-500 text-white text-xs font-medium rounded-xl hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                >
                  {isPaused ? 'Pausing...' : 'Pause Campaign'}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Stop campaign?')) {
                      setIsStopped(true);
                      toast('Stopping...');
                    }
                  }}
                  disabled={isStopped}
                  className="w-full px-3 py-2 bg-red-500 text-white text-xs font-medium rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                >
                  {isStopped ? 'Stopping...' : 'Stop Campaign'}
                </button>
              </div>
            ) : (
              (bulkProgress.current === bulkProgress.total && bulkProgress.total > 0) && (
                <div className="pt-2 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setIsMinimized(false);
                      setShowBulkModal(false);
                      setBulkStep(1);
                      setBulkSending(false);
                      setBulkProgress({ current: 0, total: 0, success: 0, failed: 0 });
                      setSelectedRecipients([]);
                      setBulkMessage('');
                      clearPausedCampaignState();
                      toast.success('Complete');
                    }}
                    className="w-full px-3 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-semibold rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg"
                  >
                    Done
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  };
  
  // Main component return
  return (
    <>
      {/* Main Content */}
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Combined Container - WhatsApp Style */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Fixed Header Section - WhatsApp Style */}
        <div className="p-6 bg-gradient-to-r from-green-600 to-emerald-600 border-b border-green-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Left: WhatsApp Branding */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                <MessageCircle className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">WhatsApp Business</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-sm text-green-100 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
                    {messages.length} conversations • {unreadCount} new
                  </p>
                  {activeSession && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                      <span className={`w-2 h-2 rounded-full ${activeSession.status === 'connected' ? 'bg-green-300' : 'bg-red-400'}`}></span>
                      <span className="text-xs text-white font-medium">
                        📱 {activeSession.name}
                      </span>
                    </div>
                  )}
                  {!activeSession && !loadingActiveSession && (
                    <button
                      onClick={() => setShowSessionModal(true)}
                      className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 rounded-full text-xs text-white font-semibold transition-all flex items-center gap-1"
                      title="No active session - click to set up"
                    >
                      <AlertCircle className="w-3 h-3" />
                      No Session
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSessionModal(true)}
                className="px-4 py-2 bg-white text-indigo-600 rounded-full flex items-center gap-2 font-semibold hover:bg-indigo-50 transition-all shadow-lg"
                title="Manage WhatsApp sessions"
              >
                <Smartphone className="w-4 h-4" />
                <span className="hidden lg:inline">Sessions</span>
              </button>
              <button
                onClick={() => setShowComposeModal(true)}
                className="px-4 py-2 bg-white text-green-600 rounded-full flex items-center gap-2 font-semibold hover:bg-green-50 transition-all shadow-lg"
                title="Send new message"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">New Message</span>
              </button>
              
              {/* Resume Campaign Button - Shows when there's a paused campaign */}
              {pausedCampaignState && (
                <>
                  <button
                    onClick={() => {
                      console.log('▶️ Opening resume options...');
                      
                      // Check if campaign is old
                      const pausedTime = new Date(pausedCampaignState.pauseTimestamp || pausedCampaignState.timestamp).getTime();
                      const hoursSincePaused = (Date.now() - pausedTime) / (1000 * 60 * 60);
                      
                      if (hoursSincePaused > 24) {
                        const proceed = window.confirm(
                          `⚠️ WARNING: Campaign paused ${Math.floor(hoursSincePaused)} hours ago\n\n` +
                          `Recipients list may be outdated. Review before sending?\n\n` +
                          `Click OK to review, Cancel to resume as-is.`
                        );
                        
                        if (proceed) {
                          setEditingBeforeResume(true);
                        }
                      }
                      
                      // Restore campaign state
                      const state = pausedCampaignState;
                      
                      // CRITICAL: Restore sentPhones FIRST to avoid duplicate sends
                      const restoredSentPhones = state.sentPhones || [];
                      setSentPhones(restoredSentPhones);
                      console.log(`📋 Restored ${restoredSentPhones.length} already-sent phones from paused campaign`);
                      
                      // Filter out already-sent phones from selectedRecipients
                      const pendingRecipients = (state.selectedRecipients || []).filter(
                        phone => !restoredSentPhones.includes(phone)
                      );
                      setSelectedRecipients(pendingRecipients);
                      console.log(`📋 ${pendingRecipients.length} pending recipients remaining (filtered out ${restoredSentPhones.length} already sent)`);
                      
                      setBulkMessage(state.bulkMessage || '');
                      setBulkMessageType(state.bulkMessageType || 'text');
                      setBulkMedia(state.bulkMedia || null);
                      setBulkProgress(state.bulkProgress || { current: 0, total: 0, success: 0, failed: 0 });
                      
                      // Restore settings
                      if (state.usePersonalization !== undefined) setUsePersonalization(state.usePersonalization);
                      if (state.randomDelay !== undefined) setRandomDelay(state.randomDelay);
                      if (state.minDelay) setMinDelay(state.minDelay);
                      if (state.maxDelay) setMaxDelay(state.maxDelay);
                      if (state.usePresence !== undefined) setUsePresence(state.usePresence);
                      if (state.batchSize) setBatchSize(state.batchSize);
                      if (state.batchDelay) setBatchDelay(state.batchDelay);
                      if (state.maxPerHour) setMaxPerHour(state.maxPerHour);
                      if (state.dailyLimit) setDailyLimit(state.dailyLimit);
                      if (state.skipRecentlyContacted !== undefined) setSkipRecentlyContacted(state.skipRecentlyContacted);
                      if (state.respectQuietHours !== undefined) setRespectQuietHours(state.respectQuietHours);
                      if (state.useInvisibleChars !== undefined) setUseInvisibleChars(state.useInvisibleChars);
                      if (state.useEmojiVariation !== undefined) setUseEmojiVariation(state.useEmojiVariation);
                      if (state.varyMessageLength !== undefined) setVaryMessageLength(state.varyMessageLength);
                      if (state.viewOnce !== undefined) setViewOnce(state.viewOnce);
                      if (state.pollQuestion) setPollQuestion(state.pollQuestion);
                      if (state.pollOptions) setPollOptions(state.pollOptions);
                      if (state.allowMultiSelect !== undefined) setAllowMultiSelect(state.allowMultiSelect);
                      if (state.locationLat) setLocationLat(state.locationLat);
                      if (state.locationLng) setLocationLng(state.locationLng);
                      if (state.locationName) setLocationName(state.locationName);
                      if (state.locationAddress) setLocationAddress(state.locationAddress);
                      
                      // Open modal
                      setShowBulkModal(true);
                      
                      if (editingBeforeResume) {
                        // Go to compose step to edit
                        setBulkStep(2);
                        toast('Review and edit your message before resuming', { icon: '✏️', duration: 5000 });
                      } else {
                        // Go directly to sending step
                        setBulkStep(4);
                        
                        // Start sending
                        setTimeout(() => {
                          sendBulkMessages(true); // true = resuming
                        }, 500);
                      }
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full flex items-center gap-2 font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg animate-pulse"
                    title={`Resume paused campaign (${sentPhones.length} sent, ${(pausedCampaignState.selectedRecipients?.length || 0) - sentPhones.length} remaining)`}
                  >
                    <Activity className="w-4 h-4" />
                    <span className="hidden lg:inline">Resume Campaign</span>
                    <span className="bg-white text-green-600 px-2 py-0.5 rounded-full text-xs font-bold">
                      {(pausedCampaignState.selectedRecipients?.length || 0) - sentPhones.length} left
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      // Show edit option
                      const action = window.confirm(
                        '📝 Edit Message Before Resuming?\n\n' +
                        'Click OK to edit the message first\n' +
                        'Click Cancel to discard this campaign'
                      );
                      
                      if (action) {
                        setEditingBeforeResume(true);
                        // Trigger resume which will go to edit step
                        document.querySelector<HTMLButtonElement>('button[title*="Resume paused campaign"]')?.click();
                      } else {
                        if (window.confirm('Are you sure you want to discard the paused campaign? This cannot be undone.')) {
                          clearPausedCampaignState();
                          toast.success('Paused campaign discarded');
                        }
                      }
                    }}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-all flex items-center gap-1"
                    title="Edit or discard paused campaign"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </>
              )}
              
              <button
                onClick={() => {
                  console.log('🚀 Opening Bulk Send modal...');
                  
                  // Check if draft exists and ask user
                  const draftExists = localStorage.getItem('whatsapp_bulk_draft');
                  if (draftExists && hasDraft) {
                    const useDraft = window.confirm(
                      '💾 You have a saved draft from a previous session.\n\n' +
                      'Would you like to continue where you left off?\n\n' +
                      'Click OK to load draft, or Cancel to start fresh.'
                    );
                    
                    if (useDraft) {
                      loadDraft();
                    } else {
                      // Start fresh
                      clearDraft();
                  setBulkStep(1);
                    }
                  } else {
                    setBulkStep(1);
                  }
                  
                  setIsMinimized(false); // Reset minimized state
                  setBulkSending(false); // Reset sending state
                  setBulkProgress({ current: 0, total: 0, success: 0, failed: 0 }); // Reset progress
                  setShowBulkModal(true);
                }}
                className="px-4 py-2 bg-white text-blue-600 rounded-full flex items-center gap-2 font-semibold hover:bg-blue-50 transition-all shadow-lg relative"
                title={hasDraft ? "Send bulk messages (Draft available)" : "Send bulk messages"}
              >
                <Users className="w-4 h-4" />
                <span className="hidden lg:inline">Bulk Send</span>
                {hasDraft && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" title="Draft saved"></span>
                )}
              </button>
              <button
                onClick={() => setShowCampaignHistory(true)}
                className="px-4 py-2 bg-white text-purple-600 rounded-full flex items-center gap-2 font-semibold hover:bg-purple-50 transition-all shadow-lg"
                title="View campaign history"
              >
                <History className="w-4 h-4" />
                <span className="hidden xl:inline">History</span>
              </button>
              <button
                onClick={() => setShowCampaignManagement(true)}
                className="px-4 py-2 bg-white text-indigo-600 rounded-full flex items-center gap-2 font-semibold hover:bg-indigo-50 transition-all shadow-lg"
                title="Manage campaigns"
              >
                <Activity className="w-4 h-4" />
                <span className="hidden xl:inline">Campaigns</span>
              </button>
              <button
                onClick={() => setShowBlacklistModal(true)}
                className="px-4 py-2 bg-white text-red-600 rounded-full flex items-center gap-2 font-semibold hover:bg-red-50 transition-all shadow-lg"
                title="Manage blacklist"
              >
                <UserX className="w-4 h-4" />
                <span className="hidden xl:inline">Blacklist</span>
              </button>
              <button
                onClick={loadMessages}
                disabled={refreshing}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all disabled:opacity-50"
                title="Refresh messages"
              >
                <RefreshCw className={`w-5 h-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <BackButton to="/" label="" className="!w-10 !h-10 !p-0 !rounded-full !bg-white/20 hover:!bg-white/30 !backdrop-blur-sm !shadow-none flex items-center justify-center" iconClassName="text-white" />
            </div>
          </div>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white">
          {/* Search and Filters Section - WhatsApp Style */}
          <div className="p-4 flex-shrink-0 bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search Bar */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all text-gray-900 bg-gray-50"
                  />
                </div>
              </div>

              {/* Compact Filter Tabs */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${
                    filter === 'all'
                      ? 'bg-white text-green-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All {messages.length > 0 && `(${messages.length})`}
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${
                    filter === 'unread'
                      ? 'bg-white text-green-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Unread {unreadCount > 0 && `(${unreadCount})`}
                </button>
                <button
                  onClick={() => setFilter('unreplied')}
                  className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${
                    filter === 'unreplied'
                      ? 'bg-white text-green-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Pending {unrepliedCount > 0 && `(${unrepliedCount})`}
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Conversations List */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4"></div>
                <p className="text-gray-500 text-sm">Loading conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No conversations found</h3>
                <p className="text-gray-500 text-sm max-w-md">
                  {searchQuery || filter !== 'all'
                    ? 'Try adjusting your search or filter to see more conversations'
                    : 'When you send or receive WhatsApp messages, conversations will appear here'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.phone}
                    className={`rounded-2xl bg-white shadow-sm transition-all duration-200 cursor-pointer overflow-hidden border ${
                      conversation.unread_count > 0
                        ? 'border-green-500 bg-green-50/30'
                        : selectedConversation?.phone === conversation.phone
                          ? 'border-green-500 shadow-md'
                          : 'border-gray-200 hover:border-green-300'
                    }`}
                    onClick={() => {
                      setSelectedConversation(conversation);
                      setExpandedMessage(conversation.phone);
                      
                      // Mark conversation as read when opened
                      if (conversation.unread_count > 0) {
                        markConversationAsRead(conversation);
                      }
                    }}
                  >
                    {/* Conversation Preview */}
                    <div className="flex items-center gap-3 p-4">
                      {/* Customer Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md ${
                          conversation.unread_count > 0 ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'
                        }`}>
                          {conversation.customer_name ? getInitials(conversation.customer_name) : <User className="w-6 h-6" />}
                        </div>
                        {conversation.unread_count > 0 && (
                          <div className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-blue-500 border-2 border-white rounded-full flex items-center justify-center px-1">
                            <span className="text-xs text-white font-bold">{conversation.unread_count}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Conversation Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-bold text-gray-900 truncate">
                            {conversation.customer_name || 'Unknown'}
                          </h3>
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                            {formatDate(conversation.last_message_time)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 flex items-center gap-1 mb-1">
                          <Phone className="w-3 h-3" />
                          {conversation.phone}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className={`text-sm line-clamp-1 flex-1 ${conversation.unread_count > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                            {conversation.last_message}
                          </p>
                        </div>
                      </div>
                      
                      {/* Message Count Badge */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <div className="text-xs text-gray-500 font-medium">
                          {conversation.messages.length} msgs
                        </div>
                        {(() => {
                          const lastMsg = conversation.messages[conversation.messages.length - 1];
                          return lastMsg?.type === 'sent' ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCheck className="w-4 h-4" />
                            </div>
                          ) : conversation.unread_count > 0 ? (
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          ) : null;
                        })()}
                      </div>
                    </div>

                    {/* Expanded Conversation History */}
                    {expandedMessage === conversation.phone && (
                      <div className="bg-gradient-to-b from-green-50/30 to-white px-4 pb-4 pt-3 border-t border-gray-200">
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {conversation.messages.map((msg, idx) => (
                            <div
                              key={msg.id}
                              className={`flex items-start gap-2 ${msg.type === 'sent' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[75%] rounded-2xl p-3 shadow-sm ${
                                msg.type === 'sent'
                                  ? 'bg-green-500 text-white rounded-tr-sm'
                                  : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm'
                              }`}>
                                <p className="whitespace-pre-wrap leading-relaxed text-sm">
                                  {msg.message}
                                </p>
                                
                                {msg.media_url && (
                                  <div className="mt-2">
                                    {msg.message_type === 'image' ? (
                                      <img 
                                        src={msg.media_url} 
                                        alt="Message attachment" 
                                        className="max-w-full rounded-lg"
                                      />
                                    ) : (
                                      <a 
                                        href={msg.media_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                                          msg.type === 'sent' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-100 hover:bg-gray-200'
                                        }`}
                                      >
                                        <ImageIcon className="w-4 h-4" />
                                        View {msg.message_type}
                                      </a>
                                    )}
                                  </div>
                                )}
                                
                                <div className={`mt-1 text-xs flex items-center justify-between gap-2 ${
                                  msg.type === 'sent' ? 'text-green-100' : 'text-gray-500'
                                }`}>
                                  <span>{formatDate(msg.timestamp)}</span>
                                  {msg.type === 'sent' && msg.status && (
                                    <span className="flex items-center gap-1">
                                      {msg.status === 'sent' && <CheckCheck className="w-3 h-3" />}
                                      {msg.status === 'delivered' && <CheckCheck className="w-3 h-3 text-green-200" />}
                                      {msg.status === 'read' && <CheckCheck className="w-3 h-3 text-blue-300" />}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Quick Reply Input */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={quickReplyText[conversation.phone] || ''}
                              onChange={(e) => {
                                e.stopPropagation();
                                setQuickReplyText(prev => ({
                                  ...prev,
                                  [conversation.phone]: e.target.value
                                }));
                              }}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && !sending) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  sendQuickReply(conversation);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Type a message..."
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all text-sm"
                              disabled={sending}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                sendQuickReply(conversation);
                              }}
                              disabled={sending || !quickReplyText[conversation.phone]?.trim()}
                              className="px-4 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-all font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              <Send className="w-4 h-4" />
                              {sending ? 'Sending...' : 'Send'}
                            </button>
                          </div>
                          <div className="flex gap-3 mt-2">
                            {conversation.unread_count > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markConversationAsRead(conversation);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                              >
                                <Eye className="w-3 h-3" />
                                Mark as Read
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const whatsappUrl = `https://wa.me/${conversation.phone.replace(/[^0-9]/g, '')}`;
                                window.open(whatsappUrl, '_blank');
                              }}
                              className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
                            >
                              <MessageCircle className="w-3 h-3" />
                              Open in WhatsApp
                            </button>
                            {conversation.customer_id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/customers?id=${conversation.customer_id}`);
                                }}
                                className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
                              >
                                <User className="w-3 h-3" />
                                Customer Profile
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session Diagnostic Info */}
      {sessionDiagnostic && sessionDiagnostic.status === 'using_integration_credentials' && (
        <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-yellow-900 mb-1 flex items-center gap-2">
                ⚠️ Using Old Integration Credentials
              </h4>
              <p className="text-sm text-yellow-800 mb-3">
                You can send messages because you have credentials configured in <strong>Admin Settings → Integrations</strong>, 
                but you haven't created any sessions in the database yet.
              </p>
              <div className="bg-white/50 p-3 rounded-lg mb-3">
                <p className="text-xs font-semibold text-yellow-900 mb-2">Currently Using:</p>
                <div className="space-y-1 text-xs text-yellow-800">
                  <p>• <strong>Session ID:</strong> {sessionDiagnostic.integration?.session_id || 'Not set'}</p>
                  <p>• <strong>API Key:</strong> {sessionDiagnostic.integration?.api_key_preview || 'Not set'}</p>
                  <p>• <strong>Status:</strong> Configured in integrations table (old system)</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSessionModal(true)}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold text-sm transition-all flex items-center gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  Create Database Session
                </button>
                <button
                  onClick={() => {
                    loadSessionDiagnostic();
                    loadActiveSession();
                  }}
                  className="px-4 py-2 bg-white border border-yellow-300 text-yellow-800 rounded-lg font-semibold text-sm transition-all hover:bg-yellow-50"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Card - WasenderAPI Integration */}
      {filteredConversations.length === 0 && !loading && !searchQuery && filter === 'all' && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-blue-900 mb-1">WhatsApp Integration Active</h4>
              <p className="text-sm text-blue-700 mb-2">
                This inbox receives messages via <strong>WasenderAPI</strong> webhooks. Messages from customers appear automatically when they send you a WhatsApp message.
              </p>
              <div className="text-xs text-blue-600 space-y-1">
                <p>✅ Webhook configured and listening</p>
                <p>✅ Auto-links messages to customers by phone</p>
                <p>✅ Supports text, images, videos, documents & audio</p>
                <p>✅ Reply with quoted message support</p>
              </div>
              <a 
                href="https://wasenderapi.com/api-docs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                View API Documentation →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Reply Modal - WhatsApp Style */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header - WhatsApp Green */}
            <div className="p-6 bg-gradient-to-r from-green-600 to-emerald-600 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg bg-white/20 backdrop-blur-sm`}>
                    {selectedMessage.customers?.name ? getInitials(selectedMessage.customers.name) : <User className="w-6 h-6" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {selectedMessage.customers?.name || 'Unknown Customer'}
                    </h2>
                    <p className="text-sm text-green-100 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {selectedMessage.from_phone}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedMessage(null);
                    setReplyText('');
                  }}
                  className="w-9 h-9 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            
            {/* Conversation Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-green-50/30 to-white">
              {/* Customer's Original Message */}
              <div className="flex items-start gap-2 mb-6">
                <div className="flex-1">
                  <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm border border-gray-200 max-w-lg">
                    <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                      {selectedMessage.message_text}
                    </p>
                    
                    {selectedMessage.media_url && (
                      <div className="mt-3">
                        {selectedMessage.message_type === 'image' ? (
                          <img 
                            src={selectedMessage.media_url} 
                            alt="Message attachment" 
                            className="max-w-full rounded-lg shadow-md"
                          />
                        ) : (
                          <a 
                            href={selectedMessage.media_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-all text-sm font-medium"
                          >
                            <ImageIcon className="w-4 h-4" />
                            View {selectedMessage.message_type}
                          </a>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-2 text-xs text-gray-500">
                      {formatDate(selectedMessage.received_at)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reply Composer */}
              <div className="bg-white rounded-2xl border-2 border-green-500 p-4 shadow-lg">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Send className="w-4 h-4 text-green-600" />
                  Type your reply
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your message here..."
                  rows={5}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all text-gray-900 resize-none"
                  autoFocus
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {replyText.length} characters
                  </span>
                  {replyText.trim() && (
                    <span className="text-xs text-green-600 font-medium">
                      Ready to send ✓
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedMessage(null);
                    setReplyText('');
                  }}
                  disabled={sending}
                  className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-all font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => sendReply(selectedMessage)}
                  disabled={sending || !replyText.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all font-semibold shadow-lg"
                >
                  <Send className="w-5 h-5" />
                  {sending ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* New Message Compose Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-green-600 to-emerald-600 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Send className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      New WhatsApp Message
                    </h2>
                    <p className="text-sm text-green-100">
                      Send a message to any customer
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowComposeModal(false);
                    setComposeMessage('');
                    setComposePhone('');
                    setSelectedCustomer(null);
                  }}
                  className="w-9 h-9 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-green-50/30 to-white">
              {/* Customer Selection */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Select Customer
                </label>
                <select
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => {
                    const customer = customers.find(c => c.id === e.target.value);
                    setSelectedCustomer(customer || null);
                    setComposePhone('');
                  }}
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all text-gray-900"
                >
                  <option value="">-- Select a customer --</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.whatsapp || customer.phone}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* OR Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="text-sm text-gray-500 font-medium">OR</span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>
              
              {/* Manual Phone Number */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Enter Phone Number
                </label>
                <input
                  type="tel"
                  value={composePhone}
                  onChange={(e) => {
                    setComposePhone(e.target.value);
                    setSelectedCustomer(null);
                  }}
                  placeholder="e.g., 255712345678 or +255712345678"
                  disabled={!!selectedCustomer}
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Include country code (e.g., 255 for Tanzania)
                </p>
              </div>

              {/* Message Composer */}
              <div className="bg-white rounded-2xl border-2 border-green-500 p-4 shadow-lg">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-green-600" />
                  Your Message
                </label>
                <textarea
                  value={composeMessage}
                  onChange={(e) => setComposeMessage(e.target.value)}
                  placeholder="Type your message here..."
                  rows={6}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all text-gray-900 resize-none"
                  autoFocus
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {composeMessage.length} characters
                  </span>
                  {composeMessage.trim() && (selectedCustomer || composePhone) && (
                    <span className="text-xs text-green-600 font-medium">
                      Ready to send ✓
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowComposeModal(false);
                    setComposeMessage('');
                    setComposePhone('');
                    setSelectedCustomer(null);
                  }}
                  disabled={composing}
                  className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-all font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={sendNewMessage}
                  disabled={composing || !composeMessage.trim() || (!selectedCustomer && !composePhone)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all font-semibold shadow-lg"
                >
                  <Send className="w-5 h-5" />
                  {composing ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Bulk Message Modal - Step Wizard */}
      {showBulkModal && !isMinimized && (() => {
        console.log('📋 Rendering Bulk Modal - showBulkModal:', showBulkModal, 'isMinimized:', isMinimized, 'bulkStep:', bulkStep);
        return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden relative">
            {/* Close Button */}
                <button
                  onClick={() => {
                    if (!bulkSending) {
                      setShowBulkModal(false);
                      setBulkStep(1);
                      setBulkMessage('');
                      setSelectedRecipients([]);
                  // Reset all message type specific state
                  setBulkMedia(null);
                  setBulkMediaType('');
                  setBulkMediaPreview('');
                  setBulkMediaCaption('');
                  setBulkMessageType('text');
                  setViewOnce(false);
                  setPollQuestion('');
                  setPollOptions(['', '']);
                  setAllowMultiSelect(false);
                  setLocationLat('');
                  setLocationLng('');
                  setLocationName('');
                  setLocationAddress('');
                    }
                  }}
                  disabled={bulkSending}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50 disabled:opacity-50"
                >
              <X className="w-5 h-5" />
                </button>

                {/* Minimize Button */}
                <button
                  onClick={() => {
                    console.log('Minimizing to topbar...');
                    setIsMinimized(true);
                  }}
                  title="Minimize to top bar"
                  className="absolute top-4 right-16 w-9 h-9 flex items-center justify-center bg-gray-500 hover:bg-gray-600 text-white rounded-full transition-colors shadow-lg z-50"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>

            {/* Icon Header - Fixed */}
            <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
              <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
                {/* Icon */}
                <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center shadow-lg">
                  <Users className="w-8 h-8 text-white" />
                </div>
                
                {/* Text and Progress */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Bulk WhatsApp Messages
                    </h2>
                    
                    {/* Draft Controls */}
                    {hasDraft && bulkStep === 1 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const loaded = loadDraft();
                            if (loaded) {
                              setShowBulkModal(true);
                            }
                          }}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all text-xs font-semibold flex items-center gap-1"
                          title="Continue from saved draft"
                        >
                          <FolderOpen className="w-3 h-3" />
                          Load Draft
                        </button>
                        <button
                          onClick={clearDraft}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete saved draft"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
              </div>
              
              {/* Progress Steps */}
                  <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((step) => (
                      <div key={step} className="flex items-center">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-all ${
                      bulkStep > step ? 'bg-green-500 text-white' :
                          bulkStep === step ? 'bg-orange-600 text-white' :
                          'bg-gray-200 text-gray-400'
                    }`}>
                          {bulkStep > step ? <CheckCheck className="w-4 h-4" /> : step}
                    </div>
                    {step < 4 && (
                          <div className={`w-12 h-1 mx-1 rounded-full transition-all ${
                            bulkStep > step ? 'bg-green-500' : 'bg-gray-200'
                      }`}></div>
                    )}
                  </div>
                ))}
                    <span className="ml-3 text-sm font-medium text-gray-600">
                      {bulkStep === 1 && 'Select Recipients'}
                      {bulkStep === 2 && 'Compose Message'}
                      {bulkStep === 3 && 'Review & Confirm'}
                      {bulkStep === 4 && 'Sending'}
                    </span>
                  </div>
                  
                  {/* Draft Auto-save Indicator */}
                  {showBulkModal && (selectedRecipients.length > 0 || bulkMessage.trim()) && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                      <Save className="w-3 h-3" />
                      <span>Auto-saving draft...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
              {/* STEP 1: Select Recipients - ENHANCED */}
              {bulkStep === 1 && (
                <BulkStep1Enhanced
                  filteredConversations={filteredConversations}
                  selectedRecipients={selectedRecipients}
                  csvRecipients={csvRecipients}
                  blacklist={blacklist}
                  savedLists={savedLists}
                  sentPhones={sentPhones}
                  campaignName={campaignName}
                  recipientSearch={recipientSearch}
                  activeQuickFilter={activeQuickFilter}
                  csvFile={csvFile}
                  csvUploading={csvUploading}
                  showCsvTooltip={showCsvTooltip}
                  showImportSection={showImportSection}
                  bulkSending={bulkSending}
                  randomDelay={randomDelay}
                  minDelay={minDelay}
                  maxDelay={maxDelay}
                  usePresence={usePresence}
                  setCampaignName={setCampaignName}
                  setRecipientSearch={setRecipientSearch}
                  setSelectedRecipients={setSelectedRecipients}
                  applyQuickFilter={applyQuickFilter}
                  clearQuickFilter={clearQuickFilter}
                  handleCsvUpload={handleCsvUpload}
                  clearCsvImport={clearCsvImport}
                  setShowCsvPreviewModal={setShowCsvPreviewModal}
                  setShowCsvTooltip={setShowCsvTooltip}
                  setShowSaveListModal={setShowSaveListModal}
                  setShowCustomerImport={setShowCustomerImport}
                  setShowImportSection={setShowImportSection}
                  loadRecipientList={loadRecipientList}
                  loadAllCustomers={loadAllCustomers}
                  getInitials={getInitials}
                  getEngagementScore={getEngagementScore}
                  isPhoneBlacklisted={isPhoneBlacklisted}
                  isValidPhone={isValidPhone}
                />
              )}

              {/* STEP 2: Compose Message */}
              {bulkStep === 2 && (
                <div>
                  
              {/* Message Type Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Message Type
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => setBulkMessageType('text')}
                    className={`p-3 rounded-xl font-medium text-sm transition-all border-2 flex items-center justify-center gap-2 ${
                      bulkMessageType === 'text'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Text
                  </button>
                  <button
                    onClick={() => setBulkMessageType('image')}
                    className={`p-3 rounded-xl font-medium text-sm transition-all border-2 flex items-center justify-center gap-2 ${
                      bulkMessageType === 'image'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-lg'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-purple-50'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    Image
                  </button>
                  <button
                    onClick={() => setBulkMessageType('video')}
                    className={`p-3 rounded-xl font-medium text-sm transition-all border-2 flex items-center justify-center gap-2 ${
                      bulkMessageType === 'video'
                        ? 'bg-red-600 text-white border-red-600 shadow-lg'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-red-50'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    Video
                  </button>
                  <button
                    onClick={() => setBulkMessageType('document')}
                    className={`p-3 rounded-xl font-medium text-sm transition-all border-2 flex items-center justify-center gap-2 ${
                      bulkMessageType === 'document'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-indigo-50'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Document
                  </button>
                  <button
                    onClick={() => setBulkMessageType('audio')}
                    className={`p-3 rounded-xl font-medium text-sm transition-all border-2 flex items-center justify-center gap-2 ${
                      bulkMessageType === 'audio'
                        ? 'bg-pink-600 text-white border-pink-600 shadow-lg'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-pink-50'
                    }`}
                  >
                    <Music className="w-4 h-4" />
                    Audio
                  </button>
                  <button
                    onClick={() => setBulkMessageType('location')}
                    className={`p-3 rounded-xl font-medium text-sm transition-all border-2 flex items-center justify-center gap-2 ${
                      bulkMessageType === 'location'
                        ? 'bg-green-600 text-white border-green-600 shadow-lg'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-green-50'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    Location
                  </button>
                  <button
                    onClick={() => setBulkMessageType('poll')}
                    className={`p-3 rounded-xl font-medium text-sm transition-all border-2 flex items-center justify-center gap-2 ${
                      bulkMessageType === 'poll'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-lg'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-teal-50'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Poll
                  </button>
                    </div>
                  </div>
                  
              {/* Quick Templates - Only for text messages */}
              {bulkMessageType === 'text' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <FileCheck className="w-4 h-4" />
                    Quick Templates
                </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button
                    onClick={() => setBulkMessage('Hi {name}! We have exciting news for you. Check out our latest offers today!')}
                      className="px-3 py-2 bg-white rounded-lg hover:bg-blue-50 transition-all text-sm border border-gray-300 font-medium flex items-center justify-center gap-2 group"
                      title="Promotional Offer Template"
                  >
                      <Gift className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
                      <span className="hidden md:inline">Promotional</span>
                  </button>
                  <button
                    onClick={() => setBulkMessage('Hello {name}, thank you for being our valued customer! We appreciate your business.')}
                      className="px-3 py-2 bg-white rounded-lg hover:bg-blue-50 transition-all text-sm border border-gray-300 font-medium flex items-center justify-center gap-2 group"
                      title="Thank You Message Template"
                  >
                      <ThumbsUp className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
                      <span className="hidden md:inline">Thank You</span>
                  </button>
                  <button
                    onClick={() => setBulkMessage('Hi {name}, just a friendly reminder about your upcoming appointment. See you soon!')}
                      className="px-3 py-2 bg-white rounded-lg hover:bg-blue-50 transition-all text-sm border border-gray-300 font-medium flex items-center justify-center gap-2 group"
                      title="Appointment Reminder Template"
                  >
                      <Calendar className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
                      <span className="hidden md:inline">Reminder</span>
                  </button>
                  <button
                    onClick={() => setBulkMessage('Hey {name}! We miss you! Come visit us and enjoy special discounts for returning customers.')}
                      className="px-3 py-2 bg-white rounded-lg hover:bg-blue-50 transition-all text-sm border border-gray-300 font-medium flex items-center justify-center gap-2 group"
                      title="Re-engagement Template"
                  >
                      <RotateCcw className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
                      <span className="hidden md:inline">Re-engage</span>
                  </button>
                </div>
              </div>
              )}

              {/* Media Upload Section - For image, video, document, audio */}
              {(['image', 'video', 'document', 'audio'].includes(bulkMessageType)) && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Media File
                </label>
                  
                  {!bulkMedia ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Upload from device */}
                      <label className="px-4 py-4 bg-white border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all text-center" title={`Upload ${bulkMessageType} file (Max 16MB)`}>
                        <Upload className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                        <span className="block text-sm font-medium text-gray-900">Upload File</span>
                        <span className="block text-xs text-gray-500 mt-1">Max 16MB</span>
                        <input 
                          type="file" 
                          accept={
                            bulkMessageType === 'image' ? 'image/*' :
                            bulkMessageType === 'video' ? 'video/*' :
                            bulkMessageType === 'audio' ? 'audio/*' :
                            '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx'
                          }
                          onChange={handleMediaUpload}
                          className="hidden"
                        />
                      </label>
                      
                      {/* Open Media Library */}
                      <button
                        onClick={() => setShowMediaLibrary(true)}
                        className="px-4 py-4 bg-white border-2 border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-center"
                        title="Choose from saved media library"
                      >
                        <FolderOpen className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                        <span className="block text-sm font-medium text-gray-900">Media Library</span>
                        <span className="block text-xs text-gray-500 mt-1">Reuse saved</span>
                      </button>
                    </div>
                  ) : (
                    /* Media Preview */
                    <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                      <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                          {bulkMediaType === 'image' && bulkMediaPreview && (
                            <img src={bulkMediaPreview} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                          )}
                          {bulkMediaType === 'video' && (
                            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center border border-blue-200">
                              <Video className="w-8 h-8 text-blue-600" />
                            </div>
                          )}
                          {bulkMediaType === 'audio' && (
                            <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center border border-green-200">
                              <Music className="w-8 h-8 text-green-600" />
                            </div>
                          )}
                          {bulkMediaType === 'document' && (
                            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                              <FileText className="w-8 h-8 text-gray-600" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900 text-sm flex items-center gap-1">
                              <CheckCheck className="w-4 h-4 text-green-600" />
                              Media Attached
                            </p>
                            <p className="text-xs text-gray-600 capitalize">{bulkMediaType} ready</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setBulkMedia(null);
                            setBulkMediaType('');
                            setBulkMediaPreview('');
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Remove media"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* View Once Option for Image/Video */}
                  {(['image', 'video'].includes(bulkMessageType)) && bulkMedia && (
                    <div className="mt-2">
                      <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-blue-50 transition-all border border-gray-200" title="Media will disappear after recipient views it once">
                        <input
                          type="checkbox"
                          checked={viewOnce}
                          onChange={(e) => setViewOnce(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <Lock className="w-4 h-4 text-gray-600" />
                        <span className="font-medium text-gray-900 text-sm">View Once</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Poll Creator - For poll messages */}
              {bulkMessageType === 'poll' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Poll Question</label>
                  <input
                    type="text"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="e.g., What's your favorite product?"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                  
                  <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">Poll Options</label>
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...pollOptions];
                          newOptions[index] = e.target.value;
                          setPollOptions(newOptions);
                        }}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== index))}
                          className="px-3 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="Remove option"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 12 && (
                    <button
                      onClick={() => setPollOptions([...pollOptions, ''])}
                      className="w-full p-2 bg-white border-2 border-dashed border-gray-300 rounded-xl text-gray-700 font-medium hover:border-blue-400 hover:bg-blue-50 transition-all"
                      title="Add another poll option (max 12)"
                    >
                      + Add Option
                    </button>
                  )}
                  
                  <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-blue-50 transition-all border border-gray-200 mt-3" title="Allow users to select multiple answers">
                    <input
                      type="checkbox"
                      checked={allowMultiSelect}
                      onChange={(e) => setAllowMultiSelect(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <CheckCheck className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-900 text-sm">Multiple Selection</span>
                  </label>
                </div>
              )}

              {/* Location Creator - For location messages */}
              {bulkMessageType === 'location' && (
                <div className="mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Latitude *</label>
                      <input
                        type="text"
                        value={locationLat}
                        onChange={(e) => setLocationLat(e.target.value)}
                        placeholder="-6.7924"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        title="GPS Latitude coordinate"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Longitude *</label>
                      <input
                        type="text"
                        value={locationLng}
                        onChange={(e) => setLocationLng(e.target.value)}
                        placeholder="39.2083"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        title="GPS Longitude coordinate"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location Name</label>
                    <input
                      type="text"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="Our Store"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      title="Optional: Name of the location"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <input
                      type="text"
                      value={locationAddress}
                      onChange={(e) => setLocationAddress(e.target.value)}
                      placeholder="123 Main Street, Dar es Salaam"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      title="Optional: Full address of the location"
                    />
                  </div>
                </div>
              )}

              {/* Message Composer - Professional with WhatsApp-style features */}
              {(['text', 'image', 'video', 'document'].includes(bulkMessageType)) && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {bulkMessageType === 'text' ? 'Message *' : 'Caption'}
                    </label>
                    <button
                      onClick={() => setShowShortcutsHelp(!showShortcutsHelp)}
                      className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"
                      title="View keyboard shortcuts"
                    >
                      <Keyboard className="w-3 h-3" />
                      Shortcuts
                    </button>
                  </div>
                  
                  {/* Shortcuts Help - Collapsible */}
                  {showShortcutsHelp && (
                    <div className="mb-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div><kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">Ctrl+B</kbd> Bold</div>
                        <div><kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">Ctrl+I</kbd> Italic</div>
                        <div><kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">Ctrl+K</kbd> Insert Variable</div>
                        <div><kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">Ctrl+Enter</kbd> Next Step</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Message Composer with Toolbar */}
                  <div className="border-2 border-gray-300 rounded-xl focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all relative">
                    {/* Toolbar */}
                    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-white relative">
                      {/* Attach Menu - WhatsApp Style */}
                      <div className="relative attach-menu-container">
                        <button
                          onClick={() => setShowAttachMenu(!showAttachMenu)}
                          className={`p-2 rounded-lg transition-all flex items-center justify-center ${
                            showAttachMenu ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
                          }`}
                          title="Attach media"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        
                        {/* Attach Dropdown Menu - Grid Layout */}
                        {showAttachMenu && (
                          <div className="absolute left-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-[100] p-3 attach-menu-container">
                            <div className="mb-2">
                              <p className="text-xs font-semibold text-gray-900">Message Types</p>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <button
                                onClick={() => quickChangeMessageType('image')}
                                className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-xl transition-all group"
                                title="Send images & photos"
                              >
                                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                  <ImageIcon className="w-6 h-6 text-purple-600" />
                                </div>
                                <span className="text-xs font-semibold text-gray-900">Image</span>
                              </button>
                              
                              <button
                                onClick={() => quickChangeMessageType('video')}
                                className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-xl transition-all group"
                                title="Send video clips"
                              >
                                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center group-hover:bg-red-200 transition-colors">
                                  <Video className="w-6 h-6 text-red-600" />
                                </div>
                                <span className="text-xs font-semibold text-gray-900">Video</span>
                              </button>
                              
                              <button
                                onClick={() => quickChangeMessageType('document')}
                                className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-xl transition-all group"
                                title="Send PDF, Office files"
                              >
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                  <FileText className="w-6 h-6 text-blue-600" />
                                </div>
                                <span className="text-xs font-semibold text-gray-900">Document</span>
                              </button>
                              
                              <button
                                onClick={() => quickChangeMessageType('audio')}
                                className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-xl transition-all group"
                                title="Send audio files"
                              >
                                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                                  <Music className="w-6 h-6 text-green-600" />
                                </div>
                                <span className="text-xs font-semibold text-gray-900">Audio</span>
                              </button>
                              
                              <button
                                onClick={() => quickChangeMessageType('location')}
                                className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-xl transition-all group"
                                title="Share GPS location"
                              >
                                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                                  <MapPin className="w-6 h-6 text-orange-600" />
                                </div>
                                <span className="text-xs font-semibold text-gray-900">Location</span>
                              </button>
                              
                              <button
                                onClick={() => quickChangeMessageType('poll')}
                                className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-xl transition-all group"
                                title="Create interactive poll"
                              >
                                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                                  <BarChart3 className="w-6 h-6 text-indigo-600" />
                                </div>
                                <span className="text-xs font-semibold text-gray-900">Poll</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Variables Menu */}
                      <div className="relative variables-menu-container">
                        <button
                          onClick={() => setShowVariablesMenu(!showVariablesMenu)}
                          className={`p-2 rounded-lg transition-all flex items-center justify-center ${
                            showVariablesMenu ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
                          }`}
                          title="Variables (Ctrl+K)"
                        >
                          <Code className="w-4 h-4" />
                        </button>
                        
                        {/* Variables Dropdown Menu - Grid Layout */}
                        {showVariablesMenu && (
                          <div className="absolute left-0 top-full mt-2 w-[400px] bg-white border border-gray-200 rounded-2xl shadow-xl z-[100] p-3 variables-menu-container">
                            <div className="mb-2">
                              <p className="text-xs font-semibold text-gray-900">Dynamic Variables</p>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              <button
                                onClick={() => insertVariable('{name}')}
                                className="flex flex-col items-center gap-1.5 p-2.5 hover:bg-gray-50 rounded-xl transition-all group"
                                title="Customer name"
                              >
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                  <User className="w-5 h-5 text-blue-600" />
                                </div>
                                <span className="text-xs font-semibold text-gray-900">{'{name}'}</span>
                              </button>
                              
                              <button
                                onClick={() => insertVariable('{phone}')}
                                className="flex flex-col items-center gap-1.5 p-2.5 hover:bg-gray-50 rounded-xl transition-all group"
                                title="Phone number"
                              >
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                                  <Phone className="w-5 h-5 text-green-600" />
                                </div>
                                <span className="text-xs font-semibold text-gray-900">{'{phone}'}</span>
                              </button>
                              
                              <button
                                onClick={() => insertVariable('{greeting}')}
                                className="flex flex-col items-center gap-1.5 p-2.5 hover:bg-gray-50 rounded-xl transition-all group"
                                title="Good morning/afternoon/evening"
                              >
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                  <Smile className="w-5 h-5 text-purple-600" />
                                </div>
                                <span className="text-xs font-semibold text-gray-900">{'{greeting}'}</span>
                              </button>
                              
                              <button
                                onClick={() => insertVariable('{company}')}
                                className="flex flex-col items-center gap-1.5 p-2.5 hover:bg-gray-50 rounded-xl transition-all group"
                                title="Your company name"
                              >
                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                                  <Database className="w-5 h-5 text-gray-600" />
                                </div>
                                <span className="text-xs font-semibold text-gray-900">{'{company}'}</span>
                              </button>
                              
                              <button
                                onClick={() => insertVariable('{date}')}
                                className="flex flex-col items-center gap-1.5 p-2.5 hover:bg-gray-50 rounded-xl transition-all group"
                                title="December 3, 2025"
                              >
                                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                                  <Calendar className="w-5 h-5 text-orange-600" />
                                </div>
                                <span className="text-xs font-semibold text-gray-900">{'{date}'}</span>
                              </button>
                              
                              <button
                                onClick={() => insertVariable('{time}')}
                                className="flex flex-col items-center gap-1.5 p-2.5 hover:bg-gray-50 rounded-xl transition-all group"
                                title="02:30 PM"
                              >
                                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                                  <Clock className="w-5 h-5 text-indigo-600" />
                                </div>
                                <span className="text-xs font-semibold text-gray-900">{'{time}'}</span>
                              </button>
                              
                              <button
                                onClick={() => insertVariable('{day}')}
                                className="flex flex-col items-center gap-1.5 p-2.5 hover:bg-gray-50 rounded-xl transition-all group"
                                title="Wednesday"
                              >
                                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                                  <Calendar className="w-5 h-5 text-pink-600" />
                                </div>
                                <span className="text-xs font-semibold text-gray-900">{'{day}'}</span>
                              </button>
                              
                              <button
                                onClick={() => insertVariable('{month}')}
                                className="flex flex-col items-center gap-1.5 p-2.5 hover:bg-gray-50 rounded-xl transition-all group"
                                title="December"
                              >
                                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                                  <Calendar className="w-5 h-5 text-teal-600" />
                                </div>
                                <span className="text-xs font-semibold text-gray-900">{'{month}'}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Formatting Group */}
                      <div className="flex items-center bg-gray-50 rounded-lg px-0.5 py-0.5">
                        <button
                          onClick={() => {
                            const textarea = messageTextareaRef.current;
                            if (!textarea) return;
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const selectedText = bulkMessage.substring(start, end);
                            if (selectedText) {
                              const newText = bulkMessage.substring(0, start) + `*${selectedText}*` + bulkMessage.substring(end);
                              setBulkMessage(newText);
                              textarea.focus();
                            } else {
                              toast('Select text first, then click to format', { icon: 'ℹ️' });
                            }
                          }}
                          className="p-1.5 hover:bg-white rounded transition-all"
                          title="Bold (Ctrl+B)"
                        >
                          <span className="text-gray-700 font-bold text-sm">B</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            const textarea = messageTextareaRef.current;
                            if (!textarea) return;
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const selectedText = bulkMessage.substring(start, end);
                            if (selectedText) {
                              const newText = bulkMessage.substring(0, start) + `_${selectedText}_` + bulkMessage.substring(end);
                              setBulkMessage(newText);
                              textarea.focus();
                            } else {
                              toast('Select text first, then click to format', { icon: 'ℹ️' });
                            }
                          }}
                          className="p-1.5 hover:bg-white rounded transition-all"
                          title="Italic (Ctrl+I)"
                        >
                          <span className="text-gray-700 italic text-sm font-serif">I</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            const textarea = messageTextareaRef.current;
                            if (!textarea) return;
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const selectedText = bulkMessage.substring(start, end);
                            if (selectedText) {
                              const newText = bulkMessage.substring(0, start) + `~${selectedText}~` + bulkMessage.substring(end);
                              setBulkMessage(newText);
                              textarea.focus();
                            } else {
                              toast('Select text first, then click to format', { icon: 'ℹ️' });
                            }
                          }}
                          className="p-1.5 hover:bg-white rounded transition-all"
                          title="Strikethrough"
                        >
                          <span className="text-gray-700 line-through text-sm">S</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            const textarea = messageTextareaRef.current;
                            if (!textarea) return;
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const selectedText = bulkMessage.substring(start, end);
                            if (selectedText) {
                              const newText = bulkMessage.substring(0, start) + `\`\`\`${selectedText}\`\`\`` + bulkMessage.substring(end);
                              setBulkMessage(newText);
                              textarea.focus();
                            } else {
                              toast('Select text first, then click to format', { icon: 'ℹ️' });
                            }
                          }}
                          className="p-1.5 hover:bg-white rounded transition-all"
                          title="Monospace"
                        >
                          <Code className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                      
                      {/* Emoji Picker Placeholder */}
                      <button
                        className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                        title="Emojis"
                      >
                        <Smile className="w-4 h-4 text-gray-600" />
                      </button>
                      
                      <div className="flex-1"></div>
                      
                      {/* Stats Section */}
                      <div className="flex items-center gap-3 px-2">
                    {usePersonalization && bulkMessage.includes('{name}') && (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                        Personalized
                      </span>
                    )}
                        <span className="text-xs text-gray-500">
                          {bulkMessage.length}
                        </span>
                  </div>
                </div>
                
                    {/* Textarea */}
                    <textarea
                      ref={messageTextareaRef}
                      value={bulkMessage}
                      onChange={(e) => setBulkMessage(e.target.value)}
                      onKeyDown={(e) => {
                        // Keyboard shortcuts
                        if (e.ctrlKey || e.metaKey) {
                          if (e.key === 'b') {
                            e.preventDefault();
                            const start = e.currentTarget.selectionStart;
                            const end = e.currentTarget.selectionEnd;
                            const selectedText = bulkMessage.substring(start, end);
                            if (selectedText) {
                              const newText = bulkMessage.substring(0, start) + `*${selectedText}*` + bulkMessage.substring(end);
                              setBulkMessage(newText);
                            }
                          } else if (e.key === 'i') {
                            e.preventDefault();
                            const start = e.currentTarget.selectionStart;
                            const end = e.currentTarget.selectionEnd;
                            const selectedText = bulkMessage.substring(start, end);
                            if (selectedText) {
                              const newText = bulkMessage.substring(0, start) + `_${selectedText}_` + bulkMessage.substring(end);
                              setBulkMessage(newText);
                            }
                          } else if (e.key === 'k') {
                            e.preventDefault();
                            setShowVariablesMenu(!showVariablesMenu);
                          }
                        }
                      }}
                      placeholder={
                        bulkMessageType === 'text'
                          ? "Type your message..."
                          : "Add a caption..."
                      }
                      rows={bulkMessageType === 'text' ? 6 : 3}
                      className="w-full px-4 py-3 focus:outline-none resize-none"
                      autoFocus
                    />
                  </div>
                  
                  {/* Formatting Help */}
                  <div className="mt-2 text-xs text-gray-400 flex items-center gap-2">
                    <span>WhatsApp formatting:</span>
                    <code className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">*bold*</code>
                    <code className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">_italic_</code>
                    <code className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">~strike~</code>
                    <code className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">```code```</code>
              </div>
                </div>
              )}
              
              {/* Advanced Settings - Collapsible */}
              <div className="mt-5">
                <button
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="w-full flex items-center justify-between p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all border border-gray-200"
                  title="Configure anti-ban protection features"
                >
                  <span className="font-medium text-gray-900 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Anti-Ban Protection
                    <span className="text-xs text-green-600 flex items-center gap-1 ml-2">
                      <Save className="w-3 h-3" />
                      Settings saved
                    </span>
                  </span>
                  <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`} />
                </button>
                
                {showAdvancedSettings && (
                  <div className="mt-2 p-4 bg-white border border-gray-200 rounded-xl">
                    {/* Basic Settings */}
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Basic Protection</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {/* Personalization */}
                        <label 
                          className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-blue-50 transition-all border border-gray-200"
                          title="Replace {name} and other variables - prevents identical messages"
                        >
                    <input
                      type="checkbox"
                      checked={usePersonalization}
                      onChange={(e) => setUsePersonalization(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <User className="w-4 h-4 text-gray-600" />
                          <span className="font-medium text-gray-900 text-sm">Personalize</span>
                  </label>
                  
                  {/* Random Delay */}
                        <label 
                          className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-blue-50 transition-all border border-gray-200"
                          title="Randomize timing between messages - appears more human"
                        >
                    <input
                      type="checkbox"
                      checked={randomDelay}
                      onChange={(e) => setRandomDelay(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <Clock className="w-4 h-4 text-gray-600" />
                          <span className="font-medium text-gray-900 text-sm">Random Delays</span>
                  </label>
                  
                        {/* Message Variation */}
                        <label 
                          className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-blue-50 transition-all border border-gray-200"
                          title="Add slight variations to message length - looks more natural"
                        >
                    <input
                      type="checkbox"
                            checked={varyMessageLength}
                            onChange={(e) => setVaryMessageLength(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <Sparkles className="w-4 h-4 text-gray-600" />
                          <span className="font-medium text-gray-900 text-sm">Vary Length</span>
                  </label>
                  
                        {/* Skip Recently Contacted */}
                        <label 
                          className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-blue-50 transition-all border border-gray-200"
                          title="Skip contacts messaged in last 6 hours - prevents spam"
                        >
                          <input
                            type="checkbox"
                            checked={skipRecentlyContacted}
                            onChange={(e) => setSkipRecentlyContacted(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <RefreshCw className="w-4 h-4 text-gray-600" />
                          <span className="font-medium text-gray-900 text-sm">Skip Recent</span>
                        </label>
                        
                        {/* Invisible Characters */}
                        <label 
                          className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-blue-50 transition-all border border-gray-200"
                          title="Add invisible Unicode characters - makes each message hash unique"
                        >
                          <input
                            type="checkbox"
                            checked={useInvisibleChars}
                            onChange={(e) => setUseInvisibleChars(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <Eye className="w-4 h-4 text-gray-600" />
                          <span className="font-medium text-gray-900 text-sm">Invisible Chars</span>
                        </label>
                        
                        {/* Emoji Variation */}
                        <label 
                          className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-blue-50 transition-all border border-gray-200"
                          title="Rotate similar emojis (😊→😃→🙂) - unique messages, same meaning"
                        >
                          <input
                            type="checkbox"
                            checked={useEmojiVariation}
                            onChange={(e) => setUseEmojiVariation(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <Smile className="w-4 h-4 text-gray-600" />
                          <span className="font-medium text-gray-900 text-sm">Emoji Rotation</span>
                        </label>
                      </div>
                    </div>
                    
                    {/* Timing Controls */}
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Timing Controls</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Delay Range */}
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-gray-600" />
                            <span className="font-medium text-gray-900 text-sm">Message Delay</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-600">{minDelay}s</span>
                      <input
                        type="range"
                        value={maxDelay}
                        onChange={(e) => setMaxDelay(parseInt(e.target.value))}
                        min={minDelay}
                              max="30"
                        className="flex-1 h-2"
                      />
                            <span className="text-xs font-medium text-gray-600">{maxDelay}s</span>
                    </div>
                  </div>
                        
                        {/* Batch Delay */}
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-4 h-4 text-gray-600" />
                            <span className="font-medium text-gray-900 text-sm">Batch Break</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-600">30s</span>
                            <input
                              type="range"
                              value={batchDelay}
                              onChange={(e) => setBatchDelay(parseInt(e.target.value))}
                              min="30"
                              max="300"
                              step="30"
                              className="flex-1 h-2"
                            />
                            <span className="text-xs font-medium text-gray-600">{batchDelay}s</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Break every {batchSize} messages</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Rate Limits */}
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Rate Limits</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Batch Size */}
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <label className="block text-xs font-medium text-gray-700 mb-2">Batch Size</label>
                          <input
                            type="number"
                            value={batchSize}
                            onChange={(e) => setBatchSize(parseInt(e.target.value) || 20)}
                            min="10"
                            max="50"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            title="Send in batches to avoid spam detection"
                          />
                        </div>
                        
                        {/* Hourly Limit */}
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <label className="block text-xs font-medium text-gray-700 mb-2">Per Hour</label>
                          <input
                            type="number"
                            value={maxPerHour}
                            onChange={(e) => setMaxPerHour(parseInt(e.target.value) || 30)}
                            min="10"
                            max="100"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            title="Maximum messages per hour"
                          />
                        </div>
                        
                        {/* Daily Limit */}
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <label className="block text-xs font-medium text-gray-700 mb-2">Per Day</label>
                          <input
                            type="number"
                            value={dailyLimit}
                            onChange={(e) => setDailyLimit(parseInt(e.target.value) || 100)}
                            min="50"
                            max="500"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            title="Maximum messages per day"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Smart Features */}
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Smart Protection</p>
                      <div className="space-y-2">
                        <label 
                          className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-blue-50 transition-all border border-gray-200"
                          title="Don't send between 10 PM and 8 AM - prevents annoyance and spam reports"
                        >
                          <input
                            type="checkbox"
                            checked={respectQuietHours}
                            onChange={(e) => setRespectQuietHours(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <Clock className="w-4 h-4 text-gray-600" />
                          <div className="flex-1">
                            <span className="font-medium text-gray-900 text-sm">Respect Quiet Hours</span>
                            <p className="text-xs text-gray-500">No messages 10 PM - 8 AM</p>
                          </div>
                        </label>
                        
                        <label 
                          className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-blue-50 transition-all border border-gray-200"
                          title="Play sound for campaign events (pause, complete, error)"
                        >
                          <input
                            type="checkbox"
                            checked={soundEnabled}
                            onChange={(e) => setSoundEnabled(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <Music className="w-4 h-4 text-gray-600" />
                          <div className="flex-1">
                            <span className="font-medium text-gray-900 text-sm">Sound Notifications</span>
                            <p className="text-xs text-gray-500">Audio feedback for events</p>
                          </div>
                        </label>
                        
                        <label 
                          className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-blue-50 transition-all border border-gray-200"
                          title="Show browser notifications for progress updates"
                        >
                          <input
                            type="checkbox"
                            checked={notificationsEnabled}
                            onChange={(e) => {
                              if (e.target.checked) {
                                requestNotificationPermission();
                              } else {
                                setNotificationsEnabled(false);
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <Smartphone className="w-4 h-4 text-gray-600" />
                          <div className="flex-1">
                            <span className="font-medium text-gray-900 text-sm">Browser Notifications</span>
                            <p className="text-xs text-gray-500">Progress updates (25%, 50%, 75%, complete)</p>
                          </div>
                        </label>
                      </div>
                    </div>
                    
                    {/* Reset to Defaults */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={async () => {
                          try {
                            // Reset in database
                            const response = await fetch('/api/antiban-settings', {
                              method: 'DELETE',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                            });
                            
                            if (!response.ok) {
                              throw new Error('Failed to reset settings in database');
                            }
                            
                            // Reset to safe defaults in UI
                            setUsePersonalization(true);
                            setRandomDelay(true);
                            setMinDelay(3);
                            setMaxDelay(8);
                            setUsePresence(false);
                            setBatchSize(20);
                            setBatchDelay(60);
                            setMaxPerHour(30);
                            setDailyLimit(100);
                            setSkipRecentlyContacted(true);
                            setRespectQuietHours(true);
                            setUseInvisibleChars(true);
                            setUseEmojiVariation(true);
                            setVaryMessageLength(true);
                            
                            console.log('⚙️ Anti-ban settings reset to defaults (database cleared)');
                            toast.success('Anti-ban settings reset to safe defaults');
                          } catch (error) {
                            console.error('Failed to reset settings:', error);
                            toast.error('Failed to reset settings. Using local defaults.');
                            
                            // Fallback: just reset UI
                            setUsePersonalization(true);
                            setRandomDelay(true);
                            setMinDelay(3);
                            setMaxDelay(8);
                            setUsePresence(false);
                            setBatchSize(20);
                            setBatchDelay(60);
                            setMaxPerHour(30);
                            setDailyLimit(100);
                            setSkipRecentlyContacted(true);
                            setRespectQuietHours(true);
                            setUseInvisibleChars(true);
                            setUseEmojiVariation(true);
                            setVaryMessageLength(true);
                          }
                        }}
                        className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium text-sm flex items-center justify-center gap-2"
                        title="Reset all settings to recommended safe defaults"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reset to Safe Defaults
                      </button>
                    </div>
                  </div>
                )}
              </div>
                </div>
              )}

              {/* STEP 3: Review & Confirm */}
              {bulkStep === 3 && (
                <div>
                    
                    {/* Recipients Summary */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {sentPhones.length > 0 ? 'Pending Recipients' : 'Recipients'}
                    </label>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      {(() => {
                        const pendingRecipients = selectedRecipients.filter(phone => !sentPhones.includes(phone));
                        return (
                          <>
                            <div className="flex items-center gap-3 mb-3">
                              <span className="text-3xl font-bold text-blue-600">{pendingRecipients.length}</span>
                              <span className="text-sm text-gray-600">
                                {sentPhones.length > 0 ? 'pending recipients' : 'recipients selected'}
                              </span>
                            </div>
                            {sentPhones.length > 0 && (
                              <div className="mb-3 p-2 bg-green-100 border border-green-300 rounded-lg">
                                <p className="text-xs text-green-800">
                                  ✅ {sentPhones.length} already sent • {pendingRecipients.length} remaining
                                </p>
                              </div>
                            )}
                            {pendingRecipients.length > 0 && (
                              <div className="max-h-32 overflow-y-auto text-sm text-gray-600 space-y-1">
                                {pendingRecipients.slice(0, 5).map(phone => {
                                  const conv = conversations.find(c => c.phone === phone);
                                  return (
                                    <div key={phone} className="flex items-center gap-2">
                                      <CheckCheck className="w-3 h-3 text-blue-600" />
                                      <span className="font-medium">{conv?.customer_name || 'Unknown'}</span>
                                      <span className="text-gray-400">-</span>
                                      <span className="font-mono text-xs">{phone}</span>
                                    </div>
                                  );
                                })}
                                {pendingRecipients.length > 5 && (
                                  <p className="text-xs text-gray-500 italic">
                                    ... and {pendingRecipients.length - 5} more pending
                                  </p>
                                )}
                              </div>
                            )}
                            {pendingRecipients.length === 0 && sentPhones.length > 0 && (
                              <div className="text-center py-4">
                                <CheckCheck className="w-12 h-12 text-green-500 mx-auto mb-2" />
                                <p className="text-sm font-medium text-green-700">All messages sent!</p>
                                <p className="text-xs text-gray-600 mt-1">No pending recipients</p>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                    
                  {/* WhatsApp-Style Message Preview */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp Preview</label>
                    
                    {/* WhatsApp Chat Background */}
                    <div className="relative rounded-xl overflow-hidden" style={{ 
                      background: '#e5ddd5', 
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h100v100H0z\' fill=\'%23e5ddd5\'/%3E%3Cpath d=\'M25 25h50v50H25z\' fill=\'%23ffffff\' opacity=\'0.03\'/%3E%3C/svg%3E")'
                    }}>
                      <div className="p-4 min-h-[200px] flex flex-col justify-end">
                        {/* WhatsApp Message Bubble - Sent Style */}
                        <div className="flex justify-end mb-2">
                          <div className="max-w-[85%]">
                            {/* Message Bubble */}
                            <div className="bg-[#dcf8c6] rounded-lg rounded-tr-none shadow-sm">
                              {/* Media Content - If image/video/document/audio */}
                              {bulkMedia && (['image', 'video', 'document', 'audio'].includes(bulkMessageType)) && (
                                <div className="p-1">
                                  {bulkMessageType === 'image' && bulkMediaPreview && (
                                    <div className="relative">
                                      <img src={bulkMediaPreview} alt="Preview" className="w-full rounded-lg max-h-64 object-cover" />
                                      {viewOnce && (
                                        <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded-full flex items-center gap-1">
                                          <Lock className="w-3 h-3 text-white" />
                                          <span className="text-xs text-white font-medium">View once</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {bulkMessageType === 'video' && (
                                    <div className="relative bg-black rounded-lg h-48 flex items-center justify-center">
                                      <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                                        <Video className="w-8 h-8 text-white" />
                                      </div>
                                      {viewOnce && (
                                        <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded-full flex items-center gap-1">
                                          <Lock className="w-3 h-3 text-white" />
                                          <span className="text-xs text-white font-medium">View once</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {bulkMessageType === 'document' && (
                                    <div className="bg-white rounded-lg p-3 flex items-center gap-3">
                                      <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-blue-600" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">Document</p>
                                        <p className="text-xs text-gray-500">PDF, DOC, or other file</p>
                                      </div>
                                    </div>
                                  )}
                                  {bulkMessageType === 'audio' && (
                                    <div className="bg-white rounded-lg p-3 flex items-center gap-3">
                                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                                        <Music className="w-5 h-5 text-white" />
                                      </div>
                                      <div className="flex-1 h-8 bg-gray-200 rounded-full flex items-center px-3">
                                        <div className="w-full h-1 bg-gray-400 rounded-full"></div>
                                      </div>
                                      <span className="text-xs text-gray-600">0:00</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Text Content */}
                              {bulkMessage && (['text', 'image', 'video', 'document'].includes(bulkMessageType)) && (
                                <div className="px-3 py-2">
                                  <div 
                                    className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap break-words"
                                    dangerouslySetInnerHTML={{ __html: renderWhatsAppFormatting(bulkMessage) }}
                                  />
                                </div>
                              )}
                              
                              {/* Poll Content */}
                              {bulkMessageType === 'poll' && pollQuestion && (
                                <div className="p-3">
                                  <div className="mb-3">
                                    <p className="text-sm font-semibold text-gray-900">{pollQuestion}</p>
                                  </div>
                                  <div className="space-y-1.5">
                                    {pollOptions.filter(o => o.trim()).map((option, idx) => (
                                      <div key={idx} className="flex items-center gap-2 p-2 bg-white/50 rounded-lg border border-gray-300">
                                        <div className={`w-4 h-4 rounded-full border-2 border-gray-400 ${allowMultiSelect ? '' : 'bg-white'}`}></div>
                                        <span className="text-sm text-gray-800">{option}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-2 pt-2 border-t border-gray-300">
                                    <p className="text-xs text-gray-600 flex items-center gap-1">
                                      <BarChart3 className="w-3 h-3" />
                                      {allowMultiSelect ? 'Select one or more options' : 'Select one option'}
                                    </p>
                                  </div>
                                </div>
                              )}
                              
                              {/* Location Content */}
                              {bulkMessageType === 'location' && locationLat && locationLng && (
                                <div className="p-1">
                                  {/* Map Preview */}
                                  <div className="bg-gray-200 rounded-lg h-32 flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-30" style={{
                                      backgroundImage: 'repeating-linear-gradient(0deg, #ccc 0px, #ccc 1px, transparent 1px, transparent 20px), repeating-linear-gradient(90deg, #ccc 0px, #ccc 1px, transparent 1px, transparent 20px)'
                                    }}></div>
                                    <MapPin className="w-12 h-12 text-red-500 drop-shadow-lg relative z-10" />
                                  </div>
                                  {/* Location Details */}
                                  {(locationName || locationAddress) && (
                                    <div className="bg-white p-3 mt-1 rounded-lg">
                                      {locationName && (
                                        <p className="text-sm font-semibold text-gray-900">{locationName}</p>
                                      )}
                                      {locationAddress && (
                                        <p className="text-xs text-gray-600 mt-0.5">{locationAddress}</p>
                                      )}
                                      <p className="text-xs text-gray-500 mt-1">{locationLat}, {locationLng}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Timestamp and Status */}
                              <div className="px-3 pb-1 flex items-center justify-end gap-1">
                                <span className="text-[10px] text-gray-600">
                                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                              </div>
                            </div>
                            
                            {/* Recipient Name */}
                            <div className="text-right mt-1">
                              <span className="text-xs text-gray-600">
                                To: {conversations.find(c => c.phone === selectedRecipients[0])?.customer_name || 'Customer'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* WhatsApp Info */}
                        <div className="text-center mt-3 mb-2">
                          <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            Exact preview as it will appear in WhatsApp
                          </p>
                        </div>
                      </div>
                      </div>
                    </div>
                    
                    {/* Settings Summary */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Protection Settings</label>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1.5">
                          {usePersonalization ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5 text-green-600" />
                              <span className="text-gray-700">Personalization</span>
                            </>
                          ) : (
                            <>
                              <X className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-gray-500">Personalization</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {randomDelay ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5 text-green-600" />
                              <span className="text-gray-700">Random Delays ({minDelay}-{maxDelay}s)</span>
                            </>
                          ) : (
                            <>
                              <X className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-gray-500">Fixed Delay</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {usePresence ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5 text-green-600" />
                              <span className="text-gray-700">Typing Indicator</span>
                            </>
                          ) : (
                            <>
                              <X className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-gray-500">No Typing</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <BarChart3 className="w-3.5 h-3.5 text-gray-600" />
                          <span className="text-gray-700">Limit: {dailyLimit}</span>
                        </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Time Estimate */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Time</label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-700 font-medium">
                            {(() => {
                              const avgDelay = randomDelay ? (minDelay + maxDelay) / 2 : minDelay;
                              const typingTime = usePresence ? 1.5 : 0;
                              const totalSeconds = selectedRecipients.length * (avgDelay + typingTime + 1);
                              const minutes = Math.floor(totalSeconds / 60);
                              const seconds = Math.floor(totalSeconds % 60);
                            return `${minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`}`;
                            })()}
                        </span>
                      </div>
                      <span className="text-2xl font-bold text-gray-900">{selectedRecipients.length}</span>
                    </div>
                  </div>
                  
                  {/* Sending Mode Selection */}
                  <div className="mb-6 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-2xl shadow-sm">
                    <h4 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Choose Sending Mode
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Browser Mode */}
                      <div
                        onClick={() => setSendingMode('browser')}
                        className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                          sendingMode === 'browser'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105'
                            : 'bg-white border-purple-200 text-gray-700 hover:border-blue-400 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`p-2 rounded-lg ${sendingMode === 'browser' ? 'bg-blue-500' : 'bg-blue-100'}`}>
                            <Activity className={`w-6 h-6 ${sendingMode === 'browser' ? 'text-white' : 'text-blue-600'}`} />
                          </div>
                          <div className="flex-1">
                            <h5 className={`font-bold text-base mb-1 ${sendingMode === 'browser' ? 'text-white' : 'text-gray-900'}`}>
                              Browser Sending
                            </h5>
                            <p className={`text-sm ${sendingMode === 'browser' ? 'text-blue-100' : 'text-gray-600'}`}>
                              Real-time feedback
                          </p>
                        </div>
                          {sendingMode === 'browser' && (
                            <CheckCheck className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <ul className={`text-xs space-y-1.5 ${sendingMode === 'browser' ? 'text-blue-100' : 'text-gray-600'}`}>
                          <li className="flex items-center gap-2">
                            <CheckCheck className="w-3 h-3" />
                            Instant feedback
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCheck className="w-3 h-3" />
                            Can minimize to topbar
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCheck className="w-3 h-3" />
                            Best for &lt; 100 recipients
                          </li>
                        </ul>
                      </div>
                      
                      {/* Cloud Mode */}
                      <div
                        onClick={() => setSendingMode('cloud')}
                        className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                          sendingMode === 'cloud'
                            ? 'bg-purple-600 border-purple-600 text-white shadow-lg scale-105'
                            : 'bg-white border-purple-200 text-gray-700 hover:border-purple-400 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`p-2 rounded-lg ${sendingMode === 'cloud' ? 'bg-purple-500' : 'bg-purple-100'}`}>
                            <Database className={`w-6 h-6 ${sendingMode === 'cloud' ? 'text-white' : 'text-purple-600'}`} />
                    </div>
                          <div className="flex-1">
                            <h5 className={`font-bold text-base mb-1 ${sendingMode === 'cloud' ? 'text-white' : 'text-gray-900'}`}>
                              Cloud Processing ☁️
                            </h5>
                            <p className={`text-sm ${sendingMode === 'cloud' ? 'text-purple-100' : 'text-gray-600'}`}>
                              Background processing
                            </p>
                          </div>
                          {sendingMode === 'cloud' && (
                            <CheckCheck className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <ul className={`text-xs space-y-1.5 ${sendingMode === 'cloud' ? 'text-purple-100' : 'text-gray-600'}`}>
                          <li className="flex items-center gap-2">
                            <CheckCheck className="w-3 h-3" />
                            Can close browser
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCheck className="w-3 h-3" />
                            Server handles sending
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCheck className="w-3 h-3" />
                            Best for 100+ recipients
                          </li>
                        </ul>
                      </div>
                    </div>
                    
                    {/* Campaign Name for Cloud Mode */}
                    {sendingMode === 'cloud' && (
                      <div className="mt-4 p-4 bg-white rounded-xl border-2 border-purple-200">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Campaign Name
                        </label>
                        <input
                          type="text"
                          value={campaignName}
                          onChange={(e) => setCampaignName(e.target.value)}
                          placeholder={`Campaign ${new Date().toLocaleDateString()}`}
                          className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Warning Box */}
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <p className="text-sm text-yellow-900 font-medium flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        You are about to send <strong>{selectedRecipients.length} messages</strong>. This action cannot be undone.
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 4: Sending Progress */}
              {bulkStep === 4 && (
                <div>
                  {/* Progress Display */}
                  <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 mb-6 shadow-lg">
                    <div className="text-center mb-8">
                      <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse shadow-xl">
                        <Send className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-blue-900 mb-2">
                        {sendingMode === 'cloud' ? 'Processing in Cloud ☁️' : 'Sending Messages...'}
                      </h3>
                      <p className="text-base text-blue-700 font-medium">
                        {sendingMode === 'cloud' 
                          ? 'You can close this window safely - campaign continues in background' 
                          : 'Please keep this window open'}
                      </p>
                      {sendingMode === 'browser' && !isMinimized && (
                        <button
                          onClick={() => {
                            console.log('🔽 MINIMIZE CLICKED - Setting isMinimized to true');
                            setIsMinimized(true);
                            toast.success('Minimized to top bar! Campaign continues in background.', {
                              duration: 4000,
                              icon: '🔽'
                            });
                          }}
                          className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full hover:from-blue-700 hover:to-indigo-700 transition-all font-bold text-base border-2 border-blue-700 flex items-center gap-2 mx-auto shadow-lg animate-bounce"
                        >
                          <Minimize2 className="w-5 h-5" />
                          Click Here to Minimize to Topbar
                        </button>
                      )}
                    </div>
                    
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-base font-bold text-blue-900">
                          Progress
                        </span>
                        <span className="text-2xl font-bold text-blue-700">
                          {bulkProgress.current} / {bulkProgress.total}
                        </span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-6 overflow-hidden shadow-inner">
                        <div
                          className="h-6 bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300 flex items-center justify-end pr-3"
                          style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total) * 100 : 0}%` }}
                        >
                          <span className="text-sm text-white font-bold">
                            {bulkProgress.total > 0 ? Math.round((bulkProgress.current / bulkProgress.total) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 bg-white rounded-xl border-2 border-green-200 shadow-sm">
                        <p className="text-sm text-gray-600 mb-2 font-medium">Successful</p>
                        <p className="text-4xl font-bold text-green-600 flex items-center gap-2">
                          <CheckCheck className="w-8 h-8" />
                          {bulkProgress.success}
                        </p>
                      </div>
                      <div className="p-5 bg-white rounded-xl border-2 border-red-200 shadow-sm">
                        <p className="text-sm text-gray-600 mb-2 font-medium">Failed</p>
                        <p className="text-4xl font-bold text-red-600 flex items-center gap-2">
                          <X className="w-8 h-8" />
                          {bulkProgress.failed}
                        </p>
                      </div>
                    </div>
                    
                    {/* Paused State Message */}
                    {isPaused && !bulkSending && (
                      <div className="mt-6 p-6 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
                        <div className="text-center">
                          <Clock className="w-16 h-16 text-yellow-600 mx-auto mb-3" />
                          <h4 className="text-2xl font-bold text-yellow-900 mb-2">Campaign Paused</h4>
                          <p className="text-base text-yellow-800 mb-1">
                            Progress saved: {sentPhones.length} messages sent
                          </p>
                          <p className="text-sm text-yellow-700">
                            {selectedRecipients.length - sentPhones.length} messages remaining
                          </p>
                          <p className="text-xs text-yellow-600 mt-3">
                            Your progress is saved. You can refresh the page and resume later.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Campaign Statistics */}
                  {(bulkProgress.success > 0 || bulkProgress.failed > 0) && (
                    <div className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 mb-6">
                      <h4 className="font-bold text-gray-900 text-base mb-3 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Campaign Statistics
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-gray-600 text-xs mb-1">Success Rate</p>
                          <p className="text-2xl font-bold text-green-600">
                            {bulkProgress.success + bulkProgress.failed > 0 
                              ? Math.round((bulkProgress.success / (bulkProgress.success + bulkProgress.failed)) * 100) 
                              : 0}%
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-gray-600 text-xs mb-1">Avg Time</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {campaignStartTime && bulkProgress.current > 0
                              ? `${Math.round((Date.now() - campaignStartTime) / bulkProgress.current / 1000)}s`
                              : '—'}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-gray-600 text-xs mb-1">Remaining</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {estimatedTimeRemaining ? formatDuration(estimatedTimeRemaining) : '—'}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-gray-600 text-xs mb-1">Duration</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {campaignStartTime ? formatDuration(Math.floor((Date.now() - campaignStartTime) / 1000)) : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Export Buttons */}
                  {sentPhones.length > 0 && (
                    <div className="mb-6 flex flex-wrap gap-2">
                      <button
                        onClick={exportSentRecipients}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 text-sm font-medium"
                      >
                        <Download className="w-4 h-4" />
                        Export Sent ({sentPhones.length})
                      </button>
                      {selectedRecipients.length > sentPhones.length && (
                        <button
                          onClick={exportPendingRecipients}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 text-sm font-medium"
                        >
                          <Download className="w-4 h-4" />
                          Export Pending ({selectedRecipients.length - sentPhones.length})
                        </button>
                      )}
                      {failedMessages.length > 0 && (
                        <>
                          <button
                            onClick={exportFailedRecipients}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all flex items-center gap-2 text-sm font-medium"
                          >
                            <Download className="w-4 h-4" />
                            Export Failed ({failedMessages.length})
                          </button>
                          {!bulkSending && (
                            <button
                              onClick={addFailedToBlacklist}
                              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-all flex items-center gap-2 text-sm font-medium"
                              title="Add failed contacts to blacklist"
                            >
                              <UserX className="w-4 h-4" />
                              Blacklist Failed
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Failed Messages Details */}
                  {failedMessages.length > 0 && (
                    <div className="mb-6 p-5 bg-red-50 rounded-xl border-2 border-red-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-red-600" />
                          Failed Messages ({failedMessages.length})
                        </h4>
                        <div className="flex items-center gap-2">
                          {!bulkSending && (
                            <>
                              <button
                                onClick={retryFailedMessages}
                                className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all flex items-center gap-1.5 text-sm font-medium"
                                title="Retry all failed messages"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Retry All
                              </button>
                              <button
                                onClick={addFailedToBlacklist}
                                className="px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-all flex items-center gap-1.5 text-sm font-medium"
                                title="Add all failed contacts to blacklist with their error reasons"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                Add to Blacklist
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setShowFailedDetails(!showFailedDetails)}
                            className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                          >
                            {showFailedDetails ? 'Hide' : 'Show'} Details
                            <ChevronDown className={`w-4 h-4 transition-transform ${showFailedDetails ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Error Summary by Type */}
                      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                        {(() => {
                          const errorCounts = {
                            not_on_whatsapp: failedMessages.filter(m => m.errorType === 'not_on_whatsapp').length,
                            invalid_format: failedMessages.filter(m => m.errorType === 'invalid_format').length,
                            rate_limit: failedMessages.filter(m => m.errorType === 'rate_limit').length,
                            other: failedMessages.filter(m => !m.errorType || m.errorType === 'other').length
                          };
                          
                          return (
                            <>
                              {errorCounts.not_on_whatsapp > 0 && (
                                <div className="bg-orange-100 p-3 rounded-lg border border-orange-300">
                                  <div className="text-2xl mb-1">📵</div>
                                  <div className="text-xl font-bold text-orange-700">{errorCounts.not_on_whatsapp}</div>
                                  <div className="text-xs text-orange-600 font-medium">Not on WhatsApp</div>
                                </div>
                              )}
                              {errorCounts.invalid_format > 0 && (
                                <div className="bg-yellow-100 p-3 rounded-lg border border-yellow-300">
                                  <div className="text-2xl mb-1">⚠️</div>
                                  <div className="text-xl font-bold text-yellow-700">{errorCounts.invalid_format}</div>
                                  <div className="text-xs text-yellow-600 font-medium">Invalid Format</div>
                                </div>
                              )}
                              {errorCounts.rate_limit > 0 && (
                                <div className="bg-blue-100 p-3 rounded-lg border border-blue-300">
                                  <div className="text-2xl mb-1">⏱️</div>
                                  <div className="text-xl font-bold text-blue-700">{errorCounts.rate_limit}</div>
                                  <div className="text-xs text-blue-600 font-medium">Rate Limited</div>
                                </div>
                              )}
                              {errorCounts.other > 0 && (
                                <div className="bg-gray-100 p-3 rounded-lg border border-gray-300">
                                  <div className="text-2xl mb-1">❌</div>
                                  <div className="text-xl font-bold text-gray-700">{errorCounts.other}</div>
                                  <div className="text-xs text-gray-600 font-medium">Other Errors</div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      
                      {/* Quick Tips for Common Errors */}
                      {failedMessages.some(m => m.errorType === 'not_on_whatsapp') && (
                        <div className="mb-4 p-3 bg-white rounded-lg border border-orange-200">
                          <div className="flex items-start gap-2">
                            <span className="text-lg">💡</span>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900 mb-1">Tips for "Not on WhatsApp" errors:</p>
                              <ul className="text-xs text-gray-700 space-y-1">
                                <li>• Verify the number is correct and active</li>
                                <li>• For Tanzania: Use prefixes 71X-78X, 65X, 68X, 69X (e.g., 255712345678)</li>
                                <li>• Check if it's a mobile number (not landline)</li>
                                <li>• Confirm WhatsApp is installed on the number</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {showFailedDetails && (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {failedMessages.map((failed, idx) => {
                            // Determine icon and color based on error type
                            const errorTypeInfo = failed.errorType === 'not_on_whatsapp' 
                              ? { icon: '📵', color: 'orange', label: 'Not on WhatsApp' }
                              : failed.errorType === 'invalid_format' 
                              ? { icon: '⚠️', color: 'yellow', label: 'Invalid Format' }
                              : failed.errorType === 'rate_limit' 
                              ? { icon: '⏱️', color: 'blue', label: 'Rate Limited' }
                              : { icon: '❌', color: 'red', label: 'Error' };
                            
                            return (
                              <div key={idx} className="bg-white p-3 rounded-lg border border-red-200 hover:border-red-300 transition-colors">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-lg">{errorTypeInfo.icon}</span>
                                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-${errorTypeInfo.color}-100 text-${errorTypeInfo.color}-700`}>
                                        {errorTypeInfo.label}
                                      </span>
                                    </div>
                                    <p className="font-semibold text-gray-900">{failed.name}</p>
                                    <p className="text-sm text-gray-600 font-mono">{failed.phone}</p>
                                    <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700 leading-relaxed whitespace-pre-line">
                                      {failed.error}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                      {new Date(failed.timestamp).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Detailed Progress View */}
                  {sentPhones.length > 0 && (
                    <div className="mb-6 p-5 bg-blue-50 rounded-xl border-2 border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-600" />
                          Recipients Progress
                        </h4>
                        <button
                          onClick={() => setShowProgressDetails(!showProgressDetails)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          {showProgressDetails ? 'Hide' : 'Show'} Details
                          <ChevronDown className={`w-4 h-4 transition-transform ${showProgressDetails ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                      
                      {showProgressDetails && (
                        <div className="space-y-3">
                          {/* Sent Recipients */}
                          <div className="bg-white p-3 rounded-lg">
                            <p className="font-semibold text-green-600 mb-2 flex items-center gap-2">
                              <CheckCheck className="w-4 h-4" />
                              Sent Recipients ({sentPhones.length})
                            </p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {sentPhones.slice(-5).reverse().map(phone => {
                                const conv = conversations.find(c => c.phone === phone);
                                return (
                                  <div key={phone} className="text-sm text-gray-700 flex items-center gap-2">
                                    <CheckCheck className="w-3 h-3 text-green-500" />
                                    <span className="font-medium">{conv?.customer_name || 'Unknown'}</span>
                                    <span className="text-gray-400">-</span>
                                    <span className="font-mono text-xs">{phone}</span>
                                  </div>
                                );
                              })}
                              {sentPhones.length > 5 && (
                                <p className="text-xs text-gray-500 italic">
                                  ... and {sentPhones.length - 5} more
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Pending Recipients */}
                          {selectedRecipients.length > sentPhones.length && (
                            <div className="bg-white p-3 rounded-lg">
                              <p className="font-semibold text-orange-600 mb-2 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Pending Recipients ({selectedRecipients.length - sentPhones.length})
                              </p>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {selectedRecipients
                                  .filter(phone => !sentPhones.includes(phone))
                                  .slice(0, 5)
                                  .map(phone => {
                                    const conv = conversations.find(c => c.phone === phone);
                                    return (
                                      <div key={phone} className="text-sm text-gray-700 flex items-center gap-2">
                                        <Clock className="w-3 h-3 text-orange-500" />
                                        <span className="font-medium">{conv?.customer_name || 'Unknown'}</span>
                                        <span className="text-gray-400">-</span>
                                        <span className="font-mono text-xs">{phone}</span>
                                      </div>
                                    );
                                  })}
                                {selectedRecipients.length - sentPhones.length > 5 && (
                                  <p className="text-xs text-gray-500 italic">
                                    ... and {selectedRecipients.length - sentPhones.length - 5} more
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Campaign Timeline */}
                  {campaignTimeline.length > 0 && (
                    <div className="mb-6 p-5 bg-gray-50 rounded-xl border-2 border-gray-200">
                      <h4 className="font-bold text-gray-900 text-base mb-3 flex items-center gap-2">
                        <History className="w-5 h-5" />
                        Campaign Timeline
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {[...campaignTimeline].reverse().map((event, idx) => (
                          <div key={idx} className="flex items-start gap-3 text-sm">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{event.event}</p>
                              {event.details && (
                                <p className="text-gray-600">{event.details}</p>
                              )}
                              <p className="text-xs text-gray-500">
                                {new Date(event.time).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Live Activity Log */}
                  <div className="p-5 bg-gray-50 rounded-xl border-2 border-gray-200">
                    <h4 className="font-bold text-gray-900 text-base mb-3 flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Activity Log
                      {bulkSending && <span className="text-xs text-gray-500 ml-2">(Keyboard: Space/P=Pause, S=Stop)</span>}
                    </h4>
                    <div className="text-sm text-gray-700 space-y-2 max-h-48 overflow-y-auto font-medium">
                      <p className="flex items-center gap-2">
                        <CheckCheck className="w-4 h-4 text-green-600" />
                        Anti-ban protection active
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCheck className="w-4 h-4 text-green-600" />
                        Sending with {minDelay}-{maxDelay}s delays
                      </p>
                      {usePersonalization && (
                        <p className="flex items-center gap-2">
                          <CheckCheck className="w-4 h-4 text-green-600" />
                          Personalizing messages
                        </p>
                      )}
                      {usePresence && (
                        <p className="flex items-center gap-2">
                          <CheckCheck className="w-4 h-4 text-green-600" />
                          Showing typing indicators
                        </p>
                      )}
                      {soundEnabled && (
                        <p className="flex items-center gap-2">
                          <CheckCheck className="w-4 h-4 text-green-600" />
                          Sound notifications enabled
                        </p>
                      )}
                      {notificationsEnabled && (
                        <p className="flex items-center gap-2">
                          <CheckCheck className="w-4 h-4 text-green-600" />
                          Browser notifications enabled
                        </p>
                      )}
                      <p className="text-blue-600 font-bold mt-3 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Processing message {bulkProgress.current} of {bulkProgress.total}...
                      </p>
                    </div>
                  </div>
                  
                  {/* Success Message */}
                  {bulkProgress.current === bulkProgress.total && bulkProgress.total > 0 && (
                    <div className="p-8 bg-green-50 border-2 border-green-200 rounded-2xl mt-6 shadow-lg">
                      <div className="text-center">
                        <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                          <CheckCheck className="w-12 h-12 text-white" />
                        </div>
                        <h3 className="text-3xl font-bold text-green-900 mb-3 flex items-center justify-center gap-2">
                          <CheckCheck className="w-8 h-8" />
                          Sending Complete!
                        </h3>
                        <p className="text-lg text-green-700 font-medium">
                          Successfully sent {bulkProgress.success} out of {bulkProgress.total} messages
                        </p>
                        {bulkProgress.failed > 0 && (
                          <p className="text-base text-red-600 mt-3 font-medium">
                            {bulkProgress.failed} message{bulkProgress.failed !== 1 ? 's' : ''} failed to send
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Footer Buttons - Fixed */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 flex-shrink-0 bg-white px-6 pb-6">
                {/* Back Button - Available on all steps */}
                <button
                  onClick={() => {
                    if (bulkStep === 1) {
                      // Step 1: Close modal
                      setShowBulkModal(false);
                      setBulkStep(1);
                      setBulkMessage('');
                      setSelectedRecipients([]);
                      // Reset all message type specific state
                      setBulkMedia(null);
                      setBulkMediaType('');
                      setBulkMediaPreview('');
                      setBulkMediaCaption('');
                      setBulkMessageType('text');
                      setViewOnce(false);
                      setPollQuestion('');
                      setPollOptions(['', '']);
                      setAllowMultiSelect(false);
                      setLocationLat('');
                      setLocationLng('');
                      setLocationName('');
                      setLocationAddress('');
                    } else if (bulkStep === 4 && bulkProgress.current < bulkProgress.total && bulkProgress.total > 0) {
                      // Step 4: If still sending, don't allow going back
                      toast.error('Cannot go back while messages are being sent');
                    } else {
                      // Steps 2, 3, or 4 (after completion): Go to previous step
                      setBulkStep(bulkStep - 1);
                    }
                  }}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                
                {/* Step 1: Next Button */}
                {bulkStep === 1 && (
                  <button
                    onClick={() => {
                      if (selectedRecipients.length === 0) {
                        toast.error('Please select at least one recipient');
                        return;
                      }
                      setBulkStep(2);
                    }}
                    disabled={selectedRecipients.length === 0}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    Next: Compose Message
                  </button>
                )}
                
                {/* Step 2: Next Button */}
                {bulkStep === 2 && (
                  <button
                    onClick={() => {
                      // Validation based on message type
                      if (bulkMessageType === 'text' && !bulkMessage.trim()) {
                        toast.error('Please enter a message');
                        return;
                      }
                      if (['image', 'video', 'document', 'audio'].includes(bulkMessageType) && !bulkMedia) {
                        toast.error(`Please upload a ${bulkMessageType} file`);
                        return;
                      }
                      if (bulkMessageType === 'poll') {
                        if (!pollQuestion.trim()) {
                          toast.error('Please enter a poll question');
                          return;
                        }
                        const validOptions = pollOptions.filter(o => o.trim());
                        if (validOptions.length < 2) {
                          toast.error('Please add at least 2 poll options');
                          return;
                        }
                      }
                      if (bulkMessageType === 'location') {
                        if (!locationLat || !locationLng) {
                          toast.error('Please enter latitude and longitude');
                          return;
                        }
                      }
                      setBulkStep(3);
                    }}
                    disabled={
                      (bulkMessageType === 'text' && !bulkMessage.trim()) ||
                      (['image', 'video', 'document', 'audio'].includes(bulkMessageType) && !bulkMedia) ||
                      (bulkMessageType === 'poll' && (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2)) ||
                      (bulkMessageType === 'location' && (!locationLat || !locationLng))
                    }
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    Next: Review & Confirm
                  </button>
                )}
                
                {/* Step 3: Confirm & Send Button */}
                {bulkStep === 3 && (
                  <>
                    {sendingMode === 'browser' ? (
                  <button
                    onClick={() => {
                      setBulkStep(4);
                      sendBulkMessages();
                    }}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    {(() => {
                      const pendingCount = selectedRecipients.filter(phone => !sentPhones.includes(phone)).length;
                      return sentPhones.length > 0 
                        ? `Send ${pendingCount} Pending`
                        : `Send ${selectedRecipients.length} Message${selectedRecipients.length !== 1 ? 's' : ''}`;
                    })()}
                  </button>
                    ) : (
                      <button
                        onClick={submitCloudCampaign}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                      >
                        <Database className="w-5 h-5" />
                        Submit to Cloud
                      </button>
                    )}
                  </>
                )}
                
                {/* Step 4: Pause/Stop Controls - Show when actively sending */}
                {bulkStep === 4 && bulkSending && bulkProgress.current < bulkProgress.total && !isPaused && sendingMode === 'browser' && (
                  <>
                    <button
                      onClick={() => {
                        console.log('⏸️ Pausing campaign...');
                        setIsPaused(true);
                        toast('Pausing...');
                      }}
                      disabled={isStopped}
                      className="flex-1 px-4 py-3 bg-yellow-500 text-white rounded-xl font-medium hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                    >
                      <Clock className="w-5 h-5" />
                      Pause
                    </button>
                    <button
                      onClick={() => {
                        console.log('🛑 Stopping campaign...');
                        if (window.confirm('Stop campaign? All remaining messages will be cancelled.')) {
                          setIsStopped(true);
                          toast('Stopping...');
                        }
                      }}
                      disabled={isStopped}
                      className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                    >
                      <X className="w-5 h-5" />
                      Stop
                    </button>
                  </>
                )}
                
                {/* Step 4: Resume Button - Show when paused or stopped */}
                {bulkStep === 4 && (isPaused || !bulkSending) && bulkProgress.current < bulkProgress.total && !isStopped && sendingMode === 'browser' && (
                  <button
                    onClick={() => {
                      console.log('▶️ Resuming campaign...');
                      setIsPaused(false);
                      setBulkSending(true);
                      toast.success('Resuming campaign...');
                      // Resume sending
                      setTimeout(() => {
                        sendBulkMessages(true); // true = resuming
                      }, 500);
                    }}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <Activity className="w-5 h-5" />
                    ▶️ Resume Sending
                  </button>
                )}
                
                {/* Step 4: Close Button (after completion) */}
                {bulkStep === 4 && bulkProgress.current === bulkProgress.total && bulkProgress.total > 0 && (
                  <button
                    onClick={() => {
                      setShowBulkModal(false);
                      setBulkStep(1);
                      setBulkMessage('');
                      setSelectedRecipients([]);
                      setBulkProgress({ current: 0, total: 0, success: 0, failed: 0 });
                      // Reset all message type specific state
                      setBulkMedia(null);
                      setBulkMediaType('');
                      setBulkMediaPreview('');
                      setBulkMediaCaption('');
                      setBulkMessageType('text');
                      setViewOnce(false);
                      setPollQuestion('');
                      setPollOptions(['', '']);
                      setAllowMultiSelect(false);
                      setLocationLat('');
                      setLocationLng('');
                      setLocationName('');
                      setLocationAddress('');
                    }}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <CheckCheck className="w-5 h-5" />
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    {/* Floating Detailed Campaign Panel - SHOWS ALL DETAILS */}
    {renderMinimizedPanel()}
    
    {/* Advanced Feature Modals */}
    <React.Fragment key="modals">
        <CampaignHistoryModal
        isOpen={showCampaignHistory}
        onClose={() => setShowCampaignHistory(false)}
        onClone={(campaign) => {
          // Load cloned campaign data into bulk modal
          setBulkMessage(campaign.message);
          if (campaign.recipients_data) {
            const phones = campaign.recipients_data.map((r: any) => r.phone);
            setSelectedRecipients(phones);
          }
          setCampaignName(`${campaign.name} (Copy)`);
          setShowBulkModal(true);
          setBulkStep(2); // Go to compose step
          toast.success(`Campaign cloned! Edit and send when ready.`);
        }}
      />

      <CampaignManagementModal
        isOpen={showCampaignManagement}
        onClose={() => setShowCampaignManagement(false)}
        currentActiveCampaign={
          bulkSending && bulkStep === 4 ? {
            name: campaignName || 'Current Campaign',
            status: isPaused ? 'paused' : isStopped ? 'stopped' : 'active',
            selectedRecipients,
            sentPhones,
            bulkMessage,
            bulkMessageType,
            bulkMedia,
            bulkProgress,
            usePersonalization,
            randomDelay,
            minDelay,
            maxDelay,
            timestamp: campaignStartTime ? new Date(campaignStartTime).toISOString() : new Date().toISOString()
          } : undefined
        }
        onResumeCampaign={(campaign) => {
          // Restore campaign state
          setSelectedRecipients(campaign.selectedRecipients || []);
          setBulkMessage(campaign.bulkMessage || '');
          setBulkMessageType(campaign.bulkMessageType || 'text');
          setBulkMedia(campaign.bulkMedia || null);
          setSentPhones(campaign.sentPhones || []);
          setBulkProgress(campaign.bulkProgress || { current: 0, total: 0, success: 0, failed: 0 });
          
          // Restore settings
          if (campaign.usePersonalization !== undefined) setUsePersonalization(campaign.usePersonalization);
          if (campaign.randomDelay !== undefined) setRandomDelay(campaign.randomDelay);
          if (campaign.minDelay) setMinDelay(campaign.minDelay);
          if (campaign.maxDelay) setMaxDelay(campaign.maxDelay);
          
          // Open modal and go to sending step
          setShowBulkModal(true);
          setBulkStep(4);
          
          toast.success('Campaign restored! Click Resume to continue.', { duration: 5000 });
        }}
        onDeleteCampaign={(campaignId) => {
          // If it's the currently paused campaign, clear it
          const currentPausedKey = 'whatsapp_paused_campaign';
          if (campaignId === currentPausedKey) {
            clearPausedCampaignState();
          }
          toast.success('Campaign deleted');
        }}
      />

      <BlacklistManagementModal
        isOpen={showBlacklistModal}
        onClose={() => setShowBlacklistModal(false)}
        onUpdate={() => {
          loadBlacklist();
          loadMessages(); // Refresh to update any blacklist indicators
        }}
      />

      <MediaLibraryModal
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelect={(media) => {
          // Load selected media into bulk message
          setBulkMedia(media.file_url as any); // Use URL as file reference
          setBulkMediaType(media.file_type);
          if (media.file_type === 'image') {
            setBulkMediaPreview(media.file_url);
          }
          toast.success(`${media.name} loaded from library!`);
          
          // Update usage count
          whatsappAdvancedService.mediaLibrary.incrementUsage(media.id);
        }}
      />

      <WhatsAppSessionModal
        isOpen={showSessionModal}
        onClose={() => {
          setShowSessionModal(false);
          loadActiveSession(); // Reload active session when modal closes
        }}
        onSessionConnected={(session) => {
          toast.success(`WhatsApp session "${session.name}" connected successfully!`);
          // Reload messages to show new conversations
          loadMessages();
          // Reload active session to get the newly connected session
          loadActiveSession();
        }}
      />
      </React.Fragment>
    </>
  );
}

