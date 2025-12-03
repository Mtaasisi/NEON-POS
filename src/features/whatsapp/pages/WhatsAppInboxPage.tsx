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

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { MessageCircle, Send, CheckCheck, RefreshCw, User, Search, ChevronDown, X, Clock, Eye, Image as ImageIcon, Phone, Users } from 'lucide-react';
import whatsappService from '../../../services/whatsappService';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../../shared/components/ui/BackButton';
import { useAuth } from '../../../context/AuthContext';

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

interface Conversation {
  phone: string;
  customer_id?: string;
  customer_name?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  messages: ConversationMessage[];
}

interface ConversationMessage {
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
  
  // Anti-ban settings
  const [usePersonalization, setUsePersonalization] = useState(true);
  const [randomDelay, setRandomDelay] = useState(true);
  const [minDelay, setMinDelay] = useState(2);
  const [maxDelay, setMaxDelay] = useState(5);
  const [usePresence, setUsePresence] = useState(true);
  const [dailyLimit, setDailyLimit] = useState(100);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Load customers for compose modal
  useEffect(() => {
    loadCustomers();
  }, []);

  // Load messages with proper error handling
  // This component receives messages from WasenderAPI webhooks
  // The webhooks are configured in Admin Settings → Integrations → WhatsApp
  // Webhook events: messages.received, messages.upsert (for incoming messages)
  useEffect(() => {
    loadMessages();
    
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
          loadMessages();
        }
      )
      .subscribe();
    
