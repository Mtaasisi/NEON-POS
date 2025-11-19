import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, FileText, Calculator, Plus, Search, Bell, User } from 'lucide-react';
import MobileAppInitializer from './MobileAppInitializer';
import MobileSearchModal from './MobileSearchModal';
import MobileNotificationsPanel from './MobileNotificationsPanel';
import MobileProfileSheet from './MobileProfileSheet';
import MobileBranchSelector from './MobileBranchSelector';

const MobileLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Modal states
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/mobile/dashboard' },
    { id: 'clients', label: 'Clients', icon: Users, path: '/mobile/clients' },
    { id: 'pos', label: 'POS', icon: Calculator, path: '/mobile/pos' },
    { id: 'inventory', label: 'Inventory', icon: FileText, path: '/mobile/inventory' },
    { id: 'more', label: 'More', icon: null, path: '/mobile/more' }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <MobileAppInitializer>
      <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-hidden">
        {/* iOS 17 Style Top Bar */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-5 pt-3 pb-4 shadow-sm">
          <div className="flex justify-between items-center gap-3">
        {/* Branch Selector */}
            <div className="flex-shrink-0">
          <MobileBranchSelector />
        </div>
        
        {/* Action Icons */}
            <div className="flex items-center gap-3">
            <button 
              className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
              onClick={() => setShowSearch(true)}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              aria-label="Search"
            >
              <Search size={22} className="text-gray-600" strokeWidth={2} />
          </button>
            <button 
              className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 relative transition-colors"
              onClick={() => setShowNotifications(true)}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              aria-label="Notifications"
            >
              <Bell size={22} className="text-gray-600" strokeWidth={2} />
              <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
              3
            </span>
          </button>
            <button 
              className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
              onClick={() => setShowProfile(true)}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              aria-label="Profile"
            >
              <User size={22} className="text-gray-600" strokeWidth={2} />
          </button>
            </div>
        </div>
      </div>

        {/* Main Content Area with iOS scrolling */}
        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{
            WebkitOverflowScrolling: 'touch',
          }}
        >
        <Outlet />
      </div>

        {/* iOS 17 Style Floating Action Button */}
      <button 
          className="fixed bottom-28 right-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-[20px] w-14 h-14 flex items-center justify-center shadow-2xl shadow-blue-500/40 z-50 transition-all active:scale-95 hover:shadow-blue-500/60"
          onClick={() => navigate('/mobile/inventory/add')}
          style={{ 
            WebkitTapHighlightColor: 'transparent',
          }}
      >
          <Plus size={28} strokeWidth={2.5} />
      </button>

        {/* iOS 17 Style Bottom Navigation */}
        <nav className="bg-white/95 backdrop-blur-xl border-t border-gray-200/50 px-1 pt-2 pb-6 shadow-lg safe-area-inset-bottom">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center justify-center py-1.5 px-4 min-w-[64px] transition-all duration-200 ${
                    active ? 'text-blue-600' : 'text-gray-500'
                }`}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                  {/* Icon with subtle scale animation */}
                  <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'scale-100'}`}>
                {Icon ? (
                      <Icon 
                        size={24} 
                        className="mb-1" 
                        strokeWidth={active ? 2.5 : 2}
                        fill={active ? 'currentColor' : 'none'}
                      />
                ) : (
                  <div className="mb-1 flex gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full transition-all ${active ? 'bg-blue-600' : 'bg-gray-400'}`}></span>
                        <span className={`w-1.5 h-1.5 rounded-full transition-all ${active ? 'bg-blue-600' : 'bg-gray-400'}`}></span>
                        <span className={`w-1.5 h-1.5 rounded-full transition-all ${active ? 'bg-blue-600' : 'bg-gray-400'}`}></span>
                      </div>
                    )}
                  </div>
                  <span className={`text-[11px] font-medium transition-all ${
                    active ? 'font-semibold' : 'font-normal'
                  }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals */}
      <MobileSearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
      <MobileNotificationsPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
      <MobileProfileSheet isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </div>
    </MobileAppInitializer>
  );
};

export default MobileLayout;

