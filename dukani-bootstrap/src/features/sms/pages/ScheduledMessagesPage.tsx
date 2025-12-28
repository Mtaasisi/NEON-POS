/**
 * Scheduled Messages Management Page
 * 
 * View, manage, and monitor scheduled bulk messages
 */

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Play, 
  Pause, 
  Trash2, 
  Edit, 
  Eye, 
  RefreshCw,
  Plus,
  Filter,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { ScheduleBulkMessageModal } from '../components/ScheduleBulkMessageModal';
import { browserScheduler } from '../../../services/browserSchedulerService';

interface ScheduledMessage {
  id: string;
  name: string;
  message_type: 'sms' | 'whatsapp';
  message_content: string;
  recipients: any[];
  total_recipients: number;
  schedule_type: string;
  scheduled_for: string;
  next_execution_at?: string;
  execution_mode: 'server' | 'browser';
  status: 'pending' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  execution_count: number;
  progress: {
    current: number;
    total: number;
    success: number;
    failed: number;
  };
  created_at: string;
  last_executed_at?: string;
}

const ScheduledMessagesPage: React.FC = () => {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<ScheduledMessage | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Browser scheduler status
  const [schedulerRunning, setSchedulerRunning] = useState(false);

  useEffect(() => {
    loadMessages();

    // Set up real-time subscription
    const subscription = supabase
      .channel('scheduled_messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_bulk_messages'
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    // Initialize browser scheduler if there are browser-mode messages
    checkAndInitializeBrowserScheduler();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAndInitializeBrowserScheduler = async () => {
    try {
      const { data } = await supabase
        .from('scheduled_bulk_messages')
        .select('id')
        .eq('execution_mode', 'browser')
        .in('status', ['pending', 'scheduled'])
        .limit(1);

      if (data && data.length > 0) {
        if (!browserScheduler.isWorkerInitialized()) {
          browserScheduler.initialize();
          browserScheduler.start();
          setSchedulerRunning(true);
          toast.success('Browser scheduler started');
        }
      }
    } catch (error) {
      console.error('Error checking browser scheduler:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      let query = supabase
        .from('scheduled_bulk_messages')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (filterType !== 'all') {
        query = query.eq('message_type', filterType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load scheduled messages');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteNow = async (messageId: string) => {
    try {
      const response = await fetch(`/api/scheduled-messages/${messageId}/execute`, {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Message executed successfully');
        loadMessages();
      } else {
        toast.error('Failed to execute message');
      }
    } catch (error: any) {
      console.error('Error executing message:', error);
      toast.error('Failed to execute message');
    }
  };

  const handlePause = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_bulk_messages')
        .update({ status: 'paused' })
        .eq('id', messageId);

      if (error) throw error;
      toast.success('Message paused');
      loadMessages();
    } catch (error: any) {
      console.error('Error pausing message:', error);
      toast.error('Failed to pause message');
    }
  };

  const handleResume = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_bulk_messages')
        .update({ status: 'scheduled' })
        .eq('id', messageId);

      if (error) throw error;
      toast.success('Message resumed');
      loadMessages();
    } catch (error: any) {
      console.error('Error resuming message:', error);
      toast.error('Failed to resume message');
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled message?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('scheduled_bulk_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      toast.success('Message deleted');
      loadMessages();
    } catch (error: any) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const toggleBrowserScheduler = () => {
    if (schedulerRunning) {
      browserScheduler.stop();
      setSchedulerRunning(false);
      toast.success('Browser scheduler stopped');
    } else {
      browserScheduler.start();
      setSchedulerRunning(true);
      toast.success('Browser scheduler started');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'paused':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} />;
      case 'running':
        return <RefreshCw size={16} className="animate-spin" />;
      case 'failed':
        return <XCircle size={16} />;
      case 'paused':
        return <Pause size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  const filteredMessages = messages.filter(msg =>
    msg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.message_content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Scheduled Messages</h1>
          <p className="text-gray-600 mt-1">
            Manage your scheduled bulk SMS and WhatsApp messages
          </p>
        </div>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} />
          Schedule New
        </button>
      </div>

      {/* Browser Scheduler Control */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
        <div>
          <h3 className="font-medium flex items-center gap-2">
            <MessageSquare size={18} />
            Browser Scheduler
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {schedulerRunning 
              ? 'Running - Browser-mode messages will be processed automatically' 
              : 'Stopped - Start to process browser-mode messages'}
          </p>
        </div>
        <button
          onClick={toggleBrowserScheduler}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            schedulerRunning
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {schedulerRunning ? <Pause size={16} /> : <Play size={16} />}
          {schedulerRunning ? 'Stop' : 'Start'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search messages..."
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="all">All Types</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
        </div>
      </div>

      {/* Messages List */}
      {filteredMessages.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Scheduled Messages
          </h3>
          <p className="text-gray-600 mb-6">
            Schedule your first bulk message to get started
          </p>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Schedule Message
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map((message) => (
            <div key={message.id} className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{message.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(message.status)}`}>
                      {getStatusIcon(message.status)}
                      {message.status.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      message.message_type === 'sms' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {message.message_type.toUpperCase()}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {message.execution_mode === 'server' ? 'SERVER' : 'BROWSER'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {message.message_content}
                  </p>
                </div>

                <div className="relative">
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-gray-600">Recipients</p>
                  <p className="font-medium">{message.total_recipients}</p>
                </div>
                <div>
                  <p className="text-gray-600">Scheduled For</p>
                  <p className="font-medium">
                    {new Date(message.scheduled_for).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Schedule Type</p>
                  <p className="font-medium">{message.schedule_type.replace('recurring_', '')}</p>
                </div>
                <div>
                  <p className="text-gray-600">Executed</p>
                  <p className="font-medium">{message.execution_count} times</p>
                </div>
                {message.progress && (
                  <div>
                    <p className="text-gray-600">Progress</p>
                    <p className="font-medium">
                      {message.progress.success}/{message.progress.total}
                      {message.progress.failed > 0 && (
                        <span className="text-red-600 ml-1">
                          ({message.progress.failed} failed)
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t">
                {(message.status === 'pending' || message.status === 'scheduled') && (
                  <>
                    <button
                      onClick={() => handleExecuteNow(message.id)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1"
                    >
                      <Play size={14} />
                      Execute Now
                    </button>
                    <button
                      onClick={() => handlePause(message.id)}
                      className="px-3 py-1.5 border rounded hover:bg-gray-50 text-sm flex items-center gap-1"
                    >
                      <Pause size={14} />
                      Pause
                    </button>
                  </>
                )}

                {message.status === 'paused' && (
                  <button
                    onClick={() => handleResume(message.id)}
                    className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-1"
                  >
                    <Play size={14} />
                    Resume
                  </button>
                )}

                <button
                  onClick={() => {
                    setSelectedMessage(message);
                    setShowDetailsModal(true);
                  }}
                  className="px-3 py-1.5 border rounded hover:bg-gray-50 text-sm flex items-center gap-1"
                >
                  <Eye size={14} />
                  View
                </button>

                <button
                  onClick={() => handleDelete(message.id)}
                  className="px-3 py-1.5 border border-red-200 text-red-600 rounded hover:bg-red-50 text-sm flex items-center gap-1 ml-auto"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Modal */}
      <ScheduleBulkMessageModal
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          loadMessages();
        }}
      />

      {/* Details Modal */}
      {showDetailsModal && selectedMessage && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999]">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold">Message Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-medium mb-2">Campaign Name</h3>
                <p className="text-gray-700">{selectedMessage.name}</p>
              </div>

              <div>
                <h3 className="font-medium mb-2">Message</h3>
                <div className="bg-gray-50 p-4 rounded border">
                  <p className="whitespace-pre-wrap">{selectedMessage.message_content}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Recipients</h3>
                  <p className="text-gray-700">{selectedMessage.total_recipients} recipients</p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Type</h3>
                  <p className="text-gray-700">{selectedMessage.message_type.toUpperCase()}</p>
                </div>
              </div>

              {selectedMessage.progress && (
                <div>
                  <h3 className="font-medium mb-2">Execution Progress</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-green-50 p-3 rounded">
                      <p className="text-2xl font-bold text-green-600">
                        {selectedMessage.progress.success}
                      </p>
                      <p className="text-sm text-gray-600">Success</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded">
                      <p className="text-2xl font-bold text-red-600">
                        {selectedMessage.progress.failed}
                      </p>
                      <p className="text-sm text-gray-600">Failed</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedMessage.progress.pending}
                      </p>
                      <p className="text-sm text-gray-600">Pending</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-medium mb-2">Schedule Information</h3>
                <div className="bg-gray-50 p-4 rounded space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Scheduled For:</span>
                    <span className="font-medium">
                      {new Date(selectedMessage.scheduled_for).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Schedule Type:</span>
                    <span className="font-medium">{selectedMessage.schedule_type}</span>
                  </div>
                  {selectedMessage.next_execution_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next Execution:</span>
                      <span className="font-medium">
                        {new Date(selectedMessage.next_execution_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Execution Mode:</span>
                    <span className="font-medium">{selectedMessage.execution_mode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Times Executed:</span>
                    <span className="font-medium">{selectedMessage.execution_count}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduledMessagesPage;

