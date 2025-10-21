import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { useCustomers } from '../context/CustomersContext';
import Modal from '../features/shared/components/ui/Modal';
import GlassButton from '../features/shared/components/ui/GlassButton';
import GlassInput from '../features/shared/components/ui/GlassInput';
import GlassSelect from '../features/shared/components/ui/GlassSelect';
import { 
  Bell, 
  Clock, 
  Calendar, 
  AlertCircle, 
  Zap,
  CheckCircle,
  User,
  Search,
  X,
  Link as LinkIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { reminderApi } from '../lib/reminderApi';
import { CreateReminderInput } from '../types/reminder';

interface QuickReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuickReminderModal: React.FC<QuickReminderModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const { customers } = useCustomers();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Filtered customers based on search
  const filteredCustomers = useMemo(() => {
    const query = customerSearchQuery.toLowerCase().trim();
    
    return customers
      .filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone?.toLowerCase().includes(query)
      )
      .slice(0, 20); // Limit to 20 results for performance
  }, [customerSearchQuery, customers]);

  // Form state with smart defaults
  const [formData, setFormData] = useState<CreateReminderInput>({
    title: '',
    description: '',
    date: '',
    time: '',
    priority: 'medium',
    category: 'general',
    notifyBefore: 15,
    relatedTo: undefined,
    recurring: {
      enabled: false,
      type: 'daily',
      interval: 1,
      endDate: undefined,
    },
  });

  // Set smart defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Set default time to 1 hour from now
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      
      setFormData({
        title: '',
        description: '',
        date: tomorrow.toISOString().split('T')[0],
        time: oneHourLater.toTimeString().slice(0, 5),
        priority: 'medium',
        category: 'general',
        notifyBefore: 15,
        relatedTo: undefined,
        recurring: {
          enabled: false,
          type: 'daily',
          interval: 1,
          endDate: undefined,
        },
      });
    }
  }, [isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      // Validate
      if (!formData.title || !formData.date || !formData.time) {
        toast.error('Please fill in title, date, and time');
        return;
      }

      if (!currentBranch) {
        toast.error('No branch selected');
        return;
      }

      setIsSubmitting(true);

      // Create reminder
      await reminderApi.createReminder({
        ...formData,
        assignedTo: currentUser?.id,
        createdBy: currentUser?.id,
        branchId: currentBranch.id,
      });

      toast.success('Reminder created successfully!', {
        duration: 3000
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        date: '',
        time: '',
        priority: 'medium',
        category: 'general',
        notifyBefore: 15,
        relatedTo: undefined,
        recurring: {
          enabled: false,
          type: 'daily',
          interval: 1,
          endDate: undefined,
        },
      });

      // Call success callback
      if (onSuccess) onSuccess();

      // Close modal
      onClose();
    } catch (error: any) {
      console.error('Error creating reminder:', error);
      toast.error(error.message || 'Failed to create reminder');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  const priorityOptions = [
    { value: 'low', label: 'Low Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'high', label: 'High Priority' }
  ];

  const categoryOptions = [
    { value: 'general', label: 'General' },
    { value: 'device', label: 'Device' },
    { value: 'customer', label: 'Customer' },
    { value: 'appointment', label: 'Appointment' },
    { value: 'payment', label: 'Payment' },
    { value: 'other', label: 'Other' }
  ];

  const notifyOptions = [
    { value: 5, label: '5 minutes before' },
    { value: 15, label: '15 minutes before' },
    { value: 30, label: '30 minutes before' },
    { value: 60, label: '1 hour before' },
    { value: 120, label: '2 hours before' },
    { value: 240, label: '4 hours before' },
    { value: 1440, label: '1 day before' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Quick Reminder</h3>
            <p className="text-xs text-gray-500">Fast reminder creation (Ctrl+Enter to save)</p>
          </div>
        </div>
      }
    >
      <div className="space-y-4" onKeyDown={handleKeyDown}>
        {/* Title - Most important field */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
            <Bell className="w-4 h-4" />
            Reminder Title *
          </label>
          <GlassInput
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="What do you need to remember?"
            autoFocus
            className="text-base"
          />
        </div>

        {/* Date and Time - Side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4" />
              Date *
            </label>
            <GlassInput
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Clock className="w-4 h-4" />
              Time *
            </label>
            <GlassInput
              type="time"
              value={formData.time}
              onChange={(e) => handleInputChange('time', e.target.value)}
              className="text-sm"
            />
          </div>
        </div>

        {/* Priority and Category - Side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <GlassSelect
              label="Priority"
              value={formData.priority}
              onChange={(value) => handleInputChange('priority', value)}
              options={priorityOptions}
              className="text-sm"
            />
          </div>
          <div>
            <GlassSelect
              label="Category"
              value={formData.category}
              onChange={(value) => handleInputChange('category', value)}
              options={categoryOptions}
              className="text-sm"
            />
          </div>
        </div>

        {/* Description - Optional but useful */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
            <AlertCircle className="w-4 h-4" />
            Description (optional)
          </label>
          <GlassInput
            type="text"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Additional details..."
            className="text-sm"
          />
        </div>

        {/* Notification timing */}
        <div>
          <GlassSelect
            label="Notify me"
            value={formData.notifyBefore}
            onChange={(value) => handleInputChange('notifyBefore', parseInt(value))}
            options={notifyOptions}
            className="text-sm"
          />
        </div>

        {/* Customer Linking */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <LinkIcon className="w-4 h-4" />
            Link to Customer (optional)
          </label>
          
          {formData.relatedTo ? (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <User className="w-4 h-4 text-blue-600" />
              <div className="flex-1">
                <div className="font-medium text-blue-900">{formData.relatedTo.name}</div>
                <div className="text-sm text-blue-600">
                  {(() => {
                    const customer = customers.find(c => c.id === formData.relatedTo?.id);
                    return customer?.phone ? customer.phone : '';
                  })()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, relatedTo: undefined }));
                  setCustomerSearchQuery('');
                }}
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                className="w-full flex items-center gap-2 p-3 border border-gray-300 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Link to a customer</span>
                <Search className="w-4 h-4 text-gray-400 ml-auto" />
              </button>
              
              {showCustomerSearch && (
                <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
                  <div className="p-3 border-b border-gray-200">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={customerSearchQuery}
                        onChange={(e) => setCustomerSearchQuery(e.target.value)}
                        placeholder="Search customers by name, phone, or email..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        autoFocus
                      />
                    </div>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto">
                    {filteredCustomers.length > 0 ? (
                      <div className="space-y-1 p-2">
                        {filteredCustomers.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                relatedTo: {
                                  type: 'customer',
                                  id: customer.id,
                                  name: customer.name
                                }
                              }));
                              setShowCustomerSearch(false);
                              setCustomerSearchQuery('');
                            }}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 transition-colors text-left"
                          >
                            <User className="w-4 h-4 text-gray-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">{customer.name}</div>
                              <div className="text-sm text-gray-500 truncate">
                                {customer.phone && <span>{customer.phone}</span>}
                                {customer.email && <span className="ml-2">{customer.email}</span>}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        {customerSearchQuery ? 'No customers found' : 'Start typing to search customers...'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <GlassButton
            variant="secondary"
            onClick={onClose}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </GlassButton>
          <GlassButton
            onClick={handleSubmit}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            disabled={isSubmitting || !formData.title || !formData.date || !formData.time}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Create Reminder
              </>
            )}
          </GlassButton>
        </div>

        {/* Keyboard shortcut hint */}
        <div className="text-center text-xs text-gray-500 pt-2 border-t flex items-center justify-center gap-2">
          <Zap className="w-3 h-3" />
          <span>Tip: Press <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl</kbd> + <kbd className="px-2 py-1 bg-gray-100 rounded">Enter</kbd> to save quickly</span>
        </div>
      </div>
    </Modal>
  );
};

export default QuickReminderModal;
