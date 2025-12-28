import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, Wrench, Settings, ShoppingCart, ArrowRightLeft } from 'lucide-react';

export const InventoryQuickLinks: React.FC<{ className?: string }> = ({ className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const links = [
    { 
      path: '/lats/unified-inventory', 
      label: 'Inventory', 
      icon: Package,
      color: 'blue'
    },
    { 
      path: '/lats/spare-parts', 
      label: 'Spare Parts', 
      icon: Wrench,
      color: 'orange'
    },
    { 
      path: '/lats/stock-transfers', 
      label: 'Transfers', 
      icon: ArrowRightLeft,
      color: 'indigo'
    },
    { 
      path: '/pos', 
      label: 'POS', 
      icon: ShoppingCart,
      color: 'green'
    },
  ];

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const getColorClasses = (color: string, active: boolean) => {
    const colors: Record<string, { bg: string; hover: string; active: string }> = {
      blue: {
        bg: 'bg-blue-50 border-blue-200',
        hover: 'hover:bg-blue-100',
        active: 'bg-blue-100 border-blue-400 text-blue-700'
      },
      orange: {
        bg: 'bg-orange-50 border-orange-200',
        hover: 'hover:bg-orange-100',
        active: 'bg-orange-100 border-orange-400 text-orange-700'
      },
      purple: {
        bg: 'bg-purple-50 border-purple-200',
        hover: 'hover:bg-purple-100',
        active: 'bg-purple-100 border-purple-400 text-purple-700'
      },
      indigo: {
        bg: 'bg-indigo-50 border-indigo-200',
        hover: 'hover:bg-indigo-100',
        active: 'bg-indigo-100 border-indigo-400 text-indigo-700'
      },
      green: {
        bg: 'bg-green-50 border-green-200',
        hover: 'hover:bg-green-100',
        active: 'bg-green-100 border-green-400 text-green-700'
      }
    };

    const colorScheme = colors[color] || colors.blue;
    return active 
      ? `${colorScheme.active} ${colorScheme.hover}`
      : `${colorScheme.bg} ${colorScheme.hover}`;
  };

  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      {links.map(link => {
        const Icon = link.icon;
        const active = isActive(link.path);
        
        return (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-all duration-200 font-medium ${getColorClasses(link.color, active)}`}
            title={`Navigate to ${link.label}`}
          >
            <Icon size={16} />
            <span>{link.label}</span>
          </button>
        );
      })}
    </div>
  );
};
