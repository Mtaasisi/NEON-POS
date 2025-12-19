import React, { useState } from 'react';
import { X } from 'lucide-react';
import CustomTipModal from './CustomTipModal';

interface TipOption {
  id: string;
  amount: number;
  percent?: number;
}

interface TipModalProps {
  isOpen: boolean;
  initialSelectedId?: string | null;
  initialAmount?: number;
  onClose: () => void;
  onSave: (amount: number, selectedId?: string) => void;
}

const PRESET_OPTIONS: TipOption[] = [
  { id: 'none', amount: 0, percent: 0 },
  { id: 'mid', amount: 15, percent: 10 },
  { id: 'high', amount: 25, percent: 15 },
];

const TipModal: React.FC<TipModalProps> = ({ isOpen, initialSelectedId = null, initialAmount = 0, onClose, onSave }) => {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [amount, setAmount] = useState<number>(initialAmount);
  const [openCustom, setOpenCustom] = useState(false);

  if (!isOpen) return null;

  const handlePresetSelect = (opt: TipOption) => {
    setSelectedId(opt.id);
    setAmount(opt.amount);
  };

  const handleCustomSave = (val: number) => {
    setAmount(val);
    setSelectedId('custom');
    setOpenCustom(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-60 flex items-center justify-center">
        <div className="absolute inset-0 bg-[#d2d3d5]" onClick={onClose} />

        <div className="relative w-[92%] max-w-2xl bg-white rounded-[28px] p-6 md:p-8 shadow-xl" style={{ maxHeight: '86vh', overflowY: 'auto' }}>
          <button
            onClick={onClose}
            className="absolute right-5 top-5 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shadow-sm"
            aria-label="Close"
          >
            <X size={18} className="text-gray-500" />
          </button>

          <h2 className="text-2xl font-bold text-gray-900 mb-6">Tips</h2>

          <div className="flex gap-4 mb-6">
            {PRESET_OPTIONS.map(opt => {
              const active = selectedId === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handlePresetSelect(opt)}
                  className={`flex-1 py-4 rounded-xl text-center transition-all ${active ? 'ring-4 ring-blue-400/50 bg-white' : 'bg-gray-50'}`}
                >
                  <div className="text-lg font-bold text-gray-900">+${opt.amount.toFixed(2)}</div>
                  <div className="text-sm text-blue-600 mt-1">{opt.percent}%</div>
                </button>
              );
            })}
          </div>

          <div className="mb-6">
            <button
              onClick={() => setOpenCustom(true)}
              className="w-full p-5 rounded-xl bg-gray-50 text-center"
            >
              <div className="text-lg font-bold text-gray-900">Custom</div>
              <div className="text-sm text-gray-500 mt-1">Enter Amount</div>
            </button>
          </div>

          <button
            onClick={() => {
              onSave(amount, selectedId || undefined);
              onClose();
            }}
            className="w-full py-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl text-lg font-semibold shadow-2xl"
          >
            Save
          </button>
        </div>
      </div>

      <CustomTipModal
        isOpen={openCustom}
        initialAmount={amount}
        onClose={() => setOpenCustom(false)}
        onSave={handleCustomSave}
      />
    </>
  );
};

export default TipModal;


