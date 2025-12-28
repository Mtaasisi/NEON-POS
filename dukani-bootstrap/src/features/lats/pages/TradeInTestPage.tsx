/**
 * Trade-In Test Page
 * Standalone page to test the trade-in flow without POS integration
 */

import React, { useState } from 'react';
import { ArrowLeft, Smartphone, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TradeInCalculator from '../components/pos/TradeInCalculator';
import TradeInContractModal from '../components/pos/TradeInContractModal';
import { createTradeInTransaction } from '../lib/tradeInApi';
import { toast } from 'sonner';
import type { TradeInTransaction } from '../types/tradeIn';

export const TradeInTestPage: React.FC = () => {
  const navigate = useNavigate();
  const [showCalculator, setShowCalculator] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [tradeInData, setTradeInData] = useState<any>(null);
  const [transaction, setTransaction] = useState<TradeInTransaction | null>(null);

  // Simulated cart data
  const [newDevicePrice] = useState(1200000); // Example: iPhone 14 Pro Max price
  const [newDeviceName] = useState('iPhone 14 Pro Max 256GB');

  const handleTradeInComplete = async (data: any) => {
    console.log('Trade-in completed:', data);
    setTradeInData(data);
    
    // Create the transaction
    try {
      const result = await createTradeInTransaction({
        customer_id: 'dbd45d11-2f0a-43f8-9da7-06c207eef6ce', // You'd get this from selected customer
        device_name: data.trade_in_details.device_name,
        device_model: data.trade_in_details.device_model,
        device_imei: data.trade_in_details.device_imei,
        base_trade_in_price: data.trade_in_details.base_price,
        condition_rating: data.trade_in_details.condition_rating,
        condition_description: data.trade_in_details.condition_description,
        damage_items: data.trade_in_details.damage_items,
        new_device_price: newDevicePrice,
        customer_payment_amount: data.customer_payment_amount,
      });

      if (result.success && result.data) {
        toast.success('Trade-in transaction created!');
        setTransaction(result.data);
        setShowCalculator(false);
        // Show contract modal
        setShowContract(true);
      } else {
        toast.error(result.error || 'Failed to create transaction');
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Failed to create transaction');
    }
  };

  const handleContractSigned = () => {
    toast.success('Contract signed successfully!');
    setShowContract(false);
    // In real scenario, complete the sale here
    toast.success('Sale completed! Device added to inventory.');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/lats/trade-in/management')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Trade-In Management
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Smartphone className="w-8 h-8 text-blue-600" />
            Create Trade-In Transaction
          </h1>
          <p className="text-gray-600 mt-2">
            Test the complete trade-in workflow
          </p>
        </div>

        {/* Simulated Sale Scenario */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Sale Scenario</h2>
          
          <div className="space-y-4">
            {/* New Device */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
                <div>
                  <div className="font-semibold text-gray-900">{newDeviceName}</div>
                  <div className="text-sm text-gray-600">New device customer is buying</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">
                  TSh {newDevicePrice.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Trade-In Section */}
            {tradeInData ? (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold text-gray-900">
                      Trade-In: {tradeInData.trade_in_details.device_name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {tradeInData.trade_in_details.device_model} - {tradeInData.trade_in_details.condition_rating}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      -TSh {tradeInData.final_trade_in_value.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600">Trade-in credit</div>
                  </div>
                </div>
                
                {tradeInData.trade_in_details.damage_items?.length > 0 && (
                  <div className="text-xs text-gray-600 space-y-1 mt-2 pt-2 border-t border-green-200">
                    <div className="font-medium">Deductions:</div>
                    {tradeInData.trade_in_details.damage_items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span>- {item.spare_part_name}</span>
                        <span>TSh {item.price.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowCalculator(true)}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="text-center">
                  <Smartphone className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <div className="font-medium text-gray-700">Add Trade-In Device</div>
                  <div className="text-sm text-gray-500">Customer trading in old device</div>
                </div>
              </button>
            )}

            {/* Total */}
            <div className="p-4 bg-gray-100 rounded-lg">
              <div className="flex justify-between items-center text-lg font-bold">
                <span className="text-gray-900">Customer Pays:</span>
                <span className="text-2xl text-blue-600">
                  TSh {(tradeInData ? tradeInData.customer_payment_amount : newDevicePrice).toLocaleString()}
                </span>
              </div>
              {tradeInData && (
                <div className="text-sm text-gray-600 mt-1 text-right">
                  (TSh {newDevicePrice.toLocaleString()} - TSh {tradeInData.final_trade_in_value.toLocaleString()})
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {tradeInData && !transaction && (
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setTradeInData(null);
                  setShowCalculator(true);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Change Trade-In
              </button>
            </div>
          )}

          {transaction && (
            <div className="mt-6">
              <div className="p-4 bg-green-100 border border-green-300 rounded-lg mb-4">
                <div className="flex items-center gap-2 text-green-800">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <span className="font-medium">
                    Transaction Created: {transaction.transaction_number}
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => setShowContract(true)}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
              >
                View/Sign Contract
              </button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">How to Use This Page:</h3>
          <ol className="space-y-2 text-sm text-blue-800">
            <li>1. Click "Add Trade-In Device" to open the calculator</li>
            <li>2. Select the device model being traded in</li>
            <li>3. Enter IMEI and assess condition</li>
            <li>4. Add any damage/issues (optional)</li>
            <li>5. Review final value and customer payment</li>
            <li>6. Complete to create transaction</li>
            <li>7. Generate and sign contract</li>
          </ol>
          
          <div className="mt-4 p-3 bg-white rounded border border-blue-200">
            <div className="text-xs font-medium text-blue-900 mb-1">💡 Note:</div>
            <div className="text-xs text-blue-700">
              In production, this would be integrated into your POS system. 
              This page is for testing the trade-in flow independently.
            </div>
          </div>
        </div>
      </div>

      {/* Trade-In Calculator Modal */}
      <TradeInCalculator
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
        newDevicePrice={newDevicePrice}
        onTradeInComplete={handleTradeInComplete}
      />

      {/* Contract Modal */}
      {transaction && (
        <TradeInContractModal
          isOpen={showContract}
          transaction={transaction}
          onClose={() => setShowContract(false)}
          onContractSigned={handleContractSigned}
        />
      )}
    </div>
  );
};

export default TradeInTestPage;

