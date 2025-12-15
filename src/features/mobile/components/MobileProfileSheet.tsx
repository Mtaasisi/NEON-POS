import React from 'react';
import { X, User, LogOut, Settings, HelpCircle, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useBranch } from '../../../context/BranchContext';
import toast from 'react-hot-toast';

interface MobileProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileProfileSheet: React.FC<MobileProfileSheetProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { currentBranch } = useBranch();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
      onClose();
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  if (!isOpen) return null;

  const menuItems = [
    {
      icon: Settings,
      label: 'Settings',
      onClick: () => {
        navigate('/mobile/more');
        onClose();
      }
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      onClick: () => {
        toast('Help & Support coming soon!');
        onClose();
      }
    },
    {
      icon: LogOut,
      label: 'Logout',
      onClick: handleLogout,
      destructive: true
    }
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/40 z-50 flex items-end"
      onClick={onClose}
    >
      <div 
        className="w-full bg-white rounded-t-3xl max-h-[70vh] flex flex-col animate-slide-up safe-area-inset-bottom shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle Bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-neutral-300 rounded-full" />
        </div>

        {/* Profile Info */}
        <div className="px-4 py-6 border-b border-neutral-200">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center shadow-lg">
              <User size={32} className="text-white" strokeWidth={2} />
            </div>
            <div className="flex-1">
              <h2 className="text-[20px] font-semibold text-neutral-900">
                {currentUser?.email?.split('@')[0] || 'User'}
              </h2>
              <p className="text-[14px] text-neutral-500 mt-0.5">
                {currentUser?.email || 'user@example.com'}
              </p>
              {currentUser?.role && (
                <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 bg-primary-50 rounded-full">
                  <Shield size={12} className="text-primary-600" />
                  <span className="text-[12px] font-medium text-primary-600 capitalize">
                    {currentUser.role}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Current Branch */}
          {currentBranch && (
            <div className="mt-4 p-3 bg-neutral-50 rounded-xl">
              <p className="text-[12px] text-neutral-500 mb-1">Current Branch</p>
              <p className="text-[15px] font-semibold text-neutral-900">{currentBranch.name}</p>
              {currentBranch.city && (
                <p className="text-[13px] text-neutral-500">{currentBranch.city}</p>
              )}
            </div>
          )}
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={item.onClick}
                className={`w-full px-4 py-3.5 flex items-center gap-3 hover:bg-neutral-50 active:bg-neutral-100 transition-colors ${
                  item.destructive ? 'text-danger-500' : 'text-neutral-900'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  item.destructive ? 'bg-danger-50' : 'bg-neutral-100'
                }`}>
                  <Icon size={20} strokeWidth={2.5} />
                </div>
                <span className="text-[16px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Close Button */}
        <div className="p-4 border-t border-neutral-200">
          <button
            onClick={onClose}
            className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 rounded-xl text-[16px] font-semibold text-neutral-900 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileProfileSheet;
