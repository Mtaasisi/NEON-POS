export interface Reminder {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  priority: 'low' | 'medium' | 'high';
  category: 'general' | 'device' | 'customer' | 'appointment' | 'payment' | 'other';
  status: 'pending' | 'completed' | 'cancelled';
  notifyBefore?: number; // minutes before to notify
  relatedTo?: {
    type: 'device' | 'customer' | 'appointment';
    id: string;
    name: string;
  };
  assignedTo?: string; // user ID
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  branchId?: string;
  recurring?: {
    enabled: boolean;
    type: 'daily' | 'weekly' | 'monthly';
    interval: number; // every X days/weeks/months
    endDate?: string; // when to stop recurring
  };
}

export interface CreateReminderInput {
  title: string;
  description?: string;
  date: string;
  time: string;
  priority: 'low' | 'medium' | 'high';
  category: 'general' | 'device' | 'customer' | 'appointment' | 'payment' | 'other';
  notifyBefore?: number;
  relatedTo?: {
    type: 'device' | 'customer' | 'appointment';
    id: string;
    name: string;
  };
  assignedTo?: string;
  recurring?: {
    enabled: boolean;
    type: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: string;
  };
}

