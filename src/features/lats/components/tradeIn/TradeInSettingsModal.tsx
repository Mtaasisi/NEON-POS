/**
 * Trade-In Settings Management Modal
 * Allows editing terms & conditions and ownership declaration
 * Matches SetPricingModal UI style
 */

import React, { useState, useEffect } from 'react';
import { X, Settings, Save, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getTradeInSettings, updateTradeInSettings } from '../../lib/tradeInApi';

interface TradeInSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TradeInSettingsModal: React.FC<TradeInSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contractTerms, setContractTerms] = useState('');
  const [ownershipDeclaration, setOwnershipDeclaration] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setLoading(true);
    const result = await getTradeInSettings();
    if (result.success && result.data) {
      setContractTerms(result.data.contract_terms || '');
      setOwnershipDeclaration(result.data.ownership_declaration || '');
    } else {
      toast.error(result.error || 'Failed to load settings');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!contractTerms.trim()) {
      toast.error('Contract terms cannot be empty');
      return;
    }

    if (!ownershipDeclaration.trim()) {
      toast.error('Ownership declaration cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const [termsResult, declarationResult] = await Promise.all([
        updateTradeInSettings('contract_terms', contractTerms, 'Terms and conditions for trade-in contracts'),
        updateTradeInSettings('ownership_declaration', ownershipDeclaration, 'Customer ownership declaration statement'),
      ]);

      if (termsResult.success && declarationResult.success) {
        toast.success('Settings saved successfully!');
        onClose();
      } else {
        toast.error('Failed to save some settings');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999]" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header - Fixed */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <Settings className="w-8 h-8 text-white" />
            </div>
            
            {/* Text */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Trade-In Settings</h2>
              <p className="text-sm text-gray-600">Manage terms & conditions and ownership declarations</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Contract Terms */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">Contract Terms & Conditions</h3>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-700">
                    These terms will be displayed in all trade-in contracts. Make sure they comply with local laws.
                  </p>
                </div>
                <textarea
                  value={contractTerms}
                  onChange={(e) => setContractTerms(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm font-mono"
                  placeholder="Enter contract terms and conditions..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  {contractTerms.length} characters
                </p>
              </div>

              {/* Ownership Declaration */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border-2 border-green-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-bold text-gray-900">Ownership Declaration</h3>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-700">
                    This declaration will be shown to customers before they sign the contract.
                  </p>
                </div>
                <textarea
                  value={ownershipDeclaration}
                  onChange={(e) => setOwnershipDeclaration(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-sm"
                  placeholder="Enter ownership declaration text..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  {ownershipDeclaration.length} characters
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Action Buttons Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading || !contractTerms.trim() || !ownershipDeclaration.trim()}
              className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

