/**
 * Data transformer for notifications
 * Converts between database snake_case and TypeScript camelCase
 */

import type { Notification } from '../types';

/**
 * Transform database notification to TypeScript format
 */
export function transformNotificationFromDB(dbNotification: any): Notification {
  return {
    id: dbNotification.id,
    type: dbNotification.type,
    category: dbNotification.category,
    title: dbNotification.title,
    message: dbNotification.message,
    priority: dbNotification.priority,
    status: dbNotification.status,
    
    // Transform snake_case to camelCase
    createdAt: dbNotification.created_at,
    readAt: dbNotification.read_at,
    actionedAt: dbNotification.actioned_at,
    dismissedAt: dbNotification.dismissed_at,
    actionedBy: dbNotification.actioned_by,
    dismissedBy: dbNotification.dismissed_by,
    
    // Related data
    deviceId: dbNotification.device_id,
    customerId: dbNotification.customer_id,
    userId: dbNotification.user_id,
    appointmentId: dbNotification.appointment_id,
    diagnosticId: dbNotification.diagnostic_id,
    
    // Metadata
    metadata: dbNotification.metadata,
    icon: dbNotification.icon,
    color: dbNotification.color,
    actionUrl: dbNotification.action_url,
    actionText: dbNotification.action_text,
    
    // Grouping
    groupId: dbNotification.group_id,
    isGrouped: dbNotification.is_grouped,
    groupCount: dbNotification.group_count,
  };
}

/**
 * Transform TypeScript notification to database format
 */
export function transformNotificationToDB(notification: Partial<Notification>): any {
  return {
    id: notification.id,
    type: notification.type,
    category: notification.category,
    title: notification.title,
    message: notification.message,
    priority: notification.priority,
    status: notification.status,
    
    // Transform camelCase to snake_case
    created_at: notification.createdAt,
    read_at: notification.readAt,
    actioned_at: notification.actionedAt,
    dismissed_at: notification.dismissedAt,
    actioned_by: notification.actionedBy,
    dismissed_by: notification.dismissedBy,
    
    // Related data
    device_id: notification.deviceId,
    customer_id: notification.customerId,
    user_id: notification.userId,
    appointment_id: notification.appointmentId,
    diagnostic_id: notification.diagnosticId,
    
    // Metadata
    metadata: notification.metadata,
    icon: notification.icon,
    color: notification.color,
    action_url: notification.actionUrl,
    action_text: notification.actionText,
    
    // Grouping
    group_id: notification.groupId,
    is_grouped: notification.isGrouped,
    group_count: notification.groupCount,
  };
}

/**
 * Transform array of database notifications
 */
export function transformNotificationsFromDB(dbNotifications: any[]): Notification[] {
  return dbNotifications.map(transformNotificationFromDB);
}

