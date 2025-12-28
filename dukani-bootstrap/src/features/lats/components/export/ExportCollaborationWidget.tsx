import React, { useState, useEffect, useMemo } from 'react';
import { Users, MessageCircle, Clock, CheckCircle, AlertCircle, Send, Eye, Edit3, UserPlus, Share2, Download, FileSpreadsheet, Calendar, Settings } from 'lucide-react';
import GlassCard from '../../../shared/components/ui/GlassCard';

interface ExportUser {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: Date;
  permissions: string[];
  exportsCreated: number;
  exportsDownloaded: number;
}

interface ExportActivity {
  id: string;
  userId: string;
  userName: string;
  action: 'create' | 'download' | 'share' | 'schedule' | 'delete';
  exportName: string;
  exportType: string;
  timestamp: Date;
  details?: string;
  target?: string;
}

interface ExportCollaborationWidgetProps {
  className?: string;
  collaborators?: ExportUser[];
  activities?: ExportActivity[];
  onInviteUser?: (email: string, role: string) => void;
  onShareExport?: (exportId: string, userIds: string[]) => void;
  onScheduleExport?: (exportConfig: any) => void;
  onSendMessage?: (message: string) => void;
}

export const ExportCollaborationWidget: React.FC<ExportCollaborationWidgetProps> = ({
  className,
  collaborators = [],
  activities = [],
  onInviteUser,
  onShareExport,
  onScheduleExport,
  onSendMessage
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  // Mock data for demonstration
  const mockCollaborators: ExportUser[] = [
    {
      id: '1',
      name: 'Data Analyst',
      role: 'Senior Data Analyst',
      status: 'online',
      permissions: ['create', 'edit', 'delete', 'share', 'schedule'],
      exportsCreated: 45,
      exportsDownloaded: 89
    },
    {
      id: '2',
      name: 'Report Manager',
      role: 'Reports Manager',
      status: 'online',
      permissions: ['create', 'edit', 'share', 'schedule'],
      exportsCreated: 32,
      exportsDownloaded: 67
    },
    {
      id: '3',
      name: 'Export Specialist',
      role: 'Data Export Specialist',
      status: 'away',
      lastSeen: new Date(Date.now() - 1800000),
      permissions: ['create', 'download', 'share'],
      exportsCreated: 28,
      exportsDownloaded: 156
    },
    {
      id: '4',
      name: 'Business User',
      role: 'Business Analyst',
      status: 'offline',
      lastSeen: new Date(Date.now() - 3600000),
      permissions: ['view', 'download'],
      exportsCreated: 5,
      exportsDownloaded: 34
    }
  ];

  const mockActivities: ExportActivity[] = [
    {
      id: '1',
      userId: '1',
      userName: 'Data Analyst',
      action: 'create',
      exportName: 'Monthly Product Report',
      exportType: 'Excel',
      timestamp: new Date(Date.now() - 7200000),
      details: 'Created automated monthly product export report'
    },
    {
      id: '2',
      userId: '2',
      userName: 'Report Manager',
      action: 'share',
      exportName: 'Sales Dashboard Data',
      exportType: 'CSV',
      timestamp: new Date(Date.now() - 10800000),
      details: 'Shared sales data with executive team',
      target: 'Executive Team'
    },
    {
      id: '3',
      userId: '3',
      userName: 'Export Specialist',
      action: 'schedule',
      exportName: 'Weekly Inventory Report',
      exportType: 'PDF',
      timestamp: new Date(Date.now() - 14400000),
      details: 'Scheduled weekly automated export'
    },
    {
      id: '4',
      userId: '1',
      userName: 'Data Analyst',
      action: 'download',
      exportName: 'Customer Analytics Data',
      exportType: 'JSON',
      timestamp: new Date(Date.now() - 21600000),
      details: 'Downloaded for advanced analytics'
    }
  ];

  const activeCollaborators = mockCollaborators.filter(c => c.status === 'online');
  const recentActivities = mockActivities.slice(0, 5);
  const totalExportsCreated = mockCollaborators.reduce((sum, user) => sum + user.exportsCreated, 0);
  const totalDownloads = mockCollaborators.reduce((sum, user) => sum + user.exportsDownloaded, 0);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      if (onSendMessage) {
        onSendMessage(newMessage.trim());
      }
      setNewMessage('');
    }
  };

  const handleInviteUser = () => {
    if (inviteEmail.trim() && onInviteUser) {
      onInviteUser(inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setInviteRole('viewer');
      setShowInviteForm(false);
    }
  };

  const handleScheduleExport = () => {
    if (onScheduleExport) {
      onScheduleExport({
        frequency: 'weekly',
        format: 'excel',
        recipients: ['team@company.com']
      });
    }
    setShowScheduleForm(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <FileSpreadsheet className="w-3 h-3 text-blue-600" />;
      case 'download':
        return <Download className="w-3 h-3 text-green-600" />;
      case 'share':
        return <Share2 className="w-3 h-3 text-purple-600" />;
      case 'schedule':
        return <Calendar className="w-3 h-3 text-orange-600" />;
      case 'delete':
        return <AlertCircle className="w-3 h-3 text-red-600" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'senior data analyst':
        return 'bg-red-100 text-red-800';
      case 'reports manager':
        return 'bg-blue-100 text-blue-800';
      case 'data export specialist':
        return 'bg-green-100 text-green-800';
      case 'business analyst':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const topContributors = mockCollaborators
    .sort((a, b) => (b.exportsCreated + b.exportsDownloaded) - (a.exportsCreated + a.exportsDownloaded))
    .slice(0, 3);

  const scheduledExports = mockActivities.filter(a => a.action === 'schedule').length;

  return (
    <GlassCard className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Export Collaboration</h3>
            <p className="text-xs text-gray-600">
              {activeCollaborators.length} online • {totalExportsCreated} exports created
            </p>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setShowScheduleForm(!showScheduleForm)}
            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
            title="Schedule Export"
          >
            <Calendar className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
            title="Invite Team Member"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Schedule Export Form */}
      {showScheduleForm && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-green-900">Schedule Automated Export</h4>
            <div className="grid grid-cols-2 gap-3">
              <select className="px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-green-400">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <select className="px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-green-400">
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleScheduleExport}
                className="flex-1 bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700 transition-colors"
              >
                Schedule Export
              </button>
              <button
                onClick={() => setShowScheduleForm(false)}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Form */}
      {showInviteForm && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Enter email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-400"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-400"
            >
              <option value="viewer">Viewer (Download only)</option>
              <option value="editor">Editor (Create & Edit)</option>
              <option value="scheduler">Scheduler (Create & Schedule)</option>
              <option value="admin">Admin (Full Access)</option>
            </select>
            <div className="flex space-x-2">
              <button
                onClick={handleInviteUser}
                className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Invite
              </button>
              <button
                onClick={() => setShowInviteForm(false)}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-green-700">{totalExportsCreated}</div>
          <div className="text-xs text-green-600">Exports Created</div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-blue-700">{totalDownloads}</div>
          <div className="text-xs text-blue-600">Downloads</div>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-purple-700">{scheduledExports}</div>
          <div className="text-xs text-purple-600">Scheduled</div>
        </div>
      </div>

      {/* Top Contributors */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Top Contributors</h4>
        <div className="space-y-2">
          {topContributors.map((user, index) => (
            <div key={user.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-lg">
              <div className="relative">
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-700">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${getStatusColor(user.status)}`}></div>
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-900">{user.name}</div>
                <div className={`text-xs px-1.5 py-0.5 rounded-full inline-block ${getRoleColor(user.role)}`}>
                  {user.role.split(' ')[0]}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-gray-900">
                  {user.exportsCreated + user.exportsDownloaded}
                </div>
                <div className="text-xs text-gray-600">contributions</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Recent Activity</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-2 text-xs">
              {getActionIcon(activity.action)}
              <div className="flex-1">
                <div className="text-gray-900">
                  <span className="font-medium">{activity.userName}</span>
                  {' '}
                  {activity.action === 'create' && 'created'}
                  {activity.action === 'download' && 'downloaded'}
                  {activity.action === 'share' && 'shared'}
                  {activity.action === 'schedule' && 'scheduled'}
                  {activity.action === 'delete' && 'deleted'}
                  {' '}
                  <span className="text-blue-600 font-medium">{activity.exportName}</span>
                  <span className="text-gray-500"> ({activity.exportType})</span>
                </div>
                <div className="text-gray-600">{formatTimeAgo(activity.timestamp)}</div>
                {activity.details && (
                  <div className="text-gray-700 mt-1 italic">"{activity.details}"</div>
                )}
                {activity.target && (
                  <div className="text-purple-600 mt-1">→ {activity.target}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Message */}
      <div className="border-t border-gray-200 pt-3">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Share export updates..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-400"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </GlassCard>
  );
};

