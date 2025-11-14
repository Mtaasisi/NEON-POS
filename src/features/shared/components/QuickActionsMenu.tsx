import React from 'react';
import { Package, MessageSquare } from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  hoverColor: string;
  quantity?: number;
  onClick?: () => void;
}

interface QuickActionsMenuProps {
  onActionSelect?: (actionId: string) => void;
  className?: string;
}

const QuickActionsMenu: React.FC<QuickActionsMenuProps> = ({ onActionSelect, className = '' }) => {
  const quickActions: QuickAction[] = [
    {
      id: 'add-product',
      title: 'Add Product',
      description: 'Add new inventory item',
      icon: <Package className="w-5 h-5" />,
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-50',
      quantity: 1,
    },
    {
      id: 'sms-center',
      title: 'SMS Centre',
      description: 'Send messages to customers',
      icon: <MessageSquare className="w-5 h-5" />,
      color: 'bg-indigo-500',
      hoverColor: 'hover:bg-indigo-50',
      quantity: 0,
    },
  ];

  const handleActionClick = (actionId: string) => {
    onActionSelect?.(actionId);
  };

  return (
    <div className={`absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden ${className}`}>
      <div className="p-2 space-y-1">
        <div className="px-3 py-2 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-900">Quick Actions</h3>
          <p className="text-xs text-gray-500">Commonly used actions</p>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {quickActions.map((action) => (
            <div key={action.id} className="px-2 py-1">
              <button
                onClick={() => handleActionClick(action.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${action.hoverColor} group hover:shadow-sm`}
              >
                <div className={`p-2 rounded-lg ${action.color} text-white shadow-sm group-hover:shadow-md transition-all duration-200`}>
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 text-sm truncate">{action.title}</p>
                    {action.quantity !== undefined && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {action.quantity} {action.quantity === 1 ? 'item' : 'items'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{action.description}</p>
                </div>
              </button>
            </div>
          ))}
        </div>
        
        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            {quickActions.reduce((sum, action) => sum + (action.quantity || 0), 0)} items total
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuickActionsMenu;
