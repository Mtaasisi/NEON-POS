import React, { ReactNode, useEffect } from 'react';

interface MobileFullScreenSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  leftButtonText?: string;
  leftButtonDisabled?: boolean;
  rightButtonText?: string;
  rightButtonDisabled?: boolean;
  onRightButtonClick?: () => void;
  children: ReactNode;
}

/**
 * MobileFullScreenSheet
 * 
 * A full-screen iOS-style modal sheet that matches the exact layout from the reference image.
 * 
 * Features:
 * - Slides up from bottom with animation
 * - Rounded top corners (20px radius)
 * - Takes up almost full screen height
 * - White background with shadow
 * - iOS-style header with Cancel/Title/Add
 * - Scrollable content area
 * - Home indicator at bottom
 * 
 * Dimensions match reference image:
 * - Top margin: 40px from screen top (shows background)
 * - Header height: 44px + 12px padding = 56px total
 * - Border radius: 20px top corners
 * - Shadow: subtle iOS-style elevation
 */
const MobileFullScreenSheet: React.FC<MobileFullScreenSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle = '',
  leftButtonText = 'Cancel',
  leftButtonDisabled = false,
  rightButtonText = 'Add',
  rightButtonDisabled = false,
  onRightButtonClick,
  children
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - Semi-transparent black overlay */}
      <div 
        className="fixed inset-0 bg-black/40 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Sheet Container */}
      <div className="fixed inset-0 z-50 pointer-events-none flex items-end">
        <div 
          className="w-full bg-white pointer-events-auto animate-slide-up-sheet"
          style={{
            height: 'calc(100vh - 40px)', // Leaves 40px space at top
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            boxShadow: '0 -2px 20px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header Bar - Matches image exactly */}
          <div className="flex-shrink-0 border-b border-gray-200 bg-white"
            style={{
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              paddingTop: '12px',
              paddingBottom: '12px',
              paddingLeft: '16px',
              paddingRight: '16px'
            }}
          >
            <div className="flex items-center justify-between" style={{ height: '44px' }}>
              {/* Left Button - Cancel */}
              <button
                onClick={onClose}
                disabled={leftButtonDisabled}
                className="text-blue-500 disabled:opacity-50 min-w-[70px] text-left"
                style={{
                  fontSize: '17px',
                  fontWeight: '400',
                  letterSpacing: '-0.41px'
                }}
              >
                {leftButtonText}
              </button>

              {/* Center Title + Subtitle */}
              <div className="flex-1 text-center px-4">
                <div 
                  className="font-semibold text-gray-900 leading-tight"
                  style={{
                    fontSize: '17px',
                    letterSpacing: '-0.41px'
                  }}
                >
                  {title}
                </div>
                {subtitle && (
                  <div 
                    className="text-gray-500 mt-0.5"
                    style={{
                      fontSize: '11px',
                      fontWeight: '400',
                      letterSpacing: '-0.07px'
                    }}
                  >
                    {subtitle}
                  </div>
                )}
              </div>

              {/* Right Button - Add/Done */}
              <button
                onClick={onRightButtonClick || onClose}
                disabled={rightButtonDisabled}
                className={`min-w-[70px] text-right transition-colors ${
                  rightButtonDisabled
                    ? 'text-gray-400'
                    : 'text-blue-500'
                }`}
                style={{
                  fontSize: '17px',
                  fontWeight: '400',
                  letterSpacing: '-0.41px'
                }}
              >
                {rightButtonText}
              </button>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div 
            className="flex-1 overflow-y-auto bg-white"
            style={{
              overscrollBehavior: 'contain'
            }}
          >
            {children}
          </div>

          {/* iOS Home Indicator */}
          <div 
            className="flex-shrink-0 bg-white"
            style={{
              paddingTop: '8px',
              paddingBottom: '8px'
            }}
          >
            <div 
              className="mx-auto bg-gray-300 rounded-full"
              style={{
                width: '134px',
                height: '5px'
              }}
            />
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes slide-up-sheet {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-slide-up-sheet {
          animation: slide-up-sheet 0.4s cubic-bezier(0.32, 0.72, 0, 1);
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        /* Smooth scrolling on iOS */
        .overflow-y-auto {
          -webkit-overflow-scrolling: touch;
        }

        /* Hide scrollbar but keep functionality */
        .overflow-y-auto::-webkit-scrollbar {
          display: none;
        }
        .overflow-y-auto {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
};

export default MobileFullScreenSheet;

