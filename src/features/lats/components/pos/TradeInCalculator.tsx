/**
 * Trade-In Calculator Component
 * Integrated into the sales process for device trade-ins
 */

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Smartphone,
  AlertCircle,
  Plus,
  Trash2,
  Calculator,
  CheckCircle,
  X,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  TradeInPrice,
  ConditionRating,
  DamageItem,
  TradeInCalculation,
} from '../../types/tradeIn';
import type { SparePart } from '../../types/spareParts';
import { getTradeInPrices, calculateTradeInValue, calculateCustomerPayment } from '../../lib/tradeInApi';
import { getAllSpareParts } from '../../lib/sparePartsApi';
import { format } from '../../lib/format';

interface TradeInCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  newDevicePrice?: number; // Price of the new device customer is buying
  onTradeInComplete: (tradeInData: {
    final_trade_in_value: number;
    customer_payment_amount: number;
    trade_in_details: {
      device_name: string;
      device_model: string;
      device_imei?: string;
      base_price: number;
      condition_rating: ConditionRating;
      condition_multiplier: number;
      damage_items: DamageItem[];
      total_deductions: number;
      condition_description?: string;
    };
  }) => void;
}

export const TradeInCalculator: React.FC<TradeInCalculatorProps> = ({
  isOpen,
  onClose,
  newDevicePrice = 0,
  onTradeInComplete,
}) => {
  // State
  const [step, setStep] = useState<'select-device' | 'assess-condition' | 'damage-assessment' | 'review'>(
    'select-device'
  );
  const [tradeInPrices, setTradeInPrices] = useState<TradeInPrice[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form data
  const [selectedPrice, setSelectedPrice] = useState<TradeInPrice | null>(null);
  const [deviceImei, setDeviceImei] = useState('');
  const [conditionRating, setConditionRating] = useState<ConditionRating>('excellent');
  const [conditionDescription, setConditionDescription] = useState('');
  const [damageItems, setDamageItems] = useState<DamageItem[]>([]);
  const [calculation, setCalculation] = useState<TradeInCalculation | null>(null);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadData();
    } else {
      // Reset form when modal closes
      setStep('select-device');
      setSelectedPrice(null);
      setDeviceImei('');
      setConditionRating('excellent');
      setConditionDescription('');
      setDamageItems([]);
      setCalculation(null);
      setSearchTerm('');
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    const [pricesResult, partsResult] = await Promise.all([
      getTradeInPrices({ is_active: true }),
      getAllSpareParts(),
    ]);

    if (pricesResult.success && pricesResult.data) {
      setTradeInPrices(pricesResult.data);
    }

    if (partsResult.success && partsResult.data) {
      setSpareParts(partsResult.data);
    }

    setLoading(false);
  };

  // Calculate trade-in value
  useEffect(() => {
    if (selectedPrice) {
      const calc = calculateTradeInValue(
        selectedPrice.base_trade_in_price,
        conditionRating,
        {
          excellent: selectedPrice.excellent_multiplier,
          good: selectedPrice.good_multiplier,
          fair: selectedPrice.fair_multiplier,
          poor: selectedPrice.poor_multiplier,
        },
        damageItems
      );

      const customerPayment = newDevicePrice
        ? calculateCustomerPayment(newDevicePrice, calc.final_trade_in_value)
        : 0;

      setCalculation({
        ...calc,
        new_device_price: newDevicePrice || undefined,
        customer_payment_amount: customerPayment,
      });
    }
  }, [selectedPrice, conditionRating, damageItems, newDevicePrice]);

  const handleAddDamage = (sparePart: SparePart) => {
    const newDamage: DamageItem = {
      spare_part_id: sparePart.id,
      spare_part_name: sparePart.name,
      price: sparePart.selling_price,
      description: '',
    };
    setDamageItems([...damageItems, newDamage]);
  };

  const handleRemoveDamage = (index: number) => {
    setDamageItems(damageItems.filter((_, i) => i !== index));
  };

  const handleUpdateDamageDescription = (index: number, description: string) => {
    const updated = [...damageItems];
    updated[index].description = description;
    setDamageItems(updated);
  };

  const handleComplete = async () => {
    console.log('🚀 handleComplete CALLED');
    console.log('📊 State check:', {
      selectedPrice: selectedPrice ? 'EXISTS' : 'NULL',
      calculation: calculation ? 'EXISTS' : 'NULL',
      deviceImei: deviceImei || 'EMPTY',
    });

    if (!selectedPrice || !calculation) {
      console.error('❌ Missing selectedPrice or calculation');
      toast.error('Please complete all steps');
      return;
    }

    if (!deviceImei) {
      console.error('❌ Missing device IMEI');
      toast.error('Please enter device IMEI');
      return;
    }

    console.log('✅ All validations passed - Processing trade-in...');
    console.log('📦 Trade-in data:', {
      final_trade_in_value: calculation.final_trade_in_value,
      customer_payment_amount: calculation.customer_payment_amount,
      device_name: selectedPrice.device_name,
      device_model: selectedPrice.device_model,
      device_imei: deviceImei,
    });
    
    // Call the parent handler (it will close modal on success and show appropriate toasts)
    onTradeInComplete({
      final_trade_in_value: calculation.final_trade_in_value,
      customer_payment_amount: calculation.customer_payment_amount,
      trade_in_details: {
        device_name: selectedPrice.device_name,
        device_model: selectedPrice.device_model,
        device_imei: deviceImei,
        base_price: selectedPrice.base_trade_in_price,
        condition_rating: conditionRating,
        condition_multiplier: calculation.condition_multiplier,
        damage_items: damageItems,
        total_deductions: calculation.total_damage_deductions,
        condition_description: conditionDescription,
      },
    });

    console.log('✅ onTradeInComplete called successfully');
  };

  const resetForm = () => {
    setStep('select-device');
    setSelectedPrice(null);
    setDeviceImei('');
    setConditionRating('excellent');
    setConditionDescription('');
    setDamageItems([]);
    setCalculation(null);
  };

  if (!isOpen) return null;

  const filteredPrices = tradeInPrices.filter((price) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      price.device_name.toLowerCase().includes(search) ||
      price.device_model.toLowerCase().includes(search)
    );
  });

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Only close if clicking the backdrop itself
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calculator className="w-8 h-8 text-white" />
              <div>
                <h2 className="text-2xl font-bold text-white">Trade-In Calculator</h2>
                <p className="text-blue-100 text-sm mt-1">
                  Value your customer's device for trade-in
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-800 rounded-lg transition-colors text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Steps indicator */}
          <div className="mt-6 flex items-center gap-2">
            {['select-device', 'assess-condition', 'damage-assessment', 'review'].map((s, index) => (
              <React.Fragment key={s}>
                <div
                  className={`flex-1 h-2 rounded-full transition-all ${
                    step === s
                      ? 'bg-white'
                      : index < ['select-device', 'assess-condition', 'damage-assessment', 'review'].indexOf(step)
                      ? 'bg-blue-300'
                      : 'bg-blue-800'
                  }`}
                />
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <>
              {/* Step 1: Select Device */}
              {step === 'select-device' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Select the device being traded in
                    </h3>

                    {/* Search */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search device..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Device list */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                      {filteredPrices.map((price) => (
                        <button
                          key={price.id}
                          onClick={() => {
                            setSelectedPrice(price);
                            setStep('assess-condition');
                          }}
                          className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                        >
                          <div className="flex items-start gap-3">
                            <Smartphone className="w-8 h-8 text-blue-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900">{price.device_name}</div>
                              <div className="text-sm text-gray-600">{price.device_model}</div>
                              <div className="mt-2 text-lg font-bold text-blue-600">
                                Up to {format.money(price.base_trade_in_price)}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {filteredPrices.length === 0 && (
                      <div className="text-center py-12">
                        <Smartphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">No devices found</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Assess Condition */}
              {step === 'assess-condition' && selectedPrice && (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="font-semibold text-gray-900">{selectedPrice.device_name}</div>
                    <div className="text-sm text-gray-600">{selectedPrice.device_model}</div>
                  </div>

                  {/* IMEI */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Device IMEI *
                    </label>
                    <input
                      type="text"
                      required
                      value={deviceImei}
                      onChange={(e) => setDeviceImei(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter device IMEI"
                    />
                  </div>

                  {/* Condition Rating */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Device Condition *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'excellent' as ConditionRating, label: 'Excellent', color: 'green', multiplier: selectedPrice.excellent_multiplier },
                        { value: 'good' as ConditionRating, label: 'Good', color: 'blue', multiplier: selectedPrice.good_multiplier },
                        { value: 'fair' as ConditionRating, label: 'Fair', color: 'yellow', multiplier: selectedPrice.fair_multiplier },
                        { value: 'poor' as ConditionRating, label: 'Poor', color: 'red', multiplier: selectedPrice.poor_multiplier },
                      ].map((condition) => (
                        <button
                          key={condition.value}
                          type="button"
                          onClick={() => setConditionRating(condition.value)}
                          className={`p-4 border-2 rounded-lg transition-all ${
                            conditionRating === condition.value
                              ? `border-${condition.color}-500 bg-${condition.color}-50`
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-semibold text-gray-900">{condition.label}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {(condition.multiplier * 100).toFixed(0)}% of base price
                          </div>
                          <div className="text-lg font-bold text-blue-600 mt-2">
                            {format.money(selectedPrice.base_trade_in_price * condition.multiplier)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Condition Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Condition Notes
                    </label>
                    <textarea
                      value={conditionDescription}
                      onChange={(e) => setConditionDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe the overall condition..."
                    />
                  </div>

                  {/* Navigation */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('select-device')}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => {
                        // Skip damage assessment if no issues
                        setDamageItems([]);
                        setStep('review');
                      }}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      No Damage - Skip to Review
                    </button>
                    <button
                      onClick={() => setStep('damage-assessment')}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add Damage/Issues
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Damage Assessment */}
              {step === 'damage-assessment' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Damage & Issues Assessment (Optional)
                    </h3>
                    <p className="text-sm text-gray-600">
                      Add any damaged parts to deduct from the trade-in value, or skip if device has no issues
                    </p>
                  </div>

                  {/* No Damage Message */}
                  {damageItems.length === 0 && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">No damage or issues selected</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        The device will be valued at the full condition-adjusted price. Click "Continue" to proceed.
                      </p>
                    </div>
                  )}

                  {/* Current Damage Items */}
                  {damageItems.length > 0 && (
                    <div className="space-y-3">
                      {damageItems.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-gray-900">{item.spare_part_name}</div>
                              <div className="font-bold text-red-600">-{format.money(item.price)}</div>
                            </div>
                            <input
                              type="text"
                              value={item.description || ''}
                              onChange={(e) => handleUpdateDamageDescription(index, e.target.value)}
                              placeholder="Add description..."
                              className="w-full mt-2 px-3 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                          <button
                            onClick={() => handleRemoveDamage(index)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Damage from Spare Parts */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select damaged parts (optional - skip if no damage)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                      {spareParts.map((part) => (
                        <button
                          key={part.id}
                          onClick={() => handleAddDamage(part)}
                          className="p-3 border border-gray-200 rounded hover:border-blue-500 hover:bg-blue-50 transition-all text-left text-sm"
                        >
                          <div className="font-medium text-gray-900 truncate">{part.name}</div>
                          <div className="text-xs text-gray-600">{format.money(part.selling_price)}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calculation Preview */}
                  {calculation && (
                    <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Base Price:</span>
                        <span className="font-medium">{format.money(calculation.base_price)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Condition Adjustment:</span>
                        <span className="font-medium">
                          {format.money(calculation.condition_adjusted_price)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Damage Deductions:</span>
                        <span className="font-medium">
                          -{format.money(calculation.total_damage_deductions)}
                        </span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-blue-200">
                        <span>Final Trade-In Value:</span>
                        <span>{format.money(calculation.final_trade_in_value)}</span>
                      </div>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('assess-condition')}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setStep('review')}
                      className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      {damageItems.length > 0 ? 'Continue to Review' : 'Continue (No Damage)'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {step === 'review' && calculation && selectedPrice ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-gray-900">Trade-In Summary</h3>
                  </div>

                  {/* Device Details */}
                  <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                    <div>
                      <div className="text-sm text-gray-600">Device</div>
                      <div className="font-semibold text-gray-900">
                        {selectedPrice.device_name} - {selectedPrice.device_model}
                      </div>
                      <div className="text-sm text-gray-600">IMEI: {deviceImei}</div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600">Condition</div>
                      <div className="font-medium text-gray-900 capitalize">{conditionRating}</div>
                      {conditionDescription && (
                        <div className="text-sm text-gray-600 mt-1">{conditionDescription}</div>
                      )}
                    </div>

                    {damageItems.length > 0 && (
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Damage/Issues</div>
                        <div className="space-y-1">
                          {damageItems.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-gray-700">{item.spare_part_name}</span>
                              <span className="text-red-600">-{format.money(item.price)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Calculation Breakdown */}
                  <div className="bg-blue-50 p-6 rounded-lg space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Base Trade-In Price:</span>
                      <span className="font-medium">{format.money(calculation.base_price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">
                        Condition Adjustment ({(calculation.condition_multiplier * 100).toFixed(0)}%):
                      </span>
                      <span className="font-medium">
                        {format.money(calculation.condition_adjusted_price)}
                      </span>
                    </div>
                    {calculation.total_damage_deductions > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Total Deductions:</span>
                        <span className="font-medium">
                          -{format.money(calculation.total_damage_deductions)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t-2 border-blue-200">
                      <span>Final Trade-In Value:</span>
                      <span className="text-green-600">
                        {format.money(calculation.final_trade_in_value)}
                      </span>
                    </div>

                    {newDevicePrice > 0 && (
                      <>
                        <div className="border-t-2 border-blue-200 pt-3 mt-3">
                          <div className="flex justify-between text-gray-700">
                            <span>New Device Price:</span>
                            <span className="font-medium">{format.money(newDevicePrice)}</span>
                          </div>
                          <div className="flex justify-between text-xl font-bold text-blue-600 mt-2">
                            <span>Customer Pays:</span>
                            <span>{format.money(calculation.customer_payment_amount)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Debug: Current state */}
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
                    <div className="font-semibold mb-1">Debug Info:</div>
                    <div>Device: {selectedPrice?.device_name || 'N/A'}</div>
                    <div>IMEI: {deviceImei || '⚠️ Not set'}</div>
                    <div>Calculation: {calculation ? '✅' : '❌'}</div>
                    <div>Final Value: {calculation?.final_trade_in_value ? format.money(calculation.final_trade_in_value) : 'N/A'}</div>
                  </div>

                  {/* Navigation */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        console.log('⬅️ Back button clicked');
                        setStep('damage-assessment');
                      }}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onMouseEnter={() => console.log('🖱️ Mouse entered Complete button')}
                      onMouseDown={() => console.log('👇 Mouse down on Complete button')}
                      onClick={(e) => {
                        console.log('🔘 Complete Trade-In button CLICKED!');
                        e.preventDefault();
                        e.stopPropagation();
                        handleComplete();
                      }}
                      className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 font-semibold transition-colors cursor-pointer shadow-md hover:shadow-lg"
                      style={{ position: 'relative', zIndex: 10 }}
                    >
                      Complete Trade-In
                    </button>
                  </div>
                </div>
              ) : step === 'review' ? (
                <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 font-medium">⚠️ Review Step Debug Info:</p>
                  <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                    <li>Step: {step}</li>
                    <li>Has Calculation: {calculation ? '✅ Yes' : '❌ No'}</li>
                    <li>Has Selected Price: {selectedPrice ? '✅ Yes' : '❌ No'}</li>
                    <li>Device IMEI: {deviceImei || '❌ Not set'}</li>
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TradeInCalculator;

