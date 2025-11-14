import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../components/MobileLayout';
import {
  Star,
  Gift,
  TrendingUp,
  Award,
  Clock,
  ChevronRight,
  Zap,
  Crown
} from 'lucide-react';
import { LoyaltyReward } from '../types';
import toast from 'react-hot-toast';
import customerPortalService from '../services/customerPortalService';
import { useLoadingJob } from '../../../hooks/useLoadingJob';

const LoyaltyPage: React.FC = () => {
  const navigate = useNavigate();
  const { startLoading, completeLoading, failLoading } = useLoadingJob();
  const [points, setPoints] = useState(0);
  const [tier, setTier] = useState<'interested' | 'engaged' | 'payment_customer' | 'active' | 'regular' | 'premium' | 'vip'>('interested');
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'rewards' | 'history'>('rewards');

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
          setPoints(customer.points || 0);
          setTier(customer.loyalty_tier || customer.loyalty_level || 'interested');
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

  const tierInfo = getTierInfo(tier);
  const TierIcon = tierInfo.icon;

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Loyalty Rewards">
      {/* Points Card */}
      <div className={`bg-gradient-to-br ${tierInfo.color} p-6 text-white`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm opacity-90">Your Points</div>
            <div className="text-4xl font-bold">{points.toLocaleString()}</div>
          </div>
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <TierIcon size={32} />
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          <div className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm font-bold">
            {tierInfo.name} Member
          </div>
        </div>
        
        <div className="text-sm opacity-90">
          Keep shopping to reach the next tier!
        </div>
      </div>

      {/* Tier Benefits */}
      <div className="p-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Award size={20} className="text-blue-600" />
            Your Benefits
          </h3>
          <ul className="space-y-2">
            {tierInfo.benefits.map((benefit, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                <Star size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSelectedTab('rewards')}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              selectedTab === 'rewards'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Available Rewards
          </button>
          <button
            onClick={() => setSelectedTab('history')}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              selectedTab === 'history'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Points History
          </button>
        </div>
      </div>

      {/* Content */}
      {selectedTab === 'rewards' ? (
        <div className="px-4 pb-4 space-y-3">
          {rewards.map(reward => {
            const canRedeem = points >= reward.pointsRequired;
            
            return (
              <div
                key={reward.id}
                className="bg-white rounded-xl p-4 shadow-sm"
              >
                <div className="flex gap-4">
                  {/* Reward Icon */}
                  <div className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    canRedeem ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Gift size={28} className={canRedeem ? 'text-blue-600' : 'text-gray-400'} />
                  </div>
                  
                  {/* Reward Info */}
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-1">{reward.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{reward.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star size={16} className="text-yellow-500" />
                        <span className="text-sm font-bold text-gray-900">
                          {reward.pointsRequired.toLocaleString()} points
                        </span>
                      </div>
                      
                      <button
                        onClick={() => handleRedeemReward(reward)}
                        disabled={!canRedeem}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                          canRedeem
                            ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {canRedeem ? 'Redeem' : 'Not Enough Points'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-4 pb-4">
          <div className="bg-white rounded-xl p-6 text-center">
            <Clock size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="font-bold text-gray-900 mb-2">Points History</h3>
            <p className="text-gray-600 text-sm">
              Your points earning and redemption history will appear here
            </p>
          </div>
        </div>
      )}

      {/* How to Earn Points */}
      <div className="px-4 pb-4">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-600" />
            How to Earn Points
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Earn 1 point for every Tsh 1,000 spent</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Refer a friend and get 500 bonus points</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Complete your profile for 200 points</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Write a review and earn 100 points</span>
            </li>
          </ul>
        </div>
      </div>
    </MobileLayout>
  );
};

export default LoyaltyPage;