    // Also refresh every 30 seconds as backup
    const interval = setInterval(loadMessages, 30000);
    
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
    if (!bulkMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    
    if (selectedRecipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }
    
    // Check daily limit
    if (selectedRecipients.length > dailyLimit) {
      toast.error(`Daily limit is ${dailyLimit} messages. Please reduce recipients or increase limit.`);
      return;
    }

    setBulkSending(true);
    setBulkProgress({ current: 0, total: selectedRecipients.length, success: 0, failed: 0 });

    try {
      console.log(`📤 Starting bulk send to ${selectedRecipients.length} recipients`);
      console.log(`⚙️ Settings: Personalization=${usePersonalization}, RandomDelay=${randomDelay}, Presence=${usePresence}`);
      
      let successCount = 0;
      let failCount = 0;

      // Send messages sequentially with anti-ban features
      for (let i = 0; i < selectedRecipients.length; i++) {
        const phone = selectedRecipients[i];
        const conversation = conversations.find(c => c.phone === phone);
        
        try {
          console.log(`📤 Sending bulk message ${i + 1}/${selectedRecipients.length} to ${phone}`);
          
          // Update progress
          setBulkProgress(prev => ({ ...prev, current: i + 1 }));
          
          // Personalize message (replace {name} with customer name)
          let personalizedMessage = bulkMessage;
          if (usePersonalization && conversation?.customer_name && conversation.customer_name !== 'Unknown') {
            personalizedMessage = bulkMessage.replace(/\{name\}/gi, conversation.customer_name);
          }
          
          // Send "typing..." presence before message (more human-like)
          if (usePresence) {
            try {
              // WasenderAPI presence update feature
              await fetch('https://wasenderapi.com/api/send-presence-update', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${await getApiKey()}`
                },
                body: JSON.stringify({
                  to: phone,
                  state: 'composing' // typing...
                })
              }).catch(() => {}); // Ignore errors, not critical
              
              // Wait 1-2 seconds (simulating typing)
              await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
            } catch (err) {
              // Ignore presence errors
            }
          }
          
          // Send message using WasenderAPI
          const result = await whatsappService.sendMessage(phone, personalizedMessage);
          
          if (result.success) {
            successCount++;
            
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
          
          // Random delay between messages (anti-ban: appears more human-like)
          if (i < selectedRecipients.length - 1) {
            let delayMs = minDelay * 1000;
            if (randomDelay) {
              // Random delay between min and max seconds
              const randomSeconds = minDelay + Math.random() * (maxDelay - minDelay);
              delayMs = randomSeconds * 1000;
            }
            console.log(`⏳ Waiting ${(delayMs / 1000).toFixed(1)}s before next message...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } catch (error) {
          failCount++;
          console.error(`Error sending to ${phone}:`, error);
          setBulkProgress(prev => ({ ...prev, success: successCount, failed: failCount }));
        }
      }

      // Show final results
      if (successCount === selectedRecipients.length) {
        toast.success(`✅ All ${successCount} messages sent successfully!`, { duration: 5000 });
      } else if (successCount > 0) {
        toast.success(`✅ ${successCount} sent, ${failCount} failed`, { duration: 5000 });
      } else {
        toast.error(`❌ All ${failCount} messages failed`);
      }
      
      console.log(`✅ Bulk send complete: ${successCount} success, ${failCount} failed`);
      
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

  const unreadCount = conversations.reduce((sum, c) => sum + c.unread_count, 0);
  const unrepliedCount = conversations.filter(c => {
    const lastMsg = c.messages[c.messages.length - 1];
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

  return (
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
                  setBulkStep(1);
                  setShowBulkModal(true);
                }}
                className="px-4 py-2 bg-white text-blue-600 rounded-full flex items-center gap-2 font-semibold hover:bg-blue-50 transition-all shadow-lg"
                title="Send bulk messages"
              >
                <Users className="w-4 h-4" />
                <span className="hidden lg:inline">Bulk Send</span>
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
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header with Step Indicator */}
            <div className="p-8 bg-gradient-to-r from-blue-600 to-indigo-600 flex-shrink-0">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      Bulk WhatsApp Messages
                    </h2>
                    <p className="text-base text-blue-100 font-medium">
                      {bulkStep === 1 && 'Step 1: Select Recipients'}
                      {bulkStep === 2 && 'Step 2: Compose Message'}
                      {bulkStep === 3 && 'Step 3: Review & Confirm'}
                      {bulkStep === 4 && 'Step 4: Sending Messages'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!bulkSending) {
                      setShowBulkModal(false);
                      setBulkStep(1);
                      setBulkMessage('');
                      setSelectedRecipients([]);
                    }
                  }}
                  disabled={bulkSending}
                  className="w-9 h-9 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              
              {/* Progress Steps */}
              <div className="flex items-center justify-between">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-base shadow-lg ${
                      bulkStep > step ? 'bg-green-500 text-white' :
                      bulkStep === step ? 'bg-white text-blue-600' :
                      'bg-white/20 text-white/60'
                    }`}>
                      {bulkStep > step ? '✓' : step}
                    </div>
                    {step < 4 && (
                      <div className={`flex-1 h-2 mx-2 rounded-full ${
                        bulkStep > step ? 'bg-green-500' : 'bg-white/20'
                      }`}></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
              {/* STEP 1: Select Recipients */}
              {bulkStep === 1 && (
                <div>
                  {/* Step Info */}
                  <div className="mb-6 p-5 bg-blue-50 border-2 border-blue-200 rounded-xl">
                    <h3 className="font-bold text-blue-900 mb-2 text-lg">👥 Who should receive your message?</h3>
                    <p className="text-sm text-blue-700">
                      Select customers from your conversation list. Use "Smart Select" to automatically exclude recently contacted customers.
                    </p>
                  </div>
                  
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-base font-bold text-gray-900">
                    Select Recipients ({selectedRecipients.length} selected)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        // Smart select: only select conversations that haven't been messaged recently (last 24h)
                        const now = Date.now();
                        const dayAgo = now - (24 * 60 * 60 * 1000);
                        const smartRecipients = filteredConversations
                          .filter(c => {
                            const lastMsg = c.messages[c.messages.length - 1];
                            if (!lastMsg) return true;
                            if (lastMsg.type === 'sent') {
                              const msgTime = new Date(lastMsg.timestamp).getTime();
                              return msgTime < dayAgo; // Not messaged in last 24h
                            }
                            return true; // Last message was from them
                          })
                          .map(c => c.phone);
                        setSelectedRecipients(smartRecipients);
                        toast.success(`Selected ${smartRecipients.length} eligible recipients (excluding recently contacted)`);
                      }}
                      disabled={bulkSending}
                      className="text-sm px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 font-semibold disabled:opacity-50"
                    >
                      Smart Select
                    </button>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto border-2 border-gray-300 rounded-xl p-4 bg-gray-50">
                  <div className="space-y-3">
                    {filteredConversations.map((conversation) => {
                      // Check if messaged recently
                      const lastMsg = conversation.messages[conversation.messages.length - 1];
                      const lastSent = lastMsg?.type === 'sent' ? lastMsg : null;
                      const recentlySent = lastSent && (Date.now() - new Date(lastSent.timestamp).getTime()) < (24 * 60 * 60 * 1000);
                      
                      return (
                        <label
                          key={conversation.phone}
                          className={`flex items-center gap-4 p-4 rounded-xl hover:bg-blue-50 cursor-pointer transition-all border-2 ${
                            recentlySent ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRecipients.includes(conversation.phone)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                if (recentlySent) {
                                  toast.warning(`${conversation.customer_name} was contacted recently (last 24h). Select anyway?`);
                                }
                                setSelectedRecipients(prev => [...prev, conversation.phone]);
                              } else {
                                setSelectedRecipients(prev => prev.filter(p => p !== conversation.phone));
                              }
                            }}
                            disabled={bulkSending}
                            className="w-6 h-6 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                              {conversation.customer_name ? getInitials(conversation.customer_name) : <User className="w-6 h-6" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-gray-900 truncate text-base">
                                  {conversation.customer_name}
                                </p>
                                {recentlySent && (
                                  <span className="px-3 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full font-bold flex-shrink-0">
                                    Recent
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 font-medium">{conversation.phone}</p>
                              {recentlySent && (
                                <p className="text-xs text-yellow-700 mt-1 font-medium">
                                  Last sent: {(() => {
                                    const hours = Math.floor((Date.now() - new Date(lastSent!.timestamp).getTime()) / (60 * 60 * 1000));
                                    return hours < 1 ? 'less than 1h ago' : `${hours}h ago`;
                                  })()}
                                </p>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => setSelectedRecipients(filteredConversations.map(c => c.phone))}
                    className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Select All
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={() => setSelectedRecipients([])}
                    className="text-sm text-gray-600 hover:text-gray-800 font-semibold"
                  >
                    Clear All
                  </button>
                </div>
                </div>
              )}

              {/* STEP 2: Compose Message */}
              {bulkStep === 2 && (
                <div>
                  {/* Step Info */}
                  <div className="mb-6 p-5 bg-purple-50 border-2 border-purple-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-purple-900 mb-2 text-lg">✍️ Compose your message</h3>
                        <p className="text-sm text-purple-700">
                          Use <code className="px-2 py-1 bg-purple-100 rounded font-mono">{'{name}'}</code> to personalize. Choose a template or write your own message.
                        </p>
                      </div>
                      <div className="text-right bg-white rounded-xl px-4 py-3 border-2 border-purple-300 shadow-sm">
                        <p className="text-xs text-gray-600 font-medium">Sending to</p>
                        <p className="text-3xl font-bold text-purple-900">{selectedRecipients.length}</p>
                        <p className="text-xs text-gray-600 font-medium">recipients</p>
                      </div>
                    </div>
                  </div>
                  
              {/* Quick Templates */}
              <div className="mb-6 p-5 bg-purple-50 border-2 border-purple-200 rounded-xl">
                <label className="block text-base font-bold text-purple-900 mb-3">
                  📝 Quick Templates (Click to use)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={() => setBulkMessage('Hi {name}! We have exciting news for you. Check out our latest offers today!')}
                    className="text-left px-4 py-3 bg-white rounded-xl hover:bg-purple-100 transition-all text-sm border-2 border-purple-200 font-medium"
                  >
                    🎁 Promotional Offer
                  </button>
                  <button
                    onClick={() => setBulkMessage('Hello {name}, thank you for being our valued customer! We appreciate your business.')}
                    className="text-left px-4 py-3 bg-white rounded-xl hover:bg-purple-100 transition-all text-sm border-2 border-purple-200 font-medium"
                  >
                    🙏 Thank You Message
                  </button>
                  <button
                    onClick={() => setBulkMessage('Hi {name}, just a friendly reminder about your upcoming appointment. See you soon!')}
                    className="text-left px-4 py-3 bg-white rounded-xl hover:bg-purple-100 transition-all text-sm border-2 border-purple-200 font-medium"
                  >
                    📅 Appointment Reminder
                  </button>
                  <button
                    onClick={() => setBulkMessage('Hey {name}! We miss you! Come visit us and enjoy special discounts for returning customers.')}
                    className="text-left px-4 py-3 bg-white rounded-xl hover:bg-purple-100 transition-all text-sm border-2 border-purple-200 font-medium"
                  >
                    🔄 Re-engagement
                  </button>
                </div>
              </div>

              {/* Message Composer */}
              <div className="bg-white rounded-2xl border-2 border-blue-500 p-5 shadow-lg">
                <label className="block text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                  Your Message
                </label>
                <textarea
                  value={bulkMessage}
                  onChange={(e) => setBulkMessage(e.target.value)}
                  placeholder="Type your message here... Use {name} for personalization.&#10;&#10;Example: Hi {name}, we have a special offer for you!"
                  rows={8}
                  className="w-full p-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 resize-none text-base"
                  autoFocus
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                      {bulkMessage.length} characters
                    </span>
                    {usePersonalization && bulkMessage.includes('{name}') && (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                        Personalized
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Message Preview */}
                {usePersonalization && bulkMessage.includes('{name}') && selectedRecipients.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                    <p className="text-sm font-bold text-gray-700 mb-2">Preview:</p>
                    <p className="text-base text-gray-900 leading-relaxed">
                      {bulkMessage.replace(/\{name\}/gi, conversations.find(c => c.phone === selectedRecipients[0])?.customer_name || 'Customer')}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Advanced Settings - Collapsible */}
              <div className="mt-5">
                <button
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="w-full flex items-center justify-between p-4 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all border-2 border-gray-200"
                >
                  <span className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <span className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-white text-sm">⚙️</span>
                    Anti-Ban Protection Settings
                  </span>
                  <ChevronDown className={`w-6 h-6 text-gray-600 transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`} />
                </button>
                
                {showAdvancedSettings && (
                  <div className="mt-3 p-5 bg-green-50 border-2 border-green-200 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Personalization */}
                  <label className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-green-50 transition-all border border-green-200">
                    <input
                      type="checkbox"
                      checked={usePersonalization}
                      onChange={(e) => setUsePersonalization(e.target.checked)}
                      className="w-5 h-5 text-green-600 rounded"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">Personalize Messages</p>
                      <p className="text-xs text-gray-600">Use {'{name}'} to insert customer name</p>
                    </div>
                  </label>
                  
                  {/* Random Delay */}
                  <label className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-green-50 transition-all border border-green-200">
                    <input
                      type="checkbox"
                      checked={randomDelay}
                      onChange={(e) => setRandomDelay(e.target.checked)}
                      className="w-5 h-5 text-green-600 rounded"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">Random Delays</p>
                      <p className="text-xs text-gray-600">Vary timing between messages</p>
                    </div>
                  </label>
                  
                  {/* Typing Indicator */}
                  <label className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-green-50 transition-all border border-green-200">
                    <input
                      type="checkbox"
                      checked={usePresence}
                      onChange={(e) => setUsePresence(e.target.checked)}
                      className="w-5 h-5 text-green-600 rounded"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">Typing Indicator</p>
                      <p className="text-xs text-gray-600">Show "typing..." before sending</p>
                    </div>
                  </label>
                  
                  {/* Delay Range */}
                  <div className="p-3 bg-white rounded-lg border border-green-200">
                    <p className="font-semibold text-gray-900 text-sm mb-2">Delay Range</p>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700">{minDelay}s</span>
                      <input
                        type="range"
                        value={maxDelay}
                        onChange={(e) => setMaxDelay(parseInt(e.target.value))}
                        min={minDelay}
                        max="20"
                        className="flex-1 h-2"
                      />
                      <span className="text-sm font-medium text-gray-700">{maxDelay}s</span>
                    </div>
                  </div>
                </div>
                  </div>
                )}
              </div>
                </div>
              )}

              {/* STEP 3: Review & Confirm */}
              {bulkStep === 3 && (
                <div>
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
                    <h3 className="font-bold text-blue-900 mb-5 text-xl">📋 Review Before Sending</h3>
                    
                    {/* Recipients Summary */}
                    <div className="mb-5 p-5 bg-white rounded-xl shadow-sm">
                      <p className="text-base font-bold text-gray-700 mb-3">Recipients:</p>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-4xl font-bold text-blue-600">{selectedRecipients.length}</span>
                        <span className="text-base text-gray-600">customers will receive this message</span>
                      </div>
                      <div className="max-h-40 overflow-y-auto text-sm text-gray-600 space-y-2">
                        {selectedRecipients.slice(0, 10).map(phone => {
                          const conv = conversations.find(c => c.phone === phone);
                          return (
                            <div key={phone} className="flex items-center gap-2">
                              <CheckCheck className="w-4 h-4 text-green-600" />
                              <span className="font-medium">{conv?.customer_name || 'Unknown'}</span> - {phone}
                            </div>
                          );
                        })}
                        {selectedRecipients.length > 10 && (
                          <p className="text-gray-500 italic font-medium">... and {selectedRecipients.length - 10} more recipients</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Message Preview */}
                    <div className="mb-5 p-5 bg-white rounded-xl shadow-sm">
                      <p className="text-base font-bold text-gray-700 mb-3">Message Preview:</p>
                      <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                        <p className="text-base text-gray-900 whitespace-pre-wrap leading-relaxed">
                          {usePersonalization && selectedRecipients.length > 0
                            ? bulkMessage.replace(/\{name\}/gi, conversations.find(c => c.phone === selectedRecipients[0])?.customer_name || 'Customer')
                            : bulkMessage}
                        </p>
                      </div>
                    </div>
                    
                    {/* Settings Summary */}
                    <div className="p-5 bg-white rounded-xl shadow-sm">
                      <p className="text-base font-bold text-gray-700 mb-3">Protection Settings:</p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          {usePersonalization ? (
                            <span className="text-green-600">✓ Personalization ON</span>
                          ) : (
                            <span className="text-gray-500">✗ Personalization OFF</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {randomDelay ? (
                            <span className="text-green-600">✓ Random Delays ({minDelay}-{maxDelay}s)</span>
                          ) : (
                            <span className="text-gray-500">✗ Fixed Delay ({minDelay}s)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {usePresence ? (
                            <span className="text-green-600">✓ Typing Indicator</span>
                          ) : (
                            <span className="text-gray-500">✗ No Typing Indicator</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-700">📊 Daily Limit: {dailyLimit}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Time Estimate */}
                    <div className="mt-5 p-5 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl border-2 border-blue-300 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-bold text-blue-900 mb-1">⏱️ Estimated Time:</p>
                          <p className="text-sm text-blue-700 font-medium">
                            {(() => {
                              const avgDelay = randomDelay ? (minDelay + maxDelay) / 2 : minDelay;
                              const typingTime = usePresence ? 1.5 : 0;
                              const totalSeconds = selectedRecipients.length * (avgDelay + typingTime + 1);
                              const minutes = Math.floor(totalSeconds / 60);
                              const seconds = Math.floor(totalSeconds % 60);
                              return `Approximately ${minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`}`;
                            })()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-4xl font-bold text-blue-900">{selectedRecipients.length}</p>
                          <p className="text-sm text-blue-700 font-medium">messages</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Warning Box */}
                  <div className="p-5 bg-yellow-50 border-2 border-yellow-300 rounded-xl shadow-sm">
                    <p className="text-base text-yellow-900 font-semibold">
                      ⚠️ <strong>Please confirm:</strong> You are about to send <strong>{selectedRecipients.length} WhatsApp messages</strong>. This action cannot be undone. Make sure your message is correct before proceeding.
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
                      <h3 className="text-2xl font-bold text-blue-900 mb-2">Sending Messages...</h3>
                      <p className="text-base text-blue-700 font-medium">Please keep this window open</p>
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
                          style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                        >
                          <span className="text-sm text-white font-bold">
                            {Math.round((bulkProgress.current / bulkProgress.total) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 bg-white rounded-xl border-2 border-green-200 shadow-sm">
                        <p className="text-sm text-gray-600 mb-2 font-medium">Successful</p>
                        <p className="text-4xl font-bold text-green-600">✓ {bulkProgress.success}</p>
                      </div>
                      <div className="p-5 bg-white rounded-xl border-2 border-red-200 shadow-sm">
                        <p className="text-sm text-gray-600 mb-2 font-medium">Failed</p>
                        <p className="text-4xl font-bold text-red-600">✗ {bulkProgress.failed}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Live Activity Log */}
                  <div className="p-5 bg-gray-50 rounded-xl border-2 border-gray-200">
                    <h4 className="font-bold text-gray-900 text-base mb-3">🔄 Activity Log</h4>
                    <div className="text-sm text-gray-700 space-y-2 max-h-48 overflow-y-auto font-medium">
                      <p>✓ Anti-ban protection active</p>
                      <p>✓ Sending with {minDelay}-{maxDelay}s delays</p>
                      {usePersonalization && <p>✓ Personalizing messages</p>}
                      {usePresence && <p>✓ Showing typing indicators</p>}
                      <p className="text-blue-600 font-bold mt-3">⏳ Processing message {bulkProgress.current} of {bulkProgress.total}...</p>
                    </div>
                  </div>
                  
                  {/* Success Message */}
                  {bulkProgress.current === bulkProgress.total && bulkProgress.total > 0 && (
                    <div className="p-8 bg-green-50 border-2 border-green-200 rounded-2xl mt-6 shadow-lg">
                      <div className="text-center">
                        <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                          <CheckCheck className="w-12 h-12 text-white" />
                        </div>
                        <h3 className="text-3xl font-bold text-green-900 mb-3">✅ Sending Complete!</h3>
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
            
            {/* Footer Buttons - Step Aware */}
            <div className="p-6 bg-gray-50 border-t-2 border-gray-200 flex-shrink-0">
              <div className="flex gap-4">
                {/* Back Button */}
                {bulkStep > 1 && bulkStep < 4 && (
                  <button
                    onClick={() => setBulkStep(bulkStep - 1)}
                    className="px-8 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-all font-bold text-base"
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
                    }}
                    className="flex-1 px-6 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-all font-bold text-base"
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
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all font-bold shadow-lg text-base"
                  >
                    Next: Compose Message →
                  </button>
                )}
                
                {/* Step 2: Next Button */}
                {bulkStep === 2 && (
                  <button
                    onClick={() => {
                      if (!bulkMessage.trim()) {
                        toast.error('Please enter a message');
                        return;
                      }
                      setBulkStep(3);
                    }}
                    disabled={!bulkMessage.trim()}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all font-bold shadow-lg text-base"
                  >
                    Next: Review & Confirm →
                  </button>
                )}
                
                {/* Step 3: Confirm & Send Button */}
                {bulkStep === 3 && (
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
      )}
    </div>
  );
}

