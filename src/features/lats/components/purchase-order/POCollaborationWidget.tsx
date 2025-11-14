import React, { useState, useEffect, useMemo } from 'react';
import { Users, MessageCircle, Clock, CheckCircle, AlertCircle, Send, Eye, Edit3, UserPlus } from 'lucide-react';
import GlassCard from '../../../shared/components/ui/GlassCard';

interface CollaborationUser {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: Date;
  permissions: string[];
}

interface CollaborationActivity {
  id: string;
  userId: string;
  userName: string;
  action: 'view' | 'edit' | 'comment' | 'approve' | 'reject';
  timestamp: Date;
  details?: string;
  target?: string; // item name, section, etc.
}

interface POCollaborationWidgetProps {
  className?: string;
  poId?: string;
  currentUser?: any;
  collaborators?: CollaborationUser[];
  activities?: CollaborationActivity[];
  onInviteUser?: (email: string, role: string) => void;
  onSendMessage?: (message: string) => void;
  onRequestApproval?: () => void;
}

export const POCollaborationWidget: React.FC<POCollaborationWidgetProps> = ({
  className,
  poId,
  currentUser,
  collaborators = [],
  activities = [],
  onInviteUser,
  onSendMessage,
  onRequestApproval
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');

  // Mock data for demonstration
  const mockCollaborators: CollaborationUser[] = [
    {
      id: '1',
      name: 'John Manager',
      role: 'Manager',
      status: 'online',
      permissions: ['view', 'edit', 'approve']
    },
    {
      id: '2',
      name: 'Sarah Procurement',
      role: 'Procurement Officer',
      status: 'online',
      permissions: ['view', 'edit']
    },
    {
      id: '3',
      name: 'Mike Finance',
      role: 'Finance',
      status: 'away',
      lastSeen: new Date(Date.now() - 300000), // 5 minutes ago
      permissions: ['view', 'approve']
    }
  ];

  const mockActivities: CollaborationActivity[] = [
    {
      id: '1',
      userId: '1',
      userName: 'John Manager',
      action: 'edit',
      timestamp: new Date(Date.now() - 120000), // 2 minutes ago
      details: 'Updated supplier contact information',
      target: 'Supplier Details'
    },
    {
      id: '2',
      userId: '2',
      userName: 'Sarah Procurement',
      action: 'comment',
      timestamp: new Date(Date.now() - 300000), // 5 minutes ago
      details: 'Added note about bulk discount eligibility',
      target: 'Order Items'
    },
    {
      id: '3',
      userId: '1',
      userName: 'John Manager',
      action: 'view',
      timestamp: new Date(Date.now() - 600000), // 10 minutes ago
      details: 'Reviewed order details'
    }
  ];

  const activeCollaborators = mockCollaborators.filter(c => c.status === 'online');
  const recentActivities = mockActivities.slice(0, 5);

  const handleSendMessage = () => {
    if (newMessage.trim() && onSendMessage) {
      onSendMessage(newMessage.trim());
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
      case 'view':
        return <Eye className="w-3 h-3" />;
      case 'edit':
        return <Edit3 className="w-3 h-3" />;
      case 'comment':
        return <MessageCircle className="w-3 h-3" />;
      case 'approve':
        return <CheckCircle className="w-3 h-3" />;
      case 'reject':
        return <AlertCircle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
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

  return (
    <GlassCard className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Team Collaboration</h3>
            <p className="text-xs text-gray-600">
              {activeCollaborators.length} online • {mockCollaborators.length} total
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
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="approver">Approver</option>
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

      {/* Online Collaborators */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Online Now</h4>
        <div className="space-y-2">
          {activeCollaborators.map((user) => (
            <div key={user.id} className="flex items-center space-x-2">
              <div className="relative">
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-700">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(user.status)}`}></div>
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-900">{user.name}</div>
                <div className="text-xs text-gray-600">{user.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Recent Activity</h4>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-2 text-xs">
              <div className="mt-0.5">
                {getActionIcon(activity.action)}
              </div>
              <div className="flex-1">
                <div className="text-gray-900">
                  <span className="font-medium">{activity.userName}</span>
                  {' '}
                  {activity.action === 'view' && 'viewed'}
                  {activity.action === 'edit' && 'edited'}
                  {activity.action === 'comment' && 'commented on'}
                  {activity.action === 'approve' && 'approved'}
                  {activity.action === 'reject' && 'rejected'}
                  {' '}
                  {activity.target && <span className="text-blue-600">{activity.target}</span>}
                </div>
                <div className="text-gray-600">{formatTimeAgo(activity.timestamp)}</div>
                {activity.details && (
                  <div className="text-gray-700 mt-1 italic">"{activity.details}"</div>
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
            placeholder="Quick message..."
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

      {/* Approval Actions */}
      {onRequestApproval && (
        <div className="mt-3">
          <button
            onClick={onRequestApproval}
            className="w-full bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700 transition-colors"
          >
            Request Approval
          </button>
        </div>
      )}
    </GlassCard>
  );
};

