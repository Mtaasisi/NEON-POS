import React, { useState, useEffect, useMemo } from 'react';
import { Users, MessageCircle, Clock, CheckCircle, AlertCircle, Send, Eye, Edit3, UserPlus, Share2, Download, FileText } from 'lucide-react';
import GlassCard from '../../../shared/components/ui/GlassCard';

interface TemplateUser {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: Date;
  permissions: string[];
  templatesCreated: number;
  templatesDownloaded: number;
}

interface TemplateActivity {
  id: string;
  userId: string;
  userName: string;
  action: 'create' | 'download' | 'share' | 'update' | 'delete';
  templateName: string;
  timestamp: Date;
  details?: string;
  target?: string;
}

interface TemplateCollaborationWidgetProps {
  className?: string;
  collaborators?: TemplateUser[];
  activities?: TemplateActivity[];
  onInviteUser?: (email: string, role: string) => void;
  onShareTemplate?: (templateName: string, userIds: string[]) => void;
  onSendMessage?: (message: string) => void;
}

export const TemplateCollaborationWidget: React.FC<TemplateCollaborationWidgetProps> = ({
  className,
  collaborators = [],
  activities = [],
  onInviteUser,
  onShareTemplate,
  onSendMessage
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Mock data for demonstration
  const mockCollaborators: TemplateUser[] = [
    {
      id: '1',
      name: 'Sarah Admin',
      role: 'System Administrator',
      status: 'online',
      permissions: ['create', 'edit', 'delete', 'share'],
      templatesCreated: 12,
      templatesDownloaded: 45
    },
    {
      id: '2',
      name: 'Mike Manager',
      role: 'Operations Manager',
      status: 'online',
      permissions: ['create', 'edit', 'share'],
      templatesCreated: 8,
      templatesDownloaded: 23
    },
    {
      id: '3',
      name: 'Lisa Analyst',
      role: 'Data Analyst',
      status: 'away',
      lastSeen: new Date(Date.now() - 1800000),
      permissions: ['view', 'download'],
      templatesCreated: 3,
      templatesDownloaded: 67
    },
    {
      id: '4',
      name: 'John User',
      role: 'Standard User',
      status: 'offline',
      lastSeen: new Date(Date.now() - 3600000),
      permissions: ['view', 'download'],
      templatesCreated: 0,
      templatesDownloaded: 12
    }
  ];

  const mockActivities: TemplateActivity[] = [
    {
      id: '1',
      userId: '1',
      userName: 'Sarah Admin',
      action: 'create',
      templateName: 'Advanced Product Import Template',
      timestamp: new Date(Date.now() - 7200000),
      details: 'Created new template with enhanced validation rules'
    },
    {
      id: '2',
      userId: '2',
      userName: 'Mike Manager',
      action: 'share',
      templateName: 'Product Import Template',
      timestamp: new Date(Date.now() - 10800000),
      details: 'Shared template with warehouse team',
      target: 'Warehouse Team'
    },
    {
      id: '3',
      userId: '3',
      userName: 'Lisa Analyst',
      action: 'download',
      templateName: 'Sales Data Template',
      timestamp: new Date(Date.now() - 14400000),
      details: 'Downloaded for monthly reporting'
    },
    {
      id: '4',
      userId: '1',
      userName: 'Sarah Admin',
      action: 'update',
      templateName: 'Product Import Template',
      timestamp: new Date(Date.now() - 21600000),
      details: 'Updated validation rules and added new fields'
    }
  ];

  const activeCollaborators = mockCollaborators.filter(c => c.status === 'online');
  const recentActivities = mockActivities.slice(0, 5);
  const totalTemplatesCreated = mockCollaborators.reduce((sum, user) => sum + user.templatesCreated, 0);
  const totalDownloads = mockCollaborators.reduce((sum, user) => sum + user.templatesDownloaded, 0);

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
        return <FileText className="w-3 h-3 text-blue-600" />;
      case 'download':
        return <Download className="w-3 h-3 text-green-600" />;
      case 'share':
        return <Share2 className="w-3 h-3 text-purple-600" />;
      case 'update':
        return <Edit3 className="w-3 h-3 text-orange-600" />;
      case 'delete':
        return <AlertCircle className="w-3 h-3 text-red-600" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'system administrator':
        return 'bg-red-100 text-red-800';
      case 'operations manager':
        return 'bg-blue-100 text-blue-800';
      case 'data analyst':
        return 'bg-green-100 text-green-800';
      case 'standard user':
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
    .sort((a, b) => (b.templatesCreated + b.templatesDownloaded) - (a.templatesCreated + a.templatesDownloaded))
    .slice(0, 3);

  return (
    <GlassCard className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Template Collaboration</h3>
            <p className="text-xs text-gray-600">
              {activeCollaborators.length} online • {totalTemplatesCreated} templates created
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
          title="Invite Team Member"
        >
          <UserPlus className="w-4 h-4" />
        </button>
      </div>

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
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-green-700">{totalTemplatesCreated}</div>
          <div className="text-xs text-green-600">Templates Created</div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-blue-700">{totalDownloads}</div>
          <div className="text-xs text-blue-600">Total Downloads</div>
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
                  {user.templatesCreated + user.templatesDownloaded}
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
                  {activity.action === 'update' && 'updated'}
                  {activity.action === 'delete' && 'deleted'}
                  {' '}
                  <span className="text-blue-600 font-medium">{activity.templateName}</span>
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
            placeholder="Share template updates..."
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

