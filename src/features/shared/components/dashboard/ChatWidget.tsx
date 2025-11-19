import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Plus, ExternalLink, Send, User, Clock } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { supabase } from '../../../../lib/supabaseClient';

interface ChatWidgetProps {
  className?: string;
}

interface ChatMetrics {
  unreadMessages: number;
  activeChats: number;
  totalMessages: number;
  recentChats: Array<{
    id: string;
    customerName: string;
    lastMessage: string;
    timestamp: string;
    unread: boolean;
    customerInitials: string;
  }>;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [metrics, setMetrics] = useState<ChatMetrics>({
    unreadMessages: 0,
    activeChats: 0,
    totalMessages: 0,
    recentChats: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChatData();
  }, []);

  const loadChatData = async () => {
    try {
      setIsLoading(true);
      
      // Import branch helper
      const { getCurrentBranchId } = await import('../../../../lib/branchAwareApi');
      const currentBranchId = getCurrentBranchId();
      
      // Fetch real customer messages from database
      let query = supabase
        .from('customer_messages')
        .select(`
          id,
          customer_id,
          message,
          status,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data: messagesData, error: messagesError } = await query;

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        throw messagesError;
      }

      // Get unique customer IDs
      const uniqueCustomerIds = [...new Set(messagesData?.map((m: any) => m.customer_id) || [])];
      
      // Fetch customer names separately to avoid relationship syntax issues
      const customersMap = new Map();
      if (uniqueCustomerIds.length > 0) {
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name')
          .in('id', uniqueCustomerIds);
        
        customersData?.forEach((customer: any) => {
          customersMap.set(customer.id, customer.name);
        });
      }

      // Group messages by customer and get the latest message for each
      const customerChatsMap = new Map();
      
      messagesData?.forEach((message: any) => {
        const customerId = message.customer_id;
        const customerName = customersMap.get(customerId) || 'Unknown Customer';
        
        // Only keep the most recent message per customer
        if (!customerChatsMap.has(customerId)) {
          const nameWords = customerName.split(' ');
          const initials = nameWords.length >= 2 
            ? `${nameWords[0][0]}${nameWords[1][0]}`.toUpperCase()
            : nameWords[0]?.substring(0, 2).toUpperCase() || 'U';

          customerChatsMap.set(customerId, {
            id: message.id,
            customerName: customerName,
            lastMessage: message.message,
            timestamp: message.created_at,
            unread: message.status !== 'read',
            customerInitials: initials
          });
        }
      });

      // Convert map to array and take top 4
      const recentChats = Array.from(customerChatsMap.values()).slice(0, 4);
      
      // Count unread messages
      const unreadCount = recentChats.filter(chat => chat.unread).length;
      
      // Count total messages
      const { count: totalCount } = await supabase
        .from('customer_messages')
        .select('*', { count: 'exact', head: true });
      
      setMetrics({
        unreadMessages: unreadCount,
        activeChats: customerChatsMap.size,
        totalMessages: totalCount || 0,
        recentChats: recentChats
      });
    } catch (error) {
      console.error('Error loading chat data:', error);
      // Set empty data on error
      setMetrics({
        unreadMessages: 0,
        activeChats: 0,
        totalMessages: 0,
        recentChats: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getInitialsColor = (initials: string) => {
    const colors = [
      'bg-blue-500',
      'bg-emerald-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500'
    ];
    const index = initials.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl p-7 flex flex-col ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-75"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl p-7 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center relative">
            <MessageCircle className="w-5 h-5 text-purple-600" />
            {metrics.unreadMessages > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">{metrics.unreadMessages}</span>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Messages</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {metrics.activeChats} active conversations
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/messages')}
          className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
          title="View All Messages"
        >
          <ExternalLink size={14} />
          <span>View All</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle size={14} className="text-red-500" />
            <span className="text-xs text-gray-500">Unread</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-semibold text-gray-900">
              {metrics.unreadMessages}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <User size={14} className="text-purple-500" />
            <span className="text-xs text-gray-500">Active</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-semibold text-gray-900">
              {metrics.activeChats}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Chats */}
      <div className="space-y-3 max-h-64 overflow-y-auto mb-6 flex-grow">
        {metrics.recentChats.length > 0 ? (
          metrics.recentChats.map((chat) => (
            <div 
              key={chat.id} 
              className={`p-3 rounded-lg transition-colors cursor-pointer ${
                chat.unread ? 'bg-purple-50 hover:bg-purple-100' : 'bg-gray-50 hover:bg-gray-100'
              }`}
              onClick={() => navigate(`/messages/${chat.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full ${getInitialsColor(chat.customerInitials)} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-sm font-bold text-white">{chat.customerInitials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${chat.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                      {chat.customerName}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock size={10} />
                      <span>{formatTimestamp(chat.timestamp)}</span>
                    </div>
                  </div>
                  <p className={`text-xs truncate ${chat.unread ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                    {chat.lastMessage}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No messages yet</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto pt-6">
        <button
          onClick={() => navigate('/messages/new')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-gray-800 transition-colors"
        >
          <Plus size={14} />
          <span>New Message</span>
        </button>
        <button
          onClick={() => navigate('/messages')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 text-sm text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <Send size={14} />
          <span>All Chats</span>
        </button>
      </div>
    </div>
  );
};

