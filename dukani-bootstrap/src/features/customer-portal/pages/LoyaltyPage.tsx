import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../components/MobileLayout';
import {
  Star,
  Gift,
  TrendingUp,
  Award,
  Clock,
  Zap,
  Crown,
  DollarSign,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  Sparkles,
  Target
} from 'lucide-react';
import { LoyaltyReward } from '../types';
import toast from 'react-hot-toast';
import customerPortalService from '../services/customerPortalService';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import { customerLoyaltyService } from '../../../lib/customerLoyaltyService';

const LoyaltyPage: React.FC = () => {
  const navigate = useNavigate();
  const { startLoading, completeLoading, failLoading } = useLoadingJob();
  const [points, setPoints] = useState(0);
  const [tier, setTier] = useState<'interested' | 'engaged' | 'payment_customer' | 'active' | 'regular' | 'premium' | 'vip'>('interested');
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'rewards' | 'history'>('rewards');
  const [pointHistory, setPointHistory] = useState<any[]>([]);
  const [expandedRewardId, setExpandedRewardId] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalRedeemed, setTotalRedeemed] = useState(0);
  const [pointsToNextTier, setPointsToNextTier] = useState(0);

  useEffect(() => {
    loadLoyaltyData();
  }, []);

  const loadLoyaltyData = async () => {
    const jobId = startLoading('Loading loyalty data...');
    
    try {
      setLoading(true);
      const customerId = localStorage.getItem('customer_id');
      
      if (customerId) {
        const customer = await customerPortalService.getCustomerById(customerId);

        if (customer) {
          const currentPoints = customer.points || 0;
          setPoints(currentPoints);
          setTier(customer.loyalty_tier || customer.loyalty_level || 'interested');
          
          // Load point history
          try {
            const history = await customerLoyaltyService.fetchPointHistory(customerId);
            setPointHistory(history);
            
            // Calculate stats - handle different PointTransaction structures
            const earned = history
              .filter((t: any) => (t.type === 'earned' || t.type === 'purchase') && (t.points || t.amount || t.points_change))
              .reduce((sum: number, t: any) => sum + Math.abs(t.points || t.amount || t.points_change || 0), 0);
            const redeemed = history
              .filter((t: any) => (t.type === 'redeemed' || t.type === 'spent') && (t.points || t.amount || t.points_change))
              .reduce((sum: number, t: any) => sum + Math.abs(t.points || t.amount || t.points_change || 0), 0);
            
            setTotalEarned(earned);
            setTotalRedeemed(redeemed);
            
            // Calculate points to next tier
            const nextTierPoints = getNextTierPoints(customer.loyalty_tier || customer.loyalty_level || 'interested');
            setPointsToNextTier(Math.max(0, nextTierPoints - currentPoints));
          } catch (error) {
            console.error('Error loading point history:', error);
          }
        }
      }

      // Mock rewards data
      const mockRewards: LoyaltyReward[] = [
        {
          id: '1',
          title: '10% Off Next Purchase',
          description: 'Get 10% discount on your next purchase of any product',
          pointsRequired: 1000,
          category: 'discount',
          imageUrl: ''
        },
        {
          id: '2',
          title: 'Free Phone Case',
          description: 'Redeem for a free phone case of your choice',
          pointsRequired: 2000,
          category: 'product',
          imageUrl: ''
        },
        {
          id: '3',
          title: 'Free Screen Protector',
          description: 'Get a premium screen protector installed for free',
          pointsRequired: 1500,
          category: 'service',
          imageUrl: ''
        },
        {
          id: '4',
          title: 'Tsh 50,000 Voucher',
          description: 'Shopping voucher worth Tsh 50,000',
          pointsRequired: 5000,
          category: 'voucher',
          imageUrl: ''
        }
      ];

      setRewards(mockRewards);
      completeLoading(jobId);
    } catch (error) {
      console.error('Error loading loyalty data:', error);
      toast.error('Failed to load loyalty data');
      failLoading(jobId, 'Failed to load loyalty data');
    } finally {
      setLoading(false);
    }
  };

  const getNextTierPoints = (currentTier: string): number => {
    const tierPoints: Record<string, number> = {
      'interested': 500,
      'engaged': 1000,
      'payment_customer': 2000,
      'active': 5000,
      'regular': 10000,
      'premium': 25000,
      'vip': 50000
    };
    return tierPoints[currentTier] || 0;
  };

  const formatPrice = (price: number | string): string => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (num % 1 === 0) {
      return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getTierInfo = (tierLevel: string) => {
    switch (tierLevel) {
      case 'vip':
        return {
          name: 'VIP',
          color: 'from-purple-500 to-pink-500',
          icon: Crown,
          benefits: ['20% off all purchases', 'Free delivery', 'Priority support', 'Exclusive deals']
        };
      case 'premium':
        return {
          name: 'Premium',
          color: 'from-yellow-400 to-orange-500',
          icon: Award,
          benefits: ['15% off all purchases', 'Free delivery on orders over Tsh 50,000', 'Priority support']
        };
      case 'regular':
        return {
          name: 'Regular',
          color: 'from-blue-400 to-blue-600',
          icon: Star,
          benefits: ['10% off all purchases', 'Free delivery on orders over Tsh 100,000']
        };
      case 'active':
        return {
          name: 'Active',
          color: 'from-green-400 to-green-600',
          icon: Zap,
          benefits: ['7% off all purchases', 'Regular customer perks']
        };
      case 'payment_customer':
        return {
          name: 'Payment Customer',
          color: 'from-teal-400 to-teal-600',
          icon: Star,
          benefits: ['5% off all purchases', 'Earn bonus points']
        };
      case 'engaged':
        return {
          name: 'Engaged',
          color: 'from-indigo-400 to-indigo-600',
          icon: Zap,
          benefits: ['3% off all purchases', 'Earn points on every purchase']
        };
      case 'interested':
      default:
        return {
          name: 'Interested',
          color: 'from-gray-400 to-gray-600',
          icon: Star,
          benefits: ['Earn points on every purchase', 'Join our loyalty program']
        };
    }
  };

  const handleRedeemReward = (reward: LoyaltyReward) => {
    if (points < reward.pointsRequired) {
      toast.error('Not enough points to redeem this reward');
      return;
    }
    
    // Show confirmation
    if (confirm(`Redeem ${reward.title} for ${reward.pointsRequired} points?`)) {
      toast.success('Reward redeemed! Check your account for details');
      // In real app, would call API to redeem
    }
  };

  if (loading) {
    return (
      <MobileLayout title="Loyalty Rewards">
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        </div>
      </MobileLayout>
    );
  }

  const tierInfo = getTierInfo(tier);
  const TierIcon = tierInfo.icon;

  return (
    <MobileLayout title="Loyalty Rewards">
      <div className="min-h-screen bg-gray-50">
        {/* Fixed Header Section - Matching SetPricingModal Style */}
        <div className="bg-white border-b border-gray-200 p-6 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className={`w-16 h-16 bg-gradient-to-br ${tierInfo.color} rounded-full flex items-center justify-center shadow-lg`}>
              <TierIcon className="w-8 h-8 text-white" />
            </div>
            
            {/* Text and Stats */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Loyalty Program</h3>
              
              {/* Progress Indicator */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <Sparkles className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-bold text-green-700">{formatPrice(points)} Points</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <Crown className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-blue-700">{tierInfo.name} Tier</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards Section - Matching SetPricingModal Style */}
        <div className="p-6 pb-0 flex-shrink-0">
          <div className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              {/* Total Points */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <Star className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Current Points</p>
                  <p className="text-base font-bold text-blue-600 truncate">
                    {formatPrice(points)}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="h-14 w-px bg-gray-300"></div>

              {/* Total Earned */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                  <ArrowUp className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Total Earned</p>
                  <p className="text-base font-bold text-green-600 truncate">
                    {formatPrice(totalEarned)}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="h-14 w-px bg-gray-300"></div>

              {/* Total Redeemed */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <ArrowDown className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Total Redeemed</p>
                  <p className="text-base font-bold text-orange-600 truncate">
                    {formatPrice(totalRedeemed)}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Next Tier Progress */}
            {pointsToNextTier > 0 && (
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-50 border border-purple-100">
                  <Target className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-600">
                    {formatPrice(pointsToNextTier)} points to next tier
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tier Benefits Section */}
        <div className="p-6 pt-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Award size={20} className="text-blue-600" />
              Your Tier Benefits
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {tierInfo.benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm text-gray-700 p-2 rounded-lg bg-gray-50">
                  <CheckCircle2 size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="font-medium">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="px-6">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSelectedTab('rewards')}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                selectedTab === 'rewards'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Available Rewards
            </button>
            <button
              onClick={() => setSelectedTab('history')}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                selectedTab === 'history'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Points History
            </button>
          </div>
        </div>

        {/* Scrollable Content Section */}
        <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
          {selectedTab === 'rewards' ? (
            <div className="space-y-4 py-4">
              {rewards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Gift className="w-16 h-16 text-gray-400 mb-4" />
                  <p className="text-gray-600 text-lg font-medium">No rewards available</p>
                </div>
              ) : (
                rewards.map(reward => {
                  const canRedeem = points >= reward.pointsRequired;
                  const isExpanded = expandedRewardId === reward.id;
                  const pointsNeeded = reward.pointsRequired - points;
                  
                  return (
                    <div
                      key={reward.id}
                      className={`border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 ${
                        isExpanded
                          ? 'border-blue-500 shadow-xl'
                          : canRedeem
                            ? 'border-green-200 hover:border-green-300 hover:shadow-md'
                            : 'border-orange-300 hover:border-orange-400 hover:shadow-md'
                      }`}
                    >
                      {/* Reward Header - Clickable */}
                      <div
                        className="flex items-start justify-between p-6 cursor-pointer"
                        onClick={() => setExpandedRewardId(isExpanded ? null : reward.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                              isExpanded ? 'bg-blue-500' : 'bg-gray-200'
                            }`}>
                              <svg
                                className={`w-4 h-4 text-white transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-lg font-bold text-gray-900">
                                  {reward.title}
                                </h4>
                                {/* Status Badge */}
                                {canRedeem ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Available
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500 text-white shadow-sm">
                                    <XCircle className="w-3 h-3" />
                                    Need {formatPrice(pointsNeeded)} more
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{reward.description}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {/* Points Badge */}
                          <div className="px-4 py-2 rounded-xl text-base font-bold shadow-sm bg-blue-100 text-blue-700 border border-blue-200">
                            {formatPrice(reward.pointsRequired)} pts
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="px-6 pb-6">
                          {/* Reward Details */}
                          <div className="bg-white rounded-xl p-3.5 mb-3 border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-3">
                              {/* Category */}
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                                  <Gift className="w-4 h-4 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-gray-500 mb-0.5">Category</p>
                                  <p className="text-base font-bold text-purple-600 capitalize">
                                    {reward.category}
                                  </p>
                                </div>
                              </div>

                              {/* Divider */}
                              <div className="h-14 w-px bg-gray-300"></div>

                              {/* Points Required */}
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
                                  <Star className="w-4 h-4 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-gray-500 mb-0.5">Points Required</p>
                                  <p className="text-base font-bold text-orange-600">
                                    {formatPrice(reward.pointsRequired)}
                                  </p>
                                </div>
                              </div>

                              {/* Divider */}
                              <div className="h-14 w-px bg-gray-300"></div>

                              {/* Your Points */}
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                                  <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-gray-500 mb-0.5">Your Points</p>
                                  <p className={`text-base font-bold ${canRedeem ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatPrice(points)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Redeem Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRedeemReward(reward);
                            }}
                            disabled={!canRedeem}
                            className={`w-full px-6 py-3.5 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-lg ${
                              canRedeem
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-gray-200 text-gray-500'
                            }`}
                          >
                            {canRedeem ? (
                              <span className="flex items-center justify-center gap-2">
                                <Gift className="w-5 h-5" />
                                Redeem Now
                              </span>
                            ) : (
                              <span className="flex items-center justify-center gap-2">
                                <XCircle className="w-5 h-5" />
                                Need {formatPrice(pointsNeeded)} More Points
                              </span>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {pointHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="w-16 h-16 text-gray-400 mb-4" />
                  <p className="text-gray-600 text-lg font-medium">No transaction history</p>
                  <p className="text-gray-500 text-sm mt-2">Your points transactions will appear here</p>
                </div>
              ) : (
                pointHistory.map((transaction: any, idx: number) => {
                  const isEarned = transaction.type === 'earned' || transaction.type === 'purchase';
                  const isRedeemed = transaction.type === 'redeemed' || transaction.type === 'spent';
                  const points = Math.abs(transaction.points || transaction.amount || transaction.points_change || 0);
                  const isExpanded = expandedHistoryId === idx.toString();
                  const date = transaction.timestamp || transaction.date || transaction.created_at;
                  const formattedDate = date ? new Date(date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Unknown date';

                  return (
                    <div
                      key={idx}
                      className={`border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 ${
                        isExpanded
                          ? 'border-blue-500 shadow-xl'
                          : isEarned
                            ? 'border-green-200 hover:border-green-300 hover:shadow-md'
                            : 'border-orange-200 hover:border-orange-300 hover:shadow-md'
                      }`}
                    >
                      {/* Transaction Header */}
                      <div
                        className="flex items-start justify-between p-6 cursor-pointer"
                        onClick={() => setExpandedHistoryId(isExpanded ? null : idx.toString())}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                              isExpanded ? 'bg-blue-500' : 'bg-gray-200'
                            }`}>
                              <svg
                                className={`w-4 h-4 text-white transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-lg font-bold text-gray-900">
                                  {transaction.reason || `${isEarned ? 'Points Earned' : 'Points Redeemed'}`}
                                </h4>
                                {/* Type Badge */}
                                {isEarned ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm">
                                    <ArrowUp className="w-3 h-3" />
                                    Earned
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500 text-white shadow-sm">
                                    <ArrowDown className="w-3 h-3" />
                                    Redeemed
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{formattedDate}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {/* Points Badge */}
                          <div className={`px-4 py-2 rounded-xl text-base font-bold shadow-sm border ${
                            isEarned
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : 'bg-orange-100 text-orange-700 border-orange-200'
                          }`}>
                            {isEarned ? '+' : '-'}{formatPrice(points)}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="px-6 pb-6">
                          {/* Transaction Details */}
                          <div className="bg-white rounded-xl p-3.5 mb-3 border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-3">
                              {/* Type */}
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  isEarned ? 'bg-green-500' : 'bg-orange-500'
                                }`}>
                                  {isEarned ? (
                                    <ArrowUp className="w-4 h-4 text-white" />
                                  ) : (
                                    <ArrowDown className="w-4 h-4 text-white" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-gray-500 mb-0.5">Transaction Type</p>
                                  <p className="text-base font-bold capitalize">
                                    {transaction.type || 'Unknown'}
                                  </p>
                                </div>
                              </div>

                              {/* Divider */}
                              <div className="h-14 w-px bg-gray-300"></div>

                              {/* Points */}
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                                  <Star className="w-4 h-4 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-gray-500 mb-0.5">Points</p>
                                  <p className={`text-base font-bold ${isEarned ? 'text-green-600' : 'text-orange-600'}`}>
                                    {isEarned ? '+' : '-'}{formatPrice(points)}
                                  </p>
                                </div>
                              </div>

                              {/* Divider */}
                              <div className="h-14 w-px bg-gray-300"></div>

                              {/* Date */}
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                                  <Clock className="w-4 h-4 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-gray-500 mb-0.5">Date</p>
                                  <p className="text-base font-bold text-purple-600 text-xs">
                                    {formattedDate}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Additional Info */}
                            {(transaction.orderId || transaction.deviceId) && (
                              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                                {transaction.orderId && (
                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 border border-blue-100">
                                    <span className="text-xs font-semibold text-blue-600">
                                      Order: {transaction.orderId}
                                    </span>
                                  </div>
                                )}
                                {transaction.deviceId && (
                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-50 border border-purple-100">
                                    <span className="text-xs font-semibold text-purple-600">
                                      Device: {transaction.deviceId}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* How to Earn Points Section - Compact Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-gray-200 bg-white">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-600" />
              How to Earn Points
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-start gap-2 text-sm text-gray-700 p-2 rounded-lg bg-white/50">
                <DollarSign className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="font-medium">Earn 1 point for every Tsh 1,000 spent</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-700 p-2 rounded-lg bg-white/50">
                <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <span className="font-medium">Refer a friend and get 500 bonus points</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-700 p-2 rounded-lg bg-white/50">
                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="font-medium">Complete your profile for 200 points</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-700 p-2 rounded-lg bg-white/50">
                <Star className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <span className="font-medium">Write a review and earn 100 points</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default LoyaltyPage;

