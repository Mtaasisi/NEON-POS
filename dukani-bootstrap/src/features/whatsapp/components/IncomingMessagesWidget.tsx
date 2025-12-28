/**
 * Incoming WhatsApp Messages Widget
 * Shows recent messages from a specific customer or all customers
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { MessageCircle, Send, CheckCheck } from 'lucide-react';
import whatsappService from '../../../services/whatsappService';
import { toast } from 'react-hot-toast';

interface IncomingMessagesWidgetProps {
  customerId?: string; // If provided, shows only messages from this customer
  limit?: number;
}

export default function IncomingMessagesWidget({ 
  customerId, 
  limit = 10 
}: IncomingMessagesWidgetProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    loadMessages();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadMessages, 30000);
    return () => clearInterval(interval);
  }, [customerId]);

  async function loadMessages() {
    try {
      let query = supabase
        .from('whatsapp_incoming_messages')
        .select('*, customers(name, phone)')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }

  async function sendReply(message: any) {
    if (!replyText.trim()) return;

    try {
      const result = await whatsappService.sendMessage(
        message.from_phone,
        replyText,
        { quoted_message_id: message.message_id }
      );

      if (result.success) {
        toast.success('Reply sent!');
        
        await supabase
          .from('whatsapp_incoming_messages')
          .update({ replied: true, replied_at: new Date().toISOString() })
          .eq('id', message.id);

        setReplyText('');
        setReplyingTo(null);
        loadMessages();
      } else {
        toast.error('Failed to send reply');
      }
    } catch (error) {
      toast.error('Error sending reply');
    }
  }

  if (loading) {
    return (
      <div className="bg-white/50 rounded-lg p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-600 mt-2 text-sm">Loading messages...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="bg-white/50 rounded-lg p-6 text-center">
        <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">No incoming messages yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-600" />
          Incoming Messages ({messages.length})
        </h3>
        <button
          onClick={loadMessages}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Refresh
        </button>
      </div>

      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`bg-white rounded-lg p-4 border ${
            msg.is_read ? 'border-gray-200' : 'border-blue-400'
          }`}
        >
          {/* Message Header */}
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-medium text-gray-900">
                {msg.customers?.name || msg.from_phone}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(msg.received_at).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              {!msg.is_read && (
                <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                  New
                </span>
              )}
              {msg.replied && (
                <span className="text-green-600 text-xs flex items-center gap-1">
                  <CheckCheck className="w-3 h-3" />
                  Replied
                </span>
              )}
            </div>
          </div>

          {/* Message Text */}
          <p className="text-gray-700 mb-3">{msg.message_text}</p>

          {/* Actions */}
          {replyingTo === msg.id ? (
            <div className="space-y-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyText('');
                  }}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => sendReply(msg)}
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  Send Reply
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setReplyingTo(msg.id)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Send className="w-4 h-4" />
              Reply
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

