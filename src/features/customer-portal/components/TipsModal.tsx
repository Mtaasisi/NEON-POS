import React from 'react';

interface TipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productPrice: number;
  selectedTipId: string | null;
  onTipSelect: (tipId: string, amount: number) => void;
  onCustomTip: () => void;
}

const TipsModal: React.FC<TipsModalProps> = ({
  isOpen,
  onClose,
  productPrice,
  selectedTipId,
  onTipSelect,
  onCustomTip
}) => {
  if (!isOpen) return null;

  const tipOptions = [
    {
      id: 'none',
      label: 'No Tip',
      amount: 0,
      description: 'Skip tipping',
      percentage: 0
    },
    {
      id: 'low',
      label: 'Thank You',
      amount: Math.round(productPrice * 0.05),
      description: 'Great service',
      percentage: 5
    },
    {
      id: 'mid',
      label: 'Great Service',
      amount: Math.round(productPrice * 0.10),
      description: 'Exceptional experience',
      percentage: 10
    },
    {
      id: 'high',
      label: 'Exceptional',
      amount: Math.round(productPrice * 0.15),
      description: 'Outstanding service',
      percentage: 15
    }
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md mx-4 mb-4 bg-white rounded-[28px] p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shadow-sm"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-8">Add a Tip</h2>

        {/* Tip Options Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {tipOptions.map((tip) => (
            <button
              key={tip.id}
              onClick={() => onTipSelect(tip.id, tip.amount)}
              className={`p-4 rounded-xl text-center transition-all duration-300 border-2 flex flex-col items-center justify-center min-h-[80px] ${
                selectedTipId === tip.id
                  ? 'border-blue-500 bg-blue-50 shadow-lg transform scale-[0.98]'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className={`text-lg font-bold mb-1 transition-colors ${
                selectedTipId === tip.id ? 'text-blue-700' : 'text-gray-900'
              }`}>
                {tip.amount === 0 ? 'No Tip' : `+Tsh ${tip.amount.toLocaleString('en-US')}`}
              </div>
              <div className="text-xs text-gray-500 mb-2 text-center">{tip.description}</div>
              {tip.percentage > 0 && (
                <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  selectedTipId === tip.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tip.percentage}%
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Custom Tip Button */}
        <button
          onClick={onCustomTip}
          className="w-full py-5 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl text-lg font-semibold shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 mb-6"
        >
          Custom Amount
        </button>

        {/* Info */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Tips go directly to our team. Thank you for your generosity! 🙏
          </p>
        </div>
      </div>
    </div>
  );
};

export default TipsModal;
