// WhatsAppTopBar component - WhatsApp Business Action Button Bar
import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Users, Activity, FolderOpen, Calendar, UserX, 
  Upload, Smartphone, RefreshCw, MessageSquare, Settings, Zap
} from 'lucide-react';

interface WhatsAppTopBarProps {
  onNewMessage?: () => void;
  onBulkSend?: () => void;
  onCampaignManagement?: () => void;
  onTemplates?: () => void;
  onScheduled?: () => void;
  onBlacklist?: () => void;
  onMediaLibrary?: () => void;
  onSessionManagement?: () => void;
  onAutomation?: () => void;
  onRefresh?: () => void;
  onResumeCampaign?: () => void;
  refreshing?: boolean;
  hasDraft?: boolean;
  pausedCampaignState?: any;
  unreadCount?: number;
  conversationsCount?: number;
}

const WhatsAppTopBar: React.FC<WhatsAppTopBarProps> = ({
  onNewMessage,
  onBulkSend,
  onCampaignManagement,
  onTemplates,
  onScheduled,
  onBlacklist,
  onMediaLibrary,
  onSessionManagement,
  onAutomation,
  onRefresh,
  onResumeCampaign,
  refreshing = false,
  hasDraft = false,
  pausedCampaignState,
  unreadCount = 0,
  conversationsCount = 0
}) => {
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettingsDropdown(false);
      }
    };

    if (showSettingsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsDropdown]);

  return (
    <div
      className="fixed right-0 z-40 bg-gradient-to-b from-slate-50/95 via-white/90 to-white/95 backdrop-blur-3xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border-b-2 border-slate-200/60 rounded-b-3xl transition-[left] duration-500"
      style={{
        left: 'var(--sidebar-width, 0px)',
        top: 'var(--app-topbar-height, 64px)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(148, 163, 184, 0.1) inset',
        width: 'calc(100vw - var(--sidebar-width, 0px))',
        // Full resolution toolbar
        transform: 'scale(1)',
        transformOrigin: 'top left'
      }}
    >
      <div className="px-4 sm:px-6 py-4">
        {/* Stats and Actions Row */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          {/* Main Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Resume Campaign Button - Shows when there's a paused campaign */}
            {pausedCampaignState && onResumeCampaign && (
              <button
                onClick={onResumeCampaign}
                className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:from-green-600 hover:to-emerald-700"
              >
                <Activity size={18} />
                <span className="hidden sm:inline">Resume</span>
              </button>
            )}

            {/* New Message */}
            {onNewMessage && (
              <button
                onClick={onNewMessage}
                className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:from-green-600 hover:to-emerald-700"
                title="Send new message"
              >
                <Send size={18} />
                <span className="hidden sm:inline">New Message</span>
              </button>
            )}

            {/* Bulk Send */}
            {onBulkSend && (
              <button
                onClick={onBulkSend}
                className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:from-blue-600 hover:to-blue-700 relative"
                title={hasDraft ? "Send bulk messages (Draft available)" : "Send bulk messages"}
              >
                <Users size={18} />
                <span className="hidden sm:inline">Bulk Send</span>
                {hasDraft && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-300 rounded-full border-2 border-white animate-pulse" title="Draft saved"></span>
                )}
              </button>
            )}

            {/* Campaign Management */}
            {onCampaignManagement && (
              <button
                onClick={onCampaignManagement}
                className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg hover:from-indigo-600 hover:to-indigo-700"
                title="Manage campaigns"
              >
                <Activity size={18} />
                <span className="hidden sm:inline">Campaigns</span>
              </button>
            )}

            {/* Templates */}
            {onTemplates && (
              <button
                onClick={onTemplates}
                className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg hover:from-purple-600 hover:to-purple-700"
                title="Campaign templates"
              >
                <FolderOpen size={18} />
                <span className="hidden sm:inline">Templates</span>
              </button>
            )}

            {/* Scheduled Campaigns */}
            {onScheduled && (
              <button
                onClick={onScheduled}
                className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg hover:from-orange-600 hover:to-amber-700"
                title="Scheduled campaigns"
              >
                <Calendar size={18} />
                <span className="hidden sm:inline">Scheduled</span>
              </button>
            )}

            {/* Blacklist Management */}
            {onBlacklist && (
              <button
                onClick={onBlacklist}
                className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg hover:from-red-600 hover:to-red-700"
                title="Manage blacklist"
              >
                <UserX size={18} />
                <span className="hidden sm:inline">Blacklist</span>
              </button>
            )}

            {/* Media Library */}
            {onMediaLibrary && (
              <button
                onClick={onMediaLibrary}
                className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg hover:from-gray-600 hover:to-gray-700"
                title="Media library"
              >
                <Upload size={18} />
                <span className="hidden sm:inline">Media</span>
              </button>
            )}

            {/* Settings Dropdown */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg hover:from-gray-600 hover:to-gray-700"
                title="Settings"
              >
                <Settings size={18} />
                <span className="hidden sm:inline">Settings</span>
              </button>

              {/* Dropdown Menu */}
              {showSettingsDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50">
                  {/* Automation Settings */}
                  {onAutomation && (
                    <button
                      onClick={() => {
                        setShowSettingsDropdown(false);
                        onAutomation();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      title="Manage WhatsApp automation"
                    >
                      <Zap size={18} className="text-yellow-600" />
                      <span>Automation</span>
                    </button>
                  )}
                  
                  {/* Session Management */}
                  {onSessionManagement && (
                    <button
                      onClick={() => {
                        setShowSettingsDropdown(false);
                        onSessionManagement();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      title="Manage WhatsApp sessions"
                    >
                      <Smartphone size={18} className="text-indigo-600" />
                      <span>Sessions</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Refresh */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg hover:from-gray-600 hover:to-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-gray-500 disabled:hover:to-gray-600"
                title="Refresh messages"
              >
                <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}
          </div>

          {/* Stats Display */}
          {(conversationsCount > 0 || unreadCount > 0) && (
            <div className="flex items-center gap-3">
              {conversationsCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-sm">
                  <MessageSquare size={16} className="text-slate-700" />
                  <span className="text-sm font-semibold text-slate-700">{conversationsCount} conversations</span>
                </div>
              )}
              {unreadCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-sm">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-sm font-semibold text-slate-700">{unreadCount} new</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppTopBar;