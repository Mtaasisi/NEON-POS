import React from 'react';

interface TipOption {
  id: string;
  amount: number;
  percent?: number;
  label?: string;
}

interface TipSelectorProps {
  options: TipOption[];
  selectedId?: string | null;
  onSelect: (option: TipOption) => void;
  onOpenCustom: () => void;
}

const TipSelector: React.FC<TipSelectorProps> = ({ options, selectedId, onSelect, onOpenCustom }) => {
  return (
    <div className="px-4 pb-6">
      <h3 className="text-base font-bold text-gray-900 mb-4">Tips</h3>

      <div className="flex gap-3 mb-4">
        {options.map(option => {
          const active = selectedId === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onSelect(option)}
              className={`flex-1 p-4 rounded-xl text-center transition-all ${
                active ? 'ring-4 ring-blue-400/40 bg-white' : 'bg-gray-50'
              }`}
            >
              <div className="text-lg font-bold text-gray-900">+${option.amount.toFixed(2)}</div>
              {option.percent !== undefined && (
                <div className="text-sm text-gray-500 mt-1">{option.percent}%</div>
              )}
              {!option.percent && (
                <div className="text-sm text-gray-500 mt-1">Custom</div>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={onOpenCustom}
        className="w-full p-5 rounded-xl bg-gray-50 text-center transition-colors"
      >
        <div className="text-lg font-bold text-gray-900">Custom</div>
        <div className="text-sm text-gray-500 mt-1">Enter Amount</div>
      </button>
    </div>
  );
};

export default TipSelector;


