import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, Clock, AlertCircle, User, MessageSquare, Send, X, Edit, Eye, FileText, DollarSign } from 'lucide-react';
import GlassCard from '../../../shared/components/ui/GlassCard';

interface ApprovalStep {
  id: string;
  name: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  userId?: string;
  userName?: string;
  timestamp?: Date;
  comments?: string;
  required: boolean;
}

interface ApprovalWorkflow {
  id: string;
  poId: string;
  steps: ApprovalStep[];
  currentStep: number;
  status: 'draft' | 'in_review' | 'approved' | 'rejected' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

interface POApprovalWorkflowProps {
  className?: string;
  workflow?: ApprovalWorkflow;
  currentUser?: any;
  onApprove?: (stepId: string, comments?: string) => void;
  onReject?: (stepId: string, comments?: string) => void;
  onRequestChanges?: (stepId: string, comments: string) => void;
  onSubmitForApproval?: () => void;
}

export const POApprovalWorkflow: React.FC<POApprovalWorkflowProps> = ({
  className,
  workflow,
  currentUser,
  onApprove,
  onReject,
  onRequestChanges,
  onSubmitForApproval
}) => {
  const [showComments, setShowComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [actionStepId, setActionStepId] = useState<string | null>(null);

  // Mock workflow data
  const mockWorkflow: ApprovalWorkflow = {
    id: 'wf-001',
    poId: 'po-001',
    status: 'in_review',
    currentStep: 1,
    createdAt: new Date(Date.now() - 86400000), // 1 day ago
    updatedAt: new Date(),
    steps: [
      {
        id: 'step-1',
        name: 'Procurement Review',
        role: 'Procurement Officer',
        status: 'approved',
        userId: 'user-1',
        userName: 'Sarah Procurement',
        timestamp: new Date(Date.now() - 7200000), // 2 hours ago
        comments: 'Items verified. Bulk discount negotiated.',
        required: true
      },
      {
        id: 'step-2',
        name: 'Manager Approval',
        role: 'Manager',
        status: 'approved',
        userId: 'user-2',
        userName: 'John Manager',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        comments: 'Approved. Ensure timely delivery.',
        required: true
      },
      {
        id: 'step-3',
        name: 'Finance Review',
        role: 'Finance',
        status: 'pending',
        required: true
      },
      {
        id: 'step-4',
        name: 'Final Approval',
        role: 'Director',
        status: 'pending',
        required: false
      }
    ]
  };

  const currentWorkflow = workflow || mockWorkflow;
  const canTakeAction = currentUser && currentWorkflow.status === 'in_review';

  const handleApprove = (stepId: string) => {
    if (onApprove) {
      onApprove(stepId, commentText || undefined);
      setCommentText('');
      setShowComments(null);
      setActionStepId(null);
    }
  };

  const handleReject = (stepId: string) => {
    if (onReject) {
      onReject(stepId, commentText || undefined);
      setCommentText('');
      setShowComments(null);
      setActionStepId(null);
    }
  };

  const handleRequestChanges = (stepId: string) => {
    if (onRequestChanges && commentText.trim()) {
      onRequestChanges(stepId, commentText);
      setCommentText('');
      setShowComments(null);
      setActionStepId(null);
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <X className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-400" />;
      case 'skipped':
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'border-green-500 bg-green-50';
      case 'rejected':
        return 'border-red-500 bg-red-50';
      case 'pending':
        return 'border-gray-300 bg-white';
      case 'skipped':
        return 'border-gray-300 bg-gray-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      skipped: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[status as keyof typeof colors] || colors.pending}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const pendingSteps = currentWorkflow.steps.filter(step => step.status === 'pending');
  const completedSteps = currentWorkflow.steps.filter(step => step.status !== 'pending');

  return (
    <GlassCard className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Approval Workflow</h3>
            <p className="text-sm text-gray-600">
              {completedSteps.length} of {currentWorkflow.steps.length} steps completed
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {getStatusBadge(currentWorkflow.status)}
          {onSubmitForApproval && currentWorkflow.status === 'draft' && (
            <button
              onClick={onSubmitForApproval}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Submit for Approval
            </button>
          )}
        </div>
      </div>

      {/* Workflow Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-600">
            {Math.round((completedSteps.length / currentWorkflow.steps.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(completedSteps.length / currentWorkflow.steps.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Approval Steps */}
      <div className="space-y-4">
        {currentWorkflow.steps.map((step, index) => (
          <div
            key={step.id}
            className={`p-4 rounded-lg border-l-4 ${getStepColor(step.status)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className="mt-1">
                  {getStepIcon(step.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-900">{step.name}</h4>
                    {getStatusBadge(step.status)}
                    {step.required && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{step.role}</p>

                  {step.userName && step.timestamp && (
                    <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                      <User className="w-3 h-3" />
                      <span>{step.userName}</span>
                      <span>•</span>
                      <span>{formatDate(step.timestamp)}</span>
                    </div>
                  )}

                  {step.comments && (
                    <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 mb-3">
                      "{step.comments}"
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {canTakeAction && step.status === 'pending' && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setActionStepId(step.id);
                      setShowComments('approve');
                    }}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setActionStepId(step.id);
                      setShowComments('reject');
                    }}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      setActionStepId(step.id);
                      setShowComments('changes');
                    }}
                    className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
                  >
                    Request Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Comments Modal */}
      {showComments && actionStepId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              {showComments === 'approve' && 'Approve Step'}
              {showComments === 'reject' && 'Reject Step'}
              {showComments === 'changes' && 'Request Changes'}
            </h3>

            <textarea
              placeholder="Add comments (optional)..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full h-24 p-3 border border-gray-200 rounded resize-none focus:outline-none focus:border-blue-400"
            />

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowComments(null);
                  setCommentText('');
                  setActionStepId(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showComments === 'approve') handleApprove(actionStepId);
                  if (showComments === 'reject') handleReject(actionStepId);
                  if (showComments === 'changes') handleRequestChanges(actionStepId);
                }}
                className={`px-4 py-2 text-white rounded transition-colors ${
                  showComments === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  showComments === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                {showComments === 'approve' && 'Approve'}
                {showComments === 'reject' && 'Reject'}
                {showComments === 'changes' && 'Request Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
};

