/**
 * Schedule Bulk Message Modal
 * 
 * Modal for creating scheduled bulk messages (SMS & WhatsApp)
 */

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users, MessageSquare, Send, Repeat, Settings } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface ScheduleBulkMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageType?: 'sms' | 'whatsapp';
  preselectedRecipients?: Customer[];
}

export const ScheduleBulkMessageModal: React.FC<ScheduleBulkMessageModalProps> = ({
  isOpen,
  onClose,
  messageType = 'whatsapp',
  preselectedRecipients = []
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form data
  const [name, setName] = useState('');
  const [selectedMessageType, setSelectedMessageType] = useState<'sms' | 'whatsapp'>(messageType);
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState<Customer[]>(preselectedRecipients);
  
  // Scheduling
  const [scheduleType, setScheduleType] = useState<'once' | 'recurring_daily' | 'recurring_weekly' | 'recurring_monthly'>('once');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [timezone, setTimezone] = useState('Africa/Dar_es_Salaam');
  
  // Execution settings
  const [executionMode, setExecutionMode] = useState<'server' | 'browser'>('server');
  const [autoExecute, setAutoExecute] = useState(true);
  
  // Media (for WhatsApp)
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'document' | 'audio'>('image');
  const [viewOnce, setViewOnce] = useState(false);

  // Advanced settings
  const [minDelay, setMinDelay] = useState(3000);
  const [maxDelay, setMaxDelay] = useState(8000);
  const [randomDelay, setRandomDelay] = useState(true);
  const [usePersonalization, setUsePersonalization] = useState(true);

  // Load customers
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
    }
  }, [isOpen]);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      console.error('Error loading customers:', error);
      toast.error('Failed to load customers');
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const toggleRecipient = (customer: Customer) => {
    const exists = recipients.find(r => r.id === customer.id);
    if (exists) {
      setRecipients(recipients.filter(r => r.id !== customer.id));
    } else {
      setRecipients([...recipients, customer]);
    }
  };

  const handleSchedule = async () => {
    // Validation
    if (!name.trim()) {
      toast.error('Please enter a campaign name');
      return;
    }

    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (recipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      toast.error('Please select date and time');
      return;
    }

    try {
      setLoading(true);

      // Combine date and time
      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();

      // Check if scheduled time is in the past
      if (new Date(scheduledFor) < new Date()) {
        toast.error('Scheduled time must be in the future');
        return;
      }

      const messageData = {
        user_id: (await supabase.auth.getUser()).data.user?.id,
        name,
        message_type: selectedMessageType,
        message_content: message,
        recipients: recipients.map(r => ({
          phone: r.phone,
          name: r.name,
          customerId: r.id
        })),
        total_recipients: recipients.length,
        schedule_type: scheduleType,
        scheduled_for: scheduledFor,
        timezone,
        recurrence_end_date: recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : null,
        execution_mode: executionMode,
        auto_execute: autoExecute,
        settings: {
          use_personalization: usePersonalization,
          random_delay: randomDelay,
          min_delay: minDelay,
          max_delay: maxDelay,
          use_presence: true,
          batch_size: 50
        },
        media_url: selectedMessageType === 'whatsapp' ? mediaUrl : null,
        media_type: selectedMessageType === 'whatsapp' && mediaUrl ? mediaType : null,
        view_once: selectedMessageType === 'whatsapp' ? viewOnce : false
      };

      const { data, error } = await supabase
        .from('scheduled_bulk_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;

      toast.success('Message scheduled successfully!');
      onClose();
      
      // Reset form
      setName('');
      setMessage('');
      setRecipients([]);
      setScheduledDate('');
      setScheduledTime('09:00');
      setStep(1);
    } catch (error: any) {
      console.error('Error scheduling message:', error);
      toast.error('Failed to schedule message: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999]">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">Schedule Bulk Message</h2>
            <p className="text-sm text-gray-600 mt-1">
              Step {step} of 4
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Campaign Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Monthly Newsletter"
                  className="w-full p-3 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Message Type *</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setSelectedMessageType('sms')}
                    className={`p-4 border rounded-lg flex items-center justify-center gap-2 ${
                      selectedMessageType === 'sms' ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <MessageSquare size={20} />
                    <span className="font-medium">SMS</span>
                  </button>
                  <button
                    onClick={() => setSelectedMessageType('whatsapp')}
                    className={`p-4 border rounded-lg flex items-center justify-center gap-2 ${
                      selectedMessageType === 'whatsapp' ? 'border-green-500 bg-green-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <MessageSquare size={20} />
                    <span className="font-medium">WhatsApp</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Message *</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your message... Use {name}, {phone}, {date}, {time} for personalization"
                  rows={6}
                  className="w-full p-3 border rounded-lg"
                />
                <p className="text-sm text-gray-600 mt-1">
                  {message.length} characters
                </p>
              </div>

              {selectedMessageType === 'whatsapp' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Media URL (Optional)</label>
                  <input
                    type="text"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full p-3 border rounded-lg"
                  />
                  {mediaUrl && (
                    <div className="mt-2 space-y-2">
                      <select
                        value={mediaType}
                        onChange={(e) => setMediaType(e.target.value as any)}
                        className="w-full p-2 border rounded"
                      >
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                        <option value="document">Document</option>
                        <option value="audio">Audio</option>
                      </select>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={viewOnce}
                          onChange={(e) => setViewOnce(e.target.checked)}
                        />
                        <span className="text-sm">View Once</span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Recipients */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Search Customers</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="w-full p-3 border rounded-lg"
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {recipients.length} recipient(s) selected
                </p>
                <button
                  onClick={() => setRecipients(filteredCustomers)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Select All
                </button>
              </div>

              <div className="border rounded-lg max-h-96 overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <label
                    key={customer.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={recipients.some(r => r.id === customer.id)}
                      onChange={() => toggleRecipient(customer)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-gray-600">{customer.phone}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Schedule */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Schedule Type *</label>
                <select
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value as any)}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="once">Send Once</option>
                  <option value="recurring_daily">Daily</option>
                  <option value="recurring_weekly">Weekly</option>
                  <option value="recurring_monthly">Monthly</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date *</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Time *</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
              </div>

              {scheduleType !== 'once' && (
                <div>
                  <label className="block text-sm font-medium mb-2">End Date (Optional)</label>
                  <input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    min={scheduledDate || new Date().toISOString().split('T')[0]}
                    className="w-full p-3 border rounded-lg"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Leave empty for no end date
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Execution Mode</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setExecutionMode('server')}
                    className={`p-4 border rounded-lg text-left ${
                      executionMode === 'server' ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">Server (Recommended)</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Runs in background, no browser needed
                    </div>
                  </button>
                  <button
                    onClick={() => setExecutionMode('browser')}
                    className={`p-4 border rounded-lg text-left ${
                      executionMode === 'browser' ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">Browser</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Runs in your browser tab
                    </div>
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoExecute}
                  onChange={(e) => setAutoExecute(e.target.checked)}
                />
                <span className="text-sm">Auto-execute at scheduled time</span>
              </label>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium mb-3">Review Your Scheduled Message</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Campaign Name:</span>
                    <span className="font-medium">{name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">{selectedMessageType.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Recipients:</span>
                    <span className="font-medium">{recipients.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Scheduled For:</span>
                    <span className="font-medium">
                      {scheduledDate} at {scheduledTime}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Schedule Type:</span>
                    <span className="font-medium">
                      {scheduleType === 'once' ? 'One-time' : scheduleType.replace('recurring_', '').charAt(0).toUpperCase() + scheduleType.replace('recurring_', '').slice(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Execution:</span>
                    <span className="font-medium">{executionMode === 'server' ? 'Server' : 'Browser'}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-xs text-gray-600 mb-2">Message Preview:</p>
                  <div className="bg-white p-3 rounded border text-sm">
                    {message}
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ Your message will be sent automatically at the scheduled time. Make sure all details are correct before confirming.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-6 py-2 border rounded-lg hover:bg-white"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && (!name || !message)) ||
                (step === 2 && recipients.length === 0) ||
                (step === 3 && (!scheduledDate || !scheduledTime))
              }
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSchedule}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Send size={16} />
              {loading ? 'Scheduling...' : 'Schedule Message'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

