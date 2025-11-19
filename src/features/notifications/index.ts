// Components
export { default as NotificationCard } from './components/NotificationCard';
export { default as NotificationFiltersComponent } from './components/NotificationFilters';

// Hooks
export { useNotifications } from './hooks/useNotifications';

// Types - Export explicitly to avoid naming conflicts
export type {
  Notification,
  NotificationGroup,
  NotificationSettings,
  NotificationStats,
  NotificationFilters,
  NotificationAction,
  NotificationTemplate,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  NotificationCategory
} from './types';

// Utils
export { notificationHelpers } from './utils/notificationHelpers';
export { NotificationService } from './utils/notificationService';
