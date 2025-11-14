import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, Clock, AlertCircle, User, MessageSquare, Send, X, Edit, Eye, FileText, DollarSign, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import GlassCard from '../../../../../shared/components/ui/GlassCard';

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
  orderValueThreshold?: number;
  department?: string;
}

interface ApprovalWorkflow {
  id: string;
  orderId: string;
  steps: ApprovalStep[];
  currentStep: number;
  status: 'draft' | 'in_review' | 'approved' | 'rejected' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  orderValue: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface OrderApprovalWorkflowProps {
  className?: string;
  workflow?: ApprovalWorkflow;
  currentUser?: any;
  orderValue?: number;
  onApprove?: (stepId: string, comments?: string) => void;
  onReject?: (stepId: string, comments?: string) => void;
  onRequestChanges?: (stepId: string, comments: string) => void;
  onSubmitForApproval?: () => void;
  onEscalate?: (stepId: string, reason: string) => void;
}

export const OrderApprovalWorkflow: React.FC<OrderApprovalWorkflowProps> = ({
  className,
  workflow,
  currentUser,
  orderValue = 0,
  onApprove,
  onReject,
  onRequestChanges,
  onSubmitForApproval,
  onEscalate
}) => {
  const [showComments, setShowComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [actionStepId, setActionStepId] = useState<string | null>(null);
  const [showEscalateForm, setShowEscalateForm] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');

  // Dynamic workflow based on order value and type
  const mockWorkflow: ApprovalWorkflow = useMemo(() => {
    const steps: ApprovalStep[] = [];

    // Base approval for all orders
    steps.push({
      id: 'step-1',
      name: 'Procurement Review',
      role: 'Procurement Officer',
      status: 'approved',
      userId: 'user-1',
      userName: 'John Procurement',
      timestamp: new Date(Date.now() - 7200000),
      comments: 'Order details verified. Items match requirements.',
      required: true,
      department: 'Procurement'
    });

    // Manager approval for orders over TZS 100,000
    if (orderValue > 100000) {
      steps.push({
        id: 'step-2',
        name: 'Manager Approval',
        role: 'Department Manager',
        status: 'approved',
        userId: 'user-2',
        userName: 'Sarah Manager',
        timestamp: new Date(Date.now() - 3600000),
        comments: 'Approved. Ensure budget allocation is available.',
        required: true,
        orderValueThreshold: 100000,
        department: 'Management'
      });
    }

    // Finance approval for orders over TZS 500,000
    if (orderValue > 500000) {
      steps.push({
        id: 'step-3',
        name: 'Finance Review',
        role: 'Finance Controller',
        status: 'pending',
        required: true,
        orderValueThreshold: 500000,
        department: 'Finance'
      });
    }

    // Director approval for orders over TZS 2,000,000
    if (orderValue > 2000000) {
      steps.push({
        id: 'step-4',
        name: 'Director Approval',
        role: 'Executive Director',
        status: 'pending',
        required: true,
        orderValueThreshold: 2000000,
        department: 'Executive'
      });
    }

    // Quality assurance for high-value or critical items
    if (orderValue > 1000000) {
      steps.push({
        id: 'step-5',
        name: 'Quality Assurance',
        role: 'QA Manager',
        status: 'pending',
        required: false,
        orderValueThreshold: 1000000,
        department: 'Quality'
      });
    }

    return {
      id: 'wf-001',
      orderId: 'order-001',
      steps,
      currentStep: steps.findIndex(s => s.status === 'pending'),
      status: steps.some(s => s.status === 'rejected') ? 'rejected' :
              steps.every(s => s.status === 'approved' || s.status === 'skipped') ? 'approved' : 'in_review',
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(),
      orderValue,
      priority: orderValue > 2000000 ? 'critical' : orderValue > 500000 ? 'high' : orderValue > 100000 ? 'medium' : 'low'
    };
  }, [orderValue]);

  const currentWorkflow = workflow || mockWorkflow;
  const canTakeAction = currentUser && currentWorkflow.status === 'in_review';
  const currentPendingStep = currentWorkflow.steps.find(step => step.status === 'pending');

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

  const handleEscalate = (stepId: string) => {
    if (onEscalate && escalateReason.trim()) {
      onEscalate(stepId, escalateReason);
      setEscalateReason('');
      setShowEscalateForm(false);
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDepartmentColor = (department: string) => {
    switch (department?.toLowerCase()) {
      case 'procurement':
        return 'bg-blue-100 text-blue-800';
      case 'management':
        return 'bg-green-100 text-green-800';
      case 'finance':
        return 'bg-purple-100 text-purple-800';
      case 'executive':
        return 'bg-red-100 text-red-800';
      case 'quality':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return `TZS ${amount.toLocaleString()}`;
  };

  const completedSteps = currentWorkflow.steps.filter(step => step.status !== 'pending');
  const progressPercentage = (completedSteps.length / currentWorkflow.steps.length) * 100;

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
          <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getPriorityColor(currentWorkflow.priority)}`}>
            {currentWorkflow.priority.toUpperCase()} PRIORITY
          </span>
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

      {/* Order Value & Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Order Value: {formatCurrency(orderValue)}</span>
          <span className="text-sm text-gray-600">{progressPercentage.toFixed(0)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
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
                    <span className={`px-2 py-1 text-xs rounded-full ${getDepartmentColor(step.department)}`}>
                      {step.department}
                    </span>
                    {step.required && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                        Required
                      </span>
                    )}
                    {step.orderValueThreshold && (
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        ≥ {formatCurrency(step.orderValueThreshold)}
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
                    <div className="bg-white p-3 rounded text-sm text-gray-700 mb-3 border">
                      "{step.comments}"
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {canTakeAction && step.status === 'pending' && currentPendingStep?.id === step.id && (
                <div className="flex flex-col space-y-2">
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
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setActionStepId(step.id);
                        setShowComments('changes');
                      }}
                      className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
                    >
                      Request Changes
                    </button>
                    <button
                      onClick={() => {
                        setActionStepId(step.id);
                        setShowEscalateForm(true);
                      }}
                      className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                    >
                      Escalate
                    </button>
                  </div>
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

      {/* Escalate Modal */}
      {showEscalateForm && actionStepId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Escalate Approval</h3>

            <textarea
              placeholder="Reason for escalation..."
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              className="w-full h-24 p-3 border border-gray-200 rounded resize-none focus:outline-none focus:border-blue-400"
            />

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowEscalateForm(false);
                  setEscalateReason('');
                  setActionStepId(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleEscalate(actionStepId)}
                disabled={!escalateReason.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
              >
                Escalate
              </button>
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
};

