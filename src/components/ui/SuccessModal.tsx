/**
 * Success Modal Component
 * Beautiful, reusable success popup for all forms
 * Usage: Use the useSuccessModal hook for easy integration
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Package, X } from 'lucide-react';
import { SoundManager } from '../../lib/soundUtils';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

export interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  actionButtons?: Array<{
    label: string | React.ReactNode;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'whatsapp' | 'success';
    disabled?: boolean;
  }>;
  icon?: React.ReactNode; // Custom icon (default is CheckCircle)
  showCloseButton?: boolean;
  playSound?: boolean; // Play success sound when modal opens (default: true)
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  title = 'Success!',
  message,
  actionButtons,
  icon,
  showCloseButton = true,
  playSound = true,
}) => {
  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Validate message - provide fallback if empty
  const displayMessage = message && message.trim() !== '' 
    ? message 
    : 'Operation completed successfully!';

  // Warn if message is empty (in development)
  useEffect(() => {
    if (isOpen && (!message || message.trim() === '')) {
      console.warn('⚠️ SuccessModal: Empty message provided. Using fallback message.');
    }
  }, [isOpen, message]);

  // Play success sound when modal opens
  useEffect(() => {
    if (isOpen && playSound) {
      SoundManager.playSuccessSound().catch((error) => {
        console.warn('Could not play success sound:', error);
      });
    }
  }, [isOpen, playSound]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 animate-fadeIn p-4"
      onClick={(e) => {
        // Only close if clicking the backdrop, not the modal content
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes checkmark {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }

        .animate-checkmark {
          animation: checkmark 0.4s ease-out;
        }
      `}</style>

      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        {showCloseButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              console.log('✖️ Success modal close button clicked');
              onClose();
            }}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-full transition-all shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 z-50 cursor-pointer touch-manipulation"
            aria-label="Close modal"
            type="button"
            title="Close"
          >
            <X className="w-5 h-5" strokeWidth={2.5} />
          </button>
        )}

        {/* Icon Section with Gradient Background */}
        <div className="p-8 text-center transition-all duration-500 bg-gradient-to-br from-green-50 to-emerald-50">
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-500 animate-checkmark"
            style={{
              background: 'linear-gradient(135deg, rgb(16, 185, 129) 0%, rgb(5, 150, 105) 100%)',
              boxShadow: 'rgba(16, 185, 129, 0.3) 0px 8px 24px'
            }}
          >
            {icon || <Package className="w-12 h-12 text-white" strokeWidth={2.5} />}
          </div>
          
          {/* Title */}
          <h3 className="text-2xl font-bold text-gray-900">
            {title}
          </h3>
        </div>

        {/* Message Section */}
        <div className="p-6">
          <p className="text-center text-gray-600 leading-relaxed">
            {displayMessage}
          </p>
        </div>

        {/* Action Buttons */}
        {actionButtons && actionButtons.length > 0 && (
          <div className="p-6 pt-0">
            <div className="grid grid-cols-2 gap-3">
              {actionButtons.map((button, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!button.disabled) {
                      button.onClick();
                      onClose();
                    }
                  }}
                  disabled={button.disabled}
                  className={`
                    w-full px-6 py-3.5 rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl active:scale-[0.98] text-lg
                    ${button.disabled 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60' 
                      : 'cursor-pointer'
                    }
                    ${!button.disabled && button.variant === 'whatsapp'
                      ? 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white'
                      : !button.disabled && button.variant === 'success'
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 active:from-emerald-800 active:to-emerald-900 text-white'
                      : !button.disabled && button.variant === 'secondary'
                      ? 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 active:from-gray-800 active:to-gray-900 text-white'
                      : !button.disabled
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900 text-white'
                      : ''
                    }
                  `}
                >
                  {button.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default SuccessModal;

