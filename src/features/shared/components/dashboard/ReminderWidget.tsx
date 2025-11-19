import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { useBranch } from '../../../../context/BranchContext';
import { reminderApi } from '../../../../lib/reminderApi';
import { Reminder } from '../../../../types/reminder';
import { Bell, Clock, AlertCircle, Plus, Check, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { EnhancedReminderModal } from '../../../reminders';

interface ReminderWidgetProps {
  className?: string;
}

export const ReminderWidget: React.FC<ReminderWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (currentBranch) {
      loadUpcomingReminders();
    }
  }, [currentBranch]);

  const loadUpcomingReminders = async () => {
    try {
      setLoading(true);
      const data = await reminderApi.getReminders(currentBranch?.id);
      
      // Filter for pending reminders and sort by date/time
      const upcoming = data
        .filter(r => r.status === 'pending')
        .sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time}`);
          const dateB = new Date(`${b.date}T${b.time}`);
          return dateA.getTime() - dateB.getTime();
        })
        .slice(0, 5); // Show only top 5
      
      setReminders(upcoming);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsCompleted = async (reminderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await reminderApi.updateReminder(reminderId, { status: 'completed' });
      toast.success('Reminder completed!');
      loadUpcomingReminders();
    } catch (error) {
      console.error('Error completing reminder:', error);
      toast.error('Failed to complete reminder');
    }
  };

  const isOverdue = (reminder: Reminder) => {
    const reminderDate = new Date(`${reminder.date}T${reminder.time}`);
    return reminderDate < new Date();
  };

  const getTimeUntil = (reminder: Reminder) => {
    const now = new Date();
    const reminderDate = new Date(`${reminder.date}T${reminder.time}`);
    const diff = reminderDate.getTime() - now.getTime();
    
    if (diff < 0) {
      const overdue = Math.abs(diff);
      const hours = Math.floor(overdue / (1000 * 60 * 60));
      if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `${days}d overdue`;
      }
      return `${hours}h overdue`;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `in ${days}d`;
    }
    if (hours > 0) {
      return `in ${hours}h`;
    }
    const minutes = Math.floor(diff / (1000 * 60));
    return `in ${minutes}m`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-600';
      case 'medium':
        return 'bg-yellow-100 text-yellow-600';
      case 'low':
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const overdueCount = reminders.filter(isOverdue).length;
  const upcomingCount = reminders.filter(r => !isOverdue(r)).length;

  if (loading) {
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
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Bell className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Reminders</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {overdueCount > 0 ? `${overdueCount} overdue` : 'Stay on track'}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/reminders')}
          className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
          title="View All Reminders"
        >
          <ExternalLink size={14} />
          <span>View All</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-blue-500" />
            <span className="text-xs text-gray-500">Upcoming</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-semibold text-gray-900">
              {upcomingCount}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={14} className="text-red-500" />
            <span className="text-xs text-gray-500">Overdue</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-semibold text-gray-900">
              {overdueCount}
            </span>
          </div>
        </div>
      </div>

      {/* Reminders List */}
      <div className="space-y-2 flex-grow mb-6 max-h-64 overflow-y-auto">
        {reminders.length === 0 ? (
          <div className="text-center py-6">
            <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500 mb-3">No upcoming reminders</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mx-auto"
            >
              <Plus size={16} />
              Create reminder
            </button>
          </div>
        ) : (
          reminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`
                p-3 rounded-lg border transition-all group
                ${isOverdue(reminder) 
                  ? 'bg-red-50 border-red-200 hover:border-red-300' 
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-start justify-between gap-3">
                <div 
                  onClick={() => navigate('/reminders')}
                  className="flex-1 min-w-0 cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {isOverdue(reminder) && (
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    <h4 className="font-medium text-sm text-gray-900 truncate">
                      {reminder.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${getPriorityColor(reminder.priority)}`}>
                      {reminder.priority}
                    </span>
                    <span className={`${isOverdue(reminder) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {getTimeUntil(reminder)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => markAsCompleted(reminder.id, e)}
                  className="relative w-8 h-8 rounded-full border-2 border-emerald-500 bg-emerald-500 hover:bg-emerald-600 hover:border-emerald-600 hover:scale-110 text-white transition-all duration-200 flex items-center justify-center flex-shrink-0 shadow-sm hover:shadow-md"
                  title="Mark as completed"
                >
                  <Check className="w-4 h-4 transition-transform duration-200 hover:scale-105" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Actions - Always at bottom */}
      <div className="flex gap-2 mt-auto pt-6">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-gray-800 transition-colors"
        >
          <Plus size={14} />
          <span>Add Reminder</span>
        </button>
      </div>

      {/* Create Reminder Modal */}
      {showCreateModal && (
        <EnhancedReminderModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadUpcomingReminders(); // Refresh reminders list
            toast.success('Reminder created successfully!');
          }}
          reminder={null}
          currentUser={currentUser}
          branchId={currentBranch?.id}
        />
      )}
    </div>
  );
};

