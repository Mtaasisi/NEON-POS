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
import { MessageCircle, Send, CheckCheck, RefreshCw, User, Search, ChevronDown, X, Clock, Eye, Image as ImageIcon, Phone, Users, Upload, HelpCircle, Trash2, Filter, Save, FolderOpen, Database, Star, UserPlus, MessageSquare, TrendingUp, BarChart3, Download, History, Award, AlertCircle, Activity, Zap, UserX, FileText, Video, Music, MapPin, Gift, ThumbsUp, Calendar, RotateCcw, Lock, Settings, Edit3, FileCheck, Plus, Smile, Code, Hash, AtSign, Paperclip, Type, Keyboard, Sparkles, Minimize2 } from 'lucide-react';
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
import { errorExporter } from '../../../utils/errorExporter';

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
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState('');
  
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

  // Load anti-ban settings from localStorage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('whatsapp_antiban_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        // Restore anti-ban settings
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
        
        console.log('⚙️ Anti-ban settings loaded from preferences');
      }
    } catch (error) {
      console.error('Failed to load anti-ban settings:', error);
    }
  }, []);
  
  // Load customers for compose modal and check for draft
  useEffect(() => {
    async function initializeData() {
      try {
        await Promise.all([
          loadCustomers(),
          loadCampaigns(),
          loadBlacklist()
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
  }, []);
  
  // Load campaign history
  async function loadCampaigns() {
    try {
      const data = await whatsappAdvancedService.campaign.getAll(20);
      setCampaigns(data);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  }
  
  // Load blacklist
  async function loadBlacklist() {
    try {
      const data = await whatsappAdvancedService.blacklist.getAll();
      setBlacklist(data);
    } catch (error) {
      console.error('Error loading blacklist:', error);
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
        { quoted_message_id: message.message_id }
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
      const result = await whatsappService.sendMessage(conversation.phone, messageText);

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
      const result = await whatsappService.sendMessage(phoneNumber, composeMessage);
      
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
  
  async function sendBulkMessages() {
    if (!bulkMessage.trim() && bulkMessageType === 'text') {
      toast.error('Please enter a message');
      return;
    }
    
    if (selectedRecipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
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
    
    // Filter out recently contacted numbers
    let recipientsToSend = [...selectedRecipients];
    if (skipRecentlyContacted) {
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
    
    if (recipientsToSend.length === 0) {
      toast.error('All recipients were filtered out. Adjust your settings.');
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
    if (estimatedHours > 3) {
      const confirmSend = window.confirm(
        `This will take approximately ${estimatedHours} hours to send at ${maxPerHour} messages/hour.\n\n` +
        `This is to prevent spam detection. Continue?`
      );
      if (!confirmSend) {
        setBulkStep(3);
        return;
      }
    }

    setBulkSending(true);
    setBulkProgress({ current: 0, total: recipientsToSend.length, success: 0, failed: 0 });

    try {
      console.log(`📤 Starting PROTECTED bulk send to ${recipientsToSend.length} recipients`);
      console.log(`⚙️ Protection: Personalization=${usePersonalization}, RandomDelay=${randomDelay}, Batches=${batchSize}, SkipRecent=${skipRecentlyContacted}`);
      console.log(`⏱️ Rate Limits: ${maxPerHour}/hour, ${dailyLimit}/day, Batch delay: ${batchDelay}s`);
      
      // Upload media to Supabase Storage if it's a File
      let mediaDataUrl = '';
      if (bulkMedia && bulkMedia instanceof File && ['image', 'video', 'document', 'audio'].includes(bulkMessageType)) {
        try {
          console.log('📤 Uploading media to Supabase Storage...');
          toast.loading('Uploading media...', { id: 'bulk-media-upload' });
          
          // Upload to Supabase Storage
          const fileName = `whatsapp-bulk/${Date.now()}-${bulkMedia.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('whatsapp-media')
            .upload(fileName, bulkMedia, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (uploadError) {
            console.error('❌ Supabase upload error:', uploadError);
            throw new Error(uploadError.message || 'Failed to upload to storage');
          }
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('whatsapp-media')
            .getPublicUrl(fileName);
          
          if (!publicUrl) {
            throw new Error('Failed to get public URL');
          }
          
          // Ensure URL is absolute (includes protocol)
          let fullUrl = publicUrl;
          if (!publicUrl.startsWith('http://') && !publicUrl.startsWith('https://')) {
            // If relative URL, prepend Supabase project URL
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
            if (supabaseUrl) {
              fullUrl = `${supabaseUrl}${publicUrl.startsWith('/') ? '' : '/'}${publicUrl}`;
            } else {
              throw new Error('Cannot construct absolute URL: Supabase URL not configured');
            }
          }
          
          mediaDataUrl = fullUrl;
          console.log('✅ Media uploaded successfully:', fullUrl);
          toast.success('Media uploaded!', { id: 'bulk-media-upload' });
          
        } catch (error: any) {
          console.error('❌ Media upload failed:', error);
          
          // Check if it's a bucket error
          if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
            toast.error('Storage bucket "whatsapp-media" not found. Please create it in Supabase Storage or use Media Library.', { 
              id: 'bulk-media-upload',
              duration: 6000 
            });
          } else {
            toast.error(`Upload failed: ${error.message}. Please use Media Library instead.`, { 
              id: 'bulk-media-upload',
              duration: 5000 
            });
          }
          
          setBulkSending(false);
          setBulkStep(2); // Go back to compose
          return;
        }
      } else if (typeof bulkMedia === 'string') {
        // Media URL from library (already a publicly accessible URL)
        mediaDataUrl = bulkMedia;
        console.log('✅ Using media URL from library:', mediaDataUrl);
      }
      
      let successCount = 0;
      let failCount = 0;
      let skippedCount = 0;
      let messagesThisHour = 0;
      let hourStartTime = Date.now();

      // Send messages sequentially with COMPREHENSIVE anti-ban protection
      for (let i = 0; i < recipientsToSend.length; i++) {
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
          console.log(`📤 Sending bulk message ${i + 1}/${selectedRecipients.length} to ${phone}`);
          
          // Update progress
          setBulkProgress(prev => ({ ...prev, current: i + 1 }));
          
          // Personalize message (replace all variables)
          let personalizedMessage = bulkMessage;
          if (usePersonalization) {
            const now = new Date();
            const greetingHour = now.getHours();
            const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 18 ? 'Good afternoon' : 'Good evening';
            
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
          
          // 1. Add invisible Unicode characters (makes hash unique)
          if (useInvisibleChars) {
            personalizedMessage = addInvisibleVariation(personalizedMessage, i);
          }
          
          // 2. Rotate emoji variants (same meaning, different emoji)
          if (useEmojiVariation) {
            personalizedMessage = varyEmojis(personalizedMessage, i);
          }
          
          // 3. Add slight variations to message length
          if (varyMessageLength && Math.random() > 0.5) {
            const variations = [' ', '.', '!', '😊'];
            const randomVariation = variations[Math.floor(Math.random() * variations.length)];
            if (!personalizedMessage.endsWith(randomVariation) && !personalizedMessage.endsWith('.') && !personalizedMessage.endsWith('!')) {
              personalizedMessage = personalizedMessage.trim() + randomVariation;
            }
          }
          
          // Send "typing..." presence before message (more human-like)
          if (usePresence) {
            try {
              // Send presence update using WhatsApp service (includes session ID)
              await whatsappService.sendPresenceUpdate(phone, 'composing');
              
              // Wait 1-2 seconds (simulating typing)
              await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
            } catch (err) {
              // Ignore presence errors - not critical
              console.debug('Presence update skipped:', err);
            }
          }
          
          // Send message based on message type
          let result;
          
          if (bulkMessageType === 'text') {
            // Text message
            result = await whatsappService.sendMessage(phone, personalizedMessage);
          } else if (bulkMessageType === 'image' && mediaDataUrl) {
            // Validate URL before sending
            if (!mediaDataUrl.startsWith('http://') && !mediaDataUrl.startsWith('https://')) {
              console.error('❌ Invalid image URL (missing protocol):', mediaDataUrl);
              result = { success: false, error: 'Invalid image URL: Must start with http:// or https://' };
            } else {
              // Image message with caption (base64 or URL)
              result = await whatsappService.sendMessage(phone, personalizedMessage, {
                media_url: mediaDataUrl,
                message_type: 'image',
                caption: personalizedMessage,
                viewOnce: viewOnce
              });
            }
          } else if (bulkMessageType === 'video' && mediaDataUrl) {
            // Validate URL before sending
            if (!mediaDataUrl.startsWith('http://') && !mediaDataUrl.startsWith('https://')) {
              console.error('❌ Invalid video URL (missing protocol):', mediaDataUrl);
              result = { success: false, error: 'Invalid video URL: Must start with http:// or https://' };
            } else {
              // Video message with caption (base64 or URL)
              result = await whatsappService.sendMessage(phone, personalizedMessage, {
                media_url: mediaDataUrl,
                message_type: 'video',
                caption: personalizedMessage,
                viewOnce: viewOnce
              });
            }
          } else if (bulkMessageType === 'document' && mediaDataUrl) {
            // Validate URL before sending
            if (!mediaDataUrl.startsWith('http://') && !mediaDataUrl.startsWith('https://')) {
              console.error('❌ Invalid document URL (missing protocol):', mediaDataUrl);
              result = { success: false, error: 'Invalid document URL: Must start with http:// or https://' };
            } else {
              // Document message (base64 or URL)
              result = await whatsappService.sendMessage(phone, personalizedMessage, {
                media_url: mediaDataUrl,
                message_type: 'document',
                caption: personalizedMessage
              });
            }
          } else if (bulkMessageType === 'audio' && mediaDataUrl) {
            // Validate URL before sending
            if (!mediaDataUrl.startsWith('http://') && !mediaDataUrl.startsWith('https://')) {
              console.error('❌ Invalid audio URL (missing protocol):', mediaDataUrl);
              result = { success: false, error: 'Invalid audio URL: Must start with http:// or https://' };
            } else {
              // Audio message (base64 or URL)
              result = await whatsappService.sendMessage(phone, '', {
                media_url: mediaDataUrl,
                message_type: 'audio'
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
              }
            });
          } else if (bulkMessageType === 'poll' && pollQuestion && pollOptions.filter(o => o.trim()).length >= 2) {
            // Poll message
            result = await whatsappService.sendMessage(phone, '', {
              message_type: 'poll',
              pollName: pollQuestion,
              pollOptions: pollOptions.filter(o => o.trim()),
              allowMultipleAnswers: allowMultiSelect
            });
          } else {
            // Fallback to text
            result = await whatsappService.sendMessage(phone, personalizedMessage);
          }
          
          if (result.success) {
            successCount++;
            messagesThisHour++; // Increment hourly counter
            
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
            console.error(`Failed to send to ${phone}:`, result.error);
          }
          
          setBulkProgress(prev => ({ ...prev, success: successCount, failed: failCount }));
          
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
            delayMs *= slowdownFactor;
            
            console.log(`⏳ Smart delay: ${(delayMs / 1000).toFixed(1)}s (batch ${Math.floor(i / batchSize) + 1}, msg ${i + 1})...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } catch (error) {
          failCount++;
          console.error(`Error sending to ${phone}:`, error);
          setBulkProgress(prev => ({ ...prev, success: successCount, failed: failCount }));
        }
      }

      // Show final results with detailed stats
      const totalProcessed = recipientsToSend.length;
      const totalSkipped = selectedRecipients.length - recipientsToSend.length;
      
      if (successCount === totalProcessed && totalProcessed > 0) {
        toast.success(`✅ All ${successCount} messages sent successfully! ${totalSkipped > 0 ? `(${totalSkipped} skipped)` : ''}`, { duration: 5000 });
      } else if (successCount > 0) {
        toast.success(`✅ ${successCount} sent, ${failCount} failed${totalSkipped > 0 ? `, ${totalSkipped} skipped` : ''}`, { duration: 5000 });
      } else {
        toast.error(`❌ All ${failCount} messages failed${totalSkipped > 0 ? ` (${totalSkipped} skipped)` : ''}`);
      }
      
      console.log(`✅ Bulk send complete: ${successCount} success, ${failCount} failed, ${totalSkipped} skipped (anti-ban)`);
      
      // Clear draft on successful completion
      if (successCount > 0) {
        clearDraft();
        console.log('🗑️ Draft cleared after successful send');
      }
      
      // Reload messages to show new sent messages in history
      loadMessages();
      
      // Don't close modal - let user review results and close manually
      // setBulkStep stays at 4 to show completion screen
    } catch (error) {
      console.error('Error in bulk send:', error);
      toast.error('Bulk send failed. Please try again.');
      setBulkStep(3); // Go back to review step on error
    } finally {
      setBulkSending(false);
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
    if (!bulkMessage.trim() && bulkMessageType === 'text') {
      toast.error('Please enter a message');
      return;
    }
    
    if (selectedRecipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    try {
      // Prepare recipients with names
      const recipientsWithNames = selectedRecipients.map(phone => {
        const conversation = conversations.find(c => c.phone === phone);
        return {
          phone,
          name: conversation?.customer_name || 'Customer'
        };
      });

      // Upload media if needed (simplified - you may need to implement actual upload)
      let mediaUrl = bulkMedia;
      
      // Call backend API to create campaign
      const response = await fetch('/api/bulk-whatsapp/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setCloudCampaignId(data.campaignId);
        setBulkStep(4);
        toast.success('✅ Campaign submitted to cloud! Processing in background...');
        
        // Start polling for progress
        startCloudCampaignPolling(data.campaignId);
      } else {
        throw new Error(data.error || 'Failed to create campaign');
      }
    } catch (error) {
      console.error('Error submitting cloud campaign:', error);
      toast.error('Failed to submit campaign to cloud');
    }
  }

  // Poll cloud campaign progress
  function startCloudCampaignPolling(campaignId: string) {
    // Clear any existing interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Poll every 3 seconds
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/bulk-whatsapp/status/${campaignId}`);
        const data = await response.json();
        
        if (data.success && data.campaign) {
          const campaign = data.campaign;
          
          // Update progress
          setBulkProgress({
            current: campaign.progress.current,
            total: campaign.progress.total,
            success: campaign.progress.success,
            failed: campaign.progress.failed
          });
          
          // If completed, stop polling
          if (campaign.status === 'completed' || campaign.status === 'failed') {
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
        console.error('Error polling campaign:', error);
      }
    }, 3000);
    
    setPollingInterval(interval);
  }

  // Pause cloud campaign
  async function pauseCloudCampaign() {
    if (!cloudCampaignId) return;
    
    try {
      const response = await fetch(`/api/bulk-whatsapp/pause/${cloudCampaignId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        toast.success('Campaign paused');
      }
    } catch (error) {
      console.error('Error pausing campaign:', error);
      toast.error('Failed to pause campaign');
    }
  }

  // Resume cloud campaign
  async function resumeCloudCampaign() {
    if (!cloudCampaignId) return;
    
    try {
      const response = await fetch(`/api/bulk-whatsapp/resume/${cloudCampaignId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        toast.success('Campaign resumed');
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
  
  // Auto-save anti-ban settings when they change
  useEffect(() => {
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
      console.log('⚙️ Anti-ban settings saved to preferences');
    } catch (error) {
      console.error('Failed to save anti-ban settings:', error);
    }
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

  return (
    <>
      {/* Minimized Progress Bar - MUST BE AT ROOT LEVEL */}
      {isMinimized && showBulkModal && (() => {
        const isSending = bulkSending || bulkProgress.total > 0;
        console.log('🔵 Rendering minimized bar - isMinimized:', isMinimized, 'showBulkModal:', showBulkModal, 'isSending:', isSending);
        
        return (
        <div className="fixed top-0 left-0 right-0 z-[100000] bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-white/20 rounded-full flex items-center justify-center ${isSending ? 'animate-pulse' : ''}`}>
                    {isSending ? (
                      <Send className="w-5 h-5 text-white" />
                    ) : (
                      <Users className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    {isSending ? (
                      <>
                        <p className="font-bold text-sm">Sending Messages...</p>
                        <p className="text-xs text-blue-100">
                          {bulkProgress.current} / {bulkProgress.total} ({bulkProgress.success} success, {bulkProgress.failed} failed)
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-sm">Bulk WhatsApp Messages</p>
                        <p className="text-xs text-blue-100">
                          {selectedRecipients.length > 0 ? (
                            `${selectedRecipients.length} recipient${selectedRecipients.length !== 1 ? 's' : ''} selected • Step ${bulkStep} of 4`
                          ) : (
                            `Composing • Step ${bulkStep} of 4`
                          )}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                {isSending && (
                  <div className="flex-1 max-w-md">
                    <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 bg-white transition-all duration-300"
                        style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(false)}
                  className="px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-sm font-semibold transition-all flex items-center gap-1"
                >
                  <Eye className="w-4 h-4" />
                  Show
                </button>
                {!isSending && (
                  <button
                    onClick={() => {
                      setIsMinimized(false);
                      setShowBulkModal(false);
                      setBulkStep(1);
                      setSelectedRecipients([]);
                      setBulkMessage('');
                      setCampaignName('');
                    }}
                    className="px-4 py-1.5 bg-red-500/80 hover:bg-red-500 rounded-full text-sm font-semibold transition-all flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Close
                  </button>
                )}
                {bulkProgress.current === bulkProgress.total && bulkProgress.total > 0 && (
                  <button
                    onClick={() => {
                      setIsMinimized(false);
                      setShowBulkModal(false);
                      setBulkStep(1);
                      setBulkSending(false);
                      setBulkProgress({ current: 0, total: 0, success: 0, failed: 0 });
                      setSelectedRecipients([]);
                      setBulkMessage('');
                      setCampaignName('');
                    }}
                    className="px-4 py-1.5 bg-green-500 hover:bg-green-600 rounded-full text-sm font-semibold transition-all flex items-center gap-1"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    
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
                <p className="text-sm text-green-100 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
                  {messages.length} conversations • {unreadCount} new
                </p>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowComposeModal(true)}
                className="px-4 py-2 bg-white text-green-600 rounded-full flex items-center gap-2 font-semibold hover:bg-green-50 transition-all shadow-lg"
                title="Send new message"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">New Message</span>
              </button>
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
                  className="absolute top-4 right-16 w-9 h-9 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors shadow-lg z-50"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>

            {/* Icon Header - Fixed */}
            <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
              <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
                {/* Icon */}
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
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
                          bulkStep === step ? 'bg-blue-600 text-white' :
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
                        : 'bg-white text-gray-700 border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Text
                  </button>
                  <button
                    onClick={() => setBulkMessageType('image')}
                    className={`p-3 rounded-xl font-medium text-sm transition-all border-2 flex items-center justify-center gap-2 ${
                      bulkMessageType === 'image'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                        : 'bg-white text-gray-700 border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    Image
                  </button>
                  <button
                    onClick={() => setBulkMessageType('video')}
                    className={`p-3 rounded-xl font-medium text-sm transition-all border-2 flex items-center justify-center gap-2 ${
                      bulkMessageType === 'video'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                        : 'bg-white text-gray-700 border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    Video
                  </button>
                  <button
                    onClick={() => setBulkMessageType('document')}
                    className={`p-3 rounded-xl font-medium text-sm transition-all border-2 flex items-center justify-center gap-2 ${
                      bulkMessageType === 'document'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                        : 'bg-white text-gray-700 border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Document
                  </button>
                  <button
                    onClick={() => setBulkMessageType('audio')}
                    className={`p-3 rounded-xl font-medium text-sm transition-all border-2 flex items-center justify-center gap-2 ${
                      bulkMessageType === 'audio'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                        : 'bg-white text-gray-700 border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <Music className="w-4 h-4" />
                    Audio
                  </button>
                  <button
                    onClick={() => setBulkMessageType('location')}
                    className={`p-3 rounded-xl font-medium text-sm transition-all border-2 flex items-center justify-center gap-2 ${
                      bulkMessageType === 'location'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                        : 'bg-white text-gray-700 border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    Location
                  </button>
                  <button
                    onClick={() => setBulkMessageType('poll')}
                    className={`p-3 rounded-xl font-medium text-sm transition-all border-2 flex items-center justify-center gap-2 ${
                      bulkMessageType === 'poll'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                        : 'bg-white text-gray-700 border-blue-200 hover:bg-blue-50'
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
                    </div>
                    
                    {/* Reset to Defaults */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => {
                          // Reset to safe defaults
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
                          
                          toast.success('Anti-ban settings reset to safe defaults');
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Recipients</label>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl font-bold text-blue-600">{selectedRecipients.length}</span>
                        <span className="text-sm text-gray-600">recipients selected</span>
                      </div>
                      {selectedRecipients.length > 0 && (
                        <div className="max-h-32 overflow-y-auto text-sm text-gray-600 space-y-1">
                          {selectedRecipients.slice(0, 5).map(phone => {
                          const conv = conversations.find(c => c.phone === phone);
                          return (
                            <div key={phone} className="flex items-center gap-2">
                                <CheckCheck className="w-3 h-3 text-green-600" />
                                <span className="font-medium">{conv?.customer_name || 'Unknown'}</span>
                                <span className="text-gray-400">-</span>
                                <span className="font-mono text-xs">{phone}</span>
                            </div>
                          );
                        })}
                          {selectedRecipients.length > 5 && (
                            <p className="text-xs text-gray-500 italic">... and {selectedRecipients.length - 5} more</p>
                          )}
                        </div>
                        )}
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
                            console.log('Minimizing to topbar...');
                            setIsMinimized(true);
                          }}
                          className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full hover:from-blue-700 hover:to-indigo-700 transition-all font-bold text-base border-2 border-blue-700 flex items-center gap-2 mx-auto shadow-lg animate-bounce"
                        >
                          <ChevronDown className="w-5 h-5" />
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
                  </div>
                  
                  {/* Live Activity Log */}
                  <div className="p-5 bg-gray-50 rounded-xl border-2 border-gray-200">
                    <h4 className="font-bold text-gray-900 text-base mb-3 flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Activity Log
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
            <div className="p-6 bg-white border-t border-gray-200 flex-shrink-0">
              <div className="flex gap-3">
                {/* Back Button */}
                {bulkStep > 1 && bulkStep < 4 && (
                  <button
                    onClick={() => setBulkStep(bulkStep - 1)}
                    className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                  >
                    ← Back
                  </button>
                )}
                
                {/* Cancel Button */}
                {bulkStep !== 4 && (
                  <button
                    onClick={() => {
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
                    }}
                    className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                  >
                    Cancel
                  </button>
                )}
                
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
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all font-semibold shadow-lg"
                  >
                    Next: Compose Message →
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
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all font-semibold shadow-lg"
                  >
                    Next: Review & Confirm →
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
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full hover:from-green-600 hover:to-emerald-700 flex items-center justify-center gap-2 transition-all font-bold shadow-lg text-base"
                  >
                    <Send className="w-5 h-5" />
                    Confirm & Send {selectedRecipients.length} Message{selectedRecipients.length !== 1 ? 's' : ''}
                  </button>
                    ) : (
                      <button
                        onClick={submitCloudCampaign}
                        className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-full hover:from-purple-600 hover:to-indigo-700 flex items-center justify-center gap-2 transition-all font-bold shadow-lg text-base"
                      >
                        <Database className="w-5 h-5" />
                        Submit to Cloud ☁️
                      </button>
                    )}
                  </>
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
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full hover:from-green-600 hover:to-emerald-700 flex items-center justify-center gap-2 transition-all font-bold shadow-lg text-base"
                  >
                    <CheckCheck className="w-5 h-5" />
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
      })()}
      
      {/* Advanced Feature Modals */}
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
    </div>
    </>
  );
}

