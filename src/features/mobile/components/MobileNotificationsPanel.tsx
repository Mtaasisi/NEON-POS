import React, { useState, useEffect } from 'react';
import { X, Bell, Package, AlertCircle, TrendingDown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { useBranch } from '../../../context/BranchContext';

interface Notification {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'sale' | 'alert';
  title: string;
  message: string;
  time: string;
  read: boolean;
  actionPath?: string;
}

interface MobileNotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileNotificationsPanel: React.FC<MobileNotificationsPanelProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { currentBranch } = useBranch();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, currentBranch]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      // Fetch low stock products
      let productsQuery = supabase
        .from('lats_products')
        .select('id, name, stock_quantity, min_stock_level')
        .eq('is_active', true);

      if (currentBranch) {
        productsQuery = productsQuery.eq('branch_id', currentBranch.id);
      }

      const { data: products } = await productsQuery;

      const notifs: Notification[] = [];

      if (products) {
        // Out of stock
        products.forEach(p => {
          if (p.stock_quantity === 0) {
            notifs.push({
              id: `out-${p.id}`,
              type: 'out_of_stock',
              title: 'Out of Stock',
              message: `${p.name} is out of stock`,
              time: 'Now',
              read: false,
              actionPath: `/mobile/inventory/${p.id}`
            });
          } else if (p.stock_quantity <= (p.min_stock_level || 5)) {
            notifs.push({
              id: `low-${p.id}`,
              type: 'low_stock',
              title: 'Low Stock Alert',
              message: `${p.name} is running low (${p.stock_quantity} left)`,
              time: 'Now',
              read: false,
              actionPath: `/mobile/inventory/${p.id}`
            });
          }
        });
      }

      setNotifications(notifs);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.actionPath) {
      navigate(notification.actionPath);
      onClose();
    }
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'low_stock': return TrendingDown;
      case 'out_of_stock': return AlertCircle;
      case 'sale': return Package;
      default: return Bell;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'low_stock': return 'bg-warning-50 text-warning-600';
      case 'out_of_stock': return 'bg-danger-50 text-danger-600';
      case 'sale': return 'bg-success-50 text-success-600';
      default: return 'bg-primary-50 text-primary-600';
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={onClose}>
      <div 
        className="bg-white w-full h-[90vh] rounded-t-3xl flex flex-col animate-slide-up shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle Bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-neutral-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="bg-white border-b border-neutral-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] font-semibold text-neutral-900">Notifications</h2>
            <button
              onClick={onClose}
              className="text-primary-500 text-[17px] active:text-primary-600 transition-colors"
            >
              Done
            </button>
          </div>
          {unreadCount > 0 && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-[14px] text-neutral-500">{unreadCount} unread</span>
              <button
                onClick={markAllAsRead}
                className="text-[14px] text-primary-500 font-medium active:text-primary-700"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto pb-safe-bottom">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          )}

          {!isLoading && notifications.length === 0 && (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bell size={32} className="text-neutral-400" strokeWidth={1.5} />
              </div>
              <p className="text-neutral-500 text-[16px] font-medium">No notifications</p>
              <p className="text-neutral-400 text-[14px] mt-1">You're all caught up!</p>
            </div>
          )}

          {!isLoading && notifications.length > 0 && (
            <div className="py-2">
              {notifications.map((notification, index) => {
                const Icon = getIcon(notification.type);
                const iconColor = getIconColor(notification.type);
                const isLast = index === notifications.length - 1;
                
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-neutral-50 active:bg-neutral-100 transition-colors ${
                      !isLast ? 'border-b border-neutral-100' : ''
                    } ${
                      !notification.read ? 'bg-primary-50/30' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                      <Icon size={20} strokeWidth={2} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[15px] font-semibold text-neutral-900">{notification.title}</span>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                      <p className="text-[14px] text-neutral-600 mb-1">{notification.message}</p>
                      <span className="text-[12px] text-neutral-400">{notification.time}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileNotificationsPanel;
