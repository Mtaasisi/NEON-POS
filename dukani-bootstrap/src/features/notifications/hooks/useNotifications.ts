// Basic notifications hook for bootstrap
export const useNotifications = () => {
  return {
    notifications: [],
    unreadNotifications: [],
    unreadCount: 0,
    markAsRead: () => {},
    _markAsActioned: () => {},
    markAllAsRead: () => {},
    dismissNotification: () => {}
  };
};
