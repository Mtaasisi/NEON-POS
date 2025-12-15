import React, { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  ShoppingBag,
  Heart,
  User,
  Package,
  Bell,
  ArrowLeft,
  Crown,
  Award
} from 'lucide-react';

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  showBackButton?: boolean;
  showBottomNav?: boolean;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  title,
  showBackButton = false,
  showBottomNav = true
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Home', path: '/customer-portal/dashboard' },
    { icon: ShoppingBag, label: 'Shop', path: '/customer-portal/products' },
    { icon: Package, label: 'Orders', path: '/customer-portal/orders' },
    { icon: Crown, label: 'Loyalty', path: '/customer-portal/loyalty' },
    { icon: User, label: 'Profile', path: '/customer-portal/profile' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 h-14">
        <div className="flex items-center justify-between px-4 py-3 h-full">
          {showBackButton ? (
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-700" />
            </button>
          ) : (
            <div className="w-8" />
          )}

          {title && (
            <h1 className="text-lg font-semibold text-gray-900 truncate flex-1 text-center">
              {title}
            </h1>
          )}

          <button
            onClick={() => navigate('/customer-portal/notifications')}
            className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors relative"
          >
            <Bell size={20} className="text-gray-700" />
            {/* Notification badge */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      {showBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <div className="flex items-center justify-around px-2 py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-lg transition-colors ${
                    active 
                      ? 'text-blue-600' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                  <span className={`text-xs mt-1 font-medium ${active ? 'font-semibold' : ''}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};

export default MobileLayout;

