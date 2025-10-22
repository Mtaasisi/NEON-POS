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
        background: 'rgba(0, 0, 0, 0.4)',
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
          borderRadius: 12,
          padding: '24px',
          maxWidth: 400,
          width: '90%',
          position: 'relative',
          border: '1px solid #e5e7eb',
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
              background: '#ef4444',
              border: 'none',
              cursor: 'pointer',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#dc2626';
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 3px 8px rgba(220, 38, 38, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ef4444';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(239, 68, 68, 0.3)';
            }}
          >
            <X size={14} color="#fff" strokeWidth={2.5} />
          </button>
        )}

        {/* Success Icon */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          {icon || (
            <div
              style={{
                background: '#10b981',
                borderRadius: 8,
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                animation: 'checkmark 0.4s ease-out',
              }}
            >
              <CheckCircle size={24} color="white" strokeWidth={2} />
            </div>
          )}
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#111827',
            margin: 0,
            marginBottom: 12,
            textAlign: 'center',
          }}
        >
          {title}
        </h2>

        {/* Message */}
        <p
          style={{
            fontSize: 14,
            color: '#6b7280',
            lineHeight: 1.5,
            marginBottom: actionButtons && actionButtons.length > 0 ? 20 : 0,
            textAlign: 'center',
          }}
        >
          {message}
        </p>

        {/* Action Buttons */}
        {actionButtons && actionButtons.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'center',
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
                  padding: '10px 24px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: button.variant === 'secondary' 
                    ? '#f3f4f6' 
                    : '#10b981',
                  color: button.variant === 'secondary' ? '#1f2937' : '#fff',
                  transition: 'all 0.2s ease',
                  minWidth: 100,
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={(e) => {
                  if (button.variant === 'secondary') {
                    e.currentTarget.style.background = '#e5e7eb';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  } else {
                    e.currentTarget.style.background = '#059669';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (button.variant === 'secondary') {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.transform = 'scale(1)';
                  } else {
                    e.currentTarget.style.background = '#10b981';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                {button.label}
              </button>
            ))}
          </div>
        )}

        {/* Auto-close indicator */}
        {autoCloseDelay > 0 && (
          <div
            style={{
              marginTop: 16,
              fontSize: 12,
              color: '#9ca3af',
              textAlign: 'right',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
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
            Closes in {Math.ceil(autoCloseDelay / 1000)}s
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default SuccessModal;

