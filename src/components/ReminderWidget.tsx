import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { reminderApi } from '../lib/reminderApi';
import { Reminder } from '../types/reminder';
import { Bell, Clock, AlertCircle, Plus, ChevronRight, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

/**
 * ReminderWidget - Quick access reminder widget for dashboard
 * Shows upcoming and overdue reminders with quick actions
 */
const ReminderWidget: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

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
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const overdueCount = reminders.filter(isOverdue).length;
  const upcomingCount = reminders.filter(r => !isOverdue(r)).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Reminders</h3>
          {overdueCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
              {overdueCount} overdue
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/reminders')}
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
        >
          View all
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {upcomingCount}
          </div>
          <div className="text-xs text-blue-600/70 dark:text-blue-400/70">
            Upcoming
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {overdueCount}
          </div>
          <div className="text-xs text-red-600/70 dark:text-red-400/70">
            Overdue
          </div>
        </div>
      </div>

      {/* Reminders List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            <Clock className="w-5 h-5 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading reminders...</p>
          </div>
        ) : reminders.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm mb-3">No upcoming reminders</p>
            <button
              onClick={() => navigate('/reminders')}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Create reminder
            </button>
          </div>
        ) : (
          reminders.map((reminder) => (
            <div
              key={reminder.id}
              onClick={() => navigate('/reminders')}
              className={`
                p-3 rounded-lg border cursor-pointer transition-all
                ${isOverdue(reminder) 
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-100' 
                  : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {isOverdue(reminder) && (
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {reminder.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded font-medium ${getPriorityColor(reminder.priority)}`}>
                      {reminder.priority}
                    </span>
                    <span className={`${isOverdue(reminder) ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                      {getTimeUntil(reminder)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => markAsCompleted(reminder.id, e)}
                  className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 transition-colors flex-shrink-0"
                  title="Mark as completed"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Action */}
      {reminders.length > 0 && (
        <button
          onClick={() => navigate('/reminders')}
          className="w-full mt-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Reminder
        </button>
      )}
    </div>
  );
};

export default ReminderWidget;

