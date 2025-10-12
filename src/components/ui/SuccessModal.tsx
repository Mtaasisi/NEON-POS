/**
 * Success Modal Component
 * Beautiful, reusable success popup for all forms
 * Usage: Use the useSuccessModal hook for easy integration
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, X } from 'lucide-react';
import { SoundManager } from '../../lib/soundUtils';

export interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  autoCloseDelay?: number; // in milliseconds, 0 = no auto-close
  actionButtons?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
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
  autoCloseDelay = 3000,
  actionButtons,
  icon,
  showCloseButton = true,
  playSound = true,
}) => {
  // Play success sound when modal opens
  useEffect(() => {
    if (isOpen && playSound) {
      SoundManager.playSuccessSound().catch((error) => {
        console.warn('Could not play success sound:', error);
      });
    }
  }, [isOpen, playSound]);

  // Auto-close functionality
  useEffect(() => {
    if (isOpen && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseDelay, onClose]);

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
      className="success-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
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
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes checkmark {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>

      <div
        className="success-modal-content"
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '40px 32px 32px',
          maxWidth: 440,
          width: '90%',
          textAlign: 'center',
          position: 'relative',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          animation: 'slideUp 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        {showCloseButton && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={20} color="#6b7280" />
          </button>
        )}

        {/* Success Icon */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 24,
            animation: 'checkmark 0.5s ease-out',
          }}
        >
          {icon || (
            <div
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '50%',
                width: 80,
                height: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
              }}
            >
              <CheckCircle size={48} color="white" strokeWidth={2.5} />
            </div>
          )}
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#111827',
            marginBottom: 12,
            lineHeight: 1.2,
          }}
        >
          {title}
        </h2>

        {/* Message */}
        <p
          style={{
            fontSize: 16,
            color: '#6b7280',
            lineHeight: 1.6,
            marginBottom: actionButtons && actionButtons.length > 0 ? 32 : 0,
          }}
        >
          {message}
        </p>

        {/* Action Buttons */}
        {actionButtons && actionButtons.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {actionButtons.map((button, index) => (
              <button
                key={index}
                onClick={() => {
                  button.onClick();
                  onClose();
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'all 0.2s',
                  background:
                    button.variant === 'secondary'
                      ? '#f3f4f6'
                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: button.variant === 'secondary' ? '#374151' : '#fff',
                  boxShadow:
                    button.variant === 'secondary'
                      ? 'none'
                      : '0 4px 12px rgba(16, 185, 129, 0.3)',
                }}
                onMouseEnter={(e) => {
                  if (button.variant === 'secondary') {
                    e.currentTarget.style.background = '#e5e7eb';
                  } else {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow =
                      '0 6px 16px rgba(16, 185, 129, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (button.variant === 'secondary') {
                    e.currentTarget.style.background = '#f3f4f6';
                  } else {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow =
                      '0 4px 12px rgba(16, 185, 129, 0.3)';
                  }
                }}
              >
                {button.label}
              </button>
            ))}
          </div>
        )}

        {/* Auto-close progress indicator */}
        {autoCloseDelay > 0 && (
          <div
            style={{
              marginTop: 24,
              fontSize: 13,
              color: '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#9ca3af',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            Auto-closing in {Math.ceil(autoCloseDelay / 1000)}s
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default SuccessModal;

