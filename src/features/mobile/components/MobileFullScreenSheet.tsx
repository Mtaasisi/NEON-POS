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
          className="w-full bg-white pointer-events-auto animate-slide-up-sheet rounded-t-3xl shadow-lg flex flex-col"
          style={{
            height: 'calc(100vh - 40px)', // Leaves 40px space at top
          }}
        >
          {/* Header Bar */}
          <div className="flex-shrink-0 border-b border-neutral-200 bg-white rounded-t-3xl px-4 py-3">
            <div className="flex items-center justify-between h-[44px]">
              {/* Left Button - Cancel */}
              <button
                onClick={onClose}
                disabled={leftButtonDisabled}
                className="text-primary-500 disabled:opacity-50 min-w-[70px] text-left text-[17px] font-normal tracking-tight"
              >
                {leftButtonText}
              </button>

              {/* Center Title + Subtitle */}
              <div className="flex-1 text-center px-4">
                <div 
                  className="font-semibold text-neutral-900 leading-tight text-[17px] tracking-tight"
                >
                  {title}
                </div>
                {subtitle && (
                  <div 
                    className="text-neutral-500 mt-0.5 text-[11px] font-normal tracking-tight"
                  >
                    {subtitle}
                  </div>
                )}
              </div>

              {/* Right Button - Add/Done */}
              <button
                onClick={onRightButtonClick || onClose}
                disabled={rightButtonDisabled}
                className={`min-w-[70px] text-right transition-colors text-[17px] font-normal tracking-tight ${
                  rightButtonDisabled
                    ? 'text-neutral-400'
                    : 'text-primary-500'
                }`}
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
            className="flex-shrink-0 bg-white py-2"
          >
            <div 
              className="mx-auto bg-neutral-300 rounded-full w-[134px] h-[5px]"
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
