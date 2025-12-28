import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Unlock, 
  X, 
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import VirtualKeyboard from '../shared/VirtualKeyboard';

interface DayOpeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDay: () => void;
  currentUser: any;
  expectedPasscode?: string;
}

const DayOpeningModal: React.FC<DayOpeningModalProps> = ({
  isOpen,
  onClose,
  onOpenDay,
  currentUser,
  expectedPasscode = '1234'
}) => {
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOpenDay = async () => {
    try {
      setLoading(true);
      
      // Verify passcode (from settings)
      if (passcode !== expectedPasscode) {
        toast.error('Invalid passcode');
        setPasscode(''); // Clear wrong passcode
        return;
      }

      // Call the parent's onOpenDay handler (which creates the session)
      await onOpenDay();
      
      // Close modal after successful opening
      onClose();
    } catch (error) {
      console.error('Error opening day:', error);
      toast.error('Failed to open day');
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when 4 digits are entered
  useEffect(() => {
    if (passcode.length === 4 && !loading) {
      handleOpenDay();
    }
  }, [passcode]);

  const handleKeyPress = (key: string) => {
    if (passcode.length < 4) {
      setPasscode(prev => prev + key);
    }
  };

  const handleBackspace = () => {
    setPasscode(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPasscode('');
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'Unknown time';
    try {
      return new Date(timeString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Unknown time';
    }
  };

  const formatDate = (timeString?: string) => {
    if (!timeString) return 'Unknown date';
    try {
      return new Date(timeString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Unknown date';
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Unlock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Open New Day</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Passcode Input */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Passcode
                </label>
                <div className="relative">
                  <input
                    type={showPasscode ? 'text' : 'password'}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="••••"
                    className="w-full px-6 py-4 pr-14 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center text-3xl tracking-widest font-semibold"
                    maxLength={4}
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasscode ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                  </button>
                </div>
              </div>

              {/* Virtual Keyboard */}
              <div>
                <VirtualKeyboard
                  onKeyPress={handleKeyPress}
                  onBackspace={handleBackspace}
                  onClear={handleClear}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DayOpeningModal;
