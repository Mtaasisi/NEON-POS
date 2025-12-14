import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Users, Gift, TrendingUp, Plus, ExternalLink, Award } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';
import Modal from '../../../shared/components/ui/Modal';
import { useCustomers } from '../../../../hooks/useCustomers';
import { useAuth } from '../../../../context/AuthContext';
import toast from 'react-hot-toast';

interface LoyaltyWidgetProps {
  className?: string;
}

interface LoyaltyMetrics {
  totalMembers: number;
  activeMembers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  availablePoints: number;
  redemptions: number;
  growth: number;
}

export const LoyaltyWidget: React.FC<LoyaltyWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<LoyaltyMetrics>({
    totalMembers: 0,
    activeMembers: 0,
    totalPointsIssued: 0,
    totalPointsRedeemed: 0,
    availablePoints: 0,
    redemptions: 0,
    growth: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showIssuePointsModal, setShowIssuePointsModal] = useState(false);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const { currentUser } = useAuth();
  const { customers } = useCustomers();

  useEffect(() => {
    loadLoyaltyData();
  }, []);

  const loadLoyaltyData = async () => {
    try {
      setIsLoading(true);
      const currentBranchId = getCurrentBranchId();
      
      // Query loyalty points
      let pointsQuery = supabase
        .from('loyalty_points')
        .select('id, points, points_type, created_at');

      // ✅ Use addBranchFilter for proper isolation support
      const { addBranchFilter } = await import('../../../../lib/branchAwareApi');
      pointsQuery = await addBranchFilter(pointsQuery, 'loyalty_points');

      const { data: points, error: pointsError } = await pointsQuery;

      // Query loyalty members (customers with points) - customers already use branch filtering
      let membersQuery = supabase
        .from('lats_customers')
        .select('id, loyalty_points');

      // ✅ Customers already have branch filtering in customerApi, but apply here too for consistency
      membersQuery = await addBranchFilter(membersQuery, 'customers');

      const { data: members, error: membersError } = await membersQuery;

      // Handle missing tables gracefully
      if (pointsError && pointsError.code === '42P01') {
        // Table doesn't exist - show empty state
        setMetrics({
          totalMembers: 0,
          activeMembers: 0,
          totalPointsIssued: 0,
          totalPointsRedeemed: 0,
          availablePoints: 0,
          redemptions: 0,
          growth: 0
        });
        setIsLoading(false);
        return;
      }
      if (membersError && membersError.code === '42P01') {
        // Table doesn't exist - show empty state
        setMetrics({
          totalMembers: 0,
          activeMembers: 0,
          totalPointsIssued: 0,
          totalPointsRedeemed: 0,
          availablePoints: 0,
          redemptions: 0,
          growth: 0
        });
        setIsLoading(false);
        return;
      }
      if (pointsError || membersError) {
        throw pointsError || membersError;
      }

      const totalMembers = members?.length || 0;
      const activeMembers = members?.filter(m => (m.loyalty_points || 0) > 0).length || 0;
      
      const totalIssued = points?.filter(p => p.points_type === 'earned' || p.points_type === 'purchase').reduce((sum, p) => sum + (p.points || 0), 0) || 0;
      const totalRedeemed = points?.filter(p => p.points_type === 'redeemed').reduce((sum, p) => sum + Math.abs(p.points || 0), 0) || 0;
      const availablePoints = totalIssued - totalRedeemed;
      const redemptions = points?.filter(p => p.points_type === 'redeemed').length || 0;

      // Calculate growth (this month vs last month)
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const thisMonthMembers = members?.filter(m => {
        // This is approximate - you might need to check created_at from a different source
        return true;
      }).length || 0;
      const growth = 0; // Calculate based on your data structure

      setMetrics({
        totalMembers,
        activeMembers,
        totalPointsIssued: totalIssued,
        totalPointsRedeemed: totalRedeemed,
        availablePoints,
        redemptions,
        growth
      });
    } catch (error) {
      console.error('Error loading loyalty data:', error);
      // Set safe defaults on error
      setMetrics({
        totalMembers: 0,
        activeMembers: 0,
        totalPointsIssued: 0,
        totalPointsRedeemed: 0,
        availablePoints: 0,
        redemptions: 0,
        growth: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl p-7 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-75"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl p-7 flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
            <Star className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Loyalty Program</h3>
            <p className="text-xs text-gray-400 mt-0.5">Rewards & points</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/lats/loyalty')}
          className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
        >
          <ExternalLink size={14} />
          <span>View All</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Active Members</p>
          <p className="text-2xl font-semibold text-gray-900">{metrics.activeMembers}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Total Members</p>
          <p className="text-2xl font-semibold text-gray-900">{metrics.totalMembers}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Points Issued</p>
          <p className="text-xl font-semibold text-gray-900">{(metrics.totalPointsIssued || 0).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Available</p>
          <p className="text-xl font-semibold text-emerald-600">{(metrics.availablePoints || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Points Breakdown */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">Redemptions</span>
          </div>
          <span className="text-sm font-medium text-gray-900">{metrics.redemptions}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-yellow-50">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-600" />
            <span className="text-xs text-gray-500">Points Redeemed</span>
          </div>
          <span className="text-sm font-medium text-yellow-700">{(metrics.totalPointsRedeemed || 0).toLocaleString()}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto pt-4 border-t">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowIssuePointsModal(true);
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
          title="Issue Points"
        >
          <Plus size={18} />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowRewardsModal(true);
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-black hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <Gift size={14} />
          <span>Rewards</span>
        </button>
      </div>

      {/* Issue Points Modal */}
      <IssuePointsModal
        isOpen={showIssuePointsModal}
        onClose={() => setShowIssuePointsModal(false)}
        onSuccess={() => {
          loadLoyaltyData();
        }}
      />

      {/* Rewards Modal */}
      <RewardsModal
        isOpen={showRewardsModal}
        onClose={() => setShowRewardsModal(false)}
      />
    </div>
  );
};

// Issue Points Modal
const IssuePointsModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess?: () => void }> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const { customers } = useCustomers();
  const [customerId, setCustomerId] = useState('');
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentBranchId = getCurrentBranchId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !points) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('loyalty_points')
        .insert({
          customer_id: customerId,
          points: parseInt(points),
          points_type: 'earned',
          reason: reason || 'Manual points issuance',
          branch_id: currentBranchId,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success('Points issued successfully');
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error issuing points:', error);
      toast.error('Failed to issue points');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Issue Loyalty Points" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            required
          >
            <option value="">Select customer</option>
            {customers?.map(customer => (
              <option key={customer.id} value={customer.id}>{customer.name} ({customer.phone})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
          <input
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="Enter points"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            min="1"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for issuing points"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black disabled:opacity-50"
          >
            {isSubmitting ? 'Issuing...' : 'Issue Points'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// Rewards Modal
const RewardsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [rewards, setRewards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const currentBranchId = getCurrentBranchId();

  useEffect(() => {
    if (isOpen) {
      loadRewards();
    }
  }, [isOpen]);

  const loadRewards = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('is_active', true);

      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRewards(data || []);
    } catch (error) {
      console.error('Error loading rewards:', error);
      toast.error('Failed to load rewards');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Available Rewards" maxWidth="lg">
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : rewards.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No rewards available</div>
        ) : (
          rewards.map((reward) => (
            <div key={reward.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{reward.name}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {reward.points_required} points required
                  </p>
                </div>
                <span className="text-sm font-medium text-yellow-600">
                  {reward.description || 'Available'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};

