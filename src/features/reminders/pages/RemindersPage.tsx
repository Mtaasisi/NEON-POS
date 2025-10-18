import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useCustomers } from '../../../context/CustomersContext';
import { useDevices } from '../../../context/DevicesContext';
import { useBranch } from '../../../context/BranchContext';
import { reminderApi } from '../../../lib/reminderApi';
import { Reminder, CreateReminderInput } from '../../../types/reminder';
import { BackButton } from '../../shared/components/ui/BackButton';
import GlassCard from '../../shared/components/ui/GlassCard';
import SmartAutocomplete from '../../shared/components/ui/SmartAutocomplete';
import QuickActionButtons, { commonQuickActions } from '../../shared/components/ui/QuickActionButtons';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { useFormDraft } from '../../../hooks/useFormDraft';
import { getSmartDefaults, commonPresets, getContextualSuggestions, getFormProgress } from '../../../utils/formHelpers';
import { 
  Bell, 
  Plus, 
  Calendar, 
  Clock, 
  Check, 
  X,
  AlertCircle,
  Filter,
  Edit2,
  Trash2,
  Copy,
  Repeat,
  Link as LinkIcon,
  User,
  Smartphone,
  Search
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const RemindersPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { customers } = useCustomers();
  const { devices } = useDevices();
  const { currentBranch } = useBranch();
  
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  
  // Fetch reminders
  useEffect(() => {
    console.log('🔄 [Reminders] useEffect triggered, currentBranch:', currentBranch);
    if (currentBranch) {
      console.log('✅ [Reminders] Branch available, loading reminders...');
      loadReminders();
    } else {
      console.warn('⚠️ [Reminders] No current branch, waiting...');
    }
  }, [currentBranch]);

  const loadReminders = async () => {
    try {
      setLoading(true);
      console.log('📝 [Reminders] Loading reminders for branch:', {
        branchId: currentBranch?.id,
        branchName: currentBranch?.name,
        userId: currentUser?.id
      });
      const data = await reminderApi.getReminders(currentBranch?.id);
      console.log('✅ [Reminders] Reminders loaded successfully:', {
        count: data.length,
        reminders: data
      });
      setReminders(data);
    } catch (error) {
      console.error('❌ [Reminders] Error loading reminders:', error);
      toast.error('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'n',
      meta: true,
      action: () => {
        setSelectedReminder(null);
        setShowCreateModal(true);
      },
      description: 'Create new reminder',
    },
    {
      key: 'Escape',
      action: () => {
        if (showCreateModal) {
          setShowCreateModal(false);
        }
      },
      description: 'Close modal',
    },
  ]);

  // Filter reminders
  const filteredReminders = useMemo(() => {
    console.log('🔍 [Reminders] Filtering reminders:', {
      totalReminders: reminders.length,
      filterStatus,
      searchQuery
    });
    
    const filtered = reminders.filter(reminder => {
      // Filter by status
      let statusMatch = false;
      if (filterStatus === 'all') {
        statusMatch = true;
      } else if (filterStatus === 'pending') {
        statusMatch = reminder.status === 'pending';
      } else if (filterStatus === 'completed') {
        statusMatch = reminder.status === 'completed';
      } else if (filterStatus === 'overdue') {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().split(' ')[0].slice(0, 5);
        statusMatch = reminder.status === 'pending' && 
                      (reminder.date < today || (reminder.date === today && reminder.time < currentTime));
      }
      
      // Filter by search query - search everything!
      let searchMatch = true;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        
        // Check if we need to search linked entity details
        let linkedEntityMatch = false;
        if (reminder.relatedTo?.type === 'customer' && reminder.relatedTo?.id) {
          const customer = customers.find(c => c.id === reminder.relatedTo?.id);
          if (customer) {
            linkedEntityMatch = 
              customer.name.toLowerCase().includes(query) ||
              (customer.phone?.toLowerCase().includes(query) || false) ||
              (customer.email?.toLowerCase().includes(query) || false);
          }
        } else if (reminder.relatedTo?.type === 'device' && reminder.relatedTo?.id) {
          const device = devices.find(d => d.id === reminder.relatedTo?.id);
          if (device) {
            linkedEntityMatch = 
              (device.model?.toLowerCase().includes(query) || false) ||
              (device.brand?.toLowerCase().includes(query) || false) ||
              (device.serialNumber?.toLowerCase().includes(query) || false) ||
              (device.imei?.toLowerCase().includes(query) || false);
          }
        }
        
        searchMatch = 
          reminder.title.toLowerCase().includes(query) ||
          (reminder.description?.toLowerCase().includes(query) || false) ||
          String(reminder.date).toLowerCase().includes(query) ||
          String(reminder.time).toLowerCase().includes(query) ||
          reminder.priority.toLowerCase().includes(query) ||
          reminder.category.toLowerCase().includes(query) ||
          reminder.status.toLowerCase().includes(query) ||
          (reminder.relatedTo?.name?.toLowerCase().includes(query) || false) ||
          (reminder.relatedTo?.type?.toLowerCase().includes(query) || false) ||
          linkedEntityMatch;
      }
      
      return statusMatch && searchMatch;
    });
    
    console.log('✅ [Reminders] Filtered results:', {
      filteredCount: filtered.length,
      reminders: filtered
    });
    
    return filtered;
  }, [reminders, filterStatus, searchQuery, customers, devices]);

  // Statistics
  const stats = {
    total: reminders.length,
    pending: reminders.filter(r => r.status === 'pending').length,
    completed: reminders.filter(r => r.status === 'completed').length,
    overdue: reminders.filter(r => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0].slice(0, 5);
      return r.status === 'pending' && 
             (r.date < today || (r.date === today && r.time < currentTime));
    }).length,
  };

  const handleCompleteReminder = async (id: string) => {
    try {
      console.log('✅ [Reminders] Marking reminder as complete:', id);
      await reminderApi.completeReminder(id);
      toast.success('Reminder completed!');
      loadReminders();
    } catch (error) {
      console.error('❌ [Reminders] Failed to complete reminder:', error);
      toast.error('Failed to complete reminder');
    }
  };

  const handleDeleteReminder = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return;
    
    try {
      console.log('🗑️ [Reminders] Deleting reminder:', id);
      await reminderApi.deleteReminder(id);
      toast.success('Reminder deleted');
      loadReminders();
    } catch (error) {
      console.error('❌ [Reminders] Failed to delete reminder:', error);
      toast.error('Failed to delete reminder');
    }
  };

  const handleDuplicateReminder = (reminder: Reminder) => {
    console.log('📋 [Reminders] Duplicating reminder:', reminder);
    setSelectedReminder({
      ...reminder,
      id: '',
      status: 'pending',
      title: `${reminder.title} (Copy)`,
    } as any);
    setShowCreateModal(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-orange-100 text-orange-700';
      case 'low': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'device': return 'bg-purple-50 text-purple-700';
      case 'customer': return 'bg-blue-50 text-blue-700';
      case 'appointment': return 'bg-green-50 text-green-700';
      case 'payment': return 'bg-yellow-50 text-yellow-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3498db]"></div>
          <span className="ml-3 text-gray-600 font-medium">Loading reminders...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <BackButton to="/dashboard" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reminders</h1>
            <p className="text-gray-600 mt-1">Smart reminder system with auto-complete and templates</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedReminder(null);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus size={18} />
            New Reminder
            <span className="hidden sm:inline text-xs opacity-75 ml-2">⌘N</span>
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-lg p-5 hover:bg-blue-100 transition-colors">
          <div className="flex items-center gap-3">
            <Bell className="w-7 h-7 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-5 hover:bg-orange-100 transition-colors">
          <div className="flex items-center gap-3">
            <Clock className="w-7 h-7 text-orange-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 rounded-lg p-5 hover:bg-red-100 transition-colors">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-7 h-7 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Overdue</p>
              <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-5 hover:bg-green-100 transition-colors">
          <div className="flex items-center gap-3">
            <Check className="w-7 h-7 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          {/* Search Bar */}
          <div className="relative flex-1 w-full md:w-auto min-w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search reminders by title, customer, device, category, priority..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            <div className="flex rounded-full bg-gray-100 p-1 gap-1">
              {['all', 'pending', 'overdue', 'completed'].map((status) => {
                const getStatusStyles = () => {
                  if (filterStatus !== status) {
                    return 'text-gray-600 hover:text-gray-900';
                  }
                  switch (status) {
                    case 'all':
                      return 'bg-blue-500 text-white';
                    case 'pending':
                      return 'bg-amber-500 text-white';
                    case 'overdue':
                      return 'bg-red-500 text-white';
                    case 'completed':
                      return 'bg-green-500 text-white';
                    default:
                      return 'bg-white text-gray-900 shadow-sm';
                  }
                };
                
                return (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status as any)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${getStatusStyles()}`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Reminders List */}
      <GlassCard className="p-6">
        {filteredReminders.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reminders found</h3>
            <p className="text-gray-500 mb-6">
              {filterStatus === 'all' 
                ? 'Create your first reminder to get started' 
                : `No ${filterStatus} reminders`}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors mx-auto"
            >
              <Plus size={18} />
              Add Reminder
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReminders.map((reminder) => {
              const isOverdue = reminder.status === 'pending' && 
                (reminder.date < new Date().toISOString().split('T')[0] || 
                 (reminder.date === new Date().toISOString().split('T')[0] && 
                  reminder.time < new Date().toTimeString().split(' ')[0].slice(0, 5)));

              return (
                <div
                  key={reminder.id}
                  className={`border-2 rounded-lg p-4 hover:border-gray-300 transition-colors ${
                    reminder.status === 'completed' 
                      ? 'bg-gray-50 border-gray-200' 
                      : isOverdue
                      ? 'bg-red-50 border-red-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className={`text-lg font-semibold ${
                          reminder.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'
                        }`}>
                          {reminder.title}
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(reminder.priority)}`}>
                          {reminder.priority}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(reminder.category)}`}>
                          {reminder.category}
                        </span>
                      </div>
                      
                      {reminder.description && (
                        <p className="text-sm text-gray-600 mb-3">{reminder.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>{new Date(reminder.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span>{reminder.time}</span>
                        </div>
                        {isOverdue && reminder.status === 'pending' && (
                          <span className="text-red-600 font-medium flex items-center gap-1">
                            <AlertCircle size={14} />
                            Overdue
                          </span>
                        )}
                      </div>
                      
                      {/* Linked Entity Display */}
                      {reminder.relatedTo && (
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          {reminder.relatedTo.type === 'customer' && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
                              <User size={14} />
                              <span className="font-medium">{reminder.relatedTo.name}</span>
                              {(() => {
                                const customer = customers.find(c => c.id === reminder.relatedTo?.id);
                                return customer?.phone ? (
                                  <span className="text-blue-600">• {customer.phone}</span>
                                ) : null;
                              })()}
                            </div>
                          )}
                          {reminder.relatedTo.type === 'device' && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-700 rounded-md">
                              <Smartphone size={14} />
                              <span className="font-medium">{reminder.relatedTo.name}</span>
                            </div>
                          )}
                          {reminder.relatedTo.type === 'appointment' && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-700 rounded-md">
                              <Calendar size={14} />
                              <span className="font-medium">{reminder.relatedTo.name}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {reminder.status === 'pending' && (
                        <button
                          onClick={() => handleCompleteReminder(reminder.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                          title="Mark as complete"
                        >
                          <Check size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDuplicateReminder(reminder)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        title="Duplicate"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedReminder(reminder);
                          setShowCreateModal(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-gray-600 text-white hover:bg-gray-700 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteReminder(reminder.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* Enhanced Create/Edit Modal */}
      {showCreateModal && (
        <EnhancedReminderModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedReminder(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setSelectedReminder(null);
            loadReminders();
          }}
          reminder={selectedReminder}
          currentUser={currentUser}
          branchId={currentBranch?.id}
        />
      )}
    </div>
  );
};

// Enhanced Reminder Modal with all features
interface EnhancedReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  reminder: Reminder | null;
  currentUser: any;
  branchId?: string;
}

const EnhancedReminderModal: React.FC<EnhancedReminderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  reminder,
  currentUser,
  branchId,
}) => {
  const { customers } = useCustomers();
  const { devices } = useDevices();
  const defaults = getSmartDefaults();

  // Log when modal opens (only once per open)
  useEffect(() => {
    if (isOpen) {
      console.log('🎨 [Modal] EnhancedReminderModal opened:', {
        isOpen,
        reminder,
        userId: currentUser?.id,
        branchId
      });
    }
  }, [isOpen]);

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

  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showLinkingModal, setShowLinkingModal] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered entities based on type and search
  const filteredEntities = useMemo(() => {
    const query = linkSearchQuery.toLowerCase().trim();
    
    if (formData.relatedTo?.type === 'customer') {
      return customers
        .filter(c => 
          c.name.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.phone?.toLowerCase().includes(query)
        )
        .slice(0, 50); // Limit to 50 results
    } else if (formData.relatedTo?.type === 'device') {
      return devices
        .filter(d => 
          d.model?.toLowerCase().includes(query) ||
          d.serialNumber?.toLowerCase().includes(query) ||
          d.brand?.toLowerCase().includes(query)
        )
        .slice(0, 50);
    }
    
    return [];
  }, [formData.relatedTo?.type, linkSearchQuery, customers, devices]);

  // Draft auto-save
  const { clearDraft, hasDraft, loadDraft, getDraftAge } = useFormDraft({
    key: 'enhanced_reminder',
    data: formData,
    enabled: !reminder, // Only save drafts for new reminders
    debounceMs: 1000,
  });

  // Draft loading feature removed

  useEffect(() => {
    if (reminder) {
      setFormData({
        title: reminder.title,
        description: reminder.description || '',
        date: reminder.date,
        time: reminder.time,
        priority: reminder.priority,
        category: reminder.category,
        notifyBefore: reminder.notifyBefore || 15,
        relatedTo: reminder.relatedTo,
        recurring: reminder.recurring || {
          enabled: false,
          type: 'daily',
          interval: 1,
          endDate: undefined,
        },
      });
    } else {
      // Set smart defaults for new reminders
      const defaults = getContextualSuggestions({
        formType: 'reminder',
        currentData: {},
      });
      setFormData({
        title: '',
        description: '',
        date: defaults.date,
        time: defaults.time,
        priority: defaults.priority,
        category: 'general',
        notifyBefore: defaults.notifyBefore,
        relatedTo: undefined,
        recurring: {
          enabled: false,
          type: 'daily',
          interval: 1,
          endDate: undefined,
        },
      });
    }
  }, [reminder]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 's',
      meta: true,
      action: (e) => {
        e.preventDefault();
        handleSubmit(e as any);
      },
      description: 'Save reminder',
    },
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) {
      console.log('⏳ Already submitting, ignoring duplicate request');
      return;
    }
    
    if (!formData.title || !formData.date || !formData.time) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (reminder) {
        console.log('📝 Updating reminder:', reminder.id, formData);
        await reminderApi.updateReminder(reminder.id, formData as any);
        toast.success('Reminder updated successfully');
      } else {
        console.log('📝 Creating reminder:', {
          formData,
          userId: currentUser?.id,
          branchId
        });
        
        if (!currentUser?.id) {
          toast.error('User not authenticated');
          setIsSubmitting(false);
          return;
        }
        
        if (!branchId) {
          toast.error('No branch selected');
          setIsSubmitting(false);
          return;
        }
        
        const created = await reminderApi.createReminder(formData, currentUser.id, branchId);
        
        if (!created) {
          throw new Error('Failed to create reminder - no data returned');
        }
        
        console.log('✅ Reminder created:', created);
        toast.success('Reminder created successfully');
        clearDraft(); // Clear draft after successful save
      }
      onSuccess();
    } catch (error: any) {
      console.error('❌ Error saving reminder:', error);
      const errorMessage = error?.message || 'Failed to save reminder';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick action handlers
  const handleOneHourLater = () => {
    setFormData({ ...formData, time: defaults.oneHourLater });
  };

  const handleTomorrow = () => {
    setFormData({ ...formData, date: defaults.tomorrow });
  };

  const handleReset = () => {
    const defaults = getContextualSuggestions({
      formType: 'reminder',
      currentData: {},
    });
    setFormData({
      title: '',
      description: '',
      date: defaults.date,
      time: defaults.time,
      priority: defaults.priority,
      category: 'general',
      notifyBefore: defaults.notifyBefore,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[99999]">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 p-6 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {reminder ? 'Edit Reminder' : 'Create New Reminder'}
                </h3>
                <p className="text-xs text-gray-500">
                  Smart reminder with autocomplete and templates
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Quick Actions */}
          <QuickActionButtons
            actions={[
              commonQuickActions.nowPlusHour(handleOneHourLater),
              commonQuickActions.todayPlusWeek(handleTomorrow),
              commonQuickActions.reset(handleReset),
            ]}
            className="mb-4"
          />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title with autocomplete */}
            <SmartAutocomplete
              label="Title"
              value={formData.title}
              onChange={(value) => setFormData({ ...formData, title: value })}
              options={[
                'Follow up on device repair',
                'Call customer about pickup',
                'Check parts inventory',
                'Team meeting',
                'Send payment reminder',
              ]}
              placeholder="Enter reminder title or create your own"
              required
              fuzzyMatch
              showRecent
              recentKey="reminder_titles"
              createNew
              icon={<Bell size={16} />}
            />

            {/* Date and Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Priority Buttons - Full Width */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: 'low' })}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all flex items-center justify-center gap-2 ${
                    formData.priority === 'low'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                >
                  <span className="text-blue-600 text-xl">◉</span> Low
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: 'medium' })}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all flex items-center justify-center gap-2 ${
                    formData.priority === 'medium'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
                  }`}
                >
                  <span className="text-orange-600 text-xl">◉</span> Medium
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: 'high' })}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all flex items-center justify-center gap-2 ${
                    formData.priority === 'high'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-red-300'
                  }`}
                >
                  <span className="text-red-600 text-xl">◉</span> High
                </button>
              </div>
            </div>

            {/* Category and Notify Before in Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <SmartAutocomplete
                label="Category"
                value={formData.category}
                onChange={(value: any) => setFormData({ ...formData, category: value })}
                options={[
                  { value: 'general', label: 'General', icon: <Bell size={16} /> },
                  { value: 'device', label: 'Device', icon: <Smartphone size={16} /> },
                  { value: 'customer', label: 'Customer', icon: <User size={16} /> },
                  { value: 'appointment', label: 'Appointment', icon: <Calendar size={16} /> },
                  { value: 'payment', label: 'Payment', icon: <Clock size={16} /> },
                  { value: 'other', label: 'Other', icon: <AlertCircle size={16} /> },
                ]}
                placeholder="Select category"
              />

              {/* Notify Before */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notify Before (minutes)
                </label>
                <div className="relative">
                  <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    value={formData.notifyBefore}
                    onChange={(e) => setFormData({ ...formData, notifyBefore: parseInt(e.target.value) })}
                    placeholder="15"
                    min="0"
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description (optional)"
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900 resize-none"
              />
            </div>

            {/* Advanced Options */}
            <div className="border-t-2 border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Advanced Options</p>
              <div className="flex gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowRecurringModal(true)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${
                    formData.recurring?.enabled
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                  }`}
                >
                  <Repeat size={18} />
                  <span className="font-medium">
                    {formData.recurring?.enabled ? 'Recurring: Enabled' : 'Add Recurring'}
                  </span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowLinkingModal(true)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${
                    formData.relatedTo
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-green-400'
                  }`}
                >
                  <LinkIcon size={18} />
                  <span className="font-medium">
                    {formData.relatedTo ? `Linked to ${formData.relatedTo.type}` : 'Link Entity'}
                  </span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  {reminder ? 'Update' : 'Create'} Reminder
                  <span className="text-xs opacity-75">⌘S</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Recurring Options Modal */}
      {showRecurringModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Header - Fixed */}
            <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Repeat size={24} />
                  <h3 className="text-xl font-bold">Recurring Options</h3>
                </div>
                <button
                  onClick={() => setShowRecurringModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <input
                  type="checkbox"
                  id="enableRecurringModal"
                  checked={formData.recurring?.enabled || false}
                  onChange={(e) => setFormData({
                    ...formData,
                    recurring: {
                      ...formData.recurring!,
                      enabled: e.target.checked
                    }
                  })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="enableRecurringModal" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Enable recurring reminder
                </label>
              </div>
              
              {formData.recurring?.enabled && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recurring Type
                    </label>
                    <select
                      value={formData.recurring?.type || 'daily'}
                      onChange={(e) => setFormData({
                        ...formData,
                        recurring: {
                          ...formData.recurring!,
                          type: e.target.value as 'daily' | 'weekly' | 'monthly'
                        }
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Repeat Every {formData.recurring?.type === 'daily' ? 'days' : formData.recurring?.type === 'weekly' ? 'weeks' : 'months'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.recurring?.interval || 1}
                      onChange={(e) => setFormData({
                        ...formData,
                        recurring: {
                          ...formData.recurring!,
                          interval: parseInt(e.target.value) || 1
                        }
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={formData.recurring?.endDate || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        recurring: {
                          ...formData.recurring!,
                          endDate: e.target.value || undefined
                        }
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowRecurringModal(false)}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Link Entity Modal */}
      {showLinkingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Header - Fixed */}
            <div className="flex-shrink-0 bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <LinkIcon size={24} />
                  <h3 className="text-xl font-bold">Link Entity</h3>
                </div>
                <button
                  onClick={() => {
                    setShowLinkingModal(false);
                    setLinkSearchQuery('');
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Link Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        relatedTo: {
                          type: 'customer',
                          id: '',
                          name: ''
                        }
                      });
                      setLinkSearchQuery('');
                    }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      formData.relatedTo?.type === 'customer'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-green-300'
                    }`}
                  >
                    <User size={20} />
                    <span className="text-xs font-medium">Customer</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        relatedTo: {
                          type: 'device',
                          id: '',
                          name: ''
                        }
                      });
                      setLinkSearchQuery('');
                    }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      formData.relatedTo?.type === 'device'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-green-300'
                    }`}
                  >
                    <Smartphone size={20} />
                    <span className="text-xs font-medium">Device</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        relatedTo: {
                          type: 'appointment',
                          id: '',
                          name: ''
                        }
                      });
                      setLinkSearchQuery('');
                    }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      formData.relatedTo?.type === 'appointment'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-green-300'
                    }`}
                  >
                    <Calendar size={20} />
                    <span className="text-xs font-medium">Appointment</span>
                  </button>
                </div>
              </div>
              
              {formData.relatedTo && formData.relatedTo.type !== 'appointment' && (
                <div className="animate-in fade-in duration-200 space-y-3">
                  {!formData.relatedTo.id && (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder={`Search ${formData.relatedTo.type === 'customer' ? 'customers' : 'devices'}...`}
                          value={linkSearchQuery}
                          onChange={(e) => setLinkSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                        />
                      </div>
                      
                      {/* Results List */}
                      <div className="max-h-64 overflow-y-auto border-2 border-gray-200 rounded-lg">
                    {filteredEntities.length > 0 ? (
                      <div className="divide-y">
                        {filteredEntities.map((entity: any) => (
                          <button
                            key={entity.id}
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                relatedTo: {
                                  type: formData.relatedTo!.type,
                                  id: entity.id,
                                  name: formData.relatedTo!.type === 'customer' 
                                    ? entity.name 
                                    : `${entity.brand || ''} ${entity.model || ''}`.trim()
                                }
                              });
                            }}
                            className={`w-full text-left p-3 hover:bg-green-50 transition-colors flex items-center gap-3 ${
                              formData.relatedTo.id === entity.id ? 'bg-green-50 border-l-4 border-green-500' : ''
                            }`}
                          >
                            {formData.relatedTo.type === 'customer' ? (
                              <>
                                <User size={18} className="text-gray-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900">{entity.name}</div>
                                  <div className="text-sm text-gray-500 truncate">
                                    {entity.phone && <span>{entity.phone}</span>}
                                    {entity.email && <span className="ml-2">{entity.email}</span>}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <Smartphone size={18} className="text-gray-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900">
                                    {entity.brand && `${entity.brand} `}{entity.model}
                                  </div>
                                  <div className="text-sm text-gray-500 truncate">
                                    {entity.serialNumber && <span>SN: {entity.serialNumber}</span>}
                                  </div>
                                </div>
                              </>
                            )}
                            {formData.relatedTo.id === entity.id && (
                              <Check size={18} className="text-green-600 flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <div className="mb-2">No {formData.relatedTo.type === 'customer' ? 'customers' : 'devices'} found</div>
                        <div className="text-sm">Try a different search term</div>
                      </div>
                    )}
                      </div>
                    </>
                  )}
                  
                  {formData.relatedTo.id && (
                    <div className="space-y-2">
                      <div className="p-3 bg-green-50 border-2 border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Check size={16} className="text-green-600" />
                            <span className="text-sm font-medium text-green-700">
                              Selected: {formData.relatedTo.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                relatedTo: {
                                  type: formData.relatedTo!.type,
                                  id: '',
                                  name: ''
                                }
                              });
                              setLinkSearchQuery('');
                            }}
                            className="text-sm text-green-600 hover:text-green-700 font-medium underline"
                          >
                            Change
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {formData.relatedTo && formData.relatedTo.type === 'appointment' && (
                <div className="animate-in fade-in duration-200">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Calendar size={16} className="text-gray-600" />
                    Appointment Title
                  </label>
                  <input
                    type="text"
                    value={formData.relatedTo.name}
                    onChange={(e) => setFormData({
                      ...formData,
                      relatedTo: {
                        ...formData.relatedTo!,
                        name: e.target.value
                      }
                    })}
                    placeholder="Enter appointment title"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
              )}
              
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <div className="flex gap-3">
                {formData.relatedTo && (
                  <button
                    onClick={() => {
                      setFormData({
                        ...formData,
                        relatedTo: undefined
                      });
                      setLinkSearchQuery('');
                    }}
                    className="flex-1 px-4 py-3 border-2 border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors bg-white"
                  >
                    Remove Link
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowLinkingModal(false);
                    setLinkSearchQuery('');
                  }}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemindersPage;

