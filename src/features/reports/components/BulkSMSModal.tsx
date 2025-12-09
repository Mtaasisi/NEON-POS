import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageSquare, Send, Sparkles } from 'lucide-react';
import { LoyaltyLevel, Customer } from '../../../types';
import geminiService from '../../../services/geminiService';
import { toast } from 'react-hot-toast';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

interface BulkSMSModalProps {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  onSend: (recipients: Customer[], message: string) => void;
  sending?: boolean;
}

const BulkSMSModal: React.FC<BulkSMSModalProps> = ({ open, onClose, customers, onSend, sending = false }) => {
  const [loyalty, setLoyalty] = useState<'all' | LoyaltyLevel>('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [tag, setTag] = useState<'all' | 'vip' | 'new' | 'complainer'>('all');
  const [message, setMessage] = useState('');
  const [aiMode, setAiMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>('');

  // Prevent body scroll when modal is open
  useBodyScrollLock(open);

  // Additional scroll prevention for html element
  useEffect(() => {
    if (open) {
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      
      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [open]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      let pass = true;
      if (loyalty !== 'all') pass = pass && c.loyaltyLevel === loyalty;
      if (status !== 'all') pass = pass && (status === 'active' ? c.isActive : !c.isActive);
      if (tag !== 'all') pass = pass && c.colorTag === tag;
      return pass;
    });
  }, [customers, loyalty, status, tag]);

  // AI-powered message generation
  const generateAIMessage = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a prompt for AI message generation');
      return;
    }

    setAiGenerating(true);
    try {
      const context = `Generate SMS messages for ${filteredCustomers.length} customers in a device repair and sales business.
      
Customer Segment Info:
- Loyalty Level: ${loyalty === 'all' ? 'Mixed' : loyalty}
- Status: ${status === 'all' ? 'Mixed' : status}
- Tag: ${tag === 'all' ? 'Mixed' : tag}
- Total Customers: ${filteredCustomers.length}

Business Context:
- Device repair and sales business
- Professional but friendly tone
- Quick response times
- Technical expertise available
- Customer service focused

Requirements:
- Generate 3 different message variations
- Each message should be under 160 characters
- Professional and friendly tone
- Address the specific prompt/context
- Include call-to-action if appropriate
- Use simple language (Swahili/English mix is okay)`;

      const fullPrompt = `${context}\n\nYour prompt: ${aiPrompt}\n\nGenerate 3 SMS message variations:`;

      const response = await geminiService.chat([{ role: 'user', content: fullPrompt }]);
      
      if (response.success && response.data) {
        // Parse the AI response to extract message suggestions
        const suggestions = response.data
          .split('\n')
          .filter(line => line.trim().length > 0 && line.trim().length < 200)
          .map(line => line.replace(/^\d+\.\s*/, '').trim())
          .slice(0, 3);
        
        setAiSuggestions(suggestions);
        toast.success('AI generated message suggestions!');
      } else {
        toast.error('Failed to generate AI suggestions');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Error generating AI suggestions');
    } finally {
      setAiGenerating(false);
    }
  };

  // AI-powered customer insights
  const generateCustomerInsights = async () => {
    if (filteredCustomers.length === 0) {
      toast.error('No customers selected for analysis');
      return;
    }

    setAiGenerating(true);
    try {
      const customerData = filteredCustomers.map(c => ({
        name: c.name,
        loyaltyLevel: c.loyaltyLevel,
        totalSpent: c.totalSpent,
        points: c.points,
        colorTag: c.colorTag,
        isActive: c.isActive
      }));

      const prompt = `Analyze this customer segment for a device repair and sales business:

Customer Data: ${JSON.stringify(customerData, null, 2)}

Please provide:
1. Key insights about this customer segment
2. Recommended messaging approach
3. Best time to contact them
4. Potential offers or promotions
5. Risk factors to consider

Keep response concise and actionable.`;

      const response = await geminiService.chat([{ role: 'user', content: prompt }]);
      
      if (response.success && response.data) {
        // Show insights in a toast or modal
        toast.success('Customer insights generated! Check console for details.');
        console.log('AI Customer Insights:', response.data);
      } else {
        toast.error('Failed to generate customer insights');
      }
    } catch (error) {
      console.error('Customer insights error:', error);
      toast.error('Error generating customer insights');
    } finally {
      setAiGenerating(false);
    }
  };

  // AI-powered personalized message generation
  const generatePersonalizedMessages = async () => {
    if (filteredCustomers.length === 0) {
      toast.error('No customers selected');
      return;
    }

    setAiGenerating(true);
    try {
      const sampleCustomer = filteredCustomers[0];
      const prompt = `Generate a personalized SMS template for a device repair business customer:

Customer Info:
- Name: ${sampleCustomer.name}
- Loyalty Level: ${sampleCustomer.loyaltyLevel}
- Total Spent: ${sampleCustomer.totalSpent}
- Points: ${sampleCustomer.points}
- Tag: ${sampleCustomer.colorTag}

Business Context:
- Device repair and sales
- Professional but friendly tone
- Include customer's name and loyalty level
- Make it personal and relevant

Generate a personalized message template with placeholders like {name}, {loyaltyLevel}, {totalSpent}, {points}.`;

      const response = await geminiService.chat([{ role: 'user', content: prompt }]);
      
      if (response.success && response.data) {
        setMessage(response.data.trim());
        toast.success('Personalized message template generated!');
      } else {
        toast.error('Failed to generate personalized template');
      }
    } catch (error) {
      console.error('Personalized message error:', error);
      toast.error('Error generating personalized template');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSend = () => {
    if (!message.trim()) return;
    
    // If using AI suggestion, use that message
    const finalMessage = selectedSuggestion || message;
    onSend(filteredCustomers, finalMessage);
    setMessage('');
    setSelectedSuggestion('');
    setAiSuggestions([]);
    onClose();
  };

  const selectSuggestion = (suggestion: string) => {
    setSelectedSuggestion(suggestion);
    setMessage(suggestion);
  };

  if (!open) return null;

  return createPortal(
    <>
      <div 
        className="fixed bg-black/60 flex items-center justify-center p-4 z-[99999]" 
        style={{
          top: 0, 
          left: 0, 
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          overscrollBehavior: 'none'
        }}
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="bulk-sms-title"
          onClick={onClose}
        >
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
          >
            <X className="w-5 h-5" />
        </button>
        
          {/* Icon Header - Fixed */}
          <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              
              {/* Text */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2" id="bulk-sms-title">
                  Bulk SMS
                </h3>
                <p className="text-sm text-gray-600">
                  Send messages to {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Form - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
        
        {/* AI Mode Toggle */}
            <div className="mb-6">
          <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={aiMode}
                onChange={(e) => setAiMode(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
                  <span className="text-sm font-semibold text-gray-700">🤖 Enable AI Features</span>
            </label>
            {aiMode && (
              <div className="flex gap-2">
                    <button
                  onClick={generateCustomerInsights}
                  disabled={aiGenerating}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all shadow-sm hover:shadow-md font-medium text-sm border-2 border-blue-200 disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4" />
                      {aiGenerating ? 'Analyzing...' : 'Customer Insights'}
                    </button>
                    <button
                  onClick={generatePersonalizedMessages}
                  disabled={aiGenerating}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-all shadow-sm hover:shadow-md font-medium text-sm border-2 border-purple-200 disabled:opacity-50"
                >
                      <Sparkles className="w-4 h-4" />
                      {aiGenerating ? 'Generating...' : 'Personalized Template'}
                    </button>
              </div>
            )}
          </div>
        </div>

        {/* Customer Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Loyalty</label>
            <select
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium"
              value={loyalty}
              onChange={e => setLoyalty(e.target.value as any)}
            >
              <option value="all">All</option>
              <option value="vip">VIP</option>
              <option value="premium">Premium</option>
              <option value="regular">Regular</option>
              <option value="active">Active</option>
              <option value="payment_customer">Payment Customer</option>
              <option value="engaged">Engaged</option>
              <option value="interested">Interested</option>
            </select>
          </div>
          <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <select
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium"
              value={status}
              onChange={e => setStatus(e.target.value as any)}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tag</label>
            <select
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium"
              value={tag}
              onChange={e => setTag(e.target.value as any)}
            >
              <option value="all">All</option>
              <option value="vip">VIP</option>
              <option value="new">New</option>
              <option value="complainer">Complainer</option>
            </select>
          </div>
        </div>

        {/* AI Message Generation */}
        {aiMode && (
              <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Message Generation
                </h3>
            <div className="space-y-3">
              <div>
                    <label className="block text-sm font-semibold text-blue-700 mb-2">AI Prompt</label>
                <textarea
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium min-h-[80px]"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="Describe what kind of message you want to send (e.g., 'Promote our new phone repair service', 'Thank loyal customers', 'Announce special discount')"
                />
              </div>
                  <button
                onClick={generateAIMessage}
                disabled={aiGenerating || !aiPrompt.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                    <Sparkles className="w-4 h-4" />
                    {aiGenerating ? 'Generating...' : 'Generate AI Suggestions'}
                  </button>
              
              {/* AI Suggestions */}
              {aiSuggestions.length > 0 && (
                <div className="space-y-2">
                      <label className="block text-sm font-semibold text-blue-700">AI Suggestions:</label>
                  {aiSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedSuggestion === suggestion
                              ? 'border-blue-500 bg-blue-100 shadow-md'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                      onClick={() => selectSuggestion(suggestion)}
                    >
                          <div className="text-sm font-medium text-gray-700">{suggestion}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {suggestion.length} characters
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Message Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Message {aiMode && <span className="text-blue-600">(AI-enhanced)</span>}
          </label>
          <textarea
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium min-h-[120px] resize-none"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={aiMode 
              ? "Type your message or use AI suggestions above... (Use {name}, {loyaltyLevel}, {totalSpent}, {points} for personalization)"
              : "Type your SMS message here..."
            }
            maxLength={320}
          />
          {aiMode && (
                <div className="text-xs text-gray-500 mt-2 font-medium">
              💡 Personalization variables: {'{name}'}, {'{loyaltyLevel}'}, {'{totalSpent}'}, {'{points}'}
            </div>
          )}
        </div>

        {/* Message Stats */}
            <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
          <div className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">
                  Recipients: <span className="text-blue-600">{filteredCustomers.length}</span>
            </span>
            {aiMode && (
                  <div className="text-xs text-blue-600 font-medium">
                🤖 AI Features: {aiSuggestions.length > 0 ? 'Suggestions available' : 'Ready to generate'}
              </div>
            )}
          </div>
              <span className="text-xs text-gray-500 font-medium">{message.length}/320</span>
        </div>

        {/* AI Status */}
        {aiMode && (
              <div className="mb-4 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                  <Sparkles className="w-4 h-4" />
              <span>AI-powered features enabled. Messages will be personalized automatically.</span>
            </div>
          </div>
        )}
          </div>

          {/* Action Buttons - Fixed Footer */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 flex-shrink-0 bg-white px-6 pb-6">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !message.trim() || filteredCustomers.length === 0}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                aiMode
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
              }`}
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  {aiMode ? 'Send AI-Enhanced SMS' : 'Send SMS'}
                </>
              )}
            </button>
          </div>
        </div>
    </div>
    </>,
    document.body
  );
};

export default BulkSMSModal; 