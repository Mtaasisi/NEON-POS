import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import GlassInput from '../../shared/components/ui/EnhancedInput';
import { 
  Star, 
  Gift, 
  Award,
  TrendingUp,
  Users,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  Crown,
  Sparkles,
  Target,
  Calendar,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';

interface LoyaltyTier {
  id?: string;
  name: string;
  min_points: number;
  max_points?: number;
  discount_percentage: number;
  special_benefits: string[];
  color: string;
  icon: string;
}

interface LoyaltySettings {
  enabled: boolean;
  points_per_currency: number;
  currency_per_point: number;
  min_purchase_for_points: number;
  points_expiry_days: number;
  enable_birthday_bonus: boolean;
  birthday_bonus_points: number;
  enable_referral_bonus: boolean;
  referral_bonus_points: number;
  enable_tiers: boolean;
  tiers: LoyaltyTier[];
  welcome_bonus_points: number;
  min_redemption_points: number;
  max_redemption_percent: number;
}

const LoyaltyProgramSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>('points-config');
  const [settings, setSettings] = useState<LoyaltySettings>({
    enabled: true,
    points_per_currency: 1,
    currency_per_point: 0.01,
    min_purchase_for_points: 1,
    points_expiry_days: 365,
    enable_birthday_bonus: true,
    birthday_bonus_points: 500,
    enable_referral_bonus: true,
    referral_bonus_points: 1000,
    enable_tiers: true,
    tiers: [
      {
        name: 'Bronze',
        min_points: 0,
        max_points: 999,
        discount_percentage: 5,
        special_benefits: ['Early sale access', 'Birthday bonus'],
        color: '#CD7F32',
        icon: 'star'
      },
      {
        name: 'Silver',
        min_points: 1000,
        max_points: 4999,
        discount_percentage: 10,
        special_benefits: ['Early sale access', 'Birthday bonus', 'Free shipping'],
        color: '#C0C0C0',
        icon: 'award'
      },
      {
        name: 'Gold',
        min_points: 5000,
        max_points: 9999,
        discount_percentage: 15,
        special_benefits: ['Early sale access', 'Birthday bonus', 'Free shipping', 'Priority support'],
        color: '#FFD700',
        icon: 'crown'
      },
      {
        name: 'Platinum',
        min_points: 10000,
        discount_percentage: 20,
        special_benefits: ['Early sale access', 'Birthday bonus', 'Free shipping', 'Priority support', 'Exclusive events'],
        color: '#E5E4E2',
        icon: 'sparkles'
      }
    ],
    welcome_bonus_points: 100,
    min_redemption_points: 100,
    max_redemption_percent: 50
  });

  const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null);
  const [showAddTierForm, setShowAddTierForm] = useState(false);

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? '' : sectionId);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'loyalty_program')
        .single();

      if (error) {
        console.error('Error loading loyalty settings:', error);
      } else if (data) {
        try {
          const parsed = JSON.parse(data.value);
          setSettings(parsed);
        } catch (e) {
          console.error('Error parsing loyalty settings:', e);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load loyalty program settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'loyalty_program',
          value: JSON.stringify(settings)
        }, { onConflict: 'key' });

      if (error) throw error;
      toast.success('Loyalty program settings saved successfully');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addTier = (tier: LoyaltyTier) => {
    setSettings({
      ...settings,
      tiers: [...settings.tiers, tier]
    });
    setShowAddTierForm(false);
  };

  const updateTier = (index: number, tier: LoyaltyTier) => {
    const newTiers = [...settings.tiers];
    newTiers[index] = tier;
    setSettings({
      ...settings,
      tiers: newTiers
    });
    setEditingTier(null);
  };

  const deleteTier = (index: number) => {
    if (!confirm('Are you sure you want to delete this tier?')) return;
    
    const newTiers = settings.tiers.filter((_, i) => i !== index);
    setSettings({
      ...settings,
      tiers: newTiers
    });
    toast.success('Tier deleted successfully');
  };

  const TierForm: React.FC<{
    tier: LoyaltyTier;
    onSave: (tier: LoyaltyTier) => void;
    onCancel: () => void;
  }> = ({ tier, onSave, onCancel }) => {
    const [formData, setFormData] = useState<LoyaltyTier>(tier);

    return (
      <div className="bg-white rounded-lg p-4 border-2 border-blue-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassInput
            label="Tier Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tier Color
            </label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full h-10 rounded border border-gray-300"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassInput
            label="Min Points *"
            type="number"
            value={formData.min_points}
            onChange={(e) => setFormData({ ...formData, min_points: parseInt(e.target.value) })}
            required
          />
          <GlassInput
            label="Max Points"
            type="number"
            value={formData.max_points || ''}
            onChange={(e) => setFormData({ ...formData, max_points: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="Leave empty for no limit"
          />
          <GlassInput
            label="Discount % *"
            type="number"
            step="0.1"
            value={formData.discount_percentage}
            onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Special Benefits (one per line)
          </label>
          <textarea
            value={formData.special_benefits.join('\n')}
            onChange={(e) => setFormData({ 
              ...formData, 
              special_benefits: e.target.value.split('\n').filter(b => b.trim()) 
            })}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            placeholder="e.g., Free shipping&#10;Priority support&#10;Exclusive discounts"
          />
        </div>

        <div className="flex gap-3">
          <GlassButton
            onClick={() => onSave(formData)}
            disabled={!formData.name}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Tier
          </GlassButton>
          <GlassButton onClick={onCancel} variant="outline">
            Cancel
          </GlassButton>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <GlassCard className="p-6">
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Loading loyalty program settings...</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compact Program Status Header */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Gift className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Loyalty Program</h4>
              <p className="text-xs text-gray-600">
                {settings.enabled ? 'Customers can earn and redeem points' : 'Program is currently disabled'}
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>
      </GlassCard>

      {/* Points Configuration */}
      <GlassCard className="p-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('points-config')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Points Configuration</h3>
              <p className="text-sm text-gray-600">Configure how customers earn and redeem points</p>
            </div>
          </div>
          {expandedSection === 'points-config' ? (
            <ChevronUp className="w-6 h-6 text-gray-600" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-600" />
          )}
        </div>
        {expandedSection === 'points-config' && (
        <div className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassInput
              label="Points per Dollar Spent"
              type="number"
              step="0.1"
              value={settings.points_per_currency}
              onChange={(e) => setSettings({ ...settings, points_per_currency: parseFloat(e.target.value) })}
              help="How many points customers earn per dollar spent"
            />
            <GlassInput
              label="Dollar Value per Point"
              type="number"
              step="0.01"
              value={settings.currency_per_point}
              onChange={(e) => setSettings({ ...settings, currency_per_point: parseFloat(e.target.value) })}
              help="How much each point is worth when redeemed"
            />
            <GlassInput
              label="Minimum Purchase for Points ($)"
              type="number"
              value={settings.min_purchase_for_points}
              onChange={(e) => setSettings({ ...settings, min_purchase_for_points: parseFloat(e.target.value) })}
            />
            <GlassInput
              label="Points Expiry (days)"
              type="number"
              value={settings.points_expiry_days}
              onChange={(e) => setSettings({ ...settings, points_expiry_days: parseInt(e.target.value) })}
              help="0 = never expire"
            />
            <GlassInput
              label="Welcome Bonus Points"
              type="number"
              value={settings.welcome_bonus_points}
              onChange={(e) => setSettings({ ...settings, welcome_bonus_points: parseInt(e.target.value) })}
              help="Points given to new customers"
            />
            <GlassInput
              label="Minimum Redemption Points"
              type="number"
              value={settings.min_redemption_points}
              onChange={(e) => setSettings({ ...settings, min_redemption_points: parseInt(e.target.value) })}
              help="Minimum points needed to redeem"
            />
            <GlassInput
              label="Max Redemption Percentage (%)"
              type="number"
              value={settings.max_redemption_percent}
              onChange={(e) => setSettings({ ...settings, max_redemption_percent: parseInt(e.target.value) })}
              help="Max % of purchase that can be paid with points"
            />
          </div>
        </div>
        )}
      </GlassCard>

      {/* Bonus Programs */}
      <GlassCard className="p-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('bonus-programs')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Gift className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Bonus Programs</h3>
              <p className="text-sm text-gray-600">Configure birthday and referral bonuses</p>
            </div>
          </div>
          {expandedSection === 'bonus-programs' ? (
            <ChevronUp className="w-6 h-6 text-gray-600" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-600" />
          )}
        </div>
        {expandedSection === 'bonus-programs' && (
        <div className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div>
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-pink-600" />
                  Birthday Bonus
                </span>
                <p className="text-xs text-gray-500">Give bonus points on customer's birthday</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enable_birthday_bonus}
                  onChange={(e) => setSettings({ ...settings, enable_birthday_bonus: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
              </label>
            </div>

            {settings.enable_birthday_bonus && (
              <GlassInput
                label="Birthday Bonus Points"
                type="number"
                value={settings.birthday_bonus_points}
                onChange={(e) => setSettings({ ...settings, birthday_bonus_points: parseInt(e.target.value) })}
              />
            )}

            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div>
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-600" />
                  Referral Bonus
                </span>
                <p className="text-xs text-gray-500">Give bonus points for referring new customers</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enable_referral_bonus}
                  onChange={(e) => setSettings({ ...settings, enable_referral_bonus: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            {settings.enable_referral_bonus && (
              <GlassInput
                label="Referral Bonus Points"
                type="number"
                value={settings.referral_bonus_points}
                onChange={(e) => setSettings({ ...settings, referral_bonus_points: parseInt(e.target.value) })}
              />
            )}
          </div>
        </div>
        )}
      </GlassCard>

      {/* Loyalty Tiers */}
      <GlassCard className="p-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('loyalty-tiers')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Award className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Loyalty Tiers</h3>
              <p className="text-sm text-gray-600">Create and manage customer loyalty tiers</p>
            </div>
          </div>
          {expandedSection === 'loyalty-tiers' ? (
            <ChevronUp className="w-6 h-6 text-gray-600" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-600" />
          )}
        </div>
        {expandedSection === 'loyalty-tiers' && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enable_tiers}
                  onChange={(e) => setSettings({ ...settings, enable_tiers: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
              {settings.enable_tiers && !showAddTierForm && !editingTier && (
                <GlassButton
                  onClick={() => setShowAddTierForm(true)}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Tier
                </GlassButton>
              )}
            </div>
          </div>

          {settings.enable_tiers && (
            <>
              {(showAddTierForm || editingTier) && (
                <div className="mb-4">
                  <TierForm
                    tier={editingTier || {
                      name: '',
                      min_points: 0,
                      discount_percentage: 5,
                      special_benefits: [],
                      color: '#3B82F6',
                      icon: 'star'
                    }}
                    onSave={(tier) => {
                      if (editingTier) {
                        const index = settings.tiers.findIndex(t => t.name === editingTier.name);
                        updateTier(index, tier);
                      } else {
                        addTier(tier);
                      }
                    }}
                    onCancel={() => {
                      setShowAddTierForm(false);
                      setEditingTier(null);
                    }}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {settings.tiers.map((tier, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-4 border-2"
                    style={{ borderColor: tier.color }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {tier.icon === 'crown' && <Crown className="w-5 h-5" style={{ color: tier.color }} />}
                        {tier.icon === 'sparkles' && <Sparkles className="w-5 h-5" style={{ color: tier.color }} />}
                        {tier.icon === 'star' && <Star className="w-5 h-5" style={{ color: tier.color }} />}
                        {tier.icon === 'award' && <Award className="w-5 h-5" style={{ color: tier.color }} />}
                        <h5 className="font-semibold text-gray-900">{tier.name}</h5>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingTier(tier)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Target className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => deleteTier(index)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Points Range:</span>
                        <span className="font-medium">
                          {tier.min_points} - {tier.max_points || '∞'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-medium">{tier.discount_percentage}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Benefits:</span>
                        <ul className="mt-1 space-y-1">
                          {tier.special_benefits.map((benefit, i) => (
                            <li key={i} className="text-xs text-gray-700 flex items-center gap-1">
                              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        )}
      </GlassCard>

      {/* Save Button */}
      <GlassCard className="p-6">
        <div className="flex justify-end gap-3">
          <GlassButton
            onClick={loadSettings}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </GlassButton>
          <GlassButton
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Loyalty Settings'}
          </GlassButton>
        </div>
      </GlassCard>
    </div>
  );
};

export default LoyaltyProgramSettings;

