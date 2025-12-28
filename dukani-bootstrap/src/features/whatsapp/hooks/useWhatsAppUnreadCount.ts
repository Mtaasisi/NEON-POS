/**
 * Hook to get unread WhatsApp message count
 * Updates in real-time
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export function useWhatsAppUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Initial load
    fetchUnreadCount();

    // Set up real-time subscription
    const subscription = supabase
      .channel('whatsapp_unread_count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_incoming_messages'
        },
        () => {
          // Message added/updated - refresh count
          fetchUnreadCount();
        }
      )
      .subscribe();

    // Refresh every minute
    const interval = setInterval(fetchUnreadCount, 60000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  async function fetchUnreadCount() {
    try {
      const { count, error } = await supabase
        .from('whatsapp_incoming_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      if (error) {
        console.error('Error fetching unread count:', error);
        return;
      }

      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }

  return unreadCount;
}

