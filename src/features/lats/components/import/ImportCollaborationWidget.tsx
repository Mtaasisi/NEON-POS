import React, { useState, useEffect, useMemo } from 'react';
import { Users, MessageCircle, Clock, CheckCircle, AlertCircle, Send, Eye, Edit3, UserPlus, Share2, Upload, FileSpreadsheet, AlertTriangle, Check, X } from 'lucide-react';
import GlassCard from '../../../shared/components/ui/GlassCard';

interface ImportUser {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: Date;
  permissions: string[];
  importsCompleted: number;
  successRate: number;
}

interface ImportActivity {
  id: string;
  userId: string;
  userName: string;
  action: 'upload' | 'validate' | 'complete' | 'fail' | 'share';
  importName: string;
  importType: string;
  status: 'success' | 'failed' | 'pending';
  timestamp: Date;
  details?: string;
  recordsProcessed?: number;
  errorsFound?: number;
}

interface ImportCollaborationWidgetProps {
  className?: string;
  collaborators?: ImportUser[];
  activities?: ImportActivity[];
  onInviteUser?: (email: string, role: string) => void;
  onShareImport?: (importId: string, userIds: string[]) => void;
  onSendMessage?: (message: string) => void;
  onRequestHelp?: (topic: string) => void;
}

export const ImportCollaborationWidget: React.FC<ImportCollaborationWidgetProps> = ({
  className,
  collaborators = [],
  activities = [],
  onInviteUser,
  onShareImport,
  onSendMessage,
  onRequestHelp
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [showHelpForm, setShowHelpForm] = useState(false);
  const [helpTopic, setHelpTopic] = useState('');

  // Mock data for demonstration
  const mockCollaborators: ImportUser[] = [
    {
      id: '1',
      name: 'Data Specialist',
      role: 'Senior Data Specialist',
      status: 'online',
      permissions: ['upload', 'validate', 'delete', 'share', 'admin'],
      importsCompleted: 89,
      successRate: 96.2
    },
    {
      id: '2',
      name: 'Import Manager',
      role: 'Import Operations Manager',
      status: 'online',
      permissions: ['upload', 'validate', 'share', 'admin'],
      importsCompleted: 67,
      successRate: 94.8
    },
    {
      id: '3',
      name: 'Data Analyst',
      role: 'Data Analyst',
      status: 'away',
      lastSeen: new Date(Date.now() - 1800000),
      permissions: ['upload', 'validate', 'view'],
      importsCompleted: 45,
      successRate: 91.5
    },
    {
      id: '4',
      name: 'Import Assistant',
      role: 'Import Assistant',
      status: 'offline',
      lastSeen: new Date(Date.now() - 3600000),
      permissions: ['upload', 'view'],
      importsCompleted: 23,
      successRate: 87.3
    }
  ];

  const mockActivities: ImportActivity[] = [
    {
      id: '1',
      userId: '1',
      userName: 'Data Specialist',
      action: 'complete',
      importName: 'Product Catalog Update',
      importType: 'CSV',
      status: 'success',
      timestamp: new Date(Date.now() - 7200000),
      details: 'Successfully imported 1,247 product records',
      recordsProcessed: 1247,
      errorsFound: 0
    },
    {
      id: '2',
      userId: '2',
      userName: 'Import Manager',
      action: 'validate',
      importName: 'Customer Data Migration',
      importType: 'Excel',
      status: 'pending',
      timestamp: new Date(Date.now() - 10800000),
      details: 'Validation in progress - 89% complete',
      recordsProcessed: 892,
      errorsFound: 12
    },
    {
      id: '3',
      userId: '3',
      userName: 'Data Analyst',
      action: 'fail',
      importName: 'Sales Data Import',
      importType: 'CSV',
      status: 'failed',
      timestamp: new Date(Date.now() - 14400000),
      details: 'Import failed - 45 validation errors found',
      recordsProcessed: 634,
      errorsFound: 45
    },
    {
      id: '4',
      userId: '1',
      userName: 'Data Specialist',
      action: 'share',
      importName: 'Inventory Template',
      importType: 'Template',
      status: 'success',
      timestamp: new Date(Date.now() - 21600000),
      details: 'Shared import template with warehouse team'
    }
  ];

  const activeCollaborators = mockCollaborators.filter(c => c.status === 'online');
  const recentActivities = mockActivities.slice(0, 5);
  const totalImportsCompleted = mockCollaborators.reduce((sum, user) => sum + user.importsCompleted, 0);
  const averageSuccessRate = mockCollaborators.reduce((sum, user) => sum + user.successRate, 0) / mockCollaborators.length;

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

  const handleRequestHelp = () => {
    if (helpTopic.trim() && onRequestHelp) {
      onRequestHelp(helpTopic);
      setHelpTopic('');
      setShowHelpForm(false);
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
      case 'upload':
        return <Upload className="w-3 h-3 text-blue-600" />;
      case 'validate':
        return <Check className="w-3 h-3 text-yellow-600" />;
      case 'complete':
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'fail':
        return <X className="w-3 h-3 text-red-600" />;
      case 'share':
        return <Share2 className="w-3 h-3 text-purple-600" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'failed':
        return <X className="w-3 h-3 text-red-600" />;
      case 'pending':
        return <Clock className="w-3 h-3 text-yellow-600" />;
      default:
        return <Clock className="w-3 h-3 text-gray-600" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'senior data specialist':
        return 'bg-red-100 text-red-800';
      case 'import operations manager':
        return 'bg-blue-100 text-blue-800';
      case 'data analyst':
        return 'bg-green-100 text-green-800';
      case 'import assistant':
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

  const topPerformers = mockCollaborators
    .sort((a, b) => (b.importsCompleted * b.successRate) - (a.importsCompleted * a.successRate))
    .slice(0, 3);

  const failedImports = mockActivities.filter(a => a.status === 'failed').length;

  return (
    <GlassCard className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Import Collaboration</h3>
            <p className="text-xs text-gray-600">
              {activeCollaborators.length} online • {totalImportsCompleted} imports completed
            </p>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setShowHelpForm(!showHelpForm)}
            className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors"
            title="Request Help"
          >
            <AlertTriangle className="w-4 h-4" />
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

      {/* Help Request Form */}
      {showHelpForm && (
        <div className="mb-4 p-3 bg-orange-50 rounded-lg">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-orange-900">Request Import Help</h4>
            <input
              type="text"
              placeholder="What do you need help with?"
              value={helpTopic}
              onChange={(e) => setHelpTopic(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-400"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleRequestHelp}
                className="flex-1 bg-orange-600 text-white py-2 px-3 rounded text-sm hover:bg-orange-700 transition-colors"
              >
                Request Help
              </button>
              <button
                onClick={() => setShowHelpForm(false)}
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
              <option value="viewer">Viewer (View only)</option>
              <option value="uploader">Uploader (Upload & View)</option>
              <option value="validator">Validator (Upload & Validate)</option>
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
          <div className="text-lg font-bold text-green-700">{totalImportsCompleted}</div>
          <div className="text-xs text-green-600">Imports Completed</div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-blue-700">{averageSuccessRate.toFixed(1)}%</div>
          <div className="text-xs text-blue-600">Avg Success Rate</div>
        </div>
        <div className="bg-red-50 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-red-700">{failedImports}</div>
          <div className="text-xs text-red-600">Failed Imports</div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Top Performers</h4>
        <div className="space-y-2">
          {topPerformers.map((user, index) => (
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
                  {user.importsCompleted} imports
                </div>
                <div className="text-xs text-gray-600">
                  {user.successRate.toFixed(1)}% success
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Recent Import Activity</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-2 text-xs">
              {getActionIcon(activity.action)}
              <div className="flex-1">
                <div className="text-gray-900">
                  <span className="font-medium">{activity.userName}</span>
                  {' '}
                  {activity.action === 'upload' && 'uploaded'}
                  {activity.action === 'validate' && 'is validating'}
                  {activity.action === 'complete' && 'completed'}
                  {activity.action === 'fail' && 'failed to import'}
                  {activity.action === 'share' && 'shared'}
                  {' '}
                  <span className="text-blue-600 font-medium">{activity.importName}</span>
                  <span className="text-gray-500"> ({activity.importType})</span>
                </div>
                <div className="text-gray-600">{formatTimeAgo(activity.timestamp)}</div>
                {activity.details && (
                  <div className="text-gray-700 mt-1 italic">"{activity.details}"</div>
                )}
                {activity.recordsProcessed && (
                  <div className="text-gray-600 mt-1">
                    {activity.recordsProcessed.toLocaleString()} records processed
                    {activity.errorsFound ? ` • ${activity.errorsFound} errors found` : ''}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0">
                {getStatusIcon(activity.status)}
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
            placeholder="Share import updates..."
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

