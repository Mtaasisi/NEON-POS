import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Calendar, User, Eye, CheckCircle, Clock, AlertCircle, Search, Filter, Download, Plus } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { getCurrentBranchId } from '../../../lib/branchAwareApi';
import { toast } from 'react-hot-toast';
import DailyReportModal from '../../shared/components/DailyReportModal';
import TestUserManager from '../components/TestUserManager';

interface Report {
  id: string;
  user_id: string;
  branch_id: string;
  report_type: 'daily' | 'monthly';
  report_date: string;
  report_month?: string;
  title: string;
  customer_interactions: string;
  pending_work: string;
  recommendations: string;
  additional_notes: string;
  customers_served: number;
  sales_made: number;
  issues_resolved: number;
  pending_tasks: number;
  status: 'draft' | 'submitted' | 'reviewed' | 'approved';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  review_notes?: string;
  created_at: string;
  updated_at: string;
  user?: {
    name: string;
    role: string;
  };
}

const ReportsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'reports' | 'test-users'>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const currentBranchId = getCurrentBranchId();

      let query = supabase
        .from('daily_reports')
        .select('*, user_id')
        .order('created_at', { ascending: false });

      // Apply branch filter if not admin with all permissions
      if (!currentUser?.permissions?.includes('all') && currentUser?.role !== 'admin') {
        query = query.eq('branch_id', currentBranchId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user data for each report
      const reportsWithUsers = await Promise.all((data || []).map(async (report) => {
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('full_name, role')
            .eq('id', report.user_id)
            .single();

          return {
            ...report,
            user: userError ? null : userData
          };
        } catch (err) {
          console.warn('Failed to fetch user data for report:', report.id, err);
          return {
            ...report,
            user: null
          };
        }
      }));

      setReports(reportsWithUsers);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.customer_interactions.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    const matchesType = typeFilter === 'all' || report.report_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleStatusUpdate = async (reportId: string, newStatus: 'reviewed' | 'approved', notes?: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: currentUser?.id,
        updated_at: new Date().toISOString()
      };

      if (notes) {
        updateData.review_notes = notes;
      }

      const { error } = await supabase
        .from('daily_reports')
        .update(updateData)
        .eq('id', reportId);

      if (error) throw error;

      toast.success(`Report ${newStatus} successfully`);
      fetchReports();
      setShowReviewModal(false);
      setReviewNotes('');
    } catch (error) {
      console.error('Error updating report status:', error);
      toast.error('Failed to update report status');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
            <Clock className="w-3 h-3" />
            Draft
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
            <FileText className="w-3 h-3" />
            Submitted
          </span>
        );
      case 'reviewed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
            <Eye className="w-3 h-3" />
            Reviewed
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
        type === 'daily'
          ? 'bg-blue-50 text-blue-700 border border-blue-200'
          : 'bg-teal-50 text-teal-700 border border-teal-200'
      }`}>
        <Calendar className="w-3 h-3" />
        {type === 'daily' ? 'Daily' : 'Monthly'}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (activeTab === 'test-users') {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header with tabs */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Tools</h1>
              <p className="text-gray-600">Manage employee reports and testing tools</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'reports'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Employee Reports
            </button>
            <button
              onClick={() => setActiveTab('test-users')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'test-users'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Test User Management
            </button>
          </div>
        </div>

        <TestUserManager />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header with tabs */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Tools</h1>
            <p className="text-gray-600">Manage employee reports and testing tools</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{filteredReports.length}</div>
              <div className="text-sm text-gray-500">Total Reports</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {filteredReports.filter(r => r.status === 'submitted').length}
              </div>
              <div className="text-sm text-gray-500">Pending Review</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'reports'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Employee Reports
          </button>
          <button
            onClick={() => setActiveTab('test-users')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'test-users'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Test User Management
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
              <option value="approved">Approved</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">All Types</option>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No reports found</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No employee reports have been submitted yet'}
            </p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
                    {getTypeBadge(report.report_type)}
                    {getStatusBadge(report.status)}
                  </div>

                  <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span className="font-medium">{report.user?.full_name || 'Unknown User'}</span>
                      <span className="text-gray-400">•</span>
                      <span className="capitalize">{report.user?.role?.replace('-', ' ') || 'Unknown Role'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {report.report_type === 'daily'
                          ? formatDate(report.report_date)
                          : `Month: ${new Date(report.report_month || report.report_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`
                        }
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Submitted: {formatDate(report.submitted_at || report.created_at)}</span>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  {(report.customers_served > 0 || report.sales_made > 0 || report.issues_resolved > 0) && (
                    <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                      {report.customers_served > 0 && (
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">{report.customers_served}</div>
                          <div className="text-xs text-gray-600">Customers Served</div>
                        </div>
                      )}
                      {report.sales_made > 0 && (
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">{report.sales_made}</div>
                          <div className="text-xs text-gray-600">Sales Made</div>
                        </div>
                      )}
                      {report.issues_resolved > 0 && (
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-600">{report.issues_resolved}</div>
                          <div className="text-xs text-gray-600">Issues Resolved</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content Preview */}
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium text-gray-700">Customer Interactions:</span>
                      <p className="text-gray-600 mt-1 line-clamp-2">{report.customer_interactions}</p>
                    </div>

                    {report.pending_work && (
                      <div>
                        <span className="font-medium text-gray-700">Pending Work:</span>
                        <p className="text-gray-600 mt-1 line-clamp-2">{report.pending_work}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-6">
                  <button
                    onClick={() => {
                      setSelectedReport(report);
                      setShowReportModal(true);
                    }}
                    className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>

                  {report.status === 'submitted' && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(report.id, 'reviewed')}
                        className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Mark Reviewed
                      </button>

                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setShowReviewModal(true);
                        }}
                        className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedReport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <h3 className="text-xl font-bold text-gray-900">Approve Report</h3>
            </div>

            <p className="text-gray-600 mb-4">
              Approve the report by <strong>{selectedReport.user?.full_name}</strong> for{' '}
              {selectedReport.report_type === 'daily' ? 'daily' : 'monthly'} activities?
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Notes (Optional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
                placeholder="Add any review comments..."
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewNotes('');
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusUpdate(selectedReport.id, 'approved', reviewNotes || undefined)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Approve Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report View Modal */}
      <DailyReportModal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setSelectedReport(null);
        }}
        editReport={selectedReport || undefined}
        reportType={selectedReport?.report_type}
      />
    </div>
  );
};

export default ReportsPage;
