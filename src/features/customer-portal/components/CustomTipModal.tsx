import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface CustomTipModalProps {
  isOpen: boolean;
  initialAmount?: number;
  onClose: () => void;
  onSave: (amount: number) => void;
}

const CustomTipModal: React.FC<CustomTipModalProps> = ({ isOpen, initialAmount = 0, onClose, onSave }) => {
  const [amount, setAmount] = useState<number>(initialAmount);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setAmount(initialAmount);
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, initialAmount]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(Math.max(0, Number(amount || 0)));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      {/* light page background like screenshots */}
      <div
        className="absolute inset-0 bg-[#d2d3d5]"
        onClick={onClose}
      />

      <div className="relative w-[92%] max-w-2xl bg-white rounded-[28px] p-8 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shadow-sm"
          aria-label="Close"
        >
          <X size={18} className="text-gray-500" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-8">Custom Tip</h2>

        <div className="flex flex-col items-center mb-8">
          <div className="flex items-end justify-center">
            <span className="text-4xl text-gray-300 mr-2">$</span>
            <input
              ref={inputRef}
              type="number"
              step="0.01"
              inputMode="decimal"
              value={amount === 0 ? '' : amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="text-6xl font-semibold text-gray-900 w-56 text-center placeholder:text-gray-300 focus:outline-none"
              placeholder="0.00"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-5 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl text-lg font-semibold shadow-2xl"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default CustomTipModal;


