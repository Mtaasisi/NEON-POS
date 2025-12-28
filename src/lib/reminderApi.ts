import { supabase } from './supabaseClient';
import { Reminder, CreateReminderInput } from '../types/reminder';

// Reminders table was dropped during database consolidation
// All functions return empty results or no-ops for compatibility
export const reminderApi = {
  // Get all reminders for current branch
  async getReminders(branchId?: string): Promise<Reminder[]> {
    console.log('ℹ️ Reminders table was consolidated - returning empty list');
    return [];
  },

  // Get pending reminders
  async getPendingReminders(branchId?: string): Promise<Reminder[]> {
    console.log('ℹ️ Reminders table was consolidated - returning empty list');
    return [];
  },

  // Get reminders for today
  async getTodayReminders(branchId?: string): Promise<Reminder[]> {
    console.log('ℹ️ Reminders table was consolidated - returning empty list');
    return [];
  },

  // Create a new reminder
  async createReminder(input: CreateReminderInput, userId: string, branchId?: string): Promise<Reminder> {
    console.log('ℹ️ Reminders table was consolidated - create operation ignored');
    throw new Error('Reminders feature was consolidated and is no longer available');
  },

  // Update an existing reminder
  async updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder> {
    console.log('ℹ️ Reminders table was consolidated - update operation ignored');
    throw new Error('Reminders feature was consolidated and is no longer available');
  },

  // Complete a reminder
  async completeReminder(id: string): Promise<Reminder> {
    console.log('ℹ️ Reminders table was consolidated - complete operation ignored');
    throw new Error('Reminders feature was consolidated and is no longer available');
  },

  // Delete a reminder
  async deleteReminder(id: string): Promise<void> {
    console.log('ℹ️ Reminders table was consolidated - delete operation ignored');
    // No-op for compatibility
  },

  // Get overdue reminders
  async getOverdueReminders(branchId?: string): Promise<Reminder[]> {
    console.log('ℹ️ Reminders table was consolidated - returning empty list');
    return [];
  }
};