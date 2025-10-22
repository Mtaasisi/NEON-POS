import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Star, 
  ShoppingBag, 
  TrendingUp,
  Award,
  Gift,
  MessageCircle,
  Send,
  Edit,
  Crown,
  BarChart3,
  DollarSign,
  Clock,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { usePOSClickSounds } from '../../hooks/usePOSClickSounds';
import { supabase } from '../../../../lib/supabaseClient';
import { useBranch } from '../../../../context/BranchContext';

interface MobileCustomerDetailsPageProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  customerPhone: string;
}

interface CustomerData {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  location: string | null;
  joinDate: string;
  status: string;
  loyaltyTier: string;
  points: number;
  totalSpent: number;
  totalPurchases: number;
  avgOrderValue: number;
  lastPurchase: string | null;
  favoriteProducts: string[];
  purchases: any[];
}

const MobileCustomerDetailsPage: React.FC<MobileCustomerDetailsPageProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  customerPhone
}) => {
  const { playClickSound } = usePOSClickSounds();
  const { currentBranchId } = useBranch();
  const [activeSection, setActiveSection] = useState<'overview' | 'purchases' | 'loyalty'>('overview');
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);

  // Fetch real customer data
  useEffect(() => {
    let isMounted = true; // Track if component is mounted to prevent state updates after unmount
    
    if (isOpen && customerId) {
      fetchCustomerData(isMounted);
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, customerId]);

  const fetchCustomerData = async (isMounted: boolean = true) => {
    setLoading(true);
    try {
      // Fetch customer details
      const { data: customer, error: customerError } = await supabase
        .from('lats_customers')
        .select('*')
        .eq('id', customerId)
        .single();

      // Only proceed if component is still mounted
      if (!isMounted) return;

      if (customerError) {
        // Suppress error logging in development mode (React Strict Mode causes double API calls)
        if (process.env.NODE_ENV !== 'development' || !customerError.message.includes('not found')) {
          console.error('❌ Customer error:', customerError);
        }
        throw customerError;
      }

      if (!customer) {
        // Suppress duplicate "not found" errors in development
        if (process.env.NODE_ENV !== 'development') {
          console.error('❌ Customer not found');
        }
        throw new Error('Customer not found');
      }

      // Fetch customer sales with simplified query (avoid nested relationships for now)
      const { data: sales, error: salesError } = await supabase
        .from('lats_sales')
        .select('id, sale_number, total_amount, subtotal, created_at, status')
        .eq('customer_id', customerId)
        .eq('branch_id', currentBranchId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Log sales query result
      if (salesError) {
        console.error('Sales query error:', salesError);
      }

      // Fetch sale items separately for each sale if we got sales
      const salesWithItems = sales || [];

      // Calculate stats
      const totalSpent = salesWithItems.reduce((sum, sale) => {
        const amount = typeof sale.total_amount === 'number' ? sale.total_amount : parseFloat(sale.total_amount) || 0;
        return sum + amount;
      }, 0);
      const totalPurchases = salesWithItems.length;
      const avgOrderValue = totalPurchases > 0 ? totalSpent / totalPurchases : 0;
      const lastPurchase = salesWithItems.length > 0 ? salesWithItems[0].created_at : null;

      // Fetch sale items and products separately to get favorite products
      let favoriteProducts: string[] = [];
      if (salesWithItems.length > 0) {
        try {
          const saleIds = salesWithItems.map(s => s.id);
          const { data: saleItems } = await supabase
            .from('lats_sale_items')
            .select('product_id, quantity')
            .in('sale_id', saleIds);

          if (saleItems && saleItems.length > 0) {
            // Get unique product IDs
            const productIds = [...new Set(saleItems.map(item => item.product_id))];
            const { data: products } = await supabase
              .from('lats_products')
              .select('id, name')
              .in('id', productIds);

            // Count product purchases
            const productCounts: { [key: string]: number } = {};
            saleItems.forEach((item: any) => {
              const product = products?.find(p => p.id === item.product_id);
              const productName = product?.name || 'Unknown Product';
              productCounts[productName] = (productCounts[productName] || 0) + item.quantity;
            });

            favoriteProducts = Object.entries(productCounts)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3)
              .map(([name]) => name);
          }
        } catch (error) {
          console.error('Error fetching favorite products:', error);
          // Continue without favorite products
        }
      }

      // Determine loyalty tier based on points or total spent
      const points = customer?.loyalty_points || 0;
      let loyaltyTier = 'bronze';
      if (points >= 1000) loyaltyTier = 'platinum';
      else if (points >= 500) loyaltyTier = 'gold';
      else if (points >= 200) loyaltyTier = 'silver';

      setCustomerData({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        location: customer.location || customer.city || 'N/A',
        joinDate: customer.created_at,
        status: customer.status || 'active',
        loyaltyTier,
        points,
        totalSpent,
        totalPurchases,
        avgOrderValue,
        lastPurchase,
        favoriteProducts,
        purchases: salesWithItems.map(sale => ({
          id: sale.id,
          saleNumber: sale.sale_number,
          date: sale.created_at,
          amount: sale.total_amount,
          items: 0, // We'll need to calculate this separately if needed
          status: sale.status
        }))
      });

    } catch (error) {
      // Only log errors in production or if not a "not found" error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isNotFoundError = errorMessage.includes('not found') || errorMessage.includes('Customer not found');
      
      if (process.env.NODE_ENV !== 'development' || !isNotFoundError) {
        console.error('❌ Error fetching customer data:', error);
      }
      
      // Only show toast if component is still mounted and error is significant
      if (isMounted && !isNotFoundError) {
        toast.error('Failed to load customer data');
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'platinum':
        return { bg: 'bg-purple-500', text: 'text-purple-600', icon: '👑' };
      case 'gold':
        return { bg: 'bg-yellow-500', text: 'text-yellow-600', icon: '🏆' };
      case 'silver':
        return { bg: 'bg-gray-500', text: 'text-gray-600', icon: '🥈' };
      default:
        return { bg: 'bg-orange-500', text: 'text-orange-600', icon: '🥉' };
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Loading customer details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!customerData) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center p-4">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-4">Customer not found</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tierColors = getTierColor(customerData.loyaltyTier);

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <X size={18} />
              <span className="text-sm font-medium">Back</span>
            </button>
            <button
              onClick={() => {
                playClickSound();
                toast.success('Edit mode coming soon!');
              }}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Edit size={18} />
              <span className="text-sm font-medium">Edit</span>
            </button>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900">Customer Details</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3 pb-20">
        {/* Customer Profile Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-14 h-14 ${tierColors.bg} rounded-lg flex items-center justify-center text-white font-bold text-xl`}>
              {customerData.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">{customerData.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✓ Active
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tierColors.text === 'text-yellow-600' ? 'bg-yellow-100 text-yellow-800' : tierColors.text === 'text-purple-600' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'}`}>
                  {tierColors.icon} {customerData.loyaltyTier.charAt(0).toUpperCase() + customerData.loyaltyTier.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <Phone className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-xs text-gray-600">Phone</p>
                <p className="text-sm font-semibold text-gray-900">{customerData.phone}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <Mail className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-xs text-gray-600">Email</p>
                <p className="text-sm font-semibold text-gray-900">{customerData.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <MapPin className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-xs text-gray-600">Location</p>
                <p className="text-sm font-semibold text-gray-900">{customerData.location}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <Calendar className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-xs text-gray-600">Member Since</p>
                <p className="text-sm font-semibold text-gray-900">{new Date(customerData.joinDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-600">Purchases</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{customerData.totalPurchases}</p>
            <p className="text-xs text-gray-500 mt-0.5">orders</p>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <p className="text-xs text-gray-600">Total Spent</p>
            </div>
            <p className="text-xl font-bold text-gray-900">TZS {(customerData.totalSpent / 1000000).toFixed(1)}M</p>
            <p className="text-xs text-gray-500 mt-0.5">lifetime</p>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-gray-600">Points</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{customerData.points}</p>
            <p className="text-xs text-gray-500 mt-0.5">available</p>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <p className="text-xs text-gray-600">Avg Order</p>
            </div>
            <p className="text-xl font-bold text-gray-900">TZS {(customerData.avgOrderValue / 1000).toFixed(0)}K</p>
            <p className="text-xs text-gray-500 mt-0.5">per order</p>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex rounded-full bg-gray-100 p-1 gap-1">
          <button
            onClick={() => {
              playClickSound();
              setActiveSection('overview');
            }}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              activeSection === 'overview' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => {
              playClickSound();
              setActiveSection('purchases');
            }}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              activeSection === 'purchases' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Purchases
          </button>
          <button
            onClick={() => {
              playClickSound();
              setActiveSection('loyalty');
            }}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              activeSection === 'loyalty' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Loyalty
          </button>
        </div>

        {/* Overview Tab */}
        {activeSection === 'overview' && (
          <div className="space-y-3">
            {/* Recent Activity */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Recent Activity
              </h3>
              <div className="space-y-2">
                {customerData.lastPurchase && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-green-100 rounded-lg">
                        <ShoppingBag className="w-3 h-3 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">Last Purchase</p>
                        <p className="text-xs text-gray-600">{new Date(customerData.lastPurchase).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-gray-900">
                      TZS {customerData.purchases.length > 0 ? (customerData.purchases[0].amount / 1000).toFixed(0) : '0'}K
                    </p>
                  </div>
                )}
                
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-100 rounded-lg">
                      <Star className="w-3 h-3 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-900">Points Earned</p>
                      <p className="text-xs text-gray-600">Last 30 days</p>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-gray-900">+250 pts</p>
                </div>
              </div>
            </div>

            {/* Favorite Products */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-orange-600" />
                Favorite Products
              </h3>
              <div className="space-y-2">
                {customerData.favoriteProducts.length > 0 ? (
                  customerData.favoriteProducts.map((product, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{product}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <Award className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No favorite products yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Purchases Tab */}
        {activeSection === 'purchases' && (
          <div className="space-y-3">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                Purchase History
              </h3>
              <div className="space-y-2">
                {customerData.purchases.length > 0 ? (
                  customerData.purchases.map((purchase) => (
                    <div key={purchase.id} className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Order #{purchase.saleNumber || purchase.id}</p>
                          <p className="text-xs text-gray-600">{new Date(purchase.date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">TZS {(purchase.amount / 1000).toFixed(0)}K</p>
                          <p className="text-xs text-gray-600">{purchase.items} items</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          purchase.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {purchase.status === 'completed' ? '✓ Completed' : purchase.status}
                        </span>
                        <button className="text-xs text-blue-600 font-semibold hover:text-blue-700">
                          View Details
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No purchases yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loyalty Tab */}
        {activeSection === 'loyalty' && (
          <div className="space-y-3">
            {/* Points Balance */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-purple-600" />
                Points Balance
              </h3>
              <div className="text-center mb-3">
                <p className="text-3xl font-black text-purple-600">{customerData.points}</p>
                <p className="text-xs text-gray-600 mt-1">Available Points</p>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Progress to Next Tier</span>
                  <span className="text-xs font-semibold text-gray-900">{Math.min((customerData.points / 5000) * 100, 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((customerData.points / 5000) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {5000 - customerData.points > 0 ? `${5000 - customerData.points} points to Platinum tier` : 'Platinum tier achieved!'}
                </p>
              </div>

              {/* Tier Benefits */}
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm font-semibold text-yellow-900 mb-2">Your Benefits:</p>
                <ul className="space-y-1 text-xs text-yellow-800">
                  <li>• 7% discount on all purchases</li>
                  <li>• Special birthday rewards</li>
                  <li>• Priority customer support</li>
                  <li>• Exclusive member offers</li>
                </ul>
              </div>
            </div>

            {/* Points History */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                Points History
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">Purchase Reward</p>
                    <p className="text-xs text-gray-600">Oct 15, 2024</p>
                  </div>
                  <p className="text-sm font-bold text-green-600">+45 pts</p>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">Purchase Reward</p>
                    <p className="text-xs text-gray-600">Oct 10, 2024</p>
                  </div>
                  <p className="text-sm font-bold text-green-600">+29 pts</p>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">Birthday Bonus</p>
                    <p className="text-xs text-gray-600">Sep 01, 2024</p>
                  </div>
                  <p className="text-sm font-bold text-green-600">+100 pts</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              playClickSound();
              toast.success('SMS feature coming soon!');
            }}
            className="flex items-center gap-2 px-3 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            <Phone size={16} />
            <span>Send SMS</span>
          </button>
          
          <button
            onClick={() => {
              playClickSound();
              toast.success('WhatsApp feature coming soon!');
            }}
            className="flex items-center gap-2 px-3 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
          >
            <MessageCircle size={16} />
            <span>WhatsApp</span>
          </button>
          
          <button
            onClick={() => {
              playClickSound();
              toast.success('Rewards feature coming soon!');
            }}
            className="flex items-center gap-2 px-3 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
          >
            <Gift size={16} />
            <span>Give Reward</span>
          </button>
          
          <button
            onClick={() => {
              playClickSound();
              toast.success('Email feature coming soon!');
            }}
            className="flex items-center gap-2 px-3 py-2.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm font-medium"
          >
            <Send size={16} />
            <span>Send Email</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileCustomerDetailsPage;

